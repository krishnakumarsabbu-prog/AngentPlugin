# Assessment Methodology

## Overview

The Enterprise NFR Engineer assessment follows a six-phase pipeline driven by
the NFR Orchestrator:

```
DISCOVER → QUANTIFY → ASSESS → VALIDATE → SCORE → REPORT
```

## Intake Protocol

Before assessment begins, collect the following. Mark unavailable items and
treat the gap as `INSUFFICIENT_EVIDENCE` rather than guessing.

1. **Application context** — name, description, business purpose, criticality tier.
2. **Scope** — components, services, repositories, environments in scope.
3. **Architecture artifacts** — diagrams, design docs, deployment topology.
4. **Existing requirements** — SLOs, SLAs, contracts, compliance obligations.
5. **Stakeholder input** — owners for performance, security, reliability, compliance.
6. **Repository access** — the codebase root the skill is permitted to read.
7. **Constraints** — known thresholds, organizational policies, regulatory obligations.

## Criticality Tiers

| Tier | Description | Examples |
|------|-------------|----------|
| T1 — Mission Critical | Outage causes immediate business or safety impact | Payments, auth, healthcare |
| T2 — Business Critical | Outage causes significant business disruption | Core product flows, dashboards |
| T3 — Important | Outage causes reduced functionality | Reporting, analytics |
| T4 — Supporting | Outage causes minor inconvenience | Internal tools, documentation |

Criticality influences domain weights and gate policy. A T1 system requires
stricter thresholds than a T4 system. Derive thresholds from business needs,
not from universal defaults.

## Domain Selection

1. Start with all 16 NFR domains from `nfr-domain-catalog.md`.
2. Exclude a domain only with a documented justification (e.g., "no AI components present" → exclude AI System Quality).
3. Record excluded domains in the assessment envelope with the justification.
4. The Evidence Validation agent will verify that exclusions are justified.

## Assessment Depth

The depth of assessment per domain depends on:

- Criticality tier of the system.
- Applicability of the domain.
- Availability of evidence.
- Stakeholder priorities.

For a T1 system, every applicable domain requires a thorough assessment. For
a T4 system, a lighter review may suffice. Document the chosen depth.

## Sequencing

1. Discovery and quantification can proceed in parallel.
2. Specialist assessments can proceed in parallel across domains.
3. Evidence validation must follow all specialist assessments.
4. Scoring must follow evidence validation.
5. Reporting must follow scoring and gate decisions.

## Output

- Assessment envelope (`schemas/assessment.schema.json`).
- NFR requirements (`schemas/nfr-requirement.schema.json`).
- Findings (`schemas/finding.schema.json`).
- Evidence (`schemas/evidence.schema.json`).
- Domain scores (`schemas/domain-score.schema.json`).
- Quality-gate decision (`schemas/quality-gate.schema.json`).
- Full report (`templates/nfr-assessment-report.md`).

## Standards Alignment

This methodology is informed by ISO/IEC 25010:2023 (quality models), Google
SRE principles (SLOs, error budgets), NIST SSDF (secure development), OWASP
ASVS (application security verification), and WCAG 2.2 (accessibility). The
skill references these standards as guidance only and does not claim certified
compliance.
