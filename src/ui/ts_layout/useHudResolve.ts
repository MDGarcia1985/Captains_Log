/*
 * File: src/ui/ts_layout/useHudResolve.ts
 * Purpose: Measure the HUD host and resolve schema 3 regions without global scale.
 * Author: Michael Garcia
 * Contact: michael@mandedesign.studio
 * License: SPDX-License-Identifier: MPL-2.0
 * Related Decisions: DEV-2026-09-14-005
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Dimensions, Platform, View, type LayoutChangeEvent } from 'react-native';
import { useSafeAreaFrame, useSafeAreaInsets } from 'react-native-safe-area-context';
import { uiSpec } from '@/ui/generated/uiSpec';
import { hudHostMatchesOrientation, hudUsableInsets, mergeHudComponent } from './hudBehavior';
import { useHudLayout } from './HudLayoutContext';
import { resolveHudLayout, type Rect, type ResolveInput, type ResolveResult } from './resolveHudLayout';

function componentsFor(orientation: 'portrait' | 'landscape') {
  const overlay = uiSpec.orientationComponents[orientation] as Record<string, object>;
  const merged: Record<string, Record<string, unknown>> = {};
  for (const [id, shared] of Object.entries(uiSpec.components)) {
    merged[id] = mergeHudComponent(shared, overlay[id] ?? {});
  }
  if ('action_dock_handle' in overlay) merged.action_dock_handle = overlay.action_dock_handle as Record<string, unknown>;
  return merged;
}

export function useHudResolve() {
  const { layout, width, height, orientation, handedness } = useHudLayout();
  const provider = useSafeAreaFrame();
  const insets = useSafeAreaInsets();
  const ref = useRef<View>(null);
  const [host, setHost] = useState<Rect | null>(null);
  const [hostInProvider, setHostInProvider] = useState<Rect | null>(null);
  const measurement = useRef(0);
  const onLayout = useCallback((event: LayoutChangeEvent) => {
    const { x, y, width, height } = event.nativeEvent.layout;
    // RootLayout -> context/auth providers -> AppShell introduce no native View
    // between SafeAreaProvider and this host. onLayout is provider-relative.
    setHostInProvider(old => old?.x === x && old?.y === y && old?.width === width && old?.height === height
      ? old : { x, y, width, height });
    const request = ++measurement.current;
    // Raw window measurements are diagnostic ONLY. Keep all four callback values
    // together; do not combine a delayed origin with earlier onLayout dimensions.
    ref.current?.measureInWindow((x, y, width, height) => {
      if (request !== measurement.current) return;
      setHost(old => old?.x === x && old?.y === y && old?.width === width && old?.height === height
        ? old
        : { x, y, width, height });
    });
  }, []);
  const bounds = useMemo(() => hostInProvider ?? { x: 0, y: 0, width, height }, [hostInProvider, width, height]);
  const nativeScreen = Platform.OS === 'web' ? undefined : Dimensions.get('screen');
  const ready = hudHostMatchesOrientation(hostInProvider, orientation, nativeScreen)
    && hudHostMatchesOrientation(provider, orientation, nativeScreen);
  const obstructionInsets = useMemo(() => hudUsableInsets(bounds, provider, insets, bounds), [bounds, provider, insets]);
  const resolved = useMemo<ResolveResult | { status: 'pending'; regions: ResolveResult['regions']; overflow: ResolveResult['overflow']; expandedDock: null }>(() => ready ? resolveHudLayout({
    window: { width: bounds.width, height: bounds.height },
    obstructionInsets,
    family: {
      layout_policy: uiSpec.layouts.mobile.layout_policy,
      constraints: { scale_fixed_controls: false },
    },
    layout: layout as unknown as ResolveInput['layout'],
    components: componentsFor(orientation),
    handedness,
  }) : { status: 'pending', regions: {}, overflow: {}, expandedDock: null }, [ready, bounds, obstructionInsets, layout, orientation, handedness]);
  const diagnostic = JSON.stringify({
    layoutId: layout.id,
    screen: Dimensions.get('screen'),
    window: Dimensions.get('window'),
    host,
    hostInProvider,
    provider,
    obstructionCoordinateSpace: 'provider-local to HUD-canvas',
    safeAreaInsets: insets,
    obstructionInsets,
    status: resolved.status,
    overflow: resolved.overflow,
    canvas: resolved.regions.canvas,
    scanner: resolved.regions.scanner,
    border: resolved.regions.border,
  });
  useEffect(() => {
    if (__DEV__ && Platform.OS !== 'web' && host) console.info('HUD_RESOLVE', diagnostic);
  }, [diagnostic, host]);
  return { ref, onLayout, resolved, ready, host: bounds };
}
