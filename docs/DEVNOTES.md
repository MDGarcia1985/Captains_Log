# Captain's Log — Development Notes

Append-only engineering journal. Follow `DEVNOTES_STANDARDS.md`.

---

### DEV-2026-08-20-001 — Greenfield Expo MVP bootstrap

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

### DEV-2026-08-20-002 — First vertical slice implemented

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

### DEV-2026-08-20-003 — Function header format mandated

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

### DEV-2026-08-22-001 — Initial Android emulator findings

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

### DEV-2026-08-24-001 — Add code-structure constraints to master YAML

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
- DEV-2026-08-22-001 — Initial Android emulator findings
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

### DEV-2026-08-31-001 — Declarative UI Specification Architecture

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

### DEV-2026-09-07-001 — Portable Export and Long-Term Data Ownership

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

### DEV-2026-09-07-002 — Proposed Figma and YAML UI Harmonization Plan

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

DEV-2026-08-31-001 establishes YAML as the canonical declarative UI specification,
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
existing application destination; DEV-2026-09-07-001 recognizes portable export while
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

- DEVNOTES: DEV-2026-08-22-001, DEV-2026-08-31-001, DEV-2026-09-07-001
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

### DEV-2026-09-07-003 — Approved Mobile HUD Implementation

**Date:** 2026-09-07

**Time:** 20:41 EDT

**Engineer:** Codex

**Status:** ACCEPTED

**Type:** DECISION

#### Problem

DEV-2026-09-07-002 proposed harmonization only. The user now approves execution, including
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
  is now explicitly in scope, superseding DEV-2026-09-07-002's analysis-only restriction.

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

DEV-2026-08-31-001, DEV-2026-09-07-001, DEV-2026-09-07-002;
docs/UI_HARMONIZATION_PLAN.md. Tests will be appended after execution.

#### Deferred Decisions

Michael owns export mechanics and future hidden options/header content. The Export
stub must remain visibly unfinished and perform no archive reads or external writes
until a subsequent decision defines its contract.

---

---

### DEV-2026-09-08-001 — Android HUD Bundle Failure from Missing Font Assets

**Date:** 2026-09-08
**Time:** 13:32 ET
**Engineer:** Michael Garcia -- Proposed fixes from Cursor--Grok 4.6
**Type:** OBSERVATION
**Environment:** Captain's Log React Native / Expo Android development build; Metro development server; HUD implementation from commit `7ee54f2`

#### Findings

- Android development server returns HTTP 500 while Metro attempts to bundle the application.
- Failure is an `UnableToResolveError` originating from `src/ui/layout/HudShell.tsx`.
- `HudShell.tsx` statically requires:
  - `assets/fonts/CaptainsHUDDisplay-Medium.ttf`
  - `assets/fonts/CaptainsHUDDisplay-SemiBold.ttf`
- Both `CaptainsHUDDisplay-*.ttf` files are absent from `assets/fonts/`.
- The relative asset path from `src/ui/layout/HudShell.tsx` is correct.
- `ShareTechMono-Regular.ttf` and the source Orbitron font files are present.
- `scripts/prepare-hud-fonts.py` is intended to generate the missing `Captains HUD Display` font files from Orbitron at weights 500 and 600.
- The font-preparation script appears not to have been run and its generated outputs were not committed.
- `typography.yaml` now uses `CaptainsHUDDisplayMedium` and `CaptainsHUDDisplaySemiBold`.
- Generated `uiSpec.ts` still references `OrbitronMedium` and `OrbitronSemiBold`.
- `npm run ui:check` currently reports `uiSpec.ts` as stale.
- Existing TEST records covered YAML/SVG generation, TypeScript, lint, HUD smoke, and web export, but did not verify Android native bundling.
- Current `generate-ui.mjs` asset validation checks SVG assets but does not verify referenced font files.

#### Immediate Concerns

- Android application cannot bundle or start while the required font assets are missing.
- Regenerating only the missing TTF files would leave `uiSpec.ts` inconsistent with the canonical YAML.
- Stale generated font-family names may cause HUD text to fall back to the system font after the bundle error is resolved.
- Existing validation does not detect missing bundled font assets before runtime.

#### Follow-up Candidates

- Run `scripts/prepare-hud-fonts.py` with `fonttools` available.
- Generate:
  - `assets/fonts/CaptainsHUDDisplay-Medium.ttf`
  - `assets/fonts/CaptainsHUDDisplay-SemiBold.ttf`
- Verify the generated font naming and licensing requirements.
- Commit the generated fonts while retaining the Orbitron source fonts and applicable OFL license text.
- Run `npm run ui:generate` to synchronize `uiSpec.ts` with the canonical YAML.
- Run `npm run ui:check`.
- Reload/rebuild the Android application and verify that the Metro 500 is cleared.
- Verify that HUD text renders with the intended `Captains HUD Display` font rather than a system fallback.
- Consider extending `generate-ui.mjs` validation to confirm that referenced font assets exist.
- Record native Android verification in TEST_LOG after remediation.

#### Related Records

- DEVNOTES: DEV-2026-09-07-003
- Tests: TEST-2026-09-07-002; TEST-2026-09-07-004; Android verification Pending
- Source: `src/ui/layout/HudShell.tsx`; `src/ui/HudArtwork.tsx`; `scripts/prepare-hud-fonts.py`; `assets/fonts/`; `typography.yaml`; generated `uiSpec.ts`; commit `7ee54f2`

---

---

### DEV-2026-09-08-002 — Nested VirtualizedList Runtime Warning

**Date:** 2026-09-08
**Time:** 14:42 ET
**Engineer:** Michael Garcia
**Type:** OBSERVATION
**Environment:** Captain's Log React Native / Expo Android development build; Android emulator; React Native Fabric renderer

#### Findings

- React Native emitted a console error stating:
  - `VirtualizedLists should never be nested inside plain ScrollViews with the same orientation`
- The warning indicates that a `VirtualizedList`-backed component is nested inside a plain `ScrollView` using the same scroll orientation.
- React Native warns that this configuration can interfere with list windowing and other `VirtualizedList` functionality.
- The stack trace originates through React Native `LogBox`, `VirtualizedList`, and the Fabric renderer.
- The application remained running when the warning was observed.
- The specific application component responsible for the nesting has not yet been identified.

#### Immediate Concerns

- Potential loss of `VirtualizedList` windowing behavior.
- Possible rendering, scrolling, memory, or performance issues for larger datasets.
- Severity and user-visible impact are not yet determined.

#### Follow-up Candidates

- Identify the application component containing the nested `ScrollView` and `VirtualizedList`.
- Determine whether the inner component is a `FlatList`, `SectionList`, or another `VirtualizedList` implementation.
- Confirm whether the parent and child scroll containers use the same orientation.
- Evaluate replacing the outer `ScrollView` with a `VirtualizedList`-backed container where appropriate.
- Evaluate moving surrounding content into `ListHeaderComponent` / `ListFooterComponent` if the inner list should remain the primary scrolling container.
- Re-test scrolling, list rendering, and memory behavior after any correction.
- Record a separate decision or implementation entry if the layout architecture is changed.

#### Related Records

- DEVNOTES: DEV-2026-09-08-001
- Tests: Exploratory only
- Source: Application component not yet identified; React Native `VirtualizedList` runtime warning

---

---

### DEV-2026-09-08-003 — Attachment Thumbnail Render Failure

**Date:** 2026-09-08
**Time:** 14:42 ET
**Engineer:** Michael Garcia
**Type:** OBSERVATION
**Environment:** Captain's Log React Native / Expo Android development build; Android emulator; Expo attachment storage and thumbnail generation path

#### Findings

- A console warning was emitted from the attachment thumbnail workflow.
- Diagnostic tag:
  - `[Captain's Log:attachment.thumbnail]`
- `Context.renderAsync` rejected while attempting to render a thumbnail.
- The failure was caused by inability to load the source image:
  - `file:///data/user/0/host.exp.exponent/files/ExperienceData/%2540mande-design%252Fcaptainslog/attachments/c0dd10d4-52cc-437b-be9a-14f9f5de7389/original.jpeg`
- Native error reports:
  - `java.lang.Exception: Loading bitmap failed`
- The warning is recorded through `src/utilities/diagnostics.ts`.
- The failing call originates from `storeImage()` in `src/adapters/filesystem/attachmentStorage.ts`.
- The application remained running after the warning was emitted.
- It is not yet established whether the original attachment file is missing, unreadable, malformed, incorrectly encoded in the URI, or unsupported by the thumbnail renderer.

#### Immediate Concerns

- Attachment thumbnail generation is failing for at least one stored image.
- The attachment may exist without a usable thumbnail.
- The encoded path segment `%2540mande-design%252Fcaptainslog` suggests the URI may contain double-encoded characters and should be investigated.
- It is not yet known whether this affects only legacy/test attachments or newly captured images.

#### Follow-up Candidates

- Verify whether `original.jpeg` physically exists at the expected attachment-storage location.
- Verify that the stored file is a valid decodable JPEG.
- Inspect URI construction and normalization in `attachmentStorage.ts`.
- Determine whether the `%2540` / `%252F` path segments are intentional or indicate double URL encoding.
- Test thumbnail generation with a newly captured image.
- Test thumbnail generation with an imported image.
- Determine whether thumbnail failure should fall back to displaying the original image or a placeholder.
- Confirm that attachment metadata does not mark thumbnail generation as successful when rendering fails.
- Add a targeted attachment-storage / thumbnail-generation test after the root cause is identified.

#### Related Records

- DEVNOTES: DEV-2026-09-08-001; DEV-2026-09-08-002
- Tests: Exploratory only
- Source: `src/utilities/diagnostics.ts`; `src/adapters/filesystem/attachmentStorage.ts`; attachment `c0dd10d4-52cc-437b-be9a-14f9f5de7389/original.jpeg`

---

---

### DEV-2026-09-08-004 — HUD Viewport Regression After Figma Asset Integration

**Date:** 2026-09-08  
**Time:** 14:51 ET  
**Engineer:** Michael Garcia  
**Type:** OBSERVATION  
**Environment:** Captain's Log React Native / Expo Android development build; Android emulator; HUD/Figma asset implementation active

#### Findings

- Graph content is no longer rendering in the graph viewport as it did prior to the Figma asset integration.
- The graph viewport frame renders, but the expected graph visualization/content is absent.
- Settings viewport becomes stuck and cannot be scrolled through normally.
- Viewport content appears to extend behind or beneath other HUD viewport layers.
- Similar background/underlay behavior appears to affect the Log and Search views.
- Log viewport content is visibly clipped and overlaps internal frame boundaries.
- Text and content from adjacent sections appear partially behind the viewport frame.
- The viewport appears to be layering decorative/frame assets independently from the scrollable content region rather than constraining content to the intended visible bounds.
- React Native continues to emit:
  - `VirtualizedLists should never be nested inside plain ScrollViews with the same orientation`
