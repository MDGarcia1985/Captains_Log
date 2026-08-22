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

One layout system, three breakpoints from `useWindowDimensions()`:

| Width | Mode | Panes |
| --- | --- | --- |
| < 600 | compact | primary + vertical rail |
| 600–899 | medium | primary + rail; context as overlay |
| >= 900 | expanded | nav + primary + context |

Handedness mirrors rail side, capture controls, tablet pane order, and inspector edge.

## Authentication

An account is required before use. Local archive credentials (`LocalArchiveCredential`) are stored on device and do not verify email ownership. Google authentication uses `expo-auth-session` with the client ID for the current platform only; that implicit token flow is prototype-only. Google Drive authorization is a separate `drive.file` scope and adapter concern.

## Backup and restore

Google Drive stores timestamped snapshots in a visible user-managed folder (`Captain's Log Backups`), not hidden application data. Retention keeps the newest 7 snapshots. Settings can list snapshots, restore one, and show post-restore integrity results. Local SQLite plus attachments remain canonical until the user restores.

## Out of Scope Here

Semantic search, graph databases, plugin runtimes, multi-device sync, YA, and MCP are deferred per the roadmap.
