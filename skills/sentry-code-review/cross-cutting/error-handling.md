---
name: sentry-cross-cutting-error-handling
description: Deep-dive review guide on robust exception handling, error hierarchy, and fail-fast principles.
---

# Sentry Cross-Cutting: Error Handling Principles

Robust error handling ensures systems fail safely, provide actionable telemetry, and never swallow operational faults silently.

---

## Error Handling Review Invariants

### 1. Never Swallow Exceptions Silently
- **Anti-Pattern**: Empty `catch (e) {}` blocks or `except Exception: pass`.
- **Remediation**: At minimum log the exception with stack trace and rethrow, or return an explicit typed error result.

### 2. Differentiate Operational vs Programmer Errors
- **Operational Errors**: Expected runtime conditions (network timeout, invalid user input, rate limit). Handle gracefully with user feedback or retry.
- **Programmer Errors**: Bugs (null dereferences, assertion failures, invalid casts). Fail fast and crash the worker or request transaction to prevent state corruption.

### 3. Error Wrapping & Causal Chains
- When catching low-level errors and throwing domain errors, preserve the original cause (`new DomainError("failed order", { cause: err })`).
