# Reliability and Resilience

## Objective

Assess fault tolerance, retries, timeouts, circuit breakers, idempotency,
graceful degradation, and data integrity.

## Assessment Areas

### Fault Tolerance
- Are failures isolated (bulkhead pattern)?
- Can the system degrade gracefully when a dependency fails?
- Are critical operations resilient to partial failures?
- Are there bulkheads (separate thread pools, separate connections) for critical vs. non-critical work?

### Retries & Timeouts
- Are retries configured for transient failures?
- Is exponential backoff with jitter used?
- Is the max retry count bounded to prevent retry storms?
- Are timeouts configured for all external calls (HTTP, database, queue)?
- Are timeout values appropriate (not too short, not too long)?

### Circuit Breakers
- Are circuit breakers configured for external dependencies?
- Are breaker thresholds (failure rate, window size) appropriate?
- Is there a half-open state for probing recovery?
- Is fallback behavior defined when the breaker is open?

### Idempotency
- Are state-mutating operations (payments, bookings, writes) idempotent?
- Is idempotency enforced via idempotency keys or deduplication?
- Can retries produce duplicate side effects?

### Graceful Degradation
- Does the system degrade gracefully when a non-critical dependency fails?
- Is cached data served when the source is unavailable?
- Are feature flags used to disable non-essential functionality under load?
- Are error responses meaningful (not stack traces)?

### Data Integrity
- Are transactions used where ACID guarantees are required?
- Is optimistic or pessimistic concurrency control used appropriately?
- Are checksums or validation used for data in transit and at rest?
- Are there constraints (foreign keys, unique, check) at the database level?
- Is eventual consistency documented where used?

## Measurable Criteria Examples

- "Error rate < 0.1% of requests over rolling 5-minute window"
- "All external calls have timeouts configured (no unbounded waits)"
- "Payment operations are idempotent via idempotency key"
- "Circuit breaker opens after 5 consecutive failures within 10 seconds"

## Resilience Pattern Checklist

- [ ] Retry with exponential backoff and jitter
- [ ] Timeouts on all external calls
- [ ] Circuit breakers on external dependencies
- [ ] Bulkheads for critical vs. non-critical work
- [ ] Idempotency for state-mutating operations
- [ ] Graceful degradation for non-critical dependencies
- [ ] Dead letter queues for failed messages
- [ ] Rate limiting to protect downstream services

## Standards Reference

Google SRE principles — graceful degradation, cascading failure prevention.
ISO/IEC 25010:2023 — Reliability characteristic (maturity, fault tolerance,
recoverability). Used as guidance only.
