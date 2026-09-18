# TASK-007 coordinate-space correction — 2026-09-18

The physical trace exposes mixed coordinate origins, not incorrect YAML geometry.
For a full-provider HUD, `obstructionInsets` must equal the provider's physical
safe-area distances, counted once in HUD-canvas coordinates.

## Evidence and semantics

Read the [Expo 57 documentation](https://docs.expo.dev/versions/v57.0.0/) and its
[safe-area-context reference](https://docs.expo.dev/versions/v57.0.0/sdk/safe-area-context/)
before changing code. The installed versions are React Native 0.86.2 and
react-native-safe-area-context 5.7.x.

- React Native `ReactCommon/react/renderer/dom/DOM.cpp::measureInWindow` includes
  the root viewport offset. On Android,
  `ReactAndroid/src/main/java/com/facebook/react/uimanager/RootViewUtil.kt::getViewportOffset`
  starts with `getLocationInWindow()` and, when RN's edge-to-edge feature flag is
  off, subtracts the status-bar/display-cutout left and top insets. This can yield
  negative coordinates even when the canvas begins at the physical window edge.
- safe-area-context `SafeAreaProvider.kt` gets its frame from
  `getFrame(rootView, this)`. `SafeAreaUtils.kt` uses
  `offsetDescendantRectToMyCoords` to produce native-root-relative bounds. It does
  not apply RN's viewport-origin subtraction.
- `getSafeAreaInsets(view)` reports the part of the provider overlapping system
  bars/cutouts. These are distances from the provider's edges, not translations
  to add to another measurement's negative origin.
- The old `hudUsableInsets` assumed both origins matched and calculated
  `provider.y + safe.top - host.y`. Thus `0 + 66.0513 - (-66.0513)` produced
  `132.1026`. The same defect affected left, and could erase right/bottom insets.

The trace is consistent with RN's content-relative viewport-origin branch. The
installed native source explains why the negative values already represent
extension under the bars. The phone's actual feature-flag state has not been
measured during this investigation, so the fix does not depend on guessing it.

## Runtime correction

The root `SafeAreaProvider` is the direct native parent of the HUD host: the
service/context providers, authenticated `AuthGate`, and `AppShell` introduce no
intervening native View. Consequently the host's `onLayout` x/y are explicitly
provider-relative. Preserve this hierarchy contract; a future native wrapper
would require an explicit conversion to provider coordinates.

`hudUsableInsets(hostSize, providerSize, insets, hostOriginInProvider)` now uses
one coordinate system. For example, top obstruction is
`max(0, safe.top - hostOriginInProvider.y)`, bounded by host height. Right and
bottom use the provider's width/height and the local host extents. Actual local
padding still reduces obstruction. Neither raw host window x/y nor provider
root-space x/y enters this calculation.

`useHudResolve` uses `onLayout` dimensions for the canvas and keeps all four
`measureInWindow` callback values together for diagnostics. Older callbacks
cannot overwrite newer diagnostic measurements. `HUD_RESOLVE` adds
`hostInProvider` and `obstructionCoordinateSpace` to make the distinction visible.
The unused legacy fitting hook uses the same corrected coordinate contract.

| Stable trace case | Correct obstruction |
| --- | --- |
| Portrait: window host y = -66.0513, safe top = 66.0513 | top = 66.0513 |
| Landscape: window host x = -66.0513, safe left = 66.0513 | left = 66.0513 |
| Landscape: window host y = -24.2051, safe top = 24.2051 | top = 24.2051 |

These values assume the host fills the provider at local origin (0,0). The existing
YAML safety buffer is applied later by the resolver; it is not part of physical
obstruction. Canvas translation, border geometry, and fixed control sizes do not change.

## Rotation and verification

The resolver returns `pending` with no new regions while host/provider axes
disagree with the selected orientation. A native portrait keyboard may shorten
the host past square only when its width still matches the current physical
screen. Web retains window-based orientation selection. HudDock also waits for
resolved geometry before consuming an orientation change, preventing a temporary
missing handle from triggering an unintended collapse animation.

Pure regressions cover both negative offsets, all four edges, real local padding,
nonzero provider frame origins, both stale-host transitions, reverse event order,
and native keyboard shortening. Browser hook regressions inject the exact negative
window measurements, hold host layout through both rotations, and deliver an old
callback after the new layout. The full browser harness also checks mounted draft
preservation and dock behavior.

YAML, generated geometry, and the Figma fixture were not edited for this correction.
Physical-device verification of the corrected bundle remains required. TASK-007
remains OPEN; automated browser evidence does not close the physical acceptance gate.
