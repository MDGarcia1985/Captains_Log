# Captain's Log — MVP Implementation Roadmap

## Purpose

Build an offline-first Expo / React Native personal Captain's Log backed by SQLite and a lightweight knowledge graph.

The application should prioritize:

1. Extremely fast capture on phone.
2. Rich navigation and context exploration on tablet.
3. Local ownership of all primary data.
4. Photos and attachments as first-class log content.
5. Searchable and crosslinked longitudinal information.
6. A clean service boundary for future YA integration.
7. A distinctive tactical cyberdeck / technical notebook interface.
8. A lightweight plugin-like modular codebase using explicit interfaces and replaceable adapters.

The MVP is intended to be implemented rapidly using agent-assisted development.

Target:

- Functional prototype: approximately 4–6 hours.
- More complete first version: no more than approximately 20 hours.

Do not turn this into a large architecture project.

---

# 0. Mandatory Pre-Implementation Review

Before writing or modifying implementation code:

1. Read `DEVNOTES_STANDARDS.md` in full.
2. Read `ANNOTATION_STANDARDS.md` in full.
3. Confirm that file headers, function annotations, decision logging, and other documentation practices comply with those standards.
4. Read `captains-log.yaml`.
5. Treat `captains-log.yaml` as the authoritative product and behavior specification.
6. Inspect existing `ARCHITECTURE.md` and `DEVNOTES.md` if present.

Do not begin implementation until these files have been reviewed.

If `DEVNOTES_STANDARDS.md` or `ANNOTATION_STANDARDS.md` is missing, stop and report that before proceeding.

When a meaningful architectural or implementation decision is made, document it according to `DEVNOTES_STANDARDS.md`.

Do not silently alter product behavior defined in `captains-log.yaml`.

If implementation requires a product-level change, identify the conflict before changing the specification.

---

# 1. Scope Discipline

The MVP is deliberately small.

Prefer:

- direct implementations,
- standard Expo libraries,
- thin service layers,
- simple TypeScript,
- SQLite,
- small reusable components,
- explicit interfaces at replaceable system boundaries,
- adapters for external providers.

Avoid unless required:

- Redux,
- GraphQL,
- dedicated graph databases,
- vector databases,
- microservices,
- custom backend infrastructure,
- unnecessary cloud databases,
- premature generic abstraction,
- complex dependency injection containers,
- elaborate design systems,
- unnecessary state-management libraries,
- runtime plugin discovery,
- plugin manifests,
- dynamic plugin loading,
- plugin lifecycle managers.

The application should remain understandable by reading the repository.

---

# 2. Architecture Style — Modular Adapter / Plugin-Like Codebase

Captain's Log should use a lightweight plugin-oriented modular architecture.

This does **not** mean building a generic plugin framework for the MVP.

The intent is to isolate capabilities behind explicit interfaces so they can be replaced, removed, or extended later without rewriting unrelated code.

Use this mental model:

```text
interface
   ↓
adapter / implementation
   ↓
platform or provider
```

Prefer:

```text
BackupProvider
   ↓
GoogleDriveBackupProvider
```

rather than:

```text
UI → Google Drive API directly
```

Likewise, prefer extension boundaries such as:

```text
CaptureSource
StorageProvider
BackupProvider
ExtractionProvider
LocationProvider
AuthProvider
GraphProcessor
YAInterface
```

Do not create a generalized plugin registry unless multiple interchangeable implementations actually exist and runtime selection is required.

Use interfaces and adapters first.

The desired codebase is **plugin-like**, not a plugin-runtime project.

## Architectural Invariants

The following must remain true:

- Features are isolated by domain.
- Modules expose explicit public interfaces.
- Internal implementation details stay private to each module.
- UI depends on application services, not provider implementations.
- Application services depend on domain contracts, repositories, or adapters.
- Provider-specific code does not leak into the domain model.
- External integrations are replaceable adapters.
- Features should be removable without large cross-cutting changes.
- Avoid hidden coupling and unnecessary global state.
- Direct feature-to-feature imports should be minimized.
- SQLite and local storage are infrastructure details behind repositories/services.
- YA will eventually consume the same application service layer as the UI.

---

# 3. Suggested Project Structure

Prefer a domain-oriented structure similar to:

```text
app/
├── _layout.tsx
├── index.tsx
├── capture.tsx
├── search.tsx
├── graph.tsx
├── settings.tsx
├── entry/
│   └── [id].tsx
└── entity/
    └── [id].tsx

src/
├── core/
│   ├── entries/
│   ├── entities/
│   ├── relationships/
│   └── attachments/
│
├── features/
│   ├── capture/
│   ├── search/
│   ├── graph/
│   └── backup/
│
├── adapters/
│   ├── sqlite/
│   ├── filesystem/
│   ├── googleDrive/
│   ├── imagePicker/
│   ├── auth/
│   └── location/
│
├── services/
│   └── application-level orchestration
│
├── ui/
│   ├── screens/
│   ├── components/
│   └── layout/
│
├── theme/
├── hooks/
├── models/
└── utilities/

assets/
```

