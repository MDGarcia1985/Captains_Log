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
- Application source is licensed under MPL-2.0 and file headers identify Michael Garcia at michael@mandedesign.studio.

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

---

---

### DEV-2026-08-21-019 — Select MPL 2.0 project license

**Date:** 2026-08-21  
**Time:** 21:08 America/New_York  
**Engineer:** Michael Garcia  
**Status:** CLOSED

#### Problem

The repository is publicly visible, but the existing Author, Contact, and License placeholders are stale and the project license has not been explicitly aligned with the intended development model.

The project is designed around a modular-adapter architecture. The core application should remain open, while contributors should still be able to create separate proprietary adapters, integrations, or surrounding systems if desired.

#### Context and Constraints

The license must:

- permit public use, modification, and redistribution;
- preserve openness of modifications to the Captain's Log core;
- allow proprietary modules or larger works to be built around the core;
- remain compatible with the modular-adapter architecture;
- avoid forcing unrelated surrounding code to adopt the same license.

Without an explicit license, the repository is publicly readable but the permissions granted to users and contributors are not clearly defined.

#### Solutions Considered

| License | What it allows | What it forces |
| --- | --- | --- |
| MIT | Broad use, modification, redistribution, and closed derivatives | Preserve copyright and license notice |
| Apache 2.0 | Similar permissiveness to MIT with explicit patent provisions | Preserve notices and license terms |
| MPL 2.0 | Proprietary larger works and separate modules are allowed | Modified MPL-covered files must remain open |
| GPLv3 | Modification, redistribution, and commercial use | Distributed derivative works must remain GPL/open source |

#### Trade-offs

MIT and Apache 2.0 provide maximum reuse flexibility but allow modified versions of the Captain's Log core to become closed source.

GPLv3 preserves the entire derivative work as open source but is more restrictive than necessary for the intended modular-adapter model.

MPL 2.0 provides file-level copyleft. Modifications to MPL-covered core files remain open, while separate proprietary adapters, plugins, integrations, or surrounding applications may use different licenses.

#### Final Outcome

Selected Mozilla Public License 2.0 (`MPL-2.0`).

This preserves the open Captain's Log core while allowing contributors to create and commercialize separate proprietary adapters, integrations, plugins, or larger surrounding systems.

#### Implementation Impact

- Replace or update the repository `LICENSE` file with the Mozilla Public License 2.0.
- Update source-file license headers to use `SPDX-License-Identifier: MPL-2.0`.
- Update `ANNOTATION_STANDARDS.md` so future file headers use the selected project license.
- Update project metadata where license information is declared.

#### Verification Required

Verify that:

- the repository contains the MPL 2.0 license text;
- source headers use `SPDX-License-Identifier: MPL-2.0`;
- project metadata identifies the license consistently;
- no stale "All rights reserved" placeholders remain in active source files.

#### Related Records

- `LICENSE`
- `docs/ANNOTATION_STANDARDS.md`
- `package.json`
- `package-lock.json`

#### Next Steps

Apply the MPL 2.0 license consistently across repository metadata and source-file headers.

#### Deferred Decisions

None.

---

---

### DEV-2026-08-22-020 — Initial Android emulator findings

**Date:** 2026-08-22
**Time:** 20:13 America/New_York 
**Engineer:** Michael Garcia
**Type:** OBSERVATION
**Environment:** Google Pixel 9 Pro XL Android emulator

#### Findings

- Sidebar is not set correctly; intended interaction is a traditional tab layout oriented vertically.
- Settings and Search should be separate tabs.
- Log tab should display chronological entries when present and `No entries yet` when empty.
- Current top telemetry contains useful information but may benefit from a graphical treatment; visual direction remains under review.
- Search needs `*` wildcard behavior.
- App and navigation tabs need an icon strategy, likely using vector/SVG source artwork.
- User workspace needs stronger visual framing without materially increasing visual compression.
- Capture workspace should be storyboarded before committing to the revised visual treatment.
- Location unavailable currently produces an uncaught runtime error and needs graceful handling.
- Entry capture, persistence, entity extraction, attachment display, and entity navigation were observed functioning during this session.

