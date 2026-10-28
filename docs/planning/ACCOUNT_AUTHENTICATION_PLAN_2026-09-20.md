# Captain's Log — Revised Account and Google Authentication Implementation Plan

Date: 2026-09-20  
Status: Superseded as the implementation contract by `docs/ACCOUNT_IDENTITY.yaml`. Architecture review hold released 2026-09-28. D13, D14, D16, D24, D29, D30, D34, D34-A through D34-D, and D37 are APPROVED. D35 remains APPROVED_DIRECTION (SecureStore key names and refresh lifetime). P01 is unblocked. Operator blockers remain D25, WebAuthn RP ID, and live AWS in `captains-log-infra`.  
Scope: Canonical accounts, Google authentication, account linking, MFA, offline access, synchronization, sharing, and the boundary to Google Drive backup

## Review context

This plan was Codex analysis. Independent Cursor review on 2026-09-20 verified repository evidence, accepted user decisions D1–D12, recorded D13–D30, and published the authoritative YAML. Where this Markdown conflicts with `docs/ACCOUNT_IDENTITY.yaml` or with the repository, those sources win.

The major revision remains: a Captain's Log account UUID is canonical. Google and other providers supply linked authentication identities; their subjects are not Captain's Log account IDs. Risk-adaptive MFA and passkeys supersede the earlier mechanical two-factor recommendation.

Repository observations were rechecked on September 20, 2026. Native package versions and SQLCipher availability are documentation-supported, not evidence of a successful build or device test.

### Requirements, recommendations, and decisions

- **Authoritative contract:** `docs/ACCOUNT_IDENTITY.yaml`.
- **Required by the approved model:** canonical immutable account UUID; distinct local profile and archive UUIDs; multiple verified identities; no email-based account merging; separate provider sessions and cloud authorization; local operation independent of external authentication; risk-adaptive MFA; short-lived CL grants.
- **Approved authority:** custom lightweight Captain's Log control plane. Runtime is TypeScript HTTPS in Docker on Amazon ECS Fargate with Amazon RDS PostgreSQL (D13). Live AWS identifiers belong in the private `captains-log-infra` repository.
- **Approved first delivery methods:** passkeys, Google, verified email, TOTP. Apple and phone remain later phases.
- **Blocked without operator action:** Universal Google Sign-In license/registry (D25); production Google Cloud projects (D9).

The intended release order remains Google sign-in, Google backup, security fuzz/red-team testing, beta, approximately four weeks of beta, SDK 58 migration, final regression, and production. Identity architecture work precedes those release gates and is executed as YAML phases P00–P33.


## 1. Current-state findings

| Area | Observed implementation |
| --- | --- |
| Runtime | Expo 57.0.15, React Native 0.86.2, React 19.2.3; TypeScript ~6.0.3 declared. |
| Router | Expo Router 57.0.15, `expo-router/entry`; routes under `src/app`. Root, log, capture, search, graph, settings, entry detail and entity detail routes exist. |
| Composition | `src/app/_layout.tsx` wraps the stack in services, chrome/selection state, `AuthGate`, HUD commands and `AppShell`. |
| Initialization | `AppServicesProvider` opens SQLite, applies migrations, composes services and hides the splash. `AuthGate` then restores a session. Launch/background events may start backup. |
| State management | React contexts and component state; manually composed services. No Redux/Zustand dependency and no observable normalized authentication state. |
| Local persistence | SQLite `captains-log.db`, schema version 2, plus managed attachment files. Entry, revision, entity, relationship, attachment, search, settings and processing-job services exist. |
| Domain IDs | Generated UUIDs. Existing entries/graph records do not use Google account identity as their primary key. |
| Restore | Installing an archive recreates all services. Account/authentication lifetime must be separated from database lifetime. |
| Google prototype | `googleAuthProvider.ts` uses AuthSession implicit access tokens and userinfo email. It does not establish identity from a verified Google `sub`. |
| Session prototype | `authService.ts` uses `captains-log.session`; restoration prefers a local archive account over Google. Sign-out clears only the session flag. |
| Local credentials | Local identifier/password, PBKDF2, and legacy credential migration. This is neither verified email authentication nor archive encryption. |
| Token lifecycle | No coordinated expiry/refresh/revocation. An access token is stored under the misleading `captains-log.google-id-token` key. |
| Installed auth tooling | AuthSession 57.0.8, SecureStore 57.0.1, Crypto 57.0.1, WebBrowser 57.0.2. SecureStore config plugin is enabled. No native Google sign-in package or account backend found. |
| Storage concern | `secureKv.ts` uses SecureStore on native and ordinary `localStorage` on web. OAuth/session credentials must not use that browser fallback. |
| Config | Static `app.json`; no dynamic app config. Android package and iOS bundle identifier are `com.captainslog.app`. Scheme is `captainslog`. |
| Google configuration | Empty public client-ID placeholders in `expo.extra`, with `EXPO_PUBLIC_GOOGLE_{WEB,IOS,ANDROID}_CLIENT_ID` fallbacks. |
| Native development | Ignored generated native folders; local Android project exists. EAS development/preview/production profiles exist. Development requests a development client, but `expo-dev-client` is not installed. |
| Linking | Generated Android manifest confirms `captainslog`; share-intent filters also exist. No production OAuth callback implementation was found. |
| UI | `AuthGate` controls entry into the whole archive. Settings already has account and Drive sections. |
| Backup | Separate implicit Drive authorization using `drive.file`. Entire SQLite database and managed attachments are snapshotted to visible Drive folders. Token presence means authorized; cached root folder is not account-bound. |
| Error persistence | Backup errors are written verbatim to SQLite settings and can enter later backups. New authentication exceptions must never leak through this path. |
| Tests | Node smoke tests for client-ID selection, PBKDF2, schema and backup policy; attachment tests; HUD and browser harnesses. No complete authentication lifecycle suite. |

Key source files are `src/services/authService.ts`, `src/adapters/auth/googleAuthProvider.ts`, `src/adapters/auth/localArchiveCredentialProvider.ts`, `src/utilities/secureKv.ts`, `src/services/createAppServices.ts`, `src/services/AppServicesProvider.tsx`, `src/ui/screens/AuthGate.tsx`, `src/ui/screens/SettingsScreen.tsx`, and `src/adapters/googleDrive/googleDriveBackupProvider.ts`.

The existing `docs/captains-log.yaml` explicitly sets `account_required: true`. The new model says external authentication is unnecessary for local access, but does not explicitly define anonymous first launch. This conflict must be resolved deliberately; no migration may silently bypass an existing local lock.

## 2. Recommended authentication architecture

### Separate account, identity, session, authorization and archive

| Concept | Authority and purpose |
| --- | --- |
| Captain's Log account | Immutable Captain's Log-generated UUID, lifecycle status, creation method and optional user profile. |
| Authentication identity | A verified provider identity linked to that account. Google key is canonical issuer plus subject, not email. |
| Account session | Evidence that account authentication, including the required MFA step, completed. Issued and verified by the account authority. |
| Provider session | Google SDK/provider credential lifecycle. Separate from the Captain's Log session. |
| Capability authorization | Permission to use a service, initially Google Drive. Bound to the exact provider identity and account connection. |
| Local archive | Canonical SQLite content and attachments, with independent local access controls. Account changes do not rekey or transfer records. |

Recommended dependency direction:

```text
Account/Settings UI
    -> AccountService / AuthService / ArchiveAccessService
        -> Account authority API / Google native adapter / secure storage

BackupService
    -> BackupProvider
        -> account-bound AuthorizationService
            -> Google native authorization and Google APIs

Local log/graph services
    -> existing repositories and attachments
```

