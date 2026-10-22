# Error Handling Principles — Cross-Language Guide

> Cross-language reference on core error-handling principles, pervasive anti-patterns, error taxonomy design, and structured logging practices.

## Table of Contents

- [Core Principles](#core-principles)
- [Pervasive Anti-Patterns](#pervasive-anti-patterns)
- [Error Hierarchy Design](#error-hierarchy-design)
- [Logging & Observability Best Practices](#logging--observability-best-practices)
- [Cross-Language Code Examples](#cross-language-code-examples)
- [Review Checklist](#review-checklist)

---

## Core Principles

### Principle 1: Never Swallow Errors Silently
Every error must be consciously handled: propagated up the call stack, recorded in observability telemetry with appropriate fallback, or converted into an actionable domain fault. **Never** ignore errors with empty handlers.

```
Execution Seam:
  result = risky_operation()
  if error:
      Option 1: Return error to caller (propagation)
      Option 2: Log and return graceful fallback (degradation)
      Option 3: Panic / crash intentionally (unrecoverable state)
```

### Principle 2: Enrich Errors with Contextual Metadata
Error messages must include the **operation attempted** and **key entity identifiers** so on-call engineers can triage failures without stepping through internal stack traces.

```
❌ Opaque:   "failed"
✅ Actionable: "failed to process order #12345: payment gateway timeout after 30s"
```

### Principle 3: Use Strongly-Typed Error Classes
Distinguish causes using dedicated exception or error types so callers can handle transient vs permanent failures programmatically.

```
❌ Generic: throw new Error("something went wrong")
✅ Typed:   throw new OrderNotFoundError(orderId)
✅ Typed:   throw new PaymentTimeoutException(gatewayName, timeoutMs)
```

### Principle 4: Fail Fast via Precondition Validation
Validate all input preconditions and invariants at the entry boundary. Prevent expensive computations or partial mutations from executing when prerequisites are unmet.

```python
# ❌ Executing expensive work before checking prerequisites
def process(data, config):
    result = expensive_computation(data)  # Consumes resources and 5 seconds
    if not config.valid:
        raise ValueError("invalid config")  # Wasted computation

# ✅ Validating preconditions first
def process(data, config):
    if not config.valid:
        raise ValueError("invalid config")
    result = expensive_computation(data)
```

### Principle 5: Handle an Error Exactly Once
Avoid logging, wrapping, and returning an error simultaneously at every layer of the call stack. Multiple logging calls create noisy, duplicate log streams. Either log and handle, or wrap and propagate.

```go
// ❌ Anti-pattern: Logging and returning at intermediate layers
if err != nil {
    log.Error("failed", err) // Intermediate noise
    return err
}

// ✅ Idiomatic: Wrap with context and let the entrypoint log
if err != nil {
    return fmt.Errorf("fetching customer %s: %w", customerID, err)
}
```

---

## Pervasive Anti-Patterns

### Anti-Pattern 1: Empty Exception Handlers

```python
# ❌ Bare except swallows everything, including KeyboardInterrupt
try:
    result = risky()
except:
    pass

# ✅ Targeted exception catch with explicit logging or mitigation
try:
    result = risky()
except FileNotFoundError as e:
    logger.warning("Cache file missing, falling back to default", exc_info=True)
    result = DEFAULT_VALUE
```

```typescript
// ❌ Silent catch block hides fatal runtime errors
try {
  await execute();
} catch (e) {}

// ✅ Explicit error capture with typed fallback
try {
  await execute();
} catch (error) {
  logger.error("Execution failed", { error });
  throw new ProcessingError("Execution failed", { cause: error });
}
```

### Anti-Pattern 2: Catching Generic Base Exceptions
Catching `Exception`, `Throwable`, or `catch (e: any)` indiscriminately intercepts programming bugs (e.g. `NullPointerException`, `ReferenceError`) that should crash or trigger alert pipelines.

### Anti-Pattern 3: Loss of Root Cause Stack Traces
Re-instantiating a new error without passing the inner exception destroys the diagnostic stack trace.

```java
// ❌ Drops original stack trace
try {
    dao.save(entity);
} catch (SQLException e) {
    throw new ServiceException("Save failed: " + e.getMessage());
}

// ✅ Chaining root cause exception
try {
    dao.save(entity);
} catch (SQLException e) {
    throw new ServiceException("Save failed for entity " + entity.getId(), e);
}
```

---

## Error Hierarchy Design

Organize errors by architectural domain:

```
AppError (Base domain error)
├── ValidationError (Invalid inputs, unparseable payloads) [400 Bad Request]
├── AuthenticationError (Missing or invalid credentials) [401 Unauthorized]
├── AuthorizationError (Insufficient permissions) [403 Forbidden]
├── NotFoundError (Entity does not exist) [404 Not Found]
├── ConflictError (Concurrent edits, duplicate keys) [409 Conflict]
└── InfrastructureError (External API timeout, database down) [503 Service Unavailable]
```

---

## Logging & Observability Best Practices

1. **Structured Key-Value Logging**: Use JSON or key-value format rather than raw string interpolation.
   ```json
   {"level": "error", "message": "payment failed", "order_id": 12345, "gateway": "stripe", "duration_ms": 320}
   ```
2. **Log at System Boundaries**: Let low-level libraries propagate wrapped errors. Log at the HTTP middleware, RPC interceptor, or background job worker boundary.
3. **Redact Sensitive Data**: Never log passwords, API tokens, credit card PANs, or personal identifiable information (PII).

---

## Cross-Language Code Examples

### Go: Error Wrapping & Sentinel Checks

```go
// ✅ Wrapping errors with %w and checking with errors.Is / errors.As
var ErrNotFound = errors.New("resource not found")

func GetUser(id string) (*User, error) {
    user, err := db.FindUser(id)
    if err != nil {
        if errors.Is(err, sql.ErrNoRows) {
            return nil, fmt.Errorf("%w: user %s", ErrNotFound, id)
        }
        return nil, fmt.Errorf("querying user %s: %w", id, err)
    }
    return user, nil
}
```

### TypeScript: Custom Error with Cause Chain

```typescript
// ✅ Leveraging Error.cause (ES2022+)
class DatabaseError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'DatabaseError';
  }
}

async function loadUser(id: string): Promise<User> {
  try {
    return await pool.query('SELECT * FROM users WHERE id = $1', [id]);
  } catch (error) {
    throw new DatabaseError(`Failed to load user ${id}`, { cause: error });
  }
}
```

### Rust: thiserror & anyhow

```rust
// ✅ Domain errors with thiserror; application errors with anyhow
use thiserror::Error;

#[derive(Error, Debug)]
pub enum OrderError {
    #[error("Order {0} not found")]
    NotFound(String),
    #[error("Insufficient stock for item {0}")]
    OutOfStock(String),
    #[error("Payment processing error: {0}")]
    PaymentFailed(#[from] PaymentError),
}
```

---

## Review Checklist

### Propagation & Root Cause
- [ ] No empty `catch` or `except` blocks anywhere in the changeset.
- [ ] Original root cause exceptions preserved when wrapping errors (`cause` / `%w`).
- [ ] Targeted exception types caught; avoids catching generic top-level exceptions.

### Quality & Diagnostics
- [ ] Error messages clearly explain the operation attempted and entity ID.
- [ ] Errors are handled or logged once; no duplicate logging across intermediate layers.
- [ ] Preconditions validated upfront (Fail-Fast).
- [ ] Zero secrets, credentials, or PII exposed in error strings or logs.
