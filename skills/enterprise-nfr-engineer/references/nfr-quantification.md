# NFR Quantification

## Objective

Convert vague non-functional requirements into measurable criteria with a
target, unit, measurement method, acceptance criteria, and validation method.

## Quantification Procedure

For each requirement, define the following fields (per
`schemas/nfr-requirement.schema.json`):

1. **Title** — concise name (e.g., "API p95 Latency").
2. **Description** — what the requirement means in plain language.
3. **Domain** — one of the 16 NFR domains.
4. **Business justification** — why this requirement matters.
5. **Criticality** — CRITICAL, HIGH, MEDIUM, LOW, or INFORMATIONAL.
6. **Target** — the measurable value (e.g., "< 200ms").
7. **Unit** — the unit of measurement (ms, requests/sec, %, seconds).
8. **Measurement method** — how the target is measured (load test, APM, log analysis, code inspection).
9. **Acceptance criteria** — the pass/fail boundary (e.g., "p95 < 200ms for 99% of 5-minute windows over 1 hour").
10. **Validation method** — how compliance is verified (automated test, manual review, tool scan).
11. **Affected component** — which component this requirement applies to.
12. **Source** — where the requirement came from (contract, SLO, stakeholder, implicit).
13. **Owner** — who is responsible for meeting this requirement.
14. **Status** — DRAFT, ACTIVE, RETIRED.

## Quantification Patterns by Domain

### Performance
- Latency: "p95 < Xms under Y RPS for Z duration"
- Throughput: ">= Y requests/sec with p99 < Xms"
- Resource: "CPU < X% and memory < YMB under nominal load"

### Availability
- "Availability >= X.XX% measured over rolling 30-day window"
- "Mean time between failures (MTBF) >= X hours"

### Reliability
- "Error rate < X% of requests over rolling 5-minute window"
- "Retry success rate >= X% within Y attempts with exponential backoff"

### Security
- "All authentication uses [standard] with [specific controls]"
- "No secrets in source code (verified by secret scanning)"
- "All dependencies pinned and scanned with [tool]"

### Scalability
- "System scales horizontally to X RPS without p95 degradation > Y%"
- "Auto-scaling responds within X minutes of threshold breach"

### Observability
- "All critical paths have structured logs with correlation IDs"
- "All user-facing endpoints have SLI metrics with dashboards"
- "Alerts have linked runbooks and p50 alert-to-acknowledge < X minutes"

### Disaster Recovery
- "RTO <= X hours, RPO <= Y minutes"
- "Backup restoration tested at least once per quarter with documented results"

### Accessibility
- "WCAG 2.2 AA conformance verified by axe-core with zero critical violations"

### AI Quality
- "Hallucination rate < X% as measured by [evaluation dataset]"
- "All tool calls require explicit confirmation for destructive actions"
- "Model drift detected when evaluation score drops > X% from baseline"

## Anti-Patterns

- **Universal thresholds**: Do not hardcode "p95 < 200ms" as a universal target. Derive from business needs.
- **Vague acceptance criteria**: "fast enough" is not measurable.
- **No measurement method**: A target without a measurement method cannot be validated.
- **Aspirational targets**: A target with no enforcement is INCOMPLETE, not ACTIVE.
