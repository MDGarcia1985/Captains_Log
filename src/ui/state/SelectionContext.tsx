/*
 * File: SelectionContext.tsx
 *
 * Purpose:
 *     Track selected entity/entry for the tablet context pane.
 *
 * Author:
 *     Michael Garcia
 *
 * Contact:
 *     michael@mandedesign.studio
 *
 * License:
 *     SPDX-License-Identifier: MPL-2.0
 */

import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

interface SelectionState {
  entityId: string | null;
  entryId: string | null;
  setEntityId: (id: string | null) => void;
  setEntryId: (id: string | null) => void;
}

const SelectionContext = createContext<SelectionState | null>(null);

/*
 * Purpose: Hold the selected entity/entry for tablet context without routing.
 * Design: Compact layouts still route to /entity/[id]; expanded reads this context for the docked pane.
 * Workflow: Wraps AuthGate in root layout; set from log, search, and graph chips.
 * Data Handoff: Provides entityId/entryId to AppShell ContextPane.
 */
export function SelectionProvider({ children }: { children: ReactNode }) {
  const [entityId, setEntityId] = useState<string | null>(null);
  const [entryId, setEntryId] = useState<string | null>(null);
  const value = useMemo(
    () => ({ entityId, entryId, setEntityId, setEntryId }),
    [entityId, entryId]
  );
  return <SelectionContext.Provider value={value}>{children}</SelectionContext.Provider>;
}

/*
 * Purpose: Require SelectionProvider and return selection setters.
 * Design: Throw if missing so compact/expanded branching cannot run without shared state.
 * Workflow: Used by LogScreen, SearchScreen, GraphScreen, and AppShell.
 * Data Handoff: Returns SelectionState.
 */
export function useSelection(): SelectionState {
  const value = useContext(SelectionContext);
  if (!value) {
    throw new Error('SelectionProvider is required');
  }
  return value;
}
