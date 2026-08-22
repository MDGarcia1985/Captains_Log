# Captain's Log — Development Notes

Append-only engineering journal. Follow `DEVNOTES_STANDARDS.md`.

---

### Greenfield Expo MVP bootstrap

**Date:** 2026-08-20  
**Time:** 15:20 America/New_York  
**Engineer:** Cursor Grok 4.6 agent

#### Problem

The repository contained only product documentation. `ROADMAP.md` required a pre-implementation review of the standards and `captains-log.yaml`, then a rapid MVP: Expo app, local SQLite, capture, log, search, entities, graph, starship skin, and replaceable adapters.

`ARCHITECTURE.md` and `DEVNOTES.md` did not exist.

#### Solution(s)

1. Reviewed `DEVNOTES_STANDARDS.md`, `ANNOTATION_STANDARDS.md`, and `captains-log.yaml` before writing implementation code.
2. Scaffolded Expo SDK 57 (`default` template) in the existing repository so routes stay in `src/app`.
3. Implemented a layered adapter architecture: UI → services → repositories/adapters → SQLite/filesystem/platform.
4. Used local email authentication (secure store) because the MVP forbids standing up an application server.
5. Implemented Google auth and Drive backup behind interfaces; they activate when OAuth client IDs and tokens are present.
6. Used deterministic `[[wiki]]`, `@person`, and `#project` extraction so derived graph data exists without blocking save or requiring an AI service.

#### Trade-offs

- Keeping `src/app` instead of a top-level `app/` directory matches Expo 57 and the template path alias. Exact folder names from the roadmap were not copied because the generated project already had a coherent equivalent.
- Local email auth proves identity only on-device. It satisfies offline-first `account_required` without Firebase or a custom backend. It is not a networked identity provider.
- Google Sign-In and Drive backup cannot complete in Expo Go without configured OAuth client IDs and, for native Google/Drive APIs, a development build.
- Android share-target was deferred past the first vertical slice. Incoming share needs a native intent module (`expo-share-intent` or equivalent) and would slow the 4–6 hour prototype. Intent-filter placeholders can be added later without changing the capture service contract.
- No Jest harness was added. The roadmap forbids unnecessary infrastructure; behavior should be verified on device/simulator.

#### Final Outcome

Proceed with the modular Expo implementation described in `ARCHITECTURE.md`. Product behavior remains defined by `captains-log.yaml`.

#### Next Steps

- Implement remaining MVP screens and adapters in roadmap priority order.
- Verify phone/tablet breakpoints and handedness on hardware.
- Configure Google OAuth client IDs before testing Google auth and Drive backup.

#### Deferred Decisions

- Networked email verification vs local-only account.
- Whether Google Sign-In should use a development build + native Google SDK rather than AuthSession in Expo Go.
- Android share-target implementation after the core vertical slice is usable.
- Application license and owner contact information for file headers (currently pending confirmation per annotation standards).

---

### First vertical slice implemented

**Date:** 2026-08-20  
**Time:** 16:10 America/New_York  
**Engineer:** Cursor Grok 4.6 agent

#### Problem

The roadmap's first prototype order needed a working phone/tablet app: shell, handed navigation, SQLite, services, capture, log, attachments, search, entity/graph views, starship skin, settings, auth adapters, backup adapters, and optional location.

#### Solution(s)

Implemented the layered Expo app under `src/`, with UI calling services only. Capture, chronological log, FTS search, deterministic extraction, first-degree graph, and settings are functional locally. Google auth/Drive adapters exist but require OAuth client IDs. Automatic backup no-ops until Drive is authorized so local use is not marked failed on every launch.

#### Trade-offs

- Android share-target remains deferred; an intent-filter stub is in `app.json` but incoming shares are not yet routed into Capture.
- Email auth remains local-only.
- Google auth uses AuthSession implicit token flow, which is adequate for a prototype and weaker than a native development-build SDK.

#### Final Outcome

A runnable Expo SDK 57 Captain's Log prototype exists. Remaining MVP gaps are Google credential configuration, device verification, and share-target wiring.

#### Next Steps

