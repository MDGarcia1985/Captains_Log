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


---

### TEST-2026-09-07-001 — Initial HUD static validation

**Date:** 2026-09-07  
**Time:** 20:58 America/New_York  
**Tester:** Codex  
**Level:** T0  
**Result:** FAIL

#### Scope

New YAML compiler and HUD TypeScript/React files.

#### Files Under Validation

scripts/generate-ui.mjs; src/ui/layout/HudArtwork.tsx; src/ui/state/HudCommands.tsx; src/ui/layout/AppShell.tsx; src/ui/screens/GraphScreen.tsx

#### Objective

Validate parser, TypeScript and lint contracts before integration.

#### Preconditions

Windows, Node 22.19.0, installed Expo 57 dependencies; approved DEV-025.

#### Procedure

Ran YAML parsing/generation, tsc --noEmit and targeted ESLint.

#### Expected Result

Valid references; no compile/lint errors.

#### Actual Result

Parser rejected a literal palette color as a semantic reference. Typecheck rejected an overly broad ViewStyle return type. Lint flagged render-time refs and synchronous effect resets.

#### Evidence

Generator: Unknown color #0C121C. TypeScript TS2322/TS2769. ESLint react-hooks/refs and set-state-in-effect.

#### Failures / Observations

Corrected validation traversal, narrowed coordinate styles, used state for the animation clock and layout effects for latest callbacks; derived cleared selection views.

#### Related DEVNOTES

DEV-2026-09-07-025

#### Related Tests

None

#### Disposition

Initial validation failed; corrected before continued integration. Retest TEST-2026-09-07-002.

---

### TEST-2026-09-07-002 — HUD static validation retest

**Date:** 2026-09-07  
**Time:** 20:58 America/New_York  
**Tester:** Codex  
**Level:** T0  
**Result:** PASS

#### Scope

Ten YAML specifications, generated constants, assets, mobile shell, contextual commands, modified screens/routes.

#### Files Under Validation