The account authority stores only the account/security data it needs: accounts, linked identities, MFA verifiers, session records and security events. It does not become the canonical store for logs or attachments. Hosting a centralized account mapping is compatible with offline-first local content.

### Why a shared account authority is needed

Without shared resolution, the same Google subject signing in on two clean installations produces two unrelated account UUIDs. A local uniqueness constraint cannot enforce the supplied rule that one provider identity belongs to only one account across devices.

The recommended authority therefore performs atomic lookup-or-create after verified authentication, enforces identity uniqueness, completes MFA, and issues account sessions. A deliberately device-local model is possible, but would weaken cross-device semantics and require a separately reviewed restore/reconciliation design. Do not claim global uniqueness from device-local records.

### Narrow service boundaries

| Service | Responsibilities |
| --- | --- |
| `AccountService` | Resolve/create account, return normalized account/profile, list linked identities, request linking/unlinking, and refresh account metadata. |
| `AuthService` | `initializeAuth`, `signIn`, `completeMfa`, `signOut`, `getAuthState`, `getCurrentIdentity`, `subscribeToAuthState`; coordinate account and provider sessions. |
| `ArchiveAccessService` | Create/unlock/lock local archive access independently of external identity. |
| `AuthorizationService` | Explicitly authorize capabilities, acquire usable tokens internally, revoke/disconnect, and invalidate account-bound work. |

Do not expose Google SDK objects or raw token getters through the UI service context. Inject cloud credential capabilities directly into adapters, not screens. Account/auth services have application lifetime and survive SQLite restore/recomposition. Use explicit adapter injection, consistent with the repository; no plugin registry is needed.

### Linking and account resolution

Authentication first resolves an existing account. Create a new account only when the verified identity has no existing mapping. Concurrent first sign-ins must converge on one account through transactional uniqueness.

Linking requires recent authentication of the current account, required MFA, fresh proof of the new identity, a short-lived operation binding both proofs, and explicit user confirmation. A remembered offline session alone is insufficient. If the identity is already linked to another account, reject ordinary linking. Account merging is a distinct future operation requiring proof of both accounts and an explicit data/conflict policy.

Unlinking must protect the last usable sign-in/recovery path. Email matches may inform non-sensitive UI, but cannot establish linkage or expose whether another account exists.

## 3. Library/dependency recommendation and rationale

### Google native integration

Recommend `@react-native-google-signin/google-signin`, specifically the **Universal Sign-In edition**, behind the Google adapter. Its published compatibility includes Expo 57 and the repository's React Native version. It uses Android Credential Manager and Google's iOS SDK. It requires licensing/private registry access; no license purchase is authorized by this document. [R2–R4]

Use its Expo config plugin and a development build. Add the SDK-compatible `expo-dev-client`; preserve Expo CLI, EAS, config plugins and generated native projects. Google authentication will not work in Expo Go. Do not hand-maintain generated Android/iOS code as the default integration approach.

| Alternative | Assessment |
| --- | --- |
| Existing AuthSession browser flow | Generic code/PKCE is useful for suitable OIDC providers, but Google Android does not support the prototype's custom-scheme redirect path. Switching only `responseType` is not a production solution. [R5] |
| Public/free edition of the same Google package | Uses the legacy Android sign-in SDK; do not accidentally install it when the plan expects Universal APIs. [R2] |
| `react-native-nitro-google-signin` | Open-source alternative listed by Expo; evaluate if Universal licensing is unsuitable. Needs a focused SDK 57, native dependency, storage and nonce review. [R3] |
| `react-native-app-auth` | Standards-oriented but does not remove Google Android client/redirect constraints. |
| Managed identity service | Now a reasonable account/MFA authority alternative. Evaluate standards support, account UUID ownership, linking, recovery, portability and cost. Do not adopt one implicitly. |
| Custom native bridge | Avoid unless existing integrations demonstrably cannot meet requirements. |

### Account authority and verification

A TypeScript account service is a reasonable default because the repository uses TypeScript, but no backend runtime or hosting system exists here. Choose its location and deployment in decision D1 before creating it. If Node.js is selected, use Google's maintained `google-auth-library` for Google ID-token verification, with explicit transaction nonce/audience/issuer checks as required. Select a maintained MFA library or managed MFA component during that decision; do not implement TOTP cryptography from scratch.

**Withdraw the earlier proposal to add `jose` plus a native crypto polyfill solely for authoritative on-device ID-token verification.** With a trusted account authority, server-side verification is the security boundary. The mobile adapter may parse bounded claims for consistency, but parsed claims cannot authorize account creation, linking or remote access. The authority must independently verify every proof it accepts. [R6]

Retain existing SecureStore and Crypto. Pin exact native/provider versions after a compatibility spike. Generic Expo version support is not proof of correct nonce, callback, persistence, refresh or logout behavior in the chosen release.

## 4. Google Cloud configuration required

| Item | Required setup |
| --- | --- |
| Project | Select the Google Cloud project; recommend separate development/production projects or strictly separated credentials and test users. |
| Consent | Branding, support/developer contacts, audience, required domain/privacy information, testing users and production publication review. |
| Android OAuth | Register `com.captainslog.app` with applicable signing SHA-1 fingerprints. |
| Build identities | Cover local debug, EAS development/preview, production and Google Play App Signing certificates. Installed Play builds use the app-signing certificate, not just the upload certificate. |
| SHA-256 | Record for future App Links/integrity configuration; it does not replace Android OAuth's SHA-1. |
| iOS OAuth | Register `com.captainslog.app`; configure the reversed client-ID URL scheme through the plugin. |
| Web OAuth client | Used as the native ID-token audience/account-authority client configuration. This is not a web-only mobile flow. |
| Redirects | Android identity returns through native Credential Manager. iOS uses the native SDK callback scheme. No arbitrary web-client redirect to `captainslog://`. |
| APIs/scopes | Identity first; enable Drive and request `drive.file` only in the backup milestone. Firebase is not required. |

Replace the existing platform-only client selector with explicit configuration roles: native registrations, allowed token audiences, environment and callback configuration. An intentional web client ID audience is not a fallback between incompatible client types.

Public client IDs, package/bundle identifiers, schemes, fingerprints and configuration templates may be committed. Client secrets, tokens, server authorization codes, PKCE verifiers, signing keys/passwords, recovery codes, MFA secrets and private registry credentials must not be committed. `EXPO_PUBLIC_*`, `expo.extra` and app bundles are public configuration surfaces.

If a later server-side Google code exchange is selected, keep its client secret exclusively in the server secret manager. The initial native ID-token verification design does not require placing a Google secret in the mobile app.

## 5. Proposed files/modules to add

Paths below are repository-relative proposals, not existing implementations.

| Path | Purpose |
| --- | --- |
| `src/models/account.ts` | Canonical account, linked identity, profile, lifecycle and verification metadata. |
| `src/models/auth.ts` | Token-free authentication, challenge, assurance and error types. |
| `src/models/authorization.ts` | Account-bound capability/connection contracts. |
| `src/services/accountService.ts` | Account resolution, profile and identity linking boundary. |
| `src/services/archiveAccessService.ts` | Preserve local credential/lock behavior independently. |
| `src/services/authorizationService.ts` | Capability authorization, token acquisition and invalidation. |
| `src/adapters/account/accountApi.ts` | HTTPS account-authority transport; credential handling remains internal. |
| `src/adapters/auth/googleNativeClient.ts` | Sole Google SDK wrapper. |
| `src/adapters/auth/googleAuthProvider.web.ts` | Explicit unsupported/mock-compatible browser behavior; no OAuth localStorage fallback. |
| `src/adapters/auth/authStorage.ts` | Versioned secure metadata, account session credentials, cleanup and migration. |
| `src/adapters/auth/installIdentity.ts` | Nonsecret installation marker excluded from archive and OS backups. |
| `src/utilities/authErrors.ts` | Allowlisted error codes and safe messages. |
| `src/hooks/useAuthState.ts` | Subscribe to normalized service state. |
| `src/ui/screens/AccountSecurityScreen.tsx` | MFA enrollment/challenge/recovery and linked identities, without provider objects. |
| `src/app/account-security.tsx` | Thin route for security UI; no credentials in route parameters. |
| `app.config.ts`, `.env.example` | Derived public build configuration and documented variables. |
| `scripts/auth-smoke.ts`, `scripts/account-smoke.ts` | Service, state, migration, linking and failure tests. |
| `docs/ACCOUNT_AUTHENTICATION.md` | Approved operational configuration and recovery runbook, added during implementation. |

