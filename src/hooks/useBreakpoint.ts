/*
 * File: useBreakpoint.ts
 *
 * Purpose:
 *     Map window width to compact, medium, or expanded presentation.
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

import { useWindowDimensions } from 'react-native';

import type { LayoutMode } from '@/models/types';
import { layout } from '@/theme/tokens';

/*
 * Purpose: Choose compact, medium, or expanded presentation from window width.
 * Design: Breakpoints match captains-log.yaml (599 / 600–899 / 900+) using useWindowDimensions so rotate/resize updates live.
 * Workflow: Used by AppShell and screens that branch phone vs tablet behavior.
 * Data Handoff: Returns layout mode plus current width/height for pane arrangement.
 */
export function useBreakpoint(): { mode: LayoutMode; width: number; height: number } {
  const { width, height } = useWindowDimensions();
  let mode: LayoutMode = 'compact';
  if (width >= 900) {
    mode = 'expanded';
  } else if (width >= 600) {
    mode = 'medium';
  } else if (width > layout.compactMax) {
    mode = 'medium';
  }
  return { mode, width, height };
}
