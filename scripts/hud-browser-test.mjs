/* File: hud-browser-test.mjs
 * Purpose: Bundle an isolated HUD harness and verify actual rendered screen interactions.
 * Author: Codex; Contact: michael@mandedesign.studio
 * License: SPDX-License-Identifier: MPL-2.0; DEV-2026-09-07-025
 * Workflow: node scripts/hud-browser-test.mjs; no production services are imported.
 * Data Handoff: Screenshots and test results in ignored .tmp/hud-qa. */
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { build } from 'esbuild';
import { parse } from 'yaml';
const require = createRequire(import.meta.url);
const playwrightPath = process.env.HUD_PLAYWRIGHT || 'playwright';
const { chromium } = require(playwrightPath);
const output = path.resolve('.tmp/hud-qa');
fs.mkdirSync(output, { recursive: true });
const fixture = path.resolve('scripts/hud-fixtures.jsx');
const layouts = Object.fromEntries(['portrait', 'landscape'].map(orientation => [orientation,
  parse(fs.readFileSync(`src/ui/layouts/mobile/${orientation}.yaml`, 'utf8')).layout,
]));
await build({
  entryPoints: ['scripts/hud-harness.jsx'], outfile: path.join(output, 'harness.js'), bundle: true,
  jsx: 'automatic', platform: 'browser', define: { 'process.env.NODE_ENV': '"development"', __DEV__: 'true', global: 'globalThis' },
  loader: { '.svg': 'dataurl', '.ttf': 'dataurl' },
  alias: { 'react-native': 'react-native-web' },
  plugins: [{ name: 'test-platform-boundaries', setup(builder) {
    builder.onResolve({ filter: /^(expo-router|expo-image|expo-font|expo-status-bar|react-native-safe-area-context|@\/services\/AppServicesProvider)$/ }, () => ({ path: fixture }));
  } }],
});
const server = http.createServer((request, response) => {
  if (request.url === '/harness.js') {
    response.setHeader('Content-Type', 'text/javascript');
    fs.createReadStream(path.join(output, 'harness.js')).pipe(response);
  } else {
    response.setHeader('Content-Type', 'text/html');
    response.end('<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"><style>html,body,#root{margin:0;height:100%;background:#070B12}#root{display:flex}*{box-sizing:border-box}</style></head><body><div id="root"></div><script src="/harness.js"></script></body></html>');
  }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
let browser;
try {
  browser = await chromium.launch({ headless: true, ...(process.env.HUD_BROWSER
    ? { executablePath: process.env.HUD_BROWSER }
    : fs.existsSync(chromium.executablePath()) ? {} : { channel: 'chrome' }) });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const errors = [];
  page.on('pageerror', e => { errors.push(e.message); console.error('Browser error:', e.message); });
  await page.goto(`http://127.0.0.1:${server.address().port}`);
  const button = name => page.getByRole('button', { name, exact: true });
  async function checkGeometry(size, { leftHanded = false, dockVisible = false, insets = { top: 0, right: 0, bottom: 0, left: 0 } } = {}) {
    await page.setViewportSize(size);
    const orientation = size.width >= size.height ? 'landscape' : 'portrait';
    const layout = layouts[orientation];
    const art = layout.reference_viewport;
    const scale = Math.min((size.width - insets.left - insets.right) / art.width, (size.height - insets.top - insets.bottom) / art.height, 1);
    const origin = { x: insets.left + (size.width - insets.left - insets.right - art.width * scale) / 2,
      y: insets.top + (size.height - insets.top - insets.bottom - art.height * scale) / 2 };
    await page.waitForFunction(({ orientation, origin, width }) => {
      const hud = document.querySelector('[data-testid="mobile-hud"]');
      const rect = hud?.getBoundingClientRect();
      return hud?.id === orientation && Math.abs(rect.x - origin.x) < 0.2 && Math.abs(rect.y - origin.y) < 0.2 && Math.abs(rect.width - width) < 0.2;
    }, { orientation, origin, width: art.width * scale });
    const regions = { ...layout.regions };
    if (leftHanded && layout.left_handed) {
      for (const [key, override] of Object.entries(layout.left_handed.regions)) regions[key] = { ...regions[key], ...override };
    }
    const targets = [
      [page.getByTestId('hud-viewport'), regions.viewport],
      [page.getByTestId('status-header'), regions.status_header],
      [page.getByTestId('hud-title'), regions.title_block],
      [page.getByTestId('hud-scanner'), regions.scanner],
      [page.locator('[data-testid^="rail-"]'), regions.navigation_rail],
      [button('Settings and more options'), regions.settings_menu],
    ];
    if (orientation === 'portrait' || dockVisible) targets.push([page.getByTestId('action-dock'), regions.action_dock]);
    if (orientation === 'landscape') targets.push([button('Action dock handle'), regions.action_dock_handle]);
    for (const [target, region] of targets) {
      const actual = await target.boundingBox();
      const expected = { x: origin.x + region.x * scale, y: origin.y + region.y * scale, width: region.width * scale, height: region.height * scale };
      for (const key of ['x', 'y', 'width', 'height']) assert(Math.abs(actual[key] - expected[key]) < 0.2, `${orientation} ${await target.getAttribute('data-testid')} ${key}: ${actual[key]} != ${expected[key]}`);
    }
    assert.equal(await page.getByText('LOCAL ARCHIVE', { exact: true }).count(), 0);
    assert.equal(await button('LOG').count(), 0);
  }
  await button('NEW').waitFor();
  await checkGeometry({ width: 390, height: 844 });
  await page.evaluate(() => Promise.all([...document.images].map(image => image.decode())));
  await page.screenshot({ path: path.join(output, 'home.png') });
  const measurements = await button('NEW').boundingBox();
  assert.equal(measurements.width, 60); assert.equal(measurements.height, 155);
  assert.equal(await button('LOG').count(), 0);
  assert.equal(await button('GALLERY').count(), 0);
  await button('EXPORT').click();
  await page.getByText(/No file has been created or shared/).waitFor();
  await button('Close').click();
  await button('Settings and more options').click();
  await button('Settings').click();
  await button('HOME').click();
  await button('ADD').click();
  await button('Gallery').click();
  await button('COMMIT').waitFor();
  assert.equal(await page.evaluate(() => globalThis.hudFixture.calls.filter(x => x[0] === 'gallery').length), 1);
  assert.equal(await button('NEW').count(), 0);
  await button('COMMIT').click();
  assert.equal(await page.evaluate(() => globalThis.hudFixture.calls.filter(x => x[0] === 'createEntry').length), 0);
  await page.getByRole('textbox', { name: 'Log entry' }).fill('HUD test draft');
  await button('CANCEL').click();
  await button('Keep editing').click();
  await page.getByText('Discard this unsaved record?', { exact: true }).waitFor({ state: 'hidden' });
  assert.equal(await page.getByRole('textbox', { name: 'Log entry' }).inputValue(), 'HUD test draft');
  await page.evaluate(() => { globalThis.hudFixture.failSave = true; });
  await button('COMMIT').click();
  await page.getByText('SIMULATED SAVE FAILURE', { exact: true }).waitFor();
  assert.equal(await page.getByRole('textbox', { name: 'Log entry' }).inputValue(), 'HUD test draft');
  await page.screenshot({ path: path.join(output, 'capture-failed-save.png') });
  await page.evaluate(() => { globalThis.hudFixture.failSave = false; globalThis.hudFixture.holdSave = true; });
  await button('COMMIT').click();
  await page.waitForFunction(() => document.querySelector('[aria-label="COMMIT"]')?.getAttribute('aria-disabled') === 'true');
  assert.equal(await button('COMMIT').getAttribute('aria-disabled'), 'true');
  assert.equal(await page.evaluate(() => globalThis.hudFixture.calls.filter(x => x[0] === 'createEntry').length), 2);
  await page.evaluate(() => { globalThis.hudFixture.holdSave = false; globalThis.hudFixture.pendingSave(); });
  await button('NEW').waitFor();
  assert.equal(await page.evaluate(() => globalThis.hudFixture.entries.length), 1);
  await page.getByText('LOCAL ONLY', { exact: true }).waitFor();
  await button('NEW').click();
  await page.getByRole('textbox', { name: 'Log entry' }).fill('Discard only this test draft');
  await button('CANCEL').click();
  await button('Discard record').click();
  await button('SEARCH').click();
  await page.getByPlaceholder('Search log text and entities').fill('needle');
  await button('CLEAR').click();
  assert.equal(await page.getByPlaceholder('Search log text and entities').inputValue(), '');
  await button('HOME').click();
  await button('GRAPH').click();
  await button('RESET').click();
  await button('HOME').click();
  assert.equal(await button('LOG').count(), 0);
  await page.evaluate(() => globalThis.hudFixture.handedness('left'));
  await checkGeometry({ width: 390, height: 844 }, { leftHanded: true });
  assert.equal(Math.round((await button('NEW').boundingBox()).x), 15);
  await page.screenshot({ path: path.join(output, 'left-handed.png') });
  await page.evaluate(() => globalThis.hudFixture.handedness('right'));
  // Sample a full loop: both centers stay fixed, directions remain opposite.
  const samples = [];
  for (let i = 0; i < 12; i++) {
    samples.push(await page.evaluate(() => ['scanner-inner-pivot', 'scanner-outer-pivot'].map(id => {
      const element = document.querySelector(`[data-testid="${id}"]`);
      const r = element.getBoundingClientRect(); const m = new DOMMatrix(getComputedStyle(element).transform);
      return { x: r.x + r.width / 2, y: r.y + r.height / 2, angle: Math.atan2(m.b, m.a) };
    })));
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  for (const [inner, outer] of samples) {
    assert(Math.abs(inner.x - 340) < 0.1 && Math.abs(inner.y - 64) < 0.1);
    assert(Math.abs(outer.x - inner.x) < 0.1 && Math.abs(outer.y - inner.y) < 0.1);
    assert(Math.abs(inner.angle + outer.angle) < 0.05);
  }
  assert(samples.some(pair => Math.abs(pair[0].angle - samples[0][0].angle) > 1));
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await new Promise(resolve => setTimeout(resolve, 100));
  assert.deepEqual(errors, []);
  await page.screenshot({ path: path.join(output, 'reduced-motion.png') });
  const frozen = await page.getByTestId('scanner-inner-pivot').evaluate(el => getComputedStyle(el).transform);
  await new Promise(resolve => setTimeout(resolve, 200));
  assert.equal(await page.getByTestId('scanner-inner-pivot').evaluate(el => getComputedStyle(el).transform), frozen);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.setViewportSize({ width: 844, height: 390 });
  await button('Action dock handle').waitFor();
  await page.screenshot({ path: path.join(output, 'landscape-collapsed.png') });
  assert.equal(await button('ADD').count(), 0);
  assert.equal(await button('LOG').count(), 0);
  assert.equal(await button('GRAPH').count(), 1);
  assert.equal(await button('SEARCH').count(), 1);
  assert.equal(await button('NEW').count(), 1);
  const landscapeNew = await button('NEW').boundingBox();
  assert.equal(Math.round(landscapeNew.width), 155); assert.equal(Math.round(landscapeNew.height), 55);
  await button('Action dock handle').click();
  await button('ADD').waitFor();
  await page.screenshot({ path: path.join(output, 'landscape-expanded.png') });
  await checkGeometry({ width: 844, height: 390 }, { dockVisible: true });
  // The visible dock artwork itself must fill the YAML region, not a 350x96 portrait box.
  const dockBox = await page.getByTestId('action-dock').boundingBox();
  const bezelBox = await page.getByTestId('action-dock').locator('img').first().boundingBox();
  assert(Math.abs(dockBox.width - bezelBox.width) < 0.2 && Math.abs(dockBox.height - bezelBox.height) < 0.2);
  await button('Action dock handle').click();
  await page.waitForFunction(() => [...document.querySelectorAll('[aria-label="ADD"]')].length === 0);
  assert.equal(await button('ADD').count(), 0);
  await button('NEW').click();
  await page.getByRole('textbox', { name: 'Log entry' }).fill('Landscape rotation draft');
  await page.evaluate(() => { globalThis.rotationInput = document.querySelector('[aria-label="Log entry"]'); });
  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(await page.getByRole('textbox', { name: 'Log entry' }).inputValue(), 'Landscape rotation draft');
  await button('COMMIT').waitFor();
  assert.equal(await button('Action dock handle').count(), 0);
  await button('ADD').waitFor();
  // Exercise AppShell at both old breakpoints, tablet sizes, and unusual ratios.
  for (const size of [
    { width: 599, height: 390 }, { width: 600, height: 390 }, { width: 601, height: 390 },
    { width: 899, height: 390 }, { width: 900, height: 390 }, { width: 901, height: 390 },
    { width: 599, height: 1000 }, { width: 600, height: 1000 }, { width: 900, height: 1200 },
    { width: 1024, height: 1366 }, { width: 1366, height: 1024 }, { width: 1200, height: 320 },
    { width: 320, height: 900 }, { width: 390, height: 844 },
  ]) {
    await checkGeometry(size);
    assert.equal(await page.getByRole('textbox', { name: 'Log entry' }).inputValue(), 'Landscape rotation draft');
    assert.equal(await page.evaluate(() => globalThis.rotationInput === document.querySelector('[aria-label="Log entry"]')), true, 'Rotation remounted the capture input');
    assert.equal(await button('Commit Log').count(), 0, 'Width enabled duplicate screen controls');
  }
  await checkGeometry({ width: 1024, height: 1366 });
  await page.screenshot({ path: path.join(output, 'tablet-portrait-buffer.png') });
  await checkGeometry({ width: 1366, height: 1024 });
  await page.screenshot({ path: path.join(output, 'tablet-landscape-buffer.png') });
  const insets = { top: 24, right: 12, bottom: 21, left: 44 };
  await page.evaluate(insets => globalThis.hudFixture.setInsets(insets), insets);
  await checkGeometry({ width: 844, height: 390 }, { insets });
  await checkGeometry({ width: 390, height: 844 }, { insets });
  await page.evaluate(() => globalThis.hudFixture.setInsets({ top: 0, right: 0, bottom: 0, left: 0 }));
  await checkGeometry({ width: 844, height: 390 });
  await page.evaluate(() => { globalThis.hudFixture.entities = [{ id: 'layout-test', name: 'Layout Entity', type: 'project' }]; });
  await button('COMMIT').click();
  await button('NEW').waitFor();
  for (const size of [{ width: 844, height: 390 }, { width: 390, height: 844 }]) {
    await checkGeometry(size);
    await page.getByText('project:Layout Entity', { exact: true }).first().click();
    await page.waitForFunction(() => globalThis.hudFixture.path === '/entity/layout-test');
    await button('HOME').click();
    await button('SEARCH').click();
    await page.getByPlaceholder('Search log text and entities').fill('Layout');
    await page.getByText('project / Layout Entity', { exact: true }).click();
    await page.waitForFunction(() => globalThis.hudFixture.path === '/entity/layout-test');
    await button('HOME').click();
    await button('GRAPH').click();
    await page.getByText('project / Layout Entity', { exact: true }).click();
    await page.waitForFunction(() => globalThis.hudFixture.path === '/entity/layout-test');
    await button('HOME').click();
  }
  await checkGeometry({ width: 360, height: 640 });
  await page.screenshot({ path: path.join(output, 'small-phone.png'), fullPage: true });
  assert.deepEqual(errors, []);
  fs.writeFileSync(path.join(output, 'motion-samples.json'), JSON.stringify(samples, null, 2));
  console.log('HUD browser T2 PASS: AppShell rotation, YAML geometry, breakpoint/tablet buffers, safe areas, mounted draft preservation, landscape commit, entity routes, menu/dock/actions, handedness, scanner motion, reduced motion.');
} finally {
  if (browser) await browser.close();
  server.close();
}
