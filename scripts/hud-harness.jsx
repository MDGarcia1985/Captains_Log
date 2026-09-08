/* File: hud-harness.jsx
 * Purpose: Render production HUD/screens with isolated service doubles for T2/visual QA.
 * Author: Codex; Contact: michael@mandedesign.studio
 * License: SPDX-License-Identifier: MPL-2.0; DEV-2026-09-07-025 */
import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { View } from 'react-native-web';
import { RouterContext } from './hud-fixtures';
import { HudShell } from '../src/ui/layout/HudShell';
import { CaptureScreen } from '../src/ui/screens/CaptureScreen';
import { SearchScreen } from '../src/ui/screens/SearchScreen';
import { GraphScreen } from '../src/ui/screens/GraphScreen';
import { LogScreen } from '../src/ui/screens/LogScreen';
import { HudCommandsProvider } from '../src/ui/state/HudCommands';
import { ChromeProvider, useChrome } from '../src/ui/state/ChromeContext';
import { SelectionProvider } from '../src/ui/state/SelectionContext';

const fixture = globalThis.hudFixture = { calls: [], entries: [], failSave: false, pendingSave: null, holdSave: false, handedness: null };
fixture.services = {
  entries: {
    listEntries: async () => fixture.entries,
    createEntry: async input => {
      fixture.calls.push(['createEntry', input]);
      if (fixture.holdSave) await new Promise(resolve => { fixture.pendingSave = resolve; });
      if (fixture.failSave) throw new Error('SIMULATED SAVE FAILURE');
      fixture.entries.unshift({ id: String(Date.now()), createdAt: Date.now(), updatedAt: Date.now(), ...input });
    },
  },
  backup: { getStatus: async () => ({ state: 'current', lastBackupAt: 1, detail: 'Test snapshot' }) },
  attachments: {
    getAttachments: async () => [],
    captureFromCamera: async () => { fixture.calls.push(['camera']); return null; },
    pickFromGallery: async () => { fixture.calls.push(['gallery']); return null; },
  },
  location: { requestCurrentLocation: async () => { fixture.calls.push(['location']); return null; } },
  entities: {
    listEntitiesForEntry: async () => [], listEntities: async () => [],
    getRelatedEntities: async () => null,
  },
  search: {
    searchEntries: async query => { fixture.calls.push(['search', query]); await new Promise(r => setTimeout(r, 100)); return []; },
    searchEntities: async () => [],
  },
};
function Harness() {
  const [path, setPath] = useState('/');
  const chrome = useChrome();
  useEffect(() => { fixture.handedness = chrome.setHandedness; }, [chrome.setHandedness]);
  const router = useMemo(() => ({ push: setPath, replace: setPath, canGoBack: () => true, back: () => setPath('/') }), []);
  const screen = path === '/capture' ? <CaptureScreen /> : path === '/search' ? <SearchScreen /> : path === '/graph' ? <GraphScreen /> : path === '/settings' ? <View /> : <LogScreen />;
  return <RouterContext.Provider value={{ path, router }}><HudCommandsProvider><HudShell><View key={path} style={{ flex: 1 }}>{screen}</View></HudShell></HudCommandsProvider></RouterContext.Provider>;
}
createRoot(document.getElementById('root')).render(<ChromeProvider><SelectionProvider><Harness /></SelectionProvider></ChromeProvider>);