#### Immediate Concerns

- Unhandled location failure.
- Navigation hierarchy and visual compression require refinement.

#### Follow-up Candidates

- Define vertical-tab interaction.
- Define wildcard semantics before implementation.
- Review telemetry treatment and workspace framing with graphic design.
- Investigate keyboard-open layout behavior.

#### Related Records

- DEVNOTES: None
- Tests: Exploratory only / related emulator TEST IDs as applicable
- Source: UI navigation, search, capture, location, entity and log screens

---

---

### DEV-2026-08-24-021 — Add code-structure constraints to master YAML

**Date:** 2026-08-24
**Time:** 11:07 EDT
**Engineer:** Michael Garcia
**Status:** ACCEPTED

#### Problem

The codebase is generally well documented, but some React/TypeScript implementation patterns can become harder to maintain when control flow is deeply nested inside anonymous callbacks, JSX, animation handlers, or local transformations.

An opposite failure mode is also possible: reducing local complexity by fragmenting behavior into excessive micro-components or files that do not have stable responsibilities of their own.

The master product YAML did not explicitly define the intended balance between these two concerns.

#### Context and Constraints

Captain’s Log is expected to remain modular, readable, and suitable for continued AI-assisted development.

Code structure should favor traceable control flow and explicit responsibilities without creating unnecessary abstraction or file fragmentation.

These constraints are intended to guide future implementation and refactoring. They do not require unrelated existing code to be mechanically rewritten solely for conformance.

#### Solutions Considered

Leave code-structure expectations implicit.

Require aggressive extraction of nested logic into functions, components, and files.

Add explicit master-YAML constraints favoring shallow named control flow while limiting extraction to cases with meaningful structural value.

#### Trade-offs

Leaving the expectations implicit permits inconsistent implementation patterns across future work.

Aggressive extraction can reduce local nesting but introduce excessive indirection, artificial micro-components, and unnecessary files.

Explicitly defining both the preferred control-flow structure and the limits on extraction provides clearer guidance while avoiding either extreme.

#### Final Outcome

Added the following engineering constraints to the master YAML:

engineering:
  code_structure:
    prefer_shallow_call_graphs: true
    prefer_named_functions: true
    anonymous_jsx_callbacks:
      allowed_for:
        - trivial_delegation
      avoid_for:
        - branching
        - animation_logic
        - geometry_calculation
        - data_transformation
        - state_transitions

    extraction_policy:
      extract_when:
        - stable_responsibility
        - reusable_contract
        - independently_testable_behavior
      do_not_extract_for:
        - line_count_reduction_only
        - artificial_micro_components
        - unnecessary_file_fragmentation

    principle: >
      Prefer shallow, named, single-purpose functions and components.
      Do not trade nested complexity for unnecessary file fragmentation.

These constraints establish that nontrivial control flow should generally be moved out of deeply nested anonymous callbacks and into named units, while extraction itself must be justified by responsibility, reuse, or testability rather than line-count reduction.

#### Implementation Impact

- Modify the master product YAML to add the new engineering.code_structure constraints.
- Future TypeScript/React implementation and refactoring should use these constraints as project-level guidance.
- The upcoming navigation/sidebar refactor is an immediate candidate for applying the rule because it introduces animation, geometry calculations, state transitions, and reusable tab behavior.

#### Verification Required

Perform T0 validation of the modified YAML:

- YAML parses successfully.
- Existing master-YAML structure remains valid.
- New keys are correctly nested under engineering.code_structure.
- No existing configuration is unintentionally overwritten or displaced.

#### Related Records

- `docs/DEVNOTES.md`
- DEV-2026-08-22-020 — Initial Android emulator findings
- Tests: Pending
- Source: `docs/captains-log.yaml`

