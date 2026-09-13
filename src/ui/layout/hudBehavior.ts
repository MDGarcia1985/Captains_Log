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
 * Workflow: HudShell on each dimension change. Data Handoff: portrait | landscape. */
export function selectMobileOrientation(width: number, height: number): HudOrientation {
  return width >= height ? 'landscape' : 'portrait';
}
/* Purpose: Overlay orientation geometry onto shared component semantics.
 * Design: Nested objects merge; arrays and scalars replace. Missing overlay returns shared.
 * Workflow: Shell/artwork render. Data Handoff: One component view-model. */
export function mergeHudComponent<T extends object, U extends object>(shared: T | undefined, overlay: U | undefined): T & U {
  if (!overlay) return shared as T & U;
  if (!shared) return overlay as T & U;
  return deepMerge(shared, overlay) as T & U;
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
