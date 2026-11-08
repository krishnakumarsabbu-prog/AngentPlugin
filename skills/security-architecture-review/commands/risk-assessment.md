# /security-risk-assessment

Produces a risk assessment with likelihood × impact ratings for all findings.

## Invocation

```
/security-risk-assessment                 # Assess all identified risks
/security-risk-assessment --component <c> # Assess risks for a specific component
```

## Process

1. Collect all findings from the threat model and architecture assessment.
2. For each finding, rate likelihood and impact using the model in `references/risk-assessment.md`.
3. Calculate severity from the severity matrix.
4. Classify each finding (Confirmed, Suspected, Assumption, Missing evidence).
5. Produce the risk register.

## Output

```
# Risk Assessment

## Methodology
Risk = Likelihood × Impact
Scale: Low / Medium / High (likelihood), Low / Medium / High / Critical (impact)

## Risk Register

### RISK-001: <title>
- Category: <IAM/AppSec/API/Data/Infra/AI>
- Severity: <Critical/High/Medium/Low/Informational>
- Likelihood: <Low/Medium/High> — <reasoning>
- Impact: <Low/Medium/High/Critical> — <reasoning>
- Classification: <Confirmed/Suspected/Assumption/Missing evidence>
- Evidence: <file, line, config reference>
- Recommended mitigation: <action>

## Risk Summary
- Critical: N
- High: N
- Medium: N
- Low: N
- Informational: N
```

## Rules

- Always explain the reasoning behind likelihood and impact ratings.
- Do not inflate or deflate severity. Rate based on evidence.
- Separate confirmed findings from suspected ones.
- For missing evidence, state what was not available.
- Never present a suspected finding as confirmed.