Do not follow this structure blindly if the existing repository already has a coherent equivalent architecture.

The important requirement is dependency direction and replaceable boundaries, not exact folder names.

---

# 4. Initial Technology Stack

Use:

- Expo
- React Native
- TypeScript
- Expo Router
- `expo-sqlite`
- `expo-image-picker`
- Expo-compatible camera/image functionality
- Expo local file-system APIs
- `expo-location`
- `expo-secure-store`
- Google authentication
- Google Drive API for backup

Use development builds when native authentication or other native integrations require them.

Core application usage must not require network access.

---

# 5. Phase 1 — App Shell

Goal: application launches and responds correctly to phone/tablet dimensions.

Implement:

- Expo Router.
- Root application layout.
- Responsive breakpoint detection using `useWindowDimensions()`.
- Three presentation modes.

Breakpoints:

```text
< 600dp
Compact / one pane

600–899dp
Medium / two panes

>= 900dp
Expanded / three panes
```

## Phone

Use a vertical navigation rail.

Right-handed mode:

```text
PRIMARY CONTENT | NAV
```

Left-handed mode:

```text
NAV | PRIMARY CONTENT
```

Primary rail items:

- Log
- Capture
- Search
- Graph

Utility:

- Settings

Capture should be visually dominant.

## Tablet Portrait / Medium

Two panes.

Right-handed:

```text
PRIMARY | NAV
```

Left-handed:

```text
NAV | PRIMARY
```

Context opens as an inspector/overlay.

## Tablet Landscape / Expanded

Three panes.

Right-handed:

```text
NAV | PRIMARY | CONTEXT
```

Left-handed:

```text
CONTEXT | PRIMARY | NAV
```

Do not maintain separate tablet and phone applications.

Use one responsive layout system.

---

# 6. Phase 2 — SQLite Foundation

Create the local SQLite schema.

Minimum tables:

```text
entries
entities
entry_entities
relationships
attachments
entry_revisions
```

Implement migrations from the beginning.

Do not use an ORM unless there is a demonstrated need.

Create repositories so React components do not issue SQL directly.

Enable SQLite full-text search where supported.

Create indexes for:

- entry creation time,
- entity names,
- relationship source,
- relationship target,
- attachment entry ID.

---

# 7. Phase 3 — Interfaces, Repositories, and Adapters

Define only the interfaces needed by the MVP.

Example:

```ts
interface BackupProvider {
  backupDatabase(): Promise<void>;
  backupAttachments(): Promise<void>;
  getStatus(): Promise<BackupStatus>;
}
```

MVP implementation:

```text
GoogleDriveBackupProvider
```

Possible future implementations:

```text
OneDriveBackupProvider
LocalExportBackupProvider
NASBackupProvider
```

The UI must not know which provider is active.

Apply the same pattern where useful for:

```text
CaptureSource
ExtractionProvider
StorageProvider
LocationProvider
AuthProvider
GraphProcessor
```

Do not create unused abstractions merely because another provider may exist someday.

Create an interface when:

1. the current implementation depends on an external provider/platform,
2. the boundary is likely to change,
3. isolating it materially reduces coupling.

---

# 8. Phase 4 — Application Service Layer

Create a thin domain/service layer.

Initial public functions should resemble:

```text
createEntry()
updateEntry()
getEntry()
listEntries()
searchEntries()

createEntity()
getEntity()
findEntityByName()
getRelatedEntities()

createRelationship()
getRelationships()

addAttachment()
getAttachments()

getProjectHistory()
getOpenQuestions()
```

UI components must call services rather than querying SQLite directly.

Do not build a network API yet.

The service layer is intended to become the future interface for YA, MCP, or a local API.

---

# 9. Phase 5 — Fast Capture

Implement the primary Capture experience.

Phone behavior:

- Opening Capture immediately focuses the text field.
- No required title.
- No required tags.
- No required project.
- No required metadata.
- Timestamp automatically.
- Save locally immediately.
- Close/dismiss quickly after save.

Controls:

- Camera
- Gallery
- Location
- Commit Log

System keyboard voice dictation is sufficient for MVP.

Do not implement custom voice transcription.

Gboard voice typing should work naturally because the primary entry field is a normal text input.

---

# 10. Phase 6 — Photo Attachments

Implement photo capture and selection.

Support:

- device camera,
- photo gallery.

