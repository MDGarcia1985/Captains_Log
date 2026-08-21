/*
 * File: localEmailAuthProvider.ts
 *
 * Purpose:
 *     Local email/password account stored in secure platform storage.
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

import type { AuthProvider } from '@/models/contracts';
import { deleteSecret, getSecret, setSecret } from '@/utilities/secureKv';

const ACCOUNT_KEY = 'captains-log.email-account';

interface StoredAccount {
  email: string;
  salt: string;
  hash: string;
}

/*
 * Purpose: Hash a password with a per-account salt for local verification.
 * Design: SHA-256 is sufficient for an on-device archive; there is no remote verifier in MVP.
 * Workflow: Called from signIn during account create and unlock.
 * Data Handoff: Returns a hex digest compared to or stored with the account record.
 */
async function hashPassword(password: string, salt: string): Promise<string> {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, `${salt}:${password}`);
}

/*
 * Purpose: Implement AuthProvider for email without a network identity service.
 * Design: First successful sign-in creates the account; later calls verify the same email/hash.
 * Workflow: Constructed by createAppServices and used by AuthGate via AuthService.
 * Data Handoff: Returns AuthAccount { email, method: 'email' } after create or unlock.
 */
export function createLocalEmailAuthProvider(): AuthProvider {
  return {
    method: 'email',
    isConfigured() {
      return true;
    },

    /*
     * Purpose: Restore the local account identity if one exists.
     * Design: Do not return the hash; only email and method leave this adapter.
     * Workflow: Used by AuthService.getSession and hasLocalAccount.
     * Data Handoff: Returns AuthAccount or null.
     */
    async getAccount() {
      const raw = await getSecret(ACCOUNT_KEY);
      if (!raw) {
        return null;
      }
      const stored = JSON.parse(raw) as StoredAccount;
      return { email: stored.email, method: 'email' };
    },

    /*
     * Purpose: Create the local archive account or unlock an existing one.
     * Design: Missing record means create; mismatch throws so the UI can show an error without wiping the archive.
     * Workflow: Called from AuthGate with email and password fields.
     * Data Handoff: Persists salt/hash via setSecret and returns AuthAccount to AuthService.
     */
    async signIn(credentials) {
      if (!credentials?.email || !credentials.password) {
        throw new Error('Email and password are required');
      }
      const email = credentials.email.trim().toLowerCase();
      const raw = await getSecret(ACCOUNT_KEY);
      if (!raw) {
        const salt = Crypto.randomUUID();
        const hash = await hashPassword(credentials.password, salt);
        const stored: StoredAccount = { email, salt, hash };
        await setSecret(ACCOUNT_KEY, JSON.stringify(stored));
        return { email, method: 'email' };
      }
      const stored = JSON.parse(raw) as StoredAccount;
      const hash = await hashPassword(credentials.password, stored.salt);
      if (stored.email !== email || stored.hash !== hash) {
        throw new Error('Email or password did not match the local archive');
      }
      return { email: stored.email, method: 'email' };
    },

    /*
     * Purpose: Remove the stored local account record.
     * Design: Session clearing is AuthService's job; this only deletes the credential blob.
     * Workflow: Available if a full local reset is required; Settings sign-out uses the session key instead.
     * Data Handoff: Deletes ACCOUNT_KEY from secure storage.
     */
    async signOut() {
      await deleteSecret(ACCOUNT_KEY);
    },
  };
}
