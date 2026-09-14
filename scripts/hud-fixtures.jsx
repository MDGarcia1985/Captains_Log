/* File: hud-fixtures.jsx
 * Purpose: In-memory platform/service doubles, only bundled by the HUD test runner.
 * Author: Codex; Contact: michael@mandedesign.studio
 * License: SPDX-License-Identifier: MPL-2.0; DEV-2026-09-07-025
 * No production import, account, database, camera, location or network access. */
import React, { createContext, useContext, useEffect, useState } from 'react';
import { StyleSheet } from 'react-native-web';
export const RouterContext = createContext(null);
export function useRouter() { return useContext(RouterContext).router; }
export function usePathname() { return useContext(RouterContext).path; }
export function useFocusEffect(callback) { useEffect(callback, [callback]); }
export function useSafeAreaInsets() {
  const [insets, setInsets] = useState({ top: 0, right: 0, bottom: 0, left: 0 });
  useEffect(() => { globalThis.hudFixture.setInsets = setInsets; }, []);
  return insets;
}
export function StatusBar() { return null; }
export function Image({ source, contentFit, style }) {
  return <img alt="" src={typeof source === 'string' ? source : source?.uri} style={{ ...StyleSheet.flatten(style), objectFit: contentFit === 'fill' ? 'fill' : 'contain', pointerEvents: 'none' }} />;
}
export function useFonts(fonts) {
  const [ready, setReady] = useState(false);
  const [fontMap] = useState(() => fonts);
  useEffect(() => {
    let alive = true;
    Promise.all(Object.entries(fontMap).map(async ([name, url]) => {
      const face = await new FontFace(name, `url(${url})`).load();
      document.fonts.add(face);
    })).then(() => { if (alive) setReady(true); });
    return () => { alive = false; };
  }, [fontMap]);
  return [ready, null];
}
export function useRequiredAppServices() { return globalThis.hudFixture.services; }
export function useAppServices() { return globalThis.hudFixture.services; }