For every image:

1. Preserve the original.
2. Copy/manage it within application-controlled storage if necessary.
3. Generate/store thumbnail information as appropriate.
4. Store attachment metadata in SQLite.
5. Link attachment to log entry.

Store:

- attachment ID,
- entry ID,
- file URI,
- MIME type,
- dimensions,
- size,
- created time.

Optional photo role may later include:

- prototype,
- inspiration,
- reference,
- document,
- component,
- failure,
- result.

Do not require the user to categorize photos during capture.

---

# 11. Phase 7 — Chronological Log

The Log is the canonical human history view.

Default presentation:

- reverse chronological,
- grouped by day,
- timestamp visible,
- source text prominent,
- photos visible,
- extracted entities displayed unobtrusively.

Avoid a dashboard-first experience.

The application is fundamentally a chronological log.

Entries should expand inline where practical instead of forcing unnecessary navigation.

---

# 12. Phase 8 — Search

Implement FTS-based local search.

Search:

- log text,
- entity names.

Results should identify:

- entry,
- timestamp,
- matching text,
- relevant entities.

Do not implement embeddings or semantic search yet.

The UI may reserve space for future natural-language query behavior, but MVP behavior should remain deterministic local search.

---

# 13. Phase 9 — Knowledge Graph MVP

Implement a minimal graph model.

Initial entity types:

- Person
- Project
- Organization
- Hardware
- Software
- Idea
- Decision
- Problem
- Question
- Experiment
- Artifact
- Place

Initial relationships:

- mentions
- relates_to
- belongs_to
- depends_on
- supports
- contradicts
- supersedes
- derived_from
- documents
- depicts
- contains

All derived relationships must retain provenance back to their source log entry.

Graph UI should show:

- selected entity,
- immediate first-degree relationships.

Do not render the entire database as one global force-directed graph.

Avoid the "knowledge graph hairball."

---

# 14. Phase 10 — Entity View

Selecting an entity should expose:

- entity name,
- entity type,
- first mention,
- most recent mention,
- associated entries,
- related entities,
- relationships,
- attachments/photos,
- decisions,
- open questions where available.

On expanded tablet:

Display these primarily in the Context pane.

On phone:

Display as a normal route/page.

---

# 15. Phase 11 — Derived Extraction

Do not block initial MVP delivery on AI extraction.

First implementation may use:

- explicit references,
- manually created entities,
- simple deterministic extraction,
- placeholder extraction service.

The architecture should nevertheless separate:

```text
source content
```

from:

```text
derived interpretation
```

Derived data must always be regeneratable.

A failed extraction must never prevent an entry from being saved.

---

# 16. Phase 12 — Google Authentication

Implement:

- email authentication,
- Google authentication.

Keep Google authentication logically separate from Google Drive authorization.

The user must still be able to access local data while offline after authentication has already been established.

Do not tie basic application startup to an active Internet connection.

Store tokens/secrets using secure platform storage.

---

# 17. Phase 13 — Google Drive Backup

Google Drive is backup storage for MVP.

It is not the canonical application database.

Canonical state remains:

```text
local SQLite
+
local attachments
```

Backup should include:

- SQLite database,
- photo attachments,
- other managed attachments.

Provide visible status such as:

```text
LOCAL ARCHIVE // ACTIVE
LAST BACKUP // 14:21
BACKUP STATUS // CURRENT
```

Automatic backup triggers:

- app launch while online,
- app background,
- manual backup.

Avoid complex two-way synchronization for MVP.

If backup fails:

- local use continues,
- show non-blocking status,
- retry later.

---

# 18. Phase 14 — Location

Location is optional per entry.

Do not request location permission on application launch.

Request it only when the user explicitly selects location capture.

Store location only when requested.

Location must never be required to save a log entry.

---

# 19. Phase 15 — Android Share Target

If feasible within MVP time budget, make Captain's Log an Android share target.

Target workflow:

```text
External App
    ↓
Share
    ↓
Captain's Log
    ↓
New Draft Entry
```

Useful sources:

- Google Recorder transcript
- photo
- browser URL
- text
- PDF
- file

This is preferable to creating custom integrations for every external application.

If share-target implementation threatens the initial 4–6 hour prototype, defer it to the 6–20 hour pass.

---

# 20. Phase 16 — Visual System

Implement one MVP skin:

## Starship / Tactical Cyberdeck

Visual direction:

> A field engineer's digital Captain's Log: part cyberdeck, part technical notebook, and part starship console.

Use:

- near-black/blue-black background,
- cyan primary/system accent,
- orange secondary/user-content accent,
- red-orange only for warnings/errors,
- thin technical borders,
- clipped corners,
- asymmetric panel shapes,
- narrow telemetry labels,
- restrained technical linework,
- readable long-form body content.

