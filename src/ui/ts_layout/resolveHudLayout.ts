/*
 * File: src/ui/ts_layout/resolveHudLayout.ts
 * Purpose: Resolve schema 3 YAML regions from the actual window without global scale.
 * Author: Michael Garcia
 * Contact: michael@mandedesign.studio
 * License: SPDX-License-Identifier: MPL-2.0
 * Related Decisions: DEV-2026-09-14-005
 */
import { mergeHudComponent } from './hudBehavior';

export type Rect = { x: number; y: number; width: number; height: number };
export type Insets = { top: number; right: number; bottom: number; left: number };
export type Size = { width: number; height: number };
export type HudHand = 'left' | 'right';

type Band = { min?: number; preferred?: number; max?: number | null };
type Anchor = { target: string; edge: string; relation: 'after' | 'before' | 'aligned'; gap?: Band; gap_role?: string };
type RegionSpec = {
  component?: string;
  part?: string;
  sizing: string;
  alignment?: { horizontal: string; vertical: string };
  anchors?: Record<string, Anchor>;
  buffer?: Record<string, Band>;
  size?: { width?: number | Band | 'flexible'; height?: number | 'flexible' };
  safe_area?: string | null;
  optical_offset?: { x?: number; y?: number };
  width_resolution?: string;
  content_reservations?: ReadonlyArray<{ region: string; edge: string; gap?: Band }>;
  constraints?: unknown;
};

export type ResolveInput = {
  window: Size;
  obstructionInsets: Insets;
  family: {
    layout_policy: { safe_area: { safety_buffer: number } };
    constraints: { scale_fixed_controls: boolean };
  };
  layout: {
    orientation: string;
    reference_viewport: Size;
    constraints: { minimum_window_width: number; minimum_window_height: number };
    runtime_regions: Record<string, RegionSpec>;
    safe_groups: Record<string, { members: string[]; edges: string[]; safety_buffer: Band }>;
    handedness: { variants?: { left?: { horizontal_overrides?: Record<string, Partial<RegionSpec>> } } };
  };
  components: Record<string, Record<string, unknown>>;
  handedness: HudHand;
};

export type ResolveResult = {
  status: 'ok' | 'unsupported_size';
  regions: Record<string, Rect>;
  overflow: { navigation_rail?: 'scroll' };
  expandedDock: { width: number; height: number } | null;
  reasons?: string[];
};

function clamp(value: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, value));
}

function mixBand(band: Band | undefined, t: number) {
  if (!band) return 0;
  const min = band.min ?? band.preferred ?? 0;
  const preferred = band.preferred ?? min;
  return min + (preferred - min) * t;
}

function numericSize(value: number | Band | 'flexible' | undefined) {
  if (typeof value === 'number') return value;
  if (value && typeof value === 'object') return value.preferred ?? value.min;
  return undefined;
}

function sizeToken(spec: RegionSpec, components: ResolveInput['components'], axis: 'width' | 'height'): number | Band | undefined {
  const local = spec.size?.[axis];
  if (local && local !== 'flexible') return local;
  if (!spec.component) return undefined;
  const component = components[spec.component];
  if (!component) return undefined;
  if (spec.part) {
    const part = (component[spec.part] ?? component.menu) as { size?: { width?: number | Band; height?: number | Band }; width?: number; height?: number } | undefined;
    return part?.size?.[axis] ?? part?.[axis];
  }
  const size = component.size as { width?: number | Band | 'flexible'; height?: number | Band | 'flexible' } | undefined;
  const fromSize = size?.[axis] === 'flexible' ? undefined : size?.[axis];
  if (fromSize !== undefined) return fromSize;
  const collapsed = component.collapsed_parent as { width?: number; height?: number } | undefined;
  return collapsed?.[axis];
}

function componentExtent(spec: RegionSpec, components: ResolveInput['components'], axis: 'width' | 'height') {
  return numericSize(sizeToken(spec, components, axis));
}

function componentMin(spec: RegionSpec, components: ResolveInput['components'], axis: 'width' | 'height') {
  const token = sizeToken(spec, components, axis);
  if (typeof token === 'number') return token;
  if (token && typeof token === 'object') return token.min ?? token.preferred ?? 0;
  return undefined;
}

