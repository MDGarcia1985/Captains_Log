/*
 * File: HudShell.tsx
 * Purpose: YAML mobile HUD for the actual window using resolved regions, not global scale.
 * Author: Codex; Contact: michael@mandedesign.studio
 * License: SPDX-License-Identifier: MPL-2.0
 * Decisions: DEV-2026-09-07-025; DEV-2026-09-11-001; DEV-2026-09-12-001; DEV-2026-09-14-005; DEV-2026-10-28-001
 */
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { AppState, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFonts } from 'expo-font';
import { usePathname, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useRequiredAppServices } from '@/services/AppServicesProvider';
import { requestExport } from '@/services/exportService';
import { uiSpec } from '@/ui/generated/uiSpec';
import { Art, box, hudColors as c, HudTitle, Scanner, typeStyle } from '@/ui/ts_layout/HudArtwork';
import { backupIsSynced, hudRoutes, hudView, mergeHudComponent } from '@/ui/ts_layout/hudBehavior';
import { HudDock } from '@/ui/ts_layout/HudDock';
import { HudLayoutProvider, useHudLayout } from '@/ui/ts_layout/HudLayoutContext';
import { useHudResolve } from '@/ui/ts_layout/useHudResolve';
import { useHud, type AttachmentAction, type HudCommand } from '@/ui/state/HudCommands';
import type { Rect } from '@/ui/ts_layout/resolveHudLayout';

const titles = { home: 'HOME', capture: 'NEW RECORD', search: 'SEARCH', graph: 'GRAPH', settings: 'SETTINGS', detail: 'RECORD' };

type Accent = {
  asset: string;
  alignment?: { horizontal: string; vertical: string };
  size?: { width: number; height: number };
  insets?: { left?: number; right?: number; top?: number; bottom?: number };
  export_envelope?: { width: number; height: number; offset_from_shape?: { x: number; y: number } };
  width?: number;
  height?: number;
  x?: number;
  y?: number;
};

function accentBox(accent: Accent, viewport: Rect): Rect {
  const width = accent.size?.width ?? accent.width ?? 0;
  const height = accent.size?.height ?? accent.height ?? 0;
  const x = accent.alignment?.horizontal === 'right'
    ? viewport.width - width - (accent.insets?.right ?? 0)
    : (accent.insets?.left ?? accent.x ?? 0);
  const y = accent.alignment?.vertical === 'bottom'
    ? viewport.height - height - (accent.insets?.bottom ?? 0)
    : (accent.insets?.top ?? accent.y ?? 0);
  const envelope = accent.export_envelope;
  if (!envelope) return { x, y, width, height };
  return {
    x: x + (envelope.offset_from_shape?.x ?? 0),
    y: y + (envelope.offset_from_shape?.y ?? 0),
    width: envelope.width,
    height: envelope.height,
  };
}

function railButtonTops(count: number, buttonHeight: number, spacing: { gap?: { min?: number; preferred?: number }; preferred_gaps?: readonly number[] }, overflow: boolean, reserved: number) {
  const fallback = overflow ? spacing.gap?.min ?? 0 : spacing.gap?.preferred ?? 0;
  const tops: number[] = [];
  let y = reserved;
  for (let index = 0; index < count; index += 1) {
    tops.push(y);
    y += buttonHeight + (index < count - 1 ? (overflow ? fallback : spacing.preferred_gaps?.[index] ?? fallback) : 0);
  }
  return tops;
}

/* Purpose: Preserve individual native text/asset layers and wire existing capabilities.
 * Design: Full-window canvas; YAML resolver places fixed controls and flexible regions.
 * Workflow: Persistent shell for every viewport.
 * Data Handoff: Focus-scoped commands/services.
 */
