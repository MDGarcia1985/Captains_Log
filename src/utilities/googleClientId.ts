/*
 * File: src/utilities/googleClientId.ts
 *
 * Purpose:
 *     Choose a Google OAuth client ID for the current platform only.
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
 *     DEV-2026-08-21-009
 */

export interface GoogleClientIds {
  web: string;
  ios: string;
  android: string;
}

/*
 * Purpose: Return the client ID that matches the runtime platform.
 * Design: No web||android||ios fallback; an empty platform ID means not configured.
 * Workflow: Used by Google auth and Drive authorize before constructing AuthRequest.
 * Data Handoff: Returns a trimmed client ID string, or '' when that platform has none.
 */
export function selectGoogleClientId(platform: string, ids: GoogleClientIds): string {
  if (platform === 'ios') {
    return ids.ios.trim();
  }
  if (platform === 'android') {
    return ids.android.trim();
  }
  if (platform === 'web') {
    return ids.web.trim();
  }
  return '';
}
