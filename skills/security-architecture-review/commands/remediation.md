# /security-remediation-plan

Produces a prioritized remediation plan from all security findings.

## Invocation

```
/security-remediation-plan               # Generate remediation plan from all findings
/security-remediation-plan --priority <level>  # Filter by priority (immediate, short, medium, long)
```

## Process

1. Collect all findings from threat model, risk assessment, and compliance mapping.
2. Sort by severity (Critical → High → Medium → Low → Informational).
3. Assign remediation priority based on severity and exploitability:
   - Immediate (0-7 days): Critical and High-severity findings that are easily exploitable.
   - Short-term (1-4 weeks): High and Medium findings requiring code changes.
   - Medium-term (1-3 months): Medium findings requiring architectural changes.
   - Long-term (3+ months): Low findings and strategic improvements.
4. For each item, estimate effort (Small/Medium/Large) and recommend an owner if known.
5. Provide a verification method for each remediation.

## Output

```
# Security Remediation Plan

## Immediate (0-7 days)

### 1. RISK-001: Missing object-level authorization on /api/orders/<id>
- Severity: Critical
- Effort: Small
- Action: Add ownership check: verify authenticated user owns the requested order ID before returning data.
- Verification: Write test that attempts to access another user's order and expects 403.
- Files: src/api/routes/orders.ts:42

### 2. RISK-003: Hardcoded API key in source code
- Severity: Critical
- Effort: Small
- Action: Move API key to environment variable. Remove from source. Rotate the exposed key.
- Verification: grep for the key string in the repo (should find zero results). Verify the key has been rotated.
- Files: src/services/payment.ts:15

## Short-term (1-4 weeks)
...

## Medium-term (1-3 months)
...

## Long-term (3+ months)
...

## Summary
- Immediate: N items (estimated effort: X Small, Y Medium, Z Large)
- Short-term: N items
- Medium-term: N items
- Long-term: N items
- Total: N items
```

## Rules

- Every remediation item must have a specific, actionable recommendation.
- Every item must reference the finding ID it addresses.
- Every item must have a verification method (how to confirm the fix works).
- Effort estimates should be realistic, not optimistic.
- Do not recommend a fix without understanding the codebase context (check for existing patterns to follow).
- Prioritize by risk, not by ease of fix — but note when a high-risk item is also easy to fix (quick win).
