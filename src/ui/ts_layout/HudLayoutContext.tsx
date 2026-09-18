/*
 * File: HudLayoutContext.tsx
 * Purpose: Provide the active mobile orientation specification and resolved HUD regions.
 * Author: Codex; Contact: michael@mandedesign.studio
 * License: SPDX-License-Identifier: MPL-2.0
 * Related Decisions: DEV-2026-09-12-001; DEV-2026-09-14-005
 */
import { createContext, useContext, type ReactNode } from 'react';
import { uiSpec } from '@/ui/generated/uiSpec';
import type { HudHand, HudOrientation } from '@/ui/ts_layout/hudBehavior';
import type { Rect, ResolveResult } from '@/ui/ts_layout/resolveHudLayout';

type MobileLayout = typeof uiSpec.layouts.mobile.portrait | typeof uiSpec.layouts.mobile.landscape;

export interface HudLayoutValue {
  orientation: HudOrientation;
  layout: MobileLayout;
  width: number;
  height: number;
  capabilities: typeof uiSpec.layouts.mobile.capabilities;
  handedness: HudHand;
  regions: Record<string, Rect>;
  overflow: ResolveResult['overflow'];
  expandedDock: ResolveResult['expandedDock'];
  resolveStatus: ResolveResult['status'] | 'pending';
}

const HudLayoutContext = createContext<HudLayoutValue | null>(null);

export function HudLayoutProvider({ value, children }: { value: HudLayoutValue; children: ReactNode }) {
  return <HudLayoutContext.Provider value={value}>{children}</HudLayoutContext.Provider>;
}

/* Purpose: Read the orientation-selected layout from AppShell.
 * Design: Fail closed if artwork is rendered outside the shell.
 * Workflow: Scanner, title, dock, and route screens.
 * Data Handoff: Active YAML layout plus resolved window regions.
 */
export function useHudLayout() {
  const value = useContext(HudLayoutContext);
  if (!value) throw new Error('HudLayoutProvider is required');
  return value;
}
