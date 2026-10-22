---
name: sentry-cross-cutting-concurrency
description: Deep-dive review guide on asynchronous programming, race conditions, locks, and deadlocks.
---

# Sentry Cross-Cutting: Asynchronous & Concurrency Patterns

Concurrency bugs are notorious for slipping past basic unit tests and surfacing only under production load.

---

## Critical Concurrency Patterns

### 1. Deadlock Prevention
- Always acquire multi-resource locks in a consistent global order across all services.
- Always configure timeout bounds on lock acquisition attempts (`acquire(timeout=5s)`).

### 2. Double-Checked Locking & Race Invalidation
- When lazy-initializing shared singletons or caches under multi-threading, verify state inside the synchronized lock block to prevent multiple initializations.

### 3. Atomic Updates & Optimistic Locking
- For database updates modifying balance or inventory, use atomic increments (`UPDATE accounts SET balance = balance - 10 WHERE id = 1 AND balance >= 10`) or version numbers rather than read-modify-write patterns.
