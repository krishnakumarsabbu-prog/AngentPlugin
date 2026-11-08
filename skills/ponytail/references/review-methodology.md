# Ponytail Review Methodology

The review mode examines the current diff or changeset and produces a prioritized findings report.

## Review Process

1. **Obtain the diff**: Use `git diff` or the provided changeset. If no diff is available, review the files that were modified in the current session.

2. **Classify each change**: For every modified file, categorize the change as:
   - New file
   - Modified logic
   - Modified configuration
   - Deleted code
   - Test changes

3. **Analyze each change against the review dimensions** (below).

4. **Produce findings**: For each issue found, create a finding with severity, category, location, description, and recommended fix.

5. **Prioritize**: Sort findings by severity (BLOCKING first, then WARNING, then NIT).

## Review Dimensions

### Bugs
- Off-by-one errors in loops and boundaries.
- Null/undefined dereference without guard.
- Incorrect comparison operator (`=` vs `==` vs `===`).
- Missing return statement in a branch.
- Resource leak (file handle, connection, lock not released).
- Race condition or concurrent access without synchronization.
- Mutation of shared state without intent.

### Unnecessary Complexity
- Abstraction with only one call site.
- Interface with only one implementation.
- Generic type parameter that is always the same type.
- Factory that only creates one kind of object.
- Wrapper function that adds no behavior.
- Deep nesting that could be early-returned.

### Security Weaknesses
- User input reaching a sink without validation (SQL, shell, eval, DOM).
- Hardcoded secret, token, or credential.
- Broadened access control (removed auth check, expanded role).
- Insecure crypto (MD5, hardcoded IV, ECB mode).
- Path traversal (user-controlled path without normalization).
- SSRF (user-controlled URL fetched server-side).

### Missing Tests
- New public function without tests.
- New branch in existing function not covered.
- Edge case not tested (empty, null, max, concurrent).
- Test that was deleted or weakened.

### Performance Issues
- N+1 query pattern (query inside a loop).
- O(n²) algorithm where O(n) is achievable.
- Synchronous I/O in a hot path.
- Unbounded collection growth.
- Redundant computation (same result computed twice).

### Maintainability
- Function longer than 50 lines.
- File longer than 300 lines without clear cohesion.
- Circular dependency introduced.
- Naming that does not describe what the code does.
- Comment that describes what instead of why.

## Finding Format

```
[BLOCKING] bug — src/auth.ts:42
  Finding: User input `redirectUrl` is used directly in `res.redirect()` without validation.
  Risk: Open redirect — attacker can redirect users to malicious sites.
  Fix: Validate against an allowlist of domains before redirecting.
    if (!ALLOWED_REDIRECT_DOMAINS.has(new URL(redirectUrl).hostname)) {
      throw new Error("Disallowed redirect target");
    }
```

## Severity Guidelines

- **BLOCKING**: Must be fixed before merge. Security vulnerability, data loss risk, or certain bug.
- **WARNING**: Should be fixed before merge. Likely bug, missing test for critical path, or maintainability concern that will compound.
- **NIT**: Optional improvement. Style, naming, minor simplification. Do not block merge.

## Review Output

End the review with a summary:
- Total findings: X BLOCKING, Y WARNING, Z NIT
- Overall assessment: APPROVE / REQUEST CHANGES / BLOCK
- Top 3 issues to fix first (by severity and impact)
