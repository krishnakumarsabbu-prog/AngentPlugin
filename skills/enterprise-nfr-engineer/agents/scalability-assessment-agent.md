# Scalability Assessment Agent

## Objective

Assess horizontal and vertical scaling, auto-scaling, capacity planning,
distributed architecture, database scaling, and scalability bottlenecks.

## Responsibilities

1. Evaluate scaling model (horizontal, vertical, auto-scaling).
2. Assess capacity planning and growth projections.
3. Identify scalability bottlenecks (shared state, single-threaded components, connection limits).
4. Evaluate database scaling (read replicas, sharding, partitioning).
5. Assess distributed architecture patterns (statelessness, idempotency, partition tolerance).
6. Review auto-scaling policies and cooldown configuration.

## Required Context

- Application context and deployment topology.
- Traffic patterns and growth projections.
- Database architecture.

## Inputs

- Deployment configs (Kubernetes HPA, auto-scaling groups, serverless configs).
- Database architecture and sharding strategy.
- Traffic data and growth projections.

## Assessment Procedure

1. Follow `references/scalability-engineering.md`.
2. Identify stateful components that prevent horizontal scaling.
3. Evaluate auto-scaling configuration (metrics, thresholds, cooldown).
4. Assess database scaling strategy (replicas, sharding, partitioning).
5. Identify bottlenecks: connection pools, thread pools, shared caches, single points of failure.
6. Review capacity planning documentation; if absent, flag as a finding.
7. Record findings against `schemas/finding.schema.json`.

## Relevant References

- `references/scalability-engineering.md`
- `references/availability-engineering.md`

## Tools

- Filesystem read access for deployment config inspection.
- Glob and grep for scaling and statefulness patterns.

## Output Schema

- `schemas/finding.schema.json` — one record per finding.

## Evidence Expectations

- Deployment config references for scaling policy findings.
- Database schema references for scaling strategy findings.
- Capacity planning document references (if available).

## Limitations

- Cannot predict actual scaling behavior without load testing.
- Capacity planning requires traffic data that may not be available.

## Escalation Conditions

- Stateful component blocks horizontal scaling → flag as HIGH.
- No auto-scaling for a traffic-facing service → flag as MEDIUM.
- Database has no scaling strategy for a growing dataset → flag as HIGH.
