# Phone sizing and Figma geometry audit

Date: 2026-09-13. Scope: inspection and report only. No application, YAML, generated code, SVG, or Figma edits were made during this audit.

Live sources: [portrait frame 2:20](https://www.figma.com/design/dFwk8LAWauplWqrOKaQplU?node-id=2-20) and [landscape frame 96:4](https://www.figma.com/design/dFwk8LAWauplWqrOKaQplU?node-id=96-4). Measurements below came from read-only Figma Plugin API queries and both frame screenshots. Coordinates are relative to the named parent or artboard, not the Figma page origin. Dimensions refer to logical design/layout units, not hardware pixels. Values are rounded to three decimals where necessary.

## 1. Excessive padding: confirmed cause

`fitHudArtboard` in `src/ui/layout/hudBehavior.ts:38` reads the available window size and subtracts safe-area insets, but caps scaling at 1:

```ts
Math.min(availableWidth / artboard.width, availableHeight / artboard.height, 1)
```

The screen size is detected. The cap prevents the HUD from growing to fill a larger phone. This is a consequence of my last implementation, not a failure of orientation detection.

Examples with no system safe-area insets, calculated from the current function:

| Window | Empty padding per side / top-bottom | Visible border inset per side / top-bottom |
| --- | --- | --- |
| 390 x 844 | 0 / 0 | 8 / 8 |
| 393 x 852 | 1.5 / 4 | 9.5 / 12 |
| 412 x 915 | 11 / 35.5 | 19 / 43.5 |
| 430 x 932 | 20 / 44 | 28 / 52 |
| 780 x 1688, exactly the reference aspect ratio | 195 / 422 | 203 / 430 |
| 932 x 430, landscape | 44 / 20 | 52 / 28 |

Figma already puts the outer border at `(8,8)` in both reference artboards. Adding another 8-unit margin around the complete reference artboard would double-count that inset at reference size. System safe areas can add further spacing and alter the usable aspect ratio; the figures above exclude them to isolate the scale-cap defect.

Proposed interpretation of the revised requirement:

- Use the phone's logical dimensions and account for safe areas explicitly.
- Allow uniform scaling both up and down. Use 390 x 844 for portrait and 844 x 390 for landscape.
- Keep the final visible outer border inset at 8 logical units, with extra letterboxing only on the axis that cannot be filled while preserving aspect ratio.
- Keep the 8-unit border inset outside the scaled artwork transform. Otherwise an 8-unit design inset becomes 8 times the scale and is no longer exactly 8 on the phone.
- Do not add an additional 8-unit margin around the existing inset border.

For example, filling a 430 x 932 usable area gives scale 1.10256 and approximately 0.718 units of extra vertical letterboxing. An independently maintained 8-unit border inset would give 8 at the sides and approximately 8.718 above/below, rather than the current 28 and 52.

This distinguishes a fixed phone-space inset from proportional asset geometry. The reference aspect ratio must be compared to a clearly defined area: usable safe area versus full display. Recommendation: keep interactive artwork inside the safe area and measure the 8-unit inset from that usable boundary. This is a proposed policy, not an implemented change or a measurement of the user's specific phone.

Native orientation currently follows `Dimensions.get('screen')`; fitting follows `useWindowDimensions()`. This avoids keyboard-induced orientation changes, but a keyboard-reduced window can still shrink the entire artboard. That behavior needs native observation; it should not be confused with aspect-ratio padding.

## 2. Main frame geometry

Notation: `(x, y, width, height)` in artboard coordinates. Current YAML is compared with live Figma.

| Region | Portrait Figma | Landscape Figma | Current YAML |
| --- | --- | --- | --- |
| Reference artboard | `(0,0,390,844)` | `(0,0,844,390)` | Matches |
| Status header | `(20,28,278,82)` | `(429,24,200,58)` | Matches both frames |
| Scanner | `(315,28,60,82)` | `(719,24,60,82)` | Portrait uses `(310,26,60,82)`: 5 left and 2 up; landscape matches |
| Title block | `(20,122,278,68)` | `(31,19,391,68)` | Matches both frames |
| Viewport / panel / border frame | `(20,206,286,500)` | `(23,73,630,299)` | Matches both frames |
| Navigation rail | `(315,206,60,500)` | `(673,122,155,238)` | Matches both frames |
| Settings menu target | `(315,127,60,50)` | `(712,122,77.5,27.5)` | Matches target frames; artwork differs below |
| Action dock parent | `(20,724,350,96)` | `(156.888,256.638,363.262,115.277)` | Matches parent frames; landscape bezel differs below |
| Dock handle | Absent | `(299,340,77.5,27.5)` | Matches |
| Outer border | `(8,8,374,828)` | `(8,8,828,374)` | Matches |

The portrait scanner difference was already recorded in DEV-2026-09-12-001 as a prior accepted-YAML-versus-live-Figma difference. It is real, but was not introduced by the last sizing change.

## 3. Confirmed asset and rendering discrepancies

| Item | Live Figma | Current implementation | Finding |
| --- | --- | --- | --- |
| Portrait menu artwork, node 88:7 | Frame 60 x 50; plate 60 x 49; bars 35 x 5 at local `(12,12)`, `(12,22)`, `(12,32)` | A 60 x 24 SVG with bars 20 x 2 at `(20,6)`, `(20,11)`, `(20,16)` | Correct hit target, stale smaller artwork |
| Landscape menu artwork, node 96:121 | Frame 77.5 x 27.5; bars 60 x 2 at `(9,8)`, `(9,13)`, `(9,18)` | The same portrait SVG stretched to 77.5 x 27.5; resulting bars about 25.833 x 2.292 | Width/position of bars does not match Figma |
| Landscape viewport outline, node 96:51 | 630 x 299 path with corner offsets approximately 17.644 horizontal and 36.492 vertical | A 286 x 500 portrait outline stretched to 630 x 299; corner offsets become approximately 39.650 and 10.764 | Matching bounding boxes conceal substantially different corner geometry |
| Landscape dock bezel, node 96:83 | Bezel remains 350 x 96 inside the 363.262 x 115.277 parent | Bezel now fills the entire parent | My last change incorrectly equated parent size with artwork size; it stretches the bezel about 3.79% horizontally and 20.08% vertically |
| Landscape status header, node 96:10 | No angular bezel child; visible cloud/text/indicator/divider | Inherits `status-angular-bezel.svg` and draws it at 200 x 58 | Extra decoration absent from the live landscape design |
| Landscape title divider, node 96:44 | Rule steps downward into its middle section | Portrait rule is scaled from 278 x 12 to 351 x 18 and steps upward into its middle section | Correct containing rectangle, wrong path shape |
| Landscape NEW button artwork, node 96:63 | Base artwork 154 x 55 inside a 155 x 55 target | SVG is correctly 154 x 55, but rendered with the generic button bounds of 155 x 55 | Artwork is stretched 1 unit wider; target and shape need separate bounds |
| Portrait heading text box, node 3:28 | 231 x 30 | YAML declares 278 x 30 | Text container differs by 47 in width; this is separate from the 278-wide title-block parent |
| Portrait GRAPH label, node 42:24 | Local y=29, height=90 | Centered in a 155-high button, nominal text-block y=32.5 | Vertical position differs by approximately 3.5; centering is not the Figma text offset |

Files involved: `HudShell.tsx`, `HudArtwork.tsx`, portrait/landscape component YAML, and the menu, viewport-border, status-bezel, title-rule, and landscape-NEW SVG assets under `assets/hud/`.

Both Figma heading nodes use Orbitron Medium, size 24, 18% tracking. YAML's size 24 and tracking 4.32 agree with those numerical settings. The Figma screenshots display the full NEW RECORD title, while the prior browser screenshot showed landscape truncation. React Native uses `numberOfLines={1}` in a 231-wide box; exact font metrics and text overflow therefore need a separate check before merely copying text-box widths. No native text measurement was performed in this audit.

## 4. Viewport content is not the viewport frame

The live Figma viewport frame and panel are definitively 286 x 500 in portrait and 630 x 299 in landscape. Those are outer panel dimensions.

Figma contains an entry-placeholder text node at local `(20,22,137,17)` in both viewports. It does not declare a full-sized runtime text-input/scroll-container rectangle. The app's inner content box is therefore an implementation choice, not a direct measurement of that placeholder.

Current content values:

- Portrait YAML: `(20,22,246,456)`, leaving 20 units horizontally and 22 vertically on each side.
- Landscape generated runtime data: `(20,22,590,238)`, leaving left/right 20, top 22, bottom 39.
- Landscape working YAML, edited since my previous implementation: `(20,22,630,299)`.

The last value uses the outer panel's full width/height after adding an inner offset. Its right edge is 650 inside a 630-wide panel, and its bottom edge is 321 inside a 299-high panel: overflow of 20 right and 22 bottom. Regenerating this value without resolving the content inset would introduce that overflow into runtime data.

`node scripts/generate-ui.mjs --check` currently fails with `Stale generated file: uiSpec.ts`. The generated content dimensions are still 590 x 238, so the working YAML edit is not yet consumed by the app. I did not regenerate or undo the edit.

If symmetric 20/22 content insets are intended, a landscape content box would be 590 x 255. That is a derived candidate, not a Figma-provided size. Any space reserved for the dock handle must be specified separately and deliberately.

## 5. Differences that must not be corrected blindly

- **Scanner core:** Figma's circle is 13 x 13 at local `(23.5,31.5)`. Its render bounds include an 8-unit glow on each side, producing a 29 x 29 SVG at `(15.5,23.5)`. The YAML is correct for that exported asset. Replacing 29 with 13 would shrink the actual circle and glow incorrectly.
- **Landscape bottom-left viewport accent:** frame 96:57 is empty and measures approximately `(19.720,243.763,41.516,12.008)`. The visible vector was moved outside that frame into sibling node 96:58 at `(0,275.457,41.516,23.543)`. YAML follows the visible path's bounds. The differing empty frame is not reliable artwork geometry.
- **Landscape top-right accent:** frame 96:55 is also empty; the visible vector is sibling 96:56. Exporting the empty frame would lose the accent.
- **Navigation button positions:** portrait offsets `[0,172,343]` and landscape offsets `[43,113,183]` match Figma. The general rail layout does not need replacement.
- **Hidden dock:** the landscape dock parent is hidden in the default Figma frame. It was inspected without changing visibility; its parent size and bezel size are genuinely different.

## 6. Verification gap and proposed correction order

The earlier browser suite verified rendered regions against YAML. It did not prove that YAML or exported SVG paths matched current Figma. Its dock check incorrectly asserted that the bezel should fill its parent; that encoded the same mistaken assumption as the implementation.

Proposed work, awaiting review of this report:

1. Replace the scale cap with phone-responsive fitting and the single, final 8-unit border rule described above. Keep extra aspect-ratio buffer separate from safe-area insets.
2. Separate outer frames, visible asset bounds, glow/export bounds, and runtime content bounds in the specification.
3. Reconcile the known scanner position decision; update the two menu assets and landscape viewport/title/status rendering from actual visible Figma nodes.
4. Restore the landscape bezel to its measured 350 x 96 artwork bounds, and preserve the NEW artwork's 154 width inside its 155-wide target.
5. Resolve the landscape content inset before regenerating `uiSpec.ts`. Add containment validation for content rectangles.
6. Extend verification to fixed outer inset at multiple phone sizes, asset-specific bounds/path geometry, and Figma reference screenshots. Test on the actual phone, including safe areas and keyboard behavior.

No corrections have been applied as part of this report.
