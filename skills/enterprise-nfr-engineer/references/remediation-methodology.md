# Remediation Methodology

## Objective

Provide actionable, prioritized remediation guidance for NFR findings.

## Prioritization

Remediation is prioritized by a combination of severity and business impact:

| Priority | Criteria | Timeline |
|----------|----------|----------|
| P0 — Immediate | CRITICAL in blocking domain with active risk | Hours to days |
| P1 — Urgent | CRITICAL or HIGH with significant business impact | Days to 1 week |
| P2 — Scheduled | HIGH or MEDIUM with moderate impact | 1–4 weeks |
| P3 — Backlog | MEDIUM or LOW with minor impact | Next quarter |
| P4 — Monitor | LOW or INFORMATIONAL, no immediate action | Monitor |

## Remediation Plan Structure

Each remediation item includes:

1. **Finding ID** — links to the finding.
2. **Domain** — which NFR domain.
3. **Severity** — CRITICAL, HIGH, MEDIUM, LOW, INFORMATIONAL.
4. **Priority** — P0 through P4.
5. **Description** — what needs to be fixed.
6. **Recommended action** — concrete steps to remediate.
7. **Affected component** — where the fix applies.
8. **Owner** — who is responsible.
9. **Due date** — target completion date.
10. **Verification** — how to verify the remediation is effective.
11. **Dependencies** — other items that must be completed first.

## Remediation by Domain

### Performance
- Add indexes for slow queries.
- Implement caching for read-heavy endpoints.
- Fix N+1 queries with batching or eager loading.
- Add load tests for critical paths.
- Optimize payload size and compression.

### Scalability
- Externalize session state for horizontal scaling.
- Add read replicas for read-heavy databases.
- Configure auto-scaling with appropriate metrics.
- Remove shared state from application instances.

### Availability
- Deploy across multiple AZs or regions.
- Add redundancy for single points of failure.
- Configure health checks and automated failover.
- Define and monitor SLOs with error budgets.

### Reliability
- Add circuit breakers for external dependencies.
- Implement retry with exponential backoff and jitter.
- Make state-mutating operations idempotent.
- Add timeouts for all external calls.
- Implement graceful degradation for non-critical dependencies.

### Security
- Remove hardcoded secrets and use a vault.
- Fix injection vulnerabilities with parameterized queries.
- Enforce authorization at every endpoint.
- Pin dependencies and add dependency scanning to CI.
- Configure rate limiting on public endpoints.

### Observability
- Add structured logging with correlation IDs.
- Define SLIs and SLOs for all user-facing services.
- Add dashboards for critical services.
- Configure SLO-based alerts with runbook links.
- Implement distributed tracing.

### Disaster Recovery
- Define RTO and RPO targets.
- Configure automated backups with cross-region storage.
- Schedule regular restore tests.
- Document failover runbooks.
- Test failover regularly.

## Verification

Every remediation must include a verification method:

- For code fixes: a test that verifies the fix.
- For config changes: a config validation check.
- For process changes: a documented procedure and audit.
- For performance: a load test that demonstrates the target is met.
- For security: a scan or penetration test that confirms the fix.

Remediation is not complete until verification passes. See
`templates/remediation-plan.md` for the plan template.
