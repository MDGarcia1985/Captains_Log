/*
 * File: hudBehavior.ts
 * Purpose: Testable route, backup-label and rotation contracts for the mobile HUD.
 * Author: Codex; Contact: michael@mandedesign.studio
 * License: SPDX-License-Identifier: MPL-2.0
 * Decision: DEV-2026-09-07-025
 */
export const SCANNER_ROTATION_MS = 10_000;
export type HudView = 'home' | 'capture' | 'log' | 'search' | 'graph' | 'settings' | 'detail';
export const hudRoutes = { new: '/capture', log: '/log', search: '/search', graph: '/graph', settings: '/settings', home: '/' } as const;
/* Purpose: Choose context without confusing home with its Log destination.
 * Design: Pure route mapping. Workflow: Shell render. Data Handoff: Spec context key. */
export function hudView(path: string): HudView {
  if (path === '/') return 'home';
  const segment = path.split('/')[1];
  return ['capture', 'log', 'search', 'graph', 'settings'].includes(segment) ? segment as HudView : 'detail';
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
