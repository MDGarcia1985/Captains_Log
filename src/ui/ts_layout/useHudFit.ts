/* File: useHudFit.ts
 * Purpose: Fit in the measured native host and record the complete coordinate handoff.
 * Author: Codex; Contact: michael@mandedesign.studio; SPDX-License-Identifier: MPL-2.0
 * Decision: DEV-2026-09-14-003. Diagnostics contain geometry only, never user content. */
import { useCallback, useEffect, useRef, useState } from 'react';
import { Dimensions, Platform, View, type LayoutChangeEvent } from 'react-native';
import { useSafeAreaFrame, useSafeAreaInsets } from 'react-native-safe-area-context';
import { fitHudArtboard, hudUsableInsets } from './hudBehavior';
import { useHudLayout } from './HudLayoutContext';

export function useHudFit() {
  const { layout, width, height } = useHudLayout();
  const provider = useSafeAreaFrame();
  const insets = useSafeAreaInsets();
  const ref = useRef<View>(null);
  const [host, setHost] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const onLayout = useCallback((event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    ref.current?.measureInWindow((x, y) => {
      setHost(old => old?.x === x && old?.y === y && old?.width === width && old?.height === height ? old : { x, y, width, height });
    });
  }, []);
  const bounds = host ?? { x: 0, y: 0, width, height };
  const effectiveInsets = hudUsableInsets(bounds, provider, insets);
  const fit = fitHudArtboard(bounds, layout.reference_viewport, effectiveInsets);
  // Both old and corrected inputs are recorded in the same trace for phone diagnosis.
  const diagnostic = JSON.stringify({
    layoutId: layout.id, screen: Dimensions.get('screen'), window: Dimensions.get('window'),
    host, provider, safeAreaInsets: insets, effectiveInsets,
    usable: { width: bounds.width - effectiveInsets.left - effectiveInsets.right, height: bounds.height - effectiveInsets.top - effectiveInsets.bottom },
    reference: layout.reference_viewport, scale: fit.scale, fitted: { width: fit.width, height: fit.height },
    remainingX: bounds.width - effectiveInsets.left - effectiveInsets.right - fit.width,
    remainingY: bounds.height - effectiveInsets.top - effectiveInsets.bottom - fit.height,
    translation: { x: fit.x - effectiveInsets.left, y: fit.y - effectiveInsets.top },
    localBounds: fit, finalBounds: { x: bounds.x + fit.x, y: bounds.y + fit.y, width: fit.width, height: fit.height },
    legacyWindowFit: fitHudArtboard({ width, height }, layout.reference_viewport, insets),
  });
  useEffect(() => {
    if (__DEV__ && Platform.OS !== 'web' && host) console.info('HUD_FIT', diagnostic);
  }, [diagnostic, host]);
  return { ref, onLayout, fit, ready: host !== null };
}
