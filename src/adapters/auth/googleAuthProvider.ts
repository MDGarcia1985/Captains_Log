/*
 * File: googleAuthProvider.ts
 *
 * Purpose:
 *     Google authentication via expo-auth-session, separate from Drive scopes.
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

import Constants from 'expo-constants';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';

import type { AuthProvider } from '@/models/contracts';
import { deleteSecret, getSecret, setSecret } from '@/utilities/secureKv';

WebBrowser.maybeCompleteAuthSession();

const ACCOUNT_KEY = 'captains-log.google-account';
const TOKEN_KEY = 'captains-log.google-id-token';

/*
 * Purpose: Resolve Google OAuth client IDs from app config or public env vars.
 * Design: Empty strings mean "not configured" so AuthGate can fail with a clear message.
 * Workflow: Called when constructing the Google AuthProvider.
 * Data Handoff: Returns web/ios/android client id strings for AuthRequest.
 */
function clientIds() {
  const extra = (Constants.expoConfig?.extra ?? {}) as {
    googleWebClientId?: string;
    googleIosClientId?: string;
    googleAndroidClientId?: string;
  };
  return {
    web: extra.googleWebClientId || process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || '',
    ios: extra.googleIosClientId || process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || '',
    android: extra.googleAndroidClientId || process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || '',
  };
}

/*
 * Purpose: Implement AuthProvider for Google sign-in without Drive scopes.
 * Design: openid/email/profile only; Drive uses a separate BackupProvider authorize() call.
 * Workflow: Constructed by createAppServices; used when the user taps Sign In With Google.
 * Data Handoff: Returns AuthAccount and stores an access token in secure storage.
 */
export function createGoogleAuthProvider(): AuthProvider {
  const ids = clientIds();
  const configured = Boolean(ids.web || ids.ios || ids.android);

  return {
    method: 'google',
    isConfigured() {
      return configured;
    },

    /*
     * Purpose: Restore a previously completed Google account.
     * Design: Parse the stored JSON account without re-validating online, per offline-first rules.
     * Workflow: Called by AuthService.getSession after the session flag is present.
     * Data Handoff: Returns AuthAccount or null.
     */
    async getAccount() {
      const raw = await getSecret(ACCOUNT_KEY);
      if (!raw) {
        return null;
      }
      return JSON.parse(raw);
    },

    /*
     * Purpose: Complete Google OAuth and record the user's email.
     * Design: Token response plus userinfo fetch; throws if client IDs are missing or the user cancels.
     * Workflow: Invoked from AuthGate; requires network for the initial handshake only.
     * Data Handoff: Persists account JSON and access token; returns AuthAccount to AuthService.
     */
    async signIn() {
      if (!configured) {
        throw new Error('Google OAuth client IDs are not configured');
      }
      const redirectUri = AuthSession.makeRedirectUri({ scheme: 'captainslog' });
      const discovery = await AuthSession.fetchDiscoveryAsync('https://accounts.google.com');
      const request = new AuthSession.AuthRequest({
        clientId: ids.web || ids.android || ids.ios,
        redirectUri,
        scopes: ['openid', 'email', 'profile'],
        responseType: AuthSession.ResponseType.Token,
        extraParams: { include_granted_scopes: 'true' },
      });
      const result = await request.promptAsync(discovery);
      if (result.type !== 'success') {
        throw new Error('Google sign-in was cancelled');
      }
      const accessToken = result.authentication?.accessToken;
      if (!accessToken) {
        throw new Error('Google sign-in did not return a token');
      }
      const profileResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const profile = (await profileResponse.json()) as { email?: string };
      const email = profile.email ?? 'google-user';
      const account = { email, method: 'google' as const };
      await setSecret(ACCOUNT_KEY, JSON.stringify(account));
      await setSecret(TOKEN_KEY, accessToken);
      return account;
    },

    /*
     * Purpose: Forget Google identity and token on this device.
     * Design: Does not revoke the token at Google; local secrets are the MVP concern.
     * Workflow: Available to AuthService; Settings currently clears the session flag instead.
     * Data Handoff: Deletes Google account and token keys.
     */
    async signOut() {
      await deleteSecret(ACCOUNT_KEY);
      await deleteSecret(TOKEN_KEY);
    },
  };
}

export async function getGoogleAccessToken(): Promise<string | null> {
  return getSecret(TOKEN_KEY);
}
