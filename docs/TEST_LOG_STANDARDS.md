# TEST_LOG Standards

`TEST_LOG.md` is the append-only verification record for a project. It records what was tested, why and how it was tested, what was observed, and whether implementation may proceed.

It preserves objective evidence of system behavior over time. It does not replace automated tests, CI output, unit tests, integration tests, or manual QA; it links those activities to engineering decisions and implementation history.

## Core Rule

`TEST_LOG.md` is append-only. Existing entries must never be deleted, rewritten, reorganized, condensed, silently corrected, or replaced with updated results.

If a test was incorrect, incomplete, superseded, or later shown to be unreliable, add a new entry with a new TEST ID that references the earlier result and explains the correction. Failed tests remain in the record after repair.

## Verification Principle

Validate implementation continuously. Every newly created or materially modified implementation file must pass an appropriate validation gate before development proceeds substantially beyond it.

Testing depth must match the architectural significance and risk of the change:

```text
CREATE OR MODIFY FILE
        -> T0 — FILE VALIDATION
MODULE BECOMES USABLE
        -> T1 — MODULE SMOKE TEST
SYSTEM BOUNDARY CONNECTED
        -> T2 — INTEGRATION SMOKE TEST
MILESTONE COMPLETED
        -> T3 — MILESTONE REGRESSION TEST
```

## Test Levels

### T0 — File Validation

Required after every newly created or materially modified implementation file. Verify that the artifact parses or compiles, resolves dependencies, and satisfies its local static contract.

Typical checks include compilation, type checking, linting, import resolution, configuration or schema parsing, static analysis, build verification, and narrow execution where practical. A separate automated test file is not required for every T0 check.

### T1 — Module Smoke Test

Required when a coherent module, service, adapter, repository, component, or feature becomes usable. Exercise its primary responsibility through its public interface.

Examples include creating and retrieving a record, rendering a screen, parsing representative input, or writing and reopening a file.

### T2 — Integration Smoke Test

Required when architectural layers or modules are connected or their boundary changes. Verify that data, control, errors, and state cross the boundary correctly.

Examples include UI to service, service to repository, repository to database, adapter to platform API, and backup service to cloud provider.

### T3 — Milestone Regression Test

Required at a meaningful milestone or after a high-impact change. Verify that established critical behavior still works. Run the relevant existing regression suite plus new tests introduced by the milestone.

Typical triggers include a roadmap phase, vertical slice, major feature, release candidate, review-ready change, migration, authentication or storage change, public-interface change, significant refactor, and critical bug fix.

## Mandatory Triggers

Test or retest when work:

- creates or materially changes implementation;
- changes a public interface, schema, migration, query, serialization format, or configuration contract;
- connects modules or changes data flow;
- changes persistence, storage, backup, restore, authentication, authorization, or permissions;
- fixes a bug or introduces a workaround;
- changes error handling or a critical user workflow;
- completes a milestone or repairs a prior failure.

A material modification can reasonably alter runtime behavior, state, data flow, persistence, contracts, or external interaction. Formatting, comment-only, and documentation-only changes normally do not require behavioral tests, though parsing or static validation is still required when those edits can affect generated or executable artifacts.

## Result Values

Every entry must use exactly one result:

- `PASS` — the test was executed and expected behavior was observed.
- `FAIL` — the test was executed and expected behavior was not observed.
- `BLOCKED` — a required dependency, environment, credential, device, service, authority, or prerequisite prevented completion.
- `NOT_EXECUTED` — the required test was identified but not run; record why.
- `STATIC_ONLY` — only static analysis such as compilation, linting, type checking, parsing, or inspection was performed.
- `PARTIAL` — only part of the procedure completed; identify completed and omitted portions.

## Evidence Rule

Never record `PASS` unless the defined test was actually executed and its expected observable result occurred.

`The code looks correct`, `this should work`, and similar judgments are not test evidence. Compilation may support a T0 PASS when compilation is the complete stated objective; it must not be represented as runtime verification.

Evidence should include the relevant command, runner or CI result, log excerpt, query result, screenshot or artifact reference, environment, device, or precise manual observation. Summarize large output and preserve or link the durable artifact when practical. Never include secrets.

## Failure and Retest Rule

After a failure:

1. Preserve the failed entry.
2. Record analysis or a material corrective decision in `DEVNOTES.md` when warranted.
3. Correct the implementation.
4. Execute the relevant test again.
5. Add a new TEST entry referencing the failed TEST ID and related DEV ID.

A retest always receives a new ID.

## Blocking Behavior

The default disposition after a failed T1, T2, or T3 test is `BLOCK IMPLEMENTATION PROGRESSION`.

