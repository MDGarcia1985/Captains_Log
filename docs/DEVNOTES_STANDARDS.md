# DEVNOTES Standards

`DEVNOTES.md` is the append-only engineering decision journal for a project. It records material decisions, identified failure modes, corrective actions, accepted risks, unresolved questions, and future development plans.

It explains **why** the implementation took its present form. Current code-local contracts belong in source annotations under `ANNOTATION_STANDARDS.md`; executed verification and observed results belong in `TEST_LOG.md` under `TEST_LOG_STANDARDS.md`.

## Core Rule

`DEVNOTES.md` is append-only. Existing entries must never be deleted, rewritten, reorganized, condensed, silently corrected, or replaced with updated information.

If an entry is incomplete, incorrect, or superseded, add a new entry that:

1. receives a new DEV ID;
2. cites the earlier entry;
3. explains what changed and why;
4. states the new disposition;
5. identifies any required implementation and verification.

The original entry remains part of the engineering history.

## What Requires an Entry

Create a DEVNOTES entry for a material engineering matter, including:

- an architectural, interface, dependency, persistence, security, or platform decision;
- a choice among meaningful alternatives;
- a deviation from a product specification, roadmap, or established pattern;
- a failure whose cause or corrective action will matter later;
- a workaround, accepted limitation, or intentional technical debt;
- a change to a public contract, schema, migration, or data format;
- a blocked or deferred decision;
- an assumption with meaningful implementation consequences;
- an explicit decision to proceed despite failed, blocked, partial, or static-only verification.

Routine edits, formatting changes, obvious implementation details, and successful tests without a material decision do not require an entry.

## Short-Form Observations and Physical Findings

DEVNOTES may also contain short-form engineering observations when hands-on use,
physical testing, emulator/device testing, prototype evaluation, fabrication, assembly,
inspection, or exploratory development reveals information that may influence later
design or implementation decisions.

These entries are intended to preserve engineering context while it is fresh. They do
not require the full decision-entry structure when no material decision has yet been made.

Suitable observations include:

- UI/UX findings discovered while using a working build;
- unexpected physical or runtime behavior;
- ergonomic, dimensional, fit, clearance, accessibility, or usability observations;
- device-, emulator-, operating-system-, or hardware-specific behavior;
- prototype behavior observed during fabrication, assembly, or bench testing;
- performance characteristics noticed during exploratory use;
- suspected defects that require later investigation;
- ideas for refinement discovered during physical interaction with the system;
- multiple related findings from one coherent test or evaluation session.

Observations may be written in shorthand and may group related findings from the same
session. They should preserve enough context to understand where and how the observation
was made.

A short-form observation is not automatically a design decision, requirement, defect,
or verified test result. If an observation later results in a material decision, create
a separate full DEVNOTES decision entry and reference the observation entry.

Formal verification evidence continues to belong in `TEST_LOG.md`. DEVNOTES may record
what was physically observed, but must not claim a formal PASS unless an executed TEST
record supports that result.

## Decision Timing

Record the entry when the decision is made or the material issue is discovered. Do not wait until the end of a milestone.

When a decision changes code, add the DEV ID to relevant source annotations where it provides useful local context. After implementation, perform the validation required by `TEST_LOG_STANDARDS.md` and cite the resulting TEST IDs in a new follow-up entry if the outcome changes or closes the decision.

Do not edit the original entry merely to add later evidence.

## Entry IDs

Every entry must have a unique identifier:

```text
DEV-YYYY-MM-DD-NNN
```

Example: `DEV-2026-08-21-004`.

The numeric suffix increments for entries recorded on that date. A correction, follow-up, or superseding decision receives a new ID.

## Status Values

Every entry must use one status:

- `PROPOSED` — a decision is under consideration.
- `ACCEPTED` — a decision is approved and may govern implementation.
- `IMPLEMENTED` — the decision has been implemented; this does not imply successful verification.
- `DEFERRED` — resolution is intentionally postponed.
- `BLOCKED` — progress requires unavailable information, authority, dependency, or evidence.
- `SUPERSEDED` — a later DEV entry replaces the current decision.
- `CLOSED` — no further action is required.

Because entries are immutable, later status changes are recorded in a new entry that references the earlier ID.


## Required Entry Format

