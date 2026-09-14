/*
 * File: SearchScreen.tsx
 *
 * Purpose:
 *     Deterministic local FTS over log text and entity names.
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

import { useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';

import { useHudLayout } from '@/ui/layout/HudLayoutContext';
import type { Entity, SearchHit } from '@/models/types';
import { useRequiredAppServices } from '@/services/AppServicesProvider';
import { colors, fonts } from '@/theme/tokens';
import { formatClock } from '@/utilities/time';
import { ClippedPanel, TelemetryLabel } from '@/ui/components/primitives';
import { useSelection } from '@/ui/state/SelectionContext';
import { useHudRegistration } from '@/ui/state/HudCommands';

/*
 * Purpose: Deterministic local search over log text and entity names.
 * Design: Reserve a standby NL strip; actual queries remain lexical FTS.
 * Workflow: /search route; runs on each keystroke.
 * Data Handoff: Displays SearchHit[] and Entity[] from SearchService.
 */
export function SearchScreen() {
  const services = useRequiredAppServices();
  const router = useRouter();
  const { capabilities } = useHudLayout();
  const selection = useSelection();
  const [query, setQuery] = useState('');
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [entities, setEntities] = useState<Entity[]>([]);
  const requestSequence = useRef(0);
  const [error, setError] = useState('');

  /*
   * Purpose: Run lexical search as the user types.
   * Design: Empty query clears results instead of matching everything.
   * Workflow: Bound to TextInput onChangeText.
   * Data Handoff: Sets SearchHit[] and Entity[] from SearchService.
   */
  async function run(nextQuery: string) {
    const sequence = ++requestSequence.current;
    setQuery(nextQuery);
    setError('');
    if (!nextQuery.trim()) {
      setHits([]);
      setEntities([]);
      return;
    }
    try {
      const [nextHits, nextEntities] = await Promise.all([
        services.search.searchEntries(nextQuery), services.search.searchEntities(nextQuery),
      ]);
      if (sequence === requestSequence.current) { setHits(nextHits); setEntities(nextEntities); }
    } catch (failure) {
      if (sequence === requestSequence.current) setError(failure instanceof Error ? failure.message : 'SEARCH UNAVAILABLE');
    }
  }
  // DEV-025: Clear invalidates in-flight queries, so old results cannot reappear.
  useHudRegistration('search', { clear: () => run('') });

  /*
   * Purpose: Open an entity in context or as a compact route.
   * Design: The selected layout decides between entity navigation and an inspector.
   * Workflow: Called from entity result cards.
   * Data Handoff: Writes SelectionContext.entityId and optionally pushes /entity/[id].
   */
  function openEntity(id: string) {
    selection.setEntityId(id);
    if (!capabilities.entityPane) {
      router.push(`/entity/${id}`);
    }
  }

  return (
    <View style={styles.screen}>
      {!capabilities.shellCommands && <TelemetryLabel k="QUERY MODE" v="LEXICAL" />}
      {!capabilities.shellCommands && <View style={styles.nlReserve}>
        <Text style={styles.nlText}>NATURAL LANGUAGE // STANDBY</Text>
      </View>}
      {error ? <Text accessibilityRole="alert" style={styles.meta}>{error}</Text> : null}
      <TextInput
        value={query}
        onChangeText={(value) => void run(value)}
        placeholder="Search log text and entities"
        placeholderTextColor={colors.textDim}
        style={styles.input}
        autoCorrect={false}
        autoCapitalize="none"
      />
      <ScrollView contentContainerStyle={styles.results}>
        {entities.map((entity) => (
          <Pressable key={entity.id} onPress={() => openEntity(entity.id)}>
            <ClippedPanel style={styles.card} accent="orange">
              <Text style={styles.entity}>
                {entity.type} / {entity.name}
              </Text>
            </ClippedPanel>
          </Pressable>
        ))}
        {hits.map((hit) => (
          <ClippedPanel key={hit.entry.id} style={styles.card}>
            <Text style={styles.time}>{formatClock(hit.entry.createdAt)}</Text>
            <Text style={styles.snippet}>{hit.snippet}</Text>
            <Text style={styles.meta}>
              {hit.entities.map((entity) => entity.name).join(' · ') || 'no entities'}
            </Text>
          </ClippedPanel>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    padding: 12,
    gap: 10,
  },
  nlReserve: {
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
    padding: 8,
  },
  nlText: {
    fontFamily: fonts.mono,
    color: colors.textDim,
    fontSize: 10,
    letterSpacing: 1.2,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.cyan,
    backgroundColor: colors.panel,
    color: colors.text,
    fontFamily: fonts.body,
    fontSize: 16,
    padding: 12,
  },
  results: {
    gap: 8,
    paddingBottom: 24,
  },
  card: {
    gap: 6,
  },
  entity: {
    color: colors.orange,
    fontFamily: fonts.heading,
    fontWeight: '700',
  },
  time: {
    fontFamily: fonts.mono,
    color: colors.cyan,
    fontSize: 11,
  },
  snippet: {
    color: colors.text,
    fontFamily: fonts.body,
    fontSize: 15,
    lineHeight: 22,
  },
  meta: {
    color: colors.textMuted,
    fontFamily: fonts.mono,
    fontSize: 10,
  },
});