Typography:

- condensed technical font for headings where practical,
- monospace for system/telemetry metadata,
- highly readable font for log body text.

Do not make the entire interface monospace.

Avoid:

- excessive glow,
- fake code,
- meaningless binary,
- constant animation,
- large amounts of red,
- excessive card layouts,
- game-like HUD clutter.

Every telemetry element should communicate real application state.

---

# 21. Edge Navigation Interaction

The vertical rail is a defining interaction element.

Support user-selectable handedness:

```text
Left
Right
```

Handedness changes:

- rail side,
- quick action placement,
- capture control alignment,
- tablet pane order,
- inspector edge.

Do not merely move the rail while leaving every other high-frequency action on the opposite side.

The app should feel physically oriented toward the user's preferred hand.

---

# 22. Minimum Settings

MVP Settings should include only:

- handedness,
- theme/skin,
- Google Drive authorization,
- backup status,
- manual backup,
- location permission/status,
- camera/gallery permission/status if useful,
- account,
- export/backup information.

Do not build a large configuration system.

---

# 23. MVP Completion Criteria

The MVP is complete when all of the following work:

- [ ] Expo app launches on phone.
- [ ] Expo app launches on tablet.
- [ ] Layout adapts between one, two, and three panes.
- [ ] User can choose left/right handed mode.
- [ ] Vertical edge navigation mirrors correctly.
- [ ] User can create a text log entry.
- [ ] Entry saves immediately to SQLite.
- [ ] Chronological log displays saved entries.
- [ ] User can attach a camera photo.
- [ ] User can attach a gallery photo.
- [ ] Photos persist locally.
- [ ] Local search works.
- [ ] Basic entities exist.
- [ ] Entity page works.
- [ ] First-degree graph relationship view works.
- [ ] Application works without Internet after initial setup.
- [ ] Email authentication works.
- [ ] Google authentication works.
- [ ] Google Drive backup works.
- [ ] Backup state is visible.
- [ ] Location can optionally be attached to an entry.
- [ ] Starship skin is coherent and readable.
- [ ] Documentation complies with project standards.
- [ ] External-provider code is isolated behind interfaces/adapters where appropriate.
- [ ] UI contains no direct provider-specific or raw-SQL integration logic.

---

# 24. Explicitly Deferred

Do not implement these unless all MVP work is finished and time remains:

- semantic embeddings,
- vector search,
- Neo4j or another graph database,
- automatic visual recognition,
- internal speech transcription,
- Microsoft 365,
- OneDrive,
- Google Recorder API integration,
- sophisticated multi-device synchronization,
- real-time collaboration,
- social features,
- web backend,
- server infrastructure,
- advanced YA integration,
- MCP server,
- multiple elaborate skins,
- complex dashboards,
- universal global graph view,
- generalized plugin registry,
- dynamic plugin loading,
- plugin manifests,
- plugin lifecycle system.

---

# 25. First Prototype Priority Order

If time is limited, implement in exactly this order:

1. Responsive shell.
2. Vertical handed navigation.
3. SQLite schema.
4. Minimal interfaces/repositories.
5. Service layer.
6. Capture text.
7. Chronological log.
8. Camera/gallery attachments.
9. Search.
10. Entity view.
11. Basic graph.
12. Starship styling.
13. Authentication.
14. Google backup.
15. Location.
16. Android share target.

At the end of each meaningful phase:

- verify behavior,
- run tests where appropriate,
- update `DEVNOTES.md` according to `DEVNOTES_STANDARDS.md`,
- do not continue carrying known architectural defects forward.

---

# 26. Agent Working Rules

Before implementing a requested feature:

1. Inspect the existing implementation.
2. Identify the smallest compatible change.
3. Preserve the architecture already established.
4. Follow `ANNOTATION_STANDARDS.md`.
5. Record meaningful decisions according to `DEVNOTES_STANDARDS.md`.
6. Avoid rewriting unrelated code.
7. Do not introduce a new dependency when the existing stack already solves the problem.
8. Do not silently modify the product specification.
9. Stop and surface a decision when two approaches have materially different architectural consequences.
10. Prefer a working vertical slice over incomplete infrastructure.
11. Preserve module boundaries and dependency direction.
12. Do not interpret "plugin-like" as a requirement to build runtime plugin infrastructure.
13. Prefer interfaces plus concrete adapters over dynamic discovery.
14. Add abstractions only where they isolate a real provider/platform boundary or materially reduce coupling.

The objective is not to build the ultimate personal knowledge platform.

The objective is to get Captain's Log onto the user's phone and tablet quickly enough that real usage begins generating the data that will inform the next architecture decisions.
