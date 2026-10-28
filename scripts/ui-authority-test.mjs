/*
 * File: ui-authority-test.mjs
 * Purpose: Independently compare captured Figma to YAML/assets (A), then generated parity (B).
 * Author: Codex; Contact: michael@mandedesign.studio; SPDX-License-Identifier: MPL-2.0
 * Decision: TASK-007 / DEV-2026-09-14-005. Never derive the Figma oracle from generated data.
 */
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { parse } from 'yaml';
import { validateChildBounds } from './ui-geometry-validation.mjs';

const source = JSON.parse(fs.readFileSync('scripts/fixtures/task007-figma.json', 'utf8'));
const base = 'src/ui/yaml_layout/mobile/';
const read = relative => parse(fs.readFileSync(base + relative, 'utf8'));
const family = read('mobile.yaml').family;
const shared = Object.fromEntries(Object.entries(family.components.shared).map(([id, yamlPath]) => [id, read(yamlPath).component]));
function merge(a, b) {
  if (b === undefined) return a;
  if (Array.isArray(b) || b === null || typeof b !== 'object') return b;
  if (a === null || typeof a !== 'object' || Array.isArray(a)) return { ...b };
  const out = { ...a };
  for (const [k, v] of Object.entries(b)) out[k] = merge(a?.[k], v);
  return out;
}
function close(actual, expected, label) {
  assert.equal(actual.length, expected.length, label);
  actual.forEach((v, i) => assert(Math.abs(v - expected[i]) < 0.001, `${label}[${i}]: ${v} != ${expected[i]}`));
}
const rect = b => [b.x, b.y, b.width, b.height];
function svg(asset) { return fs.readFileSync(`assets/hud/${asset}.svg`, 'utf8'); }
function vertices(d) {
  const tokens = d.match(/[MLHVZ]|-?\d*\.?\d+(?:e[-+]?\d+)?/gi); const points = []; let x = 0, y = 0;
  while (tokens.length) {
    const c = tokens.shift();
    if (c === 'M' || c === 'L') { x = Number(tokens.shift()); y = Number(tokens.shift()); }
    else if (c === 'H') x = Number(tokens.shift());
    else if (c === 'V') y = Number(tokens.shift());
    else { assert.equal(c, 'Z'); continue; }
    points.push(x, y);
  }
  return points;
}
function pathMatches(asset, node, index = 0) {
  const paths = [...svg(asset).matchAll(/<path\b[^>]*\bd="([^"]+)"/g)];
  close(vertices(paths[index][1]), vertices(node.paths[0].data), `${asset} path ${node.id}`);
}

