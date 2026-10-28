/*
 * File: scripts/generate-ui.mjs
 * Purpose: Validate schema 3 YAML and emit native-safe constants/assets.
 * Author: Codex; Contact: michael@mandedesign.studio
 * License: SPDX-License-Identifier: MPL-2.0
 * Decision: DEV-2026-09-07-025; DEV-2026-09-14-005
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import assert from 'node:assert/strict';
import { parseDocument } from 'yaml';
import { validateYamlContract } from './ui-yaml-contract.mjs';
import { validateChildBounds } from './ui-geometry-validation.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const base = path.join(root, 'src/ui');
const { mobile, portrait, landscape, shared, overlays } = validateYamlContract();

function readAbs(filename) {
  assert(filename.startsWith(base + path.sep), `Manifest path escapes src/ui: ${filename}`);
  const relative = path.relative(base, filename);
  const document = parseDocument(fs.readFileSync(filename, 'utf8'));
  assert.equal(document.errors.length, 0, `${relative}: ${document.errors}`);
  return { data: document.toJS(), filename, relative };
}

function deepMerge(baseValue, overlay) {
  if (overlay === undefined) return baseValue;
  if (Array.isArray(overlay) || overlay === null || typeof overlay !== 'object') return overlay;
  if (baseValue === null || typeof baseValue !== 'object' || Array.isArray(baseValue)) return { ...overlay };
  const out = { ...baseValue };
  for (const [key, value] of Object.entries(overlay)) out[key] = deepMerge(baseValue[key], value);
  return out;
}

const theme = readAbs(path.join(base, 'theme.yaml')).data.theme;
const typography = readAbs(path.join(base, 'typography.yaml')).data.typography;
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

validate(shared);
validate(overlays.portrait);
validate(overlays.landscape);
validate(theme.effects);
validate(portrait);
validate(landscape);
assert.equal(mobile.fitting, undefined);
assert.equal(portrait.handedness.canonical, 'right');
assert.deepEqual(portrait.handedness.supported, ['right', 'left']);
assert.equal(landscape.handedness.preference, 'preserve_portrait');
assert.equal(overlays.landscape.action_dock.behavior.transition.type, 'assembled_slide');
assert.equal(overlays.landscape.action_dock.expanded_assembly.height, 121);

for (const [layout, overlay] of [[portrait, overlays.portrait], [landscape, overlays.landscape]]) {
  const viewport = deepMerge(shared.viewport, overlay.viewport);
  const rail = deepMerge(shared.navigation_rail, overlay.navigation_rail);
  const status = deepMerge(shared.status_header, overlay.status_header);
  const title = deepMerge(shared.title_block, overlay.title_block);
  const dock = deepMerge(shared.action_dock, overlay.action_dock);
  if (status.bezelVisible) validateChildBounds({ width: status.size.width, height: status.size.height }, status.bezelBounds, 'status bezel');
  validateChildBounds({ width: title.size.width?.preferred ?? title.size.width, height: title.size.height }, title.title, 'heading text box');
  validateChildBounds(rail.button, rail.assetBounds, 'rail asset');
  validateChildBounds(rail.menu.size, rail.menu.iconBounds, 'menu artwork');
  validateChildBounds(shared.scanner.size, shared.scanner.core.visibleBounds, 'scanner visible core');
  const bezel = dock.reference_geometry?.bezel_bounds ?? (dock.bezel_layout?.width ? { x: 0, y: 0, width: dock.bezel_layout.width, height: dock.bezel_layout.height } : null);
  if (bezel) validateChildBounds({ width: bezel.width, height: bezel.height }, { x: 0, y: 0, width: bezel.width, height: bezel.height }, 'dock bezel');
  assert(assets.has(rail.menu.icon));
  assert(assets.has(viewport.border));
  void layout;
}

Object.values(theme.colors).forEach(color => assert(/^#[\da-f]{6}$/i.test(color)));
for (const item of shared.action_dock.items) assert(assets.has(item.icon));
assert.deepEqual(shared.navigation_rail.contexts.home, ['graph', 'search', 'new']);
assert(!shared.navigation_rail.contexts.home.includes('log'));
assert.equal(shared.scanner.inner.direction, 'clockwise');
assert.equal(overlays.landscape.action_dock_handle.asset, 'action-dock-handle');
assert.equal(portrait.reference_regions.settings_menu.x, 315);
assert.equal(portrait.reference_regions.action_dock.y, 724);

for (const relative of ['layout', 'layouts']) {
  assert(!fs.existsSync(path.join(base, relative)), `Deprecated specification directory still present: src/ui/${relative}`);
}

const spec = {
  theme,
  typography,
  layouts: {
    mobile: {
      family: 'mobile',
      schema_version: 3,
      capabilities: mobile.capabilities,
      selection: mobile.selection,
      layout_policy: mobile.layout_policy,
      orientations: ['portrait', 'landscape'],
      portrait,
      landscape,
    },
    tablet: {
      family: 'tablet',
      status: 'unsupported',
      orientations: ['portrait', 'landscape'],
    },
  },
  components: shared,
  orientationComponents: {
    portrait: overlays.portrait,
    landscape: overlays.landscape,
  },
};

const header = '/* GENERATED by scripts/generate-ui.mjs from YAML/Figma SVGs. Do not edit.\n * Author: Codex; Contact: michael@mandedesign.studio; SPDX-License-Identifier: MPL-2.0\n * DEV-2026-09-07-025; DEV-2026-09-14-005 */\n';
const outputs = {
  'uiSpec.ts': header + `export const uiSpec = ${JSON.stringify(spec, null, 2)} as const;\n`,
  'hudAssets.ts': header + 'export const hudAssets = {\n' + names.map(p => `  '${p.slice(0, -4)}': require('../../../assets/hud/${p}'),`).join('\n') + '\n} as const;\nexport type HudAsset = keyof typeof hudAssets;\n',
};
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
console.log(`UI specification PASS: schema 3; ${assets.size} SVG assets; ${process.argv.includes('--validate-only') ? 'validated without generation' : process.argv.includes('--check') ? 'generation current' : 'generated'}`);
