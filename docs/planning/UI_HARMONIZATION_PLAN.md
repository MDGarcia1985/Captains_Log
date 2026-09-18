# Figma / YAML UI Harmonization and Normalization Plan

Status: **APPROVED WITH A1–A8 OVERRIDES — implementation and verification recorded under DEV-025**  
Review date: 2026-09-07  
Related decision: DEV-2026-09-07-024

## Approval and execution update — 2026-09-07

The original proposal below is retained as the review baseline. The user's A1–A8
approval supersedes its analysis-only scope and unanswered Q1–Q8. See
[DEV-2026-09-07-025](DEVNOTES.md) and [HUD_IMPLEMENTATION.md](HUD_IMPLEMENTATION.md)
for the implemented scope, runtime choices, source-to-asset mapping and verification
limits. Figma visual values remain authoritative except the explicitly approved
menu, dock, status and contextual navigation changes. Scanner timing belongs to
React Native; unpainted grid/scanline references are not rendered.

## Executive summary

Normalize the existing specifications and asset names without redesigning the HUD. The current Figma file supplies visual evidence; YAML supplies canonical semantic vocabulary where concepts already match. Neither a Figma layer name nor an incomplete YAML declaration is sufficient evidence to change application behavior.

This pass is analysis-only. It creates this plan and appends a proposed decision to `docs/DEVNOTES.md`. No YAML, Figma nodes, variables, styles, TypeScript, React Native code, or assets have been changed. Nothing has been deleted.

The main findings are:

- Three manifest references point to nonexistent files. The status-header file has two YAML syntax errors, incorrect nesting, and inconsistent root vocabulary. Theme references contain spelling/case errors. These are normalization issues, not redesign opportunities.
- Figma shows **New, Log, Search, Graph**, four 60 × 135 rail buttons. YAML declares **Graph, Search, Settings, Log, New** with icons that Figma does not contain. Settings remains a real application destination and must not become inaccessible as a side effect of removing its unsupported rail representation.
- Figma shows **Camera, Gallery, Location, Add** in the dock. YAML declares **Add, Location, Gallery, Export**. Camera must be represented; Export's placement and Add's action require approval, not a speculative rename of Camera to Export.
- Several meaningful visual distinctions are missing: the title divider's two different strokes, status value text, the viewport depth effect, clipped button silhouettes, per-item accent treatments, and three rail-label sizes.
- The live scanner differs from its earlier conversational state. It has counter-rotating inner/outer arcs, but its approximately 10.14-second keyframes exceed a 10-second timeline. YAML reverses the directions and also declares an unrepresented status-tick blink response system.
- All inspected HUD text is currently detached from local text styles. Some SVG paints are literal colors; some are variable-bound. Applying existing, mismatched styles wholesale would change the appearance.

