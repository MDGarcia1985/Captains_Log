/*
 * File: src/services/authService.ts
 *
 * Purpose:
 *     Compose local archive credentials and Google authentication behind one service.
 *
 * Author:
 *     Michael Garcia
 *
 * Contact:
 *     michael@mandedesign.studio
 *
 * License:
 *     SPDX-License-Identifier: MPL-2.0
 *
 * Related Decisions:
 *     DEV-2026-08-21-007
 */

import type { AuthProvider } from '@/models/contracts';
import type { AuthAccount } from '@/models/types';
import { deleteSecret, getSecret, setSecret } from '@/utilities/secureKv';

const SESSION_KEY = 'captains-log.session';

/*
 * Purpose: Compose local-archive and Google providers behind one session flag.
 * Design: Session key is separate from credentials so sign-out can lock the UI without deleting the local credential.
 * Workflow: Constructed by createAppServices; used by AuthGate and Settings.
 * Data Handoff: Returns AuthAccount after sign-in; getSession restores it on later launches.
 */
export function createAuthService(deps: { localArchive: AuthProvider; google: AuthProvider }) {
  return {
    googleConfigured: deps.google.isConfigured(),

    /*
     * Purpose: Restore an unlocked session without a network round trip.
     * Design: SESSION_KEY must exist; then prefer local archive credential, else Google.
     * Workflow: Called by AuthGate on boot.
     * Data Handoff: Returns AuthAccount or null to decide login vs shell.
     */
    async getSession(): Promise<AuthAccount | null> {
      const flag = await getSecret(SESSION_KEY);
      if (!flag) {
        return null;
      }
      return (await deps.localArchive.getAccount()) ?? (await deps.google.getAccount());
    },

    /*
     * Purpose: Create or unlock the local archive credential and mark the session active.
     * Design: Provider does credential work; this layer only sets SESSION_KEY.
     * Workflow: Called from AuthGate Unlock/Create.
     * Data Handoff: Returns AuthAccount to show the shell.
     */
    async signInWithLocalArchive(identifier: string, password: string): Promise<AuthAccount> {
      const account = await deps.localArchive.signIn({ identifier, password });
      await setSecret(SESSION_KEY, 'active');
      return account;
    },

    /*
     * Purpose: Complete Google sign-in and mark the session active.
     * Design: Same session flag as local archive so AuthGate does not care which provider succeeded.
     * Workflow: Called from AuthGate Sign In With Google.
     * Data Handoff: Returns AuthAccount to show the shell.
     */
    async signInWithGoogle(): Promise<AuthAccount> {
      const account = await deps.google.signIn();
      await setSecret(SESSION_KEY, 'active');
      return account;
    },

    async signOut(): Promise<void> {
      await deleteSecret(SESSION_KEY);
    },

    async hasLocalAccount(): Promise<boolean> {
      return Boolean(await deps.localArchive.getAccount());
    },
  };
}

export type AuthService = ReturnType<typeof createAuthService>;
