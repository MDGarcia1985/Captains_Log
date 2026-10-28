/*
 * File: scripts/hud-resolve-smoke.ts
 * Purpose: Exercise the schema 3 resolver without React or global scale.
 * Author: Michael Garcia
 * Contact: michael@mandedesign.studio
 * License: SPDX-License-Identifier: MPL-2.0
 * Related Decisions: DEV-2026-09-14-005
 */
import assert from 'node:assert/strict';
import { uiSpec } from '../src/ui/generated/uiSpec.ts';
import { hudHostMatchesOrientation, hudUsableInsets, mergeHudComponent } from '../src/ui/ts_layout/hudBehavior.ts';
import { resolveHudLayout, type Insets, type Size } from '../src/ui/ts_layout/resolveHudLayout.ts';

const none: Insets = { top: 0, right: 0, bottom: 0, left: 0 };

// Physical-device regressions: Android's window origin can already be offset by
// status bars/cutouts. The onLayout origin remains zero inside SafeAreaProvider.
const portraitHost = { x: 0, y: -66.0513, width: 430, height: 932 };
const portraitProvider = { x: 0, y: 0, width: 430, height: 932 };
const portraitInsets = { top: 66.0513, left: 0, right: 0, bottom: 24.2051 };
const localOrigin = { x: 0, y: 0 };
const portraitObstruction = hudUsableInsets(portraitHost, portraitProvider, portraitInsets, localOrigin);
for (const edge of ['top', 'left', 'bottom', 'right'] as const) {
  assert.ok(Math.abs(portraitObstruction[edge] - portraitInsets[edge]) < 1e-9, `portrait ${edge} counted once`);
}
const landscapeHost = { x: -66.0513, y: -24.2051, width: 932, height: 430 };
const landscapeProvider = { x: 0, y: 0, width: 932, height: 430 };
const landscapeInsets = { top: 24.2051, left: 66.0513, right: 24.2051, bottom: 0 };
const landscapeObstruction = hudUsableInsets(landscapeHost, landscapeProvider, landscapeInsets, localOrigin);
for (const edge of ['top', 'left', 'bottom', 'right'] as const) {
  assert.ok(Math.abs(landscapeObstruction[edge] - landscapeInsets[edge]) < 1e-9, `${edge} counted once`);
}
// The correction must also preserve normal iOS/web/edge-to-edge origins and
// subtract real parent-layout padding, rather than just cap doubled values.
assert.deepEqual(hudUsableInsets({ width: 430, height: 932 }, portraitProvider, portraitInsets, localOrigin), portraitObstruction);
const insetHost = { width: 410, height: 832 };
assert.deepEqual(hudUsableInsets(insetHost, portraitProvider, portraitInsets, { x: 10, y: 70 }), none);
assert.equal(hudUsableInsets(portraitHost, { ...portraitProvider, y: 120 }, portraitInsets, localOrigin).top, 66.0513,
  'provider root-space origin is not added to provider-local safe distances');

// Both rotation directions, including host-before-selection and selection-before-host.
for (const [from, to, oldHost, newHost] of [
  ['portrait', 'landscape', portraitHost, landscapeHost],
  ['landscape', 'portrait', landscapeHost, portraitHost],
] as const) {
  assert.equal(hudHostMatchesOrientation(oldHost, from, oldHost), true);
  assert.equal(hudHostMatchesOrientation(oldHost, to, newHost), false, `${from} -> ${to}: stale host pending`);
  assert.equal(hudHostMatchesOrientation(newHost, from, oldHost), false, `${from} -> ${to}: stale selection pending`);
  assert.equal(hudHostMatchesOrientation(newHost, to, newHost), true, `${from} -> ${to}: fresh host accepted`);
  assert.equal(hudHostMatchesOrientation(oldHost, to), false, 'web rotation also rejects old host');
}
assert.equal(hudHostMatchesOrientation(null, 'portrait'), false);
assert.equal(hudHostMatchesOrientation({ width: 0, height: 0 }, 'portrait'), false);
assert.equal(hudHostMatchesOrientation({ width: 430, height: 300 }, 'portrait', portraitHost), true,
  'native keyboard shortening is not rotation');
assert.equal(hudHostMatchesOrientation({ width: 430, height: 300 }, 'portrait'), false,
  'web follows window axes');

function components(orientation: 'portrait' | 'landscape') {
  const overlay = uiSpec.orientationComponents[orientation];
  const merged: Record<string, Record<string, unknown>> = {};
  for (const [id, shared] of Object.entries(uiSpec.components)) {
    merged[id] = mergeHudComponent(shared, ((overlay as Record<string, object>)[id] ?? {}) as object);
  }
  if ('action_dock_handle' in overlay) merged.action_dock_handle = overlay.action_dock_handle as Record<string, unknown>;
  return merged;
}

function resolve(orientation: 'portrait' | 'landscape', window: Size, insets: Insets = none, handedness: 'left' | 'right' = 'right') {
  return resolveHudLayout({
    window,
    obstructionInsets: insets,
    family: { layout_policy: uiSpec.layouts.mobile.layout_policy, constraints: { scale_fixed_controls: false } },
    layout: uiSpec.layouts.mobile[orientation],
    components: components(orientation),
    handedness,
  });
}

