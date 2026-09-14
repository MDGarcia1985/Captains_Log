/*
 * Purpose: Subscribe to rotation independently of keyboard-resized native windows.
 * Author: Codex; Contact: michael@mandedesign.studio
 * License: SPDX-License-Identifier: MPL-2.0
 * Decision: DEV-2026-09-13-001
 */
import { useSyncExternalStore } from 'react';
import { Dimensions, Platform, useWindowDimensions } from 'react-native';
import { selectHudOrientation } from '@/ui/layout/hudBehavior';

function subscribe(onChange: () => void) {
  const subscription = Dimensions.addEventListener('change', onChange);
  return () => subscription.remove();
}

function getOrientation() {
  return selectHudOrientation(Dimensions.get('window'), Dimensions.get('screen'), Platform.OS === 'web');
}

export function useHudViewport() {
  const { width, height } = useWindowDimensions();
  const orientation = useSyncExternalStore(subscribe, getOrientation, getOrientation);
  return { width, height, orientation };
}
