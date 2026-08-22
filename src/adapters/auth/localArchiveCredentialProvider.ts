/*
 * File: src/adapters/auth/localArchiveCredentialProvider.ts
 *
 * Purpose:
 *     On-device archive identifier and password stored in secure platform storage.
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
 *     DEV-2026-08-21-007, DEV-2026-08-21-008
 */

import * as Crypto from 'expo-crypto';

import type { AuthProvider } from '@/models/contracts';
import { bytesToHex } from '@noble/hashes/utils.js';
import { derivePasswordKey, KDF_NAME, PBKDF2_ITERATIONS } from '@/utilities/passwordKdf';
import { deleteSecret, getSecret, setSecret } from '@/utilities/secureKv';

const ACCOUNT_KEY = 'captains-log.local-archive-credential';
const LEGACY_ACCOUNT_KEY = 'captains-log.email-account';

interface StoredCredential {
  identifier: string;
  salt: string;
  hash: string;
  kdf?: string;
  iterations?: number;
}

/*
 * Purpose: Implement AuthProvider for a local archive credential without email ownership proof.
 * Design: First successful sign-in creates the record; later calls verify identifier + PBKDF2 hash.
 * Workflow: Constructed by createAppServices and used by AuthGate via AuthService.
 * Data Handoff: Returns AuthAccount { identifier, method: 'local_archive' } after create or unlock.
 */
export function createLocalArchiveCredentialProvider(): AuthProvider {
  return {
    method: 'local_archive',
    isConfigured() {
      return true;
    },

    /*
     * Purpose: Restore the local archive identity if one exists.
     * Design: Do not return the hash; only identifier and method leave this adapter.
     * Workflow: Used by AuthService.getSession and hasLocalAccount.
     * Data Handoff: Returns AuthAccount or null.
     */
    async getAccount() {
      const stored = await readStored();
      if (!stored) {
        return null;
      }
      return { identifier: stored.identifier, method: 'local_archive' as const };
    },

    /*
     * Purpose: Create the local archive credential or unlock an existing one.
     * Design: Missing record means create; mismatch throws so the UI can show an error without wiping the archive.
     * Workflow: Called from AuthGate with identifier and password fields.
     * Data Handoff: Persists salt/hash via setSecret and returns AuthAccount to AuthService.
     */
    async signIn(credentials) {
      if (!credentials?.identifier || !credentials.password) {
        throw new Error('Archive identifier and password are required');
      }
      const identifier = credentials.identifier.trim().toLowerCase();
      const stored = await readStored();
      if (!stored) {
        const created = await createStored(identifier, credentials.password);
        return { identifier: created.identifier, method: 'local_archive' as const };
      }
      if (stored.identifier !== identifier || !(await passwordMatches(stored, credentials.password))) {
        throw new Error('Identifier or password did not match the local archive');
      }
      if (stored.kdf !== KDF_NAME) {
        const upgraded = await createStored(stored.identifier, credentials.password);
        return { identifier: upgraded.identifier, method: 'local_archive' as const };
      }
      return { identifier: stored.identifier, method: 'local_archive' };
    },

    /*
     * Purpose: Remove the stored local credential record.
     * Design: Session clearing is AuthService's job; this only deletes the credential blob.
     * Workflow: Available if a full local reset is required; Settings sign-out uses the session key instead.
     * Data Handoff: Deletes ACCOUNT_KEY and the legacy email key from secure storage.
     */
    async signOut() {
      await deleteSecret(ACCOUNT_KEY);
      await deleteSecret(LEGACY_ACCOUNT_KEY);
    },
  };
}

/*
 * Purpose: Load a credential from the current or legacy secure-store key.
 * Design: Legacy records used `email` and salted SHA-256; map them onto identifier.
 * Workflow: Called by getAccount and signIn.
 * Data Handoff: Returns a normalized StoredCredential or null.
 */
async function readStored(): Promise<StoredCredential | null> {
  const raw = (await getSecret(ACCOUNT_KEY)) ?? (await getSecret(LEGACY_ACCOUNT_KEY));
  if (!raw) {
    return null;
  }
  const parsed = JSON.parse(raw) as StoredCredential & { email?: string };
  return {
    identifier: (parsed.identifier ?? parsed.email ?? '').toLowerCase(),
    salt: parsed.salt,
    hash: parsed.hash,
    kdf: parsed.kdf,
    iterations: parsed.iterations,
  };
}

/*
 * Purpose: Persist a PBKDF2 credential under the current key and drop the legacy key.
 * Design: 16 random bytes as hex salt; iterations stored so they can change later.
 * Workflow: Called on first create and on legacy SHA-256 upgrade.
 * Data Handoff: Writes ACCOUNT_KEY JSON.
 */
async function createStored(identifier: string, password: string): Promise<StoredCredential> {
  const saltBytes = await Crypto.getRandomBytesAsync(16);
  const salt = bytesToHex(saltBytes);
  const hash = derivePasswordKey(password, salt, PBKDF2_ITERATIONS);
  const stored: StoredCredential = {
    identifier,
    salt,
    hash,
    kdf: KDF_NAME,
    iterations: PBKDF2_ITERATIONS,
  };
  await setSecret(ACCOUNT_KEY, JSON.stringify(stored));
  await deleteSecret(LEGACY_ACCOUNT_KEY);
  return stored;
}

/*
 * Purpose: Verify a password against PBKDF2 or legacy salted SHA-256.
 * Design: Legacy path exists only to upgrade existing prototype accounts.
 * Workflow: Called from signIn when a record already exists.
 * Data Handoff: Returns whether the password matches the stored hash.
 */
async function passwordMatches(stored: StoredCredential, password: string): Promise<boolean> {
  if (stored.kdf === KDF_NAME) {
    const hash = derivePasswordKey(password, stored.salt, stored.iterations ?? PBKDF2_ITERATIONS);
    return hash === stored.hash;
  }
  const legacy = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    `${stored.salt}:${password}`
  );
  return legacy === stored.hash;
}
