/*
 * File: hud-smoke.ts
 * Purpose: Retained smoke tests for approved HUD behavior and source contracts.
 * Author: Codex; Contact: michael@mandedesign.studio
 * License: SPDX-License-Identifier: MPL-2.0; DEV-2026-09-07-025; DEV-2026-09-12-001; DEV-2026-09-14-005
 */
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { uiSpec } from '../src/ui/generated/uiSpec.ts';
import { backupIsSynced, dockAssemblyGeometry, hudView, mergeHudComponent, rotationEnd, SCANNER_ROTATION_MS, selectHudOrientation, selectMobileOrientation } from '../src/ui/ts_layout/hudBehavior.ts';
import { resolveHudLayout } from '../src/ui/ts_layout/resolveHudLayout.ts';
import { requestExport } from '../src/services/exportService.ts';

execFileSync(process.execPath, ['scripts/ui-yaml-contract.mjs'], { stdio: 'inherit' });
execFileSync(process.execPath, ['scripts/generate-ui.mjs', '--check'], { stdio: 'inherit' });
execFileSync(process.execPath, ['--experimental-strip-types', 'scripts/ui-authority-test.mjs', '--generated'], { stdio: 'inherit' });
execFileSync(process.execPath, ['--import', 'tsx', 'scripts/hud-resolve-smoke.ts'], { stdio: 'inherit' });
for (const [path, expected] of [['/', 'home'], ['/capture', 'capture'], ['/log', 'home'], ['/search', 'search'], ['/graph', 'graph'], ['/settings', 'settings'], ['/entry/1', 'detail']]) {
  assert.equal(hudView(path), expected);
}
const policy = uiSpec.layouts.mobile.selection;
assert.equal(selectMobileOrientation(390, 844, policy), 'portrait');
assert.equal(selectMobileOrientation(844, 390, policy), 'landscape');
assert.equal(selectHudOrientation({ width: 390, height: 300 }, { width: 390, height: 844 }, false, policy), 'portrait');
assert.equal(selectHudOrientation({ width: 844, height: 180 }, { width: 844, height: 390 }, false, policy), 'landscape');
assert.equal(selectHudOrientation({ width: 390, height: 844 }, { width: 1920, height: 1080 }, true, policy), 'portrait');
assert.equal(selectMobileOrientation(600, 600, policy), 'landscape');
assert.equal(selectMobileOrientation(600, 600, { ...policy, square: 'portrait' }), 'portrait');
assert.equal(selectMobileOrientation(390, 844, { ...policy, override: 'landscape' }), 'landscape');
assert.equal(selectMobileOrientation(600, 600, { ...policy, override: 'portrait' }), 'portrait');
assert.equal(uiSpec.layouts.mobile.layout_policy.global_uniform_scale, false);
assert.equal(uiSpec.layouts.mobile.layout_policy.letterbox, false);
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
assert.deepEqual(portraitRail.reference_geometry.item_offsets, [0, 172, 343]);
const landscapeRail = mergeHudComponent(uiSpec.components.navigation_rail, uiSpec.orientationComponents.landscape.navigation_rail);
assert.deepEqual(landscapeRail.button, { width: 155, height: 55 });
assert.deepEqual(landscapeRail.contexts.home, ['graph', 'search', 'new']);
assert.equal(uiSpec.orientationComponents.landscape.action_dock.behavior.default_visibility, 'collapsed');
assert.equal(uiSpec.orientationComponents.landscape.action_dock_handle.controls, 'action_dock');
assert.equal(uiSpec.layouts.mobile.portrait.reference_viewport.width, 390);
assert.equal(uiSpec.layouts.mobile.landscape.reference_viewport.width, 844);
assert.equal(uiSpec.layouts.tablet.status, 'unsupported');
assert.deepEqual(uiSpec.layouts.mobile.landscape.handedness.supported, ['right']);
assert.equal(uiSpec.layouts.mobile.landscape.handedness.preference, 'preserve_portrait');

const overlay = uiSpec.orientationComponents.landscape;
const landscapeComponents: Record<string, Record<string, unknown>> = {};
for (const [id, shared] of Object.entries(uiSpec.components)) {
  landscapeComponents[id] = mergeHudComponent(shared, ((overlay as Record<string, object>)[id] ?? {}) as object);
}
landscapeComponents.action_dock_handle = overlay.action_dock_handle as Record<string, unknown>;
const landscapeResolved = resolveHudLayout({
  window: { width: 844, height: 390 },
  obstructionInsets: { top: 0, right: 0, bottom: 0, left: 0 },
  family: { layout_policy: uiSpec.layouts.mobile.layout_policy, constraints: { scale_fixed_controls: false } },
  layout: uiSpec.layouts.mobile.landscape,
  components: landscapeComponents,
  handedness: 'right',
});
const assembly = dockAssemblyGeometry(landscapeResolved.regions.action_dock, landscapeResolved.regions.action_dock_handle);
assert.equal(assembly.handle.y + assembly.handle.height, assembly.dock.y);
assert.ok(landscapeResolved.expandedDock && Math.abs(landscapeResolved.expandedDock.height - 123.5) < 1e-6);

const exported = requestExport();
assert.equal(exported.status, 'not_implemented');
assert.match(exported.message, /No file has been created or shared/);
console.log('HUD contracts PASS: routes, Home chronological log, orientation layouts, contextual rail, dock, truthful backup, shared pivot, opposite motion, export stub');