#### Next Steps

- Add the specified block to the master YAML.
- Validate the YAML after modification.
- Apply the constraints during the navigation/sidebar refactor.

Do not perform unrelated repository-wide refactoring solely to conform existing code.

#### Deferred Decisions

None.

---

---

### DEV-2026-08-31-022 — Declarative UI Specification Architecture

**Date:** 2026-08-31
**Time:** 21:24 EDT
**Engineer:** Michael Garcia
**Status:** ACCEPTED
**Type:** DECISION

#### Problem

The current mobile UI implementation does not yet match the intended interaction model or visual structure.

The previous UI review identified several issues and open requirements:

- The current sidebar does not represent the intended traditional vertically oriented tab interaction.
- Search and Settings should be separate navigation targets.
- The Log tab requires chronological entry display and an empty state.
- Top telemetry is functionally useful but its final graphical treatment remains unresolved.
- Search requires `*` wildcard behavior.
- Navigation and application controls require a consistent icon strategy, likely based on vector/SVG assets.
- The user workspace requires stronger visual framing without materially reducing usable content area.
- The capture workspace should be storyboarded before the revised implementation is finalized.
- Location unavailability currently produces an uncaught runtime error.
- Existing capture, persistence, extraction, attachment, and entity-navigation behavior must be preserved through the UI refactor.

A consistent architectural boundary is needed between visual design, declarative UI specification, application behavior, and rendering implementation.

#### Context and Constraints

The revised mobile interface is being designed in Figma before implementation.

The UI must support later extension to additional form factors, including tablet and foldable layouts, without requiring duplication of reusable component definitions.

The UI specification should remain human-readable and suitable for agent-assisted implementation and review.

The declarative layer should describe UI intent, reusable components, visual tokens, typography, and layout composition.

The declarative layer should not contain:

- Business logic
- Complex rendering algorithms
- Application state machines
- Data transformations
- Complex vector path geometry
- Platform-specific implementation logic

Complex graphical geometry should remain in SVG/vector assets or renderer code.

React Native/TypeScript remains responsible for rendering, state handling, navigation behavior, platform integration, and application logic.

Figma remains the visual design and reference environment. The YAML specification is intended to become the canonical declarative description of the implemented UI rather than a one-to-one reproduction of the Figma layer hierarchy.

#### Solutions Considered

1. Continue defining UI directly in React Native/TypeScript

**Advantages:**

- Lowest immediate implementation overhead
- No additional schema or loading layer
- Native compile-time integration

**Disadvantages:**

- Visual decisions become distributed across implementation files
- Harder to distinguish design intent from renderer implementation
- Increased duplication across phone, tablet, and foldable layouts
- More difficult for human or agent review of the complete UI architecture

2. Maintain Figma as the sole UI specification

**Advantages:**

- Visual design remains centralized
- Strong graphical authoring workflow
- No additional declarative format required

**Disadvantages:**

- Figma layer structure contains graphical construction details that do not map cleanly to semantic application components
- Behavioral intent and application relationships are not fully represented
- Creates a weak boundary between design reference and implementation specification

3. Use a monolithic ui.yaml containing theme, typography, layouts, components, and behavior

**Advantages:**

- Single source file
- Easy initial discovery

**Disadvantages:**

- File would grow rapidly
- Weak separation of concerns
- Higher merge and maintenance cost
- Difficult to reuse components and layouts independently
- Encourages unrelated configuration to accumulate in one file

4. Use a modular YAML-based declarative UI specification

**Structure:**

```text
ui/
├── ui.yaml
├── theme.yaml
├── typography.yaml
├── layouts/
│   └── mobile.yaml
└── components/
    ├── status-header.yaml
    ├── scanner.yaml
    ├── title-block.yaml
    ├── viewport.yaml
    ├── navigation-rail.yaml
    └── action-dock.yaml
```

