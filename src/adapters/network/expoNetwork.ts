/*
 * File: expoNetwork.ts
 *
 * Purpose:
 *     Report whether the device currently has reachable internet.
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

import * as Network from 'expo-network';

import type { NetworkStatusProvider } from '@/models/contracts';

/*
 * Purpose: Tell backup whether it may attempt a Drive upload.
 * Design: Prefer isInternetReachable; fall back to isConnected when reachability is unknown.
 * Workflow: Constructed by createAppServices; used at launch, background, and manual backup.
 * Data Handoff: Returns a boolean consumed by BackupService.backupNow and Drive getStatus.
 */
export function createExpoNetworkStatus(): NetworkStatusProvider {
  return {
    /*
     * Purpose: Detect reachable internet without blocking local archive use.
     * Design: Reachability can be null on some platforms, so connected is the fallback.
     * Workflow: Called before backupNow and while composing backup telemetry.
     * Data Handoff: Returns true/false to skip or attempt Google Drive uploads.
     */
    async isInternetReachable() {
      const state = await Network.getNetworkStateAsync();
      if (state.isInternetReachable != null) {
        return state.isInternetReachable;
      }
      return Boolean(state.isConnected);
    },
  };
}