Work may continue only to investigate or correct the failure, or when an authorized engineering decision explicitly accepts the limitation in `DEVNOTES.md`. That DEV entry must state the scope, risk, owner, and resolution condition. Never silently proceed past a known failed critical test.

`BLOCKED`, `NOT_EXECUTED`, `STATIC_ONLY`, and `PARTIAL` do not establish runtime correctness. Their disposition must state what verification remains.

## Smoke Tests and Regression Suite

A smoke test should answer one narrow, critical question. Avoid combining unrelated behavior into one procedure.

Create a new smoke test when a critical behavior is introduced and existing tests do not cover it. Behavior is critical when failure could prevent startup or a primary workflow, lose or corrupt data, break a system boundary, invalidate security or recovery, create incorrect persistent state, or materially violate the product specification.

Once established, a critical smoke test remains in the regression suite unless explicitly superseded. Avoid redundant tests that add no meaningful coverage.

## Test IDs

Every recorded test has a unique identifier:

```text
TEST-YYYY-MM-DD-NNN
```

Example: `TEST-2026-08-21-014`. The numeric suffix increments for tests recorded that date. Never reuse an ID.

## Required Entry Format

```markdown
### TEST-YYYY-MM-DD-NNN — <Test Name>

**Date:** YYYY-MM-DD  
**Time:** HH:MM and time zone  
**Tester:** Human name or agent identifier  
**Level:** T0 | T1 | T2 | T3  
**Result:** PASS | FAIL | BLOCKED | NOT_EXECUTED | STATIC_ONLY | PARTIAL

#### Scope

Identify the file, module, interface, boundary, workflow, or milestone.

#### Files Under Validation

- path/to/file

Use `Not applicable` when no specific source file applies.

#### Objective

State one exact behavior or validation property.

#### Preconditions

Record required state, data, configuration, credentials, environment, hardware, or setup. Use `None` when applicable.

#### Procedure

Record the actual repeatable steps performed.

#### Expected Result

Describe the observable result required to pass.

#### Actual Result

Describe what actually occurred. Do not substitute the expected result.

#### Evidence

Record commands, output summaries, artifact paths, CI jobs, logs, screenshots, queries, devices, environments, or manual observations.

#### Failures / Observations

Record anomalies, warnings, side effects, timing issues, or `None`.

#### Related DEVNOTES

List related DEV IDs or `None`.

#### Related Tests

List predecessor, failed, regression, or superseded TEST IDs, or `None`.

#### Disposition

State whether implementation may proceed and what validation or corrective work remains.
```

Do not remove a section. Use `None` or `Not applicable` when appropriate.

## Example Entry

```markdown
### TEST-2026-08-21-001 — Entry service static validation

**Date:** 2026-08-21  
**Time:** 16:45 America/New_York  
**Tester:** Development agent  
**Level:** T0  
**Result:** STATIC_ONLY

#### Scope

`src/services/entryService.ts`

#### Files Under Validation

- src/services/entryService.ts

#### Objective

Verify that EntryService compiles, resolves imports, and satisfies declared TypeScript contracts.

#### Preconditions

Project dependencies installed.

#### Procedure

1. Run TypeScript validation.
2. Run project lint.
3. Check for unresolved imports.

#### Expected Result

No associated TypeScript, import-resolution, or lint errors.

#### Actual Result

Validation completed with no reported errors for EntryService.

#### Evidence

- `npx tsc --noEmit`
- `npm run lint`

#### Failures / Observations

Runtime behavior was not exercised.

#### Related DEVNOTES

None.

#### Related Tests

None.

#### Disposition

Static validation complete. Runtime T1 validation remains required when the module becomes usable.
```

## Relationship to Annotations and DEVNOTES

The three standards divide responsibility:

| Record | Answers |
|---|---|
| Source annotations | What does this code do, and what local constraints govern it? |
| `DEVNOTES.md` | Why was this engineering decision made? |
| `TEST_LOG.md` | What was actually tested, and what happened? |

Use DEV IDs in test entries when a test verifies a material decision or corrective action. Add TEST IDs to source annotations only when a specific regression relationship is useful; do not turn source comments into a test history.

## Completion Checklist

Before allowing work to proceed, confirm that:

1. all required T0 checks for modified implementation files are recorded;
2. new usable modules and boundaries have appropriate T1 or T2 coverage;
3. the result reflects execution honestly;
4. evidence and environment are sufficient to interpret the result;
5. failures and incomplete verification have explicit dispositions;
6. related DEV and TEST IDs are linked;
7. relevant critical tests are retained for T3 regression.
