---
name: enterprise-nfr-engineer
version: 1.0.0
title: Enterprise NFR Engineer Skill
description: Enterprise-grade NFR engineering skill for discovering, quantifying, assessing and validating non-functional requirements across software applications, APIs, microservices, infrastructure and AI-powered systems.
author: AgentForge Engineering
category: Software Quality Engineering
tags: [nfr, non-functional-requirements, performance, reliability, security, scalability, observability, sre, architecture, quality-gates, copilot-skill]
compatibility: [agy, copilot, claude, openai]
requirements: AgentForge v0.1.0+ Workspace, Read-Only Filesystem Sandbox
permissions:
  files:
    read: ["skills/enterprise-nfr-engineer/**"]
    deny_write: ["SOUL.md", "MEMORY.md", "AGENTS.md", "IDENTITY.md", "USER.md"]
  network:
    allow: []
    deny: "*"
license: Apache-2.0 / MIT Dual License (AgentForge Enterprise)
---

<!--
AgentForge Enterprise Dual License: Apache-2.0 / MIT
Copyright (C) AgentForge Engineering. All rights reserved.
Licensed under the Apache License, Version 2.0 or the MIT License.
-->

# Enterprise NFR Engineer Skill (`forge-nfr-engineer`)

Copyright (C) AgentForge Engineering. All rights reserved.
Licensed under the Apache-2.0 and MIT open-source licenses.

Enterprise-grade NFR engineering for discovering, quantifying, assessing and
validating non-functional requirements across software applications, APIs,
microservices, infrastructure and AI-powered systems. The skill acts as a
senior enterprise NFR specialist that can inspect a real codebase, discover
and quantify requirements, assess architecture, identify risks, validate
available evidence, calculate scores, enforce quality gates, and generate
professional engineering reports.

## Activation Triggers

This skill activates when a user requests a non-functional assessment.

### Primary Triggers (activate)

- "assess the NFRs of this application"
- "run a non-functional requirements assessment"
- "evaluate performance, reliability and security of this system"
- "produce an NFR readiness report for this service"
- "quantify our non-functional requirements"
- "run a production-readiness review"
- "score our architecture against NFR domains"
- "identify missing non-functional requirements in this codebase"
- "validate our SLOs, RTO and RPO targets"
- "assess the observability of our microservices"
- "review our disaster recovery posture"
- "evaluate our AI system quality and safety"

### Near-Miss Negatives (do NOT activate)

- "explain what an NFR is" — educational; answer directly without an assessment.
- "what is the difference between functional and non-functional requirements?" — informational.
- "write a unit test for this function" — functional testing, not NFR assessment.

If a user asks an educational question, answer it directly. Launch the full
assessment only when an assessment, review, scoring, or report is requested.

## Required Inputs

The skill needs context before it can produce a defensible assessment. Collect
the following; mark any that are unavailable and treat the gap as an
`INSUFFICIENT_EVIDENCE` finding rather than guessing.

1. **Application context** — name, description, business purpose, criticality tier.
2. **Scope** — components, services, repositories, and environments in scope.
3. **Architecture artifacts** — diagrams, design docs, deployment topology (if available).
4. **Existing requirements** — any documented SLOs, SLAs, contracts, compliance obligations.
5. **Stakeholder input** — owners for performance, security, reliability, compliance.
6. **Repository access** — the codebase root the skill is permitted to read.
7. **Constraints** — known thresholds, organizational policies, regulatory obligations.

See `references/assessment-methodology.md` for the full intake protocol and
`checklists/application-discovery.md` for the discovery questionnaire.

## Assessment Workflow

Every assessment follows a six-phase pipeline. The NFR Orchestrator
(`agents/nfr-orchestrator.md`) drives the sequence and delegates specialist
work to the role definitions in `agents/`.

```
DISCOVER → QUANTIFY → ASSESS → VALIDATE → SCORE → REPORT
```

### Phase 1 — Discover Application Context

1. Inspect the repository: manifests, lockfiles, Dockerfiles, CI configs, IaC.
2. Identify the system type (frontend, REST API, event-driven, microservices, RAG, agentic AI).
3. Map components, dependencies, data stores, external integrations, and deployment targets.
4. Record findings in the application context section of the assessment.

