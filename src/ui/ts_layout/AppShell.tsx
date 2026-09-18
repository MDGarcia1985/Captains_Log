/*
 * File: AppShell.tsx
 * Purpose: Keep every viewport on the supported YAML composition.
 * Author: Michael Garcia; Contact: michael@mandedesign.studio
 * License: SPDX-License-Identifier: MPL-2.0
 * Decision: DEV-2026-09-13-001; DEV-2026-09-14-005
 */
import { useEffect, useMemo, type ReactNode } from 'react';
import { useRequiredAppServices } from '@/services/AppServicesProvider';
import { uiSpec } from '@/ui/generated/uiSpec';
import { HudLayoutProvider } from '@/ui/ts_layout/HudLayoutContext';
import { HudShell } from '@/ui/ts_layout/HudShell';
import { useHudViewport } from '@/ui/ts_layout/useHudViewport';
import { useChrome } from '@/ui/state/ChromeContext';

export function AppShell({ children }: { children: ReactNode }) {
  const services = useRequiredAppServices();
  const { handedness, setHandedness } = useChrome();
  const { orientation, width, height } = useHudViewport();
  const layout = uiSpec.layouts.mobile[orientation];
  const value = useMemo(() => ({
    orientation,
    layout,
    width,
    height,
    capabilities: uiSpec.layouts.mobile.capabilities,
    handedness,
    regions: {},
    overflow: {},
    expandedDock: null,
    resolveStatus: 'pending' as const,
  }), [orientation, layout, width, height, handedness]);

  useEffect(() => {
    let active = true;
    void services.settings.get().then(settings => {
      if (active) setHandedness(settings.handedness);
    });
    return () => { active = false; };
  }, [services, setHandedness]);

  return <HudLayoutProvider value={value}><HudShell>{children}</HudShell></HudLayoutProvider>;
}
