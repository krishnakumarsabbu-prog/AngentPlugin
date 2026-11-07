# Quality Gates

## Objective

Define explainable quality-gate decisions for NFR assessments.

## Gate Decision Schema

Each gate decision (per `schemas/quality-gate.schema.json`) includes:

- **Assessment ID** — links to the assessment.
- **Overall score** — the weighted score.
- **Domain scores** — per-domain scores.
- **Coverage metrics** — requirement, evidence, validation coverage.
- **Critical findings** — list of CRITICAL findings in blocking domains.
- **Final status** — PASS, CONDITIONAL_PASS, FAIL, or INCOMPLETE.
- **Decision rule** — the specific rule that triggered the status.
- **Conditions** — for CONDITIONAL_PASS, the conditions that must be met.
- **Exceptions** — any approved exceptions with owner, rationale, compensating controls, and expiry.
- **Approver** — for CONDITIONAL_PASS, who authorized it.
- **Timestamp** — when the decision was made.

## Gate Rules

### PASS
- Overall score >= 80
- No CRITICAL findings in blocking domains
- Requirement coverage >= 80%
- Evidence coverage >= 70%
- Validation coverage >= 70%

### CONDITIONAL_PASS
- Overall score >= 60
- No CRITICAL findings in blocking domains
- Coverage thresholds met (or explicitly waived with justification)
- Remediation timeline defined for remaining gaps
- Explicit approver named

### FAIL
- Any CRITICAL finding in a blocking domain (Security, Availability, Reliability)
- Overall score < 60

### INCOMPLETE
- Requirement coverage < 60%
- Assessment cannot make a determination

## Blocking Domains

By default, the following domains are blocking (a CRITICAL finding triggers
FAIL):

- Security Engineering
- Availability Engineering
- Reliability & Resilience

This is configurable. An organization may add or remove blocking domains
based on risk appetite.

## Exceptions

Exceptions allow a specific finding to be waived without changing the gate
result. Every exception must include:

- **Owner** — who is accountable for the exception.
- **Rationale** — why the exception is justified.
- **Compensating controls** — what mitigates the risk.
- **Expiry** — when the exception expires (no permanent exceptions).

Exceptions are recorded in the gate decision and reviewed at expiry.

## Conditional Approval

A CONDITIONAL_PASS is not a PASS. It means:

- The system is acceptable for current use with documented conditions.
- Remediation must be completed within the defined timeline.
- Conditions are tracked and reviewed.
- Failure to meet conditions by the deadline escalates the status to FAIL.

## Explainability Requirements

Every gate decision must be explainable to a non-technical stakeholder:

1. What is the overall score and what does it mean?
2. Which domains are weak and why?
3. Are there critical findings, and what is their impact?
4. What is the coverage, and does it affect confidence?
5. What is the final status and what rule triggered it?
6. If conditional, what are the conditions and timeline?
7. If exceptions exist, what are they and when do they expire?