- The warning indicates that at least one `VirtualizedList`-backed component is nested inside a same-orientation plain `ScrollView`.
- The nested-scroll warning may be related to the observed stuck scrolling and viewport clipping, but causality has not yet been established.

#### Immediate Concerns

- Graph functionality appears visually nonfunctional.
- Settings viewport scrolling is impaired.
- Log and Search content may be rendering outside intended clipping/layout bounds.
- HUD frame assets may be obscuring or mis-layering application content.
- Nested `ScrollView` / `VirtualizedList` composition may be breaking windowing and scroll behavior.
- Current viewport implementation may not preserve the pre-Figma application behavior.

#### Follow-up Candidates

- Compare current viewport composition against the last known-good pre-Figma implementation.
- Identify where viewport content, decorative frame assets, and scroll containers are layered.
- Verify `zIndex`, absolute positioning, clipping, overflow behavior, and container bounds for HUD viewport assets.
- Identify the specific `ScrollView` / `VirtualizedList` nesting responsible for the React Native warning.
- Determine whether Log, Search, Graph, and Settings are sharing a parent scroll container that conflicts with their own list/scroll behavior.
- Verify that each viewport owns only the scrolling behavior required for its content.
- Confirm whether graph data is still being generated and passed to the graph renderer even though it is not visible.
- Check whether the graph is hidden behind a HUD asset, clipped outside the viewport, or not mounted.
- Preserve the accepted Figma visual frame while restoring pre-existing viewport behavior.
- Avoid redesigning the UI unless required to resolve the regression.
- Re-test Log, Search, Graph, and Settings independently after correction.
- Record targeted TEST_LOG entries for viewport scrolling, graph rendering, and content clipping after remediation.

#### Related Records

- DEVNOTES: DEV-2026-09-08-002
- Tests: Exploratory only
- Source: HUD viewport/layout components; Log view; Search view; Graph view; Settings view; React Native `ScrollView` / `VirtualizedList` composition

---

---

### DEV-2026-09-10-001 — Reproduction of Existing Android UI and Attachment Defects

**Date:** 2026-09-10
**Time:** 14:12 ET
**Engineer:** Michael Garcia
**Type:** OBSERVATION
**Environment:** Captain's Log React Native / Expo Android development build; Android emulator; no intervening code changes since prior observation

#### Findings

- The previously observed nested `VirtualizedList` warning is reproducible.
- React Native repeatedly reports that `LogScreen.tsx` renders a `SectionList` inside a same-orientation plain `ScrollView`.
- The reported application location remains `LogScreen.tsx:80`.
- The call stack passes through `LogRoute` and `RootLayout`.
- The warning repeats across rerenders during normal application execution.
- The previously observed attachment thumbnail failure is also reproducible.
- `Context.renderAsync` again fails to load a stored `original.jpeg`.
- The attachment URI again contains `%2540mande-design%252Fcaptainslog`, consistent with possible double URI encoding.
- No code changes were made before this reproduction.

#### Immediate Concerns

- Scroll ownership and list virtualization remain unresolved.
- Repeated warnings may correspond to the previously observed stuck scrolling and viewport clipping.
- Thumbnail generation remains unreliable for stored attachments.
- No evidence yet confirms whether the two defects are related.

#### Follow-up Candidates

- Trace the parent hierarchy above `LogScreen` to identify the plain `ScrollView` wrapping the `SectionList`.
- Inspect `RootLayout`, route wrappers, HUD viewport wrappers, and any shared shell components for same-orientation scrolling.
- Inspect attachment URI construction and normalization for double encoding.
- Verify whether the stored JPEG physically exists and is otherwise decodable.
- Re-test both issues after targeted fixes rather than changing unrelated UI or graph architecture.

#### Related Records

- DEVNOTES: DEV-2026-09-08-002; DEV-2026-09-08-003; DEV-2026-09-08-004
- Tests: Reproduction only; targeted verification Pending
- Source: `src/ui/screens/LogScreen.tsx`; `src/app/index.tsx`; `src/app/_layout.tsx`; `src/adapters/filesystem/attachmentStorage.ts`; `src/utilities/diagnostics.ts`

---

---

### DEV-2026-09-10-002 — Dock Context and Redundant Log Navigation

**Date:** 2026-09-10
**Time:** 14:12 ET
**Engineer:** Michael Garcia
**Type:** OBSERVATION
**Environment:** Captain's Log React Native / Expo Android development build; compact HUD navigation

#### Findings

- The action dock remains visible when navigating away from the New Record / Capture screen.
- The dock currently retains Capture-oriented controls even when the active viewport is Home, Graph, or Search.
- The intended dock behavior outside the Capture workflow has not yet been defined.
- Home currently presents the chronological log and is functionally equivalent to the LOG destination.
- The navigation rail therefore contains both HOME and LOG destinations that currently lead to the same primary content.

#### Immediate Concerns

- Dock controls may present actions that are irrelevant or misleading for the active viewport.
- Keeping both HOME and LOG in the navigation rail creates redundant navigation.
- Removing or repurposing navigation and dock controls before their contextual behavior is defined could prematurely constrain the HUD interaction model.

#### Follow-up Candidates

- Define the dock as a contextual action surface whose controls change according to the active viewport.
- Determine appropriate dock actions for:
  - Home
  - Graph
  - Search
  - New Record / Capture
  - Settings, if the dock remains visible there
- Determine whether the dock should disappear entirely on screens without meaningful contextual actions.
- Remove LOG from the navigation rail if Home remains the canonical chronological-log destination.
- Preserve the chronological log functionality on Home rather than maintaining two equivalent navigation destinations.
- Review whether removal of LOG creates space for a future distinct top-level destination.
- Define dock behavior in the canonical UI specification before implementing viewport-specific controls.

#### Related Records

- DEVNOTES: DEV-2026-09-08-004; DEV-2026-09-10-001
- Tests: Exploratory only
- Source: HUD action dock; navigation rail; Home/Log route behavior

---

---

### DEV-2026-09-11-001 — Restore compact HUD viewport scroll ownership

**Date:** 2026-09-11  
**Time:** 10:45 America/New_York  
**Engineer:** Codex  
**Status:** ACCEPTED  
**Type:** DECISION

#### Problem

The compact HudShell places the route stack inside a vertical plain ScrollView. LogScreen's vertical SectionList therefore has a same-orientation plain-scroll ancestor, producing the warning observed in DEV-2026-09-08-002 and reproduced in DEV-2026-09-10-001. The clipped viewport View does not remove the scroll ancestor.

#### Context and Constraints

The hierarchy is RootLayout/providers/AuthGate -> AppShell -> HudShell/ScrollView -> artboard/viewport Views -> Stack -> LogRoute -> LogScreen/SectionList. All compact routes share this shell; medium and expanded branches do not. Preserve SectionList as the chronological Log scroll owner, HUD geometry and route actions. Limit this update to the nested-scroll defect.

#### Solutions Considered

- Replace the shell ScrollView with a View and uniformly fit the artboard to available safe-area width and height: selected.
- Remove the wrapper without fitting height: rejected because the dock could become unreachable on shorter displays.
- Switch wrapper type by route: rejected because it can remount the route stack and still exposes retained screens to a scroll ancestor.
- Disable list scrolling or suppress the warning: rejected because neither preserves proper list ownership.

#### Trade-offs

Screen content retains its own scrolling while HUD chrome remains fixed. Height-constrained displays use a uniformly smaller artboard instead of scrolling the entire HUD; keyboard and viewport containment require Android verification. Existing Graph/Settings layout defects are not assumed resolved by this fix.

#### Final Outcome

Supersedes the width-only/outer-overflow scrolling aspect of DEV-2026-09-07-003, not its accepted artwork or navigation. Use a non-scrolling compact shell; Search and Settings retain their own ScrollViews, Graph retains its non-scrolling layout, and Capture retains its multiline input and keyboard handling. No duplicated stable scroll-ownership algorithm was found and no consolidation is warranted. Verification pending.

#### Implementation Impact

HudShell.tsx: replace the outer scroll owner with a View and fit uniform scale to safe-area width and height. Update the directly related mobile.yaml scaling comment; no YAML geometry or generated contract changes. No screen, service, persistence, navigation, dock, or attachment changes.

#### Verification Required

T0 typecheck, targeted lint and ui:check; existing node/HUD tests; Android runtime warning absence, chronological scrolling, entry expansion/collapse, entity selection and HUD containment. Check Search, Graph, Settings and Capture including keyboard behavior. Retain the exact runtime procedure in TEST_LOG. No new reusable module/T1 contract is introduced. Do not commit before required runtime checks pass.

#### Related Records

- DEVNOTES: DEV-2026-09-07-003; DEV-2026-09-08-002; DEV-2026-09-08-004; DEV-2026-09-10-001
- Tests: Pending
- Source: src/ui/layout/HudShell.tsx; src/ui/layout/mobile.yaml; src/ui/screens/LogScreen.tsx; src/app/_layout.tsx

#### Next Steps

Implement the bounded shell correction, execute required validation, and append observed results to TEST_LOG. Preserve unrelated working-tree changes and make one defect-only commit after verification.

#### Deferred Decisions

useSelectEntity and attachmentDisplayUri remain future candidates outside this update. EntityService.getInspector/getEntityInspectorData or equivalent inspector-query aggregation is explicitly deferred until the Graph contract and local data-engine architecture are resolved. No service-layer abstraction is introduced or modified.

---

---

### DEV-2026-09-11-002 — UI Observations after fixes implemented under DEV-2026-09-11-001

**Date:** 2026-09-11
**Time:** 13:01 ET
**Engineer:** Michael Garcia
**Type:** OBSERVATION
**Environment:** Captain's Log React Native / Expo Android development build; compact HUD navigation; Motorola Edge Plus 5G UW (2022)

#### Findings

- The nested `VirtualizedList` runtime warning documented under DEV-2026-09-08-002 was not reproduced during this test.
- Log scrolling now operates without generating new nested `VirtualizedList` warnings.
- The attachment thumbnail error documented under DEV-2026-09-08-003 persists.
- A new landscape-orientation issue was observed.
- When the phone is rotated to landscape orientation, the UI does not generate an appropriate horizontal layout.
- No landscape/horizontal HUD variant has yet been created for the current portrait/vertical HUD design.

#### Immediate Concerns

- Continue through the existing defect backlog.
- Add the landscape-orientation behavior as a separate backlog item.
- Do not treat portrait HUD correctness as proof of responsive or landscape support.

#### Follow-up Candidates

- Create a landscape HUD variant in Figma using the existing Captain's Log visual language and accepted UI specifications.
- Define the layout and behavior of existing controls in landscape orientation before implementation.
- Determine whether landscape uses the same navigation rail and dock semantics or requires orientation-specific placement.
- Add responsive/orientation behavior to the React Native implementation after the landscape design is approved.
- Verify button targets and contextual actions in the landscape layout.
- Add landscape-specific runtime verification on physical Android hardware.

