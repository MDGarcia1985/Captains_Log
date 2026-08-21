/*
 * File: _layout.tsx
 *
 * Purpose:
 *     Root Expo Router layout: services, auth gate, and responsive shell.
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

import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import '@/global.css';

import { AppServicesProvider } from '@/services/AppServicesProvider';
import { colors } from '@/theme/tokens';
import { AppShell } from '@/ui/layout/AppShell';
import { AuthGate } from '@/ui/screens/AuthGate';
import { ChromeProvider } from '@/ui/state/ChromeContext';
import { SelectionProvider } from '@/ui/state/SelectionContext';

/*
 * Purpose: Compose providers, auth gate, and the responsive shell around Expo Router screens.
 * Design: Stack stays inside AppShell so the rail is global; headers stay hidden.
 * Workflow: Expo Router entry; child routes render in the primary pane.
 * Data Handoff: Renders the authenticated shell around Stack screens.
 */
export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AppServicesProvider>
        <ChromeProvider>
          <SelectionProvider>
            <AuthGate>
              <AppShell>
                <Stack
                  screenOptions={{
                    headerShown: false,
                    contentStyle: { backgroundColor: colors.background },
                    animation: 'fade',
                  }}
                />
              </AppShell>
            </AuthGate>
          </SelectionProvider>
        </ChromeProvider>
      </AppServicesProvider>
    </SafeAreaProvider>
  );
}