A narrow config plugin may be needed for installation-marker backup exclusion or callback configuration not covered by supported plugins. Justify it in the compatibility step; avoid handwritten generated-native patches.

Account-authority modules are a separate workstream whose repository location is unresolved: Google proof verification, account/identity repository, transactional linking, MFA enrollment/verification, recovery, session issuance/rotation/revocation, rate limits and sanitized audit events. Do not assume Expo Router's static web output is an existing production backend.

Provider-discovery modules belong to the email signup milestone, not the Google adapter.

## 6. Existing files/modules to modify

| Files | Change |
| --- | --- |
| `src/services/authService.ts` | Replace session-flag composition with account authentication/MFA lifecycle and subscriptions. |
| `src/adapters/auth/googleAuthProvider.ts` | Replace implicit flow; remove public raw-token getter. |
| `src/adapters/auth/localArchiveCredentialProvider.ts` | Preserve local access and migration; never promote records into verified email identities. |
| `src/models/contracts.ts`, `src/models/types.ts` | Split local credentials, accounts, provider identities and capability authorization. |
| `src/services/createAppServices.ts`, `src/services/AppServicesProvider.tsx` | Inject stable account/auth services outside database-dependent composition. |
| `src/ui/screens/AuthGate.tsx`, `src/app/_layout.tsx` | Separate local access from external sign-in and MFA; preserve configured local locks. |
| `src/ui/screens/SettingsScreen.tsx` | Account controls, MFA status, linked identities and separately activated backup. |
| `src/ui/state/ChromeContext.tsx` | Remove external account-session responsibility; local lock/chrome concerns remain explicit. |
| `src/utilities/secureKv.ts` | Prevent production credentials from reaching browser ordinary storage; migrate deliberately. |
| `src/utilities/googleClientId.ts` | Replace obsolete platform-fallback assumptions with explicit configuration roles. |
| `src/services/backupService.ts`, `src/adapters/googleDrive/googleDriveBackupProvider.ts` | Inject account-bound authorization, sanitize failures and retire implicit consent. |
| `src/utilities/diagnostics.ts` | Accept safe authentication diagnostics only; never stringify raw SDK/API failures. |
| `package.json`, `package-lock.json`, `app.json`, `eas.json` | Dependencies, plugins, public environment wiring and validation scripts. |
| `scripts/node-smoke.ts` | Replace obsolete client-ID selection assertions; preserve unrelated coverage. |
| `README.md`, `docs/captains-log.yaml`, `docs/ARCHITECTURE.md`, `docs/planning/ROADMAP.md` | Reconcile approved behavior and expanded scope during implementation. |
| `docs/DEVNOTES.md`, `docs/TEST_LOG.md` | Append approved decisions and actual verification results under existing standards. |

No graph-engine changes or identity-based domain rekeying are planned. UI YAML contains presentation only, never sessions, credentials or authorization logic. Database changes depend on the reviewed persistence/binding decision; do not retain the earlier unconditional claim that no migration will be needed.

## 7. Authentication state/data model

### Schema namespaces

Keep schema namespaces independent. Independent review on 2026-09-20 recorded:

| Namespace | Version | Evidence |
| --- | --- | --- |
| SQLite archive `PRAGMA user_version` / `DATABASE_VERSION` | 2 | `src/adapters/sqlite/schema.ts`, `database.ts` migrateV1/migrateV2 only. There is no SQLite version 3. |
| Account identity contract | 1 | `docs/ACCOUNT_IDENTITY.yaml` |
| Graph entity/relationship contract | 1 | Implicit current `ENTITY_TYPES` / `RELATIONSHIP_TYPES`; no prior version field existed. |
| UI manifest `src/ui/ui.yaml` | 1 | Distinct from layout generator. |
| HUD layout generator | 3 | `src/ui/yaml_layout/mobile/mobile.yaml` `schema_version: 3`. This is the “schema 3” found in the project. |
| Drive backup snapshot manifest | 1 | `SnapshotManifest.schemaVersion` |
| Sync protocol | 1 | Specified, not implemented |
| Sharing protocol | 1 | Specified, not implemented |

A future SQLite migration increments the database version; it does not automatically increment account, graph, UI, sync, or sharing versions.

### Canonical account and linked identities

Account fields: immutable UUID, creation timestamp, immutable `created_with`, lifecycle status, and optional display name/preferred email/preferred phone. `created_with` is historical metadata, not a mandatory future recovery method.

Identity fields: immutable identity UUID, account UUID, provider, canonical provider key, optional provider email/phone, verification metadata, linked timestamp and last successful authentication timestamp. Enforce unique canonical keys at the shared authority. Google uses `(issuer, sub)`; canonicalize only explicitly accepted issuer spellings after verification.

Persist Google `sub`, issuer, provider and authentication timestamp. Email is optional display metadata. Do not persist avatar URLs initially; names are optional user profile data, not authentication evidence. Do not overwrite preferred profile values automatically when another provider is linked.

Email identities require actual ownership verification and an explicit login mechanism. Preserve the local part; trim outer whitespace and lowercase the domain; no dot/plus/alias inference. Phone identities require verification and an explicit policy for number replacement/recycling. Apple identity needs client/developer-team context and an app-transfer migration policy when implemented. [R10]

The supplied examples flatten `issuer`, `subject` and `email`, whereas their schema nests these under `provider_identity`. Normalize the examples to the schema before producing validation fixtures.

### Separate lifecycle dimensions

| Dimension | Proposed values/meaning |
| --- | --- |
| Account lifecycle | `active`, `locked`, `disabled`; enforced by account authority for remote access. Define local-access effect separately. |
| Identity proof | Unverified/pending/verified plus verified timestamp. Historical proof is not a live provider session. |
| Identity linkage | Linked/unlinked/blocked. Provider consent revocation does not automatically erase historical verification or unlink identity. |
| Account authentication | `uninitialized`, `signed_out`, `signed_in`. |
| Operation | `idle`, `authenticating`, `enrolling_mfa`, `verifying_mfa`, `signing_out`, `linking_identity`, `unlinking_identity`, `token_refreshing`, `revoking`. |
| Connectivity | Unknown/online/offline; a hint rather than proof of service availability. |
| Remote session | Unknown/usable/reauthentication-required. |
| MFA requirement | None/enrollment-required/challenge-required/recovery-required, with safe UI metadata only. |
| Error | Allowlisted code, safe message and recovery action attached to a stable state. |

`offline_authenticated` is a presentation derived from remembered signed-in state plus offline connectivity. It is not a claim that an expired server credential remains valid. `auth_error` is an error attached to the prior stable state rather than a terminal condition that locks local logs.

