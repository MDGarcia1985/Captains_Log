/*
 * File: ids.ts
 *
 * Purpose:
 *     Allocate stable unique identifiers for domain records.
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

import * as Crypto from 'expo-crypto';

export function createId(): string {
  return Crypto.randomUUID();
}
