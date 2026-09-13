/*
 * File: HudLayoutContext.tsx
 * Purpose: Provide the active mobile orientation specification to HUD layers.
 * Author: Codex; Contact: michael@mandedesign.studio
 * License: SPDX-License-Identifier: MPL-2.0
 * Related Decisions: DEV-2026-09-12-001
 */
import { createContext, useContext, type ReactNode } from 'react';
import { uiSpec } from '@/ui/generated/uiSpec';
import type { HudOrientation } from '@/ui/layout/hudBehavior';

type MobileLayout = typeof uiSpec.layouts.mobile.portrait | typeof uiSpec.layouts.mobile.landscape;

export interface HudLayoutValue {
  orientation: HudOrientation;
  layout: MobileLayout;
}

const HudLayoutContext = createContext<HudLayoutValue | null>(null);

export function HudLayoutProvider({ value, children }: { value: HudLayoutValue; children: ReactNode }) {
  return <HudLayoutContext.Provider value={value}>{children}</HudLayoutContext.Provider>;
}

/* Purpose: Read the orientation-selected layout from HudShell.
 * Design: Fail closed if artwork is rendered outside the shell.
 * Workflow: Scanner and title layers. Data Handoff: Active layout. */
export function useHudLayout() {
  const value = useContext(HudLayoutContext);
  if (!value) throw new Error('HudLayoutProvider is required');
  return value;
}