This separates root composition, design tokens, typography, form-factor layout, and reusable component intent.

#### Trade-offs

The modular YAML approach introduces additional schema-management and validation requirements.

A resolver will eventually be required to load references and normalize the UI specification before use by React Native.

If YAML is allowed to become executable or overly renderer-specific, it could duplicate responsibilities already handled more appropriately by TypeScript. The implementation boundary therefore needs to remain explicit.

Separating component definitions from layout definitions adds file count, but improves reuse and permits future form-factor layouts to share the same semantic components.

Using YAML as the canonical declarative specification also creates a synchronization requirement between Figma and repository implementation. Figma should therefore be treated as the design/reference environment rather than an independently authoritative runtime specification.

#### Final Outcome

Adopt a modular declarative UI specification under ui/.

ui/ui.yaml will serve only as the root manifest and will reference the active theme, typography specification, layouts, and reusable components.

Initial structure:

```yaml
ui:
  version: 1

  theme: ./theme.yaml
  typography: ./typography.yaml

  layouts:
    mobile: ./layouts/mobile.yaml

  components:
    status_header: ./components/status-header.yaml
    scanner: ./components/scanner.yaml
    title_block: ./components/title-block.yaml
    viewport: ./components/viewport.yaml
    navigation_rail: ./components/navigation-rail.yaml
    action_dock: ./components/action-dock.yaml
```

theme.yaml will define shared visual tokens such as palette, semantic colors, spacing, stroke widths, radii, opacity, and effects.

typography.yaml will define font families and semantic typography roles.

layouts/mobile.yaml will define mobile-region composition and component placement.

Files under ui/components/ will define reusable semantic UI components without reproducing Figma's graphical layer hierarchy.

Figma remains the visual design reference.

React Native/TypeScript remains responsible for rendering and executable behavior.

#### Implementation Impact

Affected or new paths:

- `ui/ui.yaml`
- `ui/theme.yaml`
- `ui/typography.yaml`
- `ui/layouts/mobile.yaml`
- `ui/components/status-header.yaml`
- `ui/components/scanner.yaml`
- `ui/components/title-block.yaml`
- `ui/components/viewport.yaml`
- `ui/components/navigation-rail.yaml`
- `ui/components/action-dock.yaml`

Future implementation may require:

- YAML schema validation
- Reference resolution
- UI-spec normalization
- Generated or strongly typed TypeScript representation
- Shared SVG/vector asset registry
- React Native component bindings

Existing UI implementation will eventually need to be reconciled with the new specification.

#### Verification Required

T0 validation is required for:

- YAML syntax
- Referenced file paths
- Required root keys
- Duplicate or unresolved component identifiers

T1 validation is required for:

- UI-spec loading and normalization
- Token reference resolution
- Component reference resolution
- Layout-to-component bindings

T2 validation is required for:

- Navigation rail behavior
- Search and Settings separation
- Log chronological ordering
- No entries yet empty state
- `*` wildcard search behavior
- Graceful location-unavailable handling
- Preservation of capture, persistence, entity extraction, attachment display, and entity navigation

T3 validation should be considered after the revised UI is integrated across supported device/form-factor targets.

No validation result is asserted by this record.

#### Related Records

- DEVNOTES: Previous UI review/findings entry; exact DEV ID to be linked
- Tests: Pending
- Source: `ui/`, Figma mobile UI reference, existing React Native navigation and capture implementation

#### Next Steps

- Create the `ui/` directory structure.
- Create the root `ui/ui.yaml` manifest.
- Define `theme.yaml` values from the Figma design.
- Define typography roles and font choices.
- Record mobile layout measurements from the Figma reference.
- Define semantic component YAML files.
- Establish SVG/vector asset naming and storage conventions.
- Determine whether YAML is loaded at runtime or compiled/generated into TypeScript.
- Implement schema validation.
- Reconcile the revised navigation model with the current React Native implementation.
- Implement remaining behavioral requirements from the prior UI review.
- Add required TEST records during implementation and validation.

