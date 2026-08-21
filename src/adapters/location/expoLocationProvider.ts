/*
 * File: expoLocationProvider.ts
 *
 * Purpose:
 *     Optional per-entry location via expo-location, requested only on use.
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

import * as Location from 'expo-location';

import type { LocationProvider } from '@/models/contracts';

/*
 * Purpose: Isolate expo-location behind LocationProvider.
 * Design: Foreground-only; permission is never requested at application launch.
 * Workflow: Constructed by createAppServices for LocationService.
 * Data Handoff: Returns status and optional coordinates to CaptureScreen.
 */
export function createExpoLocationProvider(): LocationProvider {
  return {
    /*
     * Purpose: Report location permission without prompting.
     * Design: Distinguish undetermined vs denied so Settings can show real state.
     * Workflow: Called from SettingsScreen reload.
     * Data Handoff: Returns a status string for LOCATION telemetry.
     */
    async getPermissionStatus() {
      const status = await Location.getForegroundPermissionsAsync();
      if (status.granted) {
        return 'granted';
      }
      return status.canAskAgain ? 'undetermined' : 'denied';
    },

    /*
     * Purpose: Attach coordinates only when the user taps Location.
     * Design: Balanced accuracy is enough for a log pin; null if the user refuses.
     * Workflow: Called from CaptureScreen; result is stored on the entry at commit.
     * Data Handoff: Returns GeoLocation or null for CreateEntryInput.location.
     */
    async requestCurrentLocation() {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) {
        return null;
      }
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      return {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      };
    },
  };
}