Do not publish a newly authenticated Captain's Log session before primary proof and required MFA complete. Short-lived enrollment/challenge grants are restricted credentials, never general account sessions. Restored metadata can display the account but cannot authorize linking or remote requests.

### MFA interpretation

The supplied `factors_required: 2` is mandatory unless changed explicitly. Recommend Google plus TOTP for the first delivery and single-use recovery codes as a defined fallback/recovery path. Implement other allowed factors in later scoped milestones.

Decisions must specify enrollment, fresh authentication events, remembered-device/session lifetime, factor changes and recovery. A Google token does not generally prove completion of Captain's Log's chosen MFA policy. Two login methods are not automatically two independent factor categories. Email must mean a concrete authentication mechanism; phone must specify SMS/voice or another mechanism. [R7–R8]

Phone-first signup conflicts with the supplied primary-factor list, which omits phone. Resolve this before implementing phone signup. Until then, do not offer phone as an available initial method.

## 8. Detailed OAuth and account execution flow

### Android identity and account authentication

1. User explicitly selects Google sign-in.
2. Captain's Log obtains an expiring transaction and unpredictable nonce from the account authority. Transaction credential stays inside the auth adapter and secure storage if persistence is necessary.
3. Native adapter checks configuration/Play Services and invokes Credential Manager with the correct audience and nonce through the chosen library.
4. Android/Google presents account selection/sign-in. Google issues an OIDC ID token through the native result.
5. Adapter sends that ID token over TLS to the account authority, bound to the initiating transaction. Never put it in a URL or navigation state.
6. Authority verifies Google signature, issuer, audience, expiry, relevant authorized-party claim, subject and expected nonce. It rejects expired/reused/mismatched transactions.
7. Authority resolves the existing canonical account or begins atomic new-account enrollment. An identity verified at the provider is not yet a completed Captain's Log session.
8. Complete required MFA enrollment/challenge. Enrollment is finalized atomically so abandoned attempts cannot permanently reserve someone else's identity.
9. Authority issues the Captain's Log session and normalized account/identity metadata.
10. Mobile secure persistence completes before publishing durable signed-in state. Clear transient token/proof references.

Android identity uses a native credential result; it has no Captain's Log browser redirect, authorization code or app-owned PKCE exchange. Do not mislabel it as the prototype's implicit bearer-token-in-URL flow.

### iOS identity and account authentication

The account transaction, verification and MFA steps are the same. The native Google SDK uses the supported system authentication session and its registered callback scheme. It owns callback handling and any underlying code exchange. Validate the pinned native SDK's PKCE, state and callback behavior during the spike; the JavaScript API alone is insufficient evidence.

For every app-owned authorization-code flow, use a system browser, fresh state and nonce, exact redirect matching, a single-use authorization code and S256 PKCE. The complete applicable sequence is application request -> browser/provider -> redirect -> state check -> code -> PKCE exchange -> validation -> secure persistence -> normalized account state. Never use embedded WebViews or an embedded client secret. [R5]

### Verification ownership

Google authenticates the provider user; Android/iOS and library code deliver the native result; the account authority verifies proofs and enforces account/MFA policy; Captain's Log mobile manages local access, secure persistence and normalized presentation.

Use a maintained verifier; restrict acceptable algorithms, issuer and audiences. Fetch signing keys from trusted Google configuration, not JWT-supplied arbitrary URLs. Bound parsing and key-fetch work, cache keys appropriately and fail safely on unknown keys/outages. Check nonce separately if the verifier does not do so. Never count a cached old ID token as fresh proof for a new nonce transaction. [R6]

Google access tokens are opaque credentials validated by Google APIs. Captain's Log account tokens are validated by its own authority. Neither token type can substitute for the other.

## 9. Secure token-storage strategy

### Mobile

- Provider-managed sessions use audited native SDK/OS credential facilities. Inspect native caches, not only TypeScript storage calls.
- Captain's Log session refresh credentials, restricted enrollment grants when persistence is necessary, and any application-managed provider credentials use SecureStore only.
- Keep short-lived access tokens inside adapters; do not duplicate provider refresh credentials unnecessarily.
- Keep minimal account/identity cache separate from credentials, initially in small versioned SecureStore records to avoid entering whole-database backups.
- Do not retain raw Google ID tokens after exchange unless an active operation needs them.
- No production web credential persistence through `secureKv`'s localStorage fallback.
- Use explicit keychain service/options consistently; prefer `WHEN_UNLOCKED_THIS_DEVICE_ONLY` for application-managed records initially. Background access is a separate reviewed requirement.
- Handle invalid JSON, unknown versions, size limits and write/delete errors. Temporarily inaccessible storage is not corruption.

SecureStore uses Android Keystore-backed protection and iOS Keychain. Android uninstall removes credentials; iOS Keychain entries can survive reinstall. Exclude SecureStore data from Android cloud/device-transfer backup and verify merged native configuration. [R9]

Use a nonsecret installation marker outside the archive and excluded from OS backups. A missing marker invalidates stale mobile account metadata/provider sessions before silent restoration. Archive restore must not change this marker.

### Account authority

Server session credentials use rotation, expiry, device/session revocation and replay/reuse handling. Store suitable verifier hashes for opaque refresh/recovery credentials; protect TOTP enrollment secrets using server-side key management because verification needs the secret. Never store MFA secrets in the mobile archive. Make recovery-code consumption atomic and single-use.

Recovery-code display is a narrow, explicit security UI operation: do not place codes in general state snapshots, logs, route parameters or backups. Avoid retaining enrollment QR/secret material after completion. Treat enrollment/challenge transport responses as sensitive.

If account/profile metadata later moves to SQLite, review migration and backup behavior first. Restored metadata is a cache, never authentication proof. Archive-to-account association and activation metadata must not silently reauthorize cloud operations.

## 10. Offline behavior and first-launch policy

Recommend an accountless local archive on a clean installation, with optional local locking. Account creation occurs when a verified provider is connected. This recommendation needs reconciliation with the existing `account_required: true` specification; it is not yet an adopted product change.

An accountless archive is distinct from a remotely provisioned account. This avoids inventing a Google/email creation method for an offline-created archive or generating duplicate remote accounts. Connecting an archive to an account requires explicit intent; switching accounts never silently transfers the existing archive.

| Feature | Account/network requirement |
| --- | --- |
| Create/edit/browse logs, local search/graph/attachments | No external identity or network requirement; respect any configured local lock. |
| Local archive unlock | Local credential/device policy; independent of Google and server MFA availability. |
| New remote account/sign-in/MFA/linking | Online account authority and necessary provider access. |
| Cached profile display | Previously stored metadata; indicate disconnected/reauthentication state appropriately. |
| Google Drive backup/list/restore | Explicit active backup connection, exact authorized provider identity and network. |

Do not periodically demand online validation to use local logs. Expired account/provider tokens block applicable cloud operations, not local records. Server account disablement cannot be discovered instantly offline; enforce remote restrictions when known and explicitly define local-lock consequences rather than deleting data.

Preserve existing local archive credentials and locks during migration. Never allow an unrelated Google login or a new anonymous button to bypass a configured archive lock.

## 11. Error, recovery and factor lifecycle