#### Related Records

- DEVNOTES: DEV-2026-09-08-002; DEV-2026-09-08-003; DEV-2026-09-08-004; DEV-2026-09-11-001
- Tests: Visual/runtime test using `npx expo start --android` on a Motorola Edge Plus 5G UW (2022)
- Source: HUD/layout implementation; `src/utilities/diagnostics.ts`; `src/adapters/filesystem/attachmentStorage.ts`

---

---

### DEV-2026-09-11-003 - TASK-005 await attachment file copies

**Date:** 2026-09-11
**Time:** 20:51 America/New_York
**Engineer:** Codex
**Status:** IMPLEMENTED
**Type:** DECISION

#### Problem

TASK-005: thumbnail generation can run before the original image exists, and attachment metadata can be returned before the thumbnail copy completes.

#### Context and Constraints

Follow-up to DEV-2026-09-08-003 and DEV-2026-09-10-001. Reviewed project standards, specification, architecture, and versioned Expo SDK 57 documentation before implementation. Installed SDK 57 File.copy returns Promise<void>. The adapter ignored both copy promises. Native reproduction confirmed the original-copy race. The existing pre-fix original was accessible and decodable. Its %2540/%252F URI escapes are correct for Expo Go's literal encoded directory name; decoding them caused ENOENT.

#### Solutions Considered

Await both copies at the filesystem adapter boundary. Rejected URI decoding, UI workarounds, and metadata migration: the observed URI and stored metadata are valid.

#### Trade-offs

Creation now waits for actual bytes before generating a derivative or handing metadata to SQLite. Original-copy rejection propagates to the existing entry-service failure handling. Thumbnail-copy rejection uses the existing diagnostic and original-image fallback.

#### Final Outcome

Two awaited copies implement the correction. Impact classification: A, new creation, is reproduced; valid pre-fix stored attachments decode successfully. No legacy normalization is necessary for the observed storage format. No records are discarded and no schema or path format changes.

#### Implementation Impact

src/adapters/filesystem/attachmentStorage.ts; scripts/attachment-smoke.mjs; package.json adds the targeted smoke test to the existing regression command. No UI changes.

#### Verification Required

T0 typecheck/lint; T1 controlled asynchronous copy ordering and rejection checks; T2 native new/persisted/existing/missing attachment rendering and association checks; existing node regression suite.

#### Related Records

- DEVNOTES: DEV-2026-09-08-003; DEV-2026-09-10-001; DEV-2026-08-21-017
- Tests: TEST-2026-09-11-001; TEST-2026-09-11-002; TEST-2026-09-11-003
- Source: src/adapters/filesystem/attachmentStorage.ts; scripts/attachment-smoke.mjs

#### Next Steps

Complete the single TASK-005 verification cycle and independent commit.

#### Deferred Decisions

Recovery of actually missing original files or unsupported image formats is outside TASK-005. No evidence warrants a legacy URI migration.

---

---

### DEV-2026-09-11-004 - TASK-005 verification complete

**Date:** 2026-09-11
**Time:** 20:57 America/New_York
**Engineer:** Codex / Michael Garcia
**Status:** CLOSED
**Type:** DECISION

#### Problem

Close the verification required by DEV-2026-09-11-003 before the independent TASK-005 commit.

#### Context and Constraints

One task, minimum correction, one verification cycle, one commit. Preserve historical failed reproduction and setup evidence.

#### Solutions Considered

Retain the two awaited copies and existing URI format; no broader change is supported by the evidence.

#### Trade-offs

Native verification covers Android Expo Go. iOS was not exercised. Local test records and screenshots are excluded from version control.

#### Final Outcome

#### Final Outcome

Required T0/T1 checks and native T2 attachment checks passed. No attachment-related error was observed during verification. New thumbnails render immediately and after persisted retrieval; the valid pre-fix image renders; the missing-image record keeps the existing blank fallback without crashing. No production UI, schema, migration, or retrieval changes were required.

#### Implementation Impact

Only the storage adapter, targeted regression test, regression command, and append-only journals are committed.

#### Verification Required

Completed by the records below; no additional TASK-005 verification remains.

#### Related Records

- DEVNOTES: DEV-2026-09-11-003
- Tests: TEST-2026-09-11-001 through TEST-2026-09-11-005; passing gates are 003, 004, and 005
- Source: src/adapters/filesystem/attachmentStorage.ts; scripts/attachment-smoke.mjs; package.json

#### Next Steps

Commit TASK-005 independently and stop.

#### Deferred Decisions

Recovery of genuinely missing originals and unsupported image formats remains outside scope.

---

---

### DEV-2026-09-12-001 — TASK-006 harmonize mobile portrait/landscape specifications

**Date:** 2026-09-12  
**Time:** 21:53 America/New_York  
**Engineer:** Cursor Grok 4.6  
**Status:** IMPLEMENTED  
**Type:** DECISION

#### Problem

Compact HUD implementation was portrait-only. Landscape was an inferred flex/scale of the 390×844 artboard. Former TASK-011 (standalone landscape implementation) is superseded by TASK-006, which requires one canonical portrait/landscape specification shared between Figma and YAML, then implemented.

#### Context and Constraints

- Figma source of truth: file `dFwk8LAWauplWqrOKaQplU`, pages `Portrait_Viewport` (`0:1`) and `Landscape_Viewport` (`96:3`).
- Portrait root frame `Mobile_Portrait / 390×844` (`2:20`). Landscape root frame `Mobile HUD Landscape / 844x390` (`96:4`).
- Accepted portrait region values from TASK-006 are preserved; they are not recalculated from a rotated canvas.
- Home (`/`) already renders `LogScreen` chronological history. `/log` re-exported the same screen. DEV-2026-09-10-002 observed HOME and LOG as redundant.
- Do not invent tablet dimensions, new Graph/Search/Home dock semantics, or animations not in the accepted design.
- `app.json` already declares `orientation: default`.

#### Solutions Considered

- Rotate portrait YAML into landscape: rejected; TASK-006 forbids deriving landscape from portrait.
- Keep a single `uiSpec.layout` and generic flex in landscape: rejected; landscape must select the canonical specification.
- Delete `/log` route: rejected; keep as Home alias so old links do not 404, but remove the rail destination.
- Change tablet `NavigationRail` Log item: rejected as out of scope; medium/expanded still use Log as the chronological primary destination.

#### Trade-offs

YAML moves from `src/ui/layout/` + `src/ui/components/` to `src/ui/layouts/` with shared/portrait/landscape component overlays. Runtime HudShell now merges overlays. Landscape rail/handle SVGs are Figma-derived plates cleaned of export chrome. Native Android keyboard/safe-area rotation was not completed in this session; browser T2 exercised production HudShell at both reference viewports.

#### Final Outcome

- Semantic Figma frames renamed to canonical YAML identifiers on both viewport pages.
- `src/ui/layouts/mobile/{mobile,portrait,landscape}.yaml` plus shared/portrait/landscape component YAML.
- Tablet hierarchy established as `status: unsupported` with no invented regions.
- Portrait specification matches the accepted TASK-006 values, including scanner `(310,26,60,82)` even though live Figma scanner is `(315,28,60,82)`.
- Landscape specification uses Figma-measured 844×390 regions, including collapsed `action_dock` and `action_dock_handle`.
- Home rail is Graph / Search / New. LOG rail destination removed. `hudView('/log')` returns `home`. Home remains the chronological log.
- HudShell selects portrait vs landscape from window axes and implements collapsed landscape dock with handle toggle. Portrait dock remains always visible. Orientation change resets dock expansion without remounting route children.
- Former TASK-011 is superseded by TASK-006. No TASK-011 record existed in `docs/captains-log.yaml` or `docs/ROADMAP.md` to mark in backlog metadata.

#### Implementation Impact

Canonical UI YAML hierarchy under `src/ui/layouts/`; generated `uiSpec.ts` / `hudAssets.ts`; HudShell/HudArtwork/hudBehavior; HUD smoke and browser tests; append-only journals.

#### Verification Required

T0 YAML/generation/typecheck/lint; T1 hud-smoke; T2 hud-browser portrait/landscape/rotation/navigation. Native Android emulator rotation and keyboard remaining as PARTIAL.

#### Related Records

- DEVNOTES: DEV-2026-09-07-003; DEV-2026-09-10-002; DEV-2026-09-11-001; DEV-2026-09-11-001
- Tests: TEST-2026-09-12-001 through TEST-2026-09-12-004
- Source: `src/ui/ui.yaml`; `src/ui/layouts/`; `src/ui/layout/HudShell.tsx`; `src/ui/layout/HudArtwork.tsx`; `src/ui/layout/hudBehavior.ts`; `scripts/generate-ui.mjs`

#### Next Steps

User review, then one authorized TASK-006 commit. Native Android rotation/keyboard check when a Metro session for this working tree can be attached to emulator-5554.

#### Deferred Decisions

- Live Figma portrait scanner at `(315,28)` vs accepted YAML `(310,26)`: accepted YAML preserved.
- Left-handed mirroring remains portrait-only; landscape handedness is not designed.
- Tablet UI design and implementation.
- Contextual dock actions outside Capture (DEV-2026-09-10-002).
- Native Android IME/keyboard landscape space; browser harness has no IME.
- Landscape viewport accent SVG reuse stretches portrait accent assets to Figma landscape bounds.

---

---

### DEV-2026-09-13-001 - Keep the YAML shell mounted across rotation and size differences

**Date:** 2026-09-13

**Time:** 13:27 America/New_York (recorded)

**Engineer:** Codex

**Status:** IMPLEMENTED

**Type:** DECISION

#### Problem

AppShell mounted HudShell only below 600px wide. Rotating a 390x844 phone to
844x390 selected the medium pane UI before the HUD could consume landscape YAML.
Existing browser tests mounted HudShell directly and missed this boundary.

#### Context and Constraints

The user approved a plan to keep the correct orientation YAML, absorb size
mismatches with buffer space, remove geometry overrides, align screen behavior,
and test through AppShell. Tablet specifications remain unsupported placeholders.
This supersedes the medium/expanded shell retention in DEV-2026-09-12-001.

#### Solutions Considered

Widening the compact breakpoint would leave another cutoff and retain divergent
screen behavior. A single persistent AppShell layout context removes the bypass
and makes screen behavior depend on declared capabilities instead of width.

#### Trade-offs

Larger screens show the mobile composition with unused background space until a
tablet layout is designed. Native orientation follows display dimensions, while
fitting follows available window dimensions; a native split window therefore
retains the display orientation. Web orientation follows its own window. Native
keyboard and rotation events still require device verification.

#### Final Outcome

AppShell selects portrait/landscape generated YAML and supplies capabilities to
HUD and screens. Artboards are centered, retain reference size when possible,
and shrink uniformly only when required. Handedness coordinates and component
geometry come from YAML. Rotation preserves the shell and route subtree.
Browser regression now renders AppShell and verifies YAML bounds and workflows.

