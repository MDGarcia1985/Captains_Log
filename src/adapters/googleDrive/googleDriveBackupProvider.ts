/*
 * File: src/adapters/googleDrive/googleDriveBackupProvider.ts
 *
 * Purpose:
 *     Timestamped Google Drive snapshots of the local SQLite archive and attachments.
 *
 * Author:
 *     Michael Garcia
 *
 * Contact:
 *     michael@mandedesign.studio
 *
 * License:
 *     SPDX-License-Identifier: MPL-2.0
 *
 * Related Decisions:
 *     DEV-2026-08-21-003, DEV-2026-08-21-004, DEV-2026-08-21-005, DEV-2026-08-21-009
 */

import * as AuthSession from 'expo-auth-session';
import type { SQLiteDatabase } from 'expo-sqlite';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';

import { checkpointWal } from '@/adapters/sqlite/database';
import { googleClientIdForCurrentPlatform } from '@/adapters/auth/googleAuthProvider';
import {
  DRIVE_BACKUP_RETENTION,
  DRIVE_BACKUP_ROOT_NAME,
  DRIVE_BACKUP_SCOPE,
  DRIVE_DATABASE_FILE_NAME,
  DRIVE_MANIFEST_FILE_NAME,
} from '@/adapters/googleDrive/backupPolicy';
import type {
  ArchiveRuntime,
  AttachmentStorage,
  BackupProvider,
  NetworkStatusProvider,
} from '@/models/contracts';
import type { BackupSnapshot, BackupStatus, RestoredAttachmentFile } from '@/models/types';
import type { SettingsStore } from '@/adapters/sqlite/settingsStore';
import { deleteSecret, getSecret, setSecret } from '@/utilities/secureKv';
import { nowMs } from '@/utilities/time';

WebBrowser.maybeCompleteAuthSession();

const DRIVE_TOKEN_KEY = 'captains-log.google-drive-token';
const DRIVE_ROOT_KEY = 'captains-log.google-drive-root-folder';
const DRIVE_SCOPE = DRIVE_BACKUP_SCOPE;
const BACKUP_ROOT_NAME = DRIVE_BACKUP_ROOT_NAME;
const SNAPSHOT_RETENTION = DRIVE_BACKUP_RETENTION;
const DATABASE_FILE_NAME = DRIVE_DATABASE_FILE_NAME;
const MANIFEST_FILE_NAME = DRIVE_MANIFEST_FILE_NAME;

interface SnapshotManifest {
  schemaVersion: 1;
  createdAt: number;
  label: string;
  databaseFileName: string;
  attachments: { storedName: string; attachmentId: string; fileName: string }[];
}

interface DriveFile {
  id: string;
  name: string;
  createdTime?: string;
  mimeType?: string;
  appProperties?: Record<string, string>;
}

/*
 * Purpose: Implement BackupProvider as timestamped drive.file snapshots with retention.
 * Design: Visible user-managed Drive folders; AuthSession token flow is prototype-only.
 * Workflow: Constructed by createAppServices; used by BackupService and Settings.
 * Data Handoff: Uploads serialized SQLite plus attachment bytes; restores via ArchiveRuntime.
 */
