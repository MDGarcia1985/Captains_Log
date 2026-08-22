/*
 * File: src/services/AppServicesProvider.tsx
 *
 * Purpose:
 *     Initialize SQLite and expose the composed application service layer.
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
 *     DEV-2026-08-21-005
 */

import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AppState, StyleSheet, Text, View } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import type { SQLiteDatabase } from 'expo-sqlite';

import { colors, fonts } from '@/theme/tokens';
import { openArchiveDatabase } from '@/adapters/sqlite/database';
import { installRestoredArchive } from '@/adapters/sqlite/archiveRestore';
import { createFilesystemAttachmentStorage } from '@/adapters/filesystem/attachmentStorage';
import { createAppServices, type AppServices } from '@/services/createAppServices';
import type { RestoredArchivePayload, RestoreVerification } from '@/models/types';

SplashScreen.preventAutoHideAsync().catch(() => undefined);

const ServicesContext = createContext<AppServices | null>(null);

/*
 * Purpose: Open SQLite, compose services, and provide them to the tree.
 * Design: Null services mean still booting; errors render in-place so splash can hide.
 * Workflow: Root layout wraps AuthGate; also schedules backup on launch and background.
 * Data Handoff: Puts AppServices on context for useAppServices / useRequiredAppServices.
 */
export function AppServicesProvider({ children }: { children: ReactNode }) {
  const [services, setServices] = useState<AppServices | null>(null);
  const [error, setError] = useState<string | null>(null);
  const dbRef = useRef<SQLiteDatabase | null>(null);
  const composeRef = useRef<(database: SQLiteDatabase) => AppServices>((database) => {
    return createAppServices(database, {
      getDb: () => dbRef.current ?? database,
      async installRestoredArchive(payload: RestoredArchivePayload): Promise<RestoreVerification> {
        const current = dbRef.current ?? database;
        const storage = createFilesystemAttachmentStorage();
        const installed = await installRestoredArchive(current, payload, storage);
        dbRef.current = installed.db;
        const next = composeRef.current(installed.db);
        setServices(next);
        return installed.verification;
      },
    });
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const db = await openArchiveDatabase();
        if (cancelled) {
          return;
        }
        dbRef.current = db;
        setServices(composeRef.current(db));
        await SplashScreen.hideAsync();
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : 'Failed to open local archive');
        await SplashScreen.hideAsync().catch(() => undefined);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!services) {
      return;
    }
    void (async () => {
      const online = await services.network.isInternetReachable();
      if (online) {
        void services.backup.backupNow();
      }
    })();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'background') {
        void services.backup.backupNow();
      }
    });
    return () => sub.remove();
  }, [services]);

  const value = useMemo(() => services, [services]);

  if (error) {
    return (
      <View style={styles.error}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  return <ServicesContext.Provider value={value}>{children}</ServicesContext.Provider>;
}

const styles = StyleSheet.create({
  error: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    padding: 24,
  },
  errorText: {
    color: colors.warning,
    fontFamily: fonts.mono,
  },
});

export function useAppServices(): AppServices | null {
  return useContext(ServicesContext);
}

/*
 * Purpose: Require services after boot for screens that cannot render without the archive.
 * Design: Throw if used too early so missing provider wrapping fails loudly in development.
 * Workflow: Called by AppShell and feature screens inside AuthGate after services exist.
 * Data Handoff: Returns the composed AppServices object.
 */
export function useRequiredAppServices(): AppServices {
  const services = useContext(ServicesContext);
  if (!services) {
    throw new Error('Application services are not ready');
  }
  return services;
}
