/*
 * File: generate-ui.mjs
 * Purpose: Validate canonical YAML and mechanically emit native-safe constants/assets.
 * Author: Codex; Contact: michael@mandedesign.studio
 * License: SPDX-License-Identifier: MPL-2.0
 * Decision: DEV-2026-09-07-025; DEV-2026-09-12-001
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import assert from 'node:assert/strict';
import { parseDocument } from 'yaml';
import { validateChildBounds, validateContent } from './ui-geometry-validation.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const base = path.join(root, 'src/ui');

function readAbs(filename) {
  assert(filename.startsWith(base + path.sep), `Manifest path escapes src/ui: ${filename}`);
  const relative = path.relative(base, filename);
  const document = parseDocument(fs.readFileSync(filename, 'utf8'));
  assert.equal(document.errors.length, 0, `${relative}: ${document.errors}`);
  return { data: document.toJS(), filename, relative };
}

function readRel(fromFile, relative) {
  return readAbs(path.resolve(path.dirname(fromFile), relative));
}

function deepMerge(baseValue, overlay) {
  if (overlay === undefined) return baseValue;
  if (Array.isArray(overlay) || overlay === null || typeof overlay !== 'object') return overlay;
  if (baseValue === null || typeof baseValue !== 'object' || Array.isArray(baseValue)) return { ...overlay };
  const out = { ...baseValue };
  for (const [key, value] of Object.entries(overlay)) out[key] = deepMerge(baseValue[key], value);
  return out;
}

function loadComponents(familyFile, mapping) {
  const loaded = {};
  for (const [id, relative] of Object.entries(mapping || {})) {
    const { data, relative: fromRoot } = readRel(familyFile, relative);
    assert.equal(data.component.id, id, `Component id mismatch: ${fromRoot}`);
    loaded[id] = data.component;
  }
  return loaded;
}

const manifestFile = path.join(base, 'ui.yaml');
const manifest = readAbs(manifestFile).data.ui;
assert.equal(manifest.version, 1);

const theme = readRel(manifestFile, manifest.theme).data.theme;
const typography = readRel(manifestFile, manifest.typography).data.typography;

const mobileFile = readRel(manifestFile, manifest.layouts.mobile);
const mobileFamily = mobileFile.data.family;
assert.equal(mobileFamily.id, 'mobile');
for (const key of ['shellCommands', 'entityPane', 'captureAutoFocus', 'returnHomeAfterCapture']) {
  assert.equal(typeof mobileFamily.capabilities[key], 'boolean', `Missing mobile capability: ${key}`);
}
assert.deepEqual(mobileFamily.orientations, ['portrait', 'landscape']);
assert([null, 'portrait', 'landscape'].includes(mobileFamily.selection.override));
assert(mobileFamily.orientations.includes(mobileFamily.selection.square));
assert.equal(mobileFamily.selection.native_source, 'screen');
assert.equal(mobileFamily.selection.web_source, 'window');
assert.equal(mobileFamily.selection.fallback, 'authorized_mobile_orientation');
assert.deepEqual(mobileFamily.fitting, { scale: 'uniform_contain', safe_area: 'system', border_inset: 8,
  border_space: 'phone', letterbox: 'centered_unfilled_axis' });

const portraitLayout = readRel(mobileFile.filename, mobileFamily.portrait).data.layout;
const landscapeLayout = readRel(mobileFile.filename, mobileFamily.landscape).data.layout;
assert.equal(portraitLayout.id, 'mobile_portrait');
assert.equal(landscapeLayout.id, 'mobile_landscape');
assert.notEqual(portraitLayout.id, landscapeLayout.id);

const tabletFile = readRel(manifestFile, manifest.layouts.tablet);
const tabletFamily = tabletFile.data.family;
assert.equal(tabletFamily.id, 'tablet');
assert.equal(tabletFamily.status, 'unsupported');
const tabletPortrait = readRel(tabletFile.filename, tabletFamily.portrait).data.layout;
const tabletLandscape = readRel(tabletFile.filename, tabletFamily.landscape).data.layout;
assert.equal(tabletPortrait.status, 'unsupported');
assert.equal(tabletLandscape.status, 'unsupported');
assert.equal(tabletPortrait.regions, undefined);
assert.equal(tabletLandscape.regions, undefined);

const shared = loadComponents(mobileFile.filename, mobileFamily.components.shared);
const portraitComponents = loadComponents(mobileFile.filename, mobileFamily.components.portrait);
const landscapeComponents = loadComponents(mobileFile.filename, mobileFamily.components.landscape);

const names = fs.readdirSync(path.join(root, 'assets/hud')).filter(p => p.endsWith('.svg')).sort();
const assets = new Set(names.map(p => p.slice(0, -4)));

function validate(value, key = '') {
  if (typeof value === 'string') {
    assert(!value.includes('TODO') && !value.includes('{theme'), `Unresolved ${value}`);
    if (['asset', 'bezel', 'shape', 'newShape', 'activeShape', 'newActiveShape', 'addPlate', 'paintedWashAsset'].includes(key)) {
      assert(assets.has(value), `Missing SVG: ${value}`);
    }
    if (['color', 'activeColor', 'newColor', 'addColor', 'surface'].includes(key)) {
      assert(value in theme.colors, `Unknown color: ${value}`);
    }
    if (key === 'typography') assert(value in typography.styles);
  } else if (Array.isArray(value)) {
    value.forEach(v => validate(v, key === 'assets' || key === 'referenceOnly' ? 'asset' : key));
  } else if (value && typeof value === 'object') {
    Object.entries(value).forEach(([k, v]) => validate(v, k));
  }
}

function validateLayout(layout) {
  const { width, height } = layout.reference_viewport;
  for (const [id, region] of Object.entries(layout.regions)) {
    assert(region.width > 0 && region.height > 0 && region.x >= 0 && region.y >= 0, id);
    assert(region.x + region.width <= width + 0.001 && region.y + region.height <= height + 0.001, `${id} outside ${layout.id} bounds`);
    if (region.component) {
      const exists = region.component in shared || region.component in portraitComponents || region.component in landscapeComponents;
      assert(exists, `${layout.id} region ${id} references missing component ${region.component}`);
    }
  }
  validate(layout);
}

validate(shared);
validate(portraitComponents);
validate(landscapeComponents);
validate(theme.effects);
validateLayout(portraitLayout);
validateLayout(deepMerge(portraitLayout, portraitLayout.left_handed));
validateLayout(landscapeLayout);
assert.deepEqual(portraitLayout.handedness, { canonical: 'right', supported: ['right', 'left'], preference: 'editable' });
assert.deepEqual(landscapeLayout.handedness, { canonical: 'right', supported: ['right'], preference: 'preserve_portrait' });
assert.deepEqual(landscapeComponents.action_dock.behavior.transition, { type: 'assembled_slide', duration_ms: 240,
  easing: 'cubic_out', handle_anchor: 'above_bezel_top', clip_boundary: 'collapsed_handle_bottom' });
for (const [layout, overlay] of [[portraitLayout, portraitComponents], [landscapeLayout, landscapeComponents]]) {
  const viewport = deepMerge(shared.viewport, overlay.viewport);
  validateContent(layout.regions.viewport, viewport.content, `${layout.id}.viewport.content`);
  for (const a of viewport.accents) validateChildBounds(layout.regions.viewport, a, a.asset);
  for (const a of viewport.accentExports || []) validateChildBounds(layout.regions.viewport, a, 'accent export');
  const dock = deepMerge(shared.action_dock, overlay.action_dock);
  validateChildBounds(layout.regions.action_dock, dock.bezelBounds, 'dock bezel');
  const rail = deepMerge(shared.navigation_rail, overlay.navigation_rail);
  validateChildBounds(layout.regions.settings_menu, rail.menu.iconBounds, 'menu artwork');
  for (const a of [rail.assetBounds, rail.newAssetBounds, ...Object.values(rail.labelBounds)]) validateChildBounds(rail.button, a, 'rail child');
  assert(assets.has(rail.menu.icon)); assert(assets.has(viewport.border));
  const status = deepMerge(shared.status_header, overlay.status_header);
  if (status.bezelVisible) validateChildBounds(layout.regions.status_header, status.bezelBounds, 'status bezel');
  const title = deepMerge(shared.title_block, overlay.title_block);
  validateChildBounds(layout.regions.title_block, title.title, 'heading text box');
  validateChildBounds(layout.regions.title_block, title.divider, 'title divider');
  validateChildBounds(layout.regions.scanner, shared.scanner.core.visibleBounds, 'scanner visible core');
  validateChildBounds(layout.regions.scanner, shared.scanner.core.exportBounds, 'scanner glow export');
}
Object.values(theme.colors).forEach(color => assert(/^#[\da-f]{6}$/i.test(color)));
for (const item of shared.action_dock.items) assert(assets.has(item.icon));
assert(assets.has(shared.navigation_rail.menu.icon));
assert(assets.has(shared.viewport.border));
assert.deepEqual(shared.navigation_rail.contexts.home, ['graph', 'search', 'new']);
assert(!shared.navigation_rail.contexts.home.includes('log'));
assert.deepEqual(shared.navigation_rail.contexts.capture, ['commit', 'cancel']);
assert.equal(shared.scanner.inner.direction, 'clockwise');
assert.equal(shared.scanner.outer.direction, 'counterclockwise');
assert.equal(landscapeLayout.regions.action_dock.behavior.default_visibility, 'collapsed');
assert.equal(landscapeLayout.regions.action_dock_handle.controls, 'action_dock');
assert.equal(landscapeComponents.action_dock_handle.asset, 'action-dock-handle');
assert.equal(portraitLayout.regions.settings_menu.x, 315);
assert.equal(portraitLayout.regions.action_dock.y, 724);
assert(!('log' in (landscapeLayout.regions.navigation_rail || {})));

const obsolete = [
  'layout/mobile.yaml',
  'components/status-header.yaml',
  'components/scanner.yaml',
  'components/title_block.yaml',
  'components/viewports.yaml',
  'components/navigation-rail.yaml',
  'components/action-dock.yaml',
];
for (const relative of obsolete) {
  assert(!fs.existsSync(path.join(base, relative)), `Obsolete specification still present: ${relative}`);
}

const spec = {
  theme,
  typography,
  layouts: {
    mobile: {
      family: 'mobile',
      capabilities: mobileFamily.capabilities,
      selection: mobileFamily.selection,
      fitting: mobileFamily.fitting,
      orientations: ['portrait', 'landscape'],
      portrait: portraitLayout,
      landscape: landscapeLayout,
    },
    tablet: {
      family: 'tablet',
      status: 'unsupported',
      orientations: ['portrait', 'landscape'],
    },
  },
  components: shared,
  orientationComponents: {
    portrait: portraitComponents,
    landscape: landscapeComponents,
  },
};

const header = '/* GENERATED by scripts/generate-ui.mjs from YAML/Figma SVGs. Do not edit.\n * Author: Codex; Contact: michael@mandedesign.studio; SPDX-License-Identifier: MPL-2.0\n * DEV-2026-09-07-025; DEV-2026-09-12-001 */\n';
const outputs = {
  'uiSpec.ts': header + `export const uiSpec = ${JSON.stringify(spec, null, 2)} as const;\n`,
  'hudAssets.ts': header + 'export const hudAssets = {\n' + names.map(p => `  '${p.slice(0, -4)}': require('../../../assets/hud/${p}'),`).join('\n') + '\n} as const;\nexport type HudAsset = keyof typeof hudAssets;\n',
};
// Generation cannot turn visually divergent YAML into a new runtime authority.
if (!process.argv.includes('--check') && !process.argv.includes('--validate-only')) {
  execFileSync(process.execPath, [path.join(root, 'scripts/ui-authority-test.mjs')], { cwd: root, stdio: 'inherit' });
}
for (const [name, contents] of Object.entries(outputs)) {
  if (process.argv.includes('--validate-only')) continue;
  const target = path.join(base, 'generated', name);
  if (process.argv.includes('--check')) {
    assert.equal(fs.readFileSync(target, 'utf8'), contents, `Stale generated file: ${name}`);
  } else {
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, contents);
  }
}
const yamlCount = 3 + 3 + 3 + Object.keys(shared).length + Object.keys(portraitComponents).length + Object.keys(landscapeComponents).length;
console.log(`UI specification PASS: ${yamlCount} YAML files, ${assets.size} SVG assets; ${process.argv.includes('--validate-only') ? 'validated without generation' : process.argv.includes('--check') ? 'generation current' : 'generated'}`);