#### Implementation Impact

AppShell, HudLayoutContext, useHudViewport, HudShell, HudArtwork, hudBehavior;
Capture/Log/Search/Graph screen capability branches; mobile YAML and generated
uiSpec; generator validation; HUD contract/browser tests; architecture notes.

#### Verification Required

T0 typecheck/lint/generation and T1 orientation/fitting contracts passed. T2
AppShell browser integration passed after correcting a stale save-hold fixture.
Native T2 rotation/keyboard remains blocked by an empty adb device list.

#### Related Records

- DEVNOTES: DEV-2026-09-12-001
- Tests: TEST-2026-09-13-001 through TEST-2026-09-13-006
- Source: src/ui/layout/AppShell.tsx; src/ui/layout/useHudViewport.ts; scripts/hud-browser-test.mjs

#### Next Steps

Connect an Android device/emulator, load this working tree, and verify rotation
with a live draft and the keyboard open/closed. Owner: project maintainer or
follow-up verification session. Native release acceptance is pending that check;
browser verification is not evidence of native runtime correctness.

#### Deferred Decisions

Tablet-specific designs and landscape handedness remain undesigned. No dimensions
or behaviors were invented for those specifications.

---

---

### DEV-2026-09-14-001 — TASK-007 geometry authority and phone fitting

**Date:** 2026-09-14  
**Time:** 00:20 America/New_York  
**Engineer:** Codex  
**Status:** ACCEPTED  
**Type:** DECISION

#### Problem

The TASK-006 scale cap leaves excessive space on larger phones. The border scales
with the artboard, stale portrait assets are stretched into landscape, and the
landscape content rectangle exceeds its panel. Baseline: UI_LAYOUT_AUDIT_2026-09-13.md.

#### Context and Constraints

Figma is the final declarative authority for visual sizes, placements, and assets.
YAML is the final declarative semantic authority for canonical naming and application behavior.
Live frames 2:20 and 96:4 were re-read; correction nodes match the audit. The independent
snapshot is scripts/fixtures/task007-figma.json. Expo v57 reference was read before code changes.
One bounded TASK-007 correction; no feature expansion and no commit without explicit authorization.

#### Solutions Considered

Remove the scale cap, preserve a uniform fit, and draw the border outside the scale
transform. Retaining the cap cannot satisfy larger phones. Adding an artboard margin
would count the already inset border twice. Keep the accepted mobile layout family.

#### Trade-offs

Safe areas reduce usable dimensions. Aspect mismatch creates centered letterboxing
on one axis. Border inset stays 8 logical units inside the fitted frame; distance
from the usable boundary on the unfilled axis also includes that letterbox.
Content insets are a YAML decision, not a claimed Figma measurement.

#### Final Outcome

Selection: YAML override, YAML square rule (landscape), then native screen/web window
orientation. Fit scales up or down. Geometry fields distinguish region parents,
assetBounds/bezelBounds, core visibleBounds/exportBounds, content, and button targets.
Landscape content uses symmetric 20 horizontal / 22 vertical insets: 590 x 255.
Dock overlay semantics remain; handle clearance reduces the scrolling host inside
that content rectangle so the last row can be reached without being under the handle.
Heading title means the actual 231 x 30 text box; the parent remains 278 x 68.
Bundled font advance for NEW RECORD at 24 with nine 4.32 gaps is 230.088 units;
trailing tracking must not cause an ellipsis. Verify clipping separately in browser/native.

#### Implementation Impact

Correct menus, landscape outline/accents/divider, dock bezel bounds, landscape status
bezel absence, NEW artwork bounds and measured rail label positions. Keep core export
29 x 29 distinct from visible 13 x 13. Validate child containment and source fidelity
before regeneration; generated output remains an artifact.

#### Verification Required

Independent Gates A-D, required phone-size matrix, real Settings/Log scrolling and
existing interactions, native rotation/safe areas/keyboard. A connected emulator is
available. Final evidence and proposed commit inventory will be appended after execution.

#### Related Records

- DEVNOTES: DEV-2026-09-12-001; DEV-2026-09-13-001
- Tests: TASK-007 verification pending
- Source: UI_LAYOUT_AUDIT_2026-09-13.md; TASK-007 user specification

#### Next Steps

Implement, validate canonical sources before generation, test, and present results for review.

#### Deferred Decisions

DEV-2026-09-12-001 explicitly accepted portrait scanner (310,26) despite Figma (315,28).
This conflict has been presented to the user before changing it; retain that explicit
exception pending their response. Left-handed coordinates remain accepted YAML semantics.
No tablet implementation or new dock behavior is authorized.

---

---

### DEV-2026-09-14-002 — User Verification of TASK-007

**Date:** 2026-09-14
**Time:** 10:41 America/New_York
**Engineer:** Michael Garcia
**Type:** OBSERVATION
**Environment:** Captain's Log React Native / Expo Android development build; compact HUD navigation; Motorola Edge Plus 5G UW (2022)

#### Findings

The HUD insets still appear too large on the physical phone, and the artwork does not appear visually centered within the display.

Initial physical inspection suggested approximately 7.5 mm of clearance at the top, left, and bottom of the screen, with approximately 14 mm on the right while in landscape orientation. In portrait orientation, the same general pattern was observed, but the larger clearance appears at the bottom instead of the right.

A native portrait screenshot was captured and measured to quantify the discrepancy.

Screenshot dimensions:

```text
919 x 2047 px
```

Approximate outer HUD bounds:

```text
left   ≈ 76 px
right  ≈ 75 px
top    ≈ 119 px
bottom ≈ 216 px
```

This indicates:

```text
horizontal centering:
left/right difference ≈ 1 px
→ effectively centered

vertical centering:
bottom - top ≈ 97 px
→ significant upward bias
```

The portrait HUD is therefore not simply too small. The unused space along the long axis is being distributed asymmetrically.

The same issue appears to rotate with the device: portrait places the excess clearance primarily below the HUD, while landscape appears to place the excess primarily to the right. This suggests that the remaining aspect-ratio space or translation offset is being accumulated on the trailing side of the long axis rather than divided symmetrically.

The fitting logic should therefore be inspected independently from Figma geometry. Figma dimensions may already be correct while the runtime transform is positioning the fitted artboard incorrectly.

The target behavior should distribute unavoidable aspect-ratio remainder symmetrically:

```text
portrait:
extra vertical space / 2
→ top
→ bottom

landscape:
extra horizontal space / 2
→ left
→ right
```

The artwork should also scale as large as possible within the valid safe area while maintaining the authorized aspect ratio and preserving the final border-inset policy.

The landscape action dock works functionally, but not visually as intended. When it opens, the individual elements appear to materialize in sequence. The effect is fast, but still perceptible.

The intended behavior is for the complete dock to behave as one assembled unit and slide into view from below. The dock handle should remain pinned to the dock's top rail throughout the transition so that its visual relationship to the dock does not change.

Landscape handedness is also not functioning. After testing the interface in use, the preferred design decision is to leave landscape as a single canonical orientation rather than mirror the interface.

The left-handed option should therefore be disabled while in landscape orientation. It should remain visible but grayed out, and the application should preserve the user's portrait handedness preference so that it is restored when returning to portrait.

This behavior should translate more cleanly into the future tablet interface.

#### Immediate Concerns

The primary issue is the HUD fitting and centering behavior.

The current implementation must be inspected from:

```text
screen/window dimensions
→ safe-area rectangle
→ authorized artboard
→ scale calculation
→ aspect-ratio remainder
→ translation/centering
→ final rendered bounds
```

The correction should not introduce arbitrary device-specific offsets.

The objective is to:

```text
maximize authorized HUD scale
AND preserve aspect ratio
AND preserve safe-area requirements
AND distribute unavoidable excess space symmetrically
```

The landscape dock transition and landscape handedness behavior should also be corrected before TASK-007 is considered complete.

#### Follow-up Candidates

* Inspect runtime fit and translation calculations against the measured native screenshot.
* Compare runtime-selected YAML dimensions with the authoritative Figma dimensions.
* Confirm that long-axis aspect-ratio remainder is divided equally rather than accumulated on one side.
* Measure the landscape screenshot using the same method as portrait.
* Animate the landscape dock as one parent assembly rather than revealing child elements individually.
* Pin the dock handle to the dock's top rail throughout the transition.
* Disable and gray out left-handed mode while in landscape orientation.
* Preserve the user's portrait handedness preference while landscape is active.

#### Related Records

* DEVNOTES: DEV-2026-09-14-001
* Tests: Native visual inspection using Motorola Edge Plus 5G UW (2022)
* Source: HUD scaling, insets, Settings, landscape dock handle behavior, handedness behavior

---

---

### DEV-2026-09-14-003 — TASK-007 native corrective continuation

**Date:** 2026-09-14  
**Time:** 13:20 America/New_York  
**Engineer:** Codex  
**Status:** ACCEPTED  
**Type:** DECISION

#### Problem

User verification DEV-2026-09-14-002 reports approximately 97 physical pixels of
portrait vertical asymmetry on Motorola, sequential dock appearance, and unavailable
landscape handedness. TASK-007 remains open; no commit is authorized.

#### Context and Constraints

Figma owns visual geometry/assets; YAML owns semantics. The existing fit equation
already divides both remainders by two. The reported phone screenshot alone cannot
identify whether Dimensions, safe-area input, host bounds, or transforms disagree.
No ADB device is connected at this continuation; physical runtime measurements are pending.

#### Solutions Considered

Instrument legacy window fitting alongside measured host fitting. Use the real host
rectangle intersected with the provider's safe rectangle, not an assumed equality
between Dimensions.window and native root layout. Do not add device offsets or change
correct Figma dimensions. Keep dock assets mounted and animate one assembled parent.

#### Trade-offs

Native measurement is asynchronous; wait for the measured host before exposing its
geometry. Development diagnostics contain dimensions and layout identity, never entry
text. They support comparison on the actual phone and do not claim its root cause yet.
The Figma handle coordinate is the collapsed rest position; YAML now specifies its
expanded-state attachment above the bezel's top edge. Its width, height and x alignment
remain Figma-derived. A common parent translation preserves attachment during motion.

#### Final Outcome

Accepted landscape policy: right is canonical, left unavailable, stored portrait
preference preserved. Disable and dim Left in Settings; returning to portrait restores
the preference. Dock is preassembled, slides for 240 ms with cubic-out easing, and
respects reduced motion. The collapsed handle bottom is the reveal clipping boundary.

#### Implementation Impact

Add native fit diagnostics and measured host geometry; declare handedness and dock
transition semantics in YAML, regenerate only after source validation, and extend tests
for preference preservation, assembled motion, fixed handle/dock relationship and
host-versus-window size discrepancies. Existing outer/component Figma dimensions remain unchanged.

#### Verification Required

Gates A-D, regression tests, native before/after logs and screenshot measurements on
Motorola in both orientations. Prior emulator checks do not close the user's failure.

