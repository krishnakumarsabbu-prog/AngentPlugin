# /security-threat-model

Generates a STRIDE threat model for the system or a specific component.

## Invocation

```
/security-threat-model                    # Threat model the entire system
/security-threat-model <component>        # Threat model a specific component
```

## Process

1. Build or load the system model (from architecture assessment).
2. Identify assets, attack surface, and trust boundaries.
3. Apply STRIDE to each component and boundary.
4. For each threat, produce a threat record (see `references/stride-methodology.md`).
5. Identify attack paths that chain threats across components.
6. Output the threat model.

## Output

```
# STRIDE Threat Model

## System Overview
<brief description of the system being modeled>

## Assets
1. <asset>: <why it needs protection>

## Attack Surface
1. <entry point>: <exposure>

## Trust Boundaries
1. <boundary>: <from> → <to>, <what crosses>

## Threats

### THREAT-001: <title>
- Category: <S/T/R/I/D/E>
- Affected component: <component>
- Attack scenario: <description>
- Entry point: <how>
- Preconditions: <what must be true>
- Exploitability: <Low/Medium/High>
- Business impact: <Low/Medium/High/Critical>
- Likelihood: <Low/Medium/High>
- Severity: <Critical/High/Medium/Low>
- Existing controls: <what is in place>
- Recommended mitigation: <what to do>
- Evidence: <file/config reference>

## Attack Paths

### Attack Path 1: <name>
Objective: <attacker goal>
1. [Spoofing] THREAT-003: ...
2. [Elevation] THREAT-007: ...
3. [Info Disclosure] THREAT-012: ...
Overall impact: <summary>
```

## Rules

- Every threat must have evidence (file, line, config, or documented behavior).
- Distinguish confirmed threats from suspected ones.
- Do not invent threats that have no basis in the system's architecture or code.
- Always provide a recommended mitigation for each threat.
- Attack paths must reference specific threat IDs.
