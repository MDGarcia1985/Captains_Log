# TASK-007 full-window region classification

**Current direction: full-window anchored/flexible HUD. Runtime implementation pending this classification gate.**
This supersedes the whole-artboard uniform-fit approach described in
[TASK-007 historical report](TASK-007_REPORT_2026-09-14.md), specifically its fit model,
centering correction and aspect-ratio acceptance tests. TASK-007 remains OPEN. No commit.

## Authority and units

Figma supplies reference component bounds, fixed artwork dimensions and placement
relationships. YAML must declare the runtime anchors, stretch axes, flexible/fixed
dimensions, safe-area constraints, overflow behavior and orientation semantics.
390 × 844 and 844 × 390 are reference measurements only.

All table bounds are `x, y, width, height` in reference logical units. The source is the
live Figma read captured in `scripts/fixtures/task007-figma.json`, file
`dFwk8LAWauplWqrOKaQplU`, portrait root 2:20 and landscape root 96:4.
No Figma changes are proposed. The scanner exception is called out separately.

Classifications:
- FIXED: an internal asset/control retains its width and height.
- ANCHORED: a region retains its size and moves with named edges/other regions.
- STRETCH_X / STRETCH_Y / STRETCH_BOTH: only named dimensions consume available space.
  This does not authorize stretching fixed icons, typography, stroke widths or corners.

## Portrait classification

| Component | Figma reference bounds | Runtime classification | Fixed dimensions | Anchored edges / relationships | Stretch axis | Safe-area requirement |
|---|---|---|---|---|---|---|
| Root HUD canvas | 0,0,390,844 | STRETCH_BOTH | None | All four actual window edges | X,Y | No safe-area padding/translation of root |
| Background / atmosphere | 0,0,390,844 | STRETCH_BOTH | No component-size constraint | Covers root canvas | X,Y | Ignore insets; paint behind system areas |
| Outer border | 8,8,374,828; radius 40 | STRETCH_BOTH | 8-unit inset, stroke, corner radius | 8 from each actual window edge | X,Y | Ignore safe insets |
| Status header | 20,28,278,82 | ANCHORED | 278 × 82 | Leading top group; retain title/scanner spacing | None | Keep header group clear of top/side obstruction |
| Scanner | 315,28,60,82 | ANCHORED | 60 × 82; internal ring/core sizes fixed | Trailing edge; top-group relationship | None | Clear top/trailing obstruction |
| Title block | 20,122,278,68 | ANCHORED | 278 × 68; heading 231 × 30 | Leading; 12 below status-header bottom | None | Follows safe-adjusted top group |
| Settings menu | 315,127,60,50 | ANCHORED | 60 × 50 | Trailing; +5 from title top | None | Keep entire interactive target safe |
| Viewport | 20,206,286,500 | STRETCH_BOTH | Border/corner details; content edge insets | Leading 20; ends 9 before rail; 16 below title; 18 above dock | X,Y | Content stays between safe-adjusted surrounding regions |
| Viewport content | No separate authoritative Figma content node | STRETCH_BOTH | YAML insets L/R 20, T/B 22 | All viewport edges | X,Y | Scroll within remaining unobstructed space |
| Navigation rail | 315,206,60,500 | STRETCH_Y | Width 60; each button/label/artwork size | Trailing 15; top/bottom track viewport | Y | Targets avoid trailing/bottom system obstruction |
| Rail buttons | Three 60 × 155 targets; fixed inner artwork/labels | FIXED | Target/art/label dimensions | First at rail top, last at bottom, equal intervening gaps at reference | None; gaps flexible | Insufficient height requires explicit rail overflow policy |
| Action dock | 20,724,350,96 | ANCHORED (narrow policy pending) | 350 × 96; icons/text fixed | Bottom 24; centered horizontally | None under fixed classification | Keep target row above bottom/side system obstruction |
| Rail guide | 310,112,1,600 | STRETCH_Y | Width 1 | Rail-facing side; top-group to viewport-bottom relationships | Y | Decorative; follows resolved groups |
| Decorative notch | 135,4,120,8 | ANCHORED | 120 × 8 | Top-center, reference 4 | None | Decorative only; no synthetic safe-area reservation |
| Decorative home indicator | 148,834,94,6 | ANCHORED | 94 × 6 | Bottom-center, reference 4 | None | Decorative only; native system inset handled separately |

