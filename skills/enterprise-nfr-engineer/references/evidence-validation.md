# Evidence Validation

## Objective

Challenge every finding for evidence traceability and assign a validation
state. Enforce the invariants that make the assessment defensible.

## Validation States

| State | Meaning | Counts as PASS? |
|-------|---------|-----------------|
| VERIFIED_PASS | Requirement met, evidence verified | Yes |
| VERIFIED_FAIL | Requirement not met, evidence verified | No |
| PARTIALLY_VERIFIED | Some aspects verified, others not | No |
| NOT_TESTED | Check was not executed | No |
| INSUFFICIENT_EVIDENCE | Evidence cited but insufficient or unverifiable | No |
| NOT_APPLICABLE | Requirement does not apply (requires justification) | Excluded from scoring |

## Invariants (Non-Negotiable)

1. **Unknown is never PASS.** If you cannot verify, it is NOT_TESTED or INSUFFICIENT_EVIDENCE.
2. **Missing evidence is never PASS.** A finding without evidence is INSUFFICIENT_EVIDENCE.
3. **N/A requires justification.** Every NOT_APPLICABLE finding must include a documented justification.
4. **Exceptions require an owner, rationale, compensating controls, and expiry.** No permanent blanket exceptions.
5. **Never fabricate test execution or tool output.** If a tool was not run, mark NOT_EXECUTED.
6. **Conditional approval requires explicit authorization.** The gate decision must name the approver.

## Validation Procedure

For each finding:

1. **Locate the evidence.** Verify the cited file path, config line, metric, log, or test result exists and is accessible.
2. **Assess sufficiency.** Is the evidence sufficient to support the finding's claim?
   - A code path existing is evidence of implementation, not of correctness.
   - A config value is evidence of intent, not of runtime behavior.
   - A test result is evidence of behavior at test time, not production.
3. **Assign a validation state.**
   - If evidence confirms the requirement is met → VERIFIED_PASS.
   - If evidence confirms the requirement is not met → VERIFIED_FAIL.
   - If evidence partially confirms → PARTIALLY_VERIFIED.
   - If no test or check was run → NOT_TESTED.
   - If evidence is missing or insufficient → INSUFFICIENT_EVIDENCE.
   - If the requirement genuinely does not apply → NOT_APPLICABLE (with justification).
4. **Flag violations.** If a finding claims PASS without evidence, flag it as a validation violation.

## Evidence Types

| Evidence Type | Reliability | Example |
|---------------|-------------|---------|
| Executed test result | High | Load test report showing p95 < 200ms |
| Tool scan output | High | Trivy scan with zero critical CVEs |
| Live metric / dashboard | High | Grafana dashboard showing 99.97% availability |
| Config file | Medium | Kubernetes HPA config with scaling rules |
| Code implementation | Medium | Circuit breaker class in codebase |
| Architecture diagram | Medium | Deployment topology diagram |
| Design document | Medium | SLO definition in design doc |
| Stakeholder statement | Low | "We target 99.9% availability" (verbal) |
| Implicit / inferred | Low | "This is a web API so it should have rate limiting" |

Low-reliability evidence should be marked PARTIALLY_VERIFIED or
INSUFFICIENT_EVIDENCE unless corroborated by higher-reliability evidence.

## Coverage Metrics

- **Requirement coverage**: percentage of applicable requirements that have been assessed.
- **Evidence coverage**: percentage of findings that cite traceable evidence.
- **Validation coverage**: percentage of findings with a validation state of VERIFIED_PASS or VERIFIED_FAIL.

These metrics feed into the scoring model (see `scoring-model.md`).

## Escalation

- A critical requirement has INSUFFICIENT_EVIDENCE → escalate to Orchestrator.
- A finding claims PASS without evidence → flag as validation violation.
- Multiple findings are NOT_TESTED for a critical domain → assessment is INCOMPLETE.
- A finding fabricates tool output → reject the finding and flag as a violation.
