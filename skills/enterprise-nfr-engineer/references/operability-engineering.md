# Operability Engineering

## Objective

Assess operability across deployment, rollback, runbooks, monitoring, on-call,
incident response, and operational ownership.

## Assessment Areas

### Deployment
- Is the deployment process automated (CI/CD)?
- Are deployments reproducible (same artifact, same process)?
- Is there a deployment runbook for each service?
- Are deployments incremental (canary, blue-green, rolling)?
- Is deployment health checked post-deploy?

### Rollback
- Is there an automated rollback mechanism?
- Can rollback be triggered by on-call without specialist assistance?
- Is rollback tested regularly?
- Is rollback time measured and within the RTO?
- Are database migrations backward compatible (to support rollback)?

### Runbooks
- Are runbooks documented for each critical service?
- Do runbooks cover common incidents (high error rate, latency spike, dependency outage)?
- Are runbooks linked from alerts?
- Are runbooks kept up to date?
- Are runbooks tested (can on-call follow them under pressure)?

### Monitoring
- Is the system monitored 24/7 (or per business requirements)?
- Are dashboards available for on-call?
- Are health endpoints configured for all services?
- Is synthetic monitoring used for critical user journeys?

### On-Call
- Is there an on-call rotation?
- Is on-call documented (schedule, escalation, contact methods)?
- Is on-call trained and given context (runbooks, architecture overviews)?
- Is on-call fatigue measured and managed?

### Incident Response
- Is there an incident response process?
- Are incident severity levels defined?
- Is there a communication plan (internal, external, stakeholders)?
- Are postmortems conducted for significant incidents?
- Are postmortem action items tracked to completion?
- Is there a blameless postmortem culture?

### Operational Ownership
- Is there a clear owner for each service?
- Does the team that builds the service also operate it (you build it, you run it)?
- Is operational ownership documented?
- Are service-level agreements between teams documented?

## Measurable Criteria Examples

- "Deployment is automated via CI/CD with health checks"
- "Rollback completes within 5 minutes and is tested monthly"
- "Runbooks linked from all critical alerts"
- "Postmortems completed for all SEV1 and SEV2 incidents within 5 business days"

## Standards Reference

Google SRE principles — operability, incident response, postmortems.
ISO/IEC 25010:2023 — Operability. Used as guidance only.
