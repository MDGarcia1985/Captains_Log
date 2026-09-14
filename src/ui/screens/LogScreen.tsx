/*
 * File: LogScreen.tsx
 *
 * Purpose:
 *     Reverse-chronological grouped log, the canonical history view.
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

import { useCallback, useState } from 'react';
import { SectionList, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';

import { useHudLayout } from '@/ui/layout/HudLayoutContext';
import type { Attachment, Entity, LogEntry } from '@/models/types';
import { useRequiredAppServices } from '@/services/AppServicesProvider';
import { colors, fonts } from '@/theme/tokens';
import { formatDayHeading, startOfLocalDay } from '@/utilities/time';
import { EntryCard } from '@/ui/components/EntryCard';
import { TelemetryLabel } from '@/ui/components/primitives';
import { useSelection } from '@/ui/state/SelectionContext';

interface Row {
  entry: LogEntry;
  entities: Entity[];
  attachments: Attachment[];
}

/*
 * Purpose: Show reverse-chronological history grouped by local day.
 * Design: Inline expand on the card; the selected layout determines entity navigation.
 * Workflow: / route; reloads on focus after capture.
 * Data Handoff: Reads Entry/Entity/Attachment services and renders EntryCard rows.
 */
export function LogScreen() {
  const services = useRequiredAppServices();
  const selection = useSelection();
  const router = useRouter();
  const { capabilities } = useHudLayout();
  const [rows, setRows] = useState<Row[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  /*
   * Purpose: Hydrate each log row with entities and photos for one paint.
   * Design: Sequential awaits keep the first prototype simple; list is newest-first from the service.
   * Workflow: Runs on screen focus after returning from Capture.
   * Data Handoff: Sets Row[] consumed by groupByDay / SectionList.
   */
  const load = useCallback(async () => {
    const entries = await services.entries.listEntries();
    const next: Row[] = [];
    for (const entry of entries) {
      next.push({
        entry,
        entities: await services.entities.listEntitiesForEntry(entry.id),
        attachments: await services.attachments.getAttachments(entry.id),
      });
    }
    setRows(next);
  }, [services]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const sections = groupByDay(rows);

  return (
    <View style={styles.screen}>
      {!capabilities.shellCommands && <TelemetryLabel k="VIEW" v="CHRONOLOGICAL LOG" />}
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.entry.id}
        contentContainerStyle={styles.list}
        renderSectionHeader={({ section }) => (
          <Text style={styles.day}>{section.title}</Text>
        )}
        renderItem={({ item }) => (
          <EntryCard
            entry={item.entry}
            entities={item.entities}
            attachments={item.attachments}
            expanded={expandedId === item.entry.id}
            onToggle={() =>
              setExpandedId((current) => (current === item.entry.id ? null : item.entry.id))
            }
            onEntityPress={(id) => {
              selection.setEntityId(id);
              if (!capabilities.entityPane) {
                router.push(`/entity/${id}`);
              }
            }}
          />
        )}
        ListEmptyComponent={
          <Text style={styles.empty}>No entries yet. Open Capture to write the first log.</Text>
        }
      />
    </View>
  );
}

/*
 * Purpose: Group newest-first entries into local calendar days.
 * Design: startOfLocalDay keys so overnight UTC does not split a user's day.
 * Workflow: Called after load() produces Row[].
 * Data Handoff: Returns SectionList sections with day headings.
 */
function groupByDay(rows: Row[]) {
  const map = new Map<number, Row[]>();
  for (const row of rows) {
    const day = startOfLocalDay(row.entry.createdAt);
    const list = map.get(day) ?? [];
    list.push(row);
    map.set(day, list);
  }
  return [...map.entries()].map(([day, data]) => ({
    title: formatDayHeading(day),
    data,
  }));
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    padding: 12,
  },
  list: {
    paddingBottom: 32,
    paddingTop: 12,
  },
  day: {
    fontFamily: fonts.mono,
    color: colors.cyan,
    fontSize: 11,
    letterSpacing: 1.6,
    marginBottom: 8,
    marginTop: 8,
    textTransform: 'uppercase',
  },
  empty: {
    color: colors.textMuted,
    fontFamily: fonts.body,
    marginTop: 24,
    lineHeight: 22,
  },
});
