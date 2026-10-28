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

TASK-007 implements a full-window HUD. Canonical TypeScript lives in
`src/ui/ts_layout/`. Canonical YAML lives in `src/ui/yaml_layout/`. The former
layout runtime and YAML trees are retired; do not recreate them. Planning, migration,
audit and roadmap notes live under `docs/planning/`.

`AppShell` selects the generated mobile portrait or landscape YAML once and shares
that layout, handedness, and capabilities with the HUD and route screens. Width
thresholds never replace this shell with another UI. Tablet YAML remains unsupported;
larger viewports use the corresponding mobile composition until a tablet design exists.

Native orientation follows `Dimensions.get('screen')`, subscribed to dimension
changes, so an Android keyboard shrinking the window cannot select landscape.
Web orientation follows window axes. The HUD host's `onLayout` rectangle is
intersected with the provider-local safe rectangle to obtain per-edge obstruction
insets. The host is a direct native child of the root `SafeAreaProvider`; intervening
context/auth components introduce no native view. `measureInWindow()` is diagnostic
only: Android's React Native viewport origin can already subtract system-bar/cutout
offsets, unlike the provider's root-relative frame. Mixing those origins doubles
obstructions. Rotation remains pending until host and provider match the selected
orientation; the native keyboard height exception retains screen-based selection.
Those insets
constrain named safe groups during region resolution; they do not translate or
letterbox the canvas. Development-only `HUD_RESOLVE` traces record host, insets,
status, provider-local host bounds and key rectangles; they contain no entry content.

`resolveHudLayout` consumes schema 3 `runtime_regions` plus merged components.
It ignores `reference_regions` for placement. There is no global uniform scale and
no artboard aspect lock. The canvas and background cover the actual window. The
outer border stays 8 logical units from actual window edges. Fixed controls keep
Figma sizes. Flexible viewport and rail regions absorb remaining space. Gaps
interpolate between declared min and preferred tokens. Portrait minimum window is
362 × 481; landscape minimum is 775 × 206. Below those floors the resolver reports
`unsupported_size` instead of inventing a layout or scaling the HUD. Short rails
scroll locally after gaps reach min. Portrait left-handed geometry is a horizontal
override of the same regions; landscape remains canonical right, with Left visible
and disabled in Settings.

Landscape dock assets remain mounted and finish loading before expansion. One parent
translation moves the dock and its attached handle together, using YAML's 240 ms
cubic-out transition (immediate with reduced motion). The Figma frame is the visible
bezel, 350 × 96. The handle is 77.5 × 27.5 and overlaps that bezel by 2.5. Canonical
expanded height is 121 without stretching internal artwork. Landscape still starts
collapsed, with the handle parked above the viewport bottom.

Screen capabilities in `mobile.yaml` determine shell commands, entity navigation,
autofocus, and return-home behavior after capture. Rotation keeps the same shell and
route subtree mounted, preserving drafts. `scripts/hud-browser-test.mjs` mounts
`AppShell` and verifies full-window bounds, Figma scanner 315,28 at the portrait
reference, no global transform, state preservation, and navigation. TASK-007
authority checks compare an independent live Figma snapshot to canonical YAML/assets
before comparing YAML to generated data. Figma owns appearance; YAML owns meaning;
generated code and runtime implement both. See DEV-2026-09-14-005, DEV-2026-09-18-001,
and [the region classification](planning/TASK-007_FULL_WINDOW_LAYOUT_2026-09-14.md).
TASK-007 stays OPEN until physical Motorola verification.

## Authentication

The implemented prototype still gates the archive behind `AuthGate` using a local identifier/password and an AuthSession Google implicit token. That is legacy and must not be treated as the production identity model.

The authoritative contract is `docs/ACCOUNT_IDENTITY.yaml` (account identity schema version 1):

- Local profile and encrypted archive are created on first launch without Google, Apple, internet, or the Captain's Log authority.
- A remote Captain's Log account UUID is issued only by a narrow custom authority. Provider subjects never replace that UUID. The human-readable `user_id` (D38) is a locator resolvable to that UUID and is not authentication or authorization.
- MFA is risk-adaptive. Remote account passkeys are WebAuthn factors against a pending Captain's Log HTTPS RP ID (D32). Local archive unlock is platform user verification of a device-protected AEK wrap, not a WebAuthn passkey.
- Fully enrolled devices prove possession with a locally generated, preferably hardware-backed keypair (D31). Archive encryption is a layered hierarchy (D15/D33): Recovery Secret → Recovery KEK → wrapped AEK → domain-separated archive keys → per-object DEKs. Shared objects use independent Object DEKs wrapped to a recipient account sharing public key; the archive AEK is never a sharing key (D34, D34-A through D34-D). Captain's Log sessions stay out of SQLite, YAML, UI, diagnostics, exports, and backups (D35). Grants are short-lived JWS Ed25519 capabilities with device-key confirmation and signing-key rotation (D36).
- The authority is a TypeScript HTTPS service, containerized, published to Amazon ECR, and run on Amazon ECS Fargate against Amazon RDS PostgreSQL (D13). Domain logic sits behind repository interfaces. Live AWS identifiers and secret ARNs belong in the private `captains-log-infra` repository. The public repository may ship Docker/Compose, migrations, generic templates, and `docs/aws.example.yaml` placeholders only. Local AWS uses the CLI `default` profile and short-lived `aws login` credentials. Server secrets resolve from Secrets Manager at runtime (ECS `valueFrom` or CloudFormation dynamic references). Do not commit secret values, long-lived access keys, or call `GetSecretValue` into agent or log context.
- SQLite persistence remains schema version 2. HUD layout generator schema 3 is unrelated. Graph contract version is 1 (implicit current entity/relationship types).

See DEV-2026-09-20-002 through DEV-2026-09-28-001. Do not implement identity behavior from the September 20 Markdown plan when it conflicts with the YAML. The architecture review hold on P01 is released. Next implementation focus is P01 TypeScript contracts and repository-boundary scaffolding. Do not start P04, P08, P10, P13, P14, P19, P20, or P24 in this documentation pass. P29 requires P04. Operator blockers remain the D25 Google license, the permanent WebAuthn RP domain, and live AWS resources in `captains-log-infra`.

## Backup and restore

Google Drive stores timestamped snapshots in a visible user-managed folder (`Captain's Log Backups`), not hidden application data. Retention keeps the newest 7 snapshots. Settings can list snapshots, restore one, and show post-restore integrity results. Local SQLite plus attachments remain canonical until the user restores.

## Out of Scope Here

Semantic search, graph databases, plugin runtimes, multi-device sync, YA, and MCP are deferred per the roadmap.