function applyHandedness(layout: ResolveInput['layout'], handedness: HudHand) {
  const regions: Record<string, RegionSpec> = { ...layout.runtime_regions };
  if (handedness !== 'left') return regions;
  const overrides = layout.handedness.variants?.left?.horizontal_overrides;
  if (!overrides) return regions;
  for (const [id, override] of Object.entries(overrides)) {
    const base = regions[id];
    if (!base) continue;
    const vertical: Record<string, Anchor> = {};
    for (const edge of ['top', 'bottom', 'center_y'] as const) {
      if (base.anchors?.[edge]) vertical[edge] = base.anchors[edge];
    }
    const buffer = { ...(base.buffer ?? {}) };
    if (override.buffer) Object.assign(buffer, override.buffer);
    delete buffer.left;
    delete buffer.right;
    if (override.buffer) Object.assign(buffer, override.buffer);
    regions[id] = {
      ...base,
      alignment: { horizontal: override.alignment?.horizontal ?? (typeof override.alignment === 'string' ? override.alignment : base.alignment?.horizontal ?? 'left'), vertical: base.alignment?.vertical ?? 'top' },
      anchors: { ...vertical, ...(override.anchors as Record<string, Anchor> | undefined) },
      buffer,
      constraints: (override as RegionSpec & { constraints?: unknown }).constraints ?? (base as RegionSpec & { constraints?: unknown }).constraints,
    };
  }
  return regions;
}

function edgeOf(rect: Rect, edge: string) {
  if (edge === 'left') return rect.x;
  if (edge === 'right') return rect.x + rect.width;
  if (edge === 'top') return rect.y;
  if (edge === 'bottom') return rect.y + rect.height;
  if (edge === 'center_x') return rect.x + rect.width / 2;
  if (edge === 'center_y') return rect.y + rect.height / 2;
  return undefined;
}

function setEdge(rect: Rect, edge: string, value: number, size: number | undefined, axis: 'x' | 'y') {
  if (axis === 'x') {
    if (edge === 'left') rect.x = value;
    else if (edge === 'right' && size !== undefined) rect.x = value - size;
    else if (edge === 'right') { /* stretch end */ rect.width = value - rect.x; }
    else if (edge === 'center_x' && size !== undefined) rect.x = value - size / 2;
  } else {
    if (edge === 'top') rect.y = value;
    else if (edge === 'bottom' && size !== undefined) rect.y = value - size;
    else if (edge === 'bottom') rect.height = value - rect.y;
    else if (edge === 'center_y' && size !== undefined) rect.y = value - size / 2;
  }
}

/*
 * Purpose: Convert a window size and YAML contract into absolute HUD rectangles.
 * Design: Independent X/Y coordinate operators; preferred tokens interpolate to min; no global scale.
 * Workflow: Called from HudShell after host measurement. Data Handoff: regions plus overflow/unsupported.
 */