#### Deferred Decisions

The following decisions remain intentionally deferred:

- Final graphical treatment of top telemetry/status information.
- Final capture-workspace interaction flow pending storyboard review.
- Exact production font family.
- Final primitive and semantic color values.
- SVG asset organization and rendering library.
- Runtime YAML loading versus build-time generation into TypeScript.
- Tablet and foldable layout specifications.

These should be resolved as the Figma design and implementation architecture mature.

---

---

### DEV-2026-09-07-023 — Portable Export and Long-Term Data Ownership

**Date:** 2026-09-07
**Time:** 13:06 EDT
**Engineer:** Michael Garcia & Emily Garcia
**Status:** ACCEPTED
**Type:** OBSERVATION

#### Problem

Captain’s Log currently emphasizes capture, persistence, metadata, entity extraction, search, and graph relationships, but does not yet define a first-class mechanism for exporting a user’s journal into durable, application-independent formats.

A key user concern is long-term accessibility. Journal content should remain readable and usable even if Captain’s Log is no longer available, the user changes platforms, or the data is being preserved for family or archival purposes.

The current action dock also contains an unresolved bottom-right action that may be better used for export.

#### Context and Constraints

The observation arose from discussion between Michael and Emily Garcia regarding journaling workflows and long-term ownership of personal notes.

Emily currently prefers generic note-taking tools for journaling because the resulting content feels portable, accessible from a computer, and less dependent on a specific application remaining available in the future.

Captain’s Log already assigns metadata such as dates and timestamps to entries, making structured export possible without requiring the user to manually organize journal content.

Export should preserve the accessibility of a conventional document while allowing Captain’s Log to retain richer application-specific capabilities internally.

Potential export scopes include:

* A specific day
* A date range
* Selected entries
* Current search results
* A topic or entity
* A connected cluster of related ideas
* The full journal/archive

Potential durable output formats include:

* Markdown
* Plain text
* HTML
* DOCX
* PDF
* Structured JSON/archive data

Long-term archival output should not depend exclusively on proprietary formats or Captain’s Log-specific software.

#### Solutions Considered

No final implementation solution has been selected.

Initial concepts include:

* A simple document export organized chronologically by date and timestamp.
* A multi-day export using dates and entry times as hierarchical headings.
* Document formats capable of exposing headings through a navigation pane, table of contents, or bookmarks.
* Topic- or graph-based export that collects related entries into a single document.
* A portable archive containing both human-readable journal content and machine-readable metadata.
* Repurposing the unresolved bottom-right action-dock control as an `EXPORT` action.

A potential archival structure is:

```text
Captains_Log_Archive/
├── README.md
├── log.md
├── entries/
├── attachments/
└── metadata/
    └── archive.json
```

#### Trade-offs

Providing multiple export formats increases implementation and validation requirements.

Presentation formats such as PDF and DOCX are convenient for reading and sharing but are weaker as canonical archival formats than plain-text-based representations.

Markdown provides strong long-term readability and portability but may be unfamiliar to some users.

Structured JSON preserves machine-readable metadata and relationships but is not appropriate as the sole human-readable archive.

Graph- or entity-based export introduces additional complexity because relationships must be resolved into a meaningful document ordering and hierarchy.

Exporting attachments introduces additional questions around file organization, duplication, naming, and broken references.

A first-class export function also creates a compatibility commitment: future schema changes should not prevent older records from being exported into durable representations.

#### Final Outcome

Portable export is recognized as a first-class product requirement for Captain’s Log.

The product should preserve a clear distinction between:

* Rich internal application representation
* Durable external representation

Captain’s Log may maintain application-specific metadata, entities, relationships, graph connections, and other derived information internally, but users should be able to export their journal into formats that remain accessible independently of the application.

The current product principle is:

