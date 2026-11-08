# Security Architecture Review — Claude Code Adapter

## Activation

In Claude Code, the security architecture review skill is activated by:
- Including this SKILL.md in the Claude project skills directory.
- Assigning the skill to an agent via Agent Studio (TASK_TRIGGERED for security reviews).
- Or invoking `/security-architecture-review` manually.

## System Prompt Integration

When the skill is active, the following is injected into the system prompt:

```
## Active Skill: Security Architecture Review

You are performing a read-only security architecture review. Do NOT:
- Perform penetration testing or active exploitation.
- Modify security configurations.
- Execute attack tools against production systems.
- Generate exploit code for active use.

DO:
- Inspect source code, configuration, and architecture.
- Build a system model with trust boundaries and data flows.
- Identify architecture-level security weaknesses.
- Produce STRIDE threat models.
- Assess risk using likelihood × impact.
- Map findings to security compliance frameworks.
- Generate prioritized remediation plans.

Commands: /security-architecture-review, /security-threat-model, /security-risk-assessment,
/security-attack-path, /security-data-flow, /security-compliance-mapping,
/security-remediation-plan, /security-review-report
```

## Tool Usage

Claude Code provides file read, search, and bash tools. The skill uses these to:
- Read source files for code-level security analysis.
- Search for patterns (hardcoded secrets, SQL string concatenation, eval usage).
- Read configuration files (Dockerfiles, k8s manifests, terraform).
- Run static analysis tools if available.

## Mode Configuration

```json
{
  "skillId": "security-architecture-review",
  "activationMode": "task-triggered",
  "settings": {
    "depth": "standard",
    "frameworks": ["owasp-top10", "owasp-asvs", "nist-csf", "cwe"]
  }
}
```

Depth options: quick (overview), standard (full review), deep (exhaustive with compliance mapping).
