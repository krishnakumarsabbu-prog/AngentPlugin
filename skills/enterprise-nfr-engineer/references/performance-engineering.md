# Performance Engineering

## Objective

Assess performance across latency, throughput, concurrency, CPU, memory,
database, caching, network, and load testing coverage.

## Assessment Areas

### Latency & Throughput
- p50, p95, p99 latency targets defined and measured?
- Throughput targets (RPS, TPS) defined and measured?
- Are latency targets differentiated by operation type (read vs. write, simple vs. complex)?
- Is tail latency (p99) monitored, not just averages?

### Concurrency & Resource Utilization
- What is the concurrency model (thread-per-request, event loop, actor, async)?
- Are there synchronous blocking calls in high-concurrency paths?
- Are thread/connection pools properly sized?
- Is CPU and memory utilization monitored under load?

### Database Performance
- Are there N+1 query patterns?
- Are critical queries indexed?
- Are there unbounded scans (SELECT * without LIMIT)?
- Is connection pooling configured?
- Are slow queries logged and reviewed?

### Caching
- What caching layers exist (CDN, application, database)?
- Is the cache invalidation strategy correct (no stale data, no thundering herd)?
- Is cache hit rate monitored?
- Are hot keys identified and handled?

### Network Efficiency
- Are payloads compressed (gzip, brotli)?
- Are connections reused (HTTP/2, keep-alive, connection pooling)?
- Is the number of round-trips minimized (batching, field selection)?

### Load Testing
- Are load tests defined for critical paths?
- Do load tests cover: load, stress, spike, soak, capacity?
- Are load tests run regularly (CI, pre-release)?
- If no load tests exist, flag as NOT_TESTED.

## Measurable Criteria Examples

- "p95 API latency < 200ms under 1000 RPS for 1 hour"
- "p99 latency < 500ms under peak load"
- "Database query p95 < 50ms for all indexed lookups"
- "Cache hit rate > 80% for read-heavy endpoints"
- "No N+1 queries on critical user journeys (verified by code review)"

## Tools

| Tool | Use Case |
|------|----------|
| k6 | Load testing, scripting, CI integration |
| JMeter | Load testing, protocol testing |
| Gatling | Load testing, Scala-based scenarios |
| Locust | Python-based load testing |
| Lighthouse | Frontend performance auditing |

When a tool is unavailable, mark the check NOT_EXECUTED. Never fabricate tool
output. Never run production load tests without explicit authorization.

## Standards Reference

ISO/IEC 25010:2023 — Performance Efficiency characteristic (time behavior,
resource utilization, capacity). Used as guidance only.
