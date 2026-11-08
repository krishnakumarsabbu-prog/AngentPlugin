# Risk Assessment Model

## Risk Formula

**Risk = Likelihood × Impact**

Both likelihood and impact are rated on a three-level scale (Low, Medium, High). The combination determines severity.

## Likelihood Scale

| Rating | Definition |
|---|---|
| Low | Requires privileged access, insider knowledge, or a specific rare condition. Unlikely to be exploited in practice. |
| Medium | Exploitable with some effort or specific conditions. A determined attacker could exploit it. |
| High | Easily exploitable with minimal effort or publicly known exploit. Any external attacker could exploit it. |

Factors affecting likelihood:
- Attack complexity (simple vs. multi-step).
- Required access level (anonymous vs. authenticated vs. admin).
- Required knowledge (public information vs. internal knowledge).
- Existing mitigations (partial controls reduce likelihood).
- Public exploit availability.

## Impact Scale

| Rating | Definition |
|---|---|
| Low | Minimal data exposure, no business disruption, easily remediated. |
| Medium | Limited data exposure, temporary service degradation, regulatory notification may be required. |
| High | Significant data exposure (PII, financial), prolonged service disruption, regulatory penalty likely. |
| Critical | Mass data exposure, complete service disruption, severe regulatory/legal consequences, reputational damage. |

Factors affecting impact:
- Amount and sensitivity of exposed data.
- Number of affected users.
- Business criticality of the affected service.
- Regulatory and legal consequences.
- Reputational damage potential.
- Persistence of the impact (recoverable vs. irreversible).

## Severity Matrix

| Likelihood \ Impact | Low | Medium | High | Critical |
|---|---|---|---|---|
| High | Medium | High | High | Critical |
| Medium | Low | Medium | High | High |
| Low | Low | Low | Medium | Medium |

## Severity Definitions

- **Critical**: Immediate action required. The finding is easily exploitable and has severe business impact. Remediate within 0-7 days.
- **High**: Prompt action required. The finding is exploitable and has significant impact. Remediate within 1-4 weeks.
- **Medium**: Planned action required. The finding requires specific conditions to exploit and has moderate impact. Remediate within 1-3 months.
- **Low**: Track and improve. The finding is difficult to exploit or has minimal impact. Remediate as resources allow.
- **Informational**: Best practice or observation. No direct risk, but improving it strengthens overall security posture.

## Finding Classification

Every finding must be classified into one of:

- **Confirmed**: Verified with evidence. The vulnerability was observed in code, configuration, or through testing. Evidence is cited (file, line, config key).
- **Suspected**: Likely vulnerability based on patterns or indirect evidence, but not fully verified. Further investigation needed.
- **Architectural assumption**: Based on assumed system behavior that could not be verified from available artifacts. Flagged for confirmation with the engineering team.
- **Missing evidence**: The area could not be assessed due to missing code, documentation, or access. Cannot determine if a vulnerability exists.

## Risk Register Format

```
## RISK-<id>: <title>
- Category: <IAM | AppSec | API | Data | Infra | AI>
- Severity: Critical | High | Medium | Low | Informational
- Likelihood: Low | Medium | High
- Impact: Low | Medium | High | Critical
- Classification: Confirmed | Suspected | Assumption | Missing evidence
- Description: <what the issue is>
- Affected component: <component>
- Evidence: <file, line, config reference, or "not available">
- Existing controls: <what is already in place>
- Recommended mitigation: <what to do about it>
- Remediation priority: Immediate | Short-term | Medium-term | Long-term
- Status: Open | In-progress | Resolved
```

## Rules

- Always explain why a finding received its likelihood and impact ratings.
- Do not inflate severity to create urgency. A low-likelihood, low-impact issue is Low.
- Do not deflate severity to avoid alarm. A high-likelihood, high-impact issue is High.
- Separate confirmed findings from suspected ones. Never present a suspected finding as confirmed.
- For missing evidence, state what was not available and what would be needed to complete the assessment.
- Residual risk (risk remaining after recommended controls) should be noted but is not an excuse to downgrade the original severity.
