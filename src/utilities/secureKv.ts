/*
 * File: secureKv.ts
 *
 * Purpose:
 *     Store secrets in expo-secure-store, with a web localStorage fallback
 *     so the prototype can still boot in a browser.
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

import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

/*
 * Purpose: Persist a secret so auth and Drive tokens survive process restarts.
 * Design: SecureStore on native; localStorage on web because SecureStore is unavailable in the browser prototype.
 * Workflow: Called by email/Google auth adapters and the Drive backup adapter after credentials are created.
 * Data Handoff: Stores the string for later getSecret reads; no return value.
 */
export async function setSecret(key: string, value: string): Promise<void> {
  if (Platform.OS === 'web') {
    localStorage.setItem(key, value);
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

/*
 * Purpose: Read a previously stored secret.
 * Design: Mirror setSecret's platform split so web and native share one API.
 * Workflow: Called during session restore, Google token reuse, and Drive authorization checks.
 * Data Handoff: Returns the stored string or null to auth/backup adapters.
 */
export async function getSecret(key: string): Promise<string | null> {
  if (Platform.OS === 'web') {
    return localStorage.getItem(key);
  }
  return SecureStore.getItemAsync(key);
}

/*
 * Purpose: Remove a secret on sign-out or Drive disconnect.
 * Design: Same platform split as set/get so leftover web keys cannot outlive native keychain deletes.
 * Workflow: Called from AuthProvider.signOut and Drive authorization reset.
 * Data Handoff: Deletes the key; callers then treat getSecret as unauthenticated.
 */
export async function deleteSecret(key: string): Promise<void> {
  if (Platform.OS === 'web') {
    localStorage.removeItem(key);
    return;
  }
  await SecureStore.deleteItemAsync(key);
}
