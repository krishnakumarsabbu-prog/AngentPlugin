# /codesculpt-debt

Tracks technical debt — records deferred shortcuts, known compromises, and their risks.

## Invocation

```
/codesculpt-debt                     # List all open debt entries
/codesculpt-debt add                 # Record a new debt entry interactively
/codesculpt-debt resolve <id>        # Mark a debt entry as resolved
/codesculpt-debt report              # Generate a debt summary report
```

## Debt Entry Format

```
## DEBT-001: Hardcoded retry limit
- Compromise: Retry limit is hardcoded to 3 instead of being configurable.
- Reason: Config system was not ready at implementation time; deadline pressure.
- Risk: Changing the retry limit requires a code change and redeployment.
- Remediation: Move the value to the config system once it supports runtime overrides.
- Priority: medium
- Introduced: 2026-10-15 (commit abc123)
- Status: open
```

## Rules

- Every debt entry must have all fields filled. No field may be left empty.
- "Reason" must explain why the compromise was made, not just that it was made.
- "Remediation" must be actionable — a specific next step, not "fix it later".
- "Priority" must reflect the risk, not the convenience of fixing it.
- Do not record style preferences as debt. Debt is about risk and compromise.
- When resolving, record what was done and verify tests pass.

## Report Format

```
# Technical Debt Report

## Summary
- Total entries: N
- Open: N (high: X, medium: Y, low: Z)
- Resolved: N

## Open Debt by Priority

### High
1. DEBT-003: <title> — <risk summary>

### Medium
...

### Low
...

## Oldest Open Debt
1. DEBT-001: <title> — open since <date> (<N> days)
   ...
```
