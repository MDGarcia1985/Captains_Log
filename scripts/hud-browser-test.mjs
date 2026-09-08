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
const require = createRequire(import.meta.url);
const playwrightPath = process.env.HUD_PLAYWRIGHT || 'playwright';
const { chromium } = require(playwrightPath);
const output = path.resolve('.tmp/hud-qa');
fs.mkdirSync(output, { recursive: true });
const fixture = path.resolve('scripts/hud-fixtures.jsx');
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
  browser = await chromium.launch({ headless: true, ...(process.env.HUD_BROWSER ? { executablePath: process.env.HUD_BROWSER } : {}) });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const errors = [];
  page.on('pageerror', e => { errors.push(e.message); console.error('Browser error:', e.message); });
  await page.goto(`http://127.0.0.1:${server.address().port}`);
  const button = name => page.getByRole('button', { name, exact: true });
  await button('NEW').waitFor();
  await page.evaluate(() => Promise.all([...document.images].map(image => image.decode())));
  await page.screenshot({ path: path.join(output, 'home.png') });
  const measurements = await button('NEW').boundingBox();
  assert.equal(measurements.width, 60); assert.equal(measurements.height, 135);
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
  await page.evaluate(() => { globalThis.hudFixture.pendingSave(); });
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
  await button('LOG').click();
  await button('HOME').click();
  await page.evaluate(() => globalThis.hudFixture.handedness('left'));
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
  await page.setViewportSize({ width: 360, height: 640 });
  await page.screenshot({ path: path.join(output, 'small-phone.png'), fullPage: true });
  assert.deepEqual(errors, []);
  fs.writeFileSync(path.join(output, 'motion-samples.json'), JSON.stringify(samples, null, 2));
  console.log('HUD browser T2 PASS: menu, dock, gallery intent, empty/failed/successful commit, discard, contextual rails, handedness, 12-second centered counter-rotation, reduced motion.');
} finally {
  if (browser) await browser.close();
  server.close();
}
