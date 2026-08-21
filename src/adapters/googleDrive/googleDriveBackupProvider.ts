/*
 * File: googleDriveBackupProvider.ts
 *
 * Purpose:
 *     Back up the local SQLite archive and attachments to Google Drive.
 *
 * Author:
 *     Captain's Log contributors
 *     Project owner name pending confirmation.
 *
 * Contact:
 *     Project owner contact information pending confirmation.
 *
 * License:
 *     All rights reserved until the project owner selects a license.
 */

import Constants from 'expo-constants';
import * as AuthSession from 'expo-auth-session';
import type { SQLiteDatabase } from 'expo-sqlite';
import * as WebBrowser from 'expo-web-browser';

import type { AttachmentStorage, BackupProvider, NetworkStatusProvider } from '@/models/contracts';
import type { BackupStatus } from '@/models/types';
import type { SettingsStore } from '@/adapters/sqlite/settingsStore';
import { deleteSecret, getSecret, setSecret } from '@/utilities/secureKv';
import { nowMs } from '@/utilities/time';

WebBrowser.maybeCompleteAuthSession();

const DRIVE_TOKEN_KEY = 'captains-log.google-drive-token';
const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.file';

/*
 * Purpose: Read the web OAuth client id used for Drive.file authorization.
 * Design: Drive stays on the web client id for AuthSession; empty means not_configured status.
 * Workflow: Called from authorize and getStatus.
 * Data Handoff: Returns a client id string or ''.
 */
function clientId(): string {
  const extra = (Constants.expoConfig?.extra ?? {}) as { googleWebClientId?: string };
  return extra.googleWebClientId || process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || '';
}

/*
 * Purpose: Implement BackupProvider against Google Drive without leaking Drive types into UI.
 * Design: drive.file scope is requested separately from Google sign-in.
 * Workflow: Constructed by createAppServices; used by BackupService and Settings.
 * Data Handoff: Uploads serialized SQLite plus attachment bytes; reports BackupStatus.
 */
