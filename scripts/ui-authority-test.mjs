/* File: ui-authority-test.mjs
 * Purpose: Independently compare captured Figma to YAML/assets (A), then generated parity (B).
 * Author: Codex; Contact: michael@mandedesign.studio; SPDX-License-Identifier: MPL-2.0
 * Decision: TASK-007 / DEV-2026-09-14-001. Never derive the Figma oracle from generated data. */
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { parse } from 'yaml';
import { validateChildBounds } from './ui-geometry-validation.mjs';
const source = JSON.parse(fs.readFileSync('scripts/fixtures/task007-figma.json', 'utf8'));
const base = 'src/ui/layouts/mobile/';
const read = path => parse(fs.readFileSync(base + path, 'utf8'));
const family = read('mobile.yaml').family;
const shared = Object.fromEntries(Object.entries(family.components.shared).map(([id, path]) => [id, read(path).component]));
function merge(a, b) {
  const out = { ...a };
  for (const [k, v] of Object.entries(b)) out[k] = v && typeof v === 'object' && !Array.isArray(v) ? merge(a?.[k], v) : v;
  return out;
}
function close(actual, expected, label) {
  assert.equal(actual.length, expected.length, label);
  actual.forEach((v, i) => assert(Math.abs(v - expected[i]) < 0.001, `${label}[${i}]: ${v} != ${expected[i]}`));
}
const rect = b => [b.x, b.y, b.width, b.height];
function svg(asset) { return fs.readFileSync(`assets/hud/${asset}.svg`, 'utf8'); }
// Normalize the M/L/H/V/Z subset used by audited paths to absolute vertices.
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
  overlays[o] = Object.fromEntries(Object.entries(family.components[o]).map(([id, path]) => [id, read(path).component]));
  const c = merge(shared, overlays[o]);
  close([layout.reference_viewport.width, layout.reference_viewport.height], source[o][0].b.slice(2), `${o} artboard`);
  for (const [id, region] of Object.entries(layout.regions)) {
    const n = source[o].find(n => n.name === id);
    assert(n, `Missing independently captured Figma node for ${id}`);
    if (o === 'portrait' && id === 'scanner' && region.x === 310 && region.y === 26) {
      assert.equal(region.visual_exception, 'DEV-2026-09-12-001', 'Scanner exception must be explicit');
      close(rect(region), [310, 26, 60, 82], 'accepted scanner exception');
    } else close(rect(region), n.b, `${o}.${id}`);
  }
  close(rect(layout.chrome.border), nodes[o === 'portrait' ? '2:27' : '96:115'].b, `${o} reference border`);
  close(rect(c.title_block.title), nodes[o === 'portrait' ? '3:28' : '96:41'].local, `${o} heading box`);
  close(rect(c.action_dock.bezelBounds), o === 'portrait' ? [0, 0, 350, 96] : nodes['96:83'].local, `${o} dock bezel`);
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
    ['96:54', '96:56', '96:58', '96:60'].forEach((id, i) => {
      const n = nodes[id], panel = layout.regions.viewport;
      close(rect(c.viewport.accents[i]), [n.b[0] - panel.x, n.b[1] - panel.y, ...n.b.slice(2)], `visible accent ${id}`);
      close(rect(c.viewport.accentExports[i]), [n.render[0] - panel.x, n.render[1] - panel.y, ...n.render.slice(2)], `render accent ${id}`);
      pathMatches(c.viewport.accents[i].asset, n);
    });
  }
}
close(rect(shared.scanner.core.visibleBounds), source.portrait.find(n => n.id === '3:18').local, 'core geometry');
const core = source.portrait.find(n => n.id === '3:18'), scanner = source.portrait.find(n => n.id === '2:22');
close(rect(shared.scanner.core.exportBounds), [core.render[0] - scanner.b[0], core.render[1] - scanner.b[1], ...core.render.slice(2)], 'glow envelope');
assert.throws(() => validateChildBounds({ width: 630, height: 299 }, { x: 20, y: 22, width: 630, height: 299 }, 'invalid content'), /outside parent/);
validateChildBounds({ width: 630, height: 299 }, { x: 20, y: 22, width: 590, height: 255 }, 'valid content');
validateChildBounds({ width: 13, height: 13 }, { x: -8, y: -8, width: 29, height: 29, overflow: 'export' }, 'explicit glow');
console.log('Gate A PASS: independent live Figma snapshot vs canonical YAML and corrected SVG paths; explicit scanner exception; invalid containment rejected.');
if (process.argv.includes('--generated')) {
  const { uiSpec } = await import('../src/ui/generated/uiSpec.ts');
  assert.deepEqual(uiSpec.components, shared);
  assert.deepEqual(uiSpec.orientationComponents, overlays);
  for (const o of ['portrait', 'landscape']) assert.deepEqual(uiSpec.layouts.mobile[o], layouts[o]);
  for (const key of ['selection', 'fitting', 'capabilities', 'orientations']) assert.deepEqual(uiSpec.layouts.mobile[key], family[key]);
  console.log('Gate B PASS: independently parsed YAML components, layouts, selection, fitting, capabilities equal generated values.');
}