export function createGoogleDriveBackupProvider(deps: {
  getDb: () => SQLiteDatabase;
  settings: SettingsStore;
  attachments: AttachmentStorage;
  network: NetworkStatusProvider;
  runtime: ArchiveRuntime;
}): BackupProvider {
  async function requireToken(): Promise<string> {
    const token = await getSecret(DRIVE_TOKEN_KEY);
    if (!token) {
      throw new Error('Google Drive is not authorized');
    }
    return token;
  }

  async function driveJson<T>(path: string, init: RequestInit = {}): Promise<T> {
    const token = await requireToken();
    const response = await fetch(`https://www.googleapis.com/drive/v3/${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(init.headers ?? {}),
      },
    });
    if (!response.ok) {
      throw new Error(`Drive request failed (${response.status})`);
    }
    if (response.status === 204) {
      return {} as T;
    }
    return (await response.json()) as T;
  }

  async function driveBytes(fileId: string): Promise<Uint8Array> {
    const token = await requireToken();
    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!response.ok) {
      throw new Error(`Drive download failed (${response.status})`);
    }
    return new Uint8Array(await response.arrayBuffer());
  }

  async function createFolder(name: string, parents: string[] | null, appValue: string): Promise<string> {
    const body = {
      name,
      mimeType: 'application/vnd.google-apps.folder',
      parents: parents ?? undefined,
      appProperties: { captainsLog: appValue },
    };
    const created = await driveJson<DriveFile>('files', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return created.id;
  }

  async function uploadBytes(
    folderId: string,
    name: string,
    mimeType: string,
    bytes: Uint8Array
  ): Promise<void> {
    const token = await requireToken();
    const metadata = JSON.stringify({ name, mimeType, parents: [folderId] });
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

  async function listChildren(folderId: string): Promise<DriveFile[]> {
    const query = encodeURIComponent(`'${folderId}' in parents and trashed = false`);
    const result = await driveJson<{ files?: DriveFile[] }>(
      `files?q=${query}&fields=files(id,name,createdTime,mimeType,appProperties)&pageSize=100`
    );
    return result.files ?? [];
  }

  async function findOrCreateRootFolder(): Promise<string> {
    const cached = await getSecret(DRIVE_ROOT_KEY);
    if (cached) {
      try {
        await driveJson<DriveFile>(`files/${cached}?fields=id,trashed`);
        return cached;
      } catch {
        await deleteSecret(DRIVE_ROOT_KEY);
      }
    }
    const query = encodeURIComponent(
      `mimeType = 'application/vnd.google-apps.folder' and name = '${BACKUP_ROOT_NAME}' and appProperties has { key='captainsLog' and value='backup-root' } and trashed = false`
    );
    const result = await driveJson<{ files?: DriveFile[] }>(
      `files?q=${query}&fields=files(id,name)&pageSize=10`
    );
    const existing = result.files?.[0]?.id;
    if (existing) {
      await setSecret(DRIVE_ROOT_KEY, existing);
      return existing;
    }
    const created = await createFolder(BACKUP_ROOT_NAME, null, 'backup-root');
    await setSecret(DRIVE_ROOT_KEY, created);
    return created;
  }

  async function enforceRetention(rootId: string): Promise<void> {
    const children = (await listChildren(rootId)).filter(
      (file) => file.mimeType === 'application/vnd.google-apps.folder'
    );
    children.sort((a, b) => (b.createdTime ?? '').localeCompare(a.createdTime ?? ''));
    for (const extra of children.slice(SNAPSHOT_RETENTION)) {
      await driveJson(`files/${extra.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trashed: true }),
      });
    }
  }

  return {
    /*
     * Purpose: Obtain a Drive.file token without mixing it into Google sign-in.
     * Design: Platform client ID only; prototype AuthSession implicit token.
     * Workflow: Invoked from Settings "Authorize Drive".
     * Data Handoff: Stores the access token under DRIVE_TOKEN_KEY.
     */
    async authorize() {
      const id = googleClientIdForCurrentPlatform();
      if (!id) {
        throw new Error(`Google OAuth client ID is not configured for ${Platform.OS}`);
      }
      const redirectUri = AuthSession.makeRedirectUri({ scheme: 'captainslog' });
      const discovery = await AuthSession.fetchDiscoveryAsync('https://accounts.google.com');
      // Prototype-only: AuthSession ResponseType.Token is not the production Drive auth path.
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

    async isAuthorized() {
      return Boolean(await getSecret(DRIVE_TOKEN_KEY));
    },

    /*
     * Purpose: Create one timestamped snapshot folder containing the database, attachments, and manifest.
     * Design: WAL checkpoint then serialize; retain the newest 7 snapshot folders.
     * Workflow: First-class backup() used by BackupService.backupNow.
     * Data Handoff: Uploads files into a new Drive folder and updates lastBackup* settings.
     */
    async backup() {
      const db = deps.getDb();
      await checkpointWal(db);
      const databaseBytes = await db.serializeAsync();
      const files = await deps.attachments.listManagedFiles();
      const createdAt = nowMs();
      const label = snapshotLabel(createdAt);
      const rootId = await findOrCreateRootFolder();
      const snapshotId = await createFolder(label, [rootId], 'snapshot');

      await uploadBytes(snapshotId, DATABASE_FILE_NAME, 'application/x-sqlite3', databaseBytes);

      const manifestAttachments: SnapshotManifest['attachments'] = [];
      for (const file of files) {
        const storedName = `att__${file.attachmentId}__${file.fileName}`;
        const bytes = await deps.attachments.readFileBytes(file.uri);
        await uploadBytes(snapshotId, storedName, file.mimeType, bytes);
        manifestAttachments.push({
          storedName,
          attachmentId: file.attachmentId,
          fileName: file.fileName,
        });
      }

      const manifest: SnapshotManifest = {
        schemaVersion: 1,
        createdAt,
        label,
        databaseFileName: DATABASE_FILE_NAME,
        attachments: manifestAttachments,
      };
      await uploadBytes(
        snapshotId,
        MANIFEST_FILE_NAME,
        'application/json',
        new TextEncoder().encode(JSON.stringify(manifest))
      );
      await enforceRetention(rootId);
      await deps.settings.set({
        lastBackupAt: createdAt,
        lastBackupState: 'current',
        lastBackupDetail: `Snapshot ${label} (${files.length} attachment files)`,
      });
    },

    /*
     * Purpose: List snapshot folders the user can restore.
     * Design: Newest first; attachment counts come from manifest when present.
     * Workflow: Called by Settings when Drive is authorized.
     * Data Handoff: Returns BackupSnapshot[] for restore buttons.
     */
    async listBackups() {
      const rootId = await findOrCreateRootFolder();
      const folders = (await listChildren(rootId)).filter(
        (file) => file.mimeType === 'application/vnd.google-apps.folder'
      );
      folders.sort((a, b) => (b.createdTime ?? '').localeCompare(a.createdTime ?? ''));
      const snapshots: BackupSnapshot[] = [];
      for (const folder of folders) {
        let attachmentCount = 0;
        try {
          const children = await listChildren(folder.id);
          const manifestFile = children.find((child) => child.name === MANIFEST_FILE_NAME);
          if (manifestFile) {
            const bytes = await driveBytes(manifestFile.id);
            const manifest = JSON.parse(new TextDecoder().decode(bytes)) as SnapshotManifest;
            attachmentCount = manifest.attachments.length;
          }
        } catch {
          attachmentCount = 0;
        }
        snapshots.push({
          id: folder.id,
          createdAt: folder.createdTime ? Date.parse(folder.createdTime) : 0,
          label: folder.name,
          attachmentCount,
        });
      }
      return snapshots;
    },

    /*
     * Purpose: Download a snapshot and install it as the local canonical archive.
     * Design: Restore is explicit; local remains authoritative until this method runs.
     * Workflow: Settings restore button; ArchiveRuntime replaces SQLite and files.
     * Data Handoff: Returns RestoreVerification after local install.
     */
    async restoreBackup(snapshotId) {
      const children = await listChildren(snapshotId);
      const dbFile = children.find((child) => child.name === DATABASE_FILE_NAME);
      if (!dbFile) {
        throw new Error('Snapshot is missing captains-log.db');
      }
      const manifestFile = children.find((child) => child.name === MANIFEST_FILE_NAME);
      let attachmentsMeta: SnapshotManifest['attachments'] = [];
      if (manifestFile) {
        const manifestBytes = await driveBytes(manifestFile.id);
        const manifest = JSON.parse(new TextDecoder().decode(manifestBytes)) as SnapshotManifest;
        attachmentsMeta = manifest.attachments;
      } else {
        attachmentsMeta = children
          .filter((child) => child.name.startsWith('att__'))
          .map((child) => {
            const parsed = parseStoredAttachmentName(child.name);
            return parsed
              ? { storedName: child.name, ...parsed }
              : { storedName: child.name, attachmentId: 'unknown', fileName: child.name };
          });
      }

      const databaseBytes = await driveBytes(dbFile.id);
      const files: RestoredAttachmentFile[] = [];
      for (const meta of attachmentsMeta) {
        const remote = children.find((child) => child.name === meta.storedName);
        if (!remote) {
          continue;
        }
        files.push({
          attachmentId: meta.attachmentId,
          fileName: meta.fileName,
          bytes: await driveBytes(remote.id),
        });
      }

      return deps.runtime.installRestoredArchive({ databaseBytes, files });
    },

    async getStatus() {
      const settings = await deps.settings.get();
      const authorized = await getSecret(DRIVE_TOKEN_KEY);
      const online = await deps.network.isInternetReachable();
      let state = settings.lastBackupState;
      let detail = settings.lastBackupDetail;
      if (!googleClientIdForCurrentPlatform()) {
        state = 'not_configured';
        detail = `Set the Google OAuth client ID for ${Platform.OS} to enable Drive backup`;
      } else if (!authorized) {
        state = 'unauthorized';
        detail = 'Authorize Google Drive from Settings (visible drive.file snapshots)';
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

/*
 * Purpose: Name snapshot folders in UTC so list order is unambiguous.
 * Design: snapshot-YYYYMMDD-HHMMSS under the visible backup root.
 * Workflow: Called when creating a snapshot folder.
 * Data Handoff: Returns the Drive folder name string.
 */
function snapshotLabel(ms: number): string {
  const d = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `snapshot-${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}-${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}`;
}

function parseStoredAttachmentName(
  name: string
): { attachmentId: string; fileName: string } | null {
  const match = /^att__([0-9a-f-]{36})__(.+)$/i.exec(name);
  if (!match) {
    return null;
  }
  return { attachmentId: match[1], fileName: match[2] };
}
