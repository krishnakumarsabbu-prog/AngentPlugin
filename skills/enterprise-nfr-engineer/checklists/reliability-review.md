# Reliability Review Checklist

## Fault Tolerance

- [ ] Failures isolated (bulkhead pattern)
- [ ] System degrades gracefully when a dependency fails
- [ ] Critical operations resilient to partial failures
- [ ] Bulkheads for critical vs. non-critical work

## Retries & Timeouts

- [ ] Retries configured for transient failures
- [ ] Exponential backoff with jitter used
- [ ] Max retry count bounded
- [ ] Timeouts configured for all external calls
- [ ] Timeout values appropriate

## Circuit Breakers

- [ ] Circuit breakers configured for external dependencies
- [ ] Breaker thresholds appropriate
- [ ] Half-open state for probing recovery
- [ ] Fallback behavior defined

## Idempotency

- [ ] State-mutating operations are idempotent
- [ ] Idempotency keys or deduplication used
- [ ] Retries do not produce duplicate side effects

## Graceful Degradation

- [ ] System degrades when non-critical dependency fails
- [ ] Cached data served when source unavailable
- [ ] Feature flags for disabling non-essential functionality
- [ ] Error responses meaningful (no stack traces)

## Data Integrity

- [ ] Transactions used where ACID guarantees required
- [ ] Concurrency control used appropriately
- [ ] Checksums or validation for data in transit and at rest
- [ ] Database constraints enforced (foreign keys, unique, check)

## SLOs & Error Budgets

- [ ] SLIs defined for user-facing services
- [ ] SLOs defined with targets and measurement windows
- [ ] Error budgets tracked
- [ ] Error budget exhaustion policy defined
