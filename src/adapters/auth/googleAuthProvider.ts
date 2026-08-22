/*
 * File: src/adapters/auth/googleAuthProvider.ts
 *
 * Purpose:
 *     Google authentication via expo-auth-session, separate from Drive scopes.
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
 *     DEV-2026-08-21-009
 */

import Constants from 'expo-constants';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';

import type { AuthProvider } from '@/models/contracts';
import { selectGoogleClientId, type GoogleClientIds } from '@/utilities/googleClientId';
import { deleteSecret, getSecret, setSecret } from '@/utilities/secureKv';

WebBrowser.maybeCompleteAuthSession();

const ACCOUNT_KEY = 'captains-log.google-account';
const TOKEN_KEY = 'captains-log.google-id-token';

/*
 * Purpose: Resolve configured Google OAuth client IDs from app config or public env vars.
 * Design: Empty strings mean not configured for that platform.
 * Workflow: Called when constructing the Google AuthProvider and Drive authorize.
 * Data Handoff: Returns web/ios/android client id strings.
 */
export function configuredGoogleClientIds(): GoogleClientIds {
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
 * Purpose: Client ID for the OS this process is running on.
 * Design: No cross-platform fallback (DEV-2026-08-21-009).
 * Workflow: Used by Google sign-in and Drive authorization.
 * Data Handoff: Returns a client ID or ''.
 */
export function googleClientIdForCurrentPlatform(): string {
  return selectGoogleClientId(Platform.OS, configuredGoogleClientIds());
}

/*
 * Purpose: Implement AuthProvider for Google sign-in without Drive scopes.
 * Design: openid/email/profile only; Drive uses a separate BackupProvider authorize() call.
 * Workflow: Constructed by createAppServices; used when the user taps Sign In With Google.
 * Data Handoff: Returns AuthAccount and stores an access token in secure storage.
 */
export function createGoogleAuthProvider(): AuthProvider {
  const clientId = googleClientIdForCurrentPlatform();
  const configured = Boolean(clientId);

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
      const parsed = JSON.parse(raw) as { identifier?: string; email?: string; method?: string };
      return {
        identifier: parsed.identifier ?? parsed.email ?? 'google-user',
        method: 'google' as const,
      };
    },

    /*
     * Purpose: Complete Google OAuth and record the user's Google identifier.
     * Design: Prototype-only AuthSession implicit token flow; production should use a native SDK.
     * Workflow: Invoked from AuthGate; requires network for the initial handshake only.
     * Data Handoff: Persists account JSON and access token; returns AuthAccount to AuthService.
     */
    async signIn() {
      if (!configured) {
        throw new Error(`Google OAuth client ID is not configured for ${Platform.OS}`);
      }
      const redirectUri = AuthSession.makeRedirectUri({ scheme: 'captainslog' });
      const discovery = await AuthSession.fetchDiscoveryAsync('https://accounts.google.com');
      // Prototype-only: AuthSession ResponseType.Token is not the production Google Sign-In path.
      const request = new AuthSession.AuthRequest({
        clientId,
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
      const identifier = profile.email ?? 'google-user';
      const account = { identifier, method: 'google' as const };
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