#### Related Records

- DEVNOTES: DEV-2026-09-14-001; DEV-2026-09-14-002
- Tests: continuation evidence pending
- Source: user's TASK-007 continuation and runtime layout files

#### Next Steps

Implement the bounded corrections, collect measured runtime evidence, and report any
remaining verification limits. Stop before commit and keep TASK-007 open.

#### Deferred Decisions

Exact Motorola centering cause remains unconfirmed until its runtime trace is available.
Portrait scanner retains the explicit DEV-2026-09-12-001 exception pending user resolution.

---

---

### DEV-2026-09-14-004 — TASK-007 corrective implementation and open physical gate

**Date:** 2026-09-14

**Time:** 13:44 America/New_York (recorded)

**Engineer:** Codex

**Status:** IMPLEMENTED

**Type:** DECISION / VERIFICATION FOLLOW-UP

#### Problem

DEV-2026-09-14-002 remains the physical acceptance failure. The Motorola's approximate
97 px vertical bias must be explained by measured runtime inputs, not by changing
Figma dimensions. This entry records the implementation of DEV-001/-003 and the
evidence still missing; IMPLEMENTED does not close TASK-007.

#### Context and Constraints

Figma remains visual authority and was accessed read only. YAML remains semantic
authority. No Motorola is connected. The user authorized continuation while requiring
TASK-007 stay open and forbidding a commit without explicit authorization.

#### Solutions Considered

Retain the existing symmetric fit formula but replace the assumed window rectangle
with the measured HUD host intersected with provider safe bounds. Record the old
window fit alongside the new result for diagnosis. Avoid device offsets and speculative
changes to correct Figma outer geometry. Preassemble dock assets and translate one
parent. Declare landscape support explicitly and preserve portrait preferences.

#### Trade-offs

Host/provider/dimension callbacks arrive asynchronously during rotation; traces include
intermediate handoffs, and only settled samples support current centering acceptance.
The Motorola root cause is still unknown. Browser host-size regression proves the
window-to-host assumption unsafe in a differing-host case, but does not prove that
it caused the user's physical result.

A reproduced web issue required registering onLayout on the font-loading root:
React Native Web did not attach its observer when the prop was added later to the
already mounted View. The new regression checks visibility, preventing geometry-only
assertions from accepting an opacity-zero HUD.

#### Final Outcome

Current implementation uses maximum uniform contain scale, symmetric remainder,
and an 8-logical-unit border outside the scaled artboard. Canonical geometry/source
validation precedes generation. YAML distinguishes artwork, parent, export/glow,
content and interaction bounds.

Landscape dock body and handle share a parent transform. Body assets remain mounted
and load before expansion. YAML declares 240 ms cubic-out motion and clipping at the
collapsed handle bottom; reduced motion is immediate. Figma's collapsed handle rest
position and expanded body dimensions remain unchanged. Expanded handle Y is derived
from the accepted above-bezel attachment, preserving contact throughout translation.

Landscape YAML supports only canonical Right. Settings shows a dim, disabled Left
and does not write portrait preference while landscape is active. Native and browser
round-trips restore portrait Left even after pressing Right in landscape.

#### Implementation Impact

See [TASK-007 report](TASK-007_REPORT_2026-09-14.md) for the complete file/asset/YAML
inventory, discrepancy table, fitting equations, runtime traces, before/after
measurements and proposed commit message. No Figma file was modified.

#### Verification Required

Recorded TEST-2026-09-14-001 through -019 preserve intermediate failures and retests.
Final typecheck/lint, independent authority/parity, HUD contracts and browser regression
pass. Existing node/attachment smoke tests pass. Native emulator fit and preference/
dock endpoint checks pass within their stated scope.

Measured emulator screenshot clearances before and after continuation are identical:
portrait L/R/T/B 58/58/183/96 px; landscape 392/233/180/96 px. Safe-relative portrait
clearances are L/R 58/58 and T/B 24/24; landscape L/R 233/233 and T/B 24/24.
The 24 px border inset equals 8 logical units at ratio 3. Steady scale is 1.090442314
portrait and 0.953846154 landscape. No improvement is claimed where the old emulator
window and host already agreed. Full traces and screenshot edge measurements are in
scripts/fixtures/task007-native-fit.json.

#### Related Records

- DEVNOTES: DEV-2026-09-14-001; DEV-2026-09-14-002; DEV-2026-09-14-003
- Tests: TEST-2026-09-14-001 through TEST-2026-09-14-019
- Report: docs/TASK-007_REPORT_2026-09-14.md
- Source evidence: scripts/fixtures/task007-figma.json; scripts/fixtures/task007-native-fit.json

#### Next Steps

Keep TASK-007 OPEN. Capture the current working-tree Motorola portrait/landscape
HUD_FIT diagnostics and screenshots, identify the exact erroneous boundary, then
correct only that boundary if further correction is required. Complete dock motion
and docked-IME native review. Owner: Codex with connected device supplied by the user/
maintainer. This is a verification dependency, not a new approval requirement.

The proposed commit message is `TASK-007 fix(ui): reconcile Figma geometry and responsive HUD fitting`.
No files are staged or committed by this pass. Explicit user authorization is required
before any commit.

#### Deferred Decisions

Physical Motorola root cause and after-fit acceptance remain blocked by device access.
The portrait scanner (310,26) versus Figma (315,28) remains the named accepted exception
from DEV-2026-09-12-001 pending a decision to supersede it. Floating Gboard was observed;
a docked keyboard shrinking the native window has not been verified. These limits
remain visible in the report and do not authorize closure.

---

---

### DEV-2026-09-14-005 — Supersede whole-artboard fit with full-window layout

**Date:** 2026-09-14

**Time:** 13:50 America/New_York

**Engineer:** Codex

**Status:** ACCEPTED

**Type:** CORRECTIVE DIRECTION

#### Problem

The previous whole-artboard aspect-ratio-preserving fit was an incorrect implementation
assumption. Treating the 390 x 844 / 844 x 390 Figma frames as runtime aspect-ratio
constraints caused artificial unused space. Improving its centering does not implement
the user's intended responsive model.

#### Context and Constraints

The user explicitly supersedes global scaling, whole-HUD letterboxing and centering a
scaled Figma frame. Figma continues to own fixed component dimensions, placement and
spacing relationships, assets and orientation composition. YAML continues to own names,
behavior, anchors/stretch rules, flexible/fixed classification and safe-area behavior.

This supersedes the fitting assumptions and related completion targets in
DEV-2026-09-14-001, -003 and -004. The independent asset corrections, geometry distinctions,
assembled dock and landscape handedness policy are not revoked. Earlier uniform-fit
test results remain historical evidence, not acceptance of the new model.

#### Solutions Considered

Replace the global fit transform with a full-window canvas, fixed/anchored component
groups and flexible viewport/rail regions. Preserve reference relationships and fixed
artwork. Extend flexible edge segments rather than distort corner vectors or scale icons.
Do not add another centering translation or an unspecified intermediate UI.

#### Trade-offs

Reference fixed widths do not fit every smaller window. A 350-unit portrait dock cannot
fit inside a 320-unit window with an 8-unit border inset. The fixed header/scanner row
also needs about 390 units to preserve its gaps. Three portrait rail targets require
465 units before spacing. These require explicit local contraction/overflow policies;
they do not authorize a return to whole-HUD scaling.

A user question about narrow dock container/spacing contraction is pending. Header
minimum-width handling and short-rail behavior are explicitly identified in the report.
No replacement runtime implementation starts until classification/policy is clear.

#### Final Outcome

Accepted target pipeline:

device window -> full-window HUD canvas -> fixed/anchored regions -> flexible regions.

The canvas and background cover the window; the border stays 8 logical units from
actual window edges. Safe areas constrain necessary interactive/content groups, without
shifting or letterboxing the complete HUD. Portrait and landscape retain their named
compositions. Fixed asset dimensions and typography are preserved.

#### Implementation Impact

Pre-code classification tables for every major portrait and landscape region are in
[Full-window classification](TASK-007_FULL_WINDOW_LAYOUT_2026-09-14.md). Each records
Figma reference bounds, class, fixed dimensions, anchors, stretch axes and safe needs.
The previous report is marked historical/superseded. No runtime code has been changed
for this newly requested model yet.

#### Verification Required

Replace global-scale/letterbox tests with full-window canvas, actual-edge border,
fixed component size/shape, flexible-space consumption, orientation and no-global-
transform checks. Then verify both orientations on the physical Motorola. No physical
acceptance can be inferred from previous emulator measurements of the superseded model.

#### Related Records

- DEVNOTES: DEV-2026-09-14-001; DEV-2026-09-14-002; DEV-2026-09-14-003; DEV-2026-09-14-004
- Tests: TEST-2026-09-14-020; TEST-2026-09-14-021
- Report: docs/TASK-007_FULL_WINDOW_LAYOUT_2026-09-14.md
- Authority: user's CORRECTIVE DIRECTION - TASK-007

#### Next Steps

Settle the listed narrow/short-window constraints, encode the classifications in canonical
YAML, replace the runtime model, and execute the replacement tests. Keep TASK-007 OPEN.
Do not commit without explicit user authorization.

#### Deferred Decisions

Narrow portrait dock/header and insufficient-height rail policy; physical phone access.

---

---

### DEV-2026-09-18-001 — TASK-007 schema 3 resolver and full-window runtime

**Date:** 2026-09-18  
**Time:** 12:20 America/New_York  
**Engineer:** Cursor Grok 4.6 agent  
**Status:** IMPLEMENTED  
**Type:** DECISION

#### Problem

DEV-2026-09-14-005 accepted a full-window HUD and superseded whole-artboard scale/letterbox, but generator, tests, and HudShell still expected artboard fitting and deprecated layout directories. Canonical paths are `src/ui/ts_layout/` and `src/ui/yaml_layout/`. Planning documents belong under `docs/planning/`.

#### Context and Constraints

User-authorized sequence: path hygiene, YAML contract validator, schema 3 generator, pure resolver with smoke tests, runtime wiring, harness migration, documentation, physical Motorola verification. Hard stops: do not wire HudShell while resolver tests are red; do not regenerate from non-schema-3 YAML; do not close TASK-007 without physical-device verification; do not commit without explicit authorization. Do not restore `src/ui/layout/` or `src/ui/layouts/`.

#### Solutions Considered

A parallel compatibility tree under the deprecated directories was rejected. Runtime continues to consume generated `uiSpec.ts` after schema 3 generation rather than parsing YAML in the app. Global scale was not retained as a fallback below minimum windows.

#### Trade-offs

Portrait windows below 362×481 and landscape windows below 775×206 report `unsupported_size` instead of inventing a layout. Short rails scroll locally after gaps reach min. Portrait dock width may contract between preferred 350 and min 326 using declared gaps; icons stay fixed. Flexible SVG edge extension is still approximate where a 9-slice is not implemented: corner accents are repositioned at resolved bounds, and the dock bezel keeps its Figma 350×96 envelope.

