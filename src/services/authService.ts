/*
 * File: authService.ts
 *
 * Purpose:
 *     Compose local email and Google authentication behind one service.
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

import type { AuthProvider } from '@/models/contracts';
import type { AuthAccount } from '@/models/types';
import { deleteSecret, getSecret, setSecret } from '@/utilities/secureKv';

const SESSION_KEY = 'captains-log.session';

/*
 * Purpose: Compose email and Google providers behind one session flag.
 * Design: Session key is separate from credentials so sign-out can lock the UI without deleting the local account.
 * Workflow: Constructed by createAppServices; used by AuthGate and Settings.
 * Data Handoff: Returns AuthAccount after sign-in; getSession restores it on later launches.
 */
export function createAuthService(deps: { email: AuthProvider; google: AuthProvider }) {
  return {
    googleConfigured: deps.google.isConfigured(),

    /*
     * Purpose: Restore an unlocked session without a network round trip.
     * Design: SESSION_KEY must exist; then prefer email account, else Google.
     * Workflow: Called by AuthGate on boot.
     * Data Handoff: Returns AuthAccount or null to decide login vs shell.
     */
    async getSession(): Promise<AuthAccount | null> {
      const flag = await getSecret(SESSION_KEY);
      if (!flag) {
        return null;
      }
      return (await deps.email.getAccount()) ?? (await deps.google.getAccount());
    },

    /*
     * Purpose: Create or unlock the local email archive and mark the session active.
     * Design: Provider does credential work; this layer only sets SESSION_KEY.
     * Workflow: Called from AuthGate Unlock/Create.
     * Data Handoff: Returns AuthAccount to show the shell.
     */
    async signInWithEmail(email: string, password: string): Promise<AuthAccount> {
      const account = await deps.email.signIn({ email, password });
      await setSecret(SESSION_KEY, 'active');
      return account;
    },

    /*
     * Purpose: Complete Google sign-in and mark the session active.
     * Design: Same session flag as email so AuthGate does not care which provider succeeded.
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
      return Boolean(await deps.email.getAccount());
    },
  };
}

export type AuthService = ReturnType<typeof createAuthService>;
