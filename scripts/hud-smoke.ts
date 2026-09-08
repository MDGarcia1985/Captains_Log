/*
 * File: hud-smoke.ts
 * Purpose: Retained smoke tests for approved HUD behavior and source contracts.
 * Author: Codex; Contact: michael@mandedesign.studio
 * License: SPDX-License-Identifier: MPL-2.0; DEV-2026-09-07-025
 */
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { uiSpec } from '../src/ui/generated/uiSpec.ts';
import { backupIsSynced, hudView, rotationEnd, SCANNER_ROTATION_MS } from '../src/ui/layout/hudBehavior.ts';
import { requestExport } from '../src/services/exportService.ts';

execFileSync(process.execPath, ['scripts/generate-ui.mjs', '--check'], { stdio: 'inherit' });
for (const [path, expected] of [['/', 'home'], ['/capture', 'capture'], ['/log', 'log'], ['/search', 'search'], ['/graph', 'graph'], ['/settings', 'settings'], ['/entry/1', 'detail']]) {
  assert.equal(hudView(path), expected);
}
assert.deepEqual(uiSpec.components.navigation_rail.contexts.capture, ['commit', 'cancel']);
assert.deepEqual(uiSpec.components.action_dock.items.map(x => x.id), ['add', 'camera', 'location', 'export']);
assert.equal(uiSpec.components.action_dock.addMenu[0].id, 'gallery');
assert.equal(uiSpec.components.status_header.reserved.visible, false);
assert.equal(backupIsSynced({ state: 'current', lastBackupAt: 20 }, 10), true);
assert.equal(backupIsSynced({ state: 'current', lastBackupAt: 20 }, 21), false);
assert.equal(backupIsSynced({ state: 'current', lastBackupAt: null }, 0), false);
for (const state of ['offline', 'failed', 'stale', 'never']) assert.equal(backupIsSynced({ state, lastBackupAt: 20 }, 0), false);
assert.equal(rotationEnd(uiSpec.components.scanner.inner.direction), '360deg');
assert.equal(rotationEnd(uiSpec.components.scanner.outer.direction), '-360deg');
assert.equal(SCANNER_ROTATION_MS, 10000);
const pivot = uiSpec.components.scanner.rotationBounds;
assert.equal(pivot.x + pivot.width / 2, 30);
assert.equal(pivot.y + pivot.height / 2, 38);
const rail = uiSpec.components.navigation_rail;
assert.deepEqual(rail.button, { width: 60, height: 135 });
assert.deepEqual(rail.spacing.homeOffsets.slice(1).map((v, i) => v - rail.spacing.homeOffsets[i] - 135), [9, 9, 9]);
const exported = requestExport();
assert.equal(exported.status, 'not_implemented');
assert.match(exported.message, /No file has been created or shared/);
console.log('HUD contracts PASS: routes, contextual rail, dock, truthful backup, shared pivot, opposite motion, export stub');
