/* Purpose: Regress provider-local obstructions and asynchronous rotation using the production hook.
 * License: SPDX-License-Identifier: MPL-2.0 */
export async function checkHudCoordinates(browser, url) {
  const page = await browser.newPage({ viewport: { width: 430, height: 932 } });
  try {
    await page.goto(`${url}?coordinateProbe`);
    await page.waitForFunction(() => !!globalThis.hudFixture.measureHost);
    const portrait = { x: 0, y: 0, width: 430, height: 932 };
    const landscape = { x: 0, y: 0, width: 932, height: 430 };
    async function measure(local, raw, insets, defer = false) {
      await page.evaluate(({ local, raw, insets, defer }) => {
        globalThis.hudFixture.setInsets(insets);
        globalThis.hudFixture.measureHost(local, raw, defer);
      }, { local, raw, insets, defer });
      await page.waitForFunction(() => globalThis.hudFixture.probeResult.ready);
    }
    const portraitInsets = { top: 66.0513, left: 0, right: 0, bottom: 24.2051 };
    const landscapeInsets = { top: 24.2051, left: 66.0513, right: 24.2051, bottom: 0 };
    await measure(portrait, { ...portrait, y: -66.0513 }, portraitInsets, true);
    await page.waitForFunction(() => Math.abs(globalThis.hudFixture.probeResult.regions.status_header.y - 74.0513) < 1e-6);
    for (const [local, insets, raw] of [
      [landscape, landscapeInsets, { ...landscape, x: -66.0513, y: -24.2051 }],
      [portrait, portraitInsets, { ...portrait, y: -66.0513 }],
    ]) {
      await page.setViewportSize({ width: local.width, height: local.height });
      await page.waitForFunction(() => {
        const result = globalThis.hudFixture.probeResult;
        return !result.ready && result.status === 'pending' && Object.keys(result.regions).length === 0;
      });
      await measure(local, raw, insets);
      // Late old-orientation callbacks cannot replace the current canvas.
      await page.evaluate(() => globalThis.hudFixture.deliverOldMeasurement());
      await page.waitForFunction(({ width, height, top }) => {
        const result = globalThis.hudFixture.probeResult;
        return result.ready && result.regions.canvas.width === width && result.regions.canvas.height === height
          && Math.abs(result.regions.status_header.y - (top + 8 + (width > height ? 5 : 0))) < 1e-6;
      }, { ...local, top: insets.top });
      if (local.width > local.height) await page.waitForFunction(() =>
        Math.abs(globalThis.hudFixture.probeResult.regions.title_block.x - 74.0513) < 1e-6);
    }
    console.log('HUD coordinate hook PASS: negative window offsets counted once; both stale-host transitions pending; delayed callbacks ignored');
  } finally { await page.close(); }
}