| Event | Required behavior |
| --- | --- |
| Cancellation | Return to previous stable state; no automatic interactive retry. |
| Missing config/native module/Play Services | Safe actionable status in account UI; local app remains available. |
| Network failure before/during primary proof | No partial completed account session; expire/restart transactions safely. |
| Invalid result/callback/token | Reject before durable account/linkage mutation. |
| MFA canceled or failed | No full account session; retain or expire restricted challenge safely; rate-limit attempts server-side. |
| Abandoned first-account enrollment | Expire pending transaction; avoid orphaned identity reservations and conflicting account creation. |
| Expired Google access token | Acquire internally through provider adapter; serialize acquisition for the account/capability. |
| Expired Captain's Log access token | Rotate/refresh through the account authority; never refresh Google credentials as a substitute. |
| Transient refresh failure | Preserve local account display; suspend applicable remote work and use bounded backoff. |
| Revoked grant/account session | Require fresh authentication for remote operations; preserve local archive. |
| Storage failure | Fail closed for remote capabilities, with retryable safe cleanup; never destroy local logs. |
| Google/account service unavailable | Timeouts and bounded retries; local operation continues. |
| Wrong device clock | Safe authentication failure/recovery guidance; do not extend validity unchecked. |

On 401, allow one controlled credential reacquisition where appropriate. Do not replay non-idempotent backup writes blindly; use operation IDs/reconciliation. Consent-required results in background work become a Settings action, not a surprise prompt.

### Sign-out versus revocation

Sign-out immediately blocks account/cloud use locally, invalidates in-flight generations, clears mobile credentials and asks the SDK to sign out. It preserves local records and local-lock configuration. Online sign-out also attempts to revoke the Captain's Log device session.

Offline sign-out must still complete locally. It cannot guarantee remote server-session revocation; server expiry/rotation limits that exposure. Do not retain credentials solely to simulate successful remote revocation later. A durable local logout/cleanup marker prevents restart from silently restoring old state. Report cleanup failures accurately.

Disconnecting Google is a separate operation that attempts provider revocation and then cleanup. Google revocation can affect project-wide grants, including Drive. Offline revocation must report that Google disconnection remains incomplete; provide a reconnect/account-settings recovery route. Unlinking an identity is another distinct account-authority mutation. [R5]

### Account and factor changes

Switching accounts stops cloud work, invalidates operation generations, clears old provider tokens and folder caches, and requires explicit backup activation for the new account. Do not upload the existing archive merely because another account signed in.

Changing/removing factors requires recent strong authentication or a defined recovery flow. Generate recovery codes securely, show them deliberately, store verifier records server-side, rate-limit attempts and consume codes atomically. Define whether recovery creates a restricted session requiring factor reenrollment. A restored archive must never roll back consumed recovery codes or factor changes.

Recovery guidance should prefer currently linked usable methods. `created_with` is only a historical hint, and is disclosed only where it does not enable account enumeration.

## 12. Backup integration and provider discovery boundaries

### Google Drive

Initial identity needs OIDC `openid`; email is useful for account display. Native SDKs may supply their standard basic profile data. Configure no extra Google service scopes, discard unnecessary profile data and verify real consent behavior.

Drive remains an explicit later authorization using full scope `https://www.googleapis.com/auth/drive.file`. Bind the connection to Captain's Log account UUID plus provider/issuer/subject. Account UUID alone is insufficient where an account has multiple Google identities.

The backup adapter obtains credentials from a narrow authorization dependency. It cannot read secure-storage keys directly. Keep connection activation and provider folder caches out of restored database telemetry. Never infer authorization from token presence alone.

Required changes:

- Remove Drive's dependency on the authentication adapter's client-ID helper.
- Disable the unsafe implicit Drive path during the sign-in milestone until production authorization is ready.
- Ensure launch/background backup cannot trigger sign-in or consent.
- Check identity and operation generation before requests and before accepting results.
- Treat HTTP 403 as a permission/policy/capability issue, not an unconditional token-refresh loop.
- Sanitize status details before SQLite persistence.
- Preserve snapshot format, visible folders and retention unless the backup milestone separately changes them.

**MFA enforcement boundary:** a locally enforced Captain's Log session gate does not make Google validate Captain's Log MFA for direct Drive bearer-token calls. If the requirement is that every Drive request be subject to server-enforced Captain's Log policy, a backend-mediated token/API architecture is necessary. That would change credential custody and potentially backup-data transit. Decision D5 must resolve this before production backup architecture is finalized.

### Provider discovery and additional methods

The supplied model enables MX-assisted provider recommendations. Deliver this with email signup, not as hidden work inside Google sign-in. Direct-domain hints and MX results remain recommendations only: no auto-redirect, merge, identity proof or access decision.

Send only the domain to an approved resolver, normalize DNS names, match hostname labels safely, cache with bounded lifetime and never block email signup on DNS failure. Google documents `smtp.google.com` for Workspace MX; maintain documented patterns and tolerate unknown/custom routing rather than treating broad suffix matches as proof. [R11]

Only show implemented signup methods. Before email delivery, choose password versus email-link/OTP semantics and apply verification, abuse and recovery protections. Before phone delivery, resolve primary-factor policy, verification delivery, number recycling and MFA independence. Before Apple delivery, implement its audience/team/grouping and transfer semantics. No provider email auto-merges accounts.

## 13. Security risks and mitigations

| Risk | Mitigation |
| --- | --- |
| Forged/replayed Google proof | Server verification, expected nonce/audience/issuer, transaction expiry and one-time consumption. |
| Code interception | S256 PKCE where code flow applies; no embedded secrets. |
| Redirect injection | SDK callback handling; exact app-owned callback validation; reject unsolicited/stale results. |
| Account takeover through linking | Recent existing-account authentication/MFA, fresh new-identity proof, explicit confirmation and atomic uniqueness. |
| Session fixation/mixing | Bind transactions to operation/purpose/client environment; rotate sessions after assurance changes. |
| MFA bypass | Enforce challenges and assurance on server endpoints, not only screens. Test direct endpoint calls. |
| OTP guessing/replay | Rate limits, short acceptance windows, replay rejection and safe lockout/recovery. |
| Recovery abuse | High-entropy single-use codes, protected verifier records, atomic consumption and restricted recovery sessions. |
| Account enumeration | Generic unauthenticated responses, no disclosure of linked or original methods before appropriate proof. |
| Credential leakage | No tokens in state, SQLite, YAML, URLs, diagnostics, analytics, exports or backups; sanitize at adapter boundaries. |
| Account/refresh races | Serialized acquisitions and generation checks; logout/switch prevents late completions restoring state. |
| Duplicate accounts | Atomic authoritative identity uniqueness and idempotent account resolution. |
| Restored stale state | Backups cannot restore credentials, accepted MFA proof, consumed recovery codes or cloud activation. |
| Stolen/compromised device | OS credential protection, independent local lock and bounded remote sessions. OAuth does not encrypt the SQLite archive. |
| Malicious local metadata | Metadata cannot authorize remote operations; server re-verifies identity/session/linkage. |
| Compromised runtime/dependency | Pin/review dependencies; native SDK treats bundled JavaScript as trusted. Server checks remain independent. |

Fuzz/red-team targets include malformed/oversized callbacks and JWTs; duplicate parameters; wrong algorithm/issuer/audience/nonce; malicious key URLs; unknown signing keys; clock skew; corrupted secure records; process death; stale callbacks after logout/switch; account-resolution races; linking proof substitution; MFA bypass/replay; recovery-code races; account enumeration; token-bearing error strings; and account-A backup operations after switching to account B.

Include actual merged Android backup rules, iOS reinstall behavior, native credential caches and production build signing in the security review. Do not claim archive encryption or strong local device security from the prototype password gate.

## 14. Test plan

Use dependency-injected services with the existing Node/`tsx` testing style where practical. Backend tests need real transactional persistence tests as well as mocked provider tests. Browser harnesses test local/UI behavior, not native Google sign-in.

