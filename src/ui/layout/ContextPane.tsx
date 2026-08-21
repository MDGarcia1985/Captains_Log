/*
 * File: ContextPane.tsx
 *
 * Purpose:
 *     Tablet context inspector for the selected entity.
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

import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';

import type { Attachment, Entity, EntityNeighborhood, LogEntry } from '@/models/types';
import { colors, fonts, layout } from '@/theme/tokens';
import { formatClock, formatDayHeading } from '@/utilities/time';
import { ClippedPanel, TelemetryLabel } from '@/ui/components/primitives';

/*
 * Purpose: Tablet context inspector for the selected entity.
 * Design: Standby copy when nothing is selected; never draws a global graph.
 * Workflow: Docked in expanded AppShell or overlaid on medium when entityId is set.
 * Data Handoff: Displays EntityNeighborhood, history, and attachments from AppShell loaders.
 */
export function ContextPane({
  entity,
  neighborhood,
  history,
  attachments,
  questions,
  decisions,
}: {
  entity: Entity | null;
  neighborhood: EntityNeighborhood | null;
  history: { entries: LogEntry[]; firstMention: number | null; mostRecentMention: number | null } | null;
  attachments: Attachment[];
  questions: Entity[];
  decisions: Entity[];
}) {
  if (!entity) {
    return (
      <View style={styles.pane}>
        <TelemetryLabel k="CONTEXT" v="STANDBY" />
        <Text style={styles.empty}>Select an entity to inspect relationships and history.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.pane} contentContainerStyle={styles.content}>
      <TelemetryLabel k="ENTITY" v={entity.type.toUpperCase()} accent="orange" />
      <Text style={styles.name}>{entity.name}</Text>
      <TelemetryLabel
        k="FIRST MENTION"
        v={history?.firstMention ? formatDayHeading(history.firstMention) : '—'}
      />
      <TelemetryLabel
        k="LAST MENTION"
        v={history?.mostRecentMention ? formatClock(history.mostRecentMention) : '—'}
      />

      <ClippedPanel style={styles.block}>
        <Text style={styles.section}>RELATED</Text>
        {(neighborhood?.relatedEntities ?? []).map((related) => (
          <Text key={related.id} style={styles.row}>
            {related.type} / {related.name}
          </Text>
        ))}
        {(neighborhood?.relatedEntities.length ?? 0) === 0 ? (
          <Text style={styles.muted}>No first-degree links</Text>
        ) : null}
      </ClippedPanel>

      <ClippedPanel style={styles.block}>
        <Text style={styles.section}>RELATIONSHIPS</Text>
        {(neighborhood?.relationships ?? []).map((rel) => (
          <Text key={rel.id} style={styles.row}>
            {rel.type} · {rel.sourceEntryId.slice(0, 8)}
          </Text>
        ))}
      </ClippedPanel>

      <ClippedPanel style={styles.block}>
        <Text style={styles.section}>ENTRIES</Text>
        {(history?.entries ?? []).slice(0, 8).map((entry) => (
          <Text key={entry.id} style={styles.row} numberOfLines={2}>
            {formatClock(entry.createdAt)}  {entry.sourceText}
          </Text>
        ))}
      </ClippedPanel>

      {attachments.length > 0 ? (
        <View style={styles.photos}>
          {attachments.map((attachment) => (
            <Image
              key={attachment.id}
              source={{ uri: attachment.thumbnailUri ?? attachment.fileUri }}
              style={styles.photo}
              contentFit="cover"
            />
          ))}
        </View>
      ) : null}

      <TelemetryLabel
        k="OPEN QUESTIONS"
        v={String(questions.length)}
        accent={questions.length ? 'orange' : 'cyan'}
      />
      <TelemetryLabel k="DECISIONS" v={String(decisions.length)} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  pane: {
    width: layout.contextWidth,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    padding: 12,
  },
  content: {
    gap: 10,
    paddingBottom: 24,
  },
  name: {
    fontFamily: fonts.heading,
    color: colors.text,
    fontSize: 22,
    fontWeight: '700',
  },
  empty: {
    marginTop: 16,
    color: colors.textMuted,
    fontFamily: fonts.body,
    lineHeight: 20,
  },
  block: {
    gap: 6,
  },
  section: {
    fontFamily: fonts.mono,
    color: colors.cyan,
    fontSize: 10,
    letterSpacing: 1.4,
  },
  row: {
    fontFamily: fonts.body,
    color: colors.text,
    fontSize: 13,
  },
  muted: {
    color: colors.textDim,
    fontFamily: fonts.mono,
    fontSize: 11,
  },
  photos: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  photo: {
    width: 64,
    height: 64,
    borderWidth: 1,
    borderColor: colors.border,
  },
});
