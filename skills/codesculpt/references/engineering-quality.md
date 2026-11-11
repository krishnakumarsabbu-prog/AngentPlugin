# Engineering Quality Guardrails

These guardrails are non-negotiable. Never sacrifice them for brevity, minimalism, or speed.

## Security

- **Input validation**: Validate all external input at system boundaries (HTTP requests, CLI args, file paths, env vars). Trust internal code after validation.
- **Authentication**: Do not weaken or bypass auth checks. If a change affects auth flow, verify it does not create an access control gap.
- **Authorization**: Preserve role/permission checks. Do not broaden access inadvertently.
- **Secrets handling**: Never log secrets, tokens, or credentials. Never hardcode them. Use environment variables or a secret manager.
- **Injection prevention**: Use parameterized queries, not string concatenation. Escape output. Never pass user input to `eval`, `exec`, or shell commands without sanitization.

## Input Validation

- Validate at boundaries (API entry points, file loaders, user input handlers).
- Use type-safe parsers. Do not trust `JSON.parse` output without shape validation.
- Reject early, fail fast. Do not propagate invalid data through the system.
- Trust internal code that has already validated. Do not re-validate the same data 5 times.

## Error Handling

- Surface errors visibly. A swallowed exception is worse than a crash.
- Do not catch errors just to re-throw them unchanged. Let them propagate.
- Use specific error types, not generic `Error("something went wrong")`.
- Log the error with enough context to diagnose it (input, operation, stack trace).
- Never use empty catch blocks. If you must swallow, document why with a comment.

## Data Integrity

- Do not corrupt or lose user data. If an operation might fail partway, use a transaction or atomic write.
- Do not silently overwrite existing data. Confirm destructive operations.
- Validate data before writing. Do not write invalid state to persistent storage.
- Backward compatibility: do not break existing data formats without a migration path.

## Accessibility

- Maintain ARIA attributes on interactive elements.
- Preserve keyboard navigation. Do not remove `tabindex` or focus management.
- Maintain color contrast ratios (WCAG AA minimum: 4.5:1 for normal text).
- Do not remove `alt` text from images or `label` associations from form fields.
- Test with a screen reader when making structural UI changes.

## Correctness

- The solution must actually solve the stated problem. Do not solve a different, easier problem.
- Test edge cases: empty input, null, very large input, concurrent access.
- Do not break existing behavior. Run the test suite before and after changes.
- If a test fails after your change, fix the change, not the test (unless the test was wrong).

## Regression Tests

- Do not remove tests that protect existing behavior.
- Do not weaken assertions to make a test pass.
- If you change behavior, update the test to reflect the new expected behavior — and verify the new behavior is correct.
- Add tests for new code. If you wrote code, write a test for it.
- Run the full test suite, not just the tests for the files you touched.

## Guardrail Checklist (Pre-Commit)

Before marking work complete, verify:
- [ ] No security validation was removed or weakened.
- [ ] No error handling was silenced or removed.
- [ ] No tests were deleted or weakened.
- [ ] No user data can be lost or corrupted by the change.
- [ ] No accessibility attributes were removed.
- [ ] The test suite passes.
- [ ] No new dependency was added without justification.
- [ ] No new abstraction was added without at least two concrete call sites.
