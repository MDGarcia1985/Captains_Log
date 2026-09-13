/*
 * File: HudShell.tsx
 * Purpose: Faithful compact mobile HUD with live route content and contextual actions.
 * Author: Codex; Contact: michael@mandedesign.studio
 * License: SPDX-License-Identifier: MPL-2.0
 * Decisions: DEV-2026-09-07-025; DEV-2026-09-11-001; DEV-2026-09-12-001
 */
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { AppState, Modal, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useFonts } from 'expo-font';
import { usePathname, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRequiredAppServices } from '@/services/AppServicesProvider';
import { requestExport } from '@/services/exportService';
import { uiSpec } from '@/ui/generated/uiSpec';
import { Art, box, hudColors as c, HudTitle, Scanner, typeStyle } from '@/ui/layout/HudArtwork';
import { backupIsSynced, hudRoutes, hudView, mergeHudComponent, selectMobileOrientation } from '@/ui/layout/hudBehavior';
import { HudLayoutProvider } from '@/ui/layout/HudLayoutContext';
import { useChrome } from '@/ui/state/ChromeContext';
import { useHud, type AttachmentAction, type HudCommand } from '@/ui/state/HudCommands';

const titles = { home: 'HOME', capture: 'NEW RECORD', search: 'SEARCH', graph: 'GRAPH', settings: 'SETTINGS', detail: 'RECORD' };

/* Purpose: Preserve individual native text/asset layers and wire existing capabilities.
 * Design: Select the canonical portrait or landscape specification; route content owns scrolling.
 * Workflow: Compact branch of AppShell. Data Handoff: Focus-scoped commands/services. */
