/*
 * File: locationService.ts
 *
 * Purpose:
 *     Optional location capture requested only when the user asks for it.
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

import type { LocationProvider } from '@/models/contracts';

/*
 * Purpose: Optional location capture requested only when the user asks for it.
 * Design: Pass-through to LocationProvider so UI never imports expo-location.
 * Workflow: Constructed by createAppServices; used by CaptureScreen and Settings.
 * Data Handoff: Returns permission strings and optional GeoLocation.
 */
export function createLocationService(provider: LocationProvider) {
  return {
    getPermissionStatus() {
      return provider.getPermissionStatus();
    },
    requestCurrentLocation() {
      return provider.requestCurrentLocation();
    },
  };
}

export type LocationService = ReturnType<typeof createLocationService>;
