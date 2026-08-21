/*
 * File: EntityScreen.tsx
 *
 * Purpose:
 *     Phone-scale entity history and relationship page.
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
import { ScrollView, StyleSheet, Text } from 'react-native';
import { Image } from 'expo-image';

import type { Attachment, Entity, EntityNeighborhood, LogEntry } from '@/models/types';
import { useRequiredAppServices } from '@/services/AppServicesProvider';
import { colors, fonts } from '@/theme/tokens';
import { formatClock, formatDayHeading } from '@/utilities/time';
import { ClippedPanel, TelemetryLabel } from '@/ui/components/primitives';

/*
 * Purpose: Phone-scale entity history and relationship page.
 * Design: Same fields as ContextPane so compact and expanded stay consistent.
 * Workflow: /entity/[id] when layout is compact (or user opened the route).
 * Data Handoff: Loads history, neighborhood, and attachments from services for this entityId.
 */
export function EntityScreen({ entityId }: { entityId: string }) {
  const services = useRequiredAppServices();
  const [entity, setEntity] = useState<Entity | null>(null);
  const [neighborhood, setNeighborhood] = useState<EntityNeighborhood | null>(null);
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [firstMention, setFirstMention] = useState<number | null>(null);
  const [recentMention, setRecentMention] = useState<number | null>(null);

  useEffect(() => {
    void (async () => {
      const history = await services.entities.getEntityHistory(entityId);
      setEntity(history?.entity ?? null);
      setEntries(history?.entries ?? []);
      setFirstMention(history?.firstMention ?? null);
      setRecentMention(history?.mostRecentMention ?? null);
      setNeighborhood(await services.entities.getRelatedEntities(entityId));
      setAttachments(await services.attachments.getAttachmentsForEntity(entityId));
    })();
  }, [entityId, services]);

  if (!entity) {
    return <Text style={styles.muted}>Entity not found.</Text>;
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <TelemetryLabel k="ENTITY" v={entity.type.toUpperCase()} accent="orange" />
      <Text style={styles.name}>{entity.name}</Text>
      <TelemetryLabel k="FIRST MENTION" v={firstMention ? formatDayHeading(firstMention) : '—'} />
      <TelemetryLabel k="LAST MENTION" v={recentMention ? formatClock(recentMention) : '—'} />
      <ClippedPanel>
        <Text style={styles.section}>RELATED ENTITIES</Text>
        {(neighborhood?.relatedEntities ?? []).map((related) => (
          <Text key={related.id} style={styles.row}>
            {related.type} / {related.name}
          </Text>
        ))}
      </ClippedPanel>
      <ClippedPanel>
        <Text style={styles.section}>RELATIONSHIPS</Text>
        {(neighborhood?.relationships ?? []).map((rel) => (
          <Text key={rel.id} style={styles.row}>
            {rel.type} · provenance {rel.sourceEntryId.slice(0, 8)}
          </Text>
        ))}
      </ClippedPanel>
      <ClippedPanel>
        <Text style={styles.section}>ASSOCIATED ENTRIES</Text>
        {entries.map((entry) => (
          <Text key={entry.id} style={styles.row}>
            {formatClock(entry.createdAt)}  {entry.sourceText}
          </Text>
        ))}
      </ClippedPanel>
      {attachments.map((attachment) => (
        <Image
          key={attachment.id}
          source={{ uri: attachment.thumbnailUri ?? attachment.fileUri }}
          style={styles.photo}
          contentFit="cover"
        />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  content: {
    padding: 12,
    gap: 10,
  },
  name: {
    color: colors.text,
    fontFamily: fonts.heading,
    fontSize: 28,
    fontWeight: '700',
  },
  section: {
    color: colors.cyan,
    fontFamily: fonts.mono,
    fontSize: 10,
    letterSpacing: 1.4,
    marginBottom: 6,
  },
  row: {
    color: colors.text,
    fontFamily: fonts.body,
    marginBottom: 6,
  },
  muted: {
    color: colors.textMuted,
    padding: 16,
  },
  photo: {
    width: '100%',
    height: 180,
    borderWidth: 1,
    borderColor: colors.border,
  },
});
