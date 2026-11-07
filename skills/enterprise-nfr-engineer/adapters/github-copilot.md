# GitHub Copilot Adapter

## Installation

To install the Enterprise NFR Engineer skill into GitHub Copilot, copy the
skill directory to:

```
.github/skills/enterprise-nfr-engineer/
```

### Manual Installation

```bash
# From the project root
mkdir -p .github/skills
cp -r skills/enterprise-nfr-engineer .github/skills/
```

### Using the AgentForge Plugin

1. Open the AgentForge workbench in VS Code.
2. Select **Enterprise NFR Engineer** in Skill Studio.
3. Click **Install to Workspace** → **GitHub Copilot**.

The plugin copies the skill to `.github/skills/enterprise-nfr-engineer/` and
creates a Copilot agent file at `.github/agents/enterprise-nfr-engineer.agent.md`.

## Usage in GitHub Copilot Chat

### Full Assessment

```text
@enterprise-nfr-engineer Assess the NFRs of this repository. Cover performance,
scalability, reliability, security, observability, and disaster recovery.
Follow the six-phase assessment pipeline.
```

### Targeted Assessment

```text
@enterprise-nfr-engineer Run a security-only assessment using the
security-assessment-agent role definition. Check authentication, authorization,
secrets management, API security, and supply chain.
```

### Production Readiness Review

```text
@enterprise-nfr-engineer Run a production-readiness review using the
production-readiness checklist. Focus on deployment, rollback, monitoring,
on-call, and incident response.
```

### Quantify Requirements

```text
@enterprise-nfr-engineer Quantify our non-functional requirements. Convert
"must be fast", "must be secure", and "must not go down" into measurable
criteria with targets, units, and acceptance criteria.
```

### Score and Report

```text
@enterprise-nfr-engineer Score the findings in examples/sample-assessment.json
and generate the full NFR assessment report.
```

## How Specialist Agents Work in GitHub Copilot

The `agents/` directory contains 16 role definition files. In GitHub Copilot,
these are **not** native subagents. The host agent (Copilot) reads the
relevant role definition and follows its instructions within the chat
context.

### Orchestration Pattern

1. Copilot reads `SKILL.md` to understand the assessment pipeline.
2. Copilot reads `agents/nfr-orchestrator.md` for coordination guidance.
3. For each applicable domain, Copilot reads the corresponding agent file.
4. Copilot follows the agent's assessment procedure, records findings, and
   cites evidence.
5. Copilot reads `agents/evidence-validation-agent.md` and validates findings.
6. Copilot runs `scripts/calculate-nfr-score.py` (if Python is available) or
   applies the scoring model manually.
7. Copilot generates the report from `templates/nfr-assessment-report.md`.

## Copilot Agent File Template

If creating a `.github/agents/enterprise-nfr-engineer.agent.md` file, use
this template:

```markdown
---
name: enterprise-nfr-engineer
description: Enterprise NFR engineering assessment skill
---

# Enterprise NFR Engineer

This agent uses the Enterprise NFR Engineer skill located at
`.github/skills/enterprise-nfr-engineer/`.

Read `SKILL.md` in that directory for the full assessment pipeline, then
follow the specialist agent role definitions in `agents/` for each applicable
NFR domain.
```

## Single Source of Truth

The shared `SKILL.md` and `references/` in the skill directory remain the
single source of truth. Do not duplicate the core skill content into the
Copilot agent file. The agent file should reference the skill directory.