export function resolveHudLayout(input: ResolveInput): ResolveResult {
  const { window: host, obstructionInsets, family, layout, components, handedness } = input;
  const safety = family.layout_policy.safe_area.safety_buffer;
  const minW = layout.constraints.minimum_window_width;
  const minH = layout.constraints.minimum_window_height;
  const refW = layout.reference_viewport.width;
  const refH = layout.reference_viewport.height;
  const tX = refW === minW ? 1 : clamp((host.width - minW) / (refW - minW), 0, 1);
  const tY = refH === minH ? 1 : clamp((host.height - minH) / (refH - minH), 0, 1);
  const specs = applyHandedness(layout, handedness);
  const groups = layout.safe_groups;
  const placed: Record<string, Rect> = {
    window: { x: 0, y: 0, width: host.width, height: host.height },
  };
  const reasons: string[] = [];
  let unsupported = host.width + 1e-6 < minW || host.height + 1e-6 < minH;
  if (unsupported) reasons.push(`window ${host.width}x${host.height} < min ${minW}x${minH}`);

  function token(band: Band | undefined, edge: string | undefined, spec: RegionSpec, t: number) {
    let value = mixBand(band, t);
    const group = spec.safe_area && spec.safe_area !== 'none' ? groups[spec.safe_area] : undefined;
    if (edge && group?.edges.includes(edge)) {
      const obstruction = obstructionInsets[edge as keyof Insets] ?? 0;
      value = Math.max(value, obstruction + (group.safety_buffer.preferred ?? safety));
    }
    return value;
  }

  function anchorValue(spec: RegionSpec, edge: string, anchor: Anchor, t: number) {
    const target = placed[anchor.target];
    if (!target) return undefined;
    const targetEdge = edgeOf(target, anchor.edge);
    if (targetEdge === undefined) return undefined;
    if (anchor.relation === 'aligned') return targetEdge;
    const delta = anchor.gap ? mixBand(anchor.gap, t) : (anchor.target === 'window' || anchor.target === 'canvas' ? token(spec.buffer?.[edge], edge, spec, t) : 0);
    return anchor.relation === 'after' ? targetEdge + delta : targetEdge - delta;
  }

  function placeAxis(axis: 'x' | 'y') {
    const t = axis === 'x' ? tX : tY;
    const opposite = axis === 'x' ? 'right' : 'bottom';
    const origin = axis === 'x' ? 'left' : 'top';
    const center = axis === 'x' ? 'center_x' : 'center_y';
    const extentKey = axis === 'x' ? 'width' : 'height';
    for (let pass = 0; pass < 24; pass += 1) {
      let progress = false;
      for (const [id, spec] of Object.entries(specs)) {
        const rect = placed[id] ?? { x: 0, y: 0, width: 0, height: 0 };
        const preferred = componentExtent(spec, components, extentKey);
        const fixed = axis === 'x' ? spec.sizing === 'fixed' || spec.sizing === 'flexible_y' : spec.sizing === 'fixed' || spec.sizing === 'flexible_x';
        const size = fixed || (axis === 'x' && spec.width_resolution) ? preferred : undefined;
        const anchors = spec.anchors ?? {};
        if (axis === 'x' && spec.width_resolution && preferred !== undefined) {
          const leftClear = token(spec.buffer?.left, 'left', spec, t);
          const rightClear = token(spec.buffer?.right, 'right', spec, t);
          const available = host.width - leftClear - rightClear;
          const min = componentMin(spec, components, 'width') ?? preferred;
          const extent = Math.min(preferred, Math.max(0, available));
          if (extent + 1e-6 < min) {
            unsupported = true;
            reasons.push(`${id} width ${extent} < min ${min}`);
          }
          let x = (host.width - extent) / 2;
          if (x < leftClear) x = leftClear;
          if (x + extent > host.width - rightClear) x = host.width - rightClear - extent;
          placed[id] = { ...rect, x, width: extent };
          progress = true;
          continue;
        }
        if (anchors[origin] && anchors[opposite]) {
          const start = anchorValue(spec, origin, anchors[origin], t);
          const end = anchorValue(spec, opposite, anchors[opposite], t);
          if (start === undefined || end === undefined) continue;
          if (axis === 'x') { rect.x = start; rect.width = end - start; }
          else { rect.y = start; rect.height = end - start; }
          placed[id] = rect;
          progress = true;
          continue;
        }
        if (size !== undefined && (anchors[origin] || anchors[opposite] || anchors[center])) {
          const edge = anchors[center] ? center : anchors[origin] ? origin : opposite;
          const value = anchorValue(spec, edge, anchors[edge], t);
          if (value === undefined) continue;
          setEdge(rect, edge, value, size, axis);
          if (axis === 'x') rect.width = size; else rect.height = size;
          placed[id] = rect;
          progress = true;
        }
      }
      if (!progress) break;
    }
  }

  placeAxis('x');
  placeAxis('y');
  for (const [id, spec] of Object.entries(specs)) {
    const rect = placed[id];
    if (!rect) { unsupported = true; reasons.push(`missing ${id}`); continue; }
    if (spec.optical_offset?.x) rect.x += spec.optical_offset.x;
    if (spec.optical_offset?.y) rect.y += spec.optical_offset.y;
    if (rect.width + 1e-6 < 0 || rect.height + 1e-6 < 0) {
      unsupported = true;
      reasons.push(`${id} negative ${rect.width}x${rect.height}`);
    }
    const minExtent = componentMin(spec, components, spec.sizing === 'flexible_y' ? 'height' : 'width');
    if ((spec.sizing === 'flexible_x' || spec.sizing === 'flexible_both') && minExtent !== undefined && rect.width + 1e-6 < minExtent) {
      unsupported = true;
      reasons.push(`${id} width ${rect.width} < min ${minExtent}`);
    }
  }

  const overflow: ResolveResult['overflow'] = {};
  const railSpec = specs.navigation_rail;
  const railRect = placed.navigation_rail;
  const rail = mergeHudComponent(components.navigation_rail, {}) as {
    button: { height: number };
    spacing: { trailing?: Band; gap?: Band };
    overflow?: { minimum_visible_extent: number };
  };
  if (railSpec && railRect && rail.button && rail.spacing) {
    const reservations = (railSpec.content_reservations ?? []).reduce((sum, item) => {
      const member = placed[item.region];
      return sum + (member?.height ?? 0) + mixBand(item.gap, tY);
    }, 0);
    const count = 3;
    const minGap = rail.spacing.gap?.min ?? 0;
    const trailing = rail.spacing.trailing?.min ?? 0;
    const packed = reservations + count * rail.button.height + (count - 1) * minGap + trailing;
    if (railRect.height + 1e-6 < packed) {
      const minVisible = reservations + (rail.overflow?.minimum_visible_extent ?? rail.button.height);
      if (railRect.height + 1e-6 < minVisible) {
        unsupported = true;
        reasons.push(`rail height ${railRect.height} < min visible ${minVisible} packed ${packed}`);
      } else overflow.navigation_rail = 'scroll';
    }
  }

  const dock = components.action_dock as { expanded_assembly?: { width: number; height: number } };
  const expanded = dock.expanded_assembly ? { width: dock.expanded_assembly.width, height: dock.expanded_assembly.height } : null;
  const regions: Record<string, Rect> = {};
  for (const id of Object.keys(specs)) {
    const rect = placed[id];
    if (rect) regions[id] = { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
  }
  return { status: unsupported ? 'unsupported_size' : 'ok', regions, overflow, expandedDock: expanded, reasons };
}
