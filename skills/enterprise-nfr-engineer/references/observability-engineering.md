# Observability Engineering

## Objective

Assess observability across logs, metrics, tracing, correlation IDs, SLIs,
SLOs, dashboards, alerts, and incident diagnosis.

## Assessment Areas

### Logging
- Are logs structured (JSON with fields, not free text)?
- Are log levels used correctly (DEBUG, INFO, WARN, ERROR)?
- Are correlation IDs propagated across service boundaries?
- Are sensitive data (passwords, tokens, PII) scrubbed from logs?
- Is log retention configured with appropriate rotation?
- Are logs centralized (not just local files)?

### Metrics
- Are business metrics tracked (orders, signups, conversions)?
- Are system metrics tracked (CPU, memory, latency, error rate)?
- Are metrics named consistently (Prometheus naming conventions)?
- Is metric cardinality controlled (no unbounded labels)?
- Are custom metrics defined for critical business operations?

### Tracing
- Is distributed tracing implemented (OpenTelemetry, Jaeger, Zipkin)?
- Are trace propagation headers forwarded across service calls?
- Is span coverage sufficient for critical paths?
- Is sampling strategy appropriate (head-based vs. tail-based)?
- Are trace errors correlated with logs and metrics?

### SLIs & SLOs
- Are SLIs defined for all user-facing services?
- Are SLOs defined with targets and measurement windows?
- Are error budgets tracked and enforced?
- Is there a policy for error budget exhaustion?

### Dashboards
- Are dashboards created for each critical service?
- Do dashboards show SLI status, error rate, latency, and throughput?
- Are dashboards usable for on-call (clear, actionable, not noisy)?
- Are dashboards linked from runbooks?

### Alerting
- Are alerts based on SLOs (error budget burn rate) rather than raw thresholds?
- Are alerts actionable (linked to runbooks)?
- Is alert noise controlled (deduplication, grouping, inhibition)?
- Are escalation policies defined?
- Is alert-to-acknowledgement time measured?

### Incident Diagnosis
- Can on-call identify the failing component within 5 minutes?
- Are recent deployments correlated with incidents?
- Is there a postmortem process with action items tracked to completion?

## Measurable Criteria Examples

- "All critical paths have structured logs with correlation IDs"
- "All user-facing endpoints have SLI metrics with dashboards"
- "Alerts have linked runbooks and p50 alert-to-ack < 5 minutes"
- "Distributed tracing covers all inter-service calls"

## Tools

| Tool | Use Case |
|------|----------|
| OpenTelemetry | Instrumentation (logs, metrics, traces) |
| Prometheus | Metrics collection and alerting |
| Grafana | Dashboards and visualization |
| Jaeger / Zipkin | Distributed tracing |
| Loki / ELK | Log aggregation |

When a tool is unavailable, mark the check NOT_EXECUTED. Do not fabricate
dashboard or alert configurations.

## Standards Reference

Google SRE principles — SLIs, SLOs, error budgets, alerting on burn rate.
Used as guidance only.