export function HudShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const services = useRequiredAppServices();
  const hud = useHud();
  const { handedness } = useChrome();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const orientation = selectMobileOrientation(width, height);
  const layout = orientation === 'landscape' ? uiSpec.layouts.mobile.landscape : uiSpec.layouts.mobile.portrait;
  const overlay = uiSpec.orientationComponents[orientation];
  const rail = mergeHudComponent(uiSpec.components.navigation_rail, overlay.navigation_rail);
  const dock = mergeHudComponent(uiSpec.components.action_dock, overlay.action_dock);
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
  const [dockUi, setDockUi] = useState({ orientation, expanded: false });
  if (dockUi.orientation !== orientation) setDockUi({ orientation, expanded: false });
  const dockExpanded = dockUi.expanded;
  const activeView = hudView(pathname);
  const artboard = layout.reference_viewport;
  const scale = Math.min((width - insets.left - insets.right) / artboard.width, (height - insets.top - insets.bottom) / artboard.height, 1.5);
  const mirrored = handedness === 'left' && orientation === 'portrait';
  const available = hud.current?.scope === activeView ? hud.current : null;
  const busy = available?.busy ?? false;
  const layoutValue = useMemo(() => ({ orientation, layout }), [orientation, layout]);

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
   * Design: Never invoke a blurred screen's callbacks. Workflow: Rail/dock presses.
   * Data Handoff: Async screen result or a safe error notice. */
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

  if (!fontsReady) return <View style={styles.loading}><Text style={styles.notice}>
    {fontError ? `HUD fonts could not load: ${fontError.message}` : 'Loading HUD…'}
  </Text></View>;

  const actions = rail.contexts[activeView];
  const button = rail.button;
  const offsets = 'item_offsets' in rail.spacing ? rail.spacing.item_offsets : undefined;
  const gap = offsets ? 0 : (layout.regions.navigation_rail.height - actions.length * button.height) / (actions.length + 1);
  const decoration = layout.chrome;
  const notch = 'notch' in decoration ? decoration.notch : null;
  const homeIndicator = 'home_indicator' in decoration ? decoration.home_indicator : null;
  const handleRegion = 'action_dock_handle' in layout.regions ? layout.regions.action_dock_handle : null;
  const dockCollapsed = dock.behavior.default_visibility === 'collapsed' && !dockExpanded;
  const menuIcon = rail.menu.iconBounds;
  const stacked = rail.label.stacked;

  return <View style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
    <StatusBar style="light" />
    <View style={{ flex: 1, alignItems: 'center' }}>
      <View style={{ width: artboard.width * scale, height: artboard.height * scale }}>
        <HudLayoutProvider value={layoutValue}>
          <View testID="mobile-hud" nativeID={orientation} style={{ width: artboard.width, height: artboard.height, transform: [{ scale }], transformOrigin: 'top left', backgroundColor: c.background }}>
            <Art name={layout.atmosphere.paintedWashAsset} bounds={{ x: 0, y: 0, width: artboard.width, height: artboard.height }} />
            <View pointerEvents="none" style={[box(decoration.border), { borderWidth: 1, borderColor: c.borderStrong, borderRadius: decoration.border.radius }]} />
            {notch ? <Art name="chrome-top-safe-area-notch" bounds={notch} /> : null}
            {homeIndicator ? <Art name="chrome-bottom-home-indicator" bounds={homeIndicator} /> : null}
            <View pointerEvents="none" style={[box(decoration.rail_guide), { left: mirrored ? 81 : decoration.rail_guide.x, backgroundColor: c.cyan, opacity: uiSpec.theme.opacity.railGuide }]} />
            <View style={[box(layout.regions.status_header), mirrored && { left: 92 }]} accessibilityLabel={`Backup: ${synced ? 'synced' : 'local only'}. ${detail}`}>
              <Art name={status.bezel} bounds={{ x: 0, y: 0, width: layout.regions.status_header.width, height: layout.regions.status_header.height }} />
              <Art name={status.icon.asset} bounds={status.icon} />
              <Text style={[styles.absolute, { left: status.label.x, top: status.label.y, color: c.cyan }, typeStyle('status')]}>{status.label.text}</Text>
              <Text testID="backup-status" style={[styles.absolute, { left: status.value.x, top: status.value.y, color: c.text }, typeStyle('status')]}>{synced ? status.states.synced : status.states.local_only}</Text>
              <View style={[box(status.indicator), { borderRadius: 4, backgroundColor: c.cyan }]} />
              <View style={[box(status.divider), { backgroundColor: c.border }]} />
            </View>
            <View style={mirrored ? { position: 'absolute', left: -290, top: 0 } : undefined}><Scanner /></View>
            <View style={mirrored ? { position: 'absolute', left: 72, top: 0 } : undefined}><HudTitle title={titles[activeView]} /></View>
            <Pressable accessibilityRole="button" accessibilityLabel="Settings and more options" disabled={busy} onPress={() => setMenu('settings')}
              style={[box(layout.regions.settings_menu), mirrored && { left: 15 }]} hitSlop={{ top: 1, bottom: 3, left: 0, right: 0 }}>
              <Art name={rail.menu.icon} bounds={menuIcon} />
            </Pressable>
            <View style={[box(layout.regions.viewport), mirrored && { left: 84 }, { backgroundColor: c.panel,
              boxShadow: '0px 0px 14px rgba(61,222,229,0.16), inset 0px 2px 8px rgba(0,0,0,0.65)' }]}>
              <Art name={viewport.border} bounds={{ x: 0, y: 0, width: layout.regions.viewport.width, height: layout.regions.viewport.height }} />
              {viewport.accents.map(accent => <Art key={accent.asset} name={accent.asset} bounds={accent} />)}
              <View style={[box(viewport.content), { overflow: 'hidden' }]}>{children}</View>
            </View>
            <View testID={`rail-${activeView}`} style={[box(layout.regions.navigation_rail), mirrored && { left: 15 }]}>
              {actions.map((id, index) => {
                const isNew = id === 'new';
                const isCommand = !['new', 'search', 'graph', 'settings', 'home', 'back'].includes(id);
                const disabled = busy || (isCommand && !available?.commands[id as HudCommand]);
                const top = offsets ? offsets[index] : gap + index * (button.height + gap);
                const typeKey = stacked ? (id.length >= 6 ? 'railSearch' : id.length === 5 ? 'railGraph' : 'rail') : (id === 'new' ? 'rail' : 'railGraph');
                return <Pressable key={id} accessibilityRole="button" accessibilityLabel={id.toUpperCase()} accessibilityState={{ disabled }}
                  disabled={disabled} onPress={() => navigate(id)} style={[box({ x: 0, y: top, width: button.width, height: button.height }), { opacity: disabled ? 0.45 : 1 }]}>
                  {({ pressed }) => {
                    const showActive = pressed && orientation === 'portrait';
                    return <>
                      <Art name={showActive ? isNew ? rail.newActiveShape : rail.activeShape : isNew ? rail.newShape : rail.shape}
                        bounds={showActive ? rail.activeBounds : { x: 0, y: 0, width: button.width, height: button.height }} />
                      <View pointerEvents="none" style={stacked ? styles.railLabelBox : [styles.railLabelLandscape, { width: button.width, height: button.height }]}>
                        <Text accessible={false} style={[stacked ? styles.railText : styles.railTextLandscape, typeStyle(typeKey),
                          { color: isNew ? c.orange : pressed ? c.borderStrong : c.textMuted }]}>{stacked ? id.toUpperCase().split('').join('\n') : id.toUpperCase()}</Text>
                      </View>
                    </>;
                  }}
                </Pressable>;
              })}
            </View>
            {dockCollapsed ? null : <View testID="action-dock" style={box(layout.regions.action_dock)}>
              <Art name={dock.bezel} bounds={{ x: 0, y: 0, width: 350, height: 96 }} />
              {dock.items.map(item => <Pressable key={item.id} accessibilityRole="button" accessibilityLabel={item.label} disabled={busy}
                style={[box({ x: item.x, y: 0, width: 72, height: 96 }), { opacity: busy ? 0.45 : 1 }]}
                onPress={() => {
                  if (item.id === 'add') setMenu('add');
                  else if (item.id === 'export') setNotice(requestExport().message);
                  else attachment(item.id);
                }}>
                {({ pressed }) => <View style={{ flex: 1, opacity: pressed ? 0.7 : 1 }}>
                  <Art name={item.id === 'add' ? dock.addPlate : dock.plate.asset} bounds={{ x: 0, y: 8, width: 72, height: 62 }} />
                  <Art name={item.icon} bounds={dock.icon} />
                  <Text style={[styles.absolute, typeStyle('dock'), { top: dock.label.y, width: 72, textAlign: 'center', color: item.id === 'add' ? c.orange : c.textMuted }]}>{item.label}</Text>
                </View>}
              </Pressable>)}
            </View>}
            {handleRegion ? <Pressable testID="action-dock-handle" accessibilityRole="button" accessibilityLabel="Action dock handle"
              accessibilityState={{ expanded: dockExpanded }} onPress={() => setDockUi(current => ({ ...current, expanded: !current.expanded }))} style={box(handleRegion)}>
              <Art name={uiSpec.orientationComponents.landscape.action_dock_handle.asset} bounds={{ x: 0, y: 0, width: handleRegion.width, height: handleRegion.height }} />
            </Pressable> : null}
          </View>
        </HudLayoutProvider>
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
  </View>;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: c.background },
  loading: { flex: 1, padding: 24, justifyContent: 'center', backgroundColor: c.background },
  absolute: { position: 'absolute' },
  railLabelBox: { position: 'absolute', left: 12, top: 0, width: 36, height: 155, justifyContent: 'center' },
  railText: { width: 36, textAlign: 'center' },
  railLabelLandscape: { position: 'absolute', left: 0, top: 0, justifyContent: 'center', alignItems: 'center' },
  railTextLandscape: { textAlign: 'center' },
  scrim: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', padding: 24 },
  modal: { backgroundColor: c.panel, borderColor: c.cyan, borderWidth: 1, padding: 20, gap: 16 },
  option: { minHeight: 44, justifyContent: 'center', borderTopColor: c.borderStrong, borderTopWidth: 1 },
  notice: { color: c.text, fontFamily: 'ShareTechMono', fontSize: 16, lineHeight: 22 },
});