- Run on an Android phone and tablet and verify breakpoints plus handedness.
- Add Google OAuth client IDs in `app.json` extra / `EXPO_PUBLIC_GOOGLE_`* env vars.
- Implement Android share-target intake into `createEntry({ source: 'share' })`.

#### Deferred Decisions

- Native Google Sign-In vs AuthSession for production.
- Whether local email accounts should ever sync to a server.

---

### Function header format mandated

**Date:** 2026-08-20  
**Time:** 20:30 America/New_York  
**Engineer:** Cursor Grok 4.6 agent

#### Problem

Multi-line and opaque functions needed a consistent four-part header (Purpose, Design, Workflow, Data Handoff) so humans and agents can see why a function exists, why it is shaped that way, where it sits in the workflow, and what it hands off next.

#### Solution(s)

Applied that header across adapters, services, hooks, and UI functions. Updated `ANNOTATION_STANDARDS.md` so the function-header example matches this form. One-line trivial wrappers (for example `createId` and thin route re-exports) were left without headers.

#### Trade-offs

Headers add vertical noise. They were kept to four short fields to avoid documentation walls while still meeting the required structure.

#### Final Outcome

Implementation files now use the required function-head style. Future functions should follow the same template.

#### Next Steps

None.

#### Deferred Decisions

None.

---

### DEV-2026-08-21-001 — Extraction must supersede prior derived graph data

**Date:** 2026-08-21  
**Time:** 19:50 America/New_York  
**Engineer:** Cursor Grok 4.6 agent  
**Status:** ACCEPTED

#### Problem

Editing a log entry re-ran extraction without removing the previous `entry_entities` links or `relationships` rows for that `source_entry_id`. Stale and duplicate graph data remained.

#### Context and Constraints

Derived entities and relationships are regeneratable. Source text is authoritative. Product provenance requires every relationship to retain `source_entry_id`.

#### Solutions Considered

1. Delete derived links and relationships for the source entry, then re-extract.
2. Tombstone those derived rows and insert new ones.
3. Leave entity nodes in place and only replace links/edges.

#### Trade-offs

Hard-deleting regeneratable edges avoids graph duplicates without pretending derived data is canonical history. Tombstoning derived edges would accumulate noise. Deleting entity nodes would drop identities still used by other entries.

#### Final Outcome

Before each `processEntry` run, delete `entry_entities` rows for that entry and `relationships` rows with that `source_entry_id`, then extract again. Entity rows are kept and reused by name.

#### Implementation Impact

- `src/services/extractionService.ts`
- `src/adapters/sqlite/entityRepository.ts`
- `src/adapters/sqlite/relationshipRepository.ts`
- `src/models/contracts.ts`

#### Verification Required

T0 on the modified files. T1 that editing an entry replaces rather than duplicates its derived links.

#### Related Records

- DEVNOTES: None
- Tests: Pending
- Source: `src/services/extractionService.ts`

#### Next Steps

Implement clear-then-extract and record TEST IDs.

#### Deferred Decisions

Whether unused entity nodes should later be archived by a separate maintenance pass.

---

### DEV-2026-08-21-002 — Sequential named SQLite migrations

**Date:** 2026-08-21  
**Time:** 19:52 America/New_York  
**Engineer:** Cursor Grok 4.6 agent  
**Status:** ACCEPTED

#### Problem

`migrate()` applied v1, then could advance `PRAGMA user_version` to `DATABASE_VERSION` without a named migration body. That hides failed or missing steps.

#### Context and Constraints

Existing devices may already be at user_version 1. Schema changes for archival and processing jobs need a real v2. Migrations must be additive.

#### Solutions Considered

1. Keep a version-to-SQL map and bulk-set `user_version`.
2. Explicit `migrateV1()`, `migrateV2()`, each followed by `PRAGMA user_version = N` only after success.

#### Trade-offs

Named sequential functions are more verbose and make skipped versions obvious. A generic loop that still jumps `user_version` would repeat the defect.

#### Final Outcome

Use explicit `migrateV1()`, `migrateV2()`, and so on. Advance `user_version` only after that function succeeds. Do not set `user_version` to `DATABASE_VERSION` in a catch-all.

#### Implementation Impact

- `src/adapters/sqlite/database.ts`
- `src/adapters/sqlite/schema.ts`
- `src/adapters/sqlite/migrations.ts`

