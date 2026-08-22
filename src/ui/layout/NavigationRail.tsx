/*
 * File: NavigationRail.tsx
 *
 * Purpose:
 *     Vertical handed edge navigation with a dominant Capture control.
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

import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { Handedness, LayoutMode } from '@/models/types';
import { colors, fonts, layout } from '@/theme/tokens';

export type RailDestination = 'log' | 'capture' | 'search' | 'graph' | 'settings';

const PRIMARY: { id: RailDestination; label: string; dominant?: boolean }[] = [
  { id: 'log', label: 'Log' },
  { id: 'capture', label: 'Cap', dominant: true },
  { id: 'search', label: 'Src' },
  { id: 'graph', label: 'Grph' },
];

/*
 * Purpose: Vertical handed edge navigation with a dominant Capture control.
 * Design: Compact uses short labels; expanded uses full words; capture is orange and taller.
 * Workflow: Rendered by AppShell; onSelect pushes Expo Router destinations.
 * Data Handoff: Emits RailDestination ids to router.push.
 */
export function NavigationRail({
  active,
  mode,
  handedness,
  onSelect,
}: {
  active: RailDestination;
  mode: LayoutMode;
  handedness: Handedness;
  onSelect: (id: RailDestination) => void;
}) {
  const insets = useSafeAreaInsets();
  const expanded = mode === 'expanded';
  const width = expanded ? layout.railExpanded : layout.railCompact;
  const edgePad = handedness === 'right' ? insets.right : insets.left;

  return (
    <View
      style={[
        styles.rail,
        {
          width: width + edgePad,
          paddingRight: handedness === 'right' ? 8 + edgePad : 8,
          paddingLeft: handedness === 'left' ? 8 + edgePad : 8,
        },
      ]}>
      <Text style={styles.brand}>{expanded ? "CAPTAIN'S LOG" : 'CL'}</Text>
      <View style={styles.primary}>
        {PRIMARY.map((item) => {
          const selected = active === item.id;
          return (
            <Pressable
              key={item.id}
              onPress={() => onSelect(item.id)}
              style={[
                styles.item,
                item.dominant && styles.dominant,
                selected && (item.dominant ? styles.dominantSelected : styles.selected),
              ]}>
              <Text
                style={[
                  styles.label,
                  item.dominant && styles.dominantLabel,
                  selected && styles.selectedLabel,
                ]}>
                {expanded ? item.id.toUpperCase() : item.label.toUpperCase()}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <Pressable
        onPress={() => onSelect('settings')}
        style={[styles.item, active === 'settings' && styles.selected]}>
        <Text style={[styles.label, active === 'settings' && styles.selectedLabel]}>
          {expanded ? 'SETTINGS' : 'SET'}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  rail: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    paddingTop: 18,
    paddingBottom: 16,
    justifyContent: 'space-between',
  },
  brand: {
    fontFamily: fonts.mono,
    color: colors.cyan,
    fontSize: 10,
    letterSpacing: 1.6,
    textAlign: 'center',
  },
  primary: {
    flex: 1,
    justifyContent: 'center',
    gap: 10,
  },
  item: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 8,
  },
  selected: {
    borderColor: colors.cyan,
    backgroundColor: colors.cyanDim,
  },
  dominant: {
    minHeight: 64,
    borderColor: colors.orange,
    backgroundColor: colors.orangeDim,
  },
  dominantSelected: {
    borderColor: colors.orange,
    backgroundColor: 'rgba(245, 161, 74, 0.28)',
  },
  label: {
    fontFamily: fonts.heading,
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  dominantLabel: {
    color: colors.orange,
    fontSize: 13,
  },
  selectedLabel: {
    color: colors.cyan,
  },
});