See `references/nfr-discovery.md` and `checklists/application-discovery.md`.

### Phase 2 — Identify Applicable NFR Domains

1. Select the relevant NFR domains from the 16-domain catalog
   (`references/nfr-domain-catalog.md`).
2. Not every domain applies to every system. Mark a domain `NOT_APPLICABLE`
   only with a documented justification (e.g. "no AI components present").
3. Classify each requirement using `references/nfr-classification.md`.

### Phase 3 — Discover & Quantify Requirements

1. Surface existing requirements from contracts, runbooks, SLO dashboards, and docs.
2. Convert vague requirements ("must be fast", "must be secure") into measurable
   criteria with a target, unit, measurement method, and acceptance criteria.
3. Record each requirement against the schema in
   `schemas/nfr-requirement.schema.json`.
4. See `references/nfr-quantification.md` for the quantification procedure.

### Phase 4 — Specialist Assessment

1. The Orchestrator selects the relevant specialist roles from `agents/`.
2. Each specialist follows its own assessment procedure and records findings
   against `schemas/finding.schema.json`.
3. Architecture, security, performance, reliability, observability, DR,
   compliance, accessibility, cost, and AI quality each have dedicated agents.
4. Findings must cite evidence — a file path, config line, metric, log excerpt,
   test result, or interview note — recorded in `schemas/evidence.schema.json`.

### Phase 5 — Validate Evidence

1. The Evidence Validation agent (`agents/evidence-validation-agent.md`)
   challenges every finding for traceability.
2. Validation states: `VERIFIED_PASS`, `VERIFIED_FAIL`, `PARTIALLY_VERIFIED`,
   `NOT_TESTED`, `INSUFFICIENT_EVIDENCE`, `NOT_APPLICABLE`.
3. `NOT_TESTED` is never `PASS`. `INSUFFICIENT_EVIDENCE` is never `PASS`.
4. Do not fabricate test execution or tool output. If a tool is unavailable,
   mark the check `NOT_EXECUTED` and explain the limitation.
5. See `references/evidence-validation.md`.

### Phase 6 — Score & Apply Quality Gates

1. Calculate per-domain scores, requirement coverage, evidence coverage,
   validation coverage, and an overall weighted score using
   `references/scoring-model.md` and `scripts/calculate-nfr-score.py`.
2. Apply quality gates from `references/quality-gates.md`. Critical security,
   availability, or reliability failures override an otherwise high aggregate
   score when the configured policy requires blocking.
3. Determine the final status: `PASS`, `CONDITIONAL_PASS`, `FAIL`, or `INCOMPLETE`.
4. Every gate decision must be explainable.

### Phase 7 — Report & Remediate

1. Generate the report using `templates/nfr-assessment-report.md` as the master
   template, pulling in section templates as needed.
2. Produce a remediation roadmap using `templates/remediation-plan.md` and
   `references/remediation-methodology.md`.
3. Use a unique assessment identifier for every report. Never overwrite a
   previous report.
4. Default output is Markdown; structured JSON is optional.

## The 16 NFR Domains

| # | Domain | Reference | Specialist Agent |
|---|--------|-----------|------------------|
| 1 | Performance Engineering | `references/performance-engineering.md` | `agents/performance-engineering-agent.md` |
| 2 | Scalability Engineering | `references/scalability-engineering.md` | `agents/scalability-assessment-agent.md` |
| 3 | Availability Engineering | `references/availability-engineering.md` | `agents/reliability-sre-agent.md` |
| 4 | Reliability & Resilience | `references/reliability-resilience.md` | `agents/reliability-sre-agent.md` |
| 5 | Security Engineering | `references/security-engineering.md` | `agents/security-assessment-agent.md` |
| 6 | Maintainability Engineering | `references/maintainability-engineering.md` | `agents/architecture-assessment-agent.md` |
| 7 | Usability Engineering | `references/usability-engineering.md` | `agents/architecture-assessment-agent.md` |
| 8 | Compatibility Engineering | `references/compatibility-engineering.md` | `agents/architecture-assessment-agent.md` |
| 9 | Observability Engineering | `references/observability-engineering.md` | `agents/observability-agent.md` |
| 10 | Disaster Recovery | `references/disaster-recovery.md` | `agents/disaster-recovery-agent.md` |
| 11 | Portability Engineering | `references/portability-engineering.md` | `agents/architecture-assessment-agent.md` |
| 12 | Compliance & Privacy | `references/compliance-privacy.md` | `agents/compliance-privacy-agent.md` |
| 13 | Operability Engineering | `references/operability-engineering.md` | `agents/reliability-sre-agent.md` |
| 14 | Accessibility Engineering | `references/accessibility-engineering.md` | `agents/accessibility-agent.md` |
| 15 | Cost Efficiency Engineering | `references/cost-efficiency.md` | `agents/cost-efficiency-agent.md` |
| 16 | AI System Quality | `references/ai-system-quality.md` | `agents/ai-quality-agent.md` |

