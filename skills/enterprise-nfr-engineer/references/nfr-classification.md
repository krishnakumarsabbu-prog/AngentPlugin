# NFR Classification

## Objective

Classify each non-functional requirement by domain, criticality, and
measurability to support quantification and assessment.

## Domain Classification

Each requirement is classified into one of the 16 NFR domains from
`nfr-domain-catalog.md`. A requirement that spans multiple domains is
decomposed into separate requirements, one per domain.

### Examples

| Vague Requirement | Domain | Decomposed Requirement |
|-------------------|--------|------------------------|
| "Must be fast" | Performance | "p95 API latency < 200ms under 1000 RPS" |
| "Must be secure" | Security | "All authentication uses OAuth 2.1 with PKCE" |
| "Must not go down" | Availability | "Availability >= 99.95% measured monthly" |
| "Must handle growth" | Scalability | "System scales horizontally to 10,000 RPS without degradation" |
| "Must be easy to maintain" | Maintainability | "Cyclomatic complexity per function <= 15" |

## Criticality Classification

| Level | Description | Scoring Impact |
|-------|-------------|----------------|
| CRITICAL | Failure causes data loss, security breach, or safety risk | Failures override aggregate score |
| HIGH | Failure causes significant business disruption | Failures heavily weight domain score |
| MEDIUM | Failure causes reduced functionality | Failures moderately weight domain score |
| LOW | Failure causes minor inconvenience | Failures lightly weight domain score |
| INFORMATIONAL | Best practice, not a hard requirement | Informational only |

## Measurability Classification

| Level | Description | Action |
|------|-------------|--------|
| MEASURABLE | Has a target, unit, and measurement method | Proceed to assessment |
| PARTIALLY_MEASURABLE | Has a target but no measurement method | Escalate to stakeholder for measurement method |
| VAGUE | No target or unit | Escalate to quantification agent for conversion |
| ASPIRATIONAL | Stated goal with no enforcement | Flag as INCOMPLETE until quantified |

## Source Classification

| Source | Reliability |
|--------|-------------|
| Contract / SLA | High — binding obligation |
| Regulatory requirement | High — legal obligation |
| SLO dashboard | High — measured target |
| Design document | Medium — intended target |
| Stakeholder statement | Medium — stated intent |
| Implicit (inferred from system type) | Low — assumed requirement, needs validation |

Implicit requirements must be validated with stakeholders before being
treated as binding.