src/ui/**/*.yaml; src/ui/generated/*; scripts/generate-ui.mjs; scripts/hud-smoke.ts; src/ui/layout/HudArtwork.tsx; src/ui/layout/HudShell.tsx; src/ui/layout/AppShell.tsx; src/ui/state/HudCommands.tsx; src/ui/screens/{Capture,Search,Graph,Log}Screen.tsx; src/app/{_layout,log}.tsx; src/services/exportService.ts

#### Objective

Confirm corrected specification, compile and targeted lint contracts.

#### Preconditions

Windows, Node 22.19.0, installed Expo 57 dependencies; approved DEV-025.

#### Procedure

Ran node scripts/generate-ui.mjs, TypeScript --noEmit and ESLint on all new/modified handwritten implementation files.

#### Expected Result

35 SVG references resolve and all checks exit zero.

#### Actual Result

Generation, typecheck and targeted ESLint exited zero.

#### Evidence

UI specification PASS: 10 YAML files, 35 SVG assets. tsc and targeted ESLint exit 0.

#### Failures / Observations

Static correctness is not native runtime/visual acceptance.

#### Related DEVNOTES

DEV-2026-09-07-025

#### Related Tests

TEST-2026-09-07-001

#### Disposition

Static gate passed. Runtime integration and milestone verification remain required.

---

### TEST-2026-09-07-003 — Initial regression and web bundle attempt

**Date:** 2026-09-07  
**Time:** 20:58 America/New_York  
**Tester:** Codex  
**Level:** T3  
**Result:** FAIL

#### Scope

Existing smoke runner and Expo web bundle prerequisites.

#### Files Under Validation

package.json; metro.config.js (absent at first attempt)

#### Objective

Run established regression checks and build the actual app for visual verification.

#### Preconditions

Windows, Node 22.19.0, installed Expo 57 dependencies; approved DEV-025.

#### Procedure

Ran node --experimental-strip-types scripts/node-smoke.ts and Expo export --platform web.

#### Expected Result

Smoke and web bundle exit zero.

#### Actual Result

Smoke runner could not resolve @/models; Metro could not resolve the present wa-sqlite.wasm asset.

#### Evidence

ERR_MODULE_NOT_FOUND @/models; Unable to resolve ./wa-sqlite/wa-sqlite.wasm.

#### Failures / Observations

Both were pre-existing configuration gaps. Added tsx runner and documented Expo 57 wasm asset extension; no database/authentication behavior changed.

#### Related DEVNOTES

DEV-2026-09-07-025

#### Related Tests

TEST-2026-08-21-007

#### Disposition

Paused implementation progression to correct verification prerequisites. Retest TEST-2026-09-07-004.

---

### TEST-2026-09-07-004 — Regression and web bundle retest

**Date:** 2026-09-07  
**Time:** 20:58 America/New_York  
**Tester:** Codex  
**Level:** T3  
**Result:** PARTIAL

#### Scope

Existing smoke suite, HUD contracts and web production bundle.

#### Files Under Validation

package.json; metro.config.js; scripts/node-smoke.ts; scripts/hud-smoke.ts; src/ui/generated/*

#### Objective

Verify corrected test/build prerequisites plus approved pure behavior contracts.

#### Preconditions

Windows, Node 22.19.0, installed Expo 57 dependencies; approved DEV-025.

#### Procedure

Ran tsx scripts/node-smoke.ts, node --experimental-strip-types scripts/hud-smoke.ts, and Expo export --platform web.

#### Expected Result

Smoke contracts pass; ten routes bundle.

#### Actual Result

16 existing assertions pass; HUD contracts pass; web export succeeds with ten static routes.

#### Evidence

PASS node-smoke assertions=16. HUD contracts PASS. Web Bundled 1068 modules; Exported dist.

#### Failures / Observations

No on-device runtime proven. npm reports 20 dependency vulnerabilities (15 moderate, 5 high); no broad dependency remediation authorized or attempted.

#### Related DEVNOTES

DEV-2026-09-07-025

#### Related Tests

TEST-2026-09-07-003

#### Disposition

Automated regression/build subset passes. Continue runtime/visual verification; device T3 remains a release gate.


---

### TEST-2026-09-11-001 - TASK-005 native defect reproduction

**Date:** 2026-09-11
**Time:** 20:55 America/New_York
**Tester:** Codex
**Level:** T1
**Result:** FAIL

#### Scope

Attachment creation before the correction.

#### Files Under Validation

src/adapters/filesystem/attachmentStorage.ts

#### Objective

Generate a managed thumbnail from a valid local JPEG.

#### Preconditions

Android emulator-5554, API 37, Expo Go, SDK 57; existing 63,907-byte JPEG.

#### Procedure

Called the unchanged storeImage with the accessible pre-fix original as input. Inspected File.exists/size and attempted native Image.loadAsync/manipulateAsync on the original and alternative URI forms.

#### Expected Result

storeImage returns a generated thumb.jpg after both copies complete.

#### Actual Result

Context.renderAsync rejected with Loading bitmap failed for the new original URI; storeImage returned original.jpeg as the fallback. The original existed by the time the call returned and decoded as 1440x1920. The pre-fix stored image also decoded successfully.

#### Evidence

Metro native warning [Captain\'s Log:attachment.thumbnail], reproduction file task005-before-1789173902941/original.jpeg. Installed NativeFileSystem.types.ts declares copy(...): Promise<void>; both application calls ignored that promise.

#### Failures / Observations

Classification A: creation race reproduced. Valid previously stored files are accessible. %2540/%252F are valid escapes here; decoding once caused ENOENT at @mande-design/captainslog. No migration indicated.

#### Related DEVNOTES

DEV-2026-09-11-034

#### Related Tests

TEST-2026-09-11-004; TEST-2026-09-11-005

#### Disposition

Blocked progression except correction: await original and thumbnail copies, then verify.

---

### TEST-2026-09-11-002 - TASK-005 verification setup limitations

**Date:** 2026-09-11
**Time:** 20:55 America/New_York
**Tester:** Codex
**Level:** T2
**Result:** PARTIAL

#### Scope

Local emulator instrumentation and test-runner setup.

#### Files Under Validation

Not applicable; temporary uncommitted .tmp/task005 probes.

#### Objective

Establish a reliable native verification session.

#### Preconditions

Windows, Node 22.19.0, running Expo Go and Metro.

#### Procedure

Attempted direct file inspection, CDP connection, and an initial temporary probe using another shared SQLite connection during Fast Refresh.

#### Expected Result

Reliable access to native files, metadata, and screen state.

#### Actual Result

Expo Go disallowed root/run-as inspection; CDP closed connections. A shared-connection probe produced NativeDatabase.prepareAsync NullPointerException and overlapping refreshes created two test attachments. Switched to an isolated Metro session through ADB reverse, a separate useNewConnection SQLite probe, a one-shot execution guard, and a fresh Expo Go launch.

#### Evidence

ADB permission denied / package not debuggable; CDP close 1006; initial probe logs. Standalone attachment smoke initially could not resolve dependencies in the filesystem sandbox; rerun with approved normal filesystem access succeeded.

#### Failures / Observations

These were verification setup failures, not evidence of attachment correctness. Temporary layout import was removed byte-for-byte before final checks. No production database or debugger workaround was introduced.

#### Related DEVNOTES

DEV-2026-09-11-034

#### Related Tests

TEST-2026-09-11-001; TEST-2026-09-11-004; TEST-2026-09-11-005

#### Disposition

Setup corrected. Only the subsequent isolated, observed checks establish runtime results.

---

### TEST-2026-09-11-003 - TASK-005 static validation

**Date:** 2026-09-11
**Time:** 20:55 America/New_York
**Tester:** Codex
**Level:** T0
**Result:** PASS

#### Scope

Final implementation and regression test syntax, types, lint, and dependency resolution.

#### Files Under Validation

src/adapters/filesystem/attachmentStorage.ts; scripts/attachment-smoke.mjs; package.json

#### Objective

Pass required project static checks.

#### Preconditions

Temporary app instrumentation removed; installed dependencies.

#### Procedure

Ran npm.cmd run typecheck and npm.cmd run lint.

#### Expected Result

Both commands exit zero without errors or lint warnings.

#### Actual Result

Both commands exited zero with no diagnostics.

#### Evidence

tsc --noEmit exit 0; expo lint exit 0.

#### Failures / Observations

None.

#### Related DEVNOTES

DEV-2026-09-11-034

#### Related Tests

TEST-2026-09-11-004; TEST-2026-09-11-005

#### Disposition

T0 complete.

---

### TEST-2026-09-11-004 - TASK-005 copy sequencing and regression suite

**Date:** 2026-09-11
**Time:** 20:55 America/New_York
**Tester:** Codex
**Level:** T1
**Result:** PASS

#### Scope

Real filesystem adapter with controlled native asynchronous-copy doubles, plus existing node smoke suite.

#### Files Under Validation

src/adapters/filesystem/attachmentStorage.ts; scripts/attachment-smoke.mjs; package.json

#### Objective

Require complete original bytes before manipulation and complete thumbnail bytes before returning metadata.

#### Preconditions

Installed dependencies; approved dependency access for esbuild.

#### Procedure

Ran node scripts/attachment-smoke.mjs, then the required npm.cmd run test:node suite. The test holds each copy unresolved, completes it explicitly, and separately rejects original and thumbnail copies.

#### Expected Result

No early manipulation/return; original rejection propagates; thumbnail rejection records the existing diagnostic and returns the accessible original; URI escapes remain intact.

#### Actual Result

All targeted assertions passed. Existing node-smoke reported PASS (runner prints assertions=16). The targeted test is retained in test:node.

#### Evidence

PASS TASK-005 attachment copy ordering, URI preservation, and failure fallback; npm.cmd run test:node exit 0.

#### Failures / Observations

None in the approved execution. Test doubles establish ordering/error contracts; native rendering is covered separately.

#### Related DEVNOTES

DEV-2026-09-11-034

#### Related Tests

TEST-2026-09-11-001; TEST-2026-09-11-002; TEST-2026-09-11-005

#### Disposition

T1 and established Node regressions complete.

---

### TEST-2026-09-11-005 - TASK-005 native rendering and persistence

**Date:** 2026-09-11
**Time:** 20:55 America/New_York
**Tester:** Codex
**Level:** T2
**Result:** PASS

#### Scope

Creation -> managed files -> SQLite -> retrieval -> Expo Image rendering.

#### Files Under Validation

src/adapters/filesystem/attachmentStorage.ts; unchanged attachment/entry services, SQLite repositories, and EntryScreen.

#### Objective

Render new and valid pre-fix attachments across retrieval; tolerate a missing file without a crash.

#### Preconditions

Android emulator-5554/API 37, Expo Go/SDK 57, isolated local Metro session. Existing pre-fix attachment 32c6a343-b913-4fa8-8a1c-b61164202203 from September 10.

#### Procedure

Created a new image attachment through createEntry using the existing valid JPEG as selected input. Queried metadata and File.exists, decoded with native Image.loadAsync, and viewed EntryScreen. Left for the missing-image and pre-fix entries, then returned to the new entry, causing persisted metadata to reload. Also observed earlier new thumbnails after an Expo Go cold restart. Inserted an explicitly identified missing-file test record through the repository and visited its entry.

#### Expected Result

New thumbnail renders immediately and after return; valid pre-fix attachment renders; missing file preserves its record and blank fallback without crashing. Entry associations and previous rows remain correct.

#### Actual Result

New entry 538951de-53b5-487a-b4b5-a5c516781ee9 contains exactly one attachment, 44443b52-af55-4eda-9f20-053ea4798670, with existing thumb.jpg decoded as 480x640. Snapshot comparison confirmed all three pre-existing attachment rows unchanged. The thumbnail was visually present immediately and after return. The September 10 attachment rendered in its original entry; its original decoded as 1440x1920. Missing fixture task005-missing remained retrievable (one record, exists=false), displayed an empty bordered image region, and navigation continued. Log service loaded nine entries before the final two fixtures were added. No new JS warning/error appeared during the final guarded creation and screen checks.

#### Evidence

Local, uncommitted screenshots reviewed: .tmp/task005/new-immediate.png; new-return.png; new-reloaded.png; existing.png; missing.png. Native logs: TASK005 FINAL NEW PASS (count=1, oldRows=3, oldUnchanged=true, width=480, height=640); TASK005 MISSING FIXTURE (exists=false, records=1); TASK005 EXISTING PASS; TASK005 LOG PASS.

#### Failures / Observations

Initial setup problems are preserved in TEST-2026-09-11-002. Only image capture is implemented; no non-image creation pipeline exists or changed. No iOS device was exercised. Test fixtures remain explicitly named TASK-005 in the local emulator archive; no pre-existing record was deleted or normalized. Temporary instrumentation is excluded from the commit.

#### Related DEVNOTES

DEV-2026-09-11-034

#### Related Tests

TEST-2026-09-11-001; TEST-2026-09-11-002; TEST-2026-09-11-003; TEST-2026-09-11-004

#### Disposition

Required TASK-005 verification complete. Commit only this task and stop.

---

### TEST-2026-09-12-001 — TASK-006 YAML and static validation

**Date:** 2026-09-12  
**Time:** 21:53 America/New_York  
**Tester:** Cursor Grok 4.6  
**Level:** T0  
**Result:** PASS

#### Scope

Canonical UI YAML hierarchy, generator, TypeScript, and lint after TASK-006.

#### Files Under Validation

- src/ui/ui.yaml
- src/ui/layouts/mobile/**
- src/ui/layouts/tablet/**
- scripts/generate-ui.mjs
- src/ui/generated/uiSpec.ts
- src/ui/generated/hudAssets.ts
- src/ui/layout/HudShell.tsx
- src/ui/layout/HudArtwork.tsx
- src/ui/layout/hudBehavior.ts
- src/ui/layout/HudLayoutContext.tsx

#### Objective

YAML parses, references resolve, portrait/landscape IDs are unique, obsolete layout paths are absent, and TypeScript/lint succeed.

#### Preconditions

Project dependencies installed. Figma naming already applied.

#### Procedure

1. `node scripts/generate-ui.mjs`
2. `node scripts/generate-ui.mjs --check`
3. `npx tsc --noEmit`
4. `npx expo lint`

#### Expected Result

Generation succeeds; check matches emitted files; no TypeScript errors; lint clean.

#### Actual Result

Generator reported `UI specification PASS: 26 YAML files, 38 SVG assets`. `--check` current. `tsc --noEmit` exit 0. `npx expo lint` exit 0 after replacing orientation `useEffect` dock reset with render-time state adjustment.

#### Evidence

Command output from generate-ui, tsc, and expo lint in this session.

#### Failures / Observations

Initial lint flagged `setDockExpanded` inside `useEffect`; corrected before this PASS.

#### Related DEVNOTES

DEV-2026-09-12-001

#### Related Tests

None.

#### Disposition

Static validation complete. Proceed to T1/T2.

---

### TEST-2026-09-12-002 — TASK-006 HUD contract smoke

**Date:** 2026-09-12  
**Time:** 21:53 America/New_York  
**Tester:** Cursor Grok 4.6  
**Level:** T1  
**Result:** PASS

#### Scope

Orientation selection, Home/LOG aliasing, rail contexts, landscape dock spec, retained HUD contracts.

#### Files Under Validation

- scripts/hud-smoke.ts
- src/ui/layout/hudBehavior.ts
- src/ui/generated/uiSpec.ts

#### Objective

Home remains chronological log; LOG is not a rail destination; portrait and landscape layout IDs and dock behavior are present; existing scanner/backup/export contracts still hold.

#### Preconditions

Generated uiSpec current.

#### Procedure

`node --experimental-strip-types scripts/hud-smoke.ts`

#### Expected Result

All assertions pass, including `hudView('/log') === 'home'`, home rail `[graph, search, new]`, landscape collapsed dock, tablet unsupported.

#### Actual Result

`HUD contracts PASS: routes, Home chronological log, orientation layouts, contextual rail, dock, truthful backup, shared pivot, opposite motion, export stub`

#### Evidence

Command exit 0 in this session.

#### Failures / Observations

Node printed a pre-existing MODULE_TYPELESS_PACKAGE_JSON warning for hud-smoke.ts.

#### Related DEVNOTES

DEV-2026-09-12-001

#### Related Tests

TEST-2026-09-12-001

#### Disposition

Module contracts verified. Proceed to browser T2.

---

### TEST-2026-09-12-003 — TASK-006 HUD browser portrait/landscape

**Date:** 2026-09-12  
**Time:** 21:53 America/New_York  
**Tester:** Cursor Grok 4.6  
**Level:** T2  
**Result:** PASS

#### Scope

Production HudShell via the isolated HUD harness: portrait layout, LOG absence, landscape layout/dock/handle, orientation state, retained capture/search/graph flows.

#### Files Under Validation

- scripts/hud-browser-test.mjs
- src/ui/layout/HudShell.tsx
- src/ui/layout/HudArtwork.tsx
- src/ui/layout/HudLayoutContext.tsx

#### Objective

Portrait remains the accepted HUD; landscape is not a rotated portrait arrangement; LOG control is absent; Graph/Search/New remain; landscape dock is collapsed until the handle expands it; capture draft survives portrait↔landscape; portrait dock returns after rotation.

#### Preconditions

`HUD_BROWSER=C:\Program Files\Google\Chrome\Application\chrome.exe` because Playwright's bundled chromium_headless_shell was not installed in this environment.

#### Procedure

`npm run test:hud:browser` after the dock-state lint fix. Harness starts at 390×844, then 844×390, then 390×844, then 360×640.

#### Expected Result

Browser T2 script prints PASS. Screenshots written under `.tmp/hud-qa`.

#### Actual Result

`HUD browser T2 PASS: menu, dock, gallery intent, empty/failed/successful commit, discard, contextual rails, LOG absent, landscape dock/handle, orientation state, handedness, 12-second centered counter-rotation, reduced motion.` Re-run after dock-state fix also PASS. `npm run test:node` also PASS (node-smoke + TASK-005 attachment smoke).

#### Evidence

Harness screenshots: `.tmp/hud-qa/home.png`; `left-handed.png`; `reduced-motion.png`; `landscape-collapsed.png`; `landscape-expanded.png`; `small-phone.png`; `motion-samples.json`. Playwright used system Chrome.

#### Failures / Observations

Playwright's default headless shell was missing; system Chrome was used. No IME/keyboard. Tablet NavigationRail still labels the chronological destination Log (medium/expanded only).

#### Related DEVNOTES

DEV-2026-09-12-001

#### Related Tests

TEST-2026-09-12-001; TEST-2026-09-12-002

#### Disposition

Runtime HUD verification complete for the harness. Native Android remains a separate record.

---

### TEST-2026-09-12-004 — TASK-006 native Android rotation

**Date:** 2026-09-12  
**Time:** 21:53 America/New_York  
**Tester:** Cursor Grok 4.6  
**Level:** T1  
**Result:** PARTIAL

#### Scope

Android emulator rotation, keyboard/content space, and live Metro load of this working tree.

#### Files Under Validation

Not applicable

#### Objective

Rotate emulator-5554 portrait→landscape→portrait against the TASK-006 HudShell without restart, lost entry state, or runtime errors.

#### Preconditions

`adb devices` showed `emulator-5554 device`. Packages `com.captainslog.app` and `host.exp.exponent` installed. Launcher was focused.

#### Procedure

1. Confirmed emulator attached.
2. `npx expo start --android --non-interactive` failed: port 8081 in use; Expo required interactive port substitution.
3. Node PID 125760 was listening on 8081; session ownership of this working tree was not established.
4. Did not load this change into Expo Go or the native package, and did not rotate a live TASK-006 build.

#### Expected Result

Live native HUD uses portrait.yaml in portrait and landscape.yaml in landscape, with collapsed dock/handle and preserved capture state.

#### Actual Result

Native rotation/keyboard procedure was not executed against this working tree. Layout, dock, LOG removal, and orientation state were executed in TEST-2026-09-12-003 using production HudShell at the Figma reference viewports.

#### Evidence

`adb devices` listed emulator-5554. Expo start log: port 8081 in use, skipped dev server.

#### Failures / Observations

Native IME/keyboard landscape space was not observed. An existing Metro on 8081 was not reused because its project/session was unknown.

#### Related DEVNOTES

DEV-2026-09-12-001

#### Related Tests

TEST-2026-09-12-003

#### Disposition

Do not treat native Android keyboard/rotation as PASS. Browser T2 is the executed runtime evidence for layout selection and dock/handle. Native check remains for the user or a follow-up session.


---

### TEST-2026-09-13-001 - AppShell browser runner prerequisites

**Date:** 2026-09-13

**Time:** 13:27 America/New_York (recorded)

**Tester:** Codex

**Level:** T2

**Result:** BLOCKED

#### Scope

AppShell browser runner prerequisites

#### Files Under Validation

scripts/hud-browser-test.mjs; scripts/hud-harness.jsx

#### Objective

Run the real AppShell integration harness.

#### Preconditions

Windows; installed node modules; no downloaded Playwright Chromium.

#### Procedure

Ran npm.cmd run test:hud:browser in the sandbox, then with approved escalation.

#### Expected Result

Harness bundles and Chromium starts.

#### Actual Result

Sandbox denied esbuild parent-directory access. Escalated bundling succeeded, but Playwright could not find chromium_headless_shell-1243.

#### Evidence

Runner output: Cannot read directory ../..: Access is denied; Executable does not exist at the Playwright headless-shell path.

#### Failures / Observations

Configured the test runner to use installed Chrome when bundled Chromium is absent. No production behavior changed.

#### Related DEVNOTES

DEV-2026-09-13-001

#### Related Tests

TEST-2026-09-12-003

#### Disposition

Superseded by executed retests TEST-2026-09-13-002 and TEST-2026-09-13-005.

---

### TEST-2026-09-13-002 - Landscape save regression fixture failure

**Date:** 2026-09-13

**Time:** 13:27 America/New_York (recorded)

**Tester:** Codex

**Level:** T2

**Result:** FAIL

#### Scope

Landscape save regression fixture failure

#### Files Under Validation

scripts/hud-browser-test.mjs; scripts/hud-harness.jsx; src/ui/layout/AppShell.tsx

#### Objective

Return home after committing the preserved rotation draft in landscape.

#### Preconditions

Installed Chrome; AppShell harness; earlier save test enabled fixture.holdSave.

#### Procedure

Ran npm.cmd run test:hud:browser with approved escalation.

#### Expected Result

Commit resolves and the NEW button appears.

#### Actual Result

Rotation/geometry matrix completed, then waiting for NEW timed out because the test fixture still held saves.

#### Evidence

Timeout 30000ms at the NEW wait after the landscape COMMIT; tablet buffer screenshots were generated.

#### Failures / Observations

Corrected the fixture cleanup to set holdSave=false when resolving the earlier pending save.

#### Related DEVNOTES

DEV-2026-09-13-001

#### Related Tests

TEST-2026-09-13-001

#### Disposition

Repaired and retested in TEST-2026-09-13-005.

---

### TEST-2026-09-13-003 - YAML shell static validation

**Date:** 2026-09-13

**Time:** 13:27 America/New_York (recorded)

**Tester:** Codex

**Level:** T0

**Result:** PASS

#### Scope

YAML shell static validation

#### Files Under Validation

src/ui/layout/AppShell.tsx; src/ui/layout/useHudViewport.ts; src/ui/layout/HudLayoutContext.tsx; src/ui/layout/HudShell.tsx; src/ui/layout/HudArtwork.tsx; src/ui/layout/hudBehavior.ts; src/ui/screens/{Capture,Log,Search,Graph}Screen.tsx; src/ui/layouts/mobile/; scripts/generate-ui.mjs; src/ui/generated/uiSpec.ts

#### Objective

Compile the changed shell and screens and validate generated YAML data.

#### Preconditions

Installed repository dependencies.

#### Procedure

Ran npm.cmd run typecheck, npm.cmd run lint, and node scripts/generate-ui.mjs --check (also executed by test:hud).

#### Expected Result

No type/lint errors; generated specification matches YAML.

#### Actual Result

Typecheck and final lint exited 0 with no diagnostics; YAML check reported generation current.

#### Evidence

tsc --noEmit; expo lint; UI specification PASS: 26 YAML files, 38 SVG assets; generation current.

#### Failures / Observations

An initial BOM lint warning in AppShell was removed before the clean lint rerun.

#### Related DEVNOTES

DEV-2026-09-13-001

#### Related Tests

None

#### Disposition

Static gate passed; runtime evidence is in TEST-2026-09-13-005.

---

### TEST-2026-09-13-004 - Orientation and buffer contracts

**Date:** 2026-09-13

**Time:** 13:27 America/New_York (recorded)

**Tester:** Codex

**Level:** T1

**Result:** PASS

#### Scope

Orientation and buffer contracts

#### Files Under Validation

src/ui/layout/hudBehavior.ts; scripts/hud-smoke.ts; scripts/generate-ui.mjs

#### Objective

Preserve the selected composition and fit it safely without upscaling.

#### Preconditions

Generated uiSpec is current.

#### Procedure

Ran npm.cmd run test:hud.

#### Expected Result

Native keyboard window shrink preserves display orientation; web uses window axes; fitting preserves aspect ratio and safe-area bounds.

#### Actual Result

All new orientation/fitting assertions and retained HUD contracts passed.

#### Evidence

HUD contracts PASS; assertions cover 390x300 native window on a 390x844 screen, tablet padding, small windows, asymmetric insets, and old width thresholds.

#### Failures / Observations

Node emitted the existing MODULE_TYPELESS_PACKAGE_JSON warning. Native dimension events themselves were not simulated by this pure-function test.

#### Related DEVNOTES

DEV-2026-09-13-001

#### Related Tests

TEST-2026-09-13-003

#### Disposition

Module gate passed; native runtime remains separate.

---

### TEST-2026-09-13-005 - AppShell rotation and layout integration retest

**Date:** 2026-09-13

**Time:** 13:27 America/New_York (recorded)

**Tester:** Codex

**Level:** T2

**Result:** PASS

#### Scope

AppShell rotation and layout integration retest

#### Files Under Validation

scripts/hud-browser-test.mjs; scripts/hud-harness.jsx; scripts/hud-fixtures.jsx; src/ui/layout/; src/ui/screens/{Capture,Log,Search,Graph}Screen.tsx

#### Objective

Keep the YAML composition mounted through rotation and viewport changes while preserving working screen actions.

#### Preconditions

Installed Chrome; isolated service/router fixtures; real production AppShell, HUD, and feature screens.

#### Procedure

Ran npm.cmd run test:hud:browser with approved escalation after fixture repair. Inspected landscape-expanded and tablet-landscape-buffer screenshots.

#### Expected Result

YAML regions match rendered bounds; unused space is padding; rotation preserves the same input and draft; saving and entity routes work in both orientations.

#### Actual Result

Full suite passed, including 599/600/601 and 899/900/901 widths, portrait and landscape tablets, unusual aspect ratios, asymmetric insets, handedness, dock geometry, capture input identity, landscape commit, and entity navigation from Log/Search/Graph.

#### Evidence

HUD browser T2 PASS: AppShell rotation, YAML geometry, breakpoint/tablet buffers, safe areas, mounted draft preservation, landscape commit, entity routes, menu/dock/actions, handedness, scanner motion, reduced motion. Local artifacts: .tmp/hud-qa/*.png and motion-samples.json.

#### Failures / Observations

Geometry tolerance is 0.2 CSS px. Browser uses React Native Web and service/router doubles; this is not a native build test.

#### Related DEVNOTES

DEV-2026-09-13-001

#### Related Tests

TEST-2026-09-13-001; TEST-2026-09-13-002; TEST-2026-09-12-003

#### Disposition

Browser integration passed. Earlier isolated HudShell tests could not detect the AppShell bypass; this harness now covers it. Native verification remains TEST-2026-09-13-006.

---

### TEST-2026-09-13-006 - Native rotation device availability

**Date:** 2026-09-13

**Time:** 13:27 America/New_York (recorded)

**Tester:** Codex

**Level:** T2

**Result:** BLOCKED

#### Scope

Native rotation device availability

#### Files Under Validation

src/ui/layout/useHudViewport.ts; src/ui/layout/AppShell.tsx

#### Objective

Verify actual native rotation and keyboard behavior against this working tree.

#### Preconditions

Android SDK adb is installed; a connected device or running emulator is required.

#### Procedure

Checked the SDK path with approved escalation; ran adb devices -l.

#### Expected Result

An available Android device permits launching this working tree and testing rotation/IME.

#### Actual Result

adb started its daemon and returned an empty device list. No live build was launched or rotated.

#### Evidence

List of devices attached followed by no entries.

#### Failures / Observations

No native PASS is claimed. Native screen/window events, keyboard behavior, and real safe areas remain unobserved.

#### Related DEVNOTES

DEV-2026-09-13-001

#### Related Tests

TEST-2026-09-12-004; TEST-2026-09-13-004; TEST-2026-09-13-005

#### Disposition

Implementation is reviewable with browser evidence; native release acceptance remains pending a connected device and working-tree build. Owner: project maintainer or follow-up verification session.


---

The following TASK-007 records were appended at 13:44 America/New_York on 2026-09-14 from this session's executed checks and preserved outputs. Exact earlier execution times were not retained; the time field is the recording time. Failure groups describe intermediate runs explicitly and do not overwrite their later retests.

---

### TEST-2026-09-14-001 — Independent Figma and canonical geometry gate

**Date:** 2026-09-14

**Time:** 13:44 America/New_York (recorded)

**Tester:** Codex

**Level:** T0

**Result:** PASS

#### Scope

Figma-to-YAML/assets authority

#### Files Under Validation

scripts/ui-authority-test.mjs; scripts/ui-geometry-validation.mjs; scripts/fixtures/task007-figma.json; mobile YAML and HUD SVGs

#### Objective

Validate canonical visual geometry before generation.

#### Preconditions

Read-only live Figma node/path/export capture; local dependencies.

#### Procedure

Ran canonical validation and independent authority comparisons before generation.

#### Expected Result

Correct geometry/assets match Figma; invalid content is rejected.

#### Actual Result

Gate A passed with a named scanner exception; the deliberate out-of-bounds content case was rejected.

#### Evidence

node scripts/generate-ui.mjs --validate-only; node scripts/ui-authority-test.mjs; captured Figma fixture.

#### Failures / Observations

Portrait scanner remains (310,26) versus Figma (315,28), explicitly accepted earlier; not counted as exact parity.

#### Related DEVNOTES

DEV-2026-09-14-001; DEV-2026-09-14-002; DEV-2026-09-14-003; DEV-2026-09-14-004

#### Related Tests

None

#### Disposition

Canonical generation may proceed within the documented exception.

---

### TEST-2026-09-14-002 — Initial geometry merge type validation

**Date:** 2026-09-14

**Time:** 13:44 America/New_York (recorded)

**Tester:** Codex

**Level:** T0

**Result:** FAIL

#### Scope

Generated geometry typing

#### Files Under Validation

src/ui/layout/hudBehavior.ts; src/ui/layout/HudLayoutContext.tsx; HudShell.tsx

#### Objective

Ensure orientation overlays produce valid typed rectangles.

#### Preconditions

Updated canonical/generated geometry.

#### Procedure

Ran npm.cmd run typecheck; reran after replacing intersection merge typing.

#### Expected Result

No TypeScript errors.

#### Actual Result

First run failed because literal shared/overlay intersections became impossible; next run exposed literal coordinate narrowing in layout context.

#### Evidence

TypeScript errors on merged geometry and left-handed layout positions.

#### Failures / Observations

Replaced intersection with recursive merge typing and widened geometry numbers in context.

#### Related DEVNOTES

DEV-2026-09-14-001; DEV-2026-09-14-002; DEV-2026-09-14-003; DEV-2026-09-14-004

#### Related Tests

TEST-2026-09-14-001

#### Disposition

Blocked progression until corrective static validation; retest -014.

---

### TEST-2026-09-14-003 — Browser runner sandbox dependency access

**Date:** 2026-09-14

**Time:** 13:44 America/New_York (recorded)

**Tester:** Codex

**Level:** T2

**Result:** BLOCKED

#### Scope

Browser harness launch

#### Files Under Validation

scripts/hud-browser-test.mjs; scripts/hud-harness.jsx

#### Objective

Launch the actual AppShell browser harness.

#### Preconditions

esbuild and installed browser available.

#### Procedure

Ran npm.cmd run test:hud:browser under workspace sandbox.

#### Expected Result

Harness bundles and launches.

#### Actual Result

Sandbox denied esbuild/parent-path access before application checks.

#### Evidence

Tool output access denial; approved escalated rerun used afterward.

#### Failures / Observations

Environment restriction, not an application geometry result.

#### Related DEVNOTES

DEV-2026-09-14-001; DEV-2026-09-14-002; DEV-2026-09-14-003; DEV-2026-09-14-004

#### Related Tests

None

#### Disposition

Resolved by authorized runner escalation; subsequent runtime results recorded separately.

---

### TEST-2026-09-14-004 — Initial browser geometry regression failures

**Date:** 2026-09-14

**Time:** 13:44 America/New_York (recorded)

**Tester:** Codex

**Level:** T2

**Result:** FAIL

#### Scope

AppShell geometry and interaction boundary

#### Files Under Validation

scripts/hud-browser-test.mjs; scripts/hud-fixtures.jsx; HudShell.tsx; HudArtwork.tsx

#### Objective

Exercise corrected geometry and primary shell interaction.

#### Preconditions

Bundled actual AppShell with explicit platform/services/router doubles.

#### Procedure

Ran browser suite and corrected each failing assertion before rerunning.

#### Expected Result

Geometry, full heading and menu interaction work.

#### Actual Result

Intermediate runs failed on a duplicate rail test ID, web title ellipsis, an immediate post-rotation assertion, fixture sourceText mismatch, and a transparent rail parent intercepting landscape menu taps.

#### Evidence

Browser assertion output identified each condition. Corrections: unique label test IDs, explicit web clip policy, await settled rotation, valid fixture field, rail pointerEvents box-none.

#### Failures / Observations

Test-harness defects and runtime defects are distinguished above. Failed attempts remain recorded here as the initial integration correction sequence.

#### Related DEVNOTES

DEV-2026-09-14-001; DEV-2026-09-14-002; DEV-2026-09-14-003; DEV-2026-09-14-004

#### Related Tests

TEST-2026-09-14-003

#### Disposition

Blocked progression pending full browser retest -005.

---

### TEST-2026-09-14-005 — Original TASK-007 browser integration retest

**Date:** 2026-09-14

**Time:** 13:44 America/New_York (recorded)

**Tester:** Codex

**Level:** T3

**Result:** PASS

#### Scope

Original geometry-authority regression

#### Files Under Validation

scripts/hud-browser-test.mjs; actual AppShell, HUD and route screens

#### Objective

Verify the original geometry changes across phone/buffer sizes.

#### Preconditions

Corrected harness and runtime from -004.

#### Procedure

Ran npm.cmd run test:hud:browser to completion.

#### Expected Result

Required matrix and route/action regressions pass.

#### Actual Result

HUD browser T2 PASS across phone, boundary, tablet, safe-area and unusual aspect-ratio cases, full heading, Log/Settings scroll and thumbnails.

#### Evidence

Local .tmp/hud-qa screenshots, task007-geometry.json and motion-samples.json.

#### Failures / Observations

This earlier pass preceded continuation host measurement and did not assert measured-frame opacity; -013 found that gap and -016 supersedes it for current code.

#### Related DEVNOTES

DEV-2026-09-14-001; DEV-2026-09-14-002; DEV-2026-09-14-003; DEV-2026-09-14-004

#### Related Tests

TEST-2026-09-14-004

#### Disposition

Original browser regression passed; native validation still required.

---

### TEST-2026-09-14-006 — Node attachment runner sandbox access

**Date:** 2026-09-14

**Time:** 13:44 America/New_York (recorded)

**Tester:** Codex

**Level:** T1

**Result:** BLOCKED

#### Scope

Node and attachment smoke runner

#### Files Under Validation

scripts/node-smoke.ts; scripts/attachment-smoke.mjs

#### Objective

Run existing service/attachment smoke suite.

#### Preconditions

Installed project dependencies.

#### Procedure

Ran npm.cmd run test:node under sandbox.

#### Expected Result

Both node and attachment phases finish.

#### Actual Result

Sixteen node checks passed; attachment bundling was blocked by esbuild parent-path access.

#### Evidence

Runner output; approved escalated rerun followed.

#### Failures / Observations

No attachment PASS is inferred from the completed node phase.

#### Related DEVNOTES

DEV-2026-09-14-001; DEV-2026-09-14-002; DEV-2026-09-14-003; DEV-2026-09-14-004

#### Related Tests

None

#### Disposition

Retest entire command with authorized access; -007.

---

### TEST-2026-09-14-007 — Node and attachment regression retest

**Date:** 2026-09-14

**Time:** 13:44 America/New_York (recorded)

**Tester:** Codex

**Level:** T3

**Result:** PASS

#### Scope

Existing service and attachment regressions

#### Files Under Validation

scripts/node-smoke.ts; scripts/attachment-smoke.mjs

#### Objective

Verify existing service and attachment behavior remains intact.

#### Preconditions

Authorized dependency access.

#### Procedure

Ran npm.cmd run test:node with approved escalation.

#### Expected Result

Node and attachment phases pass.

#### Actual Result

Both phases passed, including all 16 node checks and attachment smoke assertions.

#### Evidence

npm.cmd run test:node completed successfully.

#### Failures / Observations

No live cloud, camera or location claim follows from these mocks/smoke tests.

#### Related DEVNOTES

DEV-2026-09-14-001; DEV-2026-09-14-002; DEV-2026-09-14-003; DEV-2026-09-14-004

#### Related Tests

TEST-2026-09-14-006

#### Disposition

Existing regression passed.

---

### TEST-2026-09-14-008 — Initial native bundle connection

**Date:** 2026-09-14

**Time:** 13:44 America/New_York (recorded)

**Tester:** Codex

**Level:** T2

**Result:** BLOCKED

#### Scope

Android current-working-tree launch

#### Files Under Validation

scripts/hud-native-check.py; Expo Metro runtime

#### Objective

Launch the working-tree native bundle.

#### Preconditions

Installed debug app on Pixel_9_Pro_XL emulator.

#### Procedure

Tried initial launch/reload and inspected bundle error/ANR; corrected Metro transport to port 8081 with LAN binding and adb reverse.

#### Expected Result

Current Metro bundle loads.

#### Actual Result

Initial unable-to-load-script/black-screen/ANR attempts prevented layout verification; standard Metro connection then loaded the app.

#### Evidence

Local .tmp/hud-native initial/reload captures; Expo Metro and adb launch output.

#### Failures / Observations

Transport/launch failure, not a geometry PASS.

#### Related DEVNOTES

DEV-2026-09-14-001; DEV-2026-09-14-002; DEV-2026-09-14-003; DEV-2026-09-14-004

#### Related Tests

TEST-2026-09-13-006

#### Disposition

Connection resolved; native observations follow in -009.

---

### TEST-2026-09-14-009 — Original native geometry and floating IME checks

**Date:** 2026-09-14

**Time:** 13:44 America/New_York (recorded)

**Tester:** Codex

**Level:** T2

**Result:** PARTIAL

#### Scope

Android layout, rotation and keyboard boundary

#### Files Under Validation

HudShell.tsx; useHudViewport.ts; hudBehavior.ts

#### Objective

Observe the current bundle on native Android and distinguish IME resizing from orientation.

#### Preconditions

Pixel_9_Pro_XL, Android 17 API 37, ratio 3; Metro 8081 connected.

#### Procedure

Rotated portrait/landscape, opened dock and empty Capture, inspected title/thumbs, displayed Gboard and read native bounds.

#### Expected Result

Correct layouts and full title; keyboard behavior characterized.

#### Actual Result

Native layouts changed, full NEW RECORD and existing attachment thumbnails displayed; dock endpoints observed. Gboard appeared as floating toolbar/QWERTY and did not reduce window size.

#### Evidence

.tmp/hud-native/landscape.png; portrait-before-keyboard.png; landscape-qwerty-settled.png and corresponding XML/IME dumps.

#### Failures / Observations

Docked keyboard window reduction not exercised. Early screenshots sometimes preceded UI settling; later snapshot helper waits before capture.

#### Related DEVNOTES

DEV-2026-09-14-001; DEV-2026-09-14-002; DEV-2026-09-14-003; DEV-2026-09-14-004

#### Related Tests

TEST-2026-09-14-008

#### Disposition

Native evidence partial; no keyboard-resize or physical Motorola acceptance claimed.

---

### TEST-2026-09-14-010 — User physical phone verification failure

**Date:** 2026-09-14

**Time:** 13:44 America/New_York (recorded)

**Tester:** Michael Garcia (user observation); recorded by Codex

**Level:** T2

**Result:** FAIL

#### Scope

Motorola phone fitting and presentation

#### Files Under Validation

Not applicable: user-supplied observation DEV-2026-09-14-002

#### Objective

Record the user's actual device acceptance result.

#### Preconditions

Motorola Edge Plus 5G UW; user screenshot 919 x 2047 px.

#### Procedure

User inspected portrait/landscape fit, dock reveal and handedness; transcribed findings from DEV-002.

#### Expected Result

Centered authorized layout; assembled dock; supported handedness policy.

#### Actual Result

Approximate L/R/T/B clearances 76/75/119/216 px; vertical difference 97 px. User reports excess right-side space after rotation, sequential dock reveal, and landscape handedness failure.

#### Evidence

DEV-2026-09-14-002 and user's continuation request; measurements belong to the user, not an agent ADB capture.

#### Failures / Observations

Safe-area/runtime inputs were not supplied, so exact centering cause cannot be assigned.

#### Related DEVNOTES

DEV-2026-09-14-001; DEV-2026-09-14-002; DEV-2026-09-14-003; DEV-2026-09-14-004

#### Related Tests

TEST-2026-09-14-009

#### Disposition

TASK-007 remains open; corrective investigation required.

---

### TEST-2026-09-14-011 — Continuation physical device availability

**Date:** 2026-09-14

**Time:** 13:44 America/New_York (recorded)

**Tester:** Codex

**Level:** T2

**Result:** BLOCKED

#### Scope

Motorola diagnostic access

#### Files Under Validation

scripts/hud-native-check.py; useHudFit.ts

#### Objective

Capture actual Motorola fit inputs.

#### Preconditions

Phone connected with USB debugging.

#### Procedure

Checked ADB at continuation; no device was connected. Requested phone connection while continuing independent work; restarted headless emulator for bounded QA.

#### Expected Result

Motorola appears and exposes current runtime diagnostics.

#### Actual Result

Motorola unavailable. Only emulator-5554 became available after emulator restart.

#### Evidence

ADB device list and emulator launch output.

#### Failures / Observations

The emulator is not substituted for the user's phone acceptance.

#### Related DEVNOTES

DEV-2026-09-14-001; DEV-2026-09-14-002; DEV-2026-09-14-003; DEV-2026-09-14-004

#### Related Tests

TEST-2026-09-14-010

#### Disposition

Continue authorized diagnostic/dock/handedness work; physical acceptance blocked pending connection.

---

### TEST-2026-09-14-012 — Continuation dock rotation regression

**Date:** 2026-09-14

**Time:** 13:44 America/New_York (recorded)

**Tester:** Codex

**Level:** T2

**Result:** FAIL

#### Scope

Assembled dock lifecycle

#### Files Under Validation

src/ui/layout/HudDock.tsx; scripts/hud-browser-test.mjs

#### Objective

Preserve canonical collapsed handle placement on orientation changes.

#### Preconditions

New mounted dock assembly.

#### Procedure

Ran continuation browser suite.

#### Expected Result

Collapsed landscape handle returns to canonical Y=340.

#### Actual Result

Assertion observed an intermediate Y about 272.9 from progress inherited across orientation.

#### Evidence

Browser geometry assertion during rotation.

#### Failures / Observations

Added pre-paint orientation reset in useLayoutEffect; no Figma rectangle change.

#### Related DEVNOTES

DEV-2026-09-14-001; DEV-2026-09-14-002; DEV-2026-09-14-003; DEV-2026-09-14-004

#### Related Tests

TEST-2026-09-14-005

#### Disposition

Retest -016 required before accepting assembled transition.

---

### TEST-2026-09-14-013 — Continuation host measurement regression

**Date:** 2026-09-14

**Time:** 13:44 America/New_York (recorded)

**Tester:** Codex

**Level:** T2

**Result:** FAIL

#### Scope

Measured host visibility and resizing

#### Files Under Validation

src/ui/layout/useHudFit.ts; HudShell.tsx; scripts/hud-browser-test.mjs

#### Objective

Fit a real 430 x 850 host inside a 430 x 932 browser window.

#### Preconditions

Measured-host hook with loading root initially lacking onLayout.

#### Procedure

Ran continuation suite; added diagnostic output and visibility assertion after initial timeout.

#### Expected Result

Host measurement updates and visible frame fits 430 x 850.

#### Actual Result

Repeated host test failed: actual host was 430 x 850, but measured state remained null and frame opacity 0. Earlier geometry-only assertions had missed invisibility.

#### Evidence

Browser failure diagnostics: host rect versus stale window-fit frame and opacity 0.

#### Failures / Observations

RN Web registered its observer only at root mount; font-loading root reused the View without initial onLayout. Registered ref/onLayout there as well.

#### Related DEVNOTES

DEV-2026-09-14-001; DEV-2026-09-14-002; DEV-2026-09-14-003; DEV-2026-09-14-004

#### Related Tests

TEST-2026-09-14-012; TEST-2026-09-14-005

#### Disposition

Blocked acceptance until visibility-aware full retest -016.

---

### TEST-2026-09-14-014 — Final implementation static validation

**Date:** 2026-09-14

**Time:** 13:44 America/New_York (recorded)

**Tester:** Codex

**Level:** T0

**Result:** PASS

#### Scope

Changed TypeScript and JavaScript contracts

#### Files Under Validation

All changed src/ui TypeScript and scripts listed in TASK-007_REPORT_2026-09-14.md

#### Objective

Compile and lint current implementation.

#### Preconditions

Dependencies installed; corrected geometry/context/loading-root code.

#### Procedure

Ran npm.cmd run typecheck and npm.cmd run lint after continuation fixes.

#### Expected Result

No compilation/lint errors.

#### Actual Result

Both commands exited 0 with no reported errors.

#### Evidence

Final typecheck/lint tool output.

#### Failures / Observations

Subsequent changes were documentation, evidence and comment/whitespace cleanup only. Full git diff --check flags intentional Markdown hard breaks in append-only DEVNOTES; code-only check passes.

#### Related DEVNOTES

DEV-2026-09-14-001; DEV-2026-09-14-002; DEV-2026-09-14-003; DEV-2026-09-14-004

#### Related Tests

TEST-2026-09-14-002; TEST-2026-09-14-013

#### Disposition

Static gate passed; does not replace runtime acceptance.

---

### TEST-2026-09-14-015 — Final authority parity and HUD contracts

**Date:** 2026-09-14

**Time:** 13:44 America/New_York (recorded)

**Tester:** Codex

**Level:** T1

**Result:** PASS

#### Scope

Canonical-to-generated and geometry contracts

#### Files Under Validation

scripts/generate-ui.mjs; ui-authority-test.mjs; ui-geometry-validation.mjs; hud-smoke.ts; generated UI; hudBehavior.ts

#### Objective

Verify independent authority gates and fitting/dock/handedness contracts.

#### Preconditions

Live Figma snapshot and current canonical YAML.

#### Procedure

Ran npm.cmd run test:hud (generation freshness, independent Gate A/B, HUD contracts).

#### Expected Result

Correct parity; no scale cap; symmetric fit; valid containment; YAML handedness/dock contracts.

#### Actual Result

26 YAML files / 45 SVG assets current; Gate A and B PASS; HUD contracts PASS including host/provider intersection, orientation override/square, keyboard axes and dock attachment.

#### Evidence

Exact runner output: UI specification PASS; Gate A PASS; Gate B PASS; HUD contracts PASS.

#### Failures / Observations

Existing Node MODULE_TYPELESS_PACKAGE_JSON warning remains; scanner exception explicitly reported.

#### Related DEVNOTES

DEV-2026-09-14-001; DEV-2026-09-14-002; DEV-2026-09-14-003; DEV-2026-09-14-004

#### Related Tests

TEST-2026-09-14-001; TEST-2026-09-14-014

#### Disposition

Authority and module gates pass with documented exception.

---

### TEST-2026-09-14-016 — Final visibility-aware browser regression

**Date:** 2026-09-14

**Time:** 13:44 America/New_York (recorded)

**Tester:** Codex

**Level:** T3

**Result:** PASS

#### Scope

AppShell geometry, dock and preference integration

#### Files Under Validation

scripts/hud-browser-test.mjs; hud-harness.jsx; hud-fixtures.jsx; AppShell/HudShell/HudDock/SettingsScreen

#### Objective

Verify current corrective implementation across the required matrix.

#### Preconditions

Actual RN Web components, installed browser, platform/service doubles; corrected loading measurement.

#### Procedure

Ran npm.cmd run test:hud:browser to completion after -012/-013 fixes.

#### Expected Result

All geometry, visibility, interaction and preservation assertions pass.

#### Actual Result

Suite passed: actual host-size fitting; 8-unit border; required phones and wider matrix; full title; assembled opening/closing with pinned handle and stable nodes; disabled landscape Left and preserved portrait preference; Log/Settings scrolling, Graph/Search, thumbnails, drafts/actions and reduced motion.

#### Evidence

HUD browser T2 PASS; .tmp/hud-qa/task007-geometry.json, dock-motion-true.json, dock-motion-false.json, motion-samples.json and screenshots.

#### Failures / Observations

Browser doubles do not establish physical-phone safe areas, keyboard resizing or native visual motion quality.

#### Related DEVNOTES

DEV-2026-09-14-001; DEV-2026-09-14-002; DEV-2026-09-14-003; DEV-2026-09-14-004

#### Related Tests

TEST-2026-09-14-005; TEST-2026-09-14-012; TEST-2026-09-14-013

#### Disposition

Browser regression passes. Native acceptance remains separate.

---

### TEST-2026-09-14-017 — Native settled fit and screenshot remeasurement

**Date:** 2026-09-14

**Time:** 13:44 America/New_York (recorded)

**Tester:** Codex

**Level:** T2

**Result:** PASS

#### Scope

Emulator safe-relative centering

#### Files Under Validation

useHudFit.ts; hudBehavior.ts; scripts/fixtures/task007-native-fit.json

#### Objective

Measure settled emulator border clearances and symmetric remainder in both orientations.

#### Preconditions

Current Metro bundle; Pixel_9_Pro_XL Android 17 API 37; ratio 3.

#### Procedure

Captured screen/window/host/provider/fit traces and screenshots, scanned straight border pixels against #2A5A6E, cross-checked native bounds; compared before/after continuation.

#### Expected Result

Remainder split equally, largest uniform fit, border 8 logical units, only intentional safe asymmetry.

#### Actual Result

Before and after portrait L/R/T/B=58/58/183/96 px; landscape=392/233/180/96. After subtracting measured safe areas portrait L/R=58/58,T/B=24/24; landscape L/R=233/233,T/B=24/24. Scales 1.090442314 and 0.953846154.

#### Evidence

scripts/fixtures/task007-native-fit.json; .tmp/hud-native/continuation-portrait.png, continuation-landscape.png and XML; report contains full table.

#### Failures / Observations

Emulator old/new fits are essentially equal because host equals window. This does not explain or fix-prove Motorola's 97 px difference. Trace includes transient asynchronous rotation states; only settled states accepted.

#### Related DEVNOTES

DEV-2026-09-14-001; DEV-2026-09-14-002; DEV-2026-09-14-003; DEV-2026-09-14-004

#### Related Tests

TEST-2026-09-14-009; TEST-2026-09-14-011; TEST-2026-09-14-015

#### Disposition

Emulator centering passes within safe-area tolerance; physical acceptance remains -019.

---

### TEST-2026-09-14-018 — Native handedness round-trip and dock endpoint

**Date:** 2026-09-14

**Time:** 13:44 America/New_York (recorded)

**Tester:** Codex

**Level:** T2

**Result:** PASS

#### Scope

Native YAML semantics and assembled dock endpoint

#### Files Under Validation

HudDock.tsx; AppShell.tsx; SettingsScreen.tsx; primitives.tsx; mobile handedness/transition YAML

#### Objective

Verify native preference preservation and handle-to-dock attachment.

#### Preconditions

Current debug bundle; existing right-handed emulator preference.

#### Procedure

Opened landscape dock, measured endpoints; opened Settings; rotated portrait, selected Left, rotated landscape, pressed Right, rotated portrait; restored original Right and test settings.

#### Expected Result

Left visibly disabled in landscape, saved portrait Left restored, handle touches dock top.

#### Actual Result

Landscape Left native button enabled=false and visibly dim; Active:right. Returning portrait showed Active:left with enabled Left and left-side rail. Expanded handle [1224,811-1445,890] meets dock/bezel top 890 px.

#### Evidence

.tmp/hud-native/continuation-dock-open.png/.xml; continuation-left-pref-landscape.png/.xml; continuation-left-pref-restored.png/.xml.

#### Failures / Observations

This checks native endpoints and preference, not frame-by-frame Motorola animation perception. No archive entries were created or deleted.

#### Related DEVNOTES

DEV-2026-09-14-001; DEV-2026-09-14-002; DEV-2026-09-14-003; DEV-2026-09-14-004

#### Related Tests

TEST-2026-09-14-016; TEST-2026-09-14-017

#### Disposition

Native bounded checks pass; physical motion review still required.

---

### TEST-2026-09-14-019 — TASK-007 physical completion gate

**Date:** 2026-09-14

**Time:** 13:44 America/New_York (recorded)

**Tester:** Codex

**Level:** T3

**Result:** BLOCKED

#### Scope

Physical corrective acceptance

#### Files Under Validation

useHudFit.ts; HudDock.tsx; TASK-007 report

#### Objective

Establish Motorola root cause and verify corrected portrait/landscape behavior on that phone.

#### Preconditions

Current working-tree build on connected Motorola; user visual review.

#### Procedure

Prepared geometry diagnostics and report; checked available device context. Required physical after-captures cannot be taken without the phone.

#### Expected Result

Measured phone root cause and after-fit pass, assembled native dock accepted, keyboard/window behavior verified.

#### Actual Result

Exact Motorola centering cause and after-measurements remain unavailable. Docked IME resize verification also remains incomplete.

#### Evidence

DEV-2026-09-14-002; scripts/fixtures/task007-native-fit.json explicitly marks physicalMotorolaVerified=false; full report.

#### Failures / Observations

No closure, no commit, no assertion that emulator PASS clears the user's failure.

#### Related DEVNOTES

DEV-2026-09-14-001; DEV-2026-09-14-002; DEV-2026-09-14-003; DEV-2026-09-14-004

#### Related Tests

TEST-2026-09-14-010; TEST-2026-09-14-011; TEST-2026-09-14-017; TEST-2026-09-14-018

#### Disposition

Keep TASK-007 OPEN. Owner: user/maintainer supplies connected phone; Codex collects current traces and completes bounded diagnosis. Commit requires explicit user authorization.


---

### TEST-2026-09-14-020 — Full-window pre-code classification inspection

**Date:** 2026-09-14

**Time:** 13:50 America/New_York

**Tester:** Codex

**Level:** T0

**Result:** STATIC_ONLY

#### Scope

TASK-007 full-window replacement model

#### Files Under Validation

docs/TASK-007_FULL_WINDOW_LAYOUT_2026-09-14.md; mobile portrait/landscape YAML; scripts/fixtures/task007-figma.json

#### Objective

Compare major region reference bounds with existing independent Figma capture and state the replacement classifications.

#### Preconditions

User corrective direction supersedes global fitting; Figma reference capture available.

#### Procedure

Read portrait/landscape YAML, the independent Figma fixture and runtime composition; documented tables and identified fixed-width/short-rail conflicts before any replacement code changes.

#### Expected Result

Explicit region classifications expose constraints before implementation.

#### Actual Result

Both orientations have a bounds/class/fixed-dimension/anchor/stretch/safe-area table. Whole-artboard fit is explicitly superseded. Narrow/short-window policy is not yet settled.

#### Evidence

Classification report; DEV-2026-09-14-005; source-file inspection in this session.

#### Failures / Observations

Fixed portrait dock/header and short rails need a declared policy; no global scaling fallback is permitted.

#### Related DEVNOTES

DEV-2026-09-14-005; DEV-2026-09-14-002

#### Related Tests

TEST-2026-09-14-015; TEST-2026-09-14-016; TEST-2026-09-14-017; TEST-2026-09-14-019

#### Disposition

Classification is reviewable; do not infer runtime correctness or begin replacement before the listed policy is clear.

### TEST-2026-09-14-021 — Full-window physical acceptance

**Date:** 2026-09-14

**Time:** 13:50 America/New_York

**Tester:** Codex

**Level:** T3

**Result:** NOT_EXECUTED

#### Scope

TASK-007 full-window replacement model

#### Files Under Validation

docs/TASK-007_FULL_WINDOW_LAYOUT_2026-09-14.md; mobile portrait/landscape YAML; scripts/fixtures/task007-figma.json

#### Objective

Verify full-window portrait/landscape rendering on the physical phone under the replacement model.

#### Preconditions

User corrective direction supersedes global fitting; Figma reference capture available.

#### Procedure

Identified required tests; no replacement implementation or connected Motorola is available at this classification stage.

#### Expected Result

Physical phone canvas fills window, fixed controls retain size, flexible regions consume remainder, no global aspect-ratio fit.

#### Actual Result

No new-model native acceptance executed. Earlier uniform-fit PASS entries test the superseded model and cannot satisfy this objective.

#### Evidence

Classification report; DEV-2026-09-14-005; source-file inspection in this session.

#### Failures / Observations

Fixed portrait dock/header and short rails need a declared policy; no global scaling fallback is permitted.

#### Related DEVNOTES

DEV-2026-09-14-005; DEV-2026-09-14-002

#### Related Tests

TEST-2026-09-14-015; TEST-2026-09-14-016; TEST-2026-09-14-017; TEST-2026-09-14-019

#### Disposition

TASK-007 remains OPEN. Settle classification, implement, then capture physical-phone results; no commit.

---

### TEST-2026-09-18-001 — TASK-007 TypeScript validation

**Date:** 2026-09-18  
**Time:** 12:10 America/New_York  
**Tester:** Cursor Grok 4.6 agent  
**Level:** T0  
**Result:** PASS

#### Scope

Schema 3 resolver and full-window HUD TypeScript contracts.

#### Files Under Validation

src/ui/ts_layout/resolveHudLayout.ts; useHudResolve.ts; HudShell.tsx; AppShell.tsx; HudDock.tsx; HudArtwork.tsx; HudLayoutContext.tsx; hudBehavior.ts; src/ui/generated/uiSpec.ts

#### Objective

Verify the modified HUD runtime compiles against generated schema 3 types.

#### Preconditions

Generated `uiSpec.ts` is schema_version 3 with `runtime_regions` and no fitting policy.

#### Procedure

1. Run `npx tsc --noEmit`.

#### Expected Result

No TypeScript errors.

#### Actual Result

Command exited 0 with no diagnostics.

#### Evidence

`npx tsc --noEmit` (exit 0)

#### Failures / Observations

None.

#### Related DEVNOTES

DEV-2026-09-18-001; DEV-2026-09-14-005

#### Related Tests

None.

#### Disposition

Static type validation complete for the schema 3 runtime.

---

### TEST-2026-09-18-002 — TASK-007 YAML, authority, and resolver smoke

**Date:** 2026-09-18  
**Time:** 12:12 America/New_York  
**Tester:** Cursor Grok 4.6 agent  
**Level:** T1  
**Result:** PASS

#### Scope

Schema 3 contract, generation freshness, Figma authority, and pure region resolver.

#### Files Under Validation

scripts/ui-yaml-contract.mjs; scripts/generate-ui.mjs; scripts/ui-authority-test.mjs; scripts/hud-resolve-smoke.ts; scripts/hud-smoke.ts; src/ui/yaml_layout/; src/ui/ts_layout/resolveHudLayout.ts

#### Objective

Verify deprecated layout paths are absent from active sources, schema 3 generation matches YAML/Figma, and the resolver reconstructs Figma scanner 315,28 without global scale.

#### Preconditions

Canonical YAML under `src/ui/yaml_layout/`; live Figma snapshot fixture present.

#### Procedure

1. `node scripts/ui-yaml-contract.mjs`
2. `npx tsx scripts/hud-resolve-smoke.ts`
3. `npx tsx scripts/hud-smoke.ts`

#### Expected Result

YAML contract PASS; resolver PASS at portrait 390×844 / landscape 844×390, mins 362/775, left-hand scanner x=15, no reference_regions poisoning; HUD contracts PASS including Gate A/B.

#### Actual Result

YAML schema 3 contract PASS. Resolver PASS: full-window regions, Figma scanner, mins, handedness, safe-area, no global scale. UI specification PASS; Gate A PASS; Gate B PASS; HUD contracts PASS.

#### Evidence

Exact runner output from `npx tsx scripts/hud-smoke.ts`: YAML schema 3 contract PASS; UI specification PASS; Gate A PASS; Gate B PASS; HUD resolver PASS; HUD contracts PASS.

#### Failures / Observations

Existing Node MODULE_TYPELESS_PACKAGE_JSON warning on generated `uiSpec.ts` remains.

#### Related DEVNOTES

DEV-2026-09-18-001; DEV-2026-09-14-005

#### Related Tests

TEST-2026-09-18-001

#### Disposition

Module-level schema 3 and resolver gates pass. TASK-007 remains OPEN pending physical verification.

---

### TEST-2026-09-18-003 — TASK-007 full-window browser integration

**Date:** 2026-09-18  
**Time:** 12:15 America/New_York  
**Tester:** Cursor Grok 4.6 agent  
**Level:** T2  
**Result:** PASS

#### Scope

AppShell/HudShell rendered geometry and interactions after removing global artboard fit.

#### Files Under Validation

scripts/hud-browser-test.mjs; scripts/hud-harness.jsx; src/ui/ts_layout/HudShell.tsx; AppShell.tsx; HudDock.tsx; HudArtwork.tsx; useHudResolve.ts

#### Objective

Verify the production HUD fills the window, keeps Figma scanner size, places reference-size regions without scale/letterbox, and preserves route/dock/handedness behavior.

#### Preconditions

Playwright/Chromium available; harness aliases Expo modules to `scripts/hud-fixtures.jsx`.

#### Procedure

1. Run `npx --yes tsx scripts/hud-browser-test.mjs`.

#### Expected Result

Canvas fills host; transform is identity; portrait scanner remains 60×82; reference 390×844 reconstructs Figma regions including scanner 315,28; left-handed NEW at x=15; landscape dock parent/bezel distinction retained; drafts survive rotation.

#### Actual Result

Command exited 0. Runner: HUD browser T2 PASS: AppShell rotation, full-window YAML regions, no global scale, mounted draft preservation, landscape commit, entity routes, menu/dock/actions, handedness, scanner motion, reduced motion.

#### Evidence

`npx --yes tsx scripts/hud-browser-test.mjs` (exit 0); screenshots under `.tmp/hud-qa/`.

#### Failures / Observations

Browser T2 is not physical Motorola verification.

#### Related DEVNOTES

DEV-2026-09-18-001; DEV-2026-09-14-005

#### Related Tests

TEST-2026-09-18-002; TEST-2026-09-14-016

#### Disposition

Web integration of the replacement model passes. TASK-007 remains OPEN.

---

### TEST-2026-09-18-004 — TASK-007 physical Motorola verification

**Date:** 2026-09-18  
**Time:** 12:16 America/New_York  
**Tester:** Cursor Grok 4.6 agent  
**Level:** T3  
**Result:** NOT_EXECUTED

#### Scope

Physical portrait and landscape acceptance of the full-window HUD on the Motorola phone.

#### Files Under Validation

src/ui/ts_layout/HudShell.tsx; resolveHudLayout.ts; useHudResolve.ts; installed Android build

#### Objective

Verify on the connected Motorola that the canvas fills the window, the border is 8 from actual edges, fixed controls keep Figma sizes, flexible regions absorb remainder, and no global scale/letterbox is applied.

#### Preconditions

Replacement runtime implemented; `adb devices` must list the Motorola.

#### Procedure

1. Ran `adb devices -l`.
2. Stopped: no device attached. Did not install or launch a native build.

#### Expected Result

Physical phone measurements for both orientations, including actual window size and resolved regions.

#### Actual Result

ADB daemon started; device list empty. No native package was installed or measured.

#### Evidence

`adb devices -l` output: `List of devices attached` followed by no entries.

#### Failures / Observations

TASK-007 cannot close without this physical gate. Browser T2 PASS does not substitute.

#### Related DEVNOTES

DEV-2026-09-18-001; DEV-2026-09-14-005

#### Related Tests

TEST-2026-09-18-003; TEST-2026-09-14-021

#### Disposition

NOT_EXECUTED because no Motorola was connected. TASK-007 remains OPEN. No commit.

---

### TEST-2026-09-18-005 — TASK-007 coordinate-space and rotation regressions

**Date:** 2026-09-18

**Tester:** Codex

**Level:** T0 / T1 / T2

**Result:** PASS (physical-device follow-up NOT_EXECUTED)

#### Scope

Correct the supplied physical `HUD_RESOLVE` double-counting trace using one
provider-local coordinate space. Preserve the rotation guard and reference geometry.
Investigation: [coordinate-space findings](planning/TASK-007_COORDINATE_INVESTIGATION_2026-09-18.md).

#### Procedure and Actual Result

- `npm.cmd run typecheck` — PASS.
- `npm.cmd run test:hud` — PASS: YAML contract, unchanged generated specification,
  independent Figma fixture authority, pure resolver and HUD behavior regressions.
- `npm.cmd run test:hud:browser -- --coordinates-only` — PASS: production hook
  with separately delivered layout/window measurements and exact trace values.
- `npm.cmd run test:hud:browser` — PASS: full browser integration, mounted capture
  draft identity across rotation, both orientations, safe areas, dock and menus.
- `npm.cmd run lint` — exit 0; two existing array-type warnings remain in
  `HudShell.tsx` and `resolveHudLayout.ts`; no lint errors.

#### Regression Evidence

1. Window host y = -66.0513 and safe top = 66.0513 resolve to top obstruction
   66.0513, not 132.1026. Existing safety buffer places the portrait header at 74.0513.
2. Window host x = -66.0513 and safe left = 66.0513 resolve to left obstruction
   66.0513; landscape top -24.2051 likewise produces 24.2051 once. Right/bottom
   obstructions remain present instead of being canceled by the origin mismatch.
3. Portrait to landscape with a stale portrait host returns `pending`, without
   resolving the new layout against old axes. Fresh host layout becomes ready.
4. Landscape to portrait follows the same rule. A delayed earlier window callback
   cannot replace the new canvas. Pure tests also cover reversed event order,
   provider origin shifts, real parent-local padding, and native keyboard shortening.

#### Failures Resolved During Verification

Early pure assertions were corrected for floating-point tolerance and the actual
safe rectangle. The new pending state exposed a dock orientation handoff: treating
its temporarily missing handle as open started a collapse animation before matching
host geometry arrived. `HudDock` now waits for resolved geometry before consuming
the orientation change; the complete browser suite passes. Reference geometry was
not changed to address the failure.

#### Disposition

Automated correction verified. No physical-device run or installation was performed
in this investigation; fresh portrait/landscape `HUD_RESOLVE` traces from the corrected
bundle remain the acceptance follow-up. TASK-007 stays OPEN. No commit.

---

### TEST-2026-09-20-001 — Account identity YAML contract and schema audit

**Date:** 2026-09-20  
**Time:** 21:50 America/New_York  
**Tester:** Cursor Grok 4.6 agent  
**Level:** T0 / T1  
**Result:** PASS

#### Scope

Authoritative account-identity YAML (P00): parse the contract and check schema versions against the repository.

#### Files Under Validation

- docs/ACCOUNT_IDENTITY.yaml
- scripts/account-identity-yaml-smoke.ts
- src/adapters/sqlite/schema.ts
- src/adapters/sqlite/database.ts
- src/adapters/sqlite/migrations.ts
- src/ui/ui.yaml
- src/ui/yaml_layout/mobile/mobile.yaml
- package.json

#### Objective

Confirm the YAML parses, SQLite remains version 2, HUD layout generator is schema 3, D1–D12 are APPROVED, and P01 is the next implementation phase.

#### Preconditions

Project dependencies installed, including `yaml` and `tsx`.

#### Procedure

1. Run `npx tsx scripts/account-identity-yaml-smoke.ts`.
2. Run `npm run test:node`.

#### Expected Result

YAML smoke passes. Combined node smoke still passes extraction, attachment, and schema v2 checks.

#### Actual Result

First YAML parse failed: `YAMLParseError` at `services.AuthService` because mapping keys (`lifetime`) were mixed into a sequence. After converting service entries to maps with `responsibilities` lists, both commands passed.

#### Evidence

- `npx tsx scripts/account-identity-yaml-smoke.ts` → `PASS account-identity-yaml-smoke` / `assertions=44`
- `npm run test:node` → `PASS node-smoke` / `assertions=16`; `PASS TASK-005 attachment copy ordering, URI preservation, and failure fallback`; `PASS account-identity-yaml-smoke` / `assertions=44`

#### Failures / Observations

The initial indent error was in the contract document, not in SQLite. No device tests were run; none are required for P00.

#### Related DEVNOTES

DEV-2026-09-20-002, DEV-2026-09-20-003

#### Related Tests

None.

#### Disposition

P00 documentation contract is verified. Implementation may proceed to P01 identity TypeScript contracts. Native Google, encryption, and authority deployment remain out of scope.

---

---

### TEST-2026-09-21-002 — Record approved Signal-inspired cryptographic decisions

**Date:** 2026-09-21  
**Time:** 21:45 America/New_York  
**Tester:** Cursor Grok 4.6 agent  
**Level:** T0 / T1  
**Result:** PASS

#### Scope

Authoritative account-identity YAML after D31/D33/D36 approval and D34/D35 approved direction.

#### Files Under Validation

- docs/ACCOUNT_IDENTITY.yaml
- scripts/account-identity-yaml-smoke.ts
- src/adapters/sqlite/schema.ts
- package.json

#### Objective

Confirm the YAML parses, D31/D33/D36 are APPROVED, D34/D35 are APPROVED_DIRECTION, D38 exists as remaining sharing specification, session-token invariants I25–I30 exist, grant TTLs match 300/3600/120, and the 256-bit / 64-hex recovery secret is recorded. P01 remains blocked.

#### Preconditions

Project dependencies installed, including `yaml` and `tsx`.

#### Procedure

1. Run `npx tsx scripts/account-identity-yaml-smoke.ts`.
2. Run `npm run test:node`.

#### Expected Result

YAML smoke passes. Combined node smoke still passes extraction, attachment, and schema v2 checks. D13, D14, D32, D37, and D38 remain PROPOSED_REVIEW. Implementation has not started.

#### Actual Result

Both commands passed. YAML smoke reported 81 assertions.

#### Evidence

- `npx tsx scripts/account-identity-yaml-smoke.ts` → `PASS account-identity-yaml-smoke` / `assertions=81`
- `npm run test:node` → `PASS node-smoke` / `assertions=16`; attachment smoke PASS; `PASS account-identity-yaml-smoke` / `assertions=81`

#### Failures / Observations

No device tests were run; none are required for this documentation update. P01 remains blocked on remaining proposed-review items.

#### Related DEVNOTES

DEV-2026-09-21-002

#### Related Tests

TEST-2026-09-20-001

#### Disposition

Accepted cryptographic direction is recorded in the contract. Do not start P01.

---

---

### TEST-2026-09-21-003 — Layered archive key hierarchy contract

**Date:** 2026-09-21  
**Time:** 22:00 America/New_York  
**Tester:** Cursor Grok 4.6 agent  
**Level:** T0 / T1  
**Result:** PASS

#### Scope

Authoritative account-identity YAML after D15/D28 approval and D33/D34 hierarchy clarification.

#### Files Under Validation

- docs/ACCOUNT_IDENTITY.yaml
- scripts/account-identity-yaml-smoke.ts

#### Objective

Confirm the YAML parses, D15/D28 are APPROVED, Recovery Secret is 256-bit / 64 hex, Recovery KEK HKDF info is `captains-log/recovery-kek/v1`, sqlite domain is `captains-log/sqlite/v1`, AES-GCM nonce reuse is forbidden, and plaintext migration does not claim physical erasure. P04/P14/P19/P20/P24 remain unimplemented.

#### Preconditions

Project dependencies installed, including `yaml` and `tsx`.

#### Procedure

1. Run `npx tsx scripts/account-identity-yaml-smoke.ts`.
2. Run `npm run test:node`.

#### Expected Result

YAML smoke passes with D15/D28 APPROVED and the new hierarchy assertions. Combined node smoke still passes extraction, attachment, and schema v2 checks.

#### Actual Result

Both commands passed. YAML smoke reported 102 assertions.

#### Evidence

- `npx tsx scripts/account-identity-yaml-smoke.ts` → `PASS account-identity-yaml-smoke` / `assertions=102`
- `npm run test:node` → `PASS node-smoke` / `assertions=16`; attachment smoke PASS; `PASS account-identity-yaml-smoke` / `assertions=102`

#### Failures / Observations

No device tests were run; none are required for this documentation update. P01, P04, P14, P19, P20, and P24 remain unimplemented.

#### Related DEVNOTES

DEV-2026-09-21-003

#### Related Tests

TEST-2026-09-21-002

#### Disposition

Layered key hierarchy is recorded in the contract. Do not start P01, P04, P14, P19, P20, or P24.

---

---

### TEST-2026-09-22-001 — D32/D38 corrections and P04 beta gate

**Date:** 2026-09-22  
**Time:** 21:45 America/New_York  
**Tester:** Cursor Grok 4.6 agent  
**Level:** T0 / T1  
**Result:** PASS

#### Scope

Authoritative account-identity YAML after restoring D38 as human-readable User ID, approving D32 local-versus-WebAuthn, moving sharing leftovers to D34-A through D34-D, and requiring P04 before P29.

#### Files Under Validation

- docs/ACCOUNT_IDENTITY.yaml
- scripts/account-identity-yaml-smoke.ts

#### Objective

Confirm D32 and D38 are APPROVED, D34-A through D34-D are PROPOSED_REVIEW, P29 lists P04, local archive unlock is not WebAuthn, and user_id is distinct from account_uuid.

#### Preconditions

Project dependencies installed, including `yaml` and `tsx`.

#### Procedure

1. Run `npx tsx scripts/account-identity-yaml-smoke.ts`.
2. Run `npm run test:node`.

#### Expected Result

YAML smoke passes. Combined node smoke still passes extraction, attachment, and schema v2 checks. Implementation has not started.

#### Actual Result

Both commands passed. YAML smoke reported 119 assertions.

#### Evidence

- `npx tsx scripts/account-identity-yaml-smoke.ts` → `PASS account-identity-yaml-smoke` / `assertions=119`
- `npm run test:node` → `PASS node-smoke` / `assertions=16`; attachment smoke PASS; `PASS account-identity-yaml-smoke` / `assertions=119`

#### Failures / Observations

No device tests were run. P01, P04, P14, P19, P20, and P24 remain unimplemented.

#### Related DEVNOTES

DEV-2026-09-22-001

#### Related Tests

TEST-2026-09-21-003

#### Disposition

Corrections are recorded in the contract. Do not start blocked phases.

---

### TEST-2026-09-28-001 — Approve remaining architecture and release P01 hold

**Date:** 2026-09-28  
**Time:** 16:10 America/New_York  
**Tester:** Cursor Grok 4.6 agent  
**Level:** T0 / T1  
**Result:** PASS

#### Scope

Authoritative account-identity YAML after approving D13, D14, D16, D24, D29, D30, D34, D34-A through D34-D, and D37; adding repository-boundary and AWS placeholder contracts; and releasing the P01 architecture hold.

#### Files Under Validation

- docs/ACCOUNT_IDENTITY.yaml
- docs/aws.example.yaml
- scripts/account-identity-yaml-smoke.ts

#### Objective

Confirm the YAML parses, newly approved decisions are APPROVED, D35 remains APPROVED_DIRECTION, P01 is unblocked, remaining sharing specification is empty, authority hosting is ECS Fargate, repository-boundary names match, the AWS example uses placeholders only, P29 still requires P04, and P08/P10 remain operator-blocked.

#### Preconditions

Project dependencies installed, including `yaml` and `tsx`.

#### Procedure

1. Run `npx tsx scripts/account-identity-yaml-smoke.ts`.
2. Run `npm run test:node`.

#### Expected Result

YAML smoke passes. Combined node smoke still passes extraction, attachment, and schema v2 checks. P01 implementation has not started.

#### Actual Result

Both commands passed. YAML smoke reported 144 assertions.

#### Evidence

- `npx tsx scripts/account-identity-yaml-smoke.ts` → `PASS account-identity-yaml-smoke` / `assertions=144`
- `npm run test:node` → `PASS node-smoke` / `assertions=16`; attachment smoke PASS; `PASS account-identity-yaml-smoke` / `assertions=144`

#### Failures / Observations

No device tests were run. P01, P04, P05, P14, P19, P20, and P24 remain unimplemented.

#### Related DEVNOTES

DEV-2026-09-28-001

#### Related Tests

TEST-2026-09-22-001

#### Disposition

Architecture hold released in the contract. Do not start later phases in this pass.

---

### TEST-2026-10-28-001 — Landscape dock bezel sync

**Date:** 2026-10-28  
**Time:** 15:21 America/New_York  
**Tester:** Cursor Grok 4.7 agent  
**Level:** T2  
**Result:** PASS

#### Scope

Live Figma landscape dock pushed into schema 3 YAML, generated spec, resolver, and rendered HUD.

#### Files Under Validation

`src/ui/yaml_layout/mobile/landscape.yaml`; `src/ui/yaml_layout/mobile/components/landscape/action-dock.yaml`; `src/ui/generated/uiSpec.ts`; `src/ui/ts_layout/HudDock.tsx`; `src/ui/ts_layout/HudShell.tsx`; `src/ui/ts_layout/hudBehavior.ts`; `scripts/fixtures/task007-figma.json`; `scripts/generate-ui.mjs`; `scripts/hud-smoke.ts`; `scripts/hud-browser-test.mjs`

#### Objective

Confirm the rebuilt landscape dock is the 350×96 bezel at the reference window, the handle overlaps it by 2.5 while expanded, collapse still parks the handle, and viewport content remains clickable after collapse.

#### Preconditions

Figma file `dFwk8LAWauplWqrOKaQplU` read live. Portrait frame geometry was unchanged. Playwright/Chromium available.

#### Procedure

1. `node scripts/generate-ui.mjs`
2. `npx tsc --noEmit`
3. `npx tsx scripts/hud-smoke.ts`
4. `node scripts/hud-browser-test.mjs`

#### Expected Result

Generator and authority gates pass. Resolver places the landscape dock at (163, 276, 350, 96) and the collapsed handle at y=340. Browser harness passes expand, collapse, and later entity clicks.

#### Actual Result

All four commands passed. An intermediate build that started the dock expanded failed the browser harness because the dock intercepted clicks on search and graph rows. That default was reverted before the passing run.

#### Evidence

- `node scripts/generate-ui.mjs` → Gate A PASS; UI specification PASS
- `npx tsc --noEmit` → exit 0
- `npx tsx scripts/hud-smoke.ts` → YAML schema 3 contract PASS; Gate A PASS; Gate B PASS; HUD resolver PASS; HUD contracts PASS
- `node scripts/hud-browser-test.mjs` → HUD browser T2 PASS

#### Failures / Observations

Open-by-default covered landscape viewport rows. Resting state stays collapsed. Existing MODULE_TYPELESS_PACKAGE_JSON warning on generated `uiSpec.ts` remains. No physical device was attached.

#### Related DEVNOTES

DEV-2026-10-28-001

#### Related Tests

TEST-2026-09-18-002; TEST-2026-09-18-003

#### Disposition

YAML, generated spec, and browser HUD accept the new landscape bezel. TASK-007 stays OPEN until physical Motorola verification.

---

### TEST-2026-10-28-002 — Dock captions hidden

**Date:** 2026-10-28  
**Time:** 15:45 America/New_York  
**Tester:** Cursor Grok 4.7 agent  
**Level:** T2  
**Result:** PASS

#### Scope

Visible dock captions removed after confirming both Figma docks have no text layers.

#### Files Under Validation

`src/ui/yaml_layout/mobile/components/shared/action-dock.yaml`; `src/ui/generated/uiSpec.ts`; `src/ui/ts_layout/HudDock.tsx`; `scripts/hud-smoke.ts`; `scripts/hud-browser-test.mjs`

#### Objective

Confirm the spec marks dock labels not visible, the HUD does not paint them, and ADD, CAMERA, LOCATION, and EXPORT remain the accessible button names.

#### Preconditions

Live Figma read of portrait dock `2:26` and landscape dock `96:82` returned no text nodes.

#### Procedure

1. `node scripts/generate-ui.mjs`
2. `npx tsc --noEmit`
3. `npx tsx scripts/hud-smoke.ts`
4. `node scripts/hud-browser-test.mjs`

#### Expected Result

Typecheck and HUD smoke pass with `label.visible` false. Browser harness still operates the dock buttons by accessible name.

#### Actual Result

All four commands passed. The first typecheck failed on an unrelated comparison of dock visibility with `"expanded"`; that comparison was removed and typecheck then passed.

#### Evidence

- `npx tsc --noEmit` → exit 0
- `npx tsx scripts/hud-smoke.ts` → HUD contracts PASS, including `label.visible` false
- `node scripts/hud-browser-test.mjs` → HUD browser T2 PASS

#### Failures / Observations

No physical device was attached. Caption removal is static and browser-verified only.

#### Related DEVNOTES

DEV-2026-10-28-002

#### Related Tests

TEST-2026-10-28-001

#### Disposition

Visible dock captions match Figma. Accessible names are unchanged.

---

### TEST-2026-10-28-003 — Dock icon centering

**Date:** 2026-10-28  
**Time:** 15:50 America/New_York  
**Tester:** Cursor Grok 4.7 agent  
**Level:** T1  
**Result:** PASS

#### Scope

Shared dock plate and icon offsets after the Figma plates moved to the vertical center of the bezel.

#### Files Under Validation

`src/ui/yaml_layout/mobile/components/shared/action-dock.yaml`; `src/ui/generated/uiSpec.ts`; `scripts/hud-smoke.ts`

#### Objective

Confirm the generated dock places the plate at y=17 and the icon at x=20, y=32.

#### Preconditions

Live Figma measurement of portrait `2:26` and landscape `96:82`: plate y=17, icon local (20, 15), both 32×32 inside a 72×62 plate.

#### Procedure

1. `node scripts/generate-ui.mjs`
2. `npx tsx scripts/hud-smoke.ts`

#### Expected Result

Generator PASS. HUD contracts PASS with plate y=17 and icon x=20, y=32.

#### Actual Result

Both commands passed.

#### Evidence

`npx tsx scripts/hud-smoke.ts` → HUD contracts PASS.

#### Failures / Observations

No browser pixel measurement of the icon images was added. The rendered bounds come directly from these spec fields.

#### Related DEVNOTES

DEV-2026-10-28-003

#### Related Tests

TEST-2026-10-28-002

#### Disposition

Dock icons match the centered Figma plates in the generated spec.

---


