/*
 * File: hud-smoke.ts
 * Purpose: Retained smoke tests for approved HUD behavior and source contracts.
 * Author: Codex; Contact: michael@mandedesign.studio
 * License: SPDX-License-Identifier: MPL-2.0; DEV-2026-09-07-025; DEV-2026-09-12-001
 */
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { uiSpec } from '../src/ui/generated/uiSpec.ts';
import { backupIsSynced, fitHudArtboard, hudView, mergeHudComponent, rotationEnd, SCANNER_ROTATION_MS, selectHudOrientation, selectMobileOrientation } from '../src/ui/layout/hudBehavior.ts';
import { requestExport } from '../src/services/exportService.ts';

execFileSync(process.execPath, ['scripts/generate-ui.mjs', '--check'], { stdio: 'inherit' });
for (const [path, expected] of [['/', 'home'], ['/capture', 'capture'], ['/log', 'home'], ['/search', 'search'], ['/graph', 'graph'], ['/settings', 'settings'], ['/entry/1', 'detail']]) {
  assert.equal(hudView(path), expected);
}
assert.equal(selectMobileOrientation(390, 844), 'portrait');
assert.equal(selectMobileOrientation(844, 390), 'landscape');
// A keyboard can make the native window wider than it is tall without rotating.
assert.equal(selectHudOrientation({ width: 390, height: 300 }, { width: 390, height: 844 }, false), 'portrait');
assert.equal(selectHudOrientation({ width: 844, height: 180 }, { width: 844, height: 390 }, false), 'landscape');
// Desktop monitor orientation must not override a narrow browser window.
assert.equal(selectHudOrientation({ width: 390, height: 844 }, { width: 1920, height: 1080 }, true), 'portrait');
const noInsets = { top: 0, right: 0, bottom: 0, left: 0 };
const portraitSize = { width: 390, height: 844 };
assert.deepEqual(fitHudArtboard(portraitSize, portraitSize, noInsets), { scale: 1, x: 0, y: 0, width: 390, height: 844 });
assert.deepEqual(fitHudArtboard({ width: 600, height: 1000 }, portraitSize, noInsets), { scale: 1, x: 105, y: 78, width: 390, height: 844 });
assert.deepEqual(fitHudArtboard({ width: 1024, height: 768 }, { width: 844, height: 390 }, noInsets), { scale: 1, x: 90, y: 189, width: 844, height: 390 });
for (const window of [{ width: 320, height: 568 }, { width: 599, height: 390 }, { width: 600, height: 390 }, { width: 900, height: 390 }]) {
  const layout = uiSpec.layouts.mobile[selectMobileOrientation(window.width, window.height)];
  const insets = { top: 27, right: 41, bottom: 19, left: 13 };
  const fit = fitHudArtboard(window, layout.reference_viewport, insets);
  assert(fit.scale > 0 && fit.scale <= 1);
  assert(Math.abs(fit.width / fit.height - layout.reference_viewport.width / layout.reference_viewport.height) < 1e-9);
  assert(fit.x >= insets.left && fit.y >= insets.top);
  assert(fit.x + fit.width <= window.width - insets.right + 1e-9);
  assert(fit.y + fit.height <= window.height - insets.bottom + 1e-9);
}
assert.equal(uiSpec.layouts.mobile.portrait.id, 'mobile_portrait');
assert.equal(uiSpec.layouts.mobile.landscape.id, 'mobile_landscape');
assert.deepEqual(uiSpec.components.navigation_rail.contexts.home, ['graph', 'search', 'new']);
assert.ok(!uiSpec.components.navigation_rail.contexts.home.includes('log'));
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
const portraitRail = mergeHudComponent(uiSpec.components.navigation_rail, uiSpec.orientationComponents.portrait.navigation_rail);
assert.deepEqual(portraitRail.button, { width: 60, height: 155 });
assert.deepEqual(portraitRail.spacing.item_offsets, [0, 172, 343]);
const landscapeRail = mergeHudComponent(uiSpec.components.navigation_rail, uiSpec.orientationComponents.landscape.navigation_rail);
assert.deepEqual(landscapeRail.button, { width: 155, height: 55 });
assert.deepEqual(landscapeRail.contexts.home, ['graph', 'search', 'new']);
assert.equal(uiSpec.layouts.mobile.landscape.regions.action_dock.behavior.default_visibility, 'collapsed');
assert.equal(uiSpec.layouts.mobile.landscape.regions.action_dock_handle.controls, 'action_dock');
assert.equal(uiSpec.layouts.mobile.portrait.reference_viewport.width, 390);
assert.equal(uiSpec.layouts.mobile.landscape.reference_viewport.width, 844);
assert.equal(uiSpec.layouts.tablet.status, 'unsupported');
const exported = requestExport();
assert.equal(exported.status, 'not_implemented');
assert.match(exported.message, /No file has been created or shared/);
console.log('HUD contracts PASS: routes, Home chronological log, orientation layouts, contextual rail, dock, truthful backup, shared pivot, opposite motion, export stub');