Portrait Left uses its existing explicit YAML composition, not a bitmap mirror:
fixed regions move to their declared leading/trailing sides, the rail anchors left,
and the viewport stretches between that rail and the opposite window edge. Fixed
icons/text retain orientation. No new intermediate composition is introduced.

**Scanner discrepancy:** Figma is (315,28); canonical YAML still contains (310,26) under
the explicit DEV-2026-09-12-001 exception. The classification is anchored/fixed either
way. The exception remains visible until superseded; it is not an aspect-ratio constraint.

## Landscape classification

| Component | Figma reference bounds | Runtime classification | Fixed dimensions | Anchored edges / relationships | Stretch axis | Safe-area requirement |
|---|---|---|---|---|---|---|
| Root HUD canvas | 0,0,844,390 | STRETCH_BOTH | None | All actual window edges | X,Y | No root inset/translation |
| Background / atmosphere | 0,0,844,390 | STRETCH_BOTH | No component-size constraint | Covers root canvas | X,Y | Paint behind system areas |
| Outer border | 8,8,828,374; radius 40 | STRETCH_BOTH | 8-unit inset, stroke, corner radius | Actual window edges | X,Y | Ignore safe insets |
| Status header | 429,24,200,58 | ANCHORED | 200 × 58; no inherited portrait bezel | Right edge 24 inside viewport right; top group | None | Safe top group; avoid trailing obstruction |
| Scanner | 719,24,60,82 | ANCHORED | 60 × 82 | +46 from rail left; top group | None | Keep top/right group safe |
| Title block | 31,19,391,68 | STRETCH_X | Height 68; heading 231 × 30 and typography | Leading 31; right ends 7 before status header | X, ornament/container only | Safe leading/top group; fixed heading must fit |
| Settings menu | 712,122,77.5,27.5 | ANCHORED | 77.5 × 27.5 | +39 from rail left; 16 below scanner bottom | None | Entire target in safe right group |
| Viewport | 23,73,630,299 | STRETCH_BOTH | Fixed corner/accent geometry and strokes | Leading 23; 20 before rail; reference top-group relationship; bottom 18 | X,Y | Content constrained by safe edges and dock/handle interaction |
| Viewport content | No separate authoritative Figma content node | STRETCH_BOTH | YAML insets L/R 20, T/B 22 | Viewport edges; scroll host clears collapsed handle | X,Y | Available content stays clear of obstruction |
| Navigation rail | 673,122,155,238 | STRETCH_Y | Width 155; targets 155 × 55, NEW art 154 wide | Trailing 16; top 16 below scanner; bottom 30 | Y | Right/bottom targets inside safe bounds |
| Rail buttons | 155 × 55 targets; reference offsets 0,92,183 | FIXED | Target/art/label dimensions | Rail top/bottom; flexible gaps preserving reference rounding | None; gaps flexible | Insufficient height needs declared overflow behavior |
| Action dock parent | 156.888,256.638,363.262,115.277 | ANCHORED | 363.262 × 115.277 | Centered on viewport with +0.519 reference center offset; bottom 0.085 above viewport bottom | None | Expanded targets avoid unsafe bottom/side areas |
| Dock bezel | Local 0,0,350,96 | FIXED | 350 × 96 | Dock parent origin | None | Follows parent |
| Dock handle | 299,340,77.5,27.5 | ANCHORED | 77.5 × 27.5 | X attached to dock; collapsed bottom 4.5 above viewport bottom; expanded above dock top | None | Interactive target safe; same assembled slide retained |
| Rail guide | 663,19,1,357 | STRETCH_Y | Width 1 | 10 before rail; top-group to bottom 14 | Y | Decorative; no root safe-area margin |

