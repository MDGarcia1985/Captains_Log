/*
 * File: EntryCard.tsx
 *
 * Purpose:
 *     Chronological log row with source text, photos, and entity chips.
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

import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { Attachment, Entity, LogEntry } from '@/models/types';
import { colors, fonts } from '@/theme/tokens';
import { formatClock } from '@/utilities/time';
import { ClippedPanel } from '@/ui/components/primitives';

/*
 * Purpose: Render one chronological log row with text, photos, and entity chips.
 * Design: Inline expand instead of forcing navigation; chips open entity context or route.
 * Workflow: Used by LogScreen SectionList items after entries/entities/attachments are loaded.
 * Data Handoff: Calls onToggle/onEntityPress; displays Attachment thumbnail URIs.
 */
export function EntryCard({
  entry,
  entities,
  attachments,
  expanded,
  onToggle,
  onEntityPress,
}: {
  entry: LogEntry;
  entities: Entity[];
  attachments: Attachment[];
  expanded: boolean;
  onToggle: () => void;
  onEntityPress: (entityId: string) => void;
}) {
  return (
    <Pressable onPress={onToggle}>
      <ClippedPanel style={styles.card}>
        <View style={styles.meta}>
          <Text style={styles.time}>{formatClock(entry.createdAt)}</Text>
          {entry.location ? (
            <Text style={styles.loc}>
              {entry.location.latitude.toFixed(3)}, {entry.location.longitude.toFixed(3)}
            </Text>
          ) : null}
        </View>
        <Text style={styles.body} numberOfLines={expanded ? undefined : 4}>
          {entry.sourceText || '(empty capture)'}
        </Text>
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
        {entities.length > 0 ? (
          <View style={styles.chips}>
            {entities.map((entity) => (
              <Pressable
                key={entity.id}
                onPress={() => onEntityPress(entity.id)}
                style={styles.chip}>
                <Text style={styles.chipText}>
                  {entity.type}:{entity.name}
                </Text>
              </Pressable>
            ))}
          </View>
        ) : null}
      </ClippedPanel>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 10,
  },
  meta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  time: {
    fontFamily: fonts.mono,
    color: colors.cyan,
    fontSize: 11,
    letterSpacing: 1,
  },
  loc: {
    fontFamily: fonts.mono,
    color: colors.textMuted,
    fontSize: 10,
  },
  body: {
    fontFamily: fonts.body,
    color: colors.text,
    fontSize: 16,
    lineHeight: 24,
  },
  photos: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
    flexWrap: 'wrap',
  },
  photo: {
    width: 84,
    height: 84,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 10,
  },
  chip: {
    borderWidth: 1,
    borderColor: colors.borderStrong,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  chipText: {
    fontFamily: fonts.mono,
    color: colors.textMuted,
    fontSize: 10,
    textTransform: 'uppercase',
  },
});