```markdown
### DEV-YYYY-MM-DD-NNN — <Entry Title>

**Date:** YYYY-MM-DD  
**Time:** HH:MM and time zone  
**Engineer:** Human name or agent identifier  
**Status:** PROPOSED | ACCEPTED | IMPLEMENTED | DEFERRED | BLOCKED | SUPERSEDED | CLOSED
**Type:** DECISION | OBSERVATION

#### Problem

Describe the issue, requirement, failure mode, open question, or decision trigger.

#### Context and Constraints

Record relevant specifications, assumptions, dependencies, invariants, and boundaries.

#### Solutions Considered

Describe the credible options considered or attempted. Include rejected options when the reason will matter later.

#### Trade-offs

Record advantages, disadvantages, risks, costs, and consequences.

#### Final Outcome

State the decision, observed result, or current disposition. Separate facts from assumptions.

#### Implementation Impact

Identify affected files, modules, interfaces, schemas, workflows, or documentation.

#### Verification Required

Identify the T0-T3 validation required under `TEST_LOG_STANDARDS.md`. Do not predict a PASS result.

#### Related Records

- DEVNOTES: related or superseded DEV IDs, or `None`
- Tests: related TEST IDs, or `Pending`
- Source: relevant repository paths and annotation locations, or `Not applicable`

#### Next Steps

List remaining implementation, validation, investigation, or documentation actions. Use `None` when complete.

#### Deferred Decisions

Record intentionally postponed decisions and the information or evidence needed to resolve them. Use `None` when not applicable.

```
## Short-Form Observation Format

```markdown
### DEV-YYYY-MM-DD-NNN — <Observation or Findings Title>

**Date:** YYYY-MM-DD
**Time:** HH:MM and time zone
**Engineer:** Human name or agent identifier
**Type:** OBSERVATION
**Environment:** Device, emulator, hardware, prototype, build, or relevant conditions

#### Findings

- <short-hand observation>
- <short-hand observation>
- <short-hand observation>

#### Immediate Concerns

- <failure, defect, uncertainty, or `None`>

#### Follow-up Candidates

- <possible refinement, investigation, or decision>
- <items here are not considered accepted decisions>

#### Related Records

- DEVNOTES: related DEV IDs, or `None`
- Tests: related TEST IDs, `Pending`, or `Exploratory only`
- Source: relevant files/modules/components, or `Not applicable`

Do not remove a section. Use `None`, `Not applicable`, or `Pending` when appropriate.

## Evidence and Verification Rules

DEVNOTES may summarize evidence but must not substitute for a test record.

- Do not state that behavior passed unless a corresponding TEST ID records an executed PASS.
- Compilation or inspection alone must not be described as runtime success.
- A failure may be analyzed in DEVNOTES, but its actual procedure and result belong in `TEST_LOG.md`.
- A decision to accept a known failure or incomplete validation must state the scope, risk, owner, and intended resolution condition.

When an implementation decision has not yet been tested, use language such as `Verification pending` and set related tests to `Pending`.

## Superseding and Correcting Entries

A follow-up entry should say explicitly:

```text
Supersedes: DEV-YYYY-MM-DD-NNN
Reason: <new evidence, changed requirement, or earlier error>
```

Where practical, add a non-destructive pointer from an index at the top of `DEVNOTES.md`; do not alter the historical entry itself. If the project interprets append-only literally at the file level, omit the index and rely on forward references.

## Relationship to Annotations and TEST_LOG

The three records form one traceability system:

```text
Decision or constraint (DEV ID)
        -> implementation and source annotation
        -> verification evidence (TEST ID)
        -> follow-up DEV entry when disposition changes
```

Cross-reference only when a meaningful relationship exists. Do not create empty records solely to complete a chain.

## Quality Standard

Entries must be factual, concise, and complete enough for a developer or software agent to reconstruct the reasoning without private conversation context. Never include secrets, credentials, or unnecessary personal data.

Before appending an entry, confirm that it:

1. has a unique DEV ID and timestamp;
2. distinguishes facts, assumptions, and decisions;
3. preserves meaningful alternatives and trade-offs;
4. names the implementation impact;
5. states required verification without claiming unexecuted success;
6. links related source and tests where applicable;
7. leaves explicit next steps or says `None`.

