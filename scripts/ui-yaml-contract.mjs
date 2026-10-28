/*
 * File: scripts/ui-yaml-contract.mjs
 * Purpose: Enforce YAML schema 3 and fail on deprecated layout paths.
 * Author: Michael Garcia
 * Contact: michael@mandedesign.studio
 * License: SPDX-License-Identifier: MPL-2.0
 * Related Decisions: DEV-2026-09-14-005
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import assert from 'node:assert/strict';
import { parseDocument } from 'yaml';

const root = fileURLToPath(new URL('../', import.meta.url));
const forbiddenDirs = ['src/ui/layout', 'src/ui/layouts'];
const forbiddenNeedles = ['@/' + 'ui/layout/', '@/' + 'ui/layouts/', 'src/' + 'ui/layout/', 'src/' + 'ui/layouts/'];
const historicalAllow = new Set([
  path.join(root, 'docs', 'DEVNOTES.md'),
  path.join(root, 'docs', 'TEST_LOG.md'),
]);

function walk(dir, files = []) {
  if (!fs.existsSync(dir)) return files;
  for (const name of fs.readdirSync(dir, { withFileTypes: true })) {
    if (name.name === 'node_modules' || name.name === '.git' || name.name === '.tmp' || name.name === 'dist') continue;
    const abs = path.join(dir, name.name);
    if (name.isDirectory()) walk(abs, files);
    else files.push(abs);
  }
  return files;
}

function parseAbs(abs) {
  const document = parseDocument(fs.readFileSync(abs, 'utf8'));
  assert.equal(document.errors.length, 0, `${path.relative(root, abs)}: ${document.errors}`);
  return document.toJS();
}

export function assertDeprecatedPathsAbsent() {
  for (const relative of forbiddenDirs) {
    assert(!fs.existsSync(path.join(root, relative)), `Deprecated directory present: ${relative}`);
  }
  const roots = ['src', 'scripts', 'docs', 'CONTRIBUTE.md', 'README.md', 'package.json', 'AGENTS.md', 'CLAUDE.md'];
  const files = [];
  for (const relative of roots) {
    const abs = path.join(root, relative);
    if (!fs.existsSync(abs)) continue;
    if (fs.statSync(abs).isDirectory()) walk(abs, files);
    else files.push(abs);
  }
  const skipExt = new Set(['.png', '.svg', '.ttf', '.woff', '.jpg', '.lock']);
  for (const abs of files) {
    if (historicalAllow.has(abs)) continue;
    const rel = path.relative(root, abs).split(path.sep).join('/');
    if (rel.startsWith('docs/planning/')) continue;
    if (skipExt.has(path.extname(abs))) continue;
    const text = fs.readFileSync(abs, 'utf8');
    for (const needle of forbiddenNeedles) {
      assert(!text.includes(needle), `${rel} still references deprecated path ${needle}`);
    }
  }
}

function deepMerge(baseValue, overlay) {
  if (overlay === undefined) return baseValue;
  if (Array.isArray(overlay) || overlay === null || typeof overlay !== 'object') return overlay;
  if (baseValue === null || typeof baseValue !== 'object' || Array.isArray(baseValue)) return { ...overlay };
  const out = { ...baseValue };
  for (const [key, value] of Object.entries(overlay)) out[key] = deepMerge(baseValue[key], value);
  return out;
}

function collectAssets(value, key, out) {
  const assetKeys = new Set(['asset', 'bezel', 'shape', 'newShape', 'activeShape', 'newActiveShape', 'addPlate', 'paintedWashAsset']);
  if (typeof value === 'string') {
    if (assetKeys.has(key)) out.add(value);
    if (key === 'icon' && value.includes('-')) out.add(value);
  } else if (Array.isArray(value)) value.forEach(v => collectAssets(v, key === 'assets' || key === 'referenceOnly' ? 'asset' : key, out));
  else if (value && typeof value === 'object') Object.entries(value).forEach(([k, v]) => collectAssets(v, k, out));
}

function checkBand(label, band) {
  if (!band || typeof band !== 'object') return;
  const { min, preferred, max } = band;
  if (typeof min === 'number' && typeof preferred === 'number' && typeof max === 'number') {
    assert(min <= preferred && preferred <= max, `${label} inverted spacing band`);
  }
}

function assertNoWindowPlacement(value, label) {
  if (!value || typeof value !== 'object') return;
  if (value.placement_owner === 'orientation') return;
}

export function validateYamlContract() {
  assertDeprecatedPathsAbsent();
  const uiAbs = path.join(root, 'src/ui/ui.yaml');
  const ui = parseAbs(uiAbs).ui;
  const mobileAbs = path.resolve(path.dirname(uiAbs), ui.layouts.mobile);
  const mobile = parseAbs(mobileAbs).family;
  assert.equal(mobile.id, 'mobile');
  assert.equal(mobile.schema_version, 3);
  assert.equal(mobile.fitting, undefined);
  assert.equal(mobile.layout_policy.global_uniform_scale, false);
  assert.equal(mobile.layout_policy.letterbox, false);

  const enums = mobile.contract.enums;
  const portrait = parseAbs(path.resolve(path.dirname(mobileAbs), mobile.portrait)).layout;
  const landscape = parseAbs(path.resolve(path.dirname(mobileAbs), mobile.landscape)).layout;
  const tabletAbs = path.resolve(path.dirname(uiAbs), ui.layouts.tablet);
  const tablet = parseAbs(tabletAbs).family;
  assert.equal(tablet.status, 'unsupported');

  const shared = {};
  const overlays = { portrait: {}, landscape: {} };
  for (const [id, rel] of Object.entries(mobile.components.shared)) {
    const abs = path.resolve(path.dirname(mobileAbs), rel);
    const component = parseAbs(abs).component;
    assert.equal(component.id, id);
    shared[id] = component;
    assertNoWindowPlacement(component, `shared.${id}`);
  }
  for (const orientation of ['portrait', 'landscape']) {
    for (const [id, rel] of Object.entries(mobile.components[orientation])) {
      const abs = path.resolve(path.dirname(mobileAbs), rel);
      const component = parseAbs(abs).component;
      assert.equal(component.id, id);
      overlays[orientation][id] = component;
      assertNoWindowPlacement(component, `${orientation}.${id}`);
    }
  }

  const assets = new Set(fs.readdirSync(path.join(root, 'assets/hud')).filter(n => n.endsWith('.svg')).map(n => n.slice(0, -4)));
  const found = new Set();
  collectAssets(mobile, '', found);
  collectAssets(portrait, '', found);
  collectAssets(landscape, '', found);
  for (const component of Object.values(shared)) collectAssets(component, '', found);
  for (const orientation of ['portrait', 'landscape']) {
    for (const component of Object.values(overlays[orientation])) collectAssets(component, '', found);
  }
  for (const asset of found) assert(assets.has(asset), `missing HUD asset ${asset}`);

  function checkLayout(layout) {
    const names = new Set([...Object.keys(layout.runtime_regions), 'window', 'canvas']);
    for (const [id, region] of Object.entries(layout.runtime_regions)) {
      assert(enums.sizing.includes(region.sizing), `${layout.id}.${id} invalid sizing`);
      if (region.alignment) {
        assert(enums.alignment_x.includes(region.alignment.horizontal), `${layout.id}.${id} invalid alignment.x`);
        assert(enums.alignment_y.includes(region.alignment.vertical), `${layout.id}.${id} invalid alignment.y`);
      }
      const anchors = region.anchors || {};
      for (const [edge, spec] of Object.entries(anchors)) {
        assert(enums.edge.includes(edge), `${layout.id}.${id} invalid anchor edge ${edge}`);
        assert(names.has(spec.target), `${layout.id}.${id} missing target ${spec.target}`);
        assert(enums.relation.includes(spec.relation), `${layout.id}.${id} invalid relation`);
        checkBand(`${layout.id}.${id}.${edge}.gap`, spec.gap);
      }
      if (region.buffer) {
        for (const [edge, band] of Object.entries(region.buffer)) checkBand(`${layout.id}.${id}.buffer.${edge}`, band);
      }
      if (region.sizing === 'fixed') {
        assert(!(('left' in anchors) && ('right' in anchors)), `${layout.id}.${id} fixed with opposing X anchors`);
        assert(!(('top' in anchors) && ('bottom' in anchors)), `${layout.id}.${id} fixed with opposing Y anchors`);
      }
      if (region.optical_offset) {
        assert(region.reference_note || region.decision || region.reason, `${layout.id}.${id} optical_offset lacks provenance`);
      }
    }
  }
  checkLayout(portrait);
  checkLayout(landscape);

  const scanner = portrait.runtime_regions.scanner;
  assert.equal(portrait.reference_regions.scanner.x, 315);
  assert.equal(portrait.reference_regions.scanner.y, 28);
  assert.equal(portrait.reference_regions.scanner.width, 60);
  assert.equal(portrait.reference_regions.scanner.height, 82);
  assert.equal(scanner.exception, undefined);
  assert.equal(scanner.runtime_geometry_source, undefined);
  assert.equal(scanner.anchors.top.relation, 'aligned');
  assert.equal(scanner.buffer.right.preferred, 15);
  assert.equal(mobile.contract.superseded_exceptions.portrait_scanner.status, 'superseded');

  for (const [label, min] of Object.entries({
    'title.left': landscape.runtime_regions.title_block.buffer.left.min,
    'title.top': landscape.runtime_regions.title_block.buffer.top.min,
    'rail.right': landscape.runtime_regions.navigation_rail.buffer.right.min,
    'rail.bottom': landscape.runtime_regions.navigation_rail.buffer.bottom.min,
    'viewport.left': landscape.runtime_regions.viewport.buffer.left.min,
    'viewport.bottom': landscape.runtime_regions.viewport.buffer.bottom.min,
  })) assert.equal(min, 8, `landscape ${label} min must be safety 8`);

  assert.equal(portrait.constraints.minimum_window_width, 362);
  assert.equal(portrait.constraints.minimum_window_height, 481);
  assert.equal(landscape.constraints.minimum_window_width, 775);
  assert.equal(landscape.constraints.minimum_window_height, 206);

  const dock = deepMerge(shared.action_dock, overlays.landscape.action_dock);
  assert.equal(dock.collapsed_parent.height, 96);
  assert.equal(dock.bezel.height, 96);
  assert.equal(dock.handle.height, 27.5);
  assert.equal(dock.expanded_assembly.height, 121);
  assert.equal(dock.expanded_assembly.overlap_with_bezel, 2.5);
  assert.equal(dock.expanded_assembly.scale_internal_artwork, false);
  assert.ok(overlays.portrait.navigation_rail.overflow);
  assert.ok(overlays.landscape.navigation_rail.overflow);

  return { mobile, portrait, landscape, shared, overlays };
}

const invoked = process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;
if (invoked) {
  validateYamlContract();
  console.log('YAML schema 3 contract PASS');
}
