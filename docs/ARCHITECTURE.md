# Captain's Log — Architecture

## Purpose

This document records the implemented system architecture for the MVP. Product behavior is defined by `captains-log.yaml`. Implementation decisions are recorded in `DEVNOTES.md`.

## Runtime

- Expo SDK 57
- React Native + TypeScript
- Expo Router (`src/app`)
- Local SQLite via `expo-sqlite`
- Local attachment files via `expo-file-system`

Expo Router 57 locates routes in `src/app`. Domain code lives under `src/` with `@/` mapped to `src/`. Folder names follow the existing Expo template; dependency direction follows the product specification.

## Layers

```text
presentation (src/app, src/ui)
        ↓
application services (src/services)
        ↓
domain contracts + models (src/models)
        ↓
repositories / adapters (src/adapters)
        ↓
SQLite, filesystem, platform APIs, optional Google APIs
```

Rules:

- UI calls application services only.
- UI does not contain SQL, Google API calls, or other provider-specific logic.
- Domain types do not import adapters.
- External providers are reached through explicit interfaces and concrete adapters.
- There is no plugin registry, manifest, or dynamic loader.

## Module Map

| Area | Public surface | Implementation |
| --- | --- | --- |
| Entries | `EntryService` | SQLite `EntryRepository` |
| Entities / graph | `EntityService` | SQLite entity + relationship repositories |
| Attachments | `AttachmentService` | SQLite `AttachmentRepository` + filesystem storage + image picker |
| Search | `SearchService` | SQLite FTS5 |
| Settings | `SettingsService` | SQLite key/value |
| Auth | `AuthService` | `LocalArchiveCredentialProvider`, `GoogleAuthProvider` |
| Backup | `BackupService` | `GoogleDriveBackupProvider` (timestamped `drive.file` snapshots) |
| Location | `LocationService` | `ExpoLocationProvider` |
| Extraction | `ExtractionService` | Deterministic `ExtractionProvider` |

## Composition Root

`src/services/createAppServices.ts` constructs adapters and services. `AppServicesProvider` holds the composed object for the UI.

## Data Authority

Canonical state is local:

```text
SQLite database  +  managed attachment files
```

Google Drive is backup storage only. Derived entities and relationships are regeneratable and always store provenance (`source_entry_id`).

## Responsive Shell

> **TASK-007 corrective direction (DEV-2026-09-14-005):** the uniform-artboard fit
> described below is the current transitional implementation, now superseded as the
> intended model. The required replacement uses a full-window canvas, an 8-unit border
> at actual window edges, fixed/anchored controls and flexible content regions.
> Reference frame aspect ratios must not constrain runtime layout. Implementation
> awaits the explicit narrow/short-window policies in
> [the region classification](TASK-007_FULL_WINDOW_LAYOUT_2026-09-14.md).

`AppShell` selects the generated mobile portrait or landscape YAML once and shares
that layout and its capabilities with the HUD and route screens. Width thresholds
never replace this shell with another UI. Tablet YAML remains unsupported; larger
viewports use the corresponding mobile composition until a tablet design exists.

Native orientation follows `Dimensions.get('screen')`, subscribed to dimension
changes, so an Android keyboard shrinking the window cannot select landscape.
Web orientation follows window axes. The measured HUD host is intersected with the
safe-area provider rectangle in window coordinates to determine fitting separately
from orientation selection. Insets already consumed by a parent are not applied twice.
The loading root also registers measurement, so React Native Web observes it at mount.
Development-only `HUD_FIT` traces record the entire coordinate handoff and the legacy
window-based result for comparison on a connected phone; they contain no entry content.

The authorized artboard scales uniformly up or down to contain it in the usable safe
area. Aspect mismatch creates centered letterboxing only on the unfilled axis. The
outer border is drawn outside the artboard transform, 8 logical units inside the
fitted frame; there is no additional artboard margin. YAML declares the override,
square (default landscape), orientation-source and fitting policies. Parent regions,
artwork, export/glow envelopes, content rectangles and interaction targets remain
distinct. Portrait handedness offsets are declared in portrait YAML. Landscape YAML
supports only canonical right-handed geometry. Settings shows a disabled, dim Left
option and does not write the portrait preference; rotation back restores that preference.

Landscape dock assets remain mounted and finish loading before expansion. One parent
translation moves the dock and its attached handle together, using YAML's 240 ms
cubic-out transition (immediate with reduced motion). Figma defines the expanded dock
and collapsed handle rectangles; YAML attaches the expanded handle above the bezel.
The collapsed handle bottom defines the reveal clip. Geometry and preference regression
checks cover both directions and rotation during the dock's lifecycle.

Screen capabilities in `mobile.yaml` determine shell commands, entity navigation,
autofocus, and return-home behavior after capture. Rotation keeps the same shell and
route subtree mounted, preserving drafts. `scripts/hud-browser-test.mjs` mounts
`AppShell` and verifies geometry, old breakpoint boundaries, buffers, safe areas,
state preservation, and navigation. TASK-007 authority checks compare an independent
live Figma snapshot to canonical YAML/assets before comparing YAML to generated data.
The generator rejects content outside its panel before writing output. Figma owns
appearance; YAML owns meaning. See DEV-2026-09-14-001 and subsequent TASK-007 test records.

## Authentication

An account is required before use. Local archive credentials (`LocalArchiveCredential`) are stored on device and do not verify email ownership. Google authentication uses `expo-auth-session` with the client ID for the current platform only; that implicit token flow is prototype-only. Google Drive authorization is a separate `drive.file` scope and adapter concern.

## Backup and restore

Google Drive stores timestamped snapshots in a visible user-managed folder (`Captain's Log Backups`), not hidden application data. Retention keeps the newest 7 snapshots. Settings can list snapshots, restore one, and show post-restore integrity results. Local SQLite plus attachments remain canonical until the user restores.

## Out of Scope Here

Semantic search, graph databases, plugin runtimes, multi-device sync, YA, and MCP are deferred per the roadmap.
