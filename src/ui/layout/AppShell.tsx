/*
 * File: AppShell.tsx
 * Purpose: Keep every viewport on the supported YAML composition.
 * Author: Michael Garcia; Contact: michael@mandedesign.studio
 * License: SPDX-License-Identifier: MPL-2.0
 * Decision: DEV-2026-09-13-001
 */
import { useEffect, useMemo, type ReactNode } from 'react';
import { useRequiredAppServices } from '@/services/AppServicesProvider';
import { uiSpec } from '@/ui/generated/uiSpec';
import { HudLayoutProvider } from '@/ui/layout/HudLayoutContext';
import { HudShell } from '@/ui/layout/HudShell';
import { mergeHudComponent } from '@/ui/layout/hudBehavior';
import { useHudViewport } from '@/ui/layout/useHudViewport';
import { useChrome } from '@/ui/state/ChromeContext';

export function AppShell({ children }: { children: ReactNode }) {
  const services = useRequiredAppServices();
  const { handedness, setHandedness } = useChrome();
  const { orientation, width, height } = useHudViewport();
  // Tablet specifications are placeholders. Extra space remains background buffer;
  // neither width breakpoints nor rotation may replace the mounted shell/screens.
  const layout = useMemo(() => {
    const selected = uiSpec.layouts.mobile[orientation];
    return handedness === 'left' && 'left_handed' in selected
      ? mergeHudComponent(selected, selected.left_handed)
      : selected;
  }, [orientation, handedness]);
  const value = useMemo(() => ({
    orientation, layout, width, height, capabilities: uiSpec.layouts.mobile.capabilities,
  }), [orientation, layout, width, height]);

  useEffect(() => {
    let active = true;
    void services.settings.get().then(settings => {
      if (active) setHandedness(settings.handedness);
    });
    return () => { active = false; };
  }, [services, setHandedness]);

  return <HudLayoutProvider value={value}><HudShell>{children}</HudShell></HudLayoutProvider>;
}
