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

`AppShell` selects the generated mobile portrait or landscape YAML once and shares
that layout and its capabilities with the HUD and route screens. Width thresholds
never replace this shell with another UI. Tablet YAML remains unsupported; larger
viewports use the corresponding mobile composition until a tablet design exists.

Native orientation follows `Dimensions.get('screen')`, subscribed to dimension
changes, so an Android keyboard shrinking the window cannot select landscape.
Web orientation follows window axes. Available window dimensions and safe-area
insets determine fitting separately from orientation selection.

The artboard retains its YAML coordinates at scale 1 whenever it fits. Smaller
windows shrink it uniformly. Unused space becomes centered background padding on
all sides; artboard regions are neither rearranged nor independently resized to fit
the window. Portrait handedness offsets are declared in portrait YAML. Landscape
handedness remains unchanged until designed.

Screen capabilities in `mobile.yaml` determine shell commands, entity navigation,
autofocus, and return-home behavior after capture. Rotation keeps the same shell and
route subtree mounted, preserving drafts. `scripts/hud-browser-test.mjs` mounts
`AppShell` and verifies geometry, old breakpoint boundaries, buffers, safe areas,
state preservation, and navigation. See DEV-2026-09-13-001 and
TEST-2026-09-13-001 through TEST-2026-09-13-006 for evidence and native test limits.

## Authentication

An account is required before use. Local archive credentials (`LocalArchiveCredential`) are stored on device and do not verify email ownership. Google authentication uses `expo-auth-session` with the client ID for the current platform only; that implicit token flow is prototype-only. Google Drive authorization is a separate `drive.file` scope and adapter concern.

## Backup and restore

Google Drive stores timestamped snapshots in a visible user-managed folder (`Captain's Log Backups`), not hidden application data. Retention keeps the newest 7 snapshots. Settings can list snapshots, restore one, and show post-restore integrity results. Local SQLite plus attachments remain canonical until the user restores.

## Out of Scope Here

Semantic search, graph databases, plugin runtimes, multi-device sync, YA, and MCP are deferred per the roadmap.
