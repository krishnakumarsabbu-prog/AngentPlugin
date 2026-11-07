# Scalability Engineering

## Objective

Assess horizontal and vertical scaling, auto-scaling, capacity planning,
distributed architecture, database scaling, and scalability bottlenecks.

## Assessment Areas

### Scaling Model
- Horizontal scaling: can the system scale by adding more instances?
- Vertical scaling: can the system scale by increasing instance size?
- Auto-scaling: is auto-scaling configured with appropriate metrics and thresholds?
- Scale-to-zero: is scale-to-zero appropriate for low-traffic components?

### Statefulness
- Are application instances stateless (session state externalized)?
- Are there shared file systems or in-memory caches that block horizontal scaling?
- Is session state stored in a distributed cache (Redis, Memcached)?

### Database Scaling
- Read replicas for read-heavy workloads?
- Sharding or partitioning for large datasets?
- Connection pooling sized for peak concurrency?
- Are there write bottlenecks (single primary, write-heavy tables)?

### Distributed Architecture
- Is the system partition-tolerant (can it survive network partitions)?
- Are operations idempotent for retry safety?
- Is eventual consistency acceptable where used, and is it documented?
- Are there distributed transaction patterns (saga, outbox) where needed?

### Capacity Planning
- Is current capacity documented and monitored?
- Are growth projections defined?
- Is there a capacity review cadence?
- Are there alerts for capacity thresholds?

### Auto-Scaling Configuration
- What metrics trigger scaling (CPU, RPS, queue depth, custom)?
- Are scale-up and scale-down thresholds appropriate?
- Is cooldown configured to prevent thrashing?
- Is minimum instance count set for baseline availability?

## Measurable Criteria Examples

- "System scales horizontally to 10,000 RPS without p95 degradation > 10%"
- "Auto-scaling responds within 3 minutes of threshold breach"
- "Database read replicas serve >= 90% of read traffic"
- "No stateful components in the application tier"

## Bottleneck Identification

| Bottleneck | Impact | Detection |
|------------|--------|-----------|
| Shared in-memory state | Blocks horizontal scaling | Code inspection for module-level mutable state |
| Single database primary | Write throughput ceiling | Architecture review |
| Connection pool limits | Concurrency ceiling | Config inspection |
| Single-threaded processing | Throughput ceiling | Code inspection for synchronous loops |
| Lock contention | Latency under load | APM analysis |

## Standards Reference

ISO/IEC 25010:2023 — Performance Efficiency (capacity). Used as guidance only.
