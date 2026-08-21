/*
 * File: EntryScreen.tsx
 *
 * Purpose:
 *     Optional entry detail route; MVP prefers inline expansion on the log.
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

import type { Attachment, Entity, LogEntry } from '@/models/types';
import { useRequiredAppServices } from '@/services/AppServicesProvider';
import { colors, fonts } from '@/theme/tokens';
import { formatClock, formatDayHeading } from '@/utilities/time';
import { TelemetryLabel } from '@/ui/components/primitives';

/*
 * Purpose: Optional entry detail route; the log still expands inline by default.
 * Design: Full-page fallback when a deep link or future navigation needs a dedicated entry view.
 * Workflow: /entry/[id]; loads entry, entities, and attachments.
 * Data Handoff: Renders LogEntry source text and photos from services.
 */
export function EntryScreen({ entryId }: { entryId: string }) {
  const services = useRequiredAppServices();
  const [entry, setEntry] = useState<LogEntry | null>(null);
  const [entities, setEntities] = useState<Entity[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);

  useEffect(() => {
    void (async () => {
      setEntry(await services.entries.getEntry(entryId));
      setEntities(await services.entities.listEntitiesForEntry(entryId));
      setAttachments(await services.attachments.getAttachments(entryId));
    })();
  }, [entryId, services]);

  if (!entry) {
    return <Text style={styles.muted}>Entry not found.</Text>;
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <TelemetryLabel k="ENTRY" v={formatDayHeading(entry.createdAt)} />
      <Text style={styles.time}>{formatClock(entry.createdAt)}</Text>
      <Text style={styles.body}>{entry.sourceText}</Text>
      {entities.map((entity) => (
        <Text key={entity.id} style={styles.entity}>
          {entity.type}:{entity.name}
        </Text>
      ))}
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
  time: {
    color: colors.cyan,
    fontFamily: fonts.mono,
  },
  body: {
    color: colors.text,
    fontFamily: fonts.body,
    fontSize: 18,
    lineHeight: 26,
  },
  entity: {
    color: colors.textMuted,
    fontFamily: fonts.mono,
    fontSize: 11,
  },
  photo: {
    width: '100%',
    height: 220,
    borderWidth: 1,
    borderColor: colors.border,
  },
  muted: {
    color: colors.textMuted,
    padding: 16,
  },
});