const layouts = {}, overlays = {};
for (const o of ['portrait', 'landscape']) {
  const nodes = Object.fromEntries(source[o].map(n => [n.id, n]));
  const layout = layouts[o] = read(`${o}.yaml`).layout;
  overlays[o] = Object.fromEntries(Object.entries(family.components[o]).map(([id, yamlPath]) => [id, read(yamlPath).component]));
  const c = merge(shared, overlays[o]);
  close([layout.reference_viewport.width, layout.reference_viewport.height], source[o][0].b.slice(2), `${o} artboard`);
  for (const [id, region] of Object.entries(layout.reference_regions)) {
    const n = source[o].find(node => node.name === id);
    assert(n, `Missing independently captured Figma node for ${id}`);
    close(rect(region), n.b, `${o}.${id}`);
  }
  if (o === 'portrait') close(rect(layout.reference_regions.scanner), [315, 28, 60, 82], 'figma scanner');
  close(rect(layout.reference_chrome.border), nodes[o === 'portrait' ? '2:27' : '96:115'].b, `${o} reference border`);
  close(rect(c.title_block.title), nodes[o === 'portrait' ? '3:28' : '96:41'].local, `${o} heading box`);
  const bezel = c.action_dock.reference_geometry?.bezel_bounds ?? { x: 0, y: 0, width: c.action_dock.bezel_layout.width, height: c.action_dock.bezel_layout.height };
  close([bezel.x ?? 0, bezel.y ?? 0, bezel.width, bezel.height], o === 'portrait' ? [0, 0, 350, 96] : nodes['96:83'].local, `${o} dock bezel`);
  assert.equal(c.status_header.bezelVisible, o === 'portrait');
  if (o === 'landscape') assert(!nodes['96:10'].children.includes('96:11'), 'Landscape status bezel reappeared in Figma');
  const menuId = o === 'portrait' ? '88:7' : '96:121';
  close(rect(c.navigation_rail.menu.iconBounds), [0, 0, ...nodes[menuId].b.slice(2)], `${o} menu artwork`);
  const menuSvg = svg(c.navigation_rail.menu.icon);
  const menuViewBox = menuSvg.match(/viewBox="([^"]+)"/)[1].split(' ').map(Number);
  close(menuViewBox, [0, 0, ...nodes[menuId].b.slice(2)], `${o} menu export canvas`);
  pathMatches(c.navigation_rail.menu.icon, nodes[o === 'portrait' ? '88:8' : '96:122']);
  const bars = [...menuSvg.matchAll(/<rect x="([^"]+)" y="([^"]+)" width="([^"]+)" height="([^"]+)"/g)];
  const barIds = o === 'portrait' ? ['88:9', '88:10', '88:11'] : ['96:123', '96:124', '96:125'];
  assert.equal(bars.length, 3);
  bars.forEach((b, i) => close(b.slice(1).map(Number), nodes[barIds[i]].local, `${o} menu bar ${i}`));
  for (const [key, id] of Object.entries(o === 'portrait' ? { graph: '42:24', search: '42:18', new: '42:7' } : { graph: '96:80', search: '96:73', new: '96:67' }))
    close(rect(c.navigation_rail.labelBounds[key]), nodes[id].local, `${o} ${key} text`);
  if (o === 'landscape') {
    close([c.navigation_rail.button.width, c.navigation_rail.button.height], nodes['96:62'].b.slice(2), 'NEW target');
    close(rect(c.navigation_rail.newAssetBounds), nodes['96:63'].local, 'NEW asset');
    pathMatches(c.viewport.border, nodes['96:51']);
    pathMatches(c.title_block.divider.asset, nodes['96:44']);
    pathMatches(c.title_block.divider.asset, nodes['96:45'], 1);
    assert(svg(c.title_block.divider.asset).includes('translate(0 3)'));
    assert(svg(c.title_block.divider.asset).includes('translate(0 15)'));
    const panel = layout.reference_regions.viewport;
    c.viewport.reference_geometry.accents.forEach((accent, i) => {
      const id = ['96:54', '96:56', '96:58', '96:60'][i];
      const n = nodes[id];
      close(rect(accent), [n.b[0] - panel.x, n.b[1] - panel.y, ...n.b.slice(2)], `visible accent ${id}`);
      pathMatches(accent.asset, n);
    });
    assert.equal(c.action_dock.expanded_assembly.height, 121);
    assert.equal(c.action_dock.expanded_assembly.overlap_with_bezel, 2.5);
  }
}
close(rect(shared.scanner.core.visibleBounds), source.portrait.find(n => n.id === '3:18').local, 'core geometry');
const core = source.portrait.find(n => n.id === '3:18'), scanner = source.portrait.find(n => n.id === '2:22');
close(rect(shared.scanner.core.exportBounds), [core.render[0] - scanner.b[0], core.render[1] - scanner.b[1], ...core.render.slice(2)], 'glow envelope');
assert.throws(() => validateChildBounds({ width: 630, height: 299 }, { x: 20, y: 22, width: 630, height: 299 }, 'invalid content'), /outside parent/);
validateChildBounds({ width: 630, height: 299 }, { x: 20, y: 22, width: 590, height: 255 }, 'valid content');
validateChildBounds({ width: 13, height: 13 }, { x: -8, y: -8, width: 29, height: 29, overflow: 'export' }, 'explicit glow');
console.log('Gate A PASS: independent live Figma snapshot vs canonical YAML; Figma scanner 315,28; schema 3 reference_regions.');
if (process.argv.includes('--generated')) {
  const { uiSpec } = await import('../src/ui/generated/uiSpec.ts');
  assert.deepEqual(uiSpec.components, shared);
  assert.deepEqual(uiSpec.orientationComponents, overlays);
  for (const o of ['portrait', 'landscape']) assert.deepEqual(uiSpec.layouts.mobile[o], layouts[o]);
  assert.equal(uiSpec.layouts.mobile.schema_version, 3);
  assert.equal(uiSpec.layouts.mobile.fitting, undefined);
  for (const key of ['selection', 'capabilities', 'orientations']) assert.deepEqual(uiSpec.layouts.mobile[key], family[key]);
  console.log('Gate B PASS: independently parsed YAML equals generated schema 3 values.');
}
