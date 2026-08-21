/*
 * File: settingsStore.ts
 *
 * Purpose:
 *     Key/value settings persisted in SQLite.
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

import type { SQLiteDatabase } from 'expo-sqlite';

import type { AppSettings, BackupState, Handedness } from '@/models/types';

const DEFAULTS: AppSettings = {
  handedness: 'right',
  skin: 'starship',
  lastBackupAt: null,
  lastBackupState: 'not_configured',
  lastBackupDetail: 'Google Drive is not authorized',
};

/*
 * Purpose: Read and write MVP settings without a separate settings domain table per field.
 * Design: Key/value keeps schema small; skin is forced to starship because other skins are deferred.
 * Workflow: Constructed by createAppServices for SettingsService and backup status writes.
 * Data Handoff: Returns a SettingsStore used by settings UI and BackupService.
 */
export function createSettingsStore(db: SQLiteDatabase) {
  return {
    /*
     * Purpose: Load handedness and backup telemetry with defaults for missing keys.
     * Design: Merge onto DEFAULTS so a fresh archive still has right-handed starship settings.
     * Workflow: Called at shell start and whenever SettingsScreen reloads.
     * Data Handoff: Returns AppSettings for ChromeContext and telemetry labels.
     */
    async get(): Promise<AppSettings> {
      const rows = await db.getAllAsync<{ key: string; value: string }>(
        `SELECT key, value FROM app_settings`
      );
      const map = new Map(rows.map((row) => [row.key, row.value]));
      return {
        handedness: (map.get('handedness') as Handedness) || DEFAULTS.handedness,
        skin: 'starship',
        lastBackupAt: map.get('lastBackupAt') ? Number(map.get('lastBackupAt')) : null,
        lastBackupState: (map.get('lastBackupState') as BackupState) || DEFAULTS.lastBackupState,
        lastBackupDetail: map.get('lastBackupDetail') || DEFAULTS.lastBackupDetail,
      };
    },

    /*
     * Purpose: Persist a partial settings update.
     * Design: Read-modify-write the full snapshot so backup fields are not wiped when only handedness changes.
     * Workflow: Called by setHandedness and BackupService after backup attempts.
     * Data Handoff: Upserts app_settings and returns the merged AppSettings.
     */
    async set(partial: Partial<AppSettings>): Promise<AppSettings> {
      const current = await this.get();
      const next = { ...current, ...partial, skin: 'starship' as const };
      const entries: [string, string][] = [
        ['handedness', next.handedness],
        ['skin', next.skin],
        ['lastBackupAt', next.lastBackupAt == null ? '' : String(next.lastBackupAt)],
        ['lastBackupState', next.lastBackupState],
        ['lastBackupDetail', next.lastBackupDetail],
      ];
      for (const [key, value] of entries) {
        await db.runAsync(
          `INSERT INTO app_settings (key, value) VALUES (?, ?)
           ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
          key,
          value
        );
      }
      return next;
    },
  };
}

export type SettingsStore = ReturnType<typeof createSettingsStore>;
