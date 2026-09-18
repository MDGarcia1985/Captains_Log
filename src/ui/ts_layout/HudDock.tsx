/* File: HudDock.tsx
 * Purpose: Keep the dock preassembled and move its handle and body as one native layer.
 * Author: Codex; Contact: michael@mandedesign.studio; SPDX-License-Identifier: MPL-2.0
 * Decision: DEV-2026-09-14-003. Visual rectangles remain Figma-derived; states are YAML-owned. */
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Platform, Pressable, Text, View } from 'react-native';
import { uiSpec } from '@/ui/generated/uiSpec';
import { Art, box, hudColors as c, typeStyle } from './HudArtwork';
import { dockAssemblyGeometry, mergeHudComponent } from './hudBehavior';
import { useHudLayout } from './HudLayoutContext';
import type { AttachmentAction } from '@/ui/state/HudCommands';

export function HudDock({ expanded, busy, toggle, add, attachment, exportNotice }: {
  expanded: boolean; busy: boolean; toggle: () => void; add: () => void;
  attachment: (id: AttachmentAction) => void; exportNotice: () => void;
}) {
  const { regions, orientation, resolveStatus } = useHudLayout();
  const dock = mergeHudComponent(uiSpec.components.action_dock, uiSpec.orientationComponents[orientation].action_dock);
  const bezelAsset = typeof dock.bezel === 'string' ? dock.bezel : uiSpec.components.action_dock.bezel;
  const handle = regions.action_dock_handle ?? null;
  const transition = 'transition' in dock.behavior ? dock.behavior.transition : null;
  const duration = transition?.duration_ms;
  const geometry = handle && regions.action_dock ? dockAssemblyGeometry(regions.action_dock, handle) : null;
  const [progress] = useState(() => new Animated.Value(0));
  const previousOrientation = useRef(orientation);
  const [reduced, setReduced] = useState(true);
  const [loaded, setLoaded] = useState<ReadonlySet<string>>(() => new Set());
  const assets = useMemo(() => new Set([bezelAsset, dock.plate.asset, dock.addPlate, ...dock.items.map(item => item.icon)]), [bezelAsset, dock]);
  const assetsReady = [...assets].every(asset => loaded.has(asset));
  const open = !handle || expanded && assetsReady;
  const markLoaded = (asset: string) => setLoaded(old => old.has(asset) ? old : new Set([...old, asset]));
  useEffect(() => {
    let active = true;
    void AccessibilityInfo.isReduceMotionEnabled().then(value => { if (active) setReduced(value); });
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);
    return () => { active = false; subscription.remove(); };
  }, []);
  useLayoutEffect(() => {
    // Do not consume the orientation change before matching host geometry exists.
    // A pending layout has no handle yet; treating that as portrait/open starts
    // a spurious collapse animation when the landscape measurement arrives.
    if (resolveStatus === 'pending') return;
    progress.stopAnimation();
    const target = open ? 1 : 0;
    if (previousOrientation.current !== orientation) {
      previousOrientation.current = orientation;
      progress.setValue(target);
      return;
    }
    if (reduced || duration === undefined) { progress.setValue(target); return; }
    const animation = Animated.timing(progress, { toValue: target, duration,
      easing: Easing.out(Easing.cubic), useNativeDriver: Platform.OS !== 'web', isInteraction: false });
    animation.start();
    return () => animation.stop();
  }, [open, reduced, duration, progress, orientation, resolveStatus]);
  const region = regions.action_dock ?? { x: 0, y: 0, width: 0, height: 0 };
  const clip = geometry?.clip ?? region;
  const body = geometry?.dock ?? { x: 0, y: 0, width: region.width, height: region.height };
  const translateY = geometry ? progress.interpolate({ inputRange: [0, 1], outputRange: [geometry.travel, 0] }) : 0;
  const itemWidth = dock.item.width;
  const spacing = dock.spacing;
  const gapCount = Math.max(1, dock.items.length - 1);
  const availableGaps = region.width - (spacing.leading.preferred ?? 0) - (spacing.trailing.preferred ?? 0) - dock.items.length * itemWidth;
  const itemGap = Math.max(spacing.gap.min ?? 0, Math.min(spacing.gap.preferred ?? 0, availableGaps / gapCount));
  const bezelSize = typeof dock.bezel === 'object' && dock.bezel && 'width' in dock.bezel
    ? { width: dock.bezel.width as number, height: dock.bezel.height as number }
    : dock.reference_geometry?.bezel_bounds ?? { width: 350, height: 96 };
  const bezelBounds = { x: 0, y: 0, width: bezelSize.width ?? 350, height: bezelSize.height ?? 96 };
  return <View testID="dock-reveal" pointerEvents="box-none" style={[box(clip), { overflow: 'hidden' }]}>
    <Animated.View testID="dock-assembly" pointerEvents="box-none" style={{ width: clip.width, height: body.y + body.height, transform: [{ translateY }] }}>
      <View testID="action-dock" pointerEvents={open ? 'auto' : 'none'} accessibilityElementsHidden={!open}
        importantForAccessibility={open ? 'auto' : 'no-hide-descendants'} aria-hidden={!open} style={box(body)}>
        <Art name={bezelAsset} bounds={bezelBounds} onLoad={() => markLoaded(bezelAsset)} />
        {dock.items.map((item, index) => <Pressable key={item.id} accessibilityRole="button" accessibilityLabel={item.label} disabled={busy || !open}
          style={[box({ x: (spacing.leading.preferred ?? 0) + index * (itemWidth + itemGap), y: dock.item.y, width: itemWidth, height: region.height - dock.item.y }), { opacity: busy ? 0.45 : 1 }]}
          onPress={() => { if (item.id === 'add') add(); else if (item.id === 'export') exportNotice(); else attachment(item.id); }}>
          {({ pressed }) => <View style={{ flex: 1, opacity: pressed ? 0.7 : 1 }}>
            <Art name={item.id === 'add' ? dock.addPlate : dock.plate.asset} onLoad={() => markLoaded(item.id === 'add' ? dock.addPlate : dock.plate.asset)}
              bounds={{ x: 0, y: dock.plate.y, width: dock.plate.width, height: dock.plate.height }} />
            <Art name={item.icon} bounds={dock.icon} onLoad={() => markLoaded(item.icon)} />
            <Text style={[{ position: 'absolute' }, typeStyle('dock'), { top: dock.label.y, width: dock.label.width, textAlign: 'center', color: item.id === 'add' ? c.orange : c.textMuted }]}>{item.label}</Text>
          </View>}
        </Pressable>)}
      </View>
      {geometry && handle ? <Pressable testID="action-dock-handle" accessibilityRole="button" accessibilityLabel="Action dock handle"
        accessibilityState={{ expanded }} onPress={toggle} style={box(geometry.handle)}>
        <Art name={uiSpec.orientationComponents.landscape.action_dock_handle.asset} bounds={{ x: 0, y: 0, width: handle.width, height: handle.height }} />
      </Pressable> : null}
    </Animated.View>
  </View>;
}
