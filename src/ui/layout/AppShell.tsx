/*
 * File: AppShell.tsx
 *
 * Purpose:
 *     One responsive shell for phone and tablet pane arrangements.
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

import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { usePathname, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useBreakpoint } from '@/hooks/useBreakpoint';
import type { Attachment, Entity, EntityNeighborhood, LogEntry } from '@/models/types';
import { useRequiredAppServices } from '@/services/AppServicesProvider';
import { colors } from '@/theme/tokens';
import { formatTelemetryTime } from '@/utilities/time';
import { TelemetryLabel } from '@/ui/components/primitives';
import { ContextPane } from '@/ui/layout/ContextPane';
import { NavigationRail, type RailDestination } from '@/ui/layout/NavigationRail';
import { useChrome } from '@/ui/state/ChromeContext';
import { useSelection } from '@/ui/state/SelectionContext';

/*
 * Purpose: Map the current route to which rail item is selected.
 * Design: Prefix checks so nested /entity and /entry still highlight Log rather than a fifth destination.
 * Workflow: Called by AppShell on each pathname change from Expo Router.
 * Data Handoff: Returns a RailDestination for NavigationRail.active.
 */
function destinationFromPath(path: string): RailDestination {
  if (path.startsWith('/capture')) {
    return 'capture';
  }
  if (path.startsWith('/search')) {
    return 'search';
  }
  if (path.startsWith('/graph')) {
    return 'graph';
  }
  if (path.startsWith('/settings')) {
    return 'settings';
  }
  return 'log';
}

const ROUTES: Record<RailDestination, string> = {
  log: '/',
  capture: '/capture',
  search: '/search',
  graph: '/graph',
  settings: '/settings',
};

/*
 * Purpose: Arrange nav, primary, and context panes for phone and tablet.
 * Design: One layout system; handedness mirrors rail, overlay edge, and expanded pane order.
 * Workflow: Wraps Stack in root layout after auth; loads backup telemetry and selected entity details.
 * Data Handoff: Renders route children in the primary pane and entity data into ContextPane.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const { mode } = useBreakpoint();
  const pathname = usePathname();
  const router = useRouter();
  const services = useRequiredAppServices();
  const selection = useSelection();
  const chrome = useChrome();
  const insets = useSafeAreaInsets();
  const handedness = chrome.handedness;
  const [backupLabel, setBackupLabel] = useState('UNKNOWN');
  const [lastBackup, setLastBackup] = useState('NEVER');
  const [entity, setEntity] = useState<Entity | null>(null);
  const [neighborhood, setNeighborhood] = useState<EntityNeighborhood | null>(null);
  const [history, setHistory] = useState<{
    entries: LogEntry[];
    firstMention: number | null;
    mostRecentMention: number | null;
  } | null>(null);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [questions, setQuestions] = useState<Entity[]>([]);
  const [decisions, setDecisions] = useState<Entity[]>([]);

  useEffect(() => {
    void services.settings.get().then((settings) => chrome.setHandedness(settings.handedness));
    void services.backup.getStatus().then((status) => {
      setBackupLabel(status.state.toUpperCase());
      setLastBackup(formatTelemetryTime(status.lastBackupAt));
    });
  }, [services, pathname, chrome]);

  useEffect(() => {
    if (!selection.entityId) {
      setEntity(null);
      setNeighborhood(null);
      setHistory(null);
      setAttachments([]);
      return;
    }
    void (async () => {
      const id = selection.entityId as string;
      setEntity(await services.entities.getEntity(id));
      setNeighborhood(await services.entities.getRelatedEntities(id));
      setHistory(await services.entities.getEntityHistory(id));
      setAttachments(await services.attachments.getAttachmentsForEntity(id));
      setQuestions(await services.entities.getOpenQuestions());
      setDecisions(await services.entities.getDecisions());
    })();
  }, [selection.entityId, services]);

  const active = destinationFromPath(pathname);
  const rail = (
    <NavigationRail
      active={active}
      mode={mode}
      handedness={handedness}
      onSelect={(id) => router.push(ROUTES[id] as never)}
    />
  );
  const context = (
    <ContextPane
      entity={entity}
      neighborhood={neighborhood}
      history={history}
      attachments={attachments}
      questions={questions}
      decisions={decisions}
    />
  );

  const panes =
    mode === 'expanded'
      ? handedness === 'right'
        ? [rail, 'primary', context]
        : [context, 'primary', rail]
      : handedness === 'right'
        ? ['primary', rail]
        : [rail, 'primary'];

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <StatusBar style="light" />
      <View style={styles.telemetry}>
        <TelemetryLabel k="LOCAL ARCHIVE" v="ACTIVE" />
        <TelemetryLabel k="LAST BACKUP" v={lastBackup} />
        <TelemetryLabel
          k="BACKUP STATUS"
          v={backupLabel}
          accent={backupLabel === 'FAILED' ? 'warning' : 'cyan'}
        />
        <TelemetryLabel k="LAYOUT" v={mode.toUpperCase()} />
      </View>
      <View style={styles.body}>
        {panes.map((pane, index) => {
          if (pane === 'primary') {
            return (
              <View key="primary" style={styles.primary}>
                {children}
              </View>
            );
          }
          return <View key={index}>{pane}</View>;
        })}
      </View>
      {mode === 'medium' && selection.entityId ? (
        <View
          style={[
            styles.overlay,
            handedness === 'right' ? styles.overlayRight : styles.overlayLeft,
          ]}>
          {context}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  telemetry: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  body: {
    flex: 1,
    flexDirection: 'row',
  },
  primary: {
    flex: 1,
    backgroundColor: colors.background,
  },
  overlay: {
    position: 'absolute',
    top: 48,
    bottom: 0,
  },
  overlayRight: {
    right: 0,
  },
  overlayLeft: {
    left: 0,
  },
});
