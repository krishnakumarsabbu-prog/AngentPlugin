# Security Architecture Review — Generic Agent Adapter

## Activation

For agents that do not fit the Copilot or Claude model, the skill is activated by:

1. Including the SKILL.md content in the agent's system prompt.
2. Loading relevant reference files based on the task (threat model, risk assessment, etc.).
3. Providing the agent with file read, search, and (optionally) shell tools.

## Minimal Integration

At minimum, the agent must receive:
- The STRIDE threat modeling framework.
- The risk assessment model.
- The security controls checklist.
- The honesty rules (read-only, evidence required, no exploitation).
- The command descriptions.

## System Prompt Injection

```
## Active Skill: Security Architecture Review

### Rules
- Read-only analysis. No exploitation, no destructive testing.
- Every finding must have evidence (file, line, config reference).
- Distinguish confirmed findings from suspected and assumptions.
- Rate risk using likelihood × impact. Explain the reasoning.
- Map findings to applicable compliance frameworks.
- Produce a prioritized remediation plan.

### Commands
- security-architecture-review: Full review
- security-threat-model: STRIDE threat model
- security-risk-assessment: Risk register
- security-attack-path: Attack path analysis
- security-data-flow: Data flow analysis
- security-compliance-mapping: Compliance mapping
- security-remediation-plan: Remediation plan
- security-review-report: Full report
```

## Tool Requirements

The agent needs:
- File read access (to inspect source code and configuration).
- Search/grep capability (to find security patterns).
- Optional: shell access (to run static analysis tools like Semgrep, ESLint security plugin).

If file access is limited, state what was not assessed in the review output.
