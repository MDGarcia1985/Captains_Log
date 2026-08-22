/*
 * File: src/utilities/passwordKdf.ts
 *
 * Purpose:
 *     Expensive password key derivation for local archive credentials.
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
 *     DEV-2026-08-21-008
 */

import { pbkdf2 } from '@noble/hashes/pbkdf2.js';
import { sha256 } from '@noble/hashes/sha2.js';
import { bytesToHex, hexToBytes } from '@noble/hashes/utils.js';

export const PBKDF2_ITERATIONS = 100_000;
export const PBKDF2_DK_LEN = 32;
export const KDF_NAME = 'pbkdf2-sha256';

/*
 * Purpose: Derive a hex key from a password using PBKDF2-HMAC-SHA256.
 * Design: 100000 iterations and SHA-256 HMAC; no expo-crypto round trips per iteration.
 * Workflow: Called when creating or verifying a LocalArchiveCredential.
 * Data Handoff: Returns a 32-byte hex string compared to or stored with the credential record.
 */
export function derivePasswordKey(
  password: string,
  saltHex: string,
  iterations: number = PBKDF2_ITERATIONS
): string {
  const derived = pbkdf2(sha256, password, hexToBytes(saltHex), {
    c: iterations,
    dkLen: PBKDF2_DK_LEN,
  });
  return bytesToHex(derived);
}