#### Final Outcome

Schema 3 YAML is executable. `resolveHudLayout` places regions from the actual window. HudShell fills the window with no global transform. Authority gates, resolver smoke, HUD contracts, and browser T2 pass. No Motorola was attached, so TASK-007 remains OPEN.

#### Implementation Impact

`src/ui/ts_layout/resolveHudLayout.ts`, `useHudResolve.ts`, `HudShell.tsx`, `AppShell.tsx`, `HudDock.tsx`, `HudArtwork.tsx`, `HudLayoutContext.tsx`, `hudBehavior.ts`; `scripts/ui-yaml-contract.mjs`, `generate-ui.mjs`, `ui-authority-test.mjs`, `hud-resolve-smoke.ts`, `hud-smoke.ts`, `hud-browser-test.mjs`; `docs/ARCHITECTURE.md`; `docs/planning/` for roadmap and TASK-007 planning files; `README.md`; `CONTRIBUTE.md`; `docs/captains-log.yaml`.

#### Verification Required

T0 typecheck; T1 YAML contract, generator/authority, resolver smoke, HUD contracts; T2 browser harness; T3 physical Motorola portrait and landscape. Do not treat browser PASS as physical completion.

#### Related Records

- DEVNOTES: DEV-2026-09-14-005; DEV-2026-09-14-001; DEV-2026-09-14-003; DEV-2026-09-14-004
- Tests: TEST-2026-09-18-001; TEST-2026-09-18-002; TEST-2026-09-18-003; TEST-2026-09-18-004
- Source: `src/ui/ts_layout/`; `src/ui/yaml_layout/`; `scripts/ui-yaml-contract.mjs`; `scripts/hud-resolve-smoke.ts`

#### Next Steps

Run portrait and landscape verification on the physical Motorola when it is attached. Keep TASK-007 OPEN. Do not commit without explicit user authorization.

#### Deferred Decisions

Physical Motorola acceptance; tablet YAML; true 9-slice extension of flexible bezels and title rules.

---

---

### DEV-2026-09-18-002 — TASK-007 provider-local obstruction coordinates

**Date:** 2026-09-18

**Engineer:** Codex

**Status:** IMPLEMENTED; physical acceptance pending

**Type:** CORRECTION

The physical trace showed safe top/left added to matching negative window host
origins. Installed RN Android Fabric measurement and safe-area-context use different
origins in the relevant viewport-offset branch. The HUD now intersects its parent-local
`onLayout` bounds with provider-local safe edges. `measureInWindow` is diagnostic
only, with complete callback rectangles and stale-callback suppression. No YAML,
generated reference geometry, or Figma fixture was changed.

New orientation resolution waits for matching host/provider axes. HudDock defers
its orientation transition until that resolution is ready. Pure and production-hook
browser tests cover the supplied negative offsets and both stale-host rotations;
the full HUD browser suite, typecheck, and authority gates pass.

See [the source investigation](planning/TASK-007_COORDINATE_INVESTIGATION_2026-09-18.md)
and TEST-2026-09-18-005. TASK-007 remains OPEN pending physical verification of the
corrected bundle.

---

---

### DEV-2026-09-20-001 — User Verification of TASK-007

**Date:** 2026-09-20
**Time:** 10:07 America/New_York
**Engineer:** Michael Garcia
**Type:** OBSERVATION
**Environment:** Captain's Log React Native / Expo Android development build; compact HUD navigation; Motorola Edge Plus 5G UW (2022); Google Pixel 10 XL PRO

#### Findings

- Most Figma placements have been resolved
- Figma updates are not propagating through to the client build during fetch

#### Immediate Concerns

- Labels removed in Figma are still present in the client-side app
- Spacing updates for the doc and other objects are not updated in the client-side app

#### Follow-up Candidates

- Investigate workflow options to automate Figma releases that update to the application without manual adjustments to the app

#### Related Records

- DEVNOTES: DEV-2026-09-08-001, DEV-2026-09-08-002
- Tests: Native visual inspection using Motorola Edge Plus 5G UW (2022), Google Pixel 10 XL PRO
- Source: HUD scaling, insets, Settings, landscape dock handle behavior, handedness behavior

---

---

### DEV-2026-09-20-002 — Independent schema version audit

**Date:** 2026-09-20  
**Time:** 21:40 America/New_York  
**Engineer:** Cursor Grok 4.6 agent  
**Status:** ACCEPTED  
**Type:** DECISION

#### Problem

The account-authentication prompt required an independent check of SQLite, graph, UI, and related schema versions before recording an authoritative identity contract. Codex reported SQLite persistence version 2 and warned that a recent change may have introduced a version 3 somewhere in the project.

#### Context and Constraints

Do not use one ambiguous `schema_version` for unrelated systems. Repository evidence wins over the Markdown plan. SQLite migrations, HUD layout generation, backup snapshots, and product YAML are separate namespaces.

#### Solutions Considered

1. Treat any "schema 3" as a SQLite user_version 3 and plan a database migration.
2. Inspect each version field and assign independent numbers, leaving SQLite at 2 if no migrateV3 exists.
3. Invent a unified global schema version for identity work.

Option 1 is contradicted by code. Option 3 collapses unrelated systems. Option 2 matches the prompt.

#### Trade-offs

Independent versions mean a UI generator bump does not imply a database migration, and an identity contract bump does not rewrite logs. Implementers must name the namespace they are changing.

#### Final Outcome

Recorded versions:

- SQLite archive `DATABASE_VERSION` / `PRAGMA user_version`: **2**. `migrate()` only runs `migrateV1` then `migrateV2`. There is no `migrateV3` and no `user_version = 3`.
- HUD layout generator: **schema_version 3** in `src/ui/yaml_layout/mobile/mobile.yaml` and generated `uiSpec.ts`. This is the project's "schema 3". See DEV-2026-09-18-001.
- UI manifest `src/ui/ui.yaml`: **version 1**, distinct from the layout generator.
- Graph entity/relationship contract: **version 1**, assigned to the current implicit `ENTITY_TYPES` / `RELATIONSHIP_TYPES`. No prior independent graph version field existed.
- Drive backup snapshot manifest: **schemaVersion 1**.
- Account identity, sync protocol, and sharing protocol contracts: **version 1**, newly specified.

Codex's SQLite version 2 finding is still correct. The schema-3 concern is not a persistence change.

#### Implementation Impact

`docs/ACCOUNT_IDENTITY.yaml` `schemas` block; `docs/planning/ACCOUNT_AUTHENTICATION_PLAN_2026-09-20.md` section 7; identity phases must increment only the namespace they change.

#### Verification Required

T0/T1 parse of `docs/ACCOUNT_IDENTITY.yaml` against `DATABASE_VERSION`, `ui.yaml`, `mobile.yaml`, and the absence of SQLite v3.

#### Related Records

- DEVNOTES: DEV-2026-09-18-001
- Tests: Pending TEST-2026-09-20-001
- Source: `src/adapters/sqlite/schema.ts`; `src/adapters/sqlite/database.ts`; `src/adapters/sqlite/migrations.ts`; `src/ui/ui.yaml`; `src/ui/yaml_layout/mobile/mobile.yaml`; `src/adapters/googleDrive/googleDriveBackupProvider.ts`

#### Next Steps

Keep these namespaces independent during implementation. Do not bump SQLite because identity types were added.

#### Deferred Decisions

Whether a later graph-type change requires a SQLite migration remains case-by-case.

---

---

### DEV-2026-09-20-003 — Authoritative account identity architecture

**Date:** 2026-09-20  
**Time:** 21:45 America/New_York  
**Engineer:** Cursor Grok 4.6 agent  
**Status:** ACCEPTED  
**Type:** DECISION

#### Problem

Codex produced `docs/planning/ACCOUNT_AUTHENTICATION_PLAN_2026-09-20.md` with unresolved D1–D12. Implementation cannot start from that draft: several recommendations conflict with later approved decisions, and some repository facts were incomplete (UI schema 3, SQLCipher availability, `expo-dev-client` missing, `usesNonExemptEncryption: false`, `secureKv` localStorage, AuthGate password gate, backup error strings in SQLite).

#### Context and Constraints

Approved prompt decisions D1–D12 supersede unresolved Codex recommendations. Local-first operation, no custom cryptography, no provider tokens in SQLite/YAML/UI/diagnostics/exports/backups, no authorization from UUID possession, and no remote disablement deleting local data are invariants. Google Universal Sign-In licensing is not authorized. Expo SDK 57 versioned docs apply.

#### Solutions Considered

1. Implement Codex's Google-plus-mandatory-2FA sequence directly.
2. Treat the Markdown plan as authoritative and only fill gaps.
3. Independently verify the repository, publish `docs/ACCOUNT_IDENTITY.yaml` as the contract, accept D1–D12, and record D13–D30 before code.

Option 1 conflicts with risk-adaptive MFA, passkeys-as-factors, and the local-profile-first rule. Option 2 would preserve stale open questions. Option 3 is required by the prompt.

#### Trade-offs

A YAML contract delays native Google work until P08 and encryption until P04. That is intentional: Google native is license-gated, and claiming archive encryption from the current password gate would be false. An in-repo TypeScript authority keeps UUID ownership but does not choose a production host.

#### Final Outcome

`docs/ACCOUNT_IDENTITY.yaml` is the authoritative account, identity, authentication, MFA, device trust, grant, sync, sharing, backup, recovery, and migration contract.

Material independent findings versus the Codex plan:

- D4 is risk-adaptive MFA, not mechanical two-factor on every event.
- D5 keeps the authority as a grant issuer, not a Drive proxy.
- Passkeys are factors (D14); `created_with` may still be `passkey`.
- Expo SDK 57 `expo-sqlite` documents SQLCipher via `useSQLCipher`; current plugin does not enable it (D15).
- `account_required: true` is reconciled to local-first (D2, D26).
- Universal Sign-In remains blocked on operator license/registry access (D25). Do not install the public/legacy package as a fallback, and do not keep implicit AuthSession as a security fallback.
- First implementation phase after this document is P01 (TypeScript contracts), with rollback limited to new model files.

#### Implementation Impact

`docs/ACCOUNT_IDENTITY.yaml`; `docs/planning/ACCOUNT_AUTHENTICATION_PLAN_2026-09-20.md` decision register and phase-line; `docs/captains-log.yaml` authentication and authority; `docs/ARCHITECTURE.md` authentication; `scripts/account-identity-yaml-smoke.ts`; `package.json` `test:node` / `test:account-yaml`. No native modules, no encryption, no Google SDK, and no authority server were added in this phase.

#### Verification Required

T0/T1 YAML parse and schema-evidence assertions. Device tests are not required for P00.

#### Related Records

- DEVNOTES: DEV-2026-09-20-002; DEV-2026-08-21-007; DEV-2026-08-21-009
- Tests: Pending TEST-2026-09-20-001
- Source: `docs/ACCOUNT_IDENTITY.yaml`; `scripts/account-identity-yaml-smoke.ts`

