# Annotation Standards

Source annotations make a file's responsibility, contracts, and non-obvious reasoning clear to human developers and software agents without duplicating the implementation.

Annotations are the code-local layer of the project's engineering record. They explain what the code is responsible for and why a particular detail exists. Broader decisions belong in `DEVNOTES.md`; verification results belong in `TEST_LOG.md`.

## Governing Principles

- Explain intent, constraints, assumptions, units, side effects, and non-obvious reasoning.
- Do not narrate syntax or repeat names that are already clear.
- Keep documentation close to the code it describes and update it in the same change.
- Prefer clear names and structure over comments that compensate for unclear code.
- Never use a comment to claim that behavior was tested. Cite a `TEST_LOG.md` test ID when verification history is relevant.
- Never preserve obsolete guidance as if it were current. Update code annotations when behavior changes; preserve the historical decision in `DEVNOTES.md` and the evidence in `TEST_LOG.md`.

## File Headers

Every project-authored source file must begin with a header appropriate to its language. Generated files, vendored dependencies, lockfiles, data files, and files whose format cannot safely contain comments are exempt.

Each header must identify:

- file name or repository-relative path;
- purpose and primary responsibility;
- author, owner, or contributors;
- contact information or the project's canonical contact location;
- project license, or a file-specific license when different;
- important architectural constraints when they are not apparent from the file;
- related `DEVNOTES.md` IDs when a decision materially governs the file.

Use `Pending confirmation` for required ownership, contact, or licensing information that is genuinely unknown. Do not invent it.

Example:

```c
/*
 * File: src/geometry.c
 *
 * Purpose:
 *     Validate room coordinates and calculate placement geometry.
 *
 * Author:
 *     Michael Garcia
 *
 * Contact:
 *     michael@mandedesign.studio
 *
 * License:
 *     SPDX-License-Identifier: MPL-2.0
 *
 * Related Decisions:
 *     DEV-2026-08-21-003
 */
```

Use the native documentation convention of the language when one exists. Preserve the required information rather than copying the comment syntax literally.

## Function and Type Documentation

Document every project-authored function or method that:

- is longer than a single line;
- has behavior that is not immediately obvious to a beginner or subsystem newcomer;
- crosses an architectural boundary;
- mutates state, performs I/O, or has material side effects;
- enforces a business, safety, security, persistence, or compatibility rule;
- uses non-obvious units, coordinate systems, error behavior, or ownership rules.

Trivial accessors, declarative callbacks, framework boilerplate, and self-explanatory one-line functions may omit a function header unless a material contract would otherwise be hidden.

Function documentation must cover these four concerns:

```text
Purpose: Why the function exists.
Design: Why it has this structure and which constraints govern it.
Workflow: Where it is called and what inputs or state it expects.
Data Handoff: What it returns, changes, emits, or passes onward, and who consumes it.
```

Use the language's standard doc-comment fields for parameters, return values, thrown errors, and side effects when those details are not already clear from the signature.

Example:

```c
/*
 * Purpose: Provide the UI and tracking services with one canonical wall-distance result.
 * Design: Use integer centimetres in the lower-left room coordinate frame. Reject invalid points instead of silently clamping them.
 * Workflow: Called after room and point validation; subtracts the point from room dimensions.
 * Data Handoff: Writes a WallDistances result consumed by crosshair labels, snapping rules, and API serialization.
 */
bool wall_distances(
    const Room *room,
    const Point *point,
    WallDistances *distances
);
```

Apply the same standard to classes, interfaces, modules, schemas, and public types when they carry a non-obvious contract.

## Inline Comments

Use inline comments for local facts that cannot be expressed clearly through names or structure, including:

- the reason for an integer type or width;
- the unit or coordinate system of a value;
- the meaning of a constant, mask, register, status, or protocol value;
- a non-obvious algorithmic step;
- hardware- or platform-specific behavior;
- safety, security, concurrency, timing, or compatibility constraints;
- a deliberate workaround or surprising invariant.

Workarounds and temporary constraints should cite the applicable DEVNOTES ID. If they are validated by a specific regression test, they may also cite its TEST ID.

```text
// Preserve insertion order for backup compatibility; see DEV-2026-08-21-004.
// Regression coverage: TEST-2026-08-21-011.
```

## TODO and FIXME Notes

Action notes must be specific and traceable. Use:

```text
TODO(DEV-YYYY-MM-DD-NNN): <required follow-up>
FIXME(DEV-YYYY-MM-DD-NNN): <known incorrect or unsafe behavior>
```

Create the referenced DEVNOTES entry before or with the annotation. Do not use anonymous TODOs for material work.

## Relationship to DEVNOTES and TEST_LOG

Use the smallest appropriate record:

| Information | Record it in |
|---|---|
| Current file or function responsibility | Source annotation |
| Local invariant, unit, side effect, or implementation rationale | Source annotation |
| Alternatives, trade-offs, accepted risks, deferred decisions | `DEVNOTES.md` |
| Commands run, observed behavior, pass/fail status, test evidence | `TEST_LOG.md` |

Cross-reference rather than copying long explanations. A typical trace is:

```text
source annotation -> DEV decision ID -> TEST evidence ID
```

Not every annotation needs a cross-reference. Add one when the code is governed by a material decision, workaround, known limitation, or regression requirement.

## Prohibited Practices

Avoid:

- comments that merely restate the next line;
- large documentation walls that obscure implementation;
- stale or speculative claims presented as fact;
- unnecessarily compressed code that requires compensating commentary;
- test claims unsupported by `TEST_LOG.md` evidence;
- passwords, credentials, personal data, or other secrets;
- change-history blocks that duplicate version control or `DEVNOTES.md`;
- silently removing documentation for an invariant that still applies.

## Review Checklist

Before completing a source change, confirm that:

1. The file header is present or the file is legitimately exempt.
2. Material functions, types, side effects, and constraints are documented.
3. Comments describe current behavior and reasoning.
4. Material decisions and workarounds cite a DEV ID.
5. Any cited TEST ID exists in `TEST_LOG.md`.
6. No comment claims unexecuted verification.
7. The source change received the validation required by `TEST_LOG_STANDARDS.md`.
