---
name: anvil-shrink-test-output
description: Test runner output compressor (Jest, Vitest, pytest, JUnit, Go test). Suppresses passing test noise, preserves failure diffs and summary tallies.
---

# Anvil Shrink: Test Runner Compression

Test runners (Vitest, Jest, pytest, cargo test, go test) print hundreds of lines showing passing tests (`✓ test passed`). When a failure occurs, the model only needs the failing test name, assertion error message, and code diff.

---

## Test Output Normalization Rules

### 1. Passing Test Suppression
- Strip all lines indicating passed assertions (`✓`, `PASSED`, `ok`, `.` in dot-mode).
- Strip progress bars and intermediate timing indicators.

### 2. Failure Isolation
For each failing test, retain:
- The suite and test name (`FAIL tests/auth.test.ts > authenticates user`).
- Expected vs Received assertion diff.
- Exact source line and column of the failed expectation.

### 3. Summary Tallies
Always preserve the final summary line:
```text
Tests: 2 failed, 148 passed, 150 total
Snapshots: 0 failed, 12 passed
Time: 4.12s
```

---

## Example Transformation

### Before (Verbose Test Run):
```text
 RUN  v1.6.0 /app

 ✓ tests/user.test.ts (12 tests) 24ms
 ✓ tests/db.test.ts (8 tests) 15ms
 ❯ tests/billing.test.ts (4 tests | 1 failed) 38ms
   ✓ calculates base price
   ❯ applies enterprise discount
     AssertionError: expected 80 to equal 75
      - Expected: 75
      + Received: 80
        at tests/billing.test.ts:42:25
   ✓ handles zero quantity
   ✓ formats currency string
 ✓ tests/mailer.test.ts (15 tests) 31ms

 Test Files  1 failed | 3 passed (4)
      Tests  1 failed | 38 passed (39)
   Duration  412ms
```

### After (Anvil Shrink):
```text
FAIL tests/billing.test.ts > applies enterprise discount
AssertionError: expected 80 to equal 75
  - Expected: 75
  + Received: 80
  at tests/billing.test.ts:42:25

Tests: 1 failed, 38 passed, 39 total
```
Token reduction: ~81%.
