/* Purpose: Drive production useHudResolve with separately delivered layout/window measurements.
 * License: SPDX-License-Identifier: MPL-2.0 */
import React, { useEffect } from 'react';
import { HudLayoutProvider } from '../src/ui/ts_layout/HudLayoutContext';
import { useHudResolve } from '../src/ui/ts_layout/useHudResolve';
import { useHudViewport } from '../src/ui/ts_layout/useHudViewport';
import { uiSpec } from '../src/ui/generated/uiSpec';

function Probe() {
  const result = useHudResolve();
  useEffect(() => {
    globalThis.hudFixture.probeResult = { ready: result.ready, ...result.resolved };
    globalThis.hudFixture.measureHost = (layout, window, defer = false) => {
      result.ref.current = { measureInWindow(callback) {
        const deliver = () => callback(window.x, window.y, window.width, window.height);
        if (defer) globalThis.hudFixture.deliverOldMeasurement = deliver;
        else deliver();
      } };
      result.onLayout({ nativeEvent: { layout } });
    };
  }, [result]);
  return null;
}

export function CoordinateProbe() {
  const viewport = useHudViewport();
  return <HudLayoutProvider value={{ ...viewport, layout: uiSpec.layouts.mobile[viewport.orientation],
    handedness: 'right', capabilities: uiSpec.layouts.mobile.capabilities,
    regions: {}, overflow: {}, expandedDock: null, resolveStatus: 'pending' }}><Probe /></HudLayoutProvider>;
}