> Captain’s Log may add intelligence to the user’s data, but should not trap that data inside Captain’s Log.

The unresolved bottom-right action-dock control should be evaluated as a potential `EXPORT` action.

#### Implementation Impact

Potentially affected areas include:

* `ui/components/action-dock.yaml`
* Export workflow UI
* Entry serialization
* Metadata serialization
* Attachment handling
* Graph/entity traversal
* Date-range selection
* Search-result export
* Document generation
* Archive generation
* Persistence compatibility
* Share/export platform integration
* Test coverage for export fidelity

Future component or workflow specifications may be required for:

* Export scope selection
* Export format selection
* Export preview
* Archive generation
* Share/save destination handling

#### Verification Required

T0 validation should cover:

* Export schema definitions
* Supported format declarations
* Serialization field requirements
* Archive path and naming conventions

T1 validation should cover:

* Entry ordering
* Date and timestamp formatting
* Metadata preservation
* Attachment reference generation
* Topic/entity selection
* Graph-connected entry resolution

T2 validation should cover:

* Single-day export
* Date-range export
* Selected-entry export
* Full-journal export
* Search-result export
* Topic/entity export
* Successful opening of generated files outside Captain’s Log
* Preservation of journal content after export and re-open
* Graceful handling of missing attachments or incomplete metadata

T3 validation should be considered for cross-platform export behavior and long-term archive compatibility.

No validation result is asserted by this observation.

#### Related Records

* DEVNOTES: Current UI redesign findings and action-dock investigation; exact DEV ID to be linked
* Tests: Pending
* Source: `ui/components/action-dock.yaml`, persistence model, entity/graph model, export implementation paths pending

#### Next Steps

* Add export to the current UI/product requirements.
* Evaluate replacing the unresolved bottom-right action-dock control with `EXPORT`.
* Define minimum supported export formats.
* Define export scope options.
* Define a durable archival format.
* Determine how headings, dates, timestamps, entities, and attachments are represented.
* Determine whether topic/entity exports should preserve chronological order, graph hierarchy, or both.
* Define export-specific schemas and tests before implementation.

#### Deferred Decisions

* Exact export formats supported in the first implementation.
* Whether Markdown is the canonical archival representation.
* Whether JSON metadata is included in all archives or only full exports.
* Exact archive directory structure.
* Whether graph-connected exports are available in the initial release.
* How attachments are packaged and referenced.
* Whether `EXPORT` permanently occupies the bottom-right action-dock position.
* Exact document heading hierarchy and navigation behavior.

---

### DEV-2026-09-07-024 — Proposed Figma and YAML UI Harmonization Plan

**Date:** 2026-09-07

**Time:** 17:46 EDT

**Engineer:** Codex

**Status:** PROPOSED

**Type:** DECISION

#### Problem

The new modular UI YAML specifications and the current Figma mobile HUD do not yet
share consistent references, names, visual structure, state definitions or tokens.
The draft specifications contain broken manifest references and status-header syntax
errors, and they differ from Figma in navigation/dock composition and several
graphical roles. Blindly treating either the raw Figma layer hierarchy or unfinished
YAML declarations as authoritative could change accepted visuals or remove existing
application capabilities.

#### Context and Constraints

DEV-2026-08-31-022 establishes YAML as the canonical declarative UI specification,
Figma as the visual reference, and TypeScript/React Native as the owners of executable
behavior and rendering. The actual new specifications reside under `src/ui/`.

The user requested an analysis-only harmonization plan for human approval. This pass
may create the Markdown plan and append this record only. It must not normalize YAML,
rename or modify Figma assets, create variables/components, change application code,
or delete anything. Existing worktree changes and historical DEVNOTES content must
be preserved.

