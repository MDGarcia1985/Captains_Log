/*
 * File: GraphScreen.tsx
 *
 * Purpose:
 *     First-degree neighborhood view for a selected entity.
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

import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { useHudLayout } from '@/ui/layout/HudLayoutContext';
import type { Entity, EntityNeighborhood } from '@/models/types';
import { useRequiredAppServices } from '@/services/AppServicesProvider';
import { colors, fonts } from '@/theme/tokens';
import { ClippedPanel, TelemetryLabel } from '@/ui/components/primitives';
import { useSelection } from '@/ui/state/SelectionContext';
import { useHudRegistration } from '@/ui/state/HudCommands';

/*
 * Purpose: Show only the selected entity's first-degree neighborhood.
 * Design: Focus node plus related chips; a list of all entities is the picker, not a global force graph.
 * Workflow: /graph route; selection drives getRelatedEntities.
 * Data Handoff: Renders EntityNeighborhood from EntityService.
 */
export function GraphScreen() {
  const services = useRequiredAppServices();
  const selection = useSelection();
  const router = useRouter();
  const { capabilities } = useHudLayout();
  const [entities, setEntities] = useState<Entity[]>([]);
  const [neighborhood, setNeighborhood] = useState<EntityNeighborhood | null>(null);
  useHudRegistration('graph', { reset: () => selection.setEntityId(null) });

  useEffect(() => {
    void services.entities.listEntities().then(setEntities);
  }, [services]);

  useEffect(() => {
    if (!selection.entityId) {
      return;
    }
    let active = true;
    void services.entities.getRelatedEntities(selection.entityId).then(value => { if (active) setNeighborhood(value); });
    return () => { active = false; };
  }, [selection.entityId, services]);

  /*
   * Purpose: Change the graph focus entity.
   * Design: Layouts without an entity pane open the full entity page in either orientation.
   * Workflow: Fired from neighbor chips and the entity list.
   * Data Handoff: Updates SelectionContext and may navigate to /entity/[id].
   */
  function selectEntity(id: string) {
    selection.setEntityId(id);
    if (!capabilities.entityPane) {
      router.push(`/entity/${id}`);
    }
  }

  const currentNeighborhood = neighborhood?.entity.id === selection.entityId ? neighborhood : null;
  const related = currentNeighborhood?.relatedEntities ?? [];
  const focus = currentNeighborhood?.entity;

  return (
    <View style={styles.screen}>
      {!capabilities.shellCommands && <TelemetryLabel k="GRAPH" v="FIRST DEGREE" />}
      {!capabilities.shellCommands && <Text style={styles.hint}>The full database is never drawn as one hairball.</Text>}
      <View style={styles.canvas}>
        {focus ? (
          <>
            <View style={styles.focus}>
              <Text style={styles.focusLabel}>{focus.name}</Text>
              <Text style={styles.focusType}>{focus.type}</Text>
            </View>
            <View style={styles.ring}>
              {related.map((entity) => (
                <Pressable key={entity.id} onPress={() => selectEntity(entity.id)} style={styles.node}>
                  <Text style={styles.nodeText}>{entity.name}</Text>
                </Pressable>
              ))}
              {related.length === 0 ? (
                <Text style={styles.muted}>No linked entities yet</Text>
              ) : null}
            </View>
          </>
        ) : (
          <Text style={styles.muted}>Select an entity below.</Text>
        )}
      </View>
      <ClippedPanel style={styles.list}>
        {entities.map((entity) => (
          <Pressable key={entity.id} onPress={() => selectEntity(entity.id)} style={styles.row}>
            <Text style={styles.rowText}>
              {entity.type} / {entity.name}
            </Text>
          </Pressable>
        ))}
      </ClippedPanel>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    padding: 12,
    gap: 10,
  },
  hint: {
    color: colors.textMuted,
    fontFamily: fonts.body,
    fontSize: 13,
  },
  canvas: {
    minHeight: 180,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.panel,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  focus: {
    borderWidth: 1,
    borderColor: colors.orange,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  focusLabel: {
    color: colors.orange,
    fontFamily: fonts.heading,
    fontWeight: '700',
    fontSize: 18,
  },
  focusType: {
    color: colors.textMuted,
    fontFamily: fonts.mono,
    fontSize: 10,
    textTransform: 'uppercase',
  },
  ring: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
  },
  node: {
    borderWidth: 1,
    borderColor: colors.cyan,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  nodeText: {
    color: colors.cyan,
    fontFamily: fonts.mono,
    fontSize: 11,
  },
  muted: {
    color: colors.textDim,
    fontFamily: fonts.mono,
    fontSize: 11,
  },
  list: {
    flex: 1,
    gap: 8,
  },
  row: {
    paddingVertical: 6,
  },
  rowText: {
    color: colors.text,
    fontFamily: fonts.body,
  },
});
