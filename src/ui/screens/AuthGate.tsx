/*
 * File: AuthGate.tsx
 *
 * Purpose:
 *     Require a local or Google account before entering the archive.
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
 *     DEV-2026-08-21-007
 */

import { useEffect, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { useAppServices } from '@/services/AppServicesProvider';
import { colors, fonts } from '@/theme/tokens';
import { CommandButton, TelemetryLabel } from '@/ui/components/primitives';
import { useChrome } from '@/ui/state/ChromeContext';

/*
 * Purpose: Gate the archive behind a local or Google account.
 * Design: Boot until services exist; locked session returns here without deleting the local account.
 * Workflow: Wraps AppShell in root layout; reads AuthService session on mount and after sign-out.
 * Data Handoff: Renders children (shell) once session is active and ChromeContext is unlocked.
 */
export function AuthGate({ children }: { children: React.ReactNode }) {
  const services = useAppServices();
  const chrome = useChrome();
  const [ready, setReady] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [hasAccount, setHasAccount] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!services) {
      return;
    }
    void (async () => {
      const session = await services.auth.getSession();
      if (session && !chrome.locked) {
        chrome.unlock();
        setReady(true);
        return;
      }
      setHasAccount(await services.auth.hasLocalAccount());
    })();
  }, [services, chrome, chrome.locked]);

  if (!services) {
    return (
      <View style={styles.boot}>
        <TelemetryLabel k="SYSTEM" v="INITIALIZING LOCAL ARCHIVE" />
      </View>
    );
  }

  if (ready && !chrome.locked) {
    return children;
  }

  return (
    <View style={styles.boot}>
      <TelemetryLabel k="CAPTAIN'S LOG" v="ACCESS REQUIRED" accent="orange" />
      <Text style={styles.title}>{hasAccount ? 'Unlock archive' : 'Create local archive'}</Text>
      <Text style={styles.copy}>
        Local archive credentials are stored on this device. The identifier may look like an email;
        this app does not verify email ownership. Google sign-in is optional and separate from Drive
        backup authorization.
      </Text>
      <TextInput
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        placeholder="archive identifier"
        placeholderTextColor={colors.textDim}
        style={styles.input}
      />
      <TextInput
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        placeholder="password"
        placeholderTextColor={colors.textDim}
        style={styles.input}
      />
      <CommandButton
        label={hasAccount ? 'Unlock' : 'Create Local Account'}
        dominant
        onPress={async () => {
          try {
            await services.auth.signInWithLocalArchive(email, password);
            chrome.unlock();
            setReady(true);
          } catch (cause) {
            setError(cause instanceof Error ? cause.message : 'Sign-in failed');
          }
        }}
      />
      <CommandButton
        label="Sign In With Google"
        onPress={async () => {
          try {
            await services.auth.signInWithGoogle();
            chrome.unlock();
            setReady(true);
          } catch (cause) {
            setError(cause instanceof Error ? cause.message : 'Google sign-in failed');
          }
        }}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  boot: {
    flex: 1,
    backgroundColor: colors.background,
    padding: 24,
    justifyContent: 'center',
    gap: 12,
  },
  title: {
    color: colors.text,
    fontFamily: fonts.heading,
    fontSize: 28,
    fontWeight: '700',
  },
  copy: {
    color: colors.textMuted,
    fontFamily: fonts.body,
    lineHeight: 22,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.panel,
    color: colors.text,
    padding: 12,
    fontFamily: fonts.body,
    fontSize: 16,
  },
  error: {
    color: colors.warning,
    fontFamily: fonts.mono,
    fontSize: 12,
  },
});