#### Verification Required

T0 on migration files. T1 that a fresh database ends at user_version 2 and contains v2 objects.

#### Related Records

- DEVNOTES: None
- Tests: Pending
- Source: `src/adapters/sqlite/migrations.ts`

#### Next Steps

Implement v1/v2 and stop catch-all version bumps.

#### Deferred Decisions

None.

---

### DEV-2026-08-21-003 — Google Drive backup uses timestamped snapshots

**Date:** 2026-08-21  
**Time:** 19:54 America/New_York  
**Engineer:** Cursor Grok 4.6 agent  
**Status:** ACCEPTED

#### Problem

Backup currently POSTs a new Drive file on every upload without a retained file ID and without snapshots. Restore cannot list historical copies, and repeated backups accumulate anonymous files.

#### Context and Constraints

Local SQLite plus managed attachments remain canonical. Drive is backup only. The required restore lifecycle needs a list of available backups. Decision must be recorded before changing backup behavior.

#### Solutions Considered

1. Retained file updated by Drive file ID: one `captains-log.db` and attachment files overwritten in place.
2. Timestamped snapshots with retention: each backup is a new folder; older snapshots are deleted after a cap.

#### Trade-offs

A retained file is simpler and uses less Drive quota, but a bad backup destroys the previous good copy and `list available backups` is effectively one item. Snapshots cost more storage and require retention, but they support restore-to-selected-copy and survive a corrupt latest backup.

#### Final Outcome

Select timestamped snapshots. Each backup creates a UTC-named snapshot folder under a Captain's Log backup root. Retention keeps the newest 7 snapshots and trashes older ones after a successful snapshot. WAL is checkpointed before serialize so the snapshot includes committed state.

#### Implementation Impact

- `src/adapters/googleDrive/googleDriveBackupProvider.ts`
- `src/services/backupService.ts`
- `src/models/contracts.ts`
- Settings restore UI

#### Verification Required

T0 on backup files. T2 listing/creating snapshots when Drive is authorized. If Drive is not configured, record BLOCKED/NOT_EXECUTED rather than PASS.

#### Related Records

- DEVNOTES: DEV-2026-08-21-004, DEV-2026-08-21-005
- Tests: Pending
- Source: `src/adapters/googleDrive/googleDriveBackupProvider.ts`

#### Next Steps

Implement snapshot create, retention, list, and restore after DEV-2026-08-21-004.

#### Deferred Decisions

Whether retention should later also be time-based (for example, keep monthly copies beyond 7).

---

### DEV-2026-08-21-004 — Backups use visible drive.file files

**Date:** 2026-08-21  
**Time:** 19:55 America/New_York  
**Engineer:** Cursor Grok 4.6 agent  
**Status:** ACCEPTED

#### Problem

Backup storage can be either user-visible Drive files (`drive.file`) or hidden application data storage (`drive.appdata`). The choice changes recoverability, privacy, and OAuth scope.

#### Context and Constraints

Product principle: user-owned data. Backup status is already user-visible. Current prototype already requested `drive.file`. Least-privilege scopes are required.

#### Solutions Considered

1. `https://www.googleapis.com/auth/drive.file` — app-created files the user can see and copy in Drive.
2. `https://www.googleapis.com/auth/drive.appdata` — hidden appDataFolder, not browsable as ordinary Drive files.

#### Trade-offs

`drive.file` files can be deleted or moved by the user, and they appear in Drive. The user can download a snapshot without this app. `drive.appdata` hides backups from casual browsing and from some Drive UIs, but recovery then depends on the app, Google can wipe app data with the app, and independent copy is harder.

#### Final Outcome

Keep visible user-managed files via `drive.file`. Create a folder named `Captain's Log Backups` that the user can see. Do not switch to application data storage. Consequence: users can trash backups from Drive; Settings list/restore will then fail for those IDs.

#### Implementation Impact

- Drive authorize scope remains `drive.file`
- Snapshot folders are ordinary Drive folders
- README/Settings copy must say backups are visible Drive files

#### Verification Required

T0/T2 against authorize URL/scope string. Live Drive folder visibility is BLOCKED until OAuth client IDs exist.

#### Related Records

