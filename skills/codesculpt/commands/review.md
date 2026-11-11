# /codesculpt-review

Reviews the current diff or changeset for bugs, unnecessary complexity, security weaknesses, missing tests, and performance issues.

## Invocation

```
/codesculpt-review          # Review the current uncommitted diff
/codesculpt-review <ref>    # Review changes since the given git ref (e.g., main, HEAD~3)
```

## Process

1. Obtain the diff. If no git ref is provided, use `git diff` (unstaged) or `git diff --cached` (staged). If neither has changes, review files modified in the current session.

2. For each changed file:
   - Identify what changed (new file, modified logic, config change, test change, deletion).
   - Run the review dimensions from `references/review-methodology.md`.

3. Collect findings. For each finding:
   - Assign severity: BLOCKING, WARNING, NIT.
   - Assign category: bug, complexity, security, missing-tests, performance, maintainability.
   - Record the file and line.
   - Write a concrete recommended fix. For BLOCKING findings, provide copy-pasteable code.

4. Sort findings by severity.

5. Output the review report:
   ```
   # CodeSculpt Review

   ## Summary
   Files reviewed: N
   Findings: X BLOCKING, Y WARNING, Z NIT
   Assessment: APPROVE | REQUEST CHANGES | BLOCK

   ## Findings

   [BLOCKING] <category> — <file>:<line>
   <description>
   Fix: <recommended fix>

   ...

   ## Top 3 Issues to Fix
   1. ...
   2. ...
   3. ...
   ```

## Rules

- Do not review files that are not part of the diff (unless explicitly asked for a full-file review).
- Do not flag style preferences as BLOCKING. Style is a NIT.
- Always cite file and line. A finding without a location is not actionable.
- Always provide a fix. A finding without a fix is a complaint, not a review.
- If the diff is clean, say so explicitly. Do not manufacture findings to seem thorough.