| Scenario | Unit/integration evidence | Device/manual evidence |
| --- | --- | --- |
| Clean install | Empty stores, missing installation marker | Offline first launch and reviewed local-access policy |
| First sign-in | Verified proof, lookup/create, MFA, persistence ordering | Real native consent/account selection |
| Returning user | Stable account resolution and metadata restore | Relaunch and SDK session restoration |
| User cancels | No partial full session/link | Dismiss/back during primary and MFA UI |
| Invalid/malformed callback | Bounded parser; transaction/claim rejection | Unsolicited and cold-start callback delivery |
| Network loss before authorization | Recoverable offline state | Airplane mode |
| Network loss during callback/exchange | No incomplete committed session | Interrupt provider and account-authority calls |
| Expired access token | Separate provider/account refresh paths; one retry | Invalidate/expire tokens |
| Refresh failure | No infinite retries; local use preserved | Account/provider revocation and outage |
| Revoked Google authorization | Capability invalidation; identity history retained | Revoke in Google account settings |
| Sign-out | Late results rejected; local credentials preserved | Verify native cache cleanup |
| Offline sign-out | Durable logout marker; honest remote result | Restart before reconnection |
| Authenticated restart | Idempotent initialization | Force-stop/relaunch |
| Reboot | Temporarily locked storage distinguished | Reboot and first device unlock |
| Account switching | Account/identity-bound caches and requests | Two actual Google accounts |
| Reinstall | Stale keychain/session invalidation | Android and iOS separately |
| Corrupt secure entry | JSON/version/read/write/delete failures | Development-only corruption injection |
| Google/server unavailable | Timeouts/backoff/no lockout of logs | Controlled service/network interruption |
| Offline local use after login | No auth dependency in repositories | Create/edit/browse/search/graph/attachments |
| Two clean devices | Same verified subject resolves same account | New-device sign-in and MFA |
| Concurrent signup | Unique identity and idempotent account creation | Parallel enrollment sessions |
| Linking/unlinking | Fresh proofs, collision rejection, last-method protection | Explicit linking consent and recovery |
| MFA | No full session after primary only; replay/rate-limit tests | Enrollment, challenge, lost-factor recovery |
| Recovery codes | Atomic one-time consumption, no restore rollback | Recovery and reenrollment UX |
| Archive restore | Auth singleton retained; no cloud autoactivation | Restore while authenticated/disconnected |
| Leakage | Sentinel secrets through every logging/status/backup sink | Inspect local DB, snapshot and diagnostics |

Also test wrong fingerprints/audience, missing/outdated Play Services, account disabled/locked policy, factor changes, clock skew, unknown JWKS key, sign-in backgrounding and browser/web unsupported behavior.

During implementation run `npm run typecheck`, `npm run lint`, `npm run test:node`, the new auth/account suites, and appropriate UI/YAML/HUD checks. Include Android development and production-equivalent signing, an iOS build/device test, and account-authority integration/security checks. Record only executed results in `docs/TEST_LOG.md`; this document records no authentication PASS.

## 15. Implementation sequence

The Codex numbered steps below are historical. The controlling phase-line is `docs/ACCOUNT_IDENTITY.yaml` `phases` P00–P33. Each YAML phase includes objective, prerequisites, architecture, files, schemas, resources, secrets, security properties, tests, success criteria, rollback, non-goals, and commit breakpoint.

Independent review changed the order:

1. Authoritative YAML and schema audit (P00) before any identity code.
2. TypeScript contracts (P01) before native Google or encryption.
3. Local profile/archive identity and secure storage (P02–P03) before remote account.
4. Archive encryption (P04) as a dedicated SQLCipher + AES-GCM phase with on-device plaintext inspection.
5. In-repo authority skeleton (P05) with no production host.
6. Account resolution and device enrollment (P06–P07) before Google native.
7. Google Universal Sign-In (P08) is **blocked** until D25 license/registry access exists. Do not install the public/legacy package as a substitute. Do not keep AuthSession implicit flow as a fallback.
8. Passkeys, assurance, TOTP, email, recovery, linking, and grants follow as separate breakpoints (P10–P16).
9. Sync, sharing, Drive capability, restore isolation, legacy retirement, and account switch are later (P19–P28).
10. Security pass, Android beta, iOS hardware, wearable groundwork, SDK 58 remain release gates (P29–P33).

P00 rollback: revert this documentation set. P01 rollback: remove new model modules without touching SQLite or native config. P01 test boundary: typecheck plus contract smoke; no device required.

Historical Codex table retained for comparison only:

| Step | Objective and likely files/modules | Expected behavior | Verification | Dependencies |
| --- | --- | --- | --- | --- |
| 1 | Resolve D1–D5; update approved specification/architecture and append DEVNOTES | Account authority, first launch, library, MFA and backup enforcement scope are explicit | Review decisions and acceptance criteria | None |
| 2 | Native compatibility spike: package/config plus isolated Google adapter | SDK 57 Android/iOS build; correct audience/nonce, callback, storage and logout behavior | Real native build/sign-in and source/config audit; pin versions | 1; library access and test OAuth configuration |
| 3 | Add account/auth/authorization types and safe errors | UI contracts contain no credentials; lifecycle dimensions are distinct | Typecheck and contract tests | 1 |
| 4 | Account-authority persistence and Google proof endpoint | Same identity resolves one account; invalid proofs fail | Signature/nonce fixtures, concurrency and idempotency integration tests | 1, 3; chosen backend environment |
| 5 | Authority MFA, recovery and session lifecycle | No completed account session before required factors; recoverable enrollment | Direct endpoint bypass, OTP replay/rate-limit, recovery race and refresh rotation tests | 4 |
| 6 | Mobile secure storage/install marker and legacy migration | Old Google tokens invalidated, local credentials preserved, reinstall safe | Storage failure and migration fixtures; Android/iOS reinstall | 2, 3 |
| 7 | Account API and native auth service | Google proof -> account resolution -> MFA -> secure session -> normalized state | Integration tests including network interruption and persistence failure | 2, 5, 6 |
| 8 | Separate archive access and auth service lifetime | Local operation independent; SQLite restore does not reset auth | Offline startup, legacy-lock bypass prevention, restore tests | 7 |
| 9 | Settings/security UI and routes | Account, MFA and safe recovery controls; only delivered methods visible | Browser mocks, accessibility/layout checks and device interactions | 8 |
| 10 | Account linking/unlinking service and UI for delivered identity types | Fresh proof and MFA required; no email merge/last-method lockout | Two-account collision tests, transaction replay and explicit consent | 5, 9 |
| 11 | Authorization boundary and unsafe Drive retirement | Google sign-in grants no Drive access; old token cannot trigger upload | Scope, token isolation and launch/background no-op tests | 7–10 |
| 12 | Lifecycle hardening and sign-in milestone closeout | Logout/offline logout/reboot/reinstall/refresh behavior verified | Full auth matrix, production-signing test and runbook review | 11 |
| 13 | Google backup milestone | Explicit account-bound Drive consent, renewal, list/backup/restore | Real Drive round trip, switch/restore races and payload inspection | 12; D5 resolved |
| 14 | Security fuzz/red-team milestone | Account, MFA, native auth and backup assessed together | Document findings, fixes and retests | 13 |
| 15 | Beta release and approximately four weeks of beta | Feedback resolved without changing identity semantics | Beta acceptance, error/abuse/recovery observations with sanitized telemetry | 14 |
| 16 | Expo SDK 58 migration | Provider adapters/build config updated; canonical IDs and contracts preserved | Rebuild plus native, account, offline and backup regression matrix | 15 |
| 17 | Final regression and production launch | Release criteria met across selected platforms/environments | Production-equivalent configuration and rollout/rollback review | 16 |

Additional Apple/email/phone signup and MX discovery are separate scoped work packages. The supplied model defines their eventual behavior; do not label them implemented or expose placeholder signup controls. If all methods are required for beta, add those packages before Step 14 and revise the schedule explicitly.