- DEVNOTES: DEV-2026-08-21-003, DEV-2026-08-21-005
- Tests: Pending
- Source: `src/adapters/googleDrive/googleDriveBackupProvider.ts`

#### Next Steps

Implement snapshot folders under `drive.file` only.

#### Deferred Decisions

None.

---

### DEV-2026-08-21-005 — Restore lifecycle for Drive snapshots

**Date:** 2026-08-21  
**Time:** 19:56 America/New_York  
**Engineer:** Cursor Grok 4.6 agent  
**Status:** ACCEPTED

#### Problem

Backup had upload only. There was no way to list snapshots, restore one, or verify the archive afterward.

#### Context and Constraints

Local device remains authoritative until the user explicitly restores. Restore replaces local SQLite and managed attachments. Attachment `file_uri` values in a snapshot are device-specific and must be rewritten.

#### Solutions Considered

1. Download-only helper with a required app restart and no verification.
2. In-app restore: list snapshots, replace the archive, rewrite attachment URIs, verify integrity, recompose services.

#### Trade-offs

Restart-only restore is smaller but leaves a window of mixed state. In-app replace is more code and must close the live SQLite connection.

#### Final Outcome

Restore lifecycle is: list snapshots, restore the selected snapshot, then verify. Verification runs `PRAGMA integrity_check`, confirms required tables, and checks that non-archived attachment files exist on disk after URI rewrite. Services are recomposed from the replaced database.

#### Implementation Impact

- `src/adapters/sqlite/database.ts` archive replace
- `src/adapters/filesystem/attachmentStorage.ts`
- `src/services/backupService.ts`
- `src/services/AppServicesProvider.tsx`
- `src/ui/screens/SettingsScreen.tsx`

#### Verification Required

T

1. T2 restore when Drive snapshots exist. If unauthorized, NOT_EXECUTED/BLOCKED.

#### Related Records

- DEVNOTES: DEV-2026-08-21-003, DEV-2026-08-21-004
- Tests: Pending
- Source: `src/services/backupService.ts`

#### Next Steps

Implement list/restore/verify and Settings controls.

#### Deferred Decisions

No confirmation modal beyond Settings copy for this pass.

---

### DEV-2026-08-21-006 — User records use archival tombstones

**Date:** 2026-08-21  
**Time:** 19:57 America/New_York  
**Engineer:** Cursor Grok 4.6 agent  
**Status:** ACCEPTED

#### Problem

Deletion behavior was undefined. Foreign keys have no ON DELETE policy. A later hard delete could strand graph/attachment rows or erase chronicle history.

#### Context and Constraints

This app is a longitudinal archive. Product already keeps entry revisions. Derived graph data is regeneratable; source entries are not.

#### Solutions Considered

1. Add `ON DELETE CASCADE` and hard-delete rows.
2. Add `archived_at` tombstones and filter live queries.

#### Trade-offs

Cascade hard-delete is simpler for referential cleanliness and destroys history. Tombstones keep rows, require query filters, and match chronicle semantics.

#### Final Outcome

Prefer archival. v2 adds `archived_at` to entries, entities, relationships, attachments, and `entry_entities`. Live list/search queries exclude archived rows. `archiveEntry` tombstones an entry and its attachments, links, and provenance edges. Entity nodes are not auto-archived. Regeneratable extraction links continue to be hard-replaced per DEV-2026-08-21-001. No delete UI in this pass.

#### Implementation Impact

- `src/adapters/sqlite/migrations.ts`
- repositories and search SQL
- `src/services/entryService.ts`

#### Verification Required

T

1. T1 archive-filter on list queries (SQL inspection plus any runnable module test).

#### Related Records

- DEVNOTES: DEV-2026-08-21-001
- Tests: Pending
- Source: `src/adapters/sqlite/schema.ts`

#### Next Steps

Add columns, filters, and `archiveEntry`.

#### Deferred Decisions

Entity-level archive UI and undo/unarchive.

---

### DEV-2026-08-21-007 — Local archive credentials are not verified email

**Date:** 2026-08-21  
**Time:** 19:58 America/New_York  
**Engineer:** Cursor Grok 4.6 agent  
**Status:** ACCEPTED

#### Problem

Internal names and UI copy presented on-device identifier/password as email authentication, which implies ownership verification that does not exist.

