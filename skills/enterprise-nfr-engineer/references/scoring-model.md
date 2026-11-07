# Scoring Model

## Objective

Provide a transparent, reproducible scoring methodology for NFR assessments.

## Scoring Components

### 1. Domain Score (0–100 per domain)

Each domain is scored based on its findings:

```
domain_score = 100 - sum(finding_penalties)
```

Finding penalties by severity:

| Severity | Penalty (default) |
|----------|-------------------|
| CRITICAL | 40 |
| HIGH | 20 |
| MEDIUM | 8 |
| LOW | 3 |
| INFORMATIONAL | 0 |

The domain score is floored at 0. Penalties are configurable via the scoring
policy.

### 2. Requirement Coverage (%)

```
requirement_coverage = (assessed_requirements / applicable_requirements) * 100
```

Only requirements that have been assessed (have at least one finding with a
validation state) count as assessed.

### 3. Evidence Coverage (%)

```
evidence_coverage = (findings_with_traceable_evidence / total_findings) * 100
```

### 4. Validation Coverage (%)

```
validation_coverage = (findings_verified / total_findings) * 100
```

Where `findings_verified` = findings with validation state VERIFIED_PASS or
VERIFIED_FAIL.

### 5. Overall Weighted Score (0–100)

```
overall_score = sum(domain_score * domain_weight) / sum(domain_weight)
```

Domain weights are configurable (see `nfr-domain-catalog.md` for defaults).
Excluded domains (NOT_APPLICABLE with justification) are excluded from the
weighted sum.

## Critical-Failure Override

When the configured gate policy requires blocking, a CRITICAL finding in
Security, Availability, or Reliability overrides the overall score:

- If any CRITICAL finding exists in a blocking domain → final status is FAIL,
  regardless of the overall score.
- This prevents a high aggregate score from masking a critical gap.

Blocking domains (configurable):
- Security
- Availability
- Reliability & Resilience

## Coverage Penalties

Low coverage reduces confidence in the score:

| Coverage Metric | Threshold | Effect |
|----------------|-----------|--------|
| Requirement coverage | < 80% | Cap overall score at 80 |
| Requirement coverage | < 60% | Cap overall score at 60, status INCOMPLETE |
| Evidence coverage | < 70% | Cap overall score at 80 |
| Validation coverage | < 70% | Cap overall score at 80 |

These caps apply after the weighted score is calculated but before the final
status is determined.

## Final Status Determination

| Condition | Status |
|-----------|--------|
| Overall score >= 80 AND no CRITICAL findings in blocking domains AND coverage thresholds met | PASS |
| Overall score >= 60 AND no CRITICAL findings in blocking domains AND coverage thresholds met | CONDITIONAL_PASS |
| CRITICAL finding in a blocking domain | FAIL |
| Requirement coverage < 60% | INCOMPLETE |
| Overall score < 60 | FAIL |

## Status Definitions

| Status | Meaning |
|--------|---------|
| PASS | System meets NFR requirements with sufficient evidence. |
| CONDITIONAL_PASS | System meets most requirements but has gaps requiring remediation within a defined timeline. |
| FAIL | System has critical gaps or critical findings in blocking domains. |
| INCOMPLETE | Assessment lacks sufficient coverage to make a determination. |

## Explainability

Every gate decision must be explainable. The scoring script outputs:

- Per-domain scores with finding counts by severity.
- Coverage metrics (requirement, evidence, validation).
- Overall weighted score.
- Critical-failure overrides applied (if any).
- Coverage caps applied (if any).
- Final status with the rule that triggered it.

## Configuration

The scoring script accepts a policy configuration (see
`schemas/quality-gate.schema.json`) with:

- Domain weights (override defaults).
- Severity penalties (override defaults).
- Blocking domains (override defaults).
- Coverage thresholds (override defaults).
- Status thresholds (override defaults).
