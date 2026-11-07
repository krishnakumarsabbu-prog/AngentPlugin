# Observability Review Checklist

## Logging

- [ ] Logs structured (JSON with fields)
- [ ] Log levels used correctly (DEBUG, INFO, WARN, ERROR)
- [ ] Correlation IDs propagated across service boundaries
- [ ] Sensitive data scrubbed from logs
- [ ] Log retention and rotation configured
- [ ] Logs centralized (not just local files)

## Metrics

- [ ] Business metrics tracked (orders, signups, conversions)
- [ ] System metrics tracked (CPU, memory, latency, error rate)
- [ ] Metrics named consistently (Prometheus conventions)
- [ ] Metric cardinality controlled (no unbounded labels)
- [ ] Custom metrics for critical business operations

## Tracing

- [ ] Distributed tracing implemented (OpenTelemetry, Jaeger, Zipkin)
- [ ] Trace propagation headers forwarded across service calls
- [ ] Span coverage sufficient for critical paths
- [ ] Sampling strategy appropriate
- [ ] Trace errors correlated with logs and metrics

## SLIs & SLOs

- [ ] SLIs defined for all user-facing services
- [ ] SLOs defined with targets and measurement windows
- [ ] Error budgets tracked and enforced
- [ ] Error budget exhaustion policy defined

## Dashboards

- [ ] Dashboards for each critical service
- [ ] Dashboards show SLI status, error rate, latency, throughput
- [ ] Dashboards usable for on-call (clear, actionable)
- [ ] Dashboards linked from runbooks

## Alerting

- [ ] Alerts based on SLOs (error budget burn rate)
- [ ] Alerts actionable (linked to runbooks)
- [ ] Alert noise controlled (deduplication, grouping, inhibition)
- [ ] Escalation policies defined
- [ ] Alert-to-acknowledgement time measured

## Incident Diagnosis

- [ ] On-call can identify failing component within 5 minutes
- [ ] Recent deployments correlated with incidents
- [ ] Postmortem process with tracked action items