#### Context and Constraints

Product yaml still lists `email` as an MVP method. There is no application server. Offline-first `account_required` still needs a local unlock.

#### Solutions Considered

1. Add networked email verification.
2. Rename internally to `LocalArchiveCredential` / `local_archive` and stop claiming email verification.

#### Trade-offs

Real email verification needs a server and network, which violates the current MVP scope. A local credential is honest and offline-capable but is not an identity provider.

#### Final Outcome

Rename the provider to `LocalArchiveCredential`. Session method is `local_archive`. The identifier may look like an email and is not verified. Product yaml remains unchanged as the product label for that MVP method.

#### Implementation Impact

- `src/adapters/auth/localArchiveCredentialProvider.ts`
- `src/services/authService.ts`
- `src/ui/screens/AuthGate.tsx`
- domain `AuthAccount`

#### Verification Required

T

1. T1 create/unlock against the renamed provider in a node or module test where possible.

#### Related Records

- DEVNOTES: DEV-2026-08-21-008
- Tests: Pending
- Source: `src/adapters/auth/localArchiveCredentialProvider.ts`

#### Next Steps

Replace `localEmailAuthProvider` and update UI copy.

#### Deferred Decisions

Whether a future networked email provider should coexist as a separate adapter.

---

### DEV-2026-08-21-008 — Local passwords use PBKDF2-HMAC-SHA256

**Date:** 2026-08-21  
**Time:** 19:59 America/New_York  
**Engineer:** Cursor Grok 4.6 agent  
**Status:** ACCEPTED

#### Problem

Local passwords used salted SHA-256, which is a fast digest, not a password KDF.

#### Context and Constraints

`expo-crypto` in SDK 57 provides digests, not PBKDF2/scrypt/Argon2. Unlock must work offline on device. Existing SHA-256 records may already exist.

#### Solutions Considered

1. Keep SHA-256.
2. PBKDF2-HMAC-SHA256 via `@noble/hashes` at 100000 iterations.
3. Argon2, which needs native code and a development build.

#### Trade-offs

PBKDF2 in audited JS is portable, testable, and expensive enough for an on-device archive. Native Argon2 is stronger but expands native scope. Fast SHA-256 remains inadequate.

#### Final Outcome

Use PBKDF2-HMAC-SHA256, 100000 iterations, 16-byte random salt, 32-byte dk. Legacy SHA-256 records, if present, verify once and upgrade in place on successful unlock.

#### Implementation Impact

- `src/utilities/passwordKdf.ts`
- `src/adapters/auth/localArchiveCredentialProvider.ts`
- `package.json` dependency `@noble/hashes`

#### Verification Required

T

1. T1 RFC 6070 PBKDF2 test vector.

#### Related Records

- DEVNOTES: DEV-2026-08-21-007
- Tests: Pending
- Source: `src/utilities/passwordKdf.ts`

#### Next Steps

Add KDF helper and wire it into local credentials.

#### Deferred Decisions

Raising iterations or moving to Argon2 in a development build.

---

### DEV-2026-08-21-009 — Google client IDs are platform-specific; AuthSession is prototype-only

**Date:** 2026-08-21  
**Time:** 20:00 America/New_York  
**Engineer:** Cursor Grok 4.6 agent  
**Status:** ACCEPTED

#### Problem

Google OAuth used `web || android || ios` fallback. A web client ID could be sent from a native app. The implicit AuthSession token flow is not a production sign-in design.

#### Context and Constraints

Expo AuthSession commonly uses a web client ID even on device, which is why the fallback existed. Production Google Sign-In on Android/iOS normally uses a development build and platform client IDs.

#### Solutions Considered

1. Keep fallback so Expo Go is more likely to work.
2. Select only the client ID for `Platform.OS`; treat AuthSession implicit tokens as prototype-only.

#### Trade-offs

No fallback makes misconfiguration fail loudly and prevents using the wrong client type. Expo Go Google sign-in may fail until the matching platform client ID is set. That is acceptable for hardening.

#### Final Outcome

`selectGoogleClientId(platform, ids)` returns only that platform's ID. Empty means not configured for this platform. Annotate AuthSession `ResponseType.Token` as prototype-only. Native Google SDK is deferred.

