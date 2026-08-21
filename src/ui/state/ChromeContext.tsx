/*
 * File: ChromeContext.tsx
 *
 * Purpose:
 *     Share handedness so Settings can reorient the shell immediately.
 *
 * Author:
 *     Captain's Log contributors
 *     Project owner name pending confirmation.
 *
 * Contact:
 *     Project owner contact information pending confirmation.
 *
 * License:
 *     All rights reserved until the project owner selects a license.
 */

import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

import type { Handedness } from '@/models/types';

interface ChromeState {
  handedness: Handedness;
  setHandedness: (value: Handedness) => void;
  locked: boolean;
  lock: () => void;
  unlock: () => void;
}

const ChromeContext = createContext<ChromeState | null>(null);

/*
 * Purpose: Hold handedness and session lock for the chrome/shell.
 * Design: React state rather than SQLite reads on every render; Settings writes both store and this context.
 * Workflow: Wraps AuthGate in root layout so lock() can return the user to the login screen.
 * Data Handoff: Provides ChromeState to AppShell, CaptureScreen, Settings, and AuthGate.
 */
export function ChromeProvider({ children }: { children: ReactNode }) {
  const [handedness, setHandedness] = useState<Handedness>('right');
  const [locked, setLocked] = useState(false);
  const value = useMemo(
    () => ({
      handedness,
      setHandedness,
      locked,
      lock: () => setLocked(true),
      unlock: () => setLocked(false),
    }),
    [handedness, locked]
  );
  return <ChromeContext.Provider value={value}>{children}</ChromeContext.Provider>;
}

/*
 * Purpose: Require ChromeProvider and return chrome state.
 * Design: Throw if missing so a screen cannot silently assume right-handed unlocked chrome.
 * Workflow: Used by AppShell, Settings, Capture, and AuthGate.
 * Data Handoff: Returns ChromeState.
 */
export function useChrome(): ChromeState {
  const value = useContext(ChromeContext);
  if (!value) {
    throw new Error('ChromeProvider is required');
  }
  return value;
}