The current Figma file is `dFwk8LAWauplWqrOKaQplU`, page `0:1`, HUD frame `2:20`.
Live default/hidden assets, style/token values and scanner keyframes were inspected.
The current file has four rail buttons and Camera/Gallery/Location/Add in its dock;
the draft YAML includes additional Settings/Export visual placements. Settings is an
existing application destination; DEV-2026-09-07-023 recognizes portable export while
leaving its dock placement undecided.

#### Solutions Considered

1. Reshape Figma to match all YAML declarations. Rejected for this pass: it would
   introduce unsupported visuals and potentially redesign the accepted HUD.
2. Copy Figma's raw hierarchy into YAML. Rejected: this would duplicate graphical
   construction details and discard legitimate runtime-only semantics.
3. Propose minimum necessary normalization with exact mappings, role distinctions,
   explicit removal candidates and approval gates. Recommended for human review;
   no harmonization implementation is authorized by this proposed record.

#### Trade-offs

Detailed node/property mappings reduce interpretation during later execution, but
must be revalidated against concurrent Figma and repository edits. Preserving current
appearance means some incomplete states and patterns remain unresolved rather than
being silently improved. Deferring Settings access, dock action semantics, telemetry
bindings, scanner timing and hidden active-state styling avoids accidental behavior
changes but requires human decisions before those portions can proceed.

#### Final Outcome

Created [UI_HARMONIZATION_PLAN.md](UI_HARMONIZATION_PLAN.md) for human review. It
classifies matched concepts, meaningful Figma-only additions, construction details,
runtime-only YAML semantics, unsupported visual candidates, token/style changes,
ambiguous mappings, risks and the exact later change surface.

The current pass is analysis-only. No Figma or YAML normalization changes have yet
been executed. No application code, variables, components or graphical assets have
been created, modified or deleted. The proposed plan is awaiting approval; this
record does not supersede or change the accepted architectural or product decisions.

#### Implementation Impact

Current documentation changes are limited to `docs/UI_HARMONIZATION_PLAN.md` and
this appended record in `docs/DEVNOTES.md`.

Affected specification paths for a later approved harmonization pass:

- `src/ui/ui.yaml`
- `src/ui/theme.yaml`
- `src/ui/typography.yaml`
- `src/ui/layout/mobile.yaml`
- `src/ui/components/status-header.yaml`
- `src/ui/components/scanner.yaml`
- `src/ui/components/title_block.yaml`
- `src/ui/components/viewports.yaml`
- `src/ui/components/navigation-rail.yaml`
- `src/ui/components/action-dock.yaml`

The plan identifies exact Figma node, variable and style IDs. Resolver construction,
SVG storage/export, font delivery and runtime UI integration remain separately scoped
work; no TypeScript, React Native, route or service changes are included in this pass.

#### Verification Required

Verification of proposed normalization and runtime behavior is pending. Read-only
parser/reference checks and live Figma inspection inform the plan but are not runtime
acceptance or a formal TEST PASS. No harmonized specifications have been tested.

- T0 after approved edits: YAML parsing, schema/root keys, unique IDs, manifest paths,
  token types/references and asset identifiers; documentation link and mapping checks.
- T1 when a resolver/renderer module exists: specification loading, token/component
  resolution, visual asset/state rendering and approved scanner-motion behavior.
- T2 during integration: navigation including Settings, approved dock action semantics,
  capture/commit, persistence, attachments, telemetry truth and location failure handling.
- T3 at the UI milestone: visual parity, hidden/default states, form factors,
  handedness, keyboard/safe-area behavior, typography and established workflow regressions.

Executed implementation verification must be recorded later in `docs/TEST_LOG.md`
under the repository standard. No test-log entry is added by this analysis-only pass.

#### Related Records

- DEVNOTES: DEV-2026-08-22-020, DEV-2026-08-31-022, DEV-2026-09-07-023
- Tests: Pending
- Source: `docs/UI_HARMONIZATION_PLAN.md`, the ten specification paths above,
  `src/ui/layout/NavigationRail.tsx`, `src/ui/layout/AppShell.tsx`,
  `src/ui/screens/CaptureScreen.tsx`, `src/theme/tokens.ts`
