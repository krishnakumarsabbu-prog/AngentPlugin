# Enterprise NFR Engineer

> **Version:** 1.0.0
> **Brand & Namespace:** Enterprise NFR Engineer (`enterprise-nfr-engineer`)
> **Target:** AgentForge, GitHub Copilot Chat, Claude Code
> **License:** Apache-2.0 / MIT Dual License (Agentplugin Enterprise)

Enterprise-grade NFR engineering for discovering, quantifying, assessing and
validating non-functional requirements across software applications, APIs,
microservices, infrastructure and AI-powered systems.

---

## Key Differentiators

| Capability | Generic Checklists | Enterprise NFR Engineer |
|---|---|---|
| **Coverage** | Ad hoc, opinion-based | 16 structured NFR domains mapped to ISO/IEC 25010 |
| **Requirements** | Vague ("must be fast") | Quantified with target, unit, measurement method, acceptance criteria |
| **Evidence** | Assumptions | Traceable evidence with validation states; unknown is never PASS |
| **Scoring** | Subjective | Transparent weighted scoring with critical-failure overrides |
| **Quality Gates** | Manual sign-off | Explainable gate decisions: PASS, CONDITIONAL_PASS, FAIL, INCOMPLETE |
| **AI Systems** | Ignored | Dedicated AI quality domain (hallucination, grounding, prompt injection, drift) |

---

## Functional Architecture

- **Agents (`agents/`)** — 16 reusable specialist role definitions orchestrated by the NFR Orchestrator.
- **References (`references/`)** — Deep-dive methodology for each NFR domain plus scoring, gates, remediation, and reporting.
- **Schemas (`schemas/`)** — JSON schemas for requirements, findings, evidence, scores, and gate decisions.
- **Templates (`templates/`)** — Reusable Markdown report templates.
- **Checklists (`checklists/`)** — Rapid review checklists per domain.
- **Scripts (`scripts/`)** — Python validators and scoring engine.
- **Examples (`examples/`)** — Sample application, requirements, assessment, findings, and final report.
- **Adapters (`adapters/`)** — Claude Code and GitHub Copilot installation guides.

---

## The 16 NFR Domains

1. Performance Engineering
2. Scalability Engineering
3. Availability Engineering
4. Reliability & Resilience
5. Security Engineering
6. Maintainability Engineering
7. Usability Engineering
8. Compatibility Engineering
9. Observability Engineering
10. Disaster Recovery & Recoverability
11. Portability Engineering
12. Compliance & Privacy
13. Operability Engineering
14. Accessibility Engineering
15. Cost Efficiency Engineering
16. AI System Quality Engineering

---

## Assessment Pipeline

```
DISCOVER → QUANTIFY → ASSESS → VALIDATE → SCORE → REPORT
```

See `SKILL.md` for the full workflow and `references/assessment-methodology.md`
for the detailed methodology.

---

## Standards Reference

This skill uses the following standards as reference guidance. It does not
claim certified compliance with any of them.

- ISO/IEC 25010:2023
- OWASP ASVS
- OWASP Top 10
- OWASP API Security Top 10
- NIST SSDF
- Google SRE principles
- WCAG 2.2

---

## License

Licensed under Apache-2.0 / MIT Dual License (Agentplugin Enterprise).