#### Next Steps

Run the YAML smoke test. Then implement P01 identity TypeScript contracts only.

#### Deferred Decisions

D13 production hosting; D25 Universal Sign-In license; D9 Google Cloud projects; D20 iOS export compliance legal review; exact Universal package version pin after license access.

---

---

### DEV-2026-09-21-001 — Reclassify independent architecture as proposed review

**Date:** 2026-09-21  
**Time:** 12:20 America/New_York  
**Engineer:** Cursor Grok 4.6 agent  
**Status:** ACCEPTED  
**Type:** DECISION

#### Problem

DEV-2026-09-20-003 recorded D13–D30 as ACCEPTED. Several of those items were new architectural choices, not restatements of approved D1–D12. Premature P01 TypeScript contracts were also started. Seven security-sensitive questions were still unspecified: device proof-of-possession, passkey RP/bootstrap, AEK recovery after total device loss, shared-object key distribution, CL session storage, grant rotation/device binding, and the email login mechanism. P29 also allowed a security/beta gate without first-delivery passkeys, email, TOTP, or recovery.

#### Context and Constraints

D1–D12 remain APPROVED. Implementation must not proceed on newly invented architecture until explicit review. First-delivery methods are passkey, Google, verified email, and TOTP, plus recovery.

#### Solutions Considered

1. Leave D13–D30 as self-accepted and continue P01.
2. Reclassify only the seven new IDs and keep D13–D30 accepted.
3. Reclassify materially new D13–D30 items as PROPOSED_REVIEW, add D31–D37, revert P01, and require first-delivery auth plus recovery before P29/P30.

Option 1 repeats the overreach. Option 2 would still treat SQLCipher, JWS grants, optional first-launch password, and authority hosting as approved. Option 3 matches the review request.

#### Trade-offs

Holding P01 delays TypeScript contracts. That is cheaper than implementing a grant or passkey design that later fails review. Restatements (D18, D19, D21–D23, D25–D27) stay as facts or consequences so the register is not all noise.

#### Final Outcome

D13, D14, D15, D16, D17, D24, D28, D29, D30, and D31–D37 are PROPOSED_REVIEW. Premature P01 model files were deleted. `document.implementation_started` is false. P29 now requires P08, P10, P12, P13, and P14. No identity implementation proceeds until the proposed set is accepted, rejected, or revised.

#### Implementation Impact

`docs/ACCOUNT_IDENTITY.yaml` decision register, `beta_gate`, and P29 prerequisites; `docs/planning/ACCOUNT_AUTHENTICATION_PLAN_2026-09-20.md`; `scripts/account-identity-yaml-smoke.ts`; removal of P01 contract modules.

#### Verification Required

Re-run YAML smoke so D13/D14 are PROPOSED_REVIEW, D31–D37 exist, and P29 lists the first-delivery phases.

#### Related Records

- DEVNOTES: DEV-2026-09-20-003
- Tests: Pending TEST-2026-09-21-001
- Source: `docs/ACCOUNT_IDENTITY.yaml`

#### Next Steps

Present D13–D17, D24, D28–D37 for review. Do not start P01.

#### Deferred Decisions

All PROPOSED_REVIEW IDs in this entry.

---

---

### DEV-2026-09-21-002 — Approve Signal-inspired cryptographic direction

**Date:** 2026-09-21  
**Time:** 21:40 America/New_York  
**Engineer:** Cursor Grok 4.6 agent  
**Status:** ACCEPTED  
**Type:** DECISION

#### Problem

D31, D33, D34, D35, and D36 were held as PROPOSED_REVIEW. The operator accepted a Signal-inspired direction: device proof-of-possession, user-held archive recovery, recipient-specific object encryption without a messaging ratchet, isolated Captain's Log session storage, and short-lived JWS grants with signing-key rotation.

#### Context and Constraints

D1–D12 remain APPROVED. Implementation still must not start P01 while remaining proposed-review items are open. Captain's Log stores persistent versioned objects, so Signal's Double/Triple Ratchet is not the storage protocol.

#### Solutions Considered

1. Keep all five IDs proposed until every remaining D13–D38 item is decided.
2. Record the operator's explicit acceptances now, including APPROVED_DIRECTION where remaining specification is required before named phases.
3. Start P01 and encryption implementation immediately on the accepted crypto direction.

Option 1 would hide accepted security constraints. Option 3 would implement against still-open hosting, passkey RP, encryption mechanism, cardinality, and email-login questions. Option 2 records the accepted cryptographic compartmentalization without starting code.

#### Trade-offs

D34 and D35 are directions, not complete implementation specs. Shared-object recipient-key hierarchy, rekey, historical versions, and multi-device distribution remain D38 and still block P19/P20/P24. Exact session storage key names and refresh lifetime remain before P03/P06.

#### Final Outcome

D31, D33, and D36 are APPROVED. D17 is APPROVED as settled by D36. D34 and D35 are APPROVED_DIRECTION. D38 captures remaining shared-object specification. Invariants I25–I35, the recovery security statement, and credential-class compartmentalization are now contract. P01 remains blocked.

#### Implementation Impact

`docs/ACCOUNT_IDENTITY.yaml` devices, grants, sessions, encryption wraps, sharing object encryption, and phases P07/P14/P16/P19/P20/P24; decision register in the Markdown plan; YAML smoke assertions; review canvas.

#### Verification Required

YAML smoke must parse, show D31/D33/D36 APPROVED, D34/D35 APPROVED_DIRECTION, D38 PROPOSED_REVIEW, I25–I35 present, grant TTLs 300/3600/120, and recovery secret 256-bit / 64 hex.

#### Related Records

- DEVNOTES: DEV-2026-09-21-001
- Tests: TEST-2026-09-21-002
- Source: `docs/ACCOUNT_IDENTITY.yaml`

#### Next Steps

Present remaining proposed items (D13–D16, D24, D28–D30, D32, D37, D38). Do not start P01.

#### Deferred Decisions

D13, D14, D15, D16, D24, D28, D29, D30, D32, D37, D38; D35 remaining key names and refresh lifetime; D25 license.

---

---

### DEV-2026-09-21-003 — Approve layered archive key hierarchy

**Date:** 2026-09-21  
**Time:** 21:55 America/New_York  
**Engineer:** Cursor Grok 4.6 agent  
**Status:** ACCEPTED  
**Type:** DECISION

#### Problem

D15 left archive encryption as a proposed AEK plus SQLCipher sketch. D33 wrapped AEK from a recovery secret without naming the Recovery KEK or domain-separated archive keys. D34 did not explicitly forbid using the archive AEK as a sharing key. Implementation of P04/P14/P19/P20/P24 could have used the Recovery Secret or raw AEK as a content key.

#### Context and Constraints

The operator required a layered hierarchy: Recovery Secret → Recovery KEK → wrapped AEK → domain-separated archive keys → per-object DEKs. Human passwords and PINs must be hardened with Argon2id or an approved password KDF, never fed to HKDF. AES-GCM nonce reuse is forbidden. Physical erasure of old plaintext blocks cannot be honestly guaranteed on flash storage.

#### Solutions Considered

1. Keep D15 proposed and implement P04 from the earlier sketch.
2. Record the layered hierarchy as authoritative in YAML, approve D15 and D28, clarify D33/D34, and hold encryption/recovery/sharing implementation.
3. Start P04 immediately after writing the hierarchy.

Option 1 would let SQLCipher or files be keyed from the Recovery Secret or a password. Option 3 would start encryption before P01 and remaining reviews. Option 2 matches the instruction.

#### Trade-offs

D30 (whether first launch requires a user lock) remains proposed; the wrapping mechanism for an optional password/PIN is now specified. Shared-object recipient-key hierarchy remains D38. Exact HKDF salt and wrapping-algorithm library pins can still be chosen at P04 against established primitives.

#### Final Outcome

Approved hierarchy is **Recovery Secret → Recovery KEK → wrapped AEK → domain-separated archive keys → per-object DEKs.** D15 and D28 are APPROVED. D33 and D34 are clarified. Invariants I36–I46 are contract. P04, P14, P19, P20, and P24 are not started.

#### Implementation Impact

`docs/ACCOUNT_IDENTITY.yaml` encryption, decisions D15/D28/D33/D34/D38, phases P04/P14/P20; decision register; YAML smoke; review canvas; ARCHITECTURE.md.

#### Verification Required

YAML smoke must parse, show D15/D28 APPROVED, recovery secret 256-bit / 64 hex, Recovery KEK info `captains-log/recovery-kek/v1`, sqlite domain `captains-log/sqlite/v1`, AES-GCM nonce reuse forbidden, and plaintext migration `guaranteed_physical_erasure: false`.

#### Related Records

- DEVNOTES: DEV-2026-09-21-002
- Tests: TEST-2026-09-21-003
- Source: `docs/ACCOUNT_IDENTITY.yaml`

#### Next Steps

Present remaining proposed items (D13, D14, D16, D24, D29, D30, D32, D37, D38). Do not start P01, P04, P14, P19, P20, or P24.

#### Deferred Decisions

D13, D14, D16, D24, D29, D30, D32, D37, D38; D35 remaining key names and refresh lifetime; D25 license.

---

---

### DEV-2026-09-22-001 — Correct D38 User ID, approve D32, require P04 for beta

**Date:** 2026-09-22  
**Time:** 21:45 America/New_York  
**Engineer:** Cursor Grok 4.6 agent  
**Status:** ACCEPTED  
**Type:** DECISION

#### Problem

D38 had been reused for shared-object remaining specification. The human-readable Captain's Log User ID needs its own ID, distinct from account_uuid. D32 still described local WebAuthn wrapping AEK. P29 could be reached without P04, even though D2/D15 require an encrypted local archive from first launch.

#### Context and Constraints

Local archive unlock and remote WebAuthn passkeys must stay distinct. The RP domain is not chosen here. Shared-object direction remains D34; protocol details are D34-A through D34-D. D13 and D37 stay proposed. D25 is an operator license blocker, not architecture.

#### Solutions Considered

1. Keep D38 as sharing leftovers and invent D39 for user_id.
2. Restore D38 as user_id, park sharing leftovers under D34-A through D34-D, approve the corrected D32 model, and add P04 to the P29 prerequisite list.
3. Approve D13 and D37 in the same pass.

Option 1 would reuse D38 against the operator assignment. Option 3 would silently accept remaining architecture. Option 2 matches the correction request.

#### Trade-offs

P10 still waits on a permanent Captain's Log-controlled HTTPS RP ID. D14 remains independently proposed even though D32 is approved. D34-A through D34-D continue to block P19/P20/P24.

#### Final Outcome

D38 is the human-readable User ID and is APPROVED. D32 is APPROVED with platform UV local unlock versus WebAuthn account passkey, including passkey-first provisional registration. P04 is a mandatory P29/P30 prerequisite. D34 remains APPROVED_DIRECTION. Invariants I47–I52 are contract. P01, P04, P14, P19, P20, and P24 are not started.