Landscape remains canonical Right. Left stays visible and disabled in Settings, and
portrait preference survives rotation.

## Safe-area resolution

The canvas and border always use the actual window rectangle. System safe areas
constrain the *content groups*, not a globally fitted or translated canvas.

Proposed YAML rule: preserve reference edge gaps where safe; move a group inward only
by the amount needed to clear an obstruction plus the declared 8-unit safety gap.
Preserve relationships inside that group. The flexible viewport/rail absorb the resulting
space change. Do not add every system inset indiscriminately to every reference coordinate.

Top header/title/scanner relationships are resolved together. Leading and trailing
groups honor their own safe edges. Bottom dock/rail constraints are resolved independently.
Content uses its own inset/scroll rules. Background and border do not inherit these shifts.

## Flexible artwork treatment

A flexible viewport must not simply stretch its complete SVG through contentFit=fill.
Keep the Figma corner vectors, accent sizes and stroke widths; extend only straight edge
segments and position corner/edge pieces at the resolved bounds. Fixed scanner, menu,
rail-button and dock artwork retain native logical sizes. A flexible landscape title rule
extends its straight segments while retaining fixed heading typography and end details.

## Classification conflicts requiring explicit policy

1. **Narrow portrait width:** the reference header/scanner row requires about 390 units
   to retain fixed widths and its reference gaps. A fixed 350-unit dock alone cannot fit
   inside a 320-unit window with the border inset. Therefore fixed reference composition,
   arbitrary narrow-window support, and zero overflow cannot all hold simultaneously.
   A dock-container/spacing contraction with fixed icons/height is proposed for narrow
   screens, pending the user's answer. Header treatment also needs a declared constraint
   or specific flexible container policy; it must not be guessed by reintroducing scale.
2. **Short rail height:** portrait targets total 465 units before gaps. A 500-unit
   reference rail has about 35 gap units, but shorter windows can leave less than 465.
   Gaps may contract to zero; beyond that the options are rail scrolling or an explicit
   smaller-target design. The proposed fallback is local rail scrolling, preserving
   controls and composition, subject to the canonical YAML decision.
3. **Landscape title width:** its container and ornament can flex, but a fixed 231-unit
   heading has a minimum width. A narrower main column needs an explicit text overflow
   policy; it must not resize the entire HUD.

These conflicts are why the replacement runtime has not yet been implemented. They do
not justify retaining the superseded fit model. The classification and policy decisions
must be clear before changing code, as requested.

## Implementation boundary once classification is settled

1. Replace family uniform-contain/letterbox semantics with full-window canvas rules.
2. Add canonical anchors, flexible dimensions, group safety and narrow/short constraints.
3. Resolve region rectangles from window/host bounds and YAML; remove global scale and
   artboard-centering transforms. Retain native screen-based orientation detection.
4. Render flexible edge/corner artwork, fixed components and assembled dock from those
   resolved rectangles. Keep route subtree and portrait preference intact.
5. Replace scale/letterbox acceptance tests with full-window bounds, fixed component
   sizes, flexible viewport dimensions, edge-inset and no-global-transform assertions.
6. Verify both orientations on the connected Motorola. Record actual window size,
   resolved regions, border clearances and remaining issues. Emulator/browser results
   remain separate. No claim of physical completion without that phone.

## Documentation status

DEV-2026-09-14-005 explicitly supersedes the incorrect whole-artboard assumption in
DEV-2026-09-14-001/-003/-004. Prior TEST_LOG entries remain historical evidence only;
their uniform-fit PASS results do not satisfy this replacement model.
No new runtime code has been written for this corrective direction. No commit.