export function HudShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const services = useRequiredAppServices();
  const hud = useHud();
  const parent = useHudLayout();
  const { orientation, layout } = parent;
  const { ref: hostRef, onLayout, resolved, ready } = useHudResolve();
  const overlay = uiSpec.orientationComponents[orientation];
  const rail = mergeHudComponent(uiSpec.components.navigation_rail, overlay.navigation_rail);
  const viewport = mergeHudComponent(uiSpec.components.viewport, overlay.viewport);
  const status = mergeHudComponent(uiSpec.components.status_header, overlay.status_header);
  const [fontsReady, fontError] = useFonts({
    CaptainsHUDDisplayMedium: require('../../../assets/fonts/CaptainsHUDDisplay-Medium.ttf'),
    CaptainsHUDDisplaySemiBold: require('../../../assets/fonts/CaptainsHUDDisplay-SemiBold.ttf'),
    ShareTechMono: require('../../../assets/fonts/ShareTechMono-Regular.ttf'),
  });
  const [synced, setSynced] = useState(false);
  const [detail, setDetail] = useState('Backup status is being checked');
  const [menu, setMenu] = useState<'settings' | 'add' | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const dockStartsOpen = (next: typeof orientation) => {
    const visibility = uiSpec.orientationComponents[next].action_dock.behavior.default_visibility;
    return visibility === 'visible';
  };
  const [dockUi, setDockUi] = useState(() => ({ orientation, expanded: dockStartsOpen(orientation) }));
  if (dockUi.orientation !== orientation) setDockUi({ orientation, expanded: dockStartsOpen(orientation) });
  const dockExpanded = dockUi.expanded;
  const activeView = hudView(pathname);
  const available = hud.current?.scope === activeView ? hud.current : null;
  const busy = available?.busy ?? false;
  const regions = resolved.regions;
  const canvas = regions.canvas ?? { x: 0, y: 0, width: parent.width, height: parent.height };
  const layoutValue = useMemo(() => ({
    ...parent,
    regions,
    overflow: resolved.overflow,
    expandedDock: resolved.expandedDock,
    resolveStatus: resolved.status,
  }), [parent, regions, resolved.overflow, resolved.expandedDock, resolved.status]);

  useEffect(() => {
    let alive = true;
    let running = false;
    async function refresh() {
      if (running || AppState.currentState === 'background') return;
      running = true;
      try {
        const [statusValue, entries] = await Promise.all([services.backup.getStatus(), services.entries.listEntries()]);
        const newest = entries.reduce((max, entry) => Math.max(max, entry.updatedAt), 0);
        if (alive) { setSynced(backupIsSynced(statusValue, newest)); setDetail(statusValue.detail); }
      } catch {
        if (alive) { setSynced(false); setDetail('Backup status unavailable; archive remains local'); }
      } finally { running = false; }
    }
    void refresh();
    const timer = setInterval(() => void refresh(), 15000);
    const subscription = AppState.addEventListener('change', state => { if (state === 'active') void refresh(); });
    return () => { alive = false; clearInterval(timer); subscription.remove(); };
  }, [pathname, services]);

  /* Purpose: Dispatch an existing screen action and expose errors visibly.
   * Design: Never invoke a blurred screen's callbacks.
   * Workflow: Rail/dock presses.
   * Data Handoff: Async screen result or a safe error notice.
   */
  async function command(id: HudCommand) {
    if (busy || !available?.commands[id]) return;
    try { await available.commands[id]?.(); }
    catch (error) { setNotice(error instanceof Error ? error.message : 'Action unavailable'); }
  }
  function attachment(id: AttachmentAction) {
    setMenu(null);
    if (activeView === 'capture') void command(id);
    else { hud.requestAttachment(id); router.push('/capture'); }
  }
  function navigate(id: string) {
    if (busy) return;
    if (id in hudRoutes) router.push(hudRoutes[id as keyof typeof hudRoutes] as never);
    else if (id === 'back') { if (router.canGoBack()) router.back(); else router.replace('/'); }
    else void command(id as HudCommand);
  }

  if (!fontsReady) return <View ref={hostRef} onLayout={onLayout} testID="hud-buffer" style={[styles.root, styles.loading]}><Text style={styles.notice}>
    {fontError ? `HUD fonts could not load: ${fontError.message}` : 'Loading HUD…'}
  </Text></View>;

  const actions = rail.contexts[activeView];
  const button = rail.button;
  const railRect = regions.navigation_rail ?? { x: 0, y: 0, width: 0, height: 0 };
  const viewportRect = regions.viewport ?? { x: 0, y: 0, width: 0, height: 0 };
  const handleRegion = regions.action_dock_handle;
  const reservation = ((layout.runtime_regions.navigation_rail as { content_reservations?: Array<{ region: string; gap?: { min?: number; preferred?: number } }> }).content_reservations ?? [])
    .reduce((sum, item) => {
      const member = regions[item.region];
      const gap = resolved.overflow.navigation_rail === 'scroll' ? item.gap?.min ?? 0 : item.gap?.preferred ?? item.gap?.min ?? 0;
      return sum + (member?.height ?? 0) + gap;
    }, 0);
  const tops = railButtonTops(actions.length, button.height, rail.spacing, resolved.overflow.navigation_rail === 'scroll', reservation);
  const menuIcon = rail.menu.iconBounds;
  const stacked = rail.label.stacked;
  const contentInsets = viewport.content.insets;
  const contentBox = {
    x: contentInsets.left,
    y: contentInsets.top,
    width: Math.max(0, viewportRect.width - contentInsets.left - contentInsets.right),
    height: Math.max(0, viewportRect.height - contentInsets.top - contentInsets.bottom),
  };
  const dockOverlap = orientation === 'landscape'
    ? uiSpec.orientationComponents.landscape.action_dock.expanded_assembly.overlap_with_bezel
    : 0;
  const contentStop = handleRegion
    ? dockExpanded && regions.action_dock
      ? regions.action_dock.y - handleRegion.height + dockOverlap
      : handleRegion.y
    : undefined;
  const contentHeight = contentStop !== undefined
    ? Math.min(contentBox.height, Math.max(0, contentStop - viewportRect.y - contentBox.y))
    : contentBox.height;
  const border = regions.border ?? { x: 8, y: 8, width: Math.max(0, canvas.width - 16), height: Math.max(0, canvas.height - 16) };
  const borderRadius = (layout.runtime_regions.border as { appearance?: { radius?: number } }).appearance?.radius ?? 40;
  const wash = layout.atmosphere.paintedWashAsset;
  const buttons = actions.map((id, index) => {
    const isNew = id === 'new';
    const isCommand = !['new', 'search', 'graph', 'settings', 'home', 'back'].includes(id);
    const disabled = busy || (isCommand && !available?.commands[id as HudCommand]);
    const top = tops[index];
    const typeKey = stacked ? (id.length >= 6 ? 'railSearch' : id.length === 5 ? 'railGraph' : 'rail') : (id === 'new' ? 'rail' : 'railGraph');
    const labelBounds = id in rail.labelBounds ? rail.labelBounds[id as keyof typeof rail.labelBounds]
      : { x: rail.label.x, y: rail.label.y, width: rail.label.width, height: button.height };
    return <Pressable key={id} accessibilityRole="button" accessibilityLabel={id.toUpperCase()} accessibilityState={{ disabled }}
      disabled={disabled} onPress={() => navigate(id)} style={[box({ x: 0, y: top, width: button.width, height: button.height }), { opacity: disabled ? 0.45 : 1 }]}>
      {({ pressed }) => {
        const showActive = pressed && orientation === 'portrait';
        return <>
          <Art name={showActive ? isNew ? rail.newActiveShape : rail.activeShape : isNew ? rail.newShape : rail.shape}
            bounds={showActive ? rail.activeBounds : isNew ? rail.newAssetBounds : rail.assetBounds} />
          <View testID={`hud-rail-label-${id}`} pointerEvents="none" style={[box(labelBounds), styles.railLabel]}>
            <Text accessible={false} style={[styles.railText, { width: labelBounds.width }, typeStyle(typeKey),
              { color: isNew ? c.orange : pressed ? c.borderStrong : c.textMuted }]}>{stacked ? id.toUpperCase().split('').join('\n') : id.toUpperCase()}</Text>
          </View>
        </>;
      }}
    </Pressable>;
  });

  return <View ref={hostRef} onLayout={onLayout} testID="hud-buffer" style={styles.root}>
    <HudLayoutProvider value={layoutValue}>
      <StatusBar style="light" />
      <View testID="hud-artboard-frame" style={[box(canvas), { opacity: ready ? 1 : 0 }]}>
        <View testID="mobile-hud" nativeID={orientation} style={{ width: canvas.width, height: canvas.height, backgroundColor: c.background }}>
          <Art name={wash} bounds={{ x: 0, y: 0, width: canvas.width, height: canvas.height }} />
          {regions.notch ? <Art name="chrome-top-safe-area-notch" bounds={regions.notch} /> : null}
          {regions.home_indicator ? <Art name="chrome-bottom-home-indicator" bounds={regions.home_indicator} /> : null}
          {regions.rail_guide ? <View pointerEvents="none" style={[box(regions.rail_guide), { backgroundColor: c.cyan, opacity: uiSpec.theme.opacity.railGuide }]} /> : null}
          <View testID="status-header" style={box(regions.status_header ?? { x: 0, y: 0, width: 0, height: 0 })} accessibilityLabel={`Backup: ${synced ? 'synced' : 'local only'}. ${detail}`}>
            {status.bezelVisible ? <Art name={status.bezel} bounds={status.bezelBounds} /> : null}
            <Art name={status.icon.asset} bounds={status.icon} />
            <Text style={[styles.absolute, { left: status.label.x, top: status.label.y, color: c.cyan }, typeStyle('status')]}>{status.label.text}</Text>
            <Text testID="backup-status" style={[styles.absolute, { left: status.value.x, top: status.value.y, color: c.text }, typeStyle('status')]}>{synced ? status.states.synced : status.states.local_only}</Text>
            <View style={[box(status.indicator), { borderRadius: 4, backgroundColor: c.cyan }]} />
            <View style={[box(status.divider), { backgroundColor: c.border }]} />
          </View>
          <Scanner />
          <HudTitle title={titles[activeView]} />
          <Pressable accessibilityRole="button" accessibilityLabel="Settings and more options" disabled={busy} onPress={() => setMenu('settings')}
            style={box(regions.settings_menu ?? { x: 0, y: 0, width: 0, height: 0 })} hitSlop={{ top: 1, bottom: 3, left: 0, right: 0 }}>
            <Art name={rail.menu.icon} bounds={menuIcon} />
          </Pressable>
          <View testID="hud-viewport" style={[box(viewportRect), { backgroundColor: c.panel,
            boxShadow: '0px 0px 14px rgba(61,222,229,0.16), inset 0px 2px 8px rgba(0,0,0,0.65)' }]}>
            <Art name={viewport.border} bounds={{ x: 0, y: 0, width: viewportRect.width, height: viewportRect.height }} />
            {viewport.accents.map(accent => <Art key={accent.asset} name={accent.asset} bounds={accentBox(accent, viewportRect)} />)}
            <View testID="hud-content" style={[box(contentBox), { overflow: 'hidden' }]}>
              <View testID="hud-scroll-host" style={{ height: contentHeight }}>{children}</View>
            </View>
          </View>
          <View testID={`rail-${activeView}`} pointerEvents="box-none" style={box(railRect)}>
            {resolved.overflow.navigation_rail === 'scroll'
              ? <ScrollView testID="hud-rail-scroll" style={{ flex: 1 }} contentContainerStyle={{ height: (tops.at(-1) ?? 0) + button.height }} nestedScrollEnabled>{buttons}</ScrollView>
              : buttons}
          </View>
          <HudDock expanded={dockExpanded} busy={busy}
            toggle={() => setDockUi(current => ({ ...current, expanded: !current.expanded }))}
            add={() => setMenu('add')} attachment={attachment} exportNotice={() => setNotice(requestExport().message)} />
          <View testID="hud-outer-border" pointerEvents="none" style={[box(border),
            { borderWidth: 1, borderColor: c.borderStrong, borderRadius }]} />
          {resolved.status === 'unsupported_size' ? <View testID="hud-unsupported" pointerEvents="none" style={styles.unsupported}>
            <Text style={styles.notice}>This window is below the HUD minimum.</Text>
          </View> : null}
        </View>
      </View>
      <Modal visible={menu !== null || notice !== null} transparent animationType="fade" onRequestClose={() => { setMenu(null); setNotice(null); }}>
        <View style={styles.scrim}><View accessibilityViewIsModal style={styles.modal}>
          <Text accessibilityRole="header" style={[styles.notice, typeStyle('subtitle')]}>{notice ? 'EXPORT / NOTICE' : menu === 'add' ? 'ADD ATTACHMENT' : 'OPTIONS'}</Text>
          {notice ? <Text style={styles.notice}>{notice}</Text> : menu === 'add' ?
            <Pressable accessibilityRole="button" onPress={() => attachment('gallery')} style={styles.option}><Text style={styles.notice}>Gallery</Text></Pressable> :
            <Pressable accessibilityRole="button" onPress={() => { setMenu(null); router.push('/settings'); }} style={styles.option}><Text style={styles.notice}>Settings</Text></Pressable>}
          <Pressable accessibilityRole="button" onPress={() => { setMenu(null); setNotice(null); }} style={styles.option}><Text style={[styles.notice, { color: c.cyan }]}>Close</Text></Pressable>
        </View></View>
      </Modal>
    </HudLayoutProvider>
  </View>;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: c.background, overflow: 'hidden' },
  loading: { flex: 1, padding: 24, justifyContent: 'center', backgroundColor: c.background },
  absolute: { position: 'absolute' },
  railLabel: { justifyContent: 'center', alignItems: 'center' },
  railText: { textAlign: 'center' },
  scrim: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', padding: 24 },
  modal: { backgroundColor: c.panel, borderColor: c.cyan, borderWidth: 1, padding: 20, gap: 16 },
  option: { minHeight: 44, justifyContent: 'center', borderTopColor: c.borderStrong, borderTopWidth: 1 },
  notice: { color: c.text, fontFamily: 'ShareTechMono', fontSize: 16, lineHeight: 22 },
  unsupported: { position: 'absolute', left: 20, right: 20, bottom: 20, opacity: 0.9 },
});