## 16. Migration and rollback considerations

Recognize legacy keys `captains-log.session`, `captains-log.google-account`, `captains-log.google-id-token`, `captains-log.google-drive-token`, and `captains-log.google-drive-root-folder`. Remove/reject obsolete OAuth credentials; never infer a verified subject from an email-only record.

Preserve the local archive credential and its legacy migration. Translate local session/unlock behavior separately from external session cleanup. An unverified archive identifier is never imported as a verified email identity. Reauthentication resolves the canonical account through the authority.

Use independent secure-record and account API versions. If archive binding metadata requires a local database migration, make it additive and idempotent, and review whole-database backup consequences. Never rewrite entry UUIDs to account IDs. Two existing account UUIDs are not automatically merged even if profile email matches.

Rollback disables remote capabilities while retaining local operation. It must not restore implicit OAuth, bypass MFA, or reactivate legacy tokens. Native dependencies and callback configuration require a new binary; JavaScript updates alone cannot add or roll back unavailable native modules safely. Keep API compatibility during mobile rollout and use environment/version-aware feature availability.

For SDK 58, retain account UUIDs, identity keys, server sessions/storage versions and service contracts. Upgrade native SDKs/config plugins and reverify callback/lifecycle behavior. Compatibility is a future test result, not guaranteed by this design. A supported adapter replacement must not require account rekeying.

## 17. Decision register

Authoritative detail lives in `docs/ACCOUNT_IDENTITY.yaml`. D1–D12 were approved by the 2026-09-20 implementation prompt. Remaining independent architecture, including D13–D30, D34, D34-A through D34-D, and D37, was approved on 2026-09-28. D35 remains APPROVED_DIRECTION.

| ID | Decision | Status | Outcome |
| --- | --- | --- | --- |
| D1 | Shared account authority | APPROVED | Custom lightweight Captain's Log control plane. It owns account UUID resolution, identity mapping, uniqueness, linking, device enrollment/trust, MFA/assurance, recovery, lifecycle, sharing authorization, and short-lived grants. It does not hold logs, graph data, attachments, or archive contents by default. |
| D2 | First-launch local profile and archive | APPROVED | Local profile immediately; remote account optional. First launch creates local_profile_uuid, archive_uuid, and an encrypted archive without Google, Apple, internet, or the authority. BitLocker-style AEK wrapping, not password-as-content-key. |
| D3 | Native Google library | APPROVED | Universal `@react-native-google-signin/google-signin`. Documented Expo 57 / RN 0.76–0.87 compatibility. Exact version pending license spike. No AuthSession implicit fallback. License purchase is not authorized (see D25). |
| D4 | MFA policy | APPROVED | Risk-adaptive MFA. Do not require two factors on every ordinary interaction. Step-up for identity/device/MFA/recovery/sharing/sync/restore/merge/deletion/export operations. |
| D5 | Authorization enforcement | APPROVED | Authority issues short-lived CL grants (account, device, operation, resource, assurance, iat, exp, grant_id). Control plane stays separate from the data plane. The authority is not an automatic Google Drive proxy. |
| D6 | Authentication methods and trusted window | APPROVED | Passkeys, Google, verified email, TOTP in first delivery; Apple and phone later. Maximum trusted window 90 days, revocable, not an unconditional bypass. High-risk operations may still require step-up. |
| D7 | Account/archive persistence | APPROVED | Split persistence. Immutable archive UUID. Restored association metadata is not proof. Tokens, passkey private material, TOTP secrets, and grants never enter archive backups. Ownership lives at the authority. |
| D8 | Remote account disablement | APPROVED | Disabled accounts stop sync, sharing, enrollment, identity/MFA changes, grants, and new remote operations. Local data is not deleted, erased, or automatically locked. Local archive locking is separate. |
| D9 | Dev and production infrastructure | APPROVED | Separate development/test and production projects, OAuth clients, fingerprints, authority, secrets, databases, test accounts, and push. No production secrets in development. No Google Cloud resources exist in this repository yet. |
| D10 | Existing installations | APPROVED | Preserve local archive contents, legitimate locks, and non-secret data. Invalidate legacy implicit Google tokens, Drive bearer tokens, email-as-Google-identity records, and stale provider sessions. Require fresh authentication. |
| D11 | iOS and wearables | APPROVED | iOS is a first-class upcoming target with a dedicated local environment. Interfaces must remain suitable for phones, tablets, desktops, and wearables. Wearables do not receive full account credentials by default. |
| D12 | Background synchronization | APPROVED | Hybrid: deterministic foreground, durable queue, opportunistic background retry, push hints. Correctness must not depend on background runtime. Push is not sync completion. |
| D13 | Authority runtime and hosting | APPROVED | TypeScript HTTPS → Docker → ECR → ECS Fargate → private AWS → RDS PostgreSQL. Dev RDS us-east-2, database captains_log. Live IDs in captains-log-infra. Domain logic behind repository interfaces. Same artifact locally and in AWS. |
| D14 | Passkey classification | APPROVED | Passkeys are authentication factors, not linked identities. Governed by D32. |
| D15 | Archive encryption mechanism | APPROVED | Layered hierarchy: Recovery Secret → HKDF Recovery KEK → wrapped AEK → domain-separated archive keys → per-object DEKs. Password/PIN uses Argon2id or approved password KDF, never raw HKDF. SQLCipher key is `captains-log/sqlite/v1`. AES-GCM nonce reuse forbidden. |
| D16 | Profile/archive cardinality | APPROVED | One local profile per install; one archive on first launch; many archives later. Archive binds at most one account at a time. Distinct local_profile_uuid, archive_uuid, account_uuid, user_id. |
| D17 | Grant format | APPROVED | Settled by D36: JWS Ed25519, named grant_id/jti, device confirmation, revocation store, TTL 300/3600/120s. |
| D18 | Development client | REPOSITORY_FACT | `expo-dev-client` is required by EAS development profile and is not installed. |
| D19 | Backup versus sync | ACCEPTED_CONSEQUENCE | Restates D12: Drive snapshots are not object sync. |
| D20 | iOS export compliance | ACCEPTED_CONSEQUENCE | Follows D15 if encryption ships. |
| D21 | Web credential storage | ACCEPTED_CONSEQUENCE | Restates I16/I22. Session details in D35. |
| D22 | Wearable credentials | ACCEPTED_CONSEQUENCE | Restates D11. Device PoP in D31. |
| D23 | Authority persistence isolation | ACCEPTED_CONSEQUENCE | Restates D1/D7. |
| D24 | Capability identity binding | APPROVED | Drive binds to account_uuid plus exact Google (issuer, subject). Email equality is not identity. |
| D25 | Google Universal license | BLOCKED_ON_OPERATOR | Consequence of D3. Blocks P08 and therefore the beta gate. |
| D26 | Product spec reconciliation | ACCEPTED_CONSEQUENCE | D2 already required local-first; spec was updated in P00. |
| D27 | Plaintext leakage inventory | ACCEPTED_CONSEQUENCE | D2 required identifying leakage paths. |
| D28 | Plaintext-to-SQLCipher migration | APPROVED | Copy into a new encrypted database. Retain original until verification. Logical delete plus best-effort cleanup. Physical erasure is not guaranteed. |
| D29 | Auth service lifetime | APPROVED | Account, auth, device, authorization, session, provider, and authority-connection state are application-lifetime. Archive restore must not silently log in/out, restore credentials, or infer ownership. |
| D30 | Optional local lock | APPROVED | First launch creates a device-wrapped AEK without a Captain's Log password/PIN. Optional lock uses Argon2id/approved KDF. Remote auth does not bypass a configured local lock. |
| D31 | Device PoP | APPROVED | Local asymmetric device keypair using platform cryptography; private key non-exportable where supported; hardware-backed preferred; public key only at the authority; `device_uuid` never proves possession; fresh PoP for sessions, grants, and enrollment. Attestation may score risk later, not sole trust. Wearables stay D11/D22 unless promoted. |
| D32 | Passkey RP and local-versus-remote unlock | APPROVED | Local archive unlock is platform UV authorizing a device-protected AEK wrap, not WebAuthn. Account passkey is WebAuthn to a pending CL-controlled HTTPS RP ID. Passkey-first bootstrap uses a provisional registration transaction. D31 remains independent. |
| D33 | Archive recovery after total device loss | APPROVED | 256-bit CSPRNG Recovery Secret as 64 hex characters. HKDF `captains-log/recovery-kek/v1` derives Recovery KEK that wraps AEK. Authority never holds plaintext Recovery Secret, Recovery KEK, or AEK. Account recovery ≠ archive decrypt. |
| D34 | Shared-object DEK distribution | APPROVED | Independent Object DEK per shared object; wrap to recipient Account Sharing Public Key. Archive AEK is never the sharing key. Private sharing key wrapped per enrolled device. |
| D35 | CL session storage | APPROVED_DIRECTION | Memory access credential; SecureStore refresh bound to D31 device key; install marker is not authentication. Invariants I25–I30. Remaining: exact key names and refresh lifetime. |
| D36 | Grant rotation and device binding | APPROVED | JWS Ed25519; claims include iss/aud/account/device/operation/object/assurance/iat/nbf/exp/jti/kid/cnf; TTL 300/3600/120s; bounded signing-key overlap; private signing keys never on clients; offline local-share revocation lag accepted and bounded by TTL. |
| D37 | Email authentication mechanism | APPROVED | Short-lived single-use email OTP; not a password DB; not independent MFA with the same mailbox. Magic-link is later optional UX. |
| D38 | Human-readable Captain's Log User ID | APPROVED | Locator/address, immutable once issued, resolvable to account_uuid. Not authentication, authorization, ownership proof, or a key. Distinct from account_uuid. |
| D34-A | Shared-object recipient key target | APPROVED | Account-level sharing keypair. Wrap Object DEKs to account public key. Private key wrapped independently to authorized enrolled devices. Established library; document primitive before implementation. |
| D34-B | Shared-object revocation and re-key | APPROVED | Prospective. Device revoke rotates sharing-key epoch where required. Recipient removal generates a new Object DEK for subsequent versions. Prior plaintext is not remotely erasable. |
| D34-C | Historical-version access after revocation | APPROVED | Past ciphertext/plaintext is not cryptographically erasable. Authorization may stop serving history. Future versions use new DEKs. |
| D34-D | New-device access to existing Object DEKs | APPROVED | Wrap current Account Sharing Private Key to a newly enrolled full device after step-up. Do not rewrap every historical Object DEK. Wearables do not automatically receive full sharing keys. |