#### Implementation Impact

- `src/utilities/googleClientId.ts`
- `src/adapters/auth/googleAuthProvider.ts`
- Drive authorize uses the same selector

#### Verification Required

T

1. T1 unit cases for ios/android/web with no cross-fallback.

#### Related Records

- DEVNOTES: None
- Tests: Pending
- Source: `src/utilities/googleClientId.ts`

#### Next Steps

Replace fallback selection and annotate the token flow.

#### Deferred Decisions

Development-build Google Sign-In SDK.

---

### DEV-2026-08-21-010 — Record attachment and extraction failures without blocking save

**Date:** 2026-08-21  
**Time:** 20:01 America/New_York  
**Engineer:** Cursor Grok 4.6 agent  
**Status:** ACCEPTED

#### Problem

`createEntry` / `updateEntry` swallowed attachment and extraction errors. Saves stayed non-blocking, but failures left no retry or diagnostic state.

#### Context and Constraints

Product: extraction must not block save; entry remains valid on extraction failure. Hardening requires recorded failure/retry state or at least development diagnostics.

#### Solutions Considered

1. Keep swallow, add `console.warn` only.
2. Persist `processing_jobs` rows (pending/succeeded/failed, retry_count, detail) and still not throw out of save.

#### Trade-offs

Logs-only is lost after restart. A job table is small schema and gives Settings a failure list plus extraction retry. Attachment retry cannot recreate bytes if the picker URI is gone.

#### Final Outcome

Add `processing_jobs`. Save remains non-blocking. Each attachment and extraction attempt writes a job. `__DEV_`_ also logs the error. Settings can list failed jobs and retry extraction jobs. Attachment failures stay recorded until a new capture provides bytes.

#### Implementation Impact

- `src/adapters/sqlite/processingJobRepository.ts`
- `src/services/entryService.ts`
- `src/services/processingService.ts`
- Settings diagnostics panel

#### Verification Required

T

1. T1 that a forced extraction error records a failed job (module test or STATIC_ONLY with SQL contract).

#### Related Records

- DEVNOTES: None
- Tests: Pending
- Source: `src/services/entryService.ts`

#### Next Steps

Stop empty catch blocks; persist job state.

#### Deferred Decisions

Automatic retry on a timer.

---

### DEV-2026-08-21-011 — Keep modular adapters; do not add a plugin runtime

**Date:** 2026-08-21  
**Time:** 20:02 America/New_York  
**Engineer:** Cursor Grok 4.6 agent  
**Status:** ACCEPTED

#### Problem

Hardening could be mistaken as a chance to introduce plugin registries or dynamic loading.

#### Context and Constraints

Product architecture: modular adapter style, `generalized_plugin_runtime_required: false`.

#### Solutions Considered

1. Add a provider registry/manifest loader.
2. Keep explicit interfaces and `createAppServices` composition.

#### Trade-offs

A registry would be unused infrastructure. Manual composition remains readable and removable.

#### Final Outcome

No plugin runtime, registry, manifests, or dynamic loading. New backup/auth/processing types stay behind existing adapter/service boundaries.

#### Implementation Impact

`src/services/createAppServices.ts` remains the composition root.

#### Verification Required

Inspection/T0 only.

#### Related Records

- DEVNOTES: None
- Tests: Pending
- Source: `src/services/createAppServices.ts`

#### Next Steps

None beyond preserving this shape while implementing the other items.

#### Deferred Decisions

None.

---

### DEV-2026-08-21-012 — Extraction idempotency implemented

**Date:** 2026-08-21  
**Time:** 20:30 America/New_York  
**Engineer:** Cursor Grok 4.6 agent  
**Status:** IMPLEMENTED

#### Problem

DEV-2026-08-21-001 required clear-then-extract.

#### Context and Constraints

Supersedes: DEV-2026-08-21-001  
Reason: Implementation is in place; runtime SQLite re-extract is still outstanding.

#### Solutions Considered

Implemented option 1 from DEV-2026-08-21-001.

#### Trade-offs

Same as DEV-2026-08-21-001.

#### Final Outcome

`processEntry` deletes derived links and relationships for the source entry, then extracts. Verification is STATIC_ONLY plus extraction parse tests.

