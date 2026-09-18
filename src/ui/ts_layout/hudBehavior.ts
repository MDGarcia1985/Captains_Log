/*
 * File: hudBehavior.ts
 * Purpose: Testable route, backup-label, orientation and HUD spec-merge contracts.
 * Author: Codex; Contact: michael@mandedesign.studio
 * License: SPDX-License-Identifier: MPL-2.0
 * Decision: DEV-2026-09-07-025; DEV-2026-09-12-001
 */
export const SCANNER_ROTATION_MS = 10_000;
export type HudView = 'home' | 'capture' | 'search' | 'graph' | 'settings' | 'detail';
export type HudOrientation = 'portrait' | 'landscape';
export const hudRoutes = { new: '/capture', search: '/search', graph: '/graph', settings: '/settings', home: '/' } as const;
/* Purpose: Choose HUD context. Home and /log are the same chronological log.
 * Design: Pure route mapping. /log is retained as an alias, not a rail destination.
 * Workflow: Shell render. Data Handoff: Spec context key. */
export function hudView(path: string): HudView {
  if (path === '/' || path === '/log') return 'home';
  const segment = path.split('/')[1];
  return ['capture', 'search', 'graph', 'settings'].includes(segment) ? segment as HudView : 'detail';
}
/* Purpose: Select the canonical mobile orientation specification.
 * Design: Compare window axes; do not invent a third responsive layout.
 * Workflow: AppShell on each dimension change. Data Handoff: portrait | landscape. */
export type OrientationPolicy = { override: HudOrientation | null; square: HudOrientation; native_source: 'screen'; web_source: 'window' };
export function selectMobileOrientation(width: number, height: number, policy: Pick<OrientationPolicy, 'override' | 'square'>): HudOrientation {
  if (policy.override) return policy.override;
  if (width === height) return policy.square;
  return width > height ? 'landscape' : 'portrait';
}

type Size = { width: number; height: number };
type Insets = { top: number; right: number; bottom: number; left: number };
type Rect = Size & { x: number; y: number };

// Intersect the actual HUD host with the provider's safe rectangle in window coordinates.
export function hudUsableInsets(host: Rect, provider: Rect, insets: Insets): Insets {
  return {
    left: Math.max(0, provider.x + insets.left - host.x),
    top: Math.max(0, provider.y + insets.top - host.y),
    right: Math.max(0, host.x + host.width - (provider.x + provider.width - insets.right)),
    bottom: Math.max(0, host.y + host.height - (provider.y + provider.height - insets.bottom)),
  };
}

// Figma gives expanded dock and collapsed handle rectangles; YAML attaches the handle above the bezel.
export function dockAssemblyGeometry(dock: Rect, handle: Rect) {
  const top = dock.y - handle.height;
  return {
    clip: { x: dock.x, y: top, width: dock.width, height: handle.y + handle.height - top },
    dock: { x: 0, y: handle.height, width: dock.width, height: dock.height },
    handle: { x: handle.x - dock.x, y: 0, width: handle.width, height: handle.height },
    travel: handle.y - top,
  };
}

// Native screen dimensions rotate but do not shrink for adjustResize keyboards.
// Browser layouts follow their window, rather than the desktop monitor's axes.
export function selectHudOrientation(window: Size, screen: Size, web: boolean, policy: OrientationPolicy): HudOrientation {
  const size = { window, screen }[web ? policy.web_source : policy.native_source];
  return selectMobileOrientation(size.width, size.height, policy);
}

// DEV-2026-09-14-001: fit the authorized artboard uniformly in the usable safe area.
export function fitHudArtboard(window: Size, artboard: Size, insets: Insets) {
  const width = Math.max(0, window.width - insets.left - insets.right);
  const height = Math.max(0, window.height - insets.top - insets.bottom);
  const scale = Math.min(width / artboard.width, height / artboard.height);
  return {
    scale,
    x: insets.left + (width - artboard.width * scale) / 2,
    y: insets.top + (height - artboard.height * scale) / 2,
    width: artboard.width * scale,
    height: artboard.height * scale,
  };
}

// Phone-space border, separate from both the artboard transform and letterboxing.
export function hudBorderBounds(frame: Size, inset: number) {
  return { x: inset, y: inset, width: Math.max(0, frame.width - 2 * inset), height: Math.max(0, frame.height - 2 * inset) };
}
/* Purpose: Overlay orientation geometry onto shared component semantics.
 * Design: Nested objects merge; arrays and scalars replace. Missing overlay returns shared.
 * Workflow: Shell/artwork render. Data Handoff: One component view-model. */
type HudMerge<T, U> = U extends readonly unknown[] ? U : U extends object ? T extends object ? {
  [K in keyof T | keyof U]: K extends keyof U ? K extends keyof T ? HudMerge<T[K], U[K]> : U[K] : K extends keyof T ? T[K] : never;
} : U : U;
export function mergeHudComponent<T extends object, U extends object>(shared: T, overlay: U): HudMerge<T, U> {
  return deepMerge(shared, overlay) as HudMerge<T, U>;
}
function deepMerge(baseValue: unknown, overlay: unknown): unknown {
  if (overlay === undefined) return baseValue;
  if (Array.isArray(overlay) || overlay === null || typeof overlay !== 'object') return overlay;
  if (baseValue === null || typeof baseValue !== 'object' || Array.isArray(baseValue)) return { ...(overlay as object) };
  const out: Record<string, unknown> = { ...(baseValue as Record<string, unknown>) };
  for (const [key, value] of Object.entries(overlay as Record<string, unknown>)) out[key] = deepMerge((baseValue as Record<string, unknown>)[key], value);
  return out;
}
/* Purpose: Never claim synchronization from connectivity or a stale timestamp.
 * Design: Require a successful snapshot at least as recent as every local edit.
 * Workflow: Header refresh. Data Handoff: Two-state user label; details stay separate. */
export function backupIsSynced(status: { state: string; lastBackupAt: number | null }, newestEdit: number) {
  return status.state === 'current' && status.lastBackupAt !== null && status.lastBackupAt >= newestEdit;
}
/* Purpose: Translate declared clockwise direction into RN's positive angle convention.
 * Design: Shared phase produces opposite directions with an identical center.
 * Workflow: Animated interpolation. Data Handoff: Degree string for a full turn. */
export function rotationEnd(direction: 'clockwise' | 'counterclockwise') {
  return direction === 'clockwise' ? '360deg' : '-360deg';
}
