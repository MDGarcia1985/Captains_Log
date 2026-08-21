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
- Add Google OAuth client IDs in `app.json` extra / `EXPO_PUBLIC_GOOGLE_*` env vars.
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


