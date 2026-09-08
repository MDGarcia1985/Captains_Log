/*
 * File: HudArtwork.tsx
 * Purpose: Layered Figma assets, exact typography, and centered native scanner motion.
 * Author: Codex; Contact: michael@mandedesign.studio
 * License: SPDX-License-Identifier: MPL-2.0
 * Decision: DEV-2026-09-07-025
 */
import { useEffect, useState } from 'react';
import { AccessibilityInfo, Animated, AppState, Easing, Platform, Text, View, type TextStyle } from 'react-native';
import { Image } from 'expo-image';
import { hudAssets, type HudAsset } from '@/ui/generated/hudAssets';
import { uiSpec } from '@/ui/generated/uiSpec';
import { rotationEnd, SCANNER_ROTATION_MS } from '@/ui/layout/hudBehavior';

export const hudColors = uiSpec.theme.colors;
export type Bounds = { x: number; y: number; width: number; height: number };
/* Purpose: Translate Figma coordinates without changing values.
 * Design: Explicit absolute boxes. Workflow: Layer composition. Data Handoff: RN style. */
export function box(b: Bounds) {
  return { position: 'absolute' as const, left: b.x, top: b.y, width: b.width, height: b.height };
}
/* Purpose: Resolve named YAML typography to the bundled exact font.
 * Design: Pixel tracking, measured AUTO line height, no synthetic font weights.
 * Workflow: Every HUD label. Data Handoff: Native text style. */
export function typeStyle(key: keyof typeof uiSpec.typography.styles): TextStyle {
  const t = uiSpec.typography.styles[key];
  return { fontFamily: uiSpec.typography.fonts[t.font], fontSize: t.size, lineHeight: t.lineHeight,
    letterSpacing: t.tracking, includeFontPadding: false };
}
/* Purpose: Render an individual source asset with an explicit Figma-sized envelope.
 * Design: SVG stays separate from live text and motion. Workflow: Decorative layer.
 * Data Handoff: Bundled asset bytes to expo-image, never a runtime remote URL. */
export function Art({ name, bounds }: { name: HudAsset; bounds: Bounds }) {
  return <Image pointerEvents="none" accessible={false} source={hudAssets[name]} style={box(bounds)} contentFit="fill" />;
}
/* Purpose: Animate both arc cohorts slowly about the scanner center.
 * Design: One clock; two 60x60 wrappers. Stop in background/reduced motion/unmount.
 * Workflow: Shell lifetime. Data Handoff: Opposite signed rotation transforms only. */
export function Scanner() {
  const scanner = uiSpec.components.scanner;
  const [phase] = useState(() => new Animated.Value(0));
  const [reduced, setReduced] = useState(true);
  const [active, setActive] = useState(AppState.currentState === 'active');
  useEffect(() => {
    let mounted = true;
    void AccessibilityInfo.isReduceMotionEnabled().then(value => { if (mounted) setReduced(value); }).catch(() => {});
    const motion = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);
    const state = AppState.addEventListener('change', value => setActive(value === 'active'));
    return () => { mounted = false; motion.remove(); state.remove(); };
  }, []);
  useEffect(() => {
    phase.setValue(0);
    if (reduced || !active) return;
    const loop = Animated.loop(Animated.timing(phase, {
      toValue: 1, duration: SCANNER_ROTATION_MS, easing: Easing.linear,
      useNativeDriver: Platform.OS !== 'web', isInteraction: false,
    }));
    loop.start();
    return () => loop.stop();
  }, [phase, reduced, active]);
  const rotate = (direction: 'clockwise' | 'counterclockwise') => phase.interpolate({ inputRange: [0, 1], outputRange: ['0deg', rotationEnd(direction)] });
  return <View style={box(uiSpec.layout.regions.scanner)} pointerEvents="none" accessible accessibilityLabel="Scanner indicator">
    <Art name={scanner.ring.asset} bounds={scanner.ring} />
    <Animated.View testID="scanner-outer-pivot" style={[box(scanner.rotationBounds), { transform: [{ rotate: rotate(scanner.outer.direction) }] }]}>
      {scanner.outer.assets.map(name => <Art key={name} name={name} bounds={{ x: 0, y: 0, width: 60, height: 60 }} />)}
    </Animated.View>
    <Animated.View testID="scanner-inner-pivot" style={[box(scanner.rotationBounds), { transform: [{ rotate: rotate(scanner.inner.direction) }] }]}>
      <Art name={scanner.inner.asset} bounds={{ x: 0, y: 0, width: 60, height: 60 }} />
    </Animated.View>
    <Art name={scanner.core.asset} bounds={scanner.core} />
    <View style={[box(scanner.tick), { backgroundColor: hudColors.cyan }]} />
  </View>;
}
/* Purpose: Render live text over the exported title ornament.
 * Design: Figma typography and glow; copy is runtime-owned.
 * Workflow: Active route change. Data Handoff: Accessible page heading. */
export function HudTitle({ title }: { title: string }) {
  const c = uiSpec.components.title_block;
  return <View style={box(uiSpec.layout.regions.title_block)}>
    <Text accessibilityRole="header" numberOfLines={1} style={[box(c.title), typeStyle('heading'), {
      color: hudColors.cyan, textShadowColor: 'rgba(61,222,229,0.55)', textShadowRadius: 8, textShadowOffset: { width: 0, height: 0 },
    }]}>{title}</Text>
    <Text style={[{ position: 'absolute', left: c.subtitle.x, top: c.subtitle.y, color: hudColors.textMuted }, typeStyle('subtitle')]}>{c.subtitle.text}</Text>
    <Art name={c.divider.asset} bounds={c.divider} />
  </View>;
}
