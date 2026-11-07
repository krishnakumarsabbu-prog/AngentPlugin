# Performance Review Checklist

## Latency & Throughput

- [ ] p50, p95, p99 latency targets defined and measured
- [ ] Throughput targets (RPS, TPS) defined and measured
- [ ] Tail latency (p99) monitored, not just averages
- [ ] Latency targets differentiated by operation type

## Database Performance

- [ ] No N+1 query patterns on critical paths
- [ ] Critical queries indexed
- [ ] No unbounded scans (SELECT * without LIMIT)
- [ ] Connection pooling configured
- [ ] Slow queries logged and reviewed

## Caching

- [ ] Caching layers identified (CDN, application, database)
- [ ] Cache invalidation strategy correct
- [ ] Cache hit rate monitored
- [ ] Hot keys identified and handled
- [ ] No thundering herd on cache miss

## Concurrency & Resources

- [ ] Concurrency model identified and appropriate
- [ ] No synchronous blocking calls in high-concurrency paths
- [ ] Thread/connection pools properly sized
- [ ] CPU and memory utilization monitored under load

## Network

- [ ] Payloads compressed (gzip, brotli)
- [ ] Connections reused (HTTP/2, keep-alive)
- [ ] Round-trips minimized (batching, field selection)

## Load Testing

- [ ] Load tests defined for critical paths
- [ ] Load tests cover: load, stress, spike, soak, capacity
- [ ] Load tests run regularly (CI or pre-release)
- [ ] Load test results documented and reviewed
