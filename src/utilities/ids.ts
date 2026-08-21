/*
 * File: ids.ts
 *
 * Purpose:
 *     Allocate stable unique identifiers for domain records.
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

import * as Crypto from 'expo-crypto';

export function createId(): string {
  return Crypto.randomUUID();
}