#### Implementation Impact

`src/services/extractionService.ts`, entity and relationship repositories.

#### Verification Required

Device edit-and-reextract T1 still required.

#### Related Records

- DEVNOTES: DEV-2026-08-21-001
- Tests: TEST-2026-08-21-003, TEST-2026-08-21-004
- Source: `src/services/extractionService.ts`

#### Next Steps

Run an on-device edit that removes a mention and confirm stale edges are gone.

#### Deferred Decisions

Unused entity-node cleanup.

---

### DEV-2026-08-21-013 — Sequential migrations implemented

**Date:** 2026-08-21  
**Time:** 20:31 America/New_York  
**Engineer:** Cursor Grok 4.6 agent  
**Status:** IMPLEMENTED

#### Problem

Catch-all `user_version` bump had to be removed.

#### Context and Constraints

Supersedes: DEV-2026-08-21-002  
Reason: `migrateV1` / `migrateV2` now exist.

#### Solutions Considered

Implemented named sequential steps.

#### Trade-offs

Same as DEV-2026-08-21-002.

#### Final Outcome

`migrate()` runs `migrateV1` then `migrateV2`, advancing `user_version` only after each succeeds. No catch-all bump. Schema constants show version 2 and `processing_jobs`.

#### Implementation Impact

`src/adapters/sqlite/database.ts`, `migrations.ts`, `schema.ts`

#### Verification Required

On-device open of a fresh and a v1 database.

#### Related Records

- DEVNOTES: DEV-2026-08-21-002
- Tests: TEST-2026-08-21-001, TEST-2026-08-21-003
- Source: `src/adapters/sqlite/migrations.ts`

#### Next Steps

Confirm `PRAGMA user_version` is 2 after first launch on a device.

#### Deferred Decisions

None.

---

### DEV-2026-08-21-014 — Snapshot backup and drive.file restore implemented

**Date:** 2026-08-21  
**Time:** 20:32 America/New_York  
**Engineer:** Cursor Grok 4.6 agent  
**Status:** IMPLEMENTED

#### Problem

Backup strategy, storage location, and restore lifecycle were decided in DEV-2026-08-21-003/004/005.

#### Context and Constraints

Supersedes: DEV-2026-08-21-003, DEV-2026-08-21-004, DEV-2026-08-21-005  
Reason: Code is present; live Drive T2 is blocked without OAuth.

#### Solutions Considered

Implemented timestamped snapshots, visible `drive.file` folders, list/restore/verify.

#### Trade-offs

Same as the superseded entries.

#### Final Outcome

Backup creates UTC snapshot folders under Captain's Log Backups, retains 7, restores via database replace plus attachment rewrite and integrity check. Live Drive was not exercised.

#### Implementation Impact

Drive adapter, BackupService, archiveRestore, Settings restore UI.

#### Verification Required

T2 after platform client IDs exist.

#### Related Records

- DEVNOTES: DEV-2026-08-21-003, DEV-2026-08-21-004, DEV-2026-08-21-005
- Tests: TEST-2026-08-21-003, TEST-2026-08-21-005
- Source: `src/adapters/googleDrive/googleDriveBackupProvider.ts`

#### Next Steps

Configure platform OAuth client IDs and run list/backup/restore on a device.

#### Deferred Decisions

Time-based retention beyond a count of 7.

---

### DEV-2026-08-21-015 — Archival tombstones implemented

**Date:** 2026-08-21  
**Time:** 20:33 America/New_York  
**Engineer:** Cursor Grok 4.6 agent  
**Status:** IMPLEMENTED

#### Problem

Deletion behavior was undefined.

#### Context and Constraints

Supersedes: DEV-2026-08-21-006  
Reason: Schema and query filters are in code; no delete UI was added.

#### Solutions Considered

Implemented `archived_at` tombstones.

#### Trade-offs

Same as DEV-2026-08-21-006.

#### Final Outcome

v2 adds `archived_at`. Live queries filter it. `archiveEntry` tombstones an entry and related attachments/links/edges. No Settings delete control in this pass.

#### Implementation Impact

migrations, repositories, search SQL, EntryService.archiveEntry

#### Verification Required

On-device archive plus list/search exclusion.

