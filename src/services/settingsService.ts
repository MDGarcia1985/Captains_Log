/*
 * File: settingsService.ts
 *
 * Purpose:
 *     Read and write MVP settings, including handedness.
 *
 * Author:
 *     Michael Garcia
 *
 * Contact:
 *     michael@mandedesign.studio
 *
 * License:
 *     SPDX-License-Identifier: MPL-2.0
 */

import type { SettingsStore } from '@/adapters/sqlite/settingsStore';
import type { AppSettings, Handedness } from '@/models/types';

/*
 * Purpose: Expose MVP settings, currently handedness and backup-backed snapshot reads.
 * Design: Skin is not settable because only starship exists.
 * Workflow: Constructed by createAppServices; used by AppShell and SettingsScreen.
 * Data Handoff: Returns AppSettings; setHandedness persists and returns the next snapshot.
 */
export function createSettingsService(store: SettingsStore) {
  return {
    get(): Promise<AppSettings> {
      return store.get();
    },
    async setHandedness(handedness: Handedness): Promise<AppSettings> {
      return store.set({ handedness });
    },
  };
}

export type SettingsService = ReturnType<typeof createSettingsService>;
