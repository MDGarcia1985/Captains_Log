/*
 * File: _layout.tsx
 *
 * Purpose:
 *     Root Expo Router layout: services, auth gate, and responsive shell.
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

import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import '@/global.css';

import { AppServicesProvider } from '@/services/AppServicesProvider';
import { AppShell } from '@/ui/layout/AppShell';
import { AuthGate } from '@/ui/screens/AuthGate';
import { ChromeProvider } from '@/ui/state/ChromeContext';
import { SelectionProvider } from '@/ui/state/SelectionContext';
import { HudCommandsProvider } from '@/ui/state/HudCommands';

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
              <HudCommandsProvider>
              <AppShell>
                <Stack
                  screenOptions={{
                    headerShown: false,
                    contentStyle: { backgroundColor: 'transparent' },
                    animation: 'fade',
                  }}
                />
              </AppShell>
              </HudCommandsProvider>
            </AuthGate>
          </SelectionProvider>
        </ChromeProvider>
      </AppServicesProvider>
    </SafeAreaProvider>
  );
}