#### Related Records

- DEVNOTES: DEV-2026-08-21-006
- Tests: TEST-2026-08-21-001
- Source: `src/adapters/sqlite/entryRepository.ts`

#### Next Steps

Add UI only when product wants user-facing archive.

#### Deferred Decisions

Unarchive and entity-level archive UI.

---

### DEV-2026-08-21-016 — Local credentials and platform Google IDs implemented

**Date:** 2026-08-21  
**Time:** 20:34 America/New_York  
**Engineer:** Cursor Grok 4.6 agent  
**Status:** IMPLEMENTED

#### Problem

Email naming, SHA-256, and client-ID fallback needed replacement.

#### Context and Constraints

Supersedes: DEV-2026-08-21-007, DEV-2026-08-21-008, DEV-2026-08-21-009  
Reason: Code and Node KDF/client-ID tests exist; device auth is blocked.

#### Solutions Considered

Implemented LocalArchiveCredential, PBKDF2, platform-only client IDs.

#### Trade-offs

Same as the superseded entries.

#### Final Outcome

Provider renamed. Passwords use PBKDF2-HMAC-SHA256 at 100000 iterations with legacy SHA-256 upgrade. Google/Drive AuthSession uses the current platform ID only and is annotated prototype-only.

#### Implementation Impact

localArchiveCredentialProvider, googleAuthProvider, AuthGate, passwordKdf, googleClientId

#### Verification Required

Device create/unlock. Google handshake after client IDs.

#### Related Records

- DEVNOTES: DEV-2026-08-21-007, DEV-2026-08-21-008, DEV-2026-08-21-009
- Tests: TEST-2026-08-21-003, TEST-2026-08-21-006
- Source: `src/adapters/auth/localArchiveCredentialProvider.ts`

#### Next Steps

Unlock a local credential on device; configure platform Google client IDs.

#### Deferred Decisions

Native Google Sign-In SDK; Argon2.

---

### DEV-2026-08-21-017 — Processing job recording implemented

**Date:** 2026-08-21  
**Time:** 20:35 America/New_York  
**Engineer:** Cursor Grok 4.6 agent  
**Status:** IMPLEMENTED

#### Problem

Attachment and extraction failures were swallowed.

#### Context and Constraints

Supersedes: DEV-2026-08-21-010  
Reason: Job table and catch-path recording exist; forced-failure runtime was not executed.

#### Solutions Considered

Implemented processing_jobs plus Settings retry for extraction.

#### Trade-offs

Same as DEV-2026-08-21-010.

#### Final Outcome

Saves still do not throw on derivative failure. Jobs are written with pending/succeeded/failed and retry_count. `__DEV_`_ logs remain. Attachment retry still cannot recreate lost picker bytes.

#### Implementation Impact

processingJobRepository, entryService, processingService, SettingsScreen

#### Verification Required

Force an attachment or extraction failure on device and confirm a failed job row.

#### Related Records

- DEVNOTES: DEV-2026-08-21-010
- Tests: TEST-2026-08-21-001
- Source: `src/services/entryService.ts`

#### Next Steps

Device T1 with a failing attachment copy.

#### Deferred Decisions

Automatic retry timer.

---

### DEV-2026-08-21-018 — Modular adapters preserved

**Date:** 2026-08-21  
**Time:** 20:36 America/New_York  
**Engineer:** Cursor Grok 4.6 agent  
**Status:** CLOSED

#### Problem

Hardening must not introduce a plugin runtime.

#### Context and Constraints

Supersedes: DEV-2026-08-21-011  
Reason: Composition root is still manual; no registry was added.

#### Solutions Considered

Kept `createAppServices` wiring.

#### Trade-offs

Same as DEV-2026-08-21-011.

#### Final Outcome

No plugin registry, manifests, or dynamic loading. Backup restore uses an explicit `ArchiveRuntime` callback, not discovery.

#### Implementation Impact

`src/services/createAppServices.ts`

#### Verification Required

None beyond inspection.

#### Related Records

- DEVNOTES: DEV-2026-08-21-011
- Tests: TEST-2026-08-21-001
- Source: `src/services/createAppServices.ts`

#### Next Steps

None.

#### Deferred Decisions

None.