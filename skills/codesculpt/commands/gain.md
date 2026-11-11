# /codesculpt-gain

Reports the engineering gain from the current session — what was accomplished, what was reused, what was tested.

## Invocation

```
/codesculpt-gain                     # Report gain for the current session
/codesculpt-gain <ref>               # Report gain since the given git ref
```

## Metrics to Report

Report only metrics that are actually available. Do not fabricate.

### Code Changes
- New lines of code added (from the diff).
- Modified lines of code (from the diff).
- Deleted lines of code (from the diff).
- Net lines: added - deleted.

### Reuse
- Reused existing implementations: count and list which functions/modules were reused instead of reimplemented.
- Dependencies leveraged: which already-installed libraries were used.

### Dependencies
- Dependencies added: count and list (from manifest changes).
- Dependencies removed: count and list.

### Tests
- Tests executed: count (if the test runner was invoked).
- Tests passed: count.
- Tests failed: count.
- New tests added: count.

### Token Consumption (when available)
- Input tokens consumed (from provider telemetry).
- Output tokens consumed (from provider telemetry).
- Estimated cost (if pricing is known).

Do not report token savings you did not measure. If telemetry is not available, state: "Token metrics unavailable — no provider telemetry in this session."

### Execution Time (when available)
- Session duration (if the runtime tracks it).
- Per-operation time (if the runtime provides it).

## Output Format

```
# CodeSculpt Engineering Gain

## Code Changes
- Lines added: N
- Lines modified: N
- Lines deleted: N
- Net: +N / -N

## Reuse
- Reused implementations: N
  - function X from module Y (instead of reimplementing)
  - ...

## Dependencies
- Added: 0
- Removed: 0

## Tests
- Executed: N
- Passed: N
- Failed: 0
- New tests: N

## Token Consumption
- Input: N tokens (from telemetry)
- Output: N tokens (from telemetry)
- Or: Token metrics unavailable — no provider telemetry in this session.

## Execution Time
- Session duration: Nm Ns
- Or: Time metrics unavailable.
```

## Rules

- Never fabricate metrics. If a metric is not available, say so.
- Count reuse honestly: only count cases where you explicitly chose reuse over new implementation.
- Distinguish "tests executed" from "tests that exist". If you did not run the test suite, do not report test counts.
- Token consumption must come from actual provider telemetry, not estimates.
