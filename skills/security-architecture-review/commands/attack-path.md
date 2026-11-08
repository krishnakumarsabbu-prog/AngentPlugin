# /security-attack-path

Analyzes attack paths — chains of threats that an attacker can combine to achieve a larger objective.

## Invocation

```
/security-attack-path                           # Identify all attack paths
/security-attack-path --target <asset>          # Find paths to a specific asset
/security-attack-path --from <entry> --to <goal> # Find paths between two points
```

## Process

1. Load the threat model (threats and trust boundaries).
2. Identify high-value targets (sensitive data, privileged access, critical services).
3. For each target, trace backward from the target to find entry points.
4. Chain threats that can be connected (output of one enables the precondition of another).
5. Assess the overall likelihood and impact of each path.
6. Produce the attack path report.

## Output

```
# Attack Path Analysis

## Attack Path 1: Unauthorized data access via API chain
Objective: Access all tenants' PII

Chain:
1. [Spoofing] THREAT-003: Forge service token (Entry: public API)
   → Gains: Access to internal API
2. [Elevation of Privilege] THREAT-007: No object-level auth on internal API
   → Gains: Access to any tenant's data
3. [Information Disclosure] THREAT-012: API returns full PII in response
   → Achieves: Mass PII exposure

Overall likelihood: Medium
Overall impact: Critical
Overall severity: High
Existing controls: None at steps 2 and 3
Recommended remediation: Add object-level auth (step 2), minimize response data (step 3)

## Attack Path 2: ...
```

## Rules

- Every step in an attack path must reference a specific threat ID.
- The chain must be logically connected: the output of step N must enable the precondition of step N+1.
- Assess overall likelihood (the product of individual step likelihoods, adjusted for dependency).
- Assess overall impact (the final objective's impact, not the sum of individual impacts).
- Always provide recommended remediation that breaks the chain at its weakest link.
