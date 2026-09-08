/*
 * File: HudCommands.tsx
 * Purpose: Focus-scoped bridge from the mobile HUD to existing screen actions.
 * Author: Codex; Contact: michael@mandedesign.studio
 * License: SPDX-License-Identifier: MPL-2.0
 * Decision: DEV-2026-09-07-025
 */
import { createContext, useCallback, useContext, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useFocusEffect } from 'expo-router';

export type AttachmentAction = 'camera' | 'gallery' | 'location';
export type HudCommand = 'commit' | 'cancel' | 'clear' | 'reset' | AttachmentAction;
type Commands = Partial<Record<HudCommand, () => void | Promise<void>>>;
type Registration = { scope: string; commands: Commands; busy: boolean; token: symbol };
type Pending = { id: number; action: AttachmentAction };
interface HudState {
  current: Registration | null;
  pending: Pending | null;
  register: (scope: string, commands: Commands, busy: boolean) => () => void;
  requestAttachment: (action: AttachmentAction) => void;
  consume: (id: number) => void;
}
const Context = createContext<HudState | null>(null);

/* Purpose: Own only command routing, not drafts or persistence.
 * Design: Token-based cleanup cannot unregister a newly focused screen.
 * Workflow: Wrap the authenticated shell. Data Handoff: A one-shot attachment intent. */
export function HudCommandsProvider({ children }: { children: ReactNode }) {
  const [current, setCurrent] = useState<Registration | null>(null);
  const [pending, setPending] = useState<Pending | null>(null);
  const sequence = useRef(0);
  const register = useCallback((scope: string, commands: Commands, busy: boolean) => {
    const token = Symbol(scope);
    setCurrent({ scope, commands, busy, token });
    return () => setCurrent(value => value?.token === token ? null : value);
  }, []);
  const requestAttachment = useCallback((action: AttachmentAction) => {
    setPending({ id: ++sequence.current, action });
  }, []);
  const consume = useCallback((id: number) => setPending(p => p?.id === id ? null : p), []);
  const value = useMemo(() => ({ current, pending, register, requestAttachment, consume }),
    [current, pending, register, requestAttachment, consume]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

/* Purpose: Require the shell action bridge. Design: Fail early without the provider.
 * Workflow: Shell/screens. Data Handoff: Shared transient command state. */
export function useHud() {
  const context = useContext(Context);
  if (!context) throw new Error('HudCommandsProvider is required');
  return context;
}

/* Purpose: Publish only the focused screen's current callbacks.
 * Design: Stable proxies read the latest draft; busy refreshes disabled state.
 * Workflow: Screen hook. Data Handoff: Rail/dock commands into screen service calls. */
export function useHudRegistration(scope: string, commands: Commands, busy = false) {
  const { register } = useHud();
  const latest = useRef(commands);
  useLayoutEffect(() => { latest.current = commands; });
  useFocusEffect(useCallback(() => {
    const proxies: Commands = {};
    for (const key of Object.keys(latest.current) as HudCommand[]) {
      proxies[key] = () => latest.current[key]?.();
    }
    return register(scope, proxies, busy);
  }, [scope, register, busy]));
}

/* Purpose: Deliver a dock attachment request after Capture becomes focused.
 * Design: Consume each sequence once, including Strict Mode effect replays.
 * Workflow: Capture focus. Data Handoff: One action to its guarded attachment handler. */
export function usePendingAttachment(attach: (action: AttachmentAction) => void | Promise<void>) {
  const { pending, consume } = useHud();
  const handled = useRef<number | null>(null);
  const latest = useRef(attach);
  useLayoutEffect(() => { latest.current = attach; });
  useFocusEffect(useCallback(() => {
    if (pending && handled.current !== pending.id) {
      handled.current = pending.id;
      consume(pending.id);
      void latest.current(pending.action);
    }
  }, [pending, consume]));
}