- Figma: [Mobile HUD, frame 2:20](https://www.figma.com/design/dFwk8LAWauplWqrOKaQplU?node-id=2-20)

#### Next Steps

- Review the Markdown plan and resolve or explicitly defer approval questions Q1–Q8.
- Record approval of the intended subset in a new DEVNOTES entry.
- Rebaseline live Figma/YAML before executing approved changes.
- Perform the plan's staged normalization and required verification only after approval.

#### Deferred Decisions

Settings access with a four-button rail; Add/commit/Export action placement and
contracts; status-source meanings and inactive appearances; scanner timing and tick
response intent; New's hidden active-light treatment; device chrome and safe-area
policy; absent grid/scanline rendering; semantic schema/typography units; and the
separate resolver/asset/renderer implementation strategy. See Q1–Q8 in the plan for
the evidence and specific decisions required.

---

### DEV-2026-09-07-025 — Approved Mobile HUD Implementation

**Date:** 2026-09-07

**Time:** 20:41 EDT

**Engineer:** Codex

**Status:** ACCEPTED

**Type:** DECISION

#### Problem

DEV-024 proposed harmonization only. The user now approves execution, including
React Native behavior, and resolves Q1–Q8 through explicit instructions A1–A8.

#### Context and Constraints

Figma is the visual authority; YAML owns declarative specification; TypeScript
owns behavior. Preserve existing artwork and hidden active states except the
explicit changes below. Preserve larger-screen workflows and historical records.

#### Decision

- A1: Place a three-bar Settings/future-options menu between scanner and NEW.
- A2: Dock order Add, Camera, Location, Export. Gallery belongs to Add's menu.
  NEW opens capture with Commit/Cancel replacing home rail destinations. Other
  rails expose safe contextual actions: Log New/Home, Search Clear/Home,
  Graph Reset/Home, Settings Home, detail Back/Home. Export is an explicit,
  non-mutating not-implemented stub pending the owner's export mechanics.
- A3: One backup row, synced or local only, with a reserved blank second row.
  Never infer synchronization from connectivity alone.
- A4: One continuous ten-second React Native animation clock; inner clockwise,
  outer counterclockwise about a shared scanner center. Respect reduced motion.
  This overrides Figma's opposite signs and bottom-arc HOLD artifact.
- A5/A6: Bundle original SVG exports and open-licensed fonts. Normalize YAML
  coordinates, colors, fonts, strokes and references against the live baseline.
  Generate checked-in TypeScript mechanically from YAML, not an independent
  hand-maintained visual specification. Keep geometry in assets, not YAML.
- A7: Do not render the unpainted grid/scanline reference layers.
- A8: Execute the prior plan where consistent with A1–A7. Runtime implementation
  is now explicitly in scope, superseding DEV-024's analysis-only restriction.

#### Rationale

Exact vector exports retain independently reusable assets. A compact mobile
shell can adopt the HUD without disrupting tablet/context-pane behavior.
Focus-scoped commands connect the rail to existing services and retain failed
drafts. Cancel requires confirmation when a draft contains data. A stub avoids
prematurely choosing data formats, privacy boundaries or export destinations.

#### Verification Required

T0 specification validation, deterministic generation, typecheck and lint;
T1 motion/action/specification contracts; T2 command-to-service behavior;
T3 regression and visual/runtime checks where the environment permits. Record
unexecuted device checks honestly; they remain release gates, not implied PASS.

#### Related Records

DEV-2026-08-31-022, DEV-2026-09-07-023, DEV-2026-09-07-024;
docs/UI_HARMONIZATION_PLAN.md. Tests will be appended after execution.

#### Deferred Decisions

Michael owns export mechanics and future hidden options/header content. The Export
stub must remain visibly unfinished and perform no archive reads or external writes
until a subsequent decision defines its contract.
