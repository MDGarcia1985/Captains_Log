# Captain's Log — Test Log

Append-only verification record. Follow `TEST_LOG_STANDARDS.md`.

---

### TEST-2026-08-21-001 — Project TypeScript validation

**Date:** 2026-08-21  
**Time:** 20:18 America/New_York  
**Tester:** Cursor Grok 4.6 agent  
**Level:** T0  
**Result:** PASS

#### Scope

TypeScript compile of implementation after the hardening pass.

#### Files Under Validation

- src/adapters/**
- src/services/**
- src/models/**
- src/utilities/**
- src/ui/screens/AuthGate.tsx
- src/ui/screens/SettingsScreen.tsx

#### Objective

Verify that modified and new implementation files compile and satisfy declared TypeScript contracts.

#### Preconditions

Project dependencies installed, including `@noble/hashes`. `scripts/` excluded from `tsconfig.json`.

#### Procedure

1. Run `npx tsc --noEmit`.

#### Expected Result

No TypeScript errors.

#### Actual Result

Command exited 0 with no diagnostics.

#### Evidence

- `npx tsc --noEmit` (exit 0)

#### Failures / Observations

`scripts/node-smoke.ts` uses `.ts` import specifiers for Node's strip-types loader and is excluded from the app tsconfig.

#### Related DEVNOTES

DEV-2026-08-21-001 through DEV-2026-08-21-011

#### Related Tests

None.

#### Disposition

Static type validation complete. Runtime T1/T2/T3 remain.

---

### TEST-2026-08-21-002 — ESLint on hardened files

**Date:** 2026-08-21  
**Time:** 20:22 America/New_York  
**Tester:** Cursor Grok 4.6 agent  
**Level:** T0  
**Result:** PASS

#### Scope

Lint of files created or materially modified in this pass.

#### Files Under Validation

- src/adapters
- src/services
- src/models
- src/utilities
- src/ui/screens/AuthGate.tsx
- src/ui/screens/SettingsScreen.tsx

#### Objective

Verify no ESLint errors in the hardened source set.

#### Preconditions

`npx expo lint` created `eslint.config.js` and installed `eslint` / `eslint-config-expo` because none existed.

#### Procedure

1. Run `npx eslint src/adapters src/services src/models src/utilities src/ui/screens/AuthGate.tsx src/ui/screens/SettingsScreen.tsx`.

#### Expected Result

Zero errors in the listed paths.

#### Actual Result

Exit 0 after fixing Settings apostrophe encoding and AppServicesProvider compose-order.

#### Evidence

- `npx eslint src/adapters src/services src/models src/utilities src/ui/screens/AuthGate.tsx src/ui/screens/SettingsScreen.tsx` (exit 0)

#### Failures / Observations

Full-project `npx expo lint` still reports pre-existing `react-hooks/set-state-in-effect` errors in `AppShell.tsx` and `GraphScreen.tsx`, which were not modified for behavior in this pass.

#### Related DEVNOTES

None.

#### Related Tests

TEST-2026-08-21-001

#### Disposition

T0 lint complete for files in this pass. Whole-app lint is not clean because of pre-existing screen effects.

---

### TEST-2026-08-21-003 — Node smoke: extraction, FTS, client IDs, PBKDF2, backup policy

**Date:** 2026-08-21  
**Time:** 20:20 America/New_York  
**Tester:** Cursor Grok 4.6 agent  
**Level:** T1  
**Result:** PASS

#### Scope

Pure TypeScript modules that can run in Node without React Native.

#### Files Under Validation

- src/adapters/extraction/deterministicExtraction.ts
- src/utilities/fts.ts
- src/utilities/googleClientId.ts
- src/utilities/passwordKdf.ts
- src/adapters/sqlite/schema.ts
- src/adapters/googleDrive/backupPolicy.ts
- scripts/node-smoke.ts

#### Objective

Verify deterministic extraction, FTS sanitization, platform client-ID selection with no fallback, PBKDF2-HMAC-SHA256 against hashlib, schema v2 markers, and `drive.file` snapshot policy constants.

#### Preconditions

`@noble/hashes` installed. Node 22.22.0.

#### Procedure

1. Run `npx tsx scripts/node-smoke.ts`.

#### Expected Result

16 assertions pass, including PBKDF2(`password`,`salt`,c=1,dkLen=32) = `120fb6cffcf8b32c43e7225256c4f837a86548c92ccc35480805987cb70be17b` matching Python `hashlib.pbkdf2_hmac`.

#### Actual Result

`PASS node-smoke` / `assertions=16`.

#### Evidence

- `npx tsx scripts/node-smoke.ts` → `PASS node-smoke`
- Cross-check: `python -c "import hashlib; print(hashlib.pbkdf2_hmac('sha256', b'password', b'salt', 1, 32).hex())"` produced the same digest.

#### Failures / Observations

An earlier assertion used a commonly copied SHA-256 vector that does not match hashlib; the test was corrected to the hashlib/noble result. That was a test-vector error, not a KDF implementation error.

#### Related DEVNOTES

DEV-2026-08-21-001, DEV-2026-08-21-008, DEV-2026-08-21-009, DEV-2026-08-21-003, DEV-2026-08-21-004

#### Related Tests

None.

#### Disposition

Node-runnable module behavior verified. Device SQLite, capture, and Drive remain unexercised.

---

### TEST-2026-08-21-004 — Extraction idempotency contract inspection

**Date:** 2026-08-21  
**Time:** 20:21 America/New_York  
**Tester:** Cursor Grok 4.6 agent  
**Level:** T1  
**Result:** STATIC_ONLY

#### Scope

Clear-then-extract ordering before re-deriving graph data.

#### Files Under Validation

- src/services/extractionService.ts
- src/adapters/sqlite/entityRepository.ts
- src/adapters/sqlite/relationshipRepository.ts

#### Objective

Confirm `processEntry` deletes prior derived links and relationships for the source entry before extracting.

#### Preconditions

None.

#### Procedure

1. Inspect `processEntry` source.

#### Expected Result

`deleteForSourceEntry` and `unlinkAllForEntry` run before `extract`.

#### Actual Result

`processEntry` calls `deps.relationships.deleteForSourceEntry(entry.id)` then `deps.entities.unlinkAllForEntry(entry.id)` before `deps.extraction.extract`.

#### Evidence

Source at `src/services/extractionService.ts` lines 45–48.

#### Failures / Observations

No SQLite runtime re-extract on an edited entry was executed.

#### Related DEVNOTES

DEV-2026-08-21-001

#### Related Tests

TEST-2026-08-21-003

#### Disposition

Contract is present. Device T1 for edit-and-reextract remains required. Implementation may proceed; do not treat this as runtime proof.

---

### TEST-2026-08-21-005 — Drive snapshot backup and restore

**Date:** 2026-08-21  
**Time:** 20:24 America/New_York  
**Tester:** Cursor Grok 4.6 agent  
**Level:** T2  
**Result:** BLOCKED

#### Scope

Google Drive snapshot create, list, restore, and integrity verification.

#### Files Under Validation

- src/adapters/googleDrive/googleDriveBackupProvider.ts
- src/services/backupService.ts
- src/adapters/sqlite/archiveRestore.ts
- src/ui/screens/SettingsScreen.tsx

#### Objective

Create a snapshot, list it, restore it, and verify database plus attachment files.

#### Preconditions

Platform Google OAuth client ID and Drive authorization. Network. Device or emulator.

#### Procedure

Not executed. Client IDs in `app.json` extra are empty strings.

#### Expected Result

A visible folder named Captain's Log Backups containing a timestamped snapshot; restore replaces local archive and reports verification.

#### Actual Result

Blocked: no OAuth client ID for the current platform and no authorized Drive token.

#### Evidence

`app.json` `expo.extra.googleWebClientId` / `googleIosClientId` / `googleAndroidClientId` are `""`.

#### Failures / Observations

Policy constants were checked in TEST-2026-08-21-003 (`drive.file`, retention 7).

#### Related DEVNOTES

DEV-2026-08-21-003, DEV-2026-08-21-004, DEV-2026-08-21-005

#### Related Tests

TEST-2026-08-21-003

#### Disposition

Do not claim Drive backup/restore works. Runtime T2 remains required after client IDs are configured.

---

### TEST-2026-08-21-006 — Google and local archive authentication

**Date:** 2026-08-21  
**Time:** 20:24 America/New_York  
**Tester:** Cursor Grok 4.6 agent  
**Level:** T2  
**Result:** BLOCKED

#### Scope

Local archive credential create/unlock and Google sign-in.

#### Files Under Validation

- src/adapters/auth/localArchiveCredentialProvider.ts
- src/adapters/auth/googleAuthProvider.ts
- src/ui/screens/AuthGate.tsx

#### Objective

Create a local archive credential, unlock it, and confirm Google sign-in uses only the platform client ID.

#### Preconditions

Device or emulator for SecureStore. Google client ID for Google path.

#### Procedure

Not executed on a device. Client ID selector and PBKDF2 were unit-checked in TEST-2026-08-21-003.

#### Expected Result

Local identifier/password unlocks the archive. Google is unconfigured on this machine and fails loudly rather than falling through to another platform's client ID.

#### Actual Result

Blocked: no device session and empty platform client IDs.

#### Evidence

TEST-2026-08-21-003 passed `selectGoogleClientId` no-fallback cases. Google extra client IDs are empty.

#### Failures / Observations

AuthSession implicit token flow remains prototype-only by design.

#### Related DEVNOTES

DEV-2026-08-21-007, DEV-2026-08-21-008, DEV-2026-08-21-009

#### Related Tests

TEST-2026-08-21-003

#### Disposition

Local credential runtime and Google OAuth handshake remain unproven on device.

---

### TEST-2026-08-21-007 — Milestone smoke/regression

**Date:** 2026-08-21  
**Time:** 20:25 America/New_York  
**Tester:** Cursor Grok 4.6 agent  
**Level:** T3  
**Result:** PARTIAL

#### Scope

App boot, SQLite init, entry create/persistence, search, graph extraction, attachments, handedness, offline launch, configured auth/backup.

#### Files Under Validation

Not applicable (milestone)

#### Objective

Confirm critical MVP workflows still work after hardening.

#### Preconditions

Android phone/tablet or emulator preferred. This environment had Node and the repo only.

#### Procedure

1. `npx tsc --noEmit` (TEST-2026-08-21-001).
2. Node smoke (TEST-2026-08-21-003).
3. Attempt `npx expo export --platform web` as a bundle boot check.
4. Device workflows were not run.

#### Expected Result

Native app boots, opens SQLite, captures an entry, searches, extracts entities, stores attachments, honors handedness, works offline, and exercises auth/backup when configured.

#### Actual Result

Typecheck and Node smoke passed. Web export failed resolving `expo-sqlite` `wa-sqlite.wasm` after bundling 997 modules (web is not an MVP target). No Android/iOS device or emulator session was available.

#### Evidence

- `npx tsc --noEmit` exit 0
- `npx tsx scripts/node-smoke.ts` PASS
- `npx expo export --platform web` failed: unable to resolve `./wa-sqlite/wa-sqlite.wasm`

#### Failures / Observations

Completed: static compile, Node module smoke.  
Omitted: on-device boot, SQLite open, capture, search, graph, attachments, handedness, offline launch, live auth, live backup.

#### Related DEVNOTES

DEV-2026-08-21-001 through DEV-2026-08-21-011

#### Related Tests

TEST-2026-08-21-001, TEST-2026-08-21-003, TEST-2026-08-21-005, TEST-2026-08-21-006

#### Disposition

Hardening implementation may remain; device T3 is not satisfied. Do not treat the milestone as runtime-verified.