#### Implementation Impact

`docs/ACCOUNT_IDENTITY.yaml` decisions, identifiers, wrapping, factors, beta_gate, P10/P19/P20/P24/P29; decision register; YAML smoke; review canvas; ARCHITECTURE.md.

#### Verification Required

YAML smoke must show D32 and D38 APPROVED, D34-A through D34-D PROPOSED_REVIEW, P29 requires P04, local unlock is not WebAuthn, and user_id is distinct from account_uuid.

#### Related Records

- DEVNOTES: DEV-2026-09-21-003
- Tests: TEST-2026-09-22-001
- Source: `docs/ACCOUNT_IDENTITY.yaml`

#### Next Steps

Present remaining proposed items (D13, D14, D16, D24, D29, D30, D37, D34-A through D34-D). Do not start P01, P04, P14, P19, P20, or P24.

#### Deferred Decisions

D13, D14, D16, D24, D29, D30, D37, D34-A, D34-B, D34-C, D34-D; account passkey RP domain; D35 remaining key names and refresh lifetime; D25 license.

---

---

### DEV-2026-09-28-001 — Approve remaining identity architecture and release P01 hold

**Date:** 2026-09-28  
**Time:** 16:10 America/New_York  
**Engineer:** Cursor Grok 4.6 agent  
**Status:** ACCEPTED  
**Type:** DECISION

#### Problem

D13, D14, D16, D24, D29, D30, D37, and D34-A through D34-D were still `PROPOSED_REVIEW`. D34 itself was only `APPROVED_DIRECTION`. That architecture review hold blocked P01. Repository-boundary, Docker/ECR/ECS/RDS, and GitHub OIDC contracts were also unspecified even after the operator approved them.

#### Context and Constraints

`docs/ACCOUNT_IDENTITY.yaml` is authoritative. D15/D31/D32/D33/D35/D36/D38 and the Recovery Secret → Recovery KEK → AEK hierarchy must not regress. P04 remains a mandatory beta prerequisite and is distinct from P14. Live AWS identifiers must not enter this public repository. New architecture discovered from repository evidence must be recorded as `PROPOSED_FOR_REVIEW`, not self-approved.

#### Solutions Considered

1. Keep P01 blocked until D35 SecureStore key names and the WebAuthn RP domain are also fully specified.
2. Record the 2026-09-28 approvals, add public/private repository and AWS placeholder contracts, release the P01 hold, and leave operator tasks (D25, RP ID, live AWS) outside architecture.
3. Start P01 TypeScript contracts and a Dockerfile in the same change.

Option 1 would treat operator configuration and P03 remaining specification as architecture holds. Option 3 would start implementation in a documentation pass. Option 2 matches the instruction.

#### Trade-offs

P19/P20/P24 become architecture-unblocked, but they still wait on P01/P16 implementation. The account-sharing wrap primitive library is documented as remaining implementation selection, not a new decision ID. D35 remains `APPROVED_DIRECTION` and still needs key names before P03.

#### Final Outcome

D13, D14, D16, D24, D29, D30, D34, D34-A, D34-B, D34-C, D34-D, and D37 are APPROVED. The architecture review hold is released. P01 is unblocked. No new `PROPOSED_FOR_REVIEW` decision was required. Operator blockers are D25 Universal Google Sign-In licensing, the permanent WebAuthn RP domain, and live AWS resources in private `captains-log-infra`.

#### Implementation Impact

`docs/ACCOUNT_IDENTITY.yaml` decisions, authority/Docker/RDS, `repository_boundary`, phases P01/P05/P08/P10/P13/P19/P20/P24/P29; `docs/aws.example.yaml`; planning register; YAML smoke; ARCHITECTURE.md; review canvas.

#### Verification Required

YAML smoke must show the newly approved IDs as APPROVED, `p01_blocked_until_proposed_review` false, empty remaining sharing specification, ECS Fargate hosting, repository-boundary names, and placeholder-only AWS example. Combined node smoke must still pass. Do not claim P01 implementation.

#### Related Records

- DEVNOTES: DEV-2026-09-22-001
- Tests: TEST-2026-09-28-001
- Source: `docs/ACCOUNT_IDENTITY.yaml`, `docs/aws.example.yaml`, `scripts/account-identity-yaml-smoke.ts`

#### Next Steps

Implement P01 identity TypeScript contracts and repository-boundary scaffolding only when that implementation instruction is given. Do not start P04, P05, P08, P10, P13, P14, P19, P20, or P24 in this pass.

#### Deferred Decisions

D35 exact SecureStore key names and refresh lifetime; D34-A wrap-primitive library documented before sharing implementation; D25 license; permanent WebAuthn RP domain; live AWS inventory in `captains-log-infra`.

---

### DEV-2026-10-28-001 — Landscape dock follows the visible Figma bezel

**Date:** 2026-10-28  
**Time:** 15:21 America/New_York  
**Engineer:** Cursor Grok 4.7 agent  
**Status:** IMPLEMENTED  
**Type:** DECISION

#### Problem

The live landscape frame in `dFwk8LAWauplWqrOKaQplU` no longer matches the YAML dock. Node `96:82` was a hidden 363.262×115.277 envelope. It is now a visible 350×96 bezel at (163, 276). The handle `97:149` is a child of that bezel at (299, 251), overlapping the top by 2.5. Button insets are 10, not the old parent-relative 7 / 26.262.

#### Context and Constraints

Figma owns appearance. YAML owns meaning. `reference_regions` are measurements. The resolver ignores them and uses anchors. Portrait regions were unchanged. Landscape must still start collapsed so the dock does not cover log, search, and graph hits. Do not stretch internal artwork.

#### Solutions Considered

1. Record the new bezel and handle measurements, keep collapsed parking, and apply the 2.5 overlap only while expanded.
2. Make the open dock the resting state because the Figma layer is now visible.
3. Leave the old envelope and only refresh reference numbers.

Option 3 would keep generating a dock the file no longer draws. Option 2 was tried and blocked viewport pointer hits, so it was rejected.

#### Trade-offs

Collapsed handle placement remains a YAML pose at the viewport bottom. The artboard no longer draws that pose; it draws the expanded assembly. Expanded height is 121 instead of 123.5.

#### Final Outcome

The landscape dock region is the 350×96 bezel, centered on the viewport and flush with its bottom. Expanded assembly overlap is 2.5. Landscape still starts collapsed.

#### Implementation Impact

`src/ui/yaml_layout/mobile/landscape.yaml`; `components/landscape/action-dock.yaml`; generated `uiSpec.ts`; `HudDock.tsx`; `HudShell.tsx`; `hudBehavior.ts`; Figma fixture; HUD tests; `docs/ARCHITECTURE.md`.

#### Verification Required

T0 typecheck. T1 generator, authority, resolver, and HUD contract smoke. T2 browser harness, including expand, collapse, and viewport hits after collapse.

#### Related Records

- DEVNOTES: DEV-2026-09-14-003; DEV-2026-09-14-005; DEV-2026-09-18-001
- Tests: TEST-2026-10-28-001
- Source: Figma file `dFwk8LAWauplWqrOKaQplU`, landscape frame `96:4`

#### Next Steps

Physical landscape check on the Motorola remains part of open TASK-007. Do not commit without explicit authorization.

#### Deferred Decisions

Opening the landscape dock by default. That matches the current artboard visibility and blocks content underneath.

---

### DEV-2026-10-28-002 — Dock button captions are accessible names only

**Date:** 2026-10-28  
**Time:** 15:45 America/New_York  
**Engineer:** Cursor Grok 4.7 agent  
**Status:** IMPLEMENTED  
**Type:** DECISION

#### Problem

DEV-2026-10-28-001 updated dock geometry and left the captions drawn. Both Figma docks, portrait `2:26` and landscape `96:82`, now contain no text layers. ADD, CAMERA, LOCATION, and EXPORT are gone from the art.

#### Context and Constraints

The strings still name the buttons for assistive technology and for the browser harness. Gallery in the add menu is a separate control and was not removed from Figma.

#### Solutions Considered

1. Keep the strings and stop painting them.
2. Delete the strings and invent new accessible names.

Option 2 would rename controls the design did not rename.

#### Trade-offs

The dock typography token remains in the spec and is unused while `label.visible` is false.

#### Final Outcome

Shared dock `label.visible` is false. `HudDock` does not render caption text. Each button keeps its existing accessible name.

#### Implementation Impact

`src/ui/yaml_layout/mobile/components/shared/action-dock.yaml`; generated `uiSpec.ts`; `src/ui/ts_layout/HudDock.tsx`; `scripts/hud-smoke.ts`.

#### Verification Required

T0 typecheck. T1 HUD contract smoke. T2 browser harness, which finds the buttons by accessible name.

#### Related Records

- DEVNOTES: DEV-2026-10-28-001
- Tests: TEST-2026-10-28-002
- Source: Figma file `dFwk8LAWauplWqrOKaQplU`, nodes `2:26` and `96:82`

#### Next Steps

None for captions. Landscape still starts collapsed, per DEV-2026-10-28-001.

#### Deferred Decisions

None.

---

### DEV-2026-10-28-003 — Dock icons sit on the centered plates

**Date:** 2026-10-28  
**Time:** 15:50 America/New_York  
**Engineer:** Cursor Grok 4.7 agent  
**Status:** IMPLEMENTED  
**Type:** DECISION

#### Problem

After the captions were removed, both Figma docks place each 72×62 plate at y=17 in the 96-tall bezel and each 32×32 icon at (20, 15) inside that plate. The shared spec still used the caption-era plate y=8 and icon y=23, so the icons sat 9 units above the dock center.

#### Context and Constraints

The same plate and icon geometry is shared by portrait and landscape. Horizontal icon inset 20 already centers a 32-wide icon in a 72-wide plate.

#### Solutions Considered

1. Move the plate to y=17 and the icon to dock y=32, which is plate 17 plus the 15-unit center inset.
2. Leave the old offset and center the icon inside the high plate only.

Option 2 would keep the icons centered in the plate and still high in the dock.

#### Trade-offs

None beyond matching the measured frames. (96 − 62) / 2 = 17 and (62 − 32) / 2 = 15, so both centers land on the dock midline.

#### Final Outcome

Shared dock plate y is 17. Icon bounds are x=20, y=32, 32×32.

#### Implementation Impact

`src/ui/yaml_layout/mobile/components/shared/action-dock.yaml`; generated `uiSpec.ts`; `scripts/hud-smoke.ts`.

#### Verification Required

T1 HUD contract smoke asserting plate y=17 and icon y=32, x=20.

#### Related Records

- DEVNOTES: DEV-2026-10-28-002
- Tests: TEST-2026-10-28-003
- Source: Figma docks `2:26` and `96:82`

#### Next Steps

None.

#### Deferred Decisions

None.

---


