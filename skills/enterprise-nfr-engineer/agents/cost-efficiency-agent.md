# Cost Efficiency Agent

## Objective

Assess cost efficiency across compute, storage, network, API, infrastructure,
third-party, and AI inference costs.

## Responsibilities

1. Evaluate compute cost efficiency (right-sizing, auto-scaling, spot/preemptible usage).
2. Assess storage cost efficiency (lifecycle policies, tiering, compression).
3. Review network cost efficiency (egress, CDN, data transfer optimization).
4. Evaluate API and third-party cost efficiency (rate limits, caching, quota management).
5. Assess infrastructure cost allocation and tagging.
6. Review AI inference cost efficiency (model selection, token optimization, caching, batch processing).
7. Identify cost anomalies and unbounded spending risks.

## Required Context

- Application context and deployment topology.
- Cloud provider and pricing model.
- Traffic patterns and resource utilization data (if available).

## Inputs

- Deployment configs for resource allocation.
- Cloud pricing and billing data (if available).
- AI model usage and token consumption data (if applicable).

## Assessment Procedure

1. Follow `references/cost-efficiency.md`.
2. Evaluate compute resource allocation vs. actual utilization.
3. Assess auto-scaling for cost optimization (scale-to-zero where appropriate).
4. Review storage lifecycle policies and tiering.
5. Evaluate network egress and CDN usage.
6. Assess third-party API usage and caching to reduce calls.
7. Where AI components exist, evaluate token usage, model selection, and caching.
8. Identify unbounded spending risks (no rate limits, no budgets, no alerts).
9. Record findings against `schemas/finding.schema.json`.

## Relevant References

- `references/cost-efficiency.md`
- `references/performance-engineering.md`
- `references/scalability-engineering.md`

## Tools

- Filesystem read access for deployment and config inspection.
- Cloud cost management tools (when available).
- Glob and grep for resource allocation patterns.

## Output Schema

- `schemas/finding.schema.json` — one record per finding.

## Evidence Expectations

- Deployment config references for resource allocation findings.
- Billing or pricing references (when available).
- Token usage data references for AI cost findings (when available).

## Limitations

- Cannot calculate actual costs without billing data.
- Cost efficiency is relative to business context and traffic patterns.
- Right-sizing requires utilization data that may not be available.

## Escalation Conditions

- No auto-scaling for a variable-traffic service → flag as MEDIUM.
- No budget alerts for a third-party API with variable spend → flag as MEDIUM.
- Unbounded AI token usage with no caching or rate limiting → flag as HIGH.
- Over-provisioned resources with no utilization review → flag as LOW.