Architecture review hold is **released**. P01 is unblocked for foundational TypeScript contracts and repository-boundary work. Do not start P04, P05, P08, P10, P13, P14, P19, P20, or P24 in the same documentation pass. P08 remains blocked on D25 license. P10 may prepare a configuration contract but cannot finalize production WebAuthn until the RP domain is supplied. P19/P20/P24 are no longer architecture-blocked by D34 sub-decisions. D18/D19/D21–D23/D26/D27 restate approved decisions or repository facts. D25, the WebAuthn RP domain, and live AWS resources in `captains-log-infra` remain operator/configuration tasks, not unresolved architecture. P29 requires P04 archive encryption plus first-delivery Google, passkey, TOTP, email, and recovery (P08, P10, P12, P13, P14) before the security/beta gate.

## 18. Definition of done

### Account and Google sign-in milestone

- Canonical account UUID and verified linked identity are distinct; repeated/cross-device login resolves the same account.
- Google subject/issuer, signature, audience, freshness and nonce are verified by the trusted authority.
- Risk-adaptive assurance is enforced on account endpoints. Step-up is required for the D4 sensitive operations. Ordinary local use does not demand two factors on every interaction.
- Passkeys are factors, not linked identities. Synced passkeys do not enroll a Captain's Log device.
- Account creation/linking uniqueness is transactional; email matching never merges accounts.
- Android works in development and production-equivalent signed builds; iOS integration and lifecycle are verified.
- Local logging works independently of external availability under the reviewed first-launch policy; existing local locks survive migration.
- Provider and Captain's Log credentials remain outside ordinary app storage, UI state, SQLite, diagnostics, YAML and backups.
- Logout, offline logout, remote revocation outcomes, switching, refresh, restart, reboot, reinstall and corrupted storage are tested.
- Database restore does not reset authentication or revive cloud connections.
- Google sign-in requests no Drive permission; prototype implicit flows cannot be used in production.
- Configuration, threat model, migrations, rollback and actual device/test results are documented.

### Before beta and production

- Drive authorization and backup are account/identity-bound and satisfy the reviewed MFA enforcement boundary.
- Security fuzz/red-team findings are resolved or explicitly dispositioned before beta.
- Approximately four weeks of beta precede SDK 58 migration under the intended release sequence.
- SDK 58 migration retains account identity/storage contracts and passes the native/offline/backup regression matrix.
- Final production-equivalent regression and operational recovery/rollback checks pass.
- Unimplemented provider methods and unresolved decisions are not presented as completed functionality.

## References

These references informed the September 2026 review. Recheck version-specific compatibility and provider requirements when implementation begins.

- **R1:** [Expo SDK 57 reference](https://docs.expo.dev/versions/v57.0.0/) and [SDK 57 AuthSession](https://docs.expo.dev/versions/v57.0.0/sdk/auth-session/).
- **R2:** [Google Sign-In library installation, editions and compatibility](https://react-native-google-signin.github.io/docs/install).
- **R3:** [Expo Google authentication guidance and library comparison](https://docs.expo.dev/guides/google-authentication/).
- **R4:** [Google Sign-In Expo setup](https://react-native-google-signin.github.io/docs/setting-up/expo), [Universal API](https://react-native-google-signin.github.io/docs/one-tap), and [nonce/security support](https://react-native-google-signin.github.io/docs/security).
- **R5:** [Google native OAuth, PKCE, redirect restrictions and revocation](https://developers.google.com/identity/protocols/oauth2/native-app).
- **R6:** [Google server-side ID-token verification](https://developers.google.com/identity/gsi/web/guides/verify-google-id-token).
- **R7:** [Google OpenID Connect and identity claims](https://developers.google.com/identity/openid-connect/openid-connect).
- **R8:** [NIST SP 800-63B-4 authentication and authenticator management](https://pages.nist.gov/800-63-4/sp800-63b.html), used as security design guidance rather than a claim of project certification.
- **R9:** [Expo SDK 57 SecureStore](https://docs.expo.dev/versions/v57.0.0/sdk/securestore/).
- **R10:** [Apple: migrating Sign in with Apple users during app transfer](https://developer.apple.com/documentation/technotes/tn3159-migrating-sign-in-with-apple-users-for-an-app-transfer).
- **R11:** [Google Workspace MX configuration](https://support.google.com/a/answer/6156494).

Repository source of truth during implementation: `AGENTS.md`, `docs/captains-log.yaml`, `docs/ARCHITECTURE.md`, `docs/planning/ROADMAP.md`, documentation/annotation standards, package/config files, and the service/adapter code identified above. This review draft proposes changes; it does not silently amend those sources.
