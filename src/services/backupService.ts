/*
 * File: src/services/backupService.ts
 *
 * Purpose:
 *     Orchestrate backup and restore without exposing Google Drive details to the UI.
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
 *
 * Related Decisions:
 *     DEV-2026-08-21-003, DEV-2026-08-21-005
 */

import type { BackupProvider, NetworkStatusProvider } from '@/models/contracts';
import type { BackupSnapshot, RestoreVerification } from '@/models/types';
import type { SettingsStore } from '@/adapters/sqlite/settingsStore';
import { nowMs } from '@/utilities/time';

/*
 * Purpose: Orchestrate backup without exposing Google Drive details to the UI.
 * Design: No-op when unauthorized so launch/background cannot mark backup failed before the user opts in.
 * Workflow: Constructed by createAppServices; triggered at launch, background, and Settings.
 * Data Handoff: Updates settings telemetry; UI reads BackupStatus via getStatus.
 */
export function createBackupService(deps: {
  provider: BackupProvider;
  settings: SettingsStore;
  network: NetworkStatusProvider;
}) {
  return {
    getStatus() {
      return deps.provider.getStatus();
    },

    authorize() {
      return deps.provider.authorize();
    },

    isAuthorized() {
      return deps.provider.isAuthorized();
    },

    listBackups(): Promise<BackupSnapshot[]> {
      return deps.provider.listBackups();
    },

    /*
     * Purpose: Copy the local archive to the backup provider when allowed.
     * Design: Swallow provider errors after recording failed status so local use continues.
     * Workflow: Called from AppServicesProvider, AppState background, and Settings.
     * Data Handoff: Writes lastBackup* settings consumed by telemetry labels.
     */
    async backupNow(): Promise<void> {
      try {
        const authorized = await deps.provider.isAuthorized();
        if (!authorized) {
          return;
        }
        const online = await deps.network.isInternetReachable();
        if (!online) {
          await deps.settings.set({
            lastBackupState: 'offline',
            lastBackupDetail: 'Backup skipped; device is offline',
          });
          return;
        }
        await deps.provider.backup();
        await deps.settings.set({
          lastBackupAt: nowMs(),
          lastBackupState: 'current',
          lastBackupDetail: 'Local archive copied as a Drive snapshot',
        });
      } catch (error) {
        await deps.settings.set({
          lastBackupState: 'failed',
          lastBackupDetail: error instanceof Error ? error.message : 'Backup failed',
        });
      }
    },

    /*
     * Purpose: Replace the local archive with a selected snapshot.
     * Design: Failures are recorded on backup status; the provider performs install/verify.
     * Workflow: Called from Settings restore actions.
     * Data Handoff: Returns RestoreVerification for the Settings message.
     */
    async restoreBackup(snapshotId: string): Promise<RestoreVerification> {
      try {
        return await deps.provider.restoreBackup(snapshotId);
      } catch (error) {
        try {
          await deps.settings.set({
            lastBackupState: 'failed',
            lastBackupDetail: error instanceof Error ? error.message : 'Restore failed',
          });
        } catch {
          // The live database may already be closed if restore failed after swap.
        }
        throw error;
      }
    },
  };
}

export type BackupService = ReturnType<typeof createBackupService>;
