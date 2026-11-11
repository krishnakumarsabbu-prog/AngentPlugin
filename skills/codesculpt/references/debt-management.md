# Technical Debt Management

CodeSculpt tracks technical debt so temporary workarounds do not become permanent solutions.

## Debt Record Format

Each debt entry must contain:

```
## DEBT-<id>: <title>
- **Compromise**: What was deferred or worked around.
- **Reason**: Why it was deferred (deadline, missing dependency, incomplete spec, etc.).
- **Risk**: What could go wrong if left unresolved.
- **Remediation**: Recommended fix.
- **Priority**: high | medium | low
- **Introduced**: Date or commit reference.
- **Status**: open | in-progress | resolved
```

## When to Record Debt

Record debt when:
- You implement a workaround instead of the proper solution.
- You skip a test because of time pressure.
- You add a TODO/FIXME/HACK comment.
- You disable a linting rule.
- You increase a timeout instead of fixing the underlying latency.
- You hardcode a value that should be configurable.
- You duplicate code instead of refactoring (and you know it).

## When NOT to Record Debt

Do not record debt when:
- The code is correct and complete — there is no compromise.
- The "debt" is just a style preference. Debt is about risk, not taste.
- The workaround is actually the right solution for the context (e.g., pragmatic simplification).

## Debt Lifecycle

1. **Identified**: A compromise is made during implementation. Record it immediately.
2. **Tracked**: The debt entry is persisted (in the debt log, issue tracker, or code comment with a debt ID).
3. **Prioritized**: The debt is ranked by risk and impact.
4. **Remediated**: The proper solution is implemented. The debt entry is marked resolved.
5. **Verified**: The remediation is tested. The debt entry is closed.

## Anti-Patterns

- Recording debt and never revisiting it. Debt is not an archive — it is a backlog.
- Treating a workaround as permanent. If it has been in place for 3+ months without remediation, it is no longer "temporary".
- Not recording debt because "it's small". Small compromises accumulate.
- Recording debt without a remediation plan. A debt without a fix plan is just a confession.

## Integration with Review and Audit

- During `/codesculpt-review`, check if any new debt was introduced by the diff. Flag unrecorded compromises.
- During `/codesculpt-audit`, scan for TODO/FIXME/HACK comments and existing debt entries. Report on debt that has been open for a long time.
- During `/codesculpt-gain`, report how much debt was resolved vs. introduced in the session.
