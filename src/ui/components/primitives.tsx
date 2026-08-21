/*
 * File: primitives.tsx
 *
 * Purpose:
 *     Shared starship-skin panels, telemetry labels, and controls.
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

import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, fonts } from '@/theme/tokens';

/*
 * Purpose: Frame content in the clipped tactical panel geometry.
 * Design: CSS border plus a corner triangle approximates clipped corners without a design-system library.
 * Workflow: Used by log cards, settings blocks, and graph lists.
 * Data Handoff: Renders children; no domain data.
 */
export function ClippedPanel({
  children,
  style,
  accent = 'cyan',
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  accent?: 'cyan' | 'orange';
}) {
  const border = accent === 'orange' ? colors.orange : colors.borderStrong;
  return (
    <View style={[styles.panel, { borderColor: border }, style]}>
      <View style={[styles.clip, { borderTopColor: border }]} />
      {children}
    </View>
  );
}

/*
 * Purpose: Show KEY // VALUE telemetry without fake system noise.
 * Design: Monospace uppercase matches the starship skin; color encodes cyan/orange/warning.
 * Workflow: Used in AppShell strip, settings, capture status, and entity headers.
 * Data Handoff: Renders strings supplied by callers from real BackupStatus/layout state.
 */
export function TelemetryLabel({
  k,
  v,
  accent = 'cyan',
}: {
  k: string;
  v: string;
  accent?: 'cyan' | 'orange' | 'warning';
}) {
  const color =
    accent === 'orange' ? colors.orange : accent === 'warning' ? colors.warning : colors.cyan;
  return (
    <Text style={styles.telemetry}>
      <Text style={{ color }}>{k}</Text>
      <Text style={styles.telemetrySep}> {'//'} </Text>
      <Text style={{ color: colors.text }}>{v}</Text>
    </Text>
  );
}

/*
 * Purpose: Primary control chrome for capture and settings actions.
 * Design: Dominant=true uses orange for Commit Log so capture is visually heavier than utility actions.
 * Workflow: Press handlers come from screens; disabled during in-flight save.
 * Data Handoff: Invokes onPress; no return value.
 */
export function CommandButton({
  label,
  onPress,
  dominant = false,
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  dominant?: boolean;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.command,
        dominant && styles.commandDominant,
        pressed && styles.commandPressed,
        disabled && styles.commandDisabled,
      ]}>
      <Text style={[styles.commandText, dominant && styles.commandTextDominant]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  panel: {
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    overflow: 'hidden',
  },
  clip: {
    position: 'absolute',
    top: -1,
    right: -1,
    width: 14,
    height: 14,
    borderTopWidth: 14,
    borderLeftWidth: 14,
    borderLeftColor: 'transparent',
    borderTopColor: colors.border,
  },
  telemetry: {
    fontFamily: fonts.mono,
    fontSize: 11,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: colors.textMuted,
  },
  telemetrySep: {
    color: colors.textDim,
  },
  command: {
    borderWidth: 1,
    borderColor: colors.cyan,
    backgroundColor: colors.cyanDim,
    paddingVertical: 10,
    paddingHorizontal: 12,
    minHeight: 44,
    justifyContent: 'center',
  },
  commandDominant: {
    borderColor: colors.orange,
    backgroundColor: colors.orangeDim,
    minHeight: 52,
  },
  commandPressed: {
    opacity: 0.8,
  },
  commandDisabled: {
    opacity: 0.4,
  },
  commandText: {
    fontFamily: fonts.heading,
    color: colors.cyan,
    fontSize: 13,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    fontWeight: '700',
  },
  commandTextDominant: {
    color: colors.orange,
    fontSize: 15,
  },
});