## Specialist Agent Roles

The `agents/` directory contains 16 reusable role definitions. The
Orchestrator loads only the roles relevant to the target system. These are
role instructions for the host agent (Claude Code, Copilot, etc.) — they are
not native subagents that auto-execute. See `adapters/claude-code.md` and
`adapters/github-copilot.md` for host-specific usage.

| Role | File |
|------|------|
| NFR Orchestrator | `agents/nfr-orchestrator.md` |
| NFR Discovery | `agents/nfr-discovery-agent.md` |
| NFR Quantification | `agents/nfr-quantification-agent.md` |
| Architecture Assessment | `agents/architecture-assessment-agent.md` |
| Security Assessment | `agents/security-assessment-agent.md` |
| Performance Engineering | `agents/performance-engineering-agent.md` |
| Scalability Assessment | `agents/scalability-assessment-agent.md` |
| Reliability & SRE | `agents/reliability-sre-agent.md` |
| QA & Test Strategy | `agents/qa-test-strategy-agent.md` |
| Observability | `agents/observability-agent.md` |
| Compliance & Privacy | `agents/compliance-privacy-agent.md` |
| Accessibility | `agents/accessibility-agent.md` |
| Disaster Recovery | `agents/disaster-recovery-agent.md` |
| Cost Efficiency | `agents/cost-efficiency-agent.md` |
| AI Quality | `agents/ai-quality-agent.md` |
| Evidence Validation | `agents/evidence-validation-agent.md` |

## Evidence-Based Assessment Model

All findings must cite traceable evidence. The unified schemas are:

- `schemas/nfr-requirement.schema.json` — requirement definition
- `schemas/assessment.schema.json` — assessment envelope
- `schemas/finding.schema.json` — individual finding
- `schemas/evidence.schema.json` — evidence artifact
- `schemas/domain-score.schema.json` — per-domain score
- `schemas/quality-gate.schema.json` — gate decision

Severity levels: `CRITICAL`, `HIGH`, `MEDIUM`, `LOW`, `INFORMATIONAL`.

Validation states: `VERIFIED_PASS`, `VERIFIED_FAIL`, `PARTIALLY_VERIFIED`,
`NOT_TESTED`, `INSUFFICIENT_EVIDENCE`, `NOT_APPLICABLE`.

**Invariants:** Unknown is never PASS. Missing evidence is never PASS. N/A
requires justification. Exceptions require an owner, rationale, compensating
controls, and expiry. Never fabricate test execution or tool output.

## Scoring & Quality Gates

See `references/scoring-model.md` for the transparent scoring methodology and
`references/quality-gates.md` for gate definitions. The scoring script
`scripts/calculate-nfr-score.py` computes:

- Domain score (0–100 per domain)
- Requirement coverage (%)
- Evidence coverage (%)
- Validation coverage (%)
- Overall weighted score (0–100)

Domain weights are configurable. Critical security, availability, and
reliability failures override an otherwise high aggregate score when the
configured policy requires blocking.

Final statuses: `PASS`, `CONDITIONAL_PASS`, `FAIL`, `INCOMPLETE`.

## Tool-Aware Engineering

The skill integrates with tools when available but works without them. When a
tool is unavailable, mark the assessment `NOT_EXECUTED` and explain the
limitation. Never fabricate tool outputs. Never run intrusive security scans,
destructive tests, production load tests, or arbitrary scripts without
explicit authorization.

