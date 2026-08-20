### DEVNOTES Standards

`DEVNOTES.md` is the developer-facing engineering journal for a project. It records engineering decisions, identified failure modes, corrective actions, unresolved questions, and future development plans.

`DEVNOTES.md` is an append-only record.

Existing entries must never be:

* Deleted
* Rewritten
* Reorganized
* Condensed
* Silently corrected
* Replaced with updated information

When a previous entry is incomplete or incorrect, add a new entry that identifies the earlier statement, explains the correction, and records the reason for the change. Preserve the original entry as part of the project’s engineering history.

Each entry should use the following structure:

```markdown
### <Entry Title>

**Date:** YYYY-MM-DD  
**Time:** HH:MM and time zone  
**Engineer:** Name or agent identifier

#### Problem

Describe the issue, requirement, failure mode, open question, or decision that prompted the entry.

#### Solution(s)

Document the solutions considered, attempted, or implemented.

#### Trade-offs

Record the advantages, disadvantages, risks, costs, constraints, and consequences associated with each relevant solution.

#### Final Outcome

State the decision reached, result observed, or current disposition of the problem.

#### Next Steps

List the actions required to continue implementation, validation, or investigation.

#### Deferred Decisions

Record decisions intentionally postponed, including what information or test evidence is required before they can be resolved.
```

Entries should be factual and concise while retaining enough context for a developer or LLM agent to understand why a decision was made.

If a section does not apply, write `None` or `Not applicable` rather than removing the section.