export function createGoogleDriveBackupProvider(deps: {
  db: SQLiteDatabase;
  settings: SettingsStore;
  attachments: AttachmentStorage;
  network: NetworkStatusProvider;
}): BackupProvider {
  /*
   * Purpose: Fail fast when Drive has not been authorized.
   * Design: Throw rather than upload anonymously so BackupService can record a failed/unauthorized state.
   * Workflow: Called from uploadBytes before the Drive API request.
   * Data Handoff: Returns the Bearer token string.
   */
  async function requireToken(): Promise<string> {
    const token = await getSecret(DRIVE_TOKEN_KEY);
    if (!token) {
      throw new Error('Google Drive is not authorized');
    }
    return token;
  }

  /*
   * Purpose: Upload one file as a Drive multipart payload.
   * Design: Manual multipart body so the prototype does not depend on a Drive SDK.
   * Workflow: Called for the serialized database and each managed attachment.
   * Data Handoff: POSTs to Drive upload API; throws on non-OK so the caller can set failed status.
   */
  async function uploadBytes(name: string, mimeType: string, bytes: Uint8Array): Promise<void> {
    const token = await requireToken();
    const metadata = JSON.stringify({ name, mimeType });
    const boundary = 'captainslogboundary';
    const encoder = new TextEncoder();
    const preamble = encoder.encode(
      `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n--${boundary}\r\nContent-Type: ${mimeType}\r\n\r\n`
    );
    const close = encoder.encode(`\r\n--${boundary}--`);
    const body = new Uint8Array(preamble.length + bytes.length + close.length);
    body.set(preamble, 0);
    body.set(bytes, preamble.length);
    body.set(close, preamble.length + bytes.length);

    const response = await fetch(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': `multipart/related; boundary=${boundary}`,
        },
        body,
      }
    );
    if (!response.ok) {
      throw new Error(`Drive upload failed (${response.status})`);
    }
  }

  return {
    /*
     * Purpose: Obtain a Drive.file token without mixing it into Google sign-in.
     * Design: Separate AuthRequest with only the Drive scope per captains-log.yaml.
     * Workflow: Invoked from Settings "Authorize Drive".
     * Data Handoff: Stores the access token under DRIVE_TOKEN_KEY.
     */
    async authorize() {
      const id = clientId();
      if (!id) {
        throw new Error('Google OAuth client IDs are not configured');
      }
      const redirectUri = AuthSession.makeRedirectUri({ scheme: 'captainslog' });
      const discovery = await AuthSession.fetchDiscoveryAsync('https://accounts.google.com');
      const request = new AuthSession.AuthRequest({
        clientId: id,
        redirectUri,
        scopes: [DRIVE_SCOPE],
        responseType: AuthSession.ResponseType.Token,
      });
      const result = await request.promptAsync(discovery);
      if (result.type !== 'success' || !result.authentication?.accessToken) {
        throw new Error('Google Drive authorization was cancelled');
      }
      await setSecret(DRIVE_TOKEN_KEY, result.authentication.accessToken);
    },

    /*
     * Purpose: Decide whether automatic backup should run.
     * Design: Presence of a stored token is enough; expiry handling is deferred.
     * Workflow: Called by BackupService.backupNow before any upload.
     * Data Handoff: Returns boolean; false causes a silent no-op.
     */
    async isAuthorized() {
      return Boolean(await getSecret(DRIVE_TOKEN_KEY));
    },

    /*
     * Purpose: Copy the canonical SQLite archive to Drive.
     * Design: serializeAsync avoids depending on native database file paths.
     * Workflow: First half of BackupService.backupNow after authorization and online checks.
     * Data Handoff: Uploads captains-log.db and records lastBackup* settings.
     */
    async backupDatabase() {
      const bytes = await deps.db.serializeAsync();
      await uploadBytes('captains-log.db', 'application/x-sqlite3', bytes);
      await deps.settings.set({
        lastBackupAt: nowMs(),
        lastBackupState: 'current',
        lastBackupDetail: 'Database uploaded',
      });
    },

    /*
     * Purpose: Copy managed photo files to Drive.
     * Design: Iterate filesystem list so backup includes files even if metadata rows differ.
     * Workflow: Second half of BackupService.backupNow.
     * Data Handoff: Uploads each file then updates backup telemetry.
     */
    async backupAttachments() {
      const files = await deps.attachments.listManagedFiles();
      for (const file of files) {
        const response = await fetch(file.uri);
        const buffer = new Uint8Array(await response.arrayBuffer());
        const name = file.uri.split('/').pop() ?? 'attachment.bin';
        await uploadBytes(name, file.mimeType, buffer);
      }
      await deps.settings.set({
        lastBackupAt: nowMs(),
        lastBackupState: 'current',
        lastBackupDetail: `Attachments uploaded (${files.length})`,
      });
    },

    /*
     * Purpose: Produce user-visible backup telemetry without exposing Google APIs.
     * Design: Overlay not_configured / unauthorized / offline on stored lastBackupState.
     * Workflow: Called by AppShell and SettingsScreen.
     * Data Handoff: Returns BackupStatus for LOCAL ARCHIVE / LAST BACKUP / BACKUP STATUS labels.
     */
    async getStatus() {
      const settings = await deps.settings.get();
      const authorized = await getSecret(DRIVE_TOKEN_KEY);
      const online = await deps.network.isInternetReachable();
      let state = settings.lastBackupState;
      let detail = settings.lastBackupDetail;
      if (!clientId()) {
        state = 'not_configured';
        detail = 'Set EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID to enable Drive backup';
      } else if (!authorized) {
        state = 'unauthorized';
        detail = 'Authorize Google Drive from Settings';
      } else if (!online) {
        state = 'offline';
        detail = 'Local archive remains authoritative';
      }
      const status: BackupStatus = {
        localArchive: 'active',
        lastBackupAt: settings.lastBackupAt,
        state,
        detail,
      };
      return status;
    },
  };
}

export async function clearDriveAuthorization(): Promise<void> {
  await deleteSecret(DRIVE_TOKEN_KEY);
}