| Domain | Tools | Reference |
|--------|-------|-----------|
| Performance | k6, JMeter, Gatling, Locust, Lighthouse | `references/performance-engineering.md` |
| Security | Semgrep, OWASP ZAP, Trivy, OSV-Scanner | `references/security-engineering.md` |
| Accessibility | axe-core, Lighthouse | `references/accessibility-engineering.md` |
| Observability | OpenTelemetry, Prometheus, Grafana | `references/observability-engineering.md` |
| Testing | unit, integration, API, E2E frameworks | `agents/qa-test-strategy-agent.md` |
| AI Quality | model eval, hallucination/grounding eval, token & latency measurement | `references/ai-system-quality.md` |

## Report Templates

| Template | Purpose |
|----------|---------|
| `templates/nfr-assessment-report.md` | Full assessment report (master) |
| `templates/executive-summary.md` | Executive summary |
| `templates/architecture-review.md` | Architecture review |
| `templates/security-assessment.md` | Security assessment |
| `templates/performance-assessment.md` | Performance assessment |
| `templates/reliability-assessment.md` | Reliability assessment |
| `templates/observability-assessment.md` | Observability assessment |
| `templates/disaster-recovery-assessment.md` | DR assessment |
| `templates/ai-quality-assessment.md` | AI quality assessment |
| `templates/remediation-plan.md` | Remediation roadmap |
| `templates/nfr-requirements-catalog.md` | Requirements catalog |

The full report must include: Executive Summary, Application Context,
Assessment Scope, Methodology, Architecture Overview, NFR Requirements,
Domain-wise Assessment, Risks and Findings, Evidence and Validation, Domain
Scores, Overall Score, Quality-Gate Decision, Critical Gaps, Remediation
Roadmap, Untested Areas, Limitations, and a Final Engineering Readiness
Statement.

## Checklists

Rapid review checklists for each domain live in `checklists/`. Use them to
drive discovery and to confirm coverage during validation.

## Adapters

- `adapters/claude-code.md` — installing into `.claude/skills/enterprise-nfr-engineer/`
- `adapters/github-copilot.md` — installing into `.github/skills/enterprise-nfr-engineer/`

The shared `SKILL.md` and `references/` remain the single source of truth. Do
not duplicate the core skill across adapters.

## Safety & Governance

- Read-only filesystem sandbox. The skill does not mutate workspace files during assessment.
- No network egress during assessment unless explicitly authorized.
- Never run intrusive security scans, destructive tests, or production load tests without authorization.
- Do not hardcode universal NFR thresholds. Derive targets from business needs and organizational policies.
- Use standards (ISO/IEC 25010, OWASP ASVS, OWASP Top 10, OWASP API Security Top 10, NIST SSDF, Google SRE, WCAG 2.2) as reference guidance only. Do not make false compliance claims.

## Standards Reference

This skill draws on the following standards as reference guidance. It does not
claim certified compliance with any of them.

- ISO/IEC 25010:2023 — Systems and software quality models
- OWASP ASVS — Application Security Verification Standard
- OWASP Top 10 — Web application security risks
- OWASP API Security Top 10 — API security risks
- NIST SSDF — Secure Software Development Framework
- Google SRE — Site Reliability Engineering principles
- WCAG 2.2 — Web Content Accessibility Guidelines

## Quick Reference Commands

| Command | Action |
|---------|--------|
| `@enterprise-nfr-engineer` | Invoke NFR assessment in Copilot Chat |
| `/nfr assess` | Run full NFR assessment of current workspace |
| `/nfr discover` | Discover application context and applicable domains |
| `/nfr quantify` | Quantify vague requirements into measurable criteria |
| `/nfr score` | Calculate domain and overall scores from findings |
| `/nfr report` | Generate the full NFR assessment report |
| `/nfr remediate` | Produce a remediation roadmap from findings |

## Validation

Validate the skill suite:

```bash
node skills/enterprise-nfr-engineer/scripts/validate-nfr-engineer.cjs
```

Run unit tests:

```bash
node skills/enterprise-nfr-engineer/tests/nfr-engineer.test.cjs
```

Validate schemas and scoring:

```bash
python3 skills/enterprise-nfr-engineer/scripts/validate-schemas.py
python3 skills/enterprise-nfr-engineer/scripts/validate-assessment.py
python3 skills/enterprise-nfr-engineer/scripts/calculate-nfr-score.py examples/sample-assessment.json
```
