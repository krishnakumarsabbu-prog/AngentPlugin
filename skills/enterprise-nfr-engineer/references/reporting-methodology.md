# Reporting Methodology

## Objective

Define how NFR assessment reports are generated, structured, and stored.

## Report Generation Rules

1. **Unique assessment identifier.** Every report has a unique ID (e.g., `NFR-2026-001`). Never overwrite a previous report.
2. **Default format is Markdown.** Structured JSON is optional for machine consumption.
3. **Use templates.** Reports are assembled from `templates/` using the master template `templates/nfr-assessment-report.md`.
4. **Progressive detail.** Executive summary first, then domain details, then evidence appendix.
5. **Explainable.** Every score and gate decision must be traceable to the findings and evidence that produced it.

## Full Report Structure

The full assessment report (per `templates/nfr-assessment-report.md`) includes:

1. **Executive Summary** — high-level findings, overall score, gate decision.
2. **Application Context** — system description, criticality, scope.
3. **Assessment Scope** — in-scope and out-of-scope components, excluded domains with justifications.
4. **Methodology** — assessment approach, standards referenced.
5. **Architecture Overview** — component map, deployment topology, data flow.
6. **NFR Requirements** — quantified requirements catalog.
7. **Domain-wise Assessment** — findings per domain with evidence.
8. **Risks and Findings** — consolidated findings sorted by severity.
9. **Evidence and Validation** — evidence inventory, validation states, coverage metrics.
10. **Domain Scores** — per-domain scores with finding counts.
11. **Overall Score** — weighted score with domain weights.
12. **Quality-Gate Decision** — final status, decision rule, conditions, exceptions.
13. **Critical Gaps** — findings that require immediate attention.
14. **Remediation Roadmap** — prioritized remediation plan.
15. **Untested Areas** — checks that were NOT_TESTED or NOT_EXECUTED with explanations.
16. **Limitations** — assessment limitations, tool availability, scope constraints.
17. **Final Engineering Readiness Statement** — overall readiness assessment.

## Section Templates

Use the section templates in `templates/` for standalone or focused reports:

| Template | When to Use |
|----------|-------------|
| `executive-summary.md` | Standalone executive summary for stakeholders |
| `architecture-review.md` | Architecture-only review |
| `security-assessment.md` | Security-only assessment |
| `performance-assessment.md` | Performance-only assessment |
| `reliability-assessment.md` | Reliability-only assessment |
| `observability-assessment.md` | Observability-only assessment |
| `disaster-recovery-assessment.md` | DR-only assessment |
| `ai-quality-assessment.md` | AI quality-only assessment |
| `remediation-plan.md` | Standalone remediation roadmap |
| `nfr-requirements-catalog.md` | Standalone requirements catalog |

## JSON Output (Optional)

When JSON output is requested, the report follows the assessment schema
(`schemas/assessment.schema.json`) with embedded findings, evidence, scores,
and gate decision. This enables machine consumption and CI/CD integration.

## Report Naming

Reports are named with the assessment ID and timestamp:

- Markdown: `nfr-report-{assessment-id}-{timestamp}.md`
- JSON: `nfr-report-{assessment-id}-{timestamp}.json`

Never overwrite an existing report. Generate a new file for each assessment.