function close(actual: number, expected: number, label: string, epsilon = 0.6) {
  assert.ok(Math.abs(actual - expected) < epsilon, `${label}: ${actual} != ${expected}`);
}

const portrait = resolve('portrait', { width: 390, height: 844 });
assert.equal(portrait.status, 'ok');
close(portrait.regions.scanner.x, 315, 'scanner.x');
close(portrait.regions.scanner.y, 28, 'scanner.y');
close(portrait.regions.scanner.width, 60, 'scanner.w');
close(portrait.regions.scanner.height, 82, 'scanner.h');
close(portrait.regions.status_header.x, 20, 'header.x');
close(portrait.regions.status_header.width, 278, 'header.w');
close(portrait.regions.status_header.height, 82, 'header.h');
close(portrait.regions.border.x, 8, 'border.x');
close(portrait.regions.border.width, 374, 'border.w');
close(portrait.regions.action_dock.x, 20, 'dock.x');
close(portrait.regions.action_dock.y, 724, 'dock.y');
close(portrait.regions.action_dock.width, 350, 'dock.w');
close(portrait.regions.canvas.width, 390, 'canvas.w');
close(portrait.regions.canvas.height, 844, 'canvas.h');
assert.equal(portrait.overflow.navigation_rail, undefined);

const landscape = resolve('landscape', { width: 844, height: 390 });
assert.equal(landscape.status, 'ok');
close(landscape.regions.navigation_rail.width, 155, 'rail.w');
close(landscape.regions.title_block.height, 68, 'title.h');
close(landscape.regions.action_dock.x, 163, 'dock.x');
close(landscape.regions.action_dock.y, 276, 'dock.y');
close(landscape.regions.action_dock.height, 96, 'dock.h');
close(landscape.regions.action_dock.width, 350, 'dock.w');
close(landscape.regions.action_dock_handle.x, 299, 'handle.x');
close(landscape.regions.action_dock_handle.y, 340, 'collapsed handle.y');
assert.equal(landscape.expandedDock?.height, 121);
close(landscape.regions.border.x, 8, 'land border.x');

assert.equal(resolve('portrait', { width: 362, height: 844 }).status, 'ok');
assert.equal(resolve('portrait', { width: 361, height: 844 }).status, 'unsupported_size');
assert.equal(resolve('landscape', { width: 775, height: 390 }).status, 'ok');
assert.equal(resolve('landscape', { width: 774, height: 390 }).status, 'unsupported_size');

const short = resolve('portrait', { width: 390, height: 520 });
assert.ok(short.status === 'ok' || short.overflow.navigation_rail === 'scroll' || short.status === 'unsupported_size');
if (short.status === 'ok' && portrait.regions.navigation_rail.height > 467 && short.regions.navigation_rail.height < 465) {
  assert.equal(short.overflow.navigation_rail, 'scroll');
}

const left = resolve('portrait', { width: 390, height: 844 }, none, 'left');
assert.equal(left.status, 'ok');
close(left.regions.scanner.x, 15, 'left scanner.x');
close(left.regions.scanner.width, 60, 'left scanner.w');

const landLeft = resolve('landscape', { width: 844, height: 390 }, none, 'left');
close(landLeft.regions.navigation_rail.x, landscape.regions.navigation_rail.x, 'landscape ignores left geometry');

const safe = resolve('portrait', { width: 390, height: 844 }, { top: 50, right: 0, bottom: 0, left: 0 });
assert.ok(safe.regions.status_header.y >= 58, `header must clear top obstruction, got ${safe.regions.status_header.y}`);
close(safe.regions.canvas.x, 0, 'canvas untranslated');
close(safe.regions.border.x, 8, 'border still 8');

const large = resolve('portrait', { width: 430, height: 932 });
close(large.regions.scanner.width, 60, 'no scanner scale');
close(large.regions.status_header.width, 278, 'no header scale');
close(large.regions.border.x, 8, 'large border inset');
assert.ok(large.regions.viewport.height > portrait.regions.viewport.height, 'viewport absorbs extra height');

const poisoned = structuredClone(uiSpec.layouts.mobile.portrait);
(poisoned as { reference_regions: { scanner: { x: number } } }).reference_regions.scanner.x = 0;
const poisonResult = resolveHudLayout({
  window: { width: 390, height: 844 },
  obstructionInsets: none,
  family: { layout_policy: uiSpec.layouts.mobile.layout_policy, constraints: { scale_fixed_controls: false } },
  layout: poisoned,
  components: components('portrait'),
  handedness: 'right',
});
close(poisonResult.regions.scanner.x, 315, 'reference_regions must not drive placement');

const physicalPortrait = resolve('portrait', portraitHost, portraitObstruction);
close(physicalPortrait.regions.status_header.y, 74.0513, 'physical top obstruction plus existing safety buffer', 1e-6);
close(physicalPortrait.regions.canvas.y, 0, 'physical canvas remains untranslated');
close(physicalPortrait.regions.border.y, 8, 'physical border remains unchanged');

console.log('HUD resolver PASS: full-window regions, Figma scanner, mins, handedness, safe-area counted once, both stale-host rotations, no global scale');