Approval of mechanical corrections must not implicitly approve the unresolved product or visual choices in [Open questions](#8-open-questions-requiring-human-approval). Do not execute unresolved rows until their specific decision is recorded.

## Scope and evidence

### Figma inspected

[Captain's Log — Mobile HUD](https://www.figma.com/design/dFwk8LAWauplWqrOKaQplU?node-id=2-20), file key `dFwk8LAWauplWqrOKaQplU`, page `Page 1` (`0:1`), root `Mobile HUD / 390×844` (`2:20`). Live hierarchy, dimensions, visible and hidden layers, paints/bindings, stroke weights/alignments, text properties, local variables/styles, manual scanner keyframes, and a resting-state screenshot were inspected on 2026-09-07, approximately 17:30–17:36 EDT.

The file has one page and one top-level HUD frame. Its descendants contain **no native components, component sets, or instances**, and no prototype reactions were returned. In this document, “component” can mean a semantic YAML component; it does not assert that the corresponding Figma frame is a reusable native component. Hidden active layers are design evidence, not proof of functioning navigation. No playback or device verification was performed.

This live snapshot, not the initial attached reference image or earlier node measurements, is the baseline. The original image is contextual guidance; it does not override current Figma edits. Re-read IDs and values before any later mutation.

### Repository inspected

All ten UI specification files were read completely:

| Code used below | Exact repository file |
|---|---|
| U | `src/ui/ui.yaml` |
| T | `src/ui/theme.yaml` |
| Y | `src/ui/typography.yaml` |
| M | `src/ui/layout/mobile.yaml` |
| H | `src/ui/components/status-header.yaml` |
| S | `src/ui/components/scanner.yaml` |
| B | `src/ui/components/title_block.yaml` |
| V | `src/ui/components/viewports.yaml` |
| N | `src/ui/components/navigation-rail.yaml` |
| D | `src/ui/components/action-dock.yaml` |

Additional evidence: `AGENTS.md`, `docs/DEVNOTES_STANDARDS.md`, relevant test-level guidance in `docs/TEST_LOG_STANDARDS.md`, DEV-2026-08-22-020, DEV-2026-08-31-022, DEV-2026-09-07-023, `src/ui/layout/NavigationRail.tsx`, `src/ui/layout/AppShell.tsx`, `src/ui/screens/CaptureScreen.tsx` (capture/control logic), `src/theme/tokens.ts`, `package.json`, and the route/file inventory under `src/`. Repository searches found the new action/target strings in YAML, but no corresponding YAML UI resolver or action registry in the inspected implementation. This is not an end-to-end application audit.

The actual specification location is `src/ui/`; the older decision uses conceptual `ui/` paths and `layouts/`. Prefer the existing repository location and `layout/` directory. Record that reconciliation in a follow-up decision; do not rewrite historical DEVNOTES entries or reorganize directories merely to match examples.

Existing worktree changes include these untracked specifications, an untracked `Archive/` directory, and prior edits to `docs/DEVNOTES.md`. They belong to the user and must be preserved.

### Static inspection observations

A read-only check using the installed `yaml` package's `parseDocument` with unique-key checking returned no parser errors for nine files. `status-header.yaml` returned “Nested mappings are not allowed in compact mappings” at lines 2 and 3. This does **not** establish schema validity for the other nine files. There are 157 literal `TODO` occurrences across the ten files; these are unresolved values, not production tokens.

File-existence checks confirmed missing manifest targets `./layout/modile.yaml`, `./components/tltle-block.yaml`, and `./components/viewport.yaml`. No full schema validation, token-resolution test, renderer integration test, animation playback test, or mobile regression suite was executed. Implementation verification remains pending; no TEST PASS is asserted.

## Mapping conventions and boundaries

- File codes in the tables expand exactly to the repository paths above; property paths are document-root paths. Array selectors such as `items[id=new]` identify objects by their `id`, not by a fragile numeric index.
- `HUD` means the exact root path `Page 1 > Mobile HUD / 390×844`. `H`, `S`, `B`, `V`, `N`, and `D` in the **Figma path** column mean, respectively, the exact child names `01 / Status Header`, `02 / Scanner Indicator`, `03 / Title Block`, `04 / Log Entry Viewport`, `05 / Navigation Rail / Button Stack`, and `06 / Action Dock`, all under HUD. A quoted leaf name retains its internal slashes. Thus `B > Title / Angular Rule > Title / Angular Rule / Path` is an exact ancestry, not an invented folder structure.
- The classification column contains both the information class and the proposed disposition. `FIGMA + YAML / EXACT` means the same concept, not necessarily identical current values. `FIGMA-ONLY / CREATE-IN-YAML` means a meaningful addition; `FIGMA-ONLY / FIGMA-ONLY` means construction/reference detail to retain outside the spec. `YAML-ONLY / REMOVE-FROM-YAML` is an unsupported **visual candidate**, not an instruction to remove executable behavior. `YAML-ONLY / YAML-ONLY` preserves application semantics.
- Figma names proposed below use component-qualified semantic identifiers, for example `title_block.divider`. This avoids ambiguity even when exporting assets separately. Rename in place, preserve IDs and appearance, and do not reparent merely to manufacture a matching hierarchy.
- YAML declares assets by semantic identifier and contains design values/bindings. SVG path commands, masks, tessellation, gradient construction, animation transforms, and state machines remain in assets or TypeScript. React Native remains the renderer. Declarative timing/direction and event-source references are not executable state machines.

## 1. Mechanical specification normalization

These proposed edits correct broken references or spelling without changing visual or runtime intent. All remain unexecuted.

| Figma path/name | Figma node ID | YAML file | YAML path/name | Classification | Proposed action | Reason |
|---|---|---|---|---|---|---|
| HUD | `2:20` | U | `ui.layout.mobile` | YAML-ONLY / RENAME | Rename `ui.layout` to `ui.layouts`, following DEV-022; set `ui.layouts.mobile` to `./layout/mobile.yaml`. Do not rename the directory. | Current target is misspelled; plural manifest key agrees with accepted architecture. |
| B | `2:23` | U | `ui.components.title_block` | FIGMA + YAML / EXACT | Set reference to `./components/title_block.yaml`. | Use existing filename, not nonexistent `tltle-block.yaml`; a cosmetic file rename is unnecessary. |
| V | `2:24` | U | `ui.components.viewport` | FIGMA + YAML / EXACT | Set reference to `./components/viewports.yaml`; keep semantic ID `viewport`. | Plural filename need not imply multiple distinct semantic components. |
| D | `2:26` | M | `regions.aciton_dock.component` | FIGMA + YAML / RENAME | Rename region key to `action_dock` and value to `action_dock`. | Typo breaks component lookup. |
| H | `2:21` | H | `components.id`, `components.type` | FIGMA + YAML / RENAME | Root `components` → `component`; remove trailing colons from the `status_header` scalar values. | Match five other component documents and restore parseability. |
| H status items | `3:4`, `3:9`–`3:15` | H | `components.appearance.items` | FIGMA + YAML / SPLIT | After root correction, move this block to `component.items`; re-associate fields as specified in section 3. | Item content/bindings are not appearance tokens; icon/label/indicator are currently peers of `local` by indentation. |
| H > Status / Online Placeholder | `3:10` | H | `components.appearance.items.online.label.COLOR` | FIGMA + YAML / RENAME | `COLOR` → `color`, then migrate to `component.items.local.value.color` under the approved two-row model. | Correct case without dropping the online value role. |
| HUD background | `2:20` | T | `theme.colors.background.{primary,secondary,elevated}` | FIGMA + YAML / RENAME | Correct reference prefix `theme.palate` → `theme.palette`. | Misspelled reference target. |
| HUD text | text IDs in section 7 | T | `theme.colors.test` | FIGMA + YAML / RENAME | `test` → `text`; update all references, never maintain two synonymous namespaces. | Consumers already reference `theme.colors.text.*`. |
| H bezel | `3:3` | H | `component.appearance.bezel.color` | FIGMA + YAML / RENAME | Correct `theme.colors.boarder.subtle` → valid border namespace; final role is `theme.colors.border.strong`. | Typo plus measured border-role mismatch. |
| Color references | `VariableID:2:8` | T | `theme.colors.accent.bright`, `theme.colors.status.online` | YAML-ONLY / RENAME | Correct `theme.pelette` → `theme.palette` before resolving/pruning these declarations. | Broken spelling is distinct from the color decisions below. |
| Opacity/effect vocabulary | effect IDs in section 7 | T | `theme.Opacity`, `theme.effects.accent_glow.redius` | FIGMA + YAML / RENAME | `Opacity` → `opacity`; `redius` → `radius`. | Canonical lower-case token paths; preserve separate effect opacity and node/paint opacity. |
| Mobile composition | `2:20` | M | `regions` | YAML-ONLY / YAML-ONLY | Keep top-level `regions` in the minimum pass; document the schema as `{layout, regions}`. Do not also move it to `layout.regions` without a schema decision. | Current sibling structure parses; Figma does not determine schema nesting. |

## 2. Layout and global visual additions

The root's canvas position `(41,36)` is Figma workspace placement, not an application inset. All values below are relative to the HUD root; preserve the 390 × 844 reference canvas and current rail position `(315,130)`.

| Figma path/name | Figma node ID | YAML file | YAML path/name | Classification | Proposed action | Reason |
|---|---|---|---|---|---|---|
| HUD | `2:20` | M | `layout.id`, `layout.viewport.{width,height}`, `layout.background.color` | FIGMA + YAML / EXACT | Keep `mobile`, `390`, `844`, and background-primary binding. Keep root's useful display name. | `layout.viewport` describes the reference canvas, not the content component `viewport`. |
| H | `2:21` | M | `regions.status_header.{x,y,width,height}` | FIGMA + YAML / EXACT | Set `(20,28,278,82)`; proposed frame name `status_header`. | Existing concept, unresolved dimensions. |
| S | `2:22` | M | `regions.scanner.{x,y,width,height}` | FIGMA + YAML / EXACT | Set `(310,26,60,82)`; frame name `scanner`. | Preserve current scanner placement. |
| B | `2:23` | M | `regions.title_block.{x,y,width,height}` | FIGMA + YAML / EXACT | Set `(20,122,278,68)`; frame name `title_block`. | Existing concept. |
| V | `2:24` | M | `regions.viewport.{x,y,width,height}` | FIGMA + YAML / RENAME | Set `(20,206,286,500)`; frame name `viewport`. | Generic active-view shell, not necessarily the Log screen or capture content. |
| N | `2:25` | M | `regions.navigation_rail.{x,y,width,height}` | FIGMA + YAML / RENAME | Set `(315,130,60,584)`; frame name `navigation_rail`. | Earlier `(310,122)` is stale. |
| D | `2:26` | M | `regions.action_dock.{x,y,width,height}` | FIGMA + YAML / EXACT | Set `(20,724,350,96)`; frame name `action_dock`. | Correct the typo first. |
| HUD > Screen Border / Cyan Hairline | `2:27` | M | new `layout.chrome.screen_border` | FIGMA-ONLY / CREATE-IN-YAML | Add enabled border at `(8,8,374,828)`, no fill, border-strong color, 1 inside stroke, radius 40. Rename `mobile.chrome.screen_border`. | It is not actually the bright Cyan variable despite its name. |
| HUD > Chrome / Rail Guide | `3:97` | M | new `layout.chrome.rail_guide` | FIGMA-ONLY / CREATE-IN-YAML | Add `(308,112,1,600)`, cyan fill at 0.18 opacity, noninteractive. Rename `mobile.chrome.rail_guide`. | Separate decorative guide, not a button border or hit target. |
| HUD > Atmosphere / Background Grid > Atmosphere / Background Grid / Path | `3:89` | M | new `layout.background.atmosphere.asset` | FIGMA-ONLY / CREATE-IN-YAML | Use semantic asset `mobile_background_atmosphere`, preserving existing radial-gradient artwork at 390 × 844. Rename parent `3:88` to `mobile.background.atmosphere`; distinguish `3:89` as `atmosphere.radial_wash`. | A visible gradient role exists; do not describe it as a working grid. |
| HUD > Atmosphere / Background Grid > Atmosphere / Background Grid / Path | `3:90` | M / T | candidate `layout.background.grid`; `theme.colors.atmosphere.grid` | FIGMA-ONLY / UNRESOLVED | Keep raw node Figma-only pending Q7. It has no fill/stroke and no visible grid in the resting render. Do not invent density, dot size, or a new visible grid. | Named layer is not evidence of rendered pattern geometry. |
| HUD > Atmosphere / CRT Scanlines > Atmosphere / CRT Scanlines / Path | `3:91`, `3:92` | M / T | candidate `layout.background.scanlines`; `theme.colors.atmosphere.scanline` | FIGMA-ONLY / UNRESOLVED | Do not activate/add a visible scanline layer under minimum normalization. `3:92` has no paint. If later named, use `mobile.background.scanlines`. | Restoring missing pattern rendering is a visual change requiring approval. |
| HUD > Chrome / Top Safe-Area Notch; Chrome / Bottom Home Indicator | `3:93`/`3:94`; `3:95`/`3:96` | M | candidate `layout.chrome.top_notch`, `layout.chrome.bottom_indicator` | FIGMA-ONLY / UNRESOLVED | Preserve current artwork; Q6 decides whether these are app decoration or device-reference chrome. If decorative, add assets at `(135,4,120,8)` and `(148,834,94,6)`, border-strong 1 stroke; names `mobile.chrome.top_notch`, `mobile.chrome.bottom_indicator`. Otherwise leave Figma-only. | Must not duplicate actual OS notch/gesture controls or bake system safe-area sizes into YAML. |
| No design-state equivalent | — | M | `layout.safe_area.{top,bottom,left,right}` | YAML-ONLY / YAML-ONLY | Keep all four `system` bindings. | Runtime insets are legitimate, not unsupported visual layers. Reference-coordinate versus inset-relative layout policy is Q6. |

Do not replace the measured layout with one generic gap or impose an 8-point grid. The rail currently has button y-values `9,153,297,441`: three equal 9-unit inter-button gaps, 9 top padding, and 8 bottom padding. Preserve that baseline; making all five gaps exactly equal would require 8.8 and would be a small but explicit layout change.

## 3. Status, title, scanner and viewport mappings

### Status header

Proposed semantic structure is two rows, `component.items.local` and `component.items.backup`, with separate icon, label, value, and indicator roles. Preserve `status_header`, `local_database`, `backup_cloud`, and `status_header_bezel`. The local row's current `ONLINE` sample does not prove what the runtime state means; Q3 must approve that binding.

| Figma path/name | Figma node ID | YAML file | YAML path/name | Classification | Proposed action | Reason |
|---|---|---|---|---|---|---|
| H > Status / Angular Bezel | `3:2` (paint `3:3`) | H | `component.appearance.bezel` | FIGMA + YAML / RENAME | Name `status_header.appearance.bezel`; retain asset `status_header_bezel`; add fill Surface at opacity 0.72; border-strong 1 centered stroke. | Background-transparent applies to container, not the tinted bezel. |
| H > Status / Local Database Icon; Status / Backup Cloud Icon | `3:4`; `3:7` | H | `component.items.local.icon`; `component.items.backup.icon` | FIGMA + YAML / RENAME | Names `local_database`, `backup_cloud`; size 20 × 20, cyan 1.6 stroke. Move incorrectly nested local icon into local item. | Two independent semantic assets; icon subpaths need not become YAML fields. |
| H > Status / Local Placeholder; Status / Backup Placeholder | `3:9`; `3:11` | H | `component.items.local.label`; `component.items.backup.label` | FIGMA + YAML / RENAME | Name `status_header.items.local.label` / `.backup.label`; cyan, typography `status`. Keep `LOCAL //` / `BACKUP //` as design samples; final localized content stays in code. | Label and status value must not collapse into one text role. |
| H > Status / Online Placeholder | `3:10` | H | current `components.appearance.items.online.label`; proposed `component.items.local.value` | FIGMA + YAML / MERGE | Merge the **standalone visual item** `online` into local row's value role; preserve its binding as a separately reviewed semantic source. Rename `status_header.items.local.value`; text-primary, typography `status`. | Figma has two rows, not three; ONLINE is a value beside LOCAL. Not permission to equate local health with internet connectivity. |
| H > Status / Connected Placeholder | `3:12` | H | new `component.items.backup.value` | FIGMA-ONLY / CREATE-IN-YAML | Add value text role with code-provided source, text-primary, typography `status`; name `status_header.items.backup.value`. | `CONNECTED` value is absent from YAML. Do not hardcode its truth. |
| H > Status / Online Indicator; Status / Backup Indicator | `3:14`; `3:15` | H | proposed `component.items.local.indicator`; `component.items.backup.indicator` | FIGMA + YAML / MERGE | Exactly two 8-unit circles: local at `(218,20)`, backup `(218,54)`, cyan filled. Name each `status_header.items.<id>.indicator`. Remove redundant third visual indicator only after source reconciliation. | Current malformed YAML implies separate local and online indicators; Figma has one in that row. |
| H > Status / Divider | `3:13` | H | new `component.divider` | FIGMA-ONLY / CREATE-IN-YAML | Add enabled horizontal divider `(14,41,244,1)` using border-standard fill, no stroke; name `status_header.divider`. | Not the header bezel or title divider. |
| H two-row placement | `3:4`, `3:7`, `3:9`–`3:15` | H | `component.layout` and new `component.items.<id>.layout` | FIGMA + YAML / RENAME | Set outer direction `vertical`, row direction `horizontal`; do not retain global `space_between` for all items. Encode measured row offsets: icons `(14,14)/(14,49)`, labels `(44,15)/(44,50)`, values `(124,15)/(124,50)`, indicators as above. Keep these component-local measurements, not absolute screen coordinates. | Single horizontal list is not the current two-row composition. Values and indicators are not uniformly spaced. |

Inactive circle outlines in H are **YAML-only visual state candidates**, not proof that offline behavior should disappear. Keep state sources and enabled flags; do not introduce new inactive colors/geometry into Figma during naming normalization. Q3 must specify which current or future states need a visual design.

### Scanner

| Figma path/name | Figma node ID | YAML file | YAML path/name | Classification | Proposed action | Reason |
|---|---|---|---|---|---|---|
| S > Scanner / Outer Ring | `3:16` | S | `component.rings.outer` | FIGMA + YAML / RENAME | Name `scanner.rings.outer`; diameter 54, border-strong, 2 inside stroke, no fill; preserve `(3,11)`. | Static dark ring differs from rotating bright outer arcs. |
| S > Scanner / Core | `3:18` | S | `component.core` | FIGMA + YAML / RENAME | Name `scanner.core`; diameter 13, cyan fill, `accent_glow`; preserve `(23.5,31.5)`. | Static center with glow; not a rotating arc or loading completion state. |
| S > Scanner / Inner Arc / Centered Rotation Pivot | `24:2` | S | `component.arcs.inner`; new `component.motion.arcs.center` | FIGMA + YAML / RENAME | Name `scanner.arcs.inner`; declare shared-center intent `scanner_center`. Keep 60 × 60 pivot at `(0,8)` in Figma/assets/renderer, not transform-matrix YAML. | Inner parts must rotate together around scanner center `(30,38)` in scanner coordinates. |
| S > Scanner / Inner Arc / Centered Rotation Pivot > Scanner / Inner Arc Large | `14:9` | S | `component.arcs.inner.segments.large.asset` | FIGMA + YAML / RENAME | Asset/name `scanner_inner_arc_large`; preserve current geometry and 1.5 inside stroke. | Large/small have distinct geometry and shared motion. |
| S > Scanner / Inner Arc / Centered Rotation Pivot > Scanner / Inner Arc Small | `14:8` | S | `component.arcs.inner.segments.small.asset` | FIGMA + YAML / RENAME | Asset/name `scanner_inner_arc_small`; preserve current geometry and 1.5 inside stroke. | Do not animate each part about its own bounds. |
| S > Scanner / Arc Top; Arc Bottom; Arc Left; Arc Right (each prefixed `Scanner /`) | `3:19`/`3:20`; `3:23`/`3:24`; `3:25`/`3:26`; `3:21`/`3:22` | S | `component.arcs.outer.segments.{top,bottom,left,right}.asset` | FIGMA + YAML / RENAME | Asset/names `scanner_outer_arc_top`, `_bottom`, `_left`, `_right`; cyan, 3 centered stroke. Preserve each 60 × 60 export/pivot envelope. | One rotating outer assembly can contain four separately exportable arcs; no collapsing them into static `rings.outer`. |
| S > Scanner / Status Tick | `3:27` | S | `component.status_tick` | FIGMA + YAML / RENAME | Name `scanner.status_tick`; width 18, height 2, cyan filled rectangle at `(21,77)`. Change `shape: line` to `rectangle` or explicit filled-bar semantic. | Current asset is 18 × 2, not the earlier 22 × 2. |
| Scanner motion tracks | `24:2`, `3:19`, `3:21`, `3:23`, `3:25` | S | `component.motion.arcs.{inner,outer}.direction`, `.duration_ms`, `.repeat` | FIGMA + YAML / UNRESOLVED | Preserve counter-rotation; propose inner `counterclockwise`, outer `clockwise` to match current signs, with one approved duration and linear easing. Freeze duration until Q4. Keep `repeat: infinite` as declared runtime intent, not verified Figma behavior. | Current YAML says the reverse; timeline and endpoint times also disagree. |
| Tick has no animation tracks/styles | `3:27` | S | top-level `status_tick` (second block) | YAML-ONLY / UNRESOLVED | Do not duplicate `component.status_tick`. Treat blink intent separately from error/warning/click sources; Q4 decides removal from this visual spec or a semantic `component.motion.status_tick` declaration. Keep runtime scheduling/response handling in TypeScript. | 250 ms on/off and 3/2/1 responses have no live Figma evidence or matching runtime implementation found in scope. |

Measured rotation tracks are linear: inner pivot `0 → +360°` from `0 → 10.14154 s`; outer top/left `0 → -360°` from `0 → 10.14154 s`; outer right endpoint `10.149182 s`; outer bottom starts `-0.007642 s`, ends `10.14154 s`. Root timeline duration is `10 s`. Positive Figma motion rotation is counterclockwise. Record these as evidence, **not** as five new YAML timing tokens. Proposed normalization after Q4: one `theme.motion.scanner_rotation_ms`, both assemblies with the same approved full-turn interval and shared center. A 10000 ms interval is a plausible proposal, not an accepted value or permission to shorten/change the animation. No keyframe arrays, renderer-specific easing code, or state-machine transitions belong in YAML.

### Title block and viewport

| Figma path/name | Figma node ID | YAML file | YAML path/name | Classification | Proposed action | Reason |
|---|---|---|---|---|---|---|
| B > Title / Heading Placeholder | `3:28` | B | `component.title` | FIGMA + YAML / RENAME | Name `title_block.title`; retain `source: view.title`; change color reference to cyan accent-primary, add `effect: accent_glow`. Typography `heading`. | White text-primary would not match the cyan glowing heading. |
| B > Title / Subtitle Placeholder | `3:29` | B | `component.subtitle` | FIGMA + YAML / RENAME | Name `title_block.subtitle`; retain `view.subtitle`; muted text, typography `subtitle`. | Code supplies text; Figma supplies styling. |
| B > Title / Angular Rule | `3:30` | B | `component.divider` | FIGMA + YAML / RENAME | Rename `title_block.divider`; retain semantic divider, enabled flag and angular style. Replace parent `asset`, `color`, `stroke_width` with the two named child definitions below, each owning its asset/color/stroke. | YAML name is canonical, but current single-style declaration is overloaded. |
| B > Title / Angular Rule > Title / Angular Rule / Path | `3:31` | B | new `component.divider.rule` | FIGMA + YAML / SPLIT | Name/asset `title_block_divider_rule`; width 278, path bounds height 6 at `(0,4)` within divider, border-strong, 1 centered stroke. | Full angular rule; must remain distinct from bright 44-unit accent. |
| Same duplicate Figma path/name as above | `3:32` | B | new `component.divider.accent` | FIGMA-ONLY / CREATE-IN-YAML | Name/asset `title_block_divider_accent`; horizontal 44-unit segment at `(0,10)`, cyan, 2 centered stroke. Move parent color/stroke overrides down into `rule` and `accent`. | Different length, geometry, stroke and role; never merge by duplicate layer name. |
| B vertical placement | `3:28`, `3:29`, `3:30` | B | `component.layout.gap`; new child `layout` offsets | FIGMA + YAML / SPLIT | Preserve child positions `(0,0)`, `(1,37)`, `(0,56)` and divider envelope 278 × 12; replace one undifferentiated gap with measured spacing/offset roles. | Heading height 30 and subtitle height 15 yield unequal 7- and 4-unit gaps, plus a 1-unit subtitle inset. |
| V > Viewport / Panel Surface | `3:33` | V | `component.appearance.surface` | FIGMA + YAML / RENAME | Name `viewport.appearance.surface`; Panel fill at opacity 1, add `effect: panel_depth`. | Actual bound paint is opaque; do not resurrect an earlier intended 0.78 opacity. |
| V > Viewport / Clipped Cyan Border | `3:36` (path `3:37`) | V | `component.appearance.accent_border` | FIGMA + YAML / RENAME | Name `viewport.appearance.accent_border`; asset `viewport_clipped_border`, cyan, 1.6 centered stroke, 286 × 500, 18-unit corner cuts in asset. | One clipped border exists, not two concentric border layers. |
| No extra standard viewport outline | — | V | `component.appearance.border` | YAML-ONLY / REMOVE-FROM-YAML | Candidate: remove this enabled standard-border declaration; retain `accent_border` and surface effect. | Surface `3:33` has no stroke. A second generic border would add unrepresented visual structure. |
| V > Viewport / Accent Top Left; Accent Top Right; Accent Bottom Left; Accent Bottom Right (each prefixed `Viewport /`) | `3:39`/`3:40`; `3:41`/`3:42`; `3:43`/`3:44`; `3:45`/`3:46` | V | `component.accents.{top_left,top_right,bottom_left,bottom_right}` | FIGMA + YAML / RENAME | Assets/names `viewport_accent_top_left`, `_top_right`, `_bottom_left`, `_bottom_right`; retain each distinct geometry, cyan 3 centered stroke and existing black fill. Add explicit stroke/fill roles if renderer needs them. Envelopes 40 × 10; origins `(0,0)`, `(246,0)`, `(0,490)`, `(246,490)`. | Four placement-specific accents must remain individually addressable/exportable. |
| V > Viewport / Tactical Dot Grid | `3:34`/`3:35` | V | candidate `component.appearance.grid` | FIGMA-ONLY / UNRESOLVED | Record named asset and parent opacity 0.7; no active grid declaration until Q7. Child has no paint and no grid appears in the resting render. | Do not mistake an empty pattern import for an accepted new visible treatment. |
| V > Viewport / Entry Placeholder | `3:38` | V / Y | `component.content.slot`; new `component.content.typography` → `entry` | FIGMA + YAML / CREATE-IN-YAML | Rename `viewport.content.entry_placeholder`; add entry typography/default content style. Keep `slot: active_view`; sample text is not a generic viewport instruction for every route. | Capture text-entry role is meaningful; input state/editing remain application concerns. |
| V content inset | `3:38` | V | `component.content.padding` | FIGMA + YAML / UNRESOLVED | Evidence supports left 20 and top 22. Right/bottom padding cannot be inferred from a short placeholder; leave unresolved pending content/layout approval. | Do not invent a symmetric inset or infer scroll behavior from static text. |

## 4. Navigation rail and action dock

### Rail mappings and states

Within each exact `Rail Button / <Title> / Target <Title> Viewport` frame, base/light/label names below are prefixed `Rail Button / <Title> /`. New uses `Target New Viewport`, even though its YAML target is `capture_view`. That naming mismatch is not evidence for inventing a new application route.

| Figma path/name | Figma node ID | YAML file | YAML path/name | Classification | Proposed action | Reason |
|---|---|---|---|---|---|---|
| N > Rail Button / New / Target New Viewport | `39:6` | N | `component.items[id=new]` | FIGMA + YAML / RENAME | Name `navigation_rail.items.new`; first item, retain `target: capture_view` as a semantic binding. | NEW is a visual label for existing capture workflow, not the Add action. |
| N > Rail Button / Log / Target Log Viewport | `39:7` | N | `component.items[id=log]` | FIGMA + YAML / RENAME | Name `navigation_rail.items.log`; second item, retain `log_view`. | Match accepted visual order. |
| N > Rail Button / Search / Target Search Viewport | `39:8` | N | `component.items[id=search]` | FIGMA + YAML / RENAME | Name `navigation_rail.items.search`; third item, retain `search_view`. | Keep Search distinct from Settings. |
| N > Rail Button / Graph / Target Graph Viewport | `39:9` | N | `component.items[id=graph]` | FIGMA + YAML / RENAME | Name `navigation_rail.items.graph`; fourth item, retain `graph_view`. | Do not reverse the visual list to preserve draft YAML order. |
| Each rail item frame | `39:6`, `39:7`, `39:8`, `39:9` | N | new `component.item_size`, `component.layout.padding`; existing `.gap` | FIGMA + YAML / CREATE-IN-YAML | Add width 60, height 135; gap 9; padding top 9, bottom 8, left/right 0. Preserve orientation vertical. | Dimensions are repeated visual constraints, not glyph-derived sizes. |
| New/Log/Search/Graph > Base Shape > Vector | `42:2`/`42:3`; `42:8`/`42:9`; `42:14`/`42:15`; `42:20`/`42:21` | N | `component.styles.default.base`; new `.asset` | FIGMA + YAML / SPLIT | Base-frame names `navigation_rail.items.<id>.base`; shared asset role `navigation_button_plate`, 60 × 135, 8-unit chamfers, Panel opaque fill, 1 centered stroke. Standard stroke border-strong; New stroke action accent Orange. Add New item overrides rather than changing global default. | Clipped shape is not a rounded rectangle. New's permanent accent differs from selection. |
| New/Log/Search/Graph > Active Light > Vector | `42:4`/`42:5`; `42:10`/`42:11`; `42:16`/`42:17`; `42:22`/`42:23` | N | `component.styles.active.active_light` | FIGMA + YAML / SPLIT | Names `navigation_rail.items.<id>.active_light`; full 60 × 135 clipped overlay, not a narrow indicator strip. Standard: fill `#30C4CC` at 1 opacity, stroke `#3DDEE5` width 1, active-cyan effect. Add `asset`, `stroke`, `effect` and size-token references. New's exception is Q5. | Base plate and overlay remain separate rendering roles even though their silhouettes match. |
| Log/Search/Graph > Default Label Placeholder | `42:12`, `42:18`, `42:24` | N | `component.styles.default.label` | FIGMA + YAML / RENAME | Names `navigation_rail.items.<id>.label.default`; text-muted. Apply per-length typography roles listed in section 7, retaining centered vertical character stacking. | One literal string plus styling, not an icon. |
| New/Log/Search/Graph > Active Label Placeholder | `42:7`, `42:13`, `42:19`, `42:25` | N | `component.styles.active.label`; New item override | FIGMA + YAML / RENAME | Names `navigation_rail.items.<id>.label.active`; New Orange; standard active label `#2A5A6E` in current Figma. Do not replace that with cyan automatically. | Hidden active text was edited and differs from earlier design. State-specific text color is significant. |
| No default New label; active New label visible with light hidden | missing old `42:6`; existing `42:7`, `42:4` | N | `component.items[id=new].styles` | FIGMA + YAML / UNRESOLVED | Keep one code-supplied label and semantic state styling in YAML; do not recreate a missing duplicate text layer. Q5 determines state presentation. | Layer visibility is an authoring snapshot, not the active route state. |
| No Settings rail button/icon | — | N | `component.items[id=settings]` | YAML-ONLY / REMOVE-FROM-YAML (conditional) | Candidate removal from **this four-button visual rail only**, blocked by Q1 until Settings remains independently reachable. Do not delete `settings_view`, the `/settings` route, or screen. | Unsupported fifth button conflicts with preserved application semantics. |
| No rail icons | — | N | `component.items[*].icon`, `component.styles.{default,active}.icon` | YAML-ONLY / REMOVE-FROM-YAML | Remove these visual declarations in a later approved minimum pass; keep label and target. Do not add graph/search/settings/log/new icons to Figma to satisfy the draft. | Current rail uses stacked text, not icons. |
| No rounded rail corners | base vectors above | N | `component.styles.default.base.radius` | YAML-ONLY / REMOVE-FROM-YAML | Remove radius reference; use clipped plate asset. | Radius is not interchangeable with an 8-unit corner cut. |
| Rail base remains underneath separate light overlay | `42:3`, `42:9`, `42:15`, `42:21`; active vectors above | N | `component.styles.active.base` | FIGMA + YAML / MERGE | Remove duplicate active-base fill/stroke overrides after transferring active paint/stroke intent to `component.styles.active.active_light` using its measured values. Inherit the default base and New item accent. | Figma implements selection as a separate overlay, not an additional changed base stroke; retaining both would double or thicken borders. |

All four light frames are currently hidden. New's visible label is Orange; there is no prototype-driven selection. Standard hidden active labels are Border Strong, not Cyan. New's hidden active overlay has literal `#F9C692` fill/stroke, stroke width 2, but uses the **cyan** active-light effect. These are current facts, not permission to recolor them. The earlier requirement that the light be slightly darker than the cyan border is satisfied by the standard overlay's `#30C4CC` versus `#3DDEE5`, but not by simply treating New's edited overlay as the same standard state. Q5 must resolve this discrepancy explicitly.

### Dock mappings

| Figma path/name | Figma node ID | YAML file | YAML path/name | Classification | Proposed action | Reason |
|---|---|---|---|---|---|---|
| D > Dock / Outer Bezel | `3:61`/`3:62` | D | `component.appearance.bezel` | FIGMA + YAML / RENAME | Name `action_dock.appearance.bezel`; asset `action_dock_bezel`; Surface fill at 0.82; border-strong, 1 centered stroke; 350 × 96 with 14-unit chamfers in asset. | Separate shape from the buttons it contains. |
| D > Dock / Camera Button Plate; Dock / Camera Icon; Dock / Camera Label Placeholder | `3:63`/`3:64`; `3:71`; `3:74` | D | new `component.items[id=camera]` | FIGMA-ONLY / CREATE-IN-YAML | Add first item `id: camera`, sample `label: CAMERA`, `icon: camera`; proposed action identifier `open_camera` must resolve to existing capture-from-camera behavior. Names `action_dock.items.camera.plate`, `camera`, `action_dock.items.camera.label`. | Actual Camera artwork and existing camera workflow are missing from YAML. |
| D > Dock / Gallery Button Plate; Dock / Gallery Icon; Dock / Gallery Label Placeholder | `3:65`/`3:66`; `3:75`; `3:79` | D | `component.items[id=gallery]` | FIGMA + YAML / RENAME | Second item; keep `open_gallery`, icon `gallery`; names `action_dock.items.gallery.plate`, `gallery`, `action_dock.items.gallery.label`. | Same semantic concept. |
| D > Dock / Location Button Plate; Dock / Location Icon; Dock / Location Label Placeholder | `3:67`/`3:68`; `3:80`; `3:84` | D | `component.items[id=location]` | FIGMA + YAML / RENAME | Third item; keep `attach_location`, icon `location`; names `action_dock.items.location.plate`, `location`, `action_dock.items.location.label`. | Preserve optional location, including unavailable/cancel behavior. |
| D > Dock / Add Button Plate; Dock / Add Icon; Dock / Add Label Placeholder | `3:69`/`3:70`; `3:85`; `3:87` | D | `component.items[id=add]` | FIGMA + YAML / RENAME + UNRESOLVED | Fourth item; names `action_dock.items.add.plate`, `add`, `action_dock.items.add.label`; retain Orange accent on stroke/icon/label. `open_add` is not proven equivalent to existing `commit()`; Q2 must resolve. | A plus shape does not identify the save or export workflow. |
| All dock plates | `3:63`, `3:65`, `3:67`, `3:69` | D | new `component.button_style.default.plate.{asset,size}` | FIGMA + YAML / CREATE-IN-YAML | Asset `dock_button_plate`, 72 × 62, 8-unit chamfers, Panel fill opacity 0.9, 1 centered stroke. Standard border-strong; Add Orange override. | Same chamfer family as rail but different aspect ratio and fill opacity. Do not reuse a stretched 60 × 135 path blindly. |
| Dock icons | `3:71`, `3:75`, `3:80`, `3:85` | D | `component.button_style.default.icon` | FIGMA + YAML / SPLIT | Size 32; standard color cyan and stroke 1.8; Add Orange, stroke 2.5. Preserve filled gallery-dot detail inside asset. | YAML's secondary-text icon color is not current artwork. |
| Dock labels | `3:74`, `3:79`, `3:84`, `3:87` | D | `component.button_style.default.label`; Add override | FIGMA + YAML / EXACT | Shared `dock_label`; standard text-muted, Add Orange. | Orange means an action-specific accent here, not an active/pressed dock state. |
| Dock measured positions | plate/icon/label IDs above | D | `component.layout`, new `component.button_style.default.layout` | FIGMA + YAML / CREATE-IN-YAML | Plate x `7,93,179,265`, y 8; icon x plate+20, y 23; label x plate, y 74, width 72. Inter-plate gap 14, left inset 7, right remainder 13. Keep measured offsets; don't combine `space_between` with a conflicting fixed gap. | Current layout is not perfectly symmetric. Icons were moved from earlier y 18 to y 23. |
| No Export icon or button | — | D | `component.items[id=export]` | YAML-ONLY / REMOVE-FROM-YAML (conditional) | Candidate removal from current mobile dock visuals only; retain portable-export requirement outside this visual mapping. Q2 decides future placement. Do not rename Camera or Add to Export without a separately approved action contract and artwork. | DEV-023 recognizes export but explicitly leaves the bottom-right replacement undecided. |
| No rounded dock plate/bezel | `3:62`, `3:64`–`3:70` | D | `component.appearance.bezel.radius`, `component.button_style.default.plate.radius` | YAML-ONLY / REMOVE-FROM-YAML | Remove radius references in favor of distinct clipped asset roles. | Chamfered geometry, not rounded rectangles. |
| No dock active variant | — | D | `component.button_style.active` | YAML-ONLY / REMOVE-FROM-YAML (visual candidate) | Do not apply speculative selected-state fill/stroke/label changes. Candidate removal of this visual block; retain runtime press/disabled semantics separately if required. | Persistent tab selection is not the same as a momentary dock action. No Figma active dock state exists. |

No native Figma component creation is required for the naming-only pass. Reusable component sets/variants could be a later approved library task, but are not necessary to reconcile these semantic mappings. `CREATE-IN-FIGMA` is therefore limited to proposed token/text/effect foundations in section 7; it does not justify new screens or controls.

## 5. Proposed YAML removals and unresolved visual candidates

The exact component-level candidates are in sections 3–4: extra viewport border, third status-item/indicator representation, rail icons, rounded-corner properties, unsupported dock active treatment, and conditional Settings/Export visual placements. These do not authorize removing application routes, actions, states, error handling, or accepted requirements.

Additional scaffold pruning should use the following explicit rules rather than filling every `TODO` with invented values:

| Figma path/name | Figma node ID | YAML file | YAML path/name | Classification | Proposed action | Reason |
|---|---|---|---|---|---|---|
| No distinct corresponding primitive | — | T | `theme.palette.neutral_100`, `.neutral_700`, `.cyan_300` | YAML-ONLY / REMOVE-FROM-YAML | Remove if still unreferenced after semantic remapping; do not synthesize an unused tonal ramp. Repoint `accent.bright` as described below before dropping cyan_300. | No separate observed value needs these steps. |
| No green visual token in live file | — | T | `theme.palette.green_500`; `theme.colors.accent.primary` green alias | YAML-ONLY / REMOVE-FROM-YAML + RENAME | Set general accent-primary to observed Cyan; remove unreferenced green primitive after status-color review. Do not carry green from the original screenshot into the current design. | All observed filled status dots are Cyan, while New/Add accents are Orange. |
| No warning/error sample in this Figma file | — | T / H | `theme.palette.{amber_500,red_500}`, `theme.colors.status.{warning,error}`, H inactive-state appearance | YAML-ONLY / UNRESOLVED | Preserve semantic warning/error/offline requirements as unverified runtime-state roles. Remove speculative **visual assignments** only if no approved consumer needs them; do not assign production colors or create Figma variants solely to fill TODOs. | Lack of Figma state does not eliminate runtime failure states; current TS has warning styling outside this HUD. |
| No distinct rendered examples | — | T | `theme.colors.surface.{elevated,active}`, `theme.colors.text.disabled`, `theme.opacity.{disabled,muted,secondary}`, `theme.radius.{small,medium,large}` | YAML-ONLY / REMOVE-FROM-YAML (conditional) | Do not populate by guesswork. Remove unused scaffold after mappings; keep any role with a proven application consumer unresolved rather than erasing semantics. Use explicit screen radius and measured opacity roles below instead. | Generic scale steps are not themselves accepted visual design. |
| No distinct timing presets | — | T | `theme.motion.{fast_ms,standard_ms,slow_ms}`, `theme.motion.easing.{standard,enter,exit}` | YAML-ONLY / REMOVE-FROM-YAML | Replace unreferenced generic motion scaffold with only approved scanner timing/easing; preserve separately approved interaction intent if identified. | Existing animation provides a specific rotation, not an enter/exit transition system. |
| No demonstrated styled consumer | — | Y | `typography.styles.{body,technical}` | YAML-ONLY / UNRESOLVED | Keep only if an identified application-content role requires them; do not map unused Figma library styles automatically. `entry` is the observed capture-placeholder role; generic body need not be deleted as application semantics. | A font-family definition `fonts.technical` is necessary even if a same-named style is not. |
| Named but unpainted patterns | `3:35`, `3:90`, `3:92` | T | `theme.colors.atmosphere.{grid,scanline}` | FIGMA + YAML / UNRESOLVED | Retain unresolved until Q7; if minimum baseline explicitly excludes patterns, remove these unconsumed visual tokens without deleting Figma reference layers. | Construction names alone cannot establish visible color/opacity values. |

Delete no file, raw Figma layer, unused local Figma style, or local Figma variable in this harmonization pass. “Remove” above refers to a proposed future YAML visual declaration, subject to approval and reference checking.

## 6. YAML-only semantics and Figma-only construction detail

### Application semantics to retain outside Figma

| Figma path/name | Figma node ID | YAML file | YAML path/name | Classification | Proposed action | Reason |
|---|---|---|---|---|---|---|
| Design file has no resolver | — | U / T | `ui.version`, manifest references; `theme.id`, `theme.mode` | YAML-ONLY / YAML-ONLY | Retain version 1, declarative references, theme identity and dark mode. | Configuration identity does not require a corresponding layer. |
| All six semantic frames | `2:21`–`2:26` | component files | `component.id`, `component.type`, enabled fields | YAML-ONLY / YAML-ONLY | Keep component identity, renderer classification and visibility intent; repair typos, not semantics. | Figma node type FRAME is not a replacement for YAML `type: navigation`. |
| Title placeholders | `3:28`, `3:29` | B | `component.title.source`, `.subtitle.source` | YAML-ONLY / YAML-ONLY | Retain `view.title` and `view.subtitle`; code supplies final text. | Bindings are not literal Figma strings. |
| Generic content shell | `2:24` | V | `component.content.slot: active_view` | YAML-ONLY / YAML-ONLY | Keep active-view slot and separate route content. | Do not create four duplicate viewport designs solely because four targets exist. |
| Rail target frames | `39:6`–`39:9` | N | `component.items[*].target` | YAML-ONLY / YAML-ONLY | Retain targets; proposed integration mapping: `capture_view` → existing `capture` destination `/capture`; `log_view` → `log` `/`; `search_view` → `search` `/search`; `graph_view` → `graph` `/graph`; preserve `settings_view` → `settings` `/settings`. | Actual route map lives in AppShell TypeScript; YAML strings do not currently implement it. |
| Dock icons/labels | `3:71`, `3:75`, `3:80`, `3:85` | D | `component.items[*].action` | YAML-ONLY / YAML-ONLY | Preserve `open_gallery`, `attach_location`, unresolved `open_add` and `open_export` as semantic intents pending action-contract decisions. Add camera intent only with existing behavior mapping. | Do not move callbacks/service calls into Figma or YAML. |
| Status display samples | `3:10`, `3:12`, `3:14`, `3:15` | H | item `state_source`, value sources, active/inactive state identity | YAML-ONLY / YAML-ONLY | Preserve runtime source intent, distinguish local archive readiness, network availability and backup state, and resolve TODO sources through Q3. | Current AppShell exposes local archive, last backup and backup status; it does not establish `system.online` as local archive health. |
| Static status tick plus declared responses | `3:27` | S | top-level `status_tick.responses.*.trigger` | YAML-ONLY / UNRESOLVED | Treat `state.error`, `state.warning`, `event.click` as proposed semantic bindings, not deletion candidates merely because no Figma event exists. Their acceptance and blink treatment remain Q4. | State derivation, scheduling, response priority and repeat counting belong to TypeScript. |
| Font roles | text IDs in section 7 | Y | `typography.fonts.*.fallback`, style `transform` | YAML-ONLY / YAML-ONLY | Keep fallback intent; do not invent Figma fallback layers. Preserve uppercasing of UI labels only; never uppercase journal input because its placeholder is uppercase. | Runtime font availability, localization and user content require separate handling. |

Actual application behavior to protect during a later renderer integration: Settings access and Search separation; Log/entry/entity routing; capture commit and draft clearing only after successful save; attachments and location; backup/telemetry truth; keyboard avoidance and focus; safe-area/handedness layout. No inspection here establishes that all those flows pass. Export remains an accepted product requirement with an undecided UI workflow under DEV-023.

### Construction details to keep outside YAML

| Figma path/name | Figma node ID | YAML file | YAML path/name | Classification | Proposed action | Reason |
|---|---|---|---|---|---|---|
| Icon child paths: database, cloud, camera, gallery, location, plus | `3:5`, `3:6`, `3:8`, `3:72`, `3:73`, `3:76`–`3:78`, `3:81`–`3:83`, `3:86` | H / D | corresponding `icon.asset` or `icon` identifier only | FIGMA-ONLY / FIGMA-ONLY | Keep path geometry/fill details in each exportable icon asset. Optional within-asset child names may identify body/lens/dot, but no new YAML hierarchy is required. | Internal paths do not have independent application roles. |
| Clipped borders, bezel paths, four corner-accent paths, rail/dock plate vectors | exact IDs in sections 3–4 | H / B / V / N / D | named asset references only | FIGMA-ONLY / FIGMA-ONLY | Keep path commands and construction bounds in vector sources. Preserve role-specific paint/stroke overrides only where semantically needed. | YAML should not become an SVG language. |
| Inner arc pivot and outer arc envelopes | `24:2`, `3:19`, `3:21`, `3:23`, `3:25` | S | `component.motion.arcs.center` semantic only | FIGMA-ONLY / FIGMA-ONLY | Preserve envelope/registration points through export and renderer implementation. Do not serialize Figma matrices or per-node keyframe tracks into YAML. | Required transform mechanics differ from declarative rotation intent. |
| Imported SVG wrapper frames | e.g. `3:2`, `3:30`, `3:36`, `42:2` | all asset consumers | no wrapper fields | FIGMA-ONLY / FIGMA-ONLY | Do not reproduce wrapper “white fill” metadata as extra white rectangles in React Native. Use observed asset rendering as baseline. | Metadata reports default wrapper paints not visible as standalone white panels in the screenshot. |
| Duplicate label construction | `42:12`/`42:13`, `42:18`/`42:19`, `42:24`/`42:25` | N | single item label plus default/active style | FIGMA-ONLY / FIGMA-ONLY | Keep Figma state layers independently named; renderer can use one text node with state styling. Keep user-supplied string normal, derive visual stacking. | Duplicated text layers are not duplicated application strings or accessibility labels. |
| Unused local styles/variables | listed in section 7 | T / Y | none unless consumed | FIGMA-ONLY / FIGMA-ONLY | Keep unused local foundations without forcing YAML entries or deleting them. | Library inventory is not automatically an accepted screen requirement. |

The title divider is the exception to treating all child paths as irrelevant: `3:31` and `3:32` materially differ in geometry, stroke and role, so section 3 explicitly gives each an identifier. The shared chamfer family likewise does not justify merging a dock button, navigation button, or outer bezel into one asset.

## 7. Token and style normalization

### Colors and variable names

The existing collection is `Captain's Log / HUD Colors` (`VariableCollectionId:2:2`), with mode `Default` (`2:0`). Preserve collection identity, mode and variable IDs. Proposed names use slash-separated YAML vocabulary, e.g. `theme/palette/cyan_500`. Values below are measured existing values, not a new palette. Alias semantic roles in YAML; create corresponding Figma semantic aliases only for consumers that need independently addressable roles. No additional color mode is proposed.

| Current Figma variable | Exact variable ID | YAML file | Proposed primitive path and value | Classification | Proposed semantic aliases / action | Reason |
|---|---|---|---|---|---|---|
| Background | `VariableID:2:3` | T | `theme.palette.background_900: '#070B12'` | FIGMA + YAML / RENAME | `theme.colors.background.primary` → this primitive. | HUD background. |
| Surface | `VariableID:2:4` | T | `theme.palette.background_800: '#0C121C'` | FIGMA + YAML / RENAME | `theme.colors.background.secondary` → this primitive; add `theme.colors.surface.bezel` → same. | Header/dock bezel fill, with separate opacity roles. |
| Panel | `VariableID:2:5` | T | `theme.palette.background_700: '#101826'` | FIGMA + YAML / RENAME | `theme.colors.background.elevated`, `theme.colors.surface.primary` → this primitive. | Viewport and button panel paints share RGB, not necessarily opacity. |
| Text | `VariableID:2:10` | T | `theme.palette.neutral_050: '#E8EEF4'` | FIGMA + YAML / RENAME | `theme.colors.text.primary` → this primitive. | Status value text, not heading. |
| Text Muted | `VariableID:2:11` | T | `theme.palette.neutral_300: '#8A9BB0'` | FIGMA + YAML / RENAME | `theme.colors.text.muted` → primitive; `text.secondary` may alias `text.muted` rather than duplicate RGB. | Subtitle, entry sample and default rail/dock labels. |
| Text Dim | `VariableID:2:12` | T | no required new YAML primitive | FIGMA-ONLY / FIGMA-ONLY | Existing `#5C6F86` has no inspected HUD paint consumer. Keep Figma variable; candidate remove unassigned `theme.palette.neutral_500` unless a real consumer is approved. | Do not populate a token merely because an unused variable exists. |
| Border | `VariableID:2:6` | T | new `theme.palette.border_500: '#1E3A4C'` | FIGMA-ONLY / CREATE-IN-YAML + RENAME | `theme.colors.border.standard` → primitive; `border.subtle` may alias standard only if needed. | Header divider; does not substitute for brighter button/bezel outlines. |
| Border Strong | `VariableID:2:7` | T | new `theme.palette.border_700: '#2A5A6E'` | FIGMA-ONLY / CREATE-IN-YAML + RENAME | `theme.colors.border.strong` → primitive; add `theme.colors.text.on_active_light` → same for standard hidden active labels. | Shared numeric value with distinct stroke versus text roles. |
| Cyan | `VariableID:2:8` | T | `theme.palette.cyan_500: '#3DDEE5'` | FIGMA + YAML / RENAME | `theme.colors.accent.primary` → primitive; border.accent, text.accent, atmosphere.glow → accent.primary. `accent.bright` can alias primary if retained; no invented brighter color. | Shared visual accent across status, scanner, title and outlines. |
| Active Light / Cyan | `VariableID:39:2` | T | `theme.palette.cyan_700: '#30C4CC'` | FIGMA + YAML / RENAME | `theme.colors.accent.dim` and new `theme.colors.surface.active_light` → primitive. | Darker cyan overlay must not alias the brighter border color. |
| Orange | `VariableID:2:9` | T | new `theme.palette.orange_500: '#F5A14A'` | FIGMA-ONLY / CREATE-IN-YAML + RENAME | Add `theme.colors.accent.action` → primitive; bind New/Add item accents to action, not global cyan accent or warning. | Action emphasis is distinct from warning state. |
| Active Light / Orange | `VariableID:39:3` | T | no required YAML value yet | FIGMA-ONLY / FIGMA-ONLY | Keep unused `#D88B38`; do not silently replace New's edited `#F9C692` paint with it. | Existing variable is not the current New overlay. Q5 governs. |
| New Active Light literal paint | `42:5` | T / N | conditional new `theme.palette.orange_300: '#F9C692'`; `theme.colors.surface.active_light_action` | FIGMA-ONLY / UNRESOLVED | If Q5 preserves current New active treatment, create this variable and alias, bind fill/stroke without changing 1 opacity or 2 stroke. Otherwise use only the separately approved replacement. | Do not force a literal into the wrong existing orange token. |

Bind literal matching colors on the actual paint-bearing descendants, not only their wrapper frames. Concrete targets: `3:3` fill/stroke; `3:5`, `3:6`, `3:8` strokes; `3:20`, `3:22`, `3:24`, `3:26` strokes; `3:31`, `3:32`, `3:37` strokes; `3:40`, `3:42`, `3:44`, `3:46` strokes; `3:62`, `3:64`, `3:66`, `3:68`, `3:70` fill/stroke; `3:72`, `3:73`, `3:76`, `3:77`, `3:81`–`3:83`, `3:86` strokes and `3:78` fill; `3:94`, `3:96` strokes; `3:97` fill; `42:7`, `42:13`, `42:19`, `42:25` text fills. Preserve all current alpha values when binding. `42:5` remains blocked by Q5.

Status semantic aliases `theme.colors.status.local`, `.online`, `.backup` may each resolve to Cyan for the currently represented filled state **after Q3**; matching color does not merge their distinct state sources. Unseen warning/error colors are not determined by this table.

### Typography: match rendered nodes, not mismatched library presets

All 18 current HUD text nodes have empty `textStyleId`. Current local style definitions are not applied: Display uses 32 line height while heading uses AUTO; Subhead uses Orbitron while subtitle uses Share Tech Mono; Label uses 18/10% while status uses AUTO/8%; Body uses 22 while entry uses AUTO; Rail uses 14/22/12% while current labels use three smaller size profiles. Applying these existing styles unchanged is unsafe.

Propose `typography.fonts.interface.family: Orbitron` and `typography.fonts.technical.family: Share Tech Mono`. Status, subtitle, entry and dock_label must use `font: technical`; heading and rail labels use `interface`. Keep runtime fallback declarations. Weight is 500 for Orbitron Medium, 600 for Orbitron SemiBold and 400 for Share Tech Mono Regular. Express letter spacing with an explicit unit (proposed percent objects), not an ambiguous bare number. AUTO line height should remain semantic `auto`, mapped by the renderer; do not infer a fixed line height from the current bounding-box height.

| Figma path/name / nodes | Exact node or style ID | YAML file | YAML property | Classification | Proposed values and Figma style action | Reason |
|---|---|---|---|---|---|---|
| H status text | `3:9`, `3:10`, `3:11`, `3:12`; `HUD / Label` = `S:b534b0dcbd2118ff8b37908c52329bc32a95a29e,` | Y | `typography.styles.status` | FIGMA + YAML / RENAME | technical, 12, 400, auto, 8%; rename/update unused Label style to `typography/status`, then bind these nodes. | Preserve measured text, not preset metrics. |
| B heading | `3:28`; `HUD / Display` = `S:b05b0406517fdc44084cbf6febc2627f58dcf051,` | Y | `typography.styles.heading` | FIGMA + YAML / RENAME | interface, 24, 500, auto, 18%; rename/update Display to `typography/heading`; bind heading. | Keep existing style ID where concept matches. |
| B subtitle | `3:29` | Y | `typography.styles.subtitle` | FIGMA + YAML / CREATE-IN-FIGMA | technical, 13, 400, auto, 14%; create `typography/subtitle` text style and bind. | Current `HUD / Subhead` has a different font/role; do not merge. |
| V entry sample | `3:38`; `HUD / Body` = `S:4b13621bb23155d9a039105fef0643198a2ddd5a,` | Y | `typography.styles.entry` | FIGMA + YAML / RENAME | technical, 15, 400, auto, 3%; rename/update Body to `typography/entry`, bind sample. Keep `transform: none` for entered content. | Same technical entry appearance, with corrected line-height metric. |
| N New/Log labels | `42:7`, `42:12`, `42:13`; `HUD / Rail` = `S:bc97b87777ac85fa5a38ed84000089224e36d382,` | Y / N | `typography.styles.rail_label`; rail item label typography | FIGMA + YAML / RENAME | interface, 12, 600, 20 px, 10%; rename/update Rail to `typography/rail_label`; bind these nodes. | Short-label profile; label box 36 × 60 at `(12,37.5)`. |
| N Search labels | `42:18`, `42:19` | Y / N | new `typography.styles.rail_label_search`; `component.items[id=search].styles.{default,active}.label.typography` | FIGMA-ONLY / CREATE-IN-YAML + CREATE-IN-FIGMA | interface, 9.5, 600, 17 px, 8%; create `typography/rail_label_search`; item overrides reference it. | Preserve 36 × 102 box at `(12,16.5)`; do not shrink other labels. |
| N Graph labels | `42:24`, `42:25` | Y / N | new `typography.styles.rail_label_graph`; `component.items[id=graph].styles.{default,active}.label.typography` | FIGMA-ONLY / CREATE-IN-YAML + CREATE-IN-FIGMA | interface, 10.5, 600, 18 px, 8%; create `typography/rail_label_graph`. | Preserve 36 × 90 box at `(12,22.5)`; distinct five-letter profile. |
| D labels | `3:74`, `3:79`, `3:84`, `3:87` | Y | `typography.styles.dock_label` | FIGMA + YAML / CREATE-IN-FIGMA | technical, 9, 400, auto, 8%; create `typography/dock_label`, bind. | Different size from status text. |
| HUD / Subhead, unused | `S:14e27af8bcf06456e8ef943143dc7b1f8f667186,` | Y | no new required style | FIGMA-ONLY / FIGMA-ONLY | Leave unchanged and unbound. | Library-only Orbitron 13/20/12% must not override the technical subtitle. |

Keep Figma placeholder text editable; no text outlining or rasterizing. Proposed UI-label transforms are uppercase for status/heading/subtitle/rail/dock, but the current Figma nodes use original text case with uppercase samples. Preserve sample strings and measure before/after style binding; do not add literal line-break characters to the canonical `NEW`, `LOG`, `SEARCH`, `GRAPH` labels in YAML. Add `component.label_layout: stacked_characters` to N for the visual presentation; TypeScript owns the accessible full-word label and rendering.

### Strokes, dimensions, spacing, radii and opacity

Do not round away the 1.5/1.6/1.8 differences or conflate stroke alignment. Proposed token paths below are exact. New Figma numeric variables should use corresponding slash names and specific scopes (stroke weight, width/height, gap, corner radius or opacity), not unrestricted all-scopes. Bind only properties where doing so preserves current values. Layout-specific coordinates stay in layout/component YAML; there is no need for an independent global variable for every x/y.

| Figma path/name / evidence | Figma node ID | YAML file | Proposed token path → value | Classification | Proposed consumers/action | Reason |
|---|---|---|---|---|---|---|
| Bezel/base strokes | `3:3`, `3:31`, `3:62`, `42:3`, `42:9`, `42:15`, `42:21` | T | `theme.stroke.thin: 1` | FIGMA + YAML / EXACT + CREATE-IN-FIGMA | Bind matching 1-unit centered strokes. For screen border, preserve inside alignment separately. | Most outlines share thickness, not necessarily color. |
| Inner arcs | `14:8`, `14:9` | T / S | new `theme.stroke.scanner_inner: 1.5` | FIGMA-ONLY / CREATE-IN-YAML + CREATE-IN-FIGMA | Replace scanner inner reference to generic medium with this role. | Distinct from 1.6 icon/viewport strokes. |
| Status icons, viewport outline | `3:5`, `3:6`, `3:8`, `3:37` | T / H / V | new `theme.stroke.fine_detail: 1.6` | FIGMA-ONLY / CREATE-IN-YAML + CREATE-IN-FIGMA | Bind these four stroke values; preserve centered alignment. | Repeated measured value. |
| Standard dock icons | `3:72`, `3:73`, `3:76`, `3:77`, `3:81`–`3:83` | T / D | new `theme.stroke.dock_icon: 1.8` | FIGMA-ONLY / CREATE-IN-YAML + CREATE-IN-FIGMA | Use standard icon style, not plus icon. | Visually meaningful icon weight. |
| Outer scanner ring; title accent | `3:16`, `3:32` | T / S / B | `theme.stroke.medium: 2` | FIGMA + YAML / EXACT + CREATE-IN-FIGMA | Ring inside, divider centered. New active overlay uses this only if Q5 approves its current stroke. | Width identity does not erase alignment/state distinction. |
| Plus icon | `3:86` | T / D | new `theme.stroke.action_icon: 2.5` | FIGMA-ONLY / CREATE-IN-YAML | Use Add item icon override; Figma float variable optional until reused. | Single distinct accent icon, not standard icon weight. |
| Outer arcs and viewport corner accents | `3:20`, `3:22`, `3:24`, `3:26`, `3:40`, `3:42`, `3:44`, `3:46` | T / S / V | `theme.stroke.heavy: 3` | FIGMA + YAML / EXACT + CREATE-IN-FIGMA | Bind measured 3-unit strokes. | Repeated thick accents. |
| Screen border | `2:27` | T / M | new `theme.radius.screen: 40`; keep `theme.radius.none: 0` where needed | FIGMA-ONLY / CREATE-IN-YAML + CREATE-IN-FIGMA | Bind screen radius; no small/medium radius aliases for chamfers. | Only demonstrated nonzero corner radius. |
| Status/dock icons | `3:4`, `3:7`; `3:71`, `3:75`, `3:80`, `3:85` | T / H / D | new `theme.dimensions.status_icon: 20`, `.dock_icon: 32` | FIGMA-ONLY / CREATE-IN-YAML + CREATE-IN-FIGMA | Reference sizes from icon consumers; do not merge icons with 20-unit typography spacing. | Repeated dimensions with specific roles. |
| Status dots | `3:14`, `3:15` | T / H | new `theme.dimensions.status_indicator: 8` | FIGMA-ONLY / CREATE-IN-YAML + CREATE-IN-FIGMA | Both diameter bindings. | Repeated circle diameter. |
| Rail/dock plates | `39:6`–`39:9`; `3:63`, `3:65`, `3:67`, `3:69` | T / N / D | new `theme.dimensions.navigation_button.{width: 60,height: 135}`, `.dock_button.{width: 72,height: 62}` | FIGMA-ONLY / CREATE-IN-YAML + CREATE-IN-FIGMA | Use base/active overlay and item-size references; keep shape geometry in assets. | Shared role sizes prevent base/light drift without merging aspect ratios. |
| Measured layout gaps/insets | `39:6`–`39:9`; dock plates; `3:28`–`3:30` | T / N / D / B | new `theme.spacing.rail_gap: 9`, `.dock_gap: 14`, `.title_to_subtitle: 7`, `.subtitle_to_divider: 4` | FIGMA-ONLY / CREATE-IN-YAML | Use exact role tokens instead of filling generic xxs…xxl with a guessed scale. Bind Figma gap variables only when containers actually expose corresponding auto-layout gaps; no forced auto-layout conversion in naming pass. | Current containers have `layoutMode: NONE`. |
| Header/dock paints and guide | `3:3`, `3:62`, `3:64`, `3:66`, `3:68`, `3:70`, `3:97` | T | new `theme.opacity.status_bezel: 0.72`, `.dock_bezel: 0.82`, `.dock_plate: 0.9`, `.rail_guide: 0.18`; existing `.full: 1` | FIGMA-ONLY / CREATE-IN-YAML | Component references replace literals. Use Figma numeric variables only where supported; retain paint alpha when binding color. | Opacity is not encoded by picking a darker RGB or applying a parent opacity to icon/text children. |
| Opaque viewport/rail fills | `3:33`, `42:3`, `42:9`, `42:15`, `42:21`, `42:11`, `42:17`, `42:23` | T / V / N | `theme.opacity.full: 1` | FIGMA + YAML / EXACT | Preserve actual paint opacity. | Earlier intended values 0.78/0.94/0.16 are not the current bound paints. |

Keep `theme.stroke.hairline` only as an intentional alias to thin if a consumer needs that role; do not create duplicate numeric primitives. Prune generic spacing `xxs,xs,sm,md,lg,xl,xxl` if they remain unconsumed after the explicit role mappings. Scanner dimensions (core 13, ring 54, tick 18 × 2) and viewport accents (40 × 10) may remain component-local measurements unless reused; tokenization must not become a second copy of every asset bound.

### Effects and motion

| Current Figma effect | Exact style ID / consumers | YAML file | Proposed YAML path | Classification | Proposed action and values | Reason |
|---|---|---|---|---|---|---|
| HUD / Neon Cyan Glow | `S:9cd5542a86f99dbbcfcd6235726e74a6eba4fbff,`; `3:18`, `3:28` | T / S / B | `theme.effects.accent_glow` | FIGMA + YAML / RENAME | Rename `theme/effects/accent_glow`; preserve drop shadow radius 8, offset `(0,0)`, spread 0, opacity 0.55, existing cyan color. Replace undefined `intensity` with explicit `opacity` (0.55). | One generic intensity scalar is insufficient to reconstruct the measured effect. |
| HUD / Panel Depth | `S:73d761a07d7fc1f755788c2cd2920eab0db2250f,`; `3:33` | T / V | new `theme.effects.panel_depth` | FIGMA-ONLY / CREATE-IN-YAML + RENAME | Rename `theme/effects/panel_depth`; preserve two named layers: `inner_shadow` black, opacity 0.65, radius 8, offset `(0,2)`, spread 0; `outer_glow` cyan, opacity 0.16, radius 14, offset `(0,0)`, spread 0. | Do not flatten depth and glow into one effect. |
| HUD / Active Cyan Light | `S:9da2af7daa30f8e205385792a63dfac38a22f461,`; `42:4`, `42:10`, `42:16`, `42:22` | T / N | new `theme.effects.active_light` | FIGMA-ONLY / CREATE-IN-YAML + RENAME | Rename `theme/effects/active_light`; drop shadow color `#30C4CC`, opacity 0.62, radius 10, offset `(0,0)`, spread 1. New's use is Q5. | Active effect is not the same as accent_glow. |
| HUD / Active Orange Light, unused | `S:04d0a1dcf1a0c70ce8750bfdf73a7b2865a98986,` | T | no required addition | FIGMA-ONLY / FIGMA-ONLY | Leave existing radius 10 / spread 1 / opacity 0.62 Orange effect unchanged and unused. | Do not attach it to New merely because its name sounds appropriate. |
| Scanner full-turn intent | motion IDs in section 3 | T / S | proposed `theme.motion.scanner_rotation_ms`, `theme.motion.easing.scanner_rotation` | FIGMA + YAML / UNRESOLVED | After Q4, one approved duration, easing `linear`; consumer references from `component.motion.arcs`. | No conversion of slight keyframe offsets into reusable design tokens. |

Existing glow RGB is stored approximately as `(0.239,0.871,0.898)`, while Cyan variable is `(61/255,222/255,229/255)`. They round to the same hex but are not bit-identical. Preserve existing effect RGB during naming-only work; binding effects to Cyan requires an explicitly accepted tiny rounding normalization and before/after visual comparison. Gradient stops in the atmosphere stay in the asset; a one-color variable cannot represent the complete wash.

## 8. Open questions requiring human approval

| ID | Decision required | Recommended minimum-preserving disposition | What must not happen automatically |
|---|---|---|---|
| Q1 | Where does Settings remain reachable if the mobile rail has four accepted buttons? | Preserve `/settings` and its separate destination; approve an access point before removing the fifth YAML visual item. The plan does not invent that access point. | Deleting Settings functionality or adding an unapproved fifth Figma button. |
| Q2 | Is the fourth dock action Add/commit, an Add menu, or Export? What happens to Camera? | Keep current Figma Camera/Gallery/Location/Add while action semantics are reviewed. Preserve existing capture commit. Export stays a first-class requirement, not an assumed replacement. | Relabeling Camera as Export, silently making `open_add` save a draft, or removing the only commit path. |
| Q3 | Does LOCAL / ONLINE represent local-store readiness or network availability? Which source drives each dot/value, and what do inactive states look like? | Use two visual rows with separate label/value/indicator roles. Preserve local, network and backup semantics as distinct concepts until the bindings are approved. | Treating ONLINE as proof of sync success or using network state as local persistence availability. |
| Q4 | Approve scanner rotation duration/directions and whether status_tick blink/error-warning-click behavior is a requirement. | Match current counter-rotation direction; approve one linear full-turn duration and common center. Consider 10000 ms only as an explicit proposal. Keep static tick unless blink is separately accepted. | Restoring the old 2-second animation or normalizing the 10-second mismatch without approval; adding a loading/error state machine in YAML. |
| Q5 | Preserve edited New active overlay `#F9C692`/2-unit stroke/cyan glow, or use the darker shared cyan light? Are dark active labels intentional? | Preserve current default appearance and New/Add Orange accent. Review hidden states explicitly; if the earlier darker-cyan requirement remains authoritative, approve New's overlay correction as a named visual change. | Recoloring hidden states to presumed defaults, equating Orange with “selected,” or recreating deleted New default text. |
| Q6 | Are notch/home artwork app decoration or Figma-only device chrome? Are canvas coordinates inclusive of safe areas? Is the 9/8 rail edge spacing accepted? | Preserve existing coordinates and system inset bindings while choosing a renderer policy. Leave device-only chrome out of app visuals if confirmed as reference. | Duplicating OS chrome, double-insetting the layout, or forcing 8.8-unit gaps without approval. |
| Q7 | Should currently unpainted grids/scanlines stay visually absent, or be restored? | Keep current visible appearance. Preserve Figma reference layers; no new rendered patterns until separately approved. | Inventing pattern geometry/density/color based only on layer names or the initial screenshot. |
| Q8 | Approve minimal semantic schema additions and font/style normalization, including typed spacing units and action/state overrides? | Approve the explicit paths in this plan; use current real files and in-place IDs. Keep runtime loader vs generated TS choice deferred. | Building a resolver, font delivery pipeline or generalized component library as an implicit part of normalization. |

## 9. Recommended execution order and verification gates

1. **Human review:** resolve Q1–Q8 or explicitly approve a safe subset. Record acceptance in a new DEVNOTES decision referencing this proposed record. Do not edit DEV-024 to change its historical status.
2. **Rebaseline:** re-read all affected YAML and Figma IDs, hidden states and token/style usage. Compare with this plan and preserve concurrent user edits. Capture a resting screenshot and motion evidence before changes. Stop if new evidence invalidates a mapping.
3. **Mechanical YAML repair only:** manifest paths/root spelling/case/reference typos first. Keep existing file locations. Validate syntax, unique keys, component IDs and file reference resolution (T0).
4. **Approve and encode semantic structure:** title divider split, two-row status roles, generic viewport shell, item-specific styles, asset identifiers and measured layout. Apply removal candidates only after checking all semantic references and associated approval conditions.
5. **Normalize tokens and typography:** resolve only evidence-backed values; preserve colors, paint alpha, stroke alignment and actual font metrics. Check every reference/type and reject unresolved TODO values from production resolution. Do not add unused palette ramps or states.
6. **Rename Figma in place:** use exact ID mappings; do not rebuild/reparent frames or convert them to component sets as a side effect. Normalize local variable names and bind supported literal paints. Create only approved semantic aliases/text styles/numeric variables. Preserve all graphical and active-state distinctions.
7. **Verify parity before runtime integration:** compare resting image and individual assets before/after. Inspect both hidden and default state styles without confusing static authoring visibility with runtime selection. After a separately approved motion correction, sample video frames to verify shared center, counter-rotation and seamless loop boundaries. Do not use a screenshot as proof of motion correctness.
8. **Stop for integration scope approval:** the resolver, SVG storage/registry, font delivery and renderer are a separate implementation decision. Under repository guidance, read the exact Expo v57 docs before writing application code. YAML normalization alone does not make the current app consume these specifications.
9. **Later integration verification:** T1 must exercise loading/reference resolution and rendering of semantic assets/states. T2 must check target/action mappings, Settings access, Add/commit/Export decisions, telemetry truth, draft/persistence/attachment flow, Log empty/chronological presentation and graceful location failure. T3 must cover supported form factors, handedness, keyboard-open layout, safe areas, text scaling, font fallback and regression behavior. Record executed procedures/results in TEST_LOG and follow-up disposition in DEVNOTES.

Verification remains pending for the proposed changes. The existing parse/read-only observations are analysis evidence, not runtime acceptance.

## 10. Risks and likely regressions

- **Loss of navigation or data-entry actions:** deleting unsupported visual items without preserving Settings and commit paths can remove working capabilities. Treat placement decisions separately from route/action semantics.
- **Paint changes during variable binding:** a COLOR variable's alpha can replace paint alpha. Viewport/rail are currently opaque; dock/header use specific translucencies. Do not apply one parent opacity to the whole control.
- **Typography drift:** existing unattached local styles have different font/line-height/tracking metrics. Binding them unchanged shifts text and can clip vertical rail labels. Keep all text as editable placeholders; preserve accessible full-word labels in code.
- **Overmerged assets:** identical names or similar chamfers do not imply equivalent geometry. Title strokes, button base/light, bezel/button, small/large arcs, and per-corner accents require distinct identifiers or roles.
- **Motion pivot/loop regression:** rotating exported fragments around their own cropped bounds reproduces the inner-arc bug. Timeline end offsets can also break loop continuity. Export envelope and shared-center registration must survive asset packaging.
- **Invented visual states:** standard dock active styling, extra borders, absent grids, guessed opacity/radius scales or auto-layout conversion can visibly redesign the accepted screen.
- **Misleading telemetry:** a beautiful status row must not imply that local storage, network and backup are the same state. Render unknown/failed data truthfully through approved state designs.
- **Fixed-canvas compression:** these are 390 × 844 measurements, not a responsive layout proof. Safe-area insets, keyboard, localization, Settings access and 9/8 edge padding need integration review.
- **Scope creep:** native Figma components, vector export/storage, schema compiler and runtime UI rebuilding are separate from semantic naming normalization. No repository files for those systems are implicitly authorized here.

## 11. Exact later change surface

### Repository files

The proposed **specification harmonization pass** is expected to edit only these existing files plus append-only records:

| Exact repository file | Expected later change |
|---|---|
| `src/ui/ui.yaml` | Three reference repairs; `layout` → `layouts`; no file moves. |
| `src/ui/theme.yaml` | Correct namespaces/references; measured primitive/semantic tokens; approved pruning; effects/dimensions/opacity/strokes. |
| `src/ui/typography.yaml` | Actual font roles/metrics, rail profile split, explicit spacing units; no final user-facing copy. |
| `src/ui/layout/mobile.yaml` | Region measurements, action_dock typo, approved chrome/atmosphere declarations; retain system inset bindings. |
| `src/ui/components/status-header.yaml` | Parse/root/nesting repair; two-row label/value/indicator model; divider and bezel/typography/paint definitions, with Q3 gates. |
| `src/ui/components/scanner.yaml` | Semantic asset IDs, dimensions/stroke distinctions, shared-center intent; Q4-approved motion/tick decisions only. |
| `src/ui/components/title_block.yaml` | Title styling, semantic divider name and distinct rule/accent definitions; spacing/offsets. |
| `src/ui/components/viewports.yaml` | Surface effect, one clipped border, four distinct accent assets, entry style; grid/content-padding questions gated. |
| `src/ui/components/navigation-rail.yaml` | Four-item visual order, size/gap/chamfer roles, default/active distinctions, per-item typography/action accent; preserve Settings semantics until Q1. |
| `src/ui/components/action-dock.yaml` | Camera inclusion, measured geometry/order/icons, Add accent; Q2-approved action contract and Export placement only. |
| `docs/DEVNOTES.md` | Append acceptance, implementation and/or unresolved disposition records; never rewrite historical entries. |
| `docs/TEST_LOG.md` | Append executed T0/T1/etc. evidence in the later implementation pass. Not edited by this analysis pass. |
| `docs/UI_HARMONIZATION_PLAN.md` | Optional approved execution notes/cross-links; preserve proposed-vs-accepted distinction. |

No changes to `docs/captains-log.yaml`, `package.json`, `src/theme/tokens.ts`, `src/ui/layout/NavigationRail.tsx`, `src/ui/layout/AppShell.tsx`, `src/ui/screens/CaptureScreen.tsx`, route files, services, or persistence are required for the **spec-only** normalization. Those concrete existing code paths were inspected to protect semantics and may need a separately scoped integration pass. This plan deliberately does not invent new resolver, asset-registry, SVG or generated-TypeScript filenames before their architecture is approved.

### Figma nodes, assets, styles and variables

All node mutations below mean in-place naming and approved token/style bindings, not deletion/rebuilding. Sections 2–4 give each exact current path, ID, YAML destination and proposed name. This list is the execution scope, not permission to mutate every descendant indiscriminately.

- Semantic frames: `2:21`, `2:22`, `2:23`, `2:24`, `2:25`, `2:26`; the HUD root `2:20` keeps its display name and dimensions.
- Header roles/assets: `3:2`–`3:15`, with icon subpaths retained as construction detail and the specific paint bindings listed in section 7.
- Scanner: ring `3:16`, core `3:18`, shared inner envelope `24:2`, segments `14:8`, `14:9`, outer arc frames/paths `3:19`–`3:26`, tick `3:27`. Motion changes are blocked by Q4 and target only `24:2`, `3:19`, `3:21`, `3:23`, `3:25` and root timeline `2:20` as explicitly approved.
- Title: text `3:28`, `3:29`, divider `3:30`, separately named rule `3:31` and accent `3:32`.
- Viewport: surface `3:33`, border `3:36`/`3:37`, sample text `3:38`, four accent frames/paths `3:39`–`3:46`. Grid `3:34`/`3:35` is Q7-gated; no graphical restoration by default.
- Rail: items `39:6`–`39:9`; bases `42:2`/`42:3`, `42:8`/`42:9`, `42:14`/`42:15`, `42:20`/`42:21`; active overlays `42:4`/`42:5`, `42:10`/`42:11`, `42:16`/`42:17`, `42:22`/`42:23`; labels `42:7`, `42:12`, `42:13`, `42:18`, `42:19`, `42:24`, `42:25`. Do not recreate absent `42:6`. New state values remain Q5-gated.
- Dock: bezel `3:61`/`3:62`, plates `3:63`–`3:70`, icon frames `3:71`, `3:75`, `3:80`, `3:85`, their specific paint-bearing children listed above, labels `3:74`, `3:79`, `3:84`, `3:87`. No Export asset or replacement control is proposed without Q2.
- Global artwork: screen border `2:27`, rail guide `3:97`, atmosphere `3:88`/`3:89`; empty pattern paths `3:90`, `3:91`/`3:92` remain Q7-gated; notch `3:93`/`3:94` and bottom indicator `3:95`/`3:96` remain Q6-gated.
- Color variables to rename in place: `VariableID:2:3`, `2:4`, `2:5`, `2:6`, `2:7`, `2:8`, `2:9`, `2:10`, `2:11`, `39:2` (all IDs here retain the `VariableID:` prefix). Keep `VariableID:2:12` and `VariableID:39:3` unchanged unless an approved consumer needs them. Collection/mode IDs remain unchanged. New semantic alias/numeric variable IDs do not exist yet; exact names/values are defined in section 7.
- Text styles: update/rename Display, Label, Body and Rail using the exact style IDs in section 7; create `typography/subtitle`, `typography/dock_label`, `typography/rail_label_search`, `typography/rail_label_graph`. Keep Subhead unchanged. Recheck external style consumers before altering any style definition.
- Effects: rename Neon Cyan Glow, Panel Depth and Active Cyan Light using exact style IDs in section 7; keep Active Orange Light unchanged/unused. Preserve effect values unless the explicitly described rounding or Q5 change is approved.

## Approval checkpoint

This is a proposed plan, not authorization to execute it. Review the mapping tables and record which Q1–Q8 decisions and normalization rows are approved. No Figma or YAML normalization changes have yet been executed. Stop here before harmonization.