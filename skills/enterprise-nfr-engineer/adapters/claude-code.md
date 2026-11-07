# Claude Code Adapter

## Installation

To install the Enterprise NFR Engineer skill into Claude Code, copy the skill
directory to:

```
.claude/skills/enterprise-nfr-engineer/
```

### Manual Installation

```bash
# From the project root
mkdir -p .claude/skills
cp -r skills/enterprise-nfr-engineer .claude/skills/
```

### Using the AgentForge Plugin

1. Open the AgentForge workbench in VS Code.
2. Select **Enterprise NFR Engineer** in Skill Studio.
3. Click **Install to Workspace** → **Claude Code**.

The plugin copies the skill to `.claude/skills/enterprise-nfr-engineer/` and
creates a Claude agent file at `.claude/agents/enterprise-nfr-engineer.md`.

## Usage in Claude Code

### Full Assessment

```text
Run the enterprise-nfr-engineer skill to assess this codebase. Discover the
application context, identify applicable NFR domains, quantify requirements,
assess each domain, validate evidence, calculate scores, and generate the
report.
```

### Targeted Assessment

```text
Using the enterprise-nfr-engineer skill, assess only the security and
reliability domains of this codebase. Follow the security-assessment-agent
and reliability-sre-agent role definitions.
```

### Scoring Only

```text
Using the enterprise-nfr-engineer skill, calculate NFR scores from the
findings in examples/sample-assessment.json. Apply quality gates and report
the final decision.
```

## How Specialist Agents Work in Claude Code

The `agents/` directory contains 16 role definition files. In Claude Code,
these are **not** native subagents that auto-execute. The host agent (Claude)
reads the relevant role definition and follows its instructions within the
single conversation context.

### Orchestration Pattern

1. Claude reads `SKILL.md` to understand the assessment pipeline.
2. Claude reads `agents/nfr-orchestrator.md` for coordination guidance.
3. For each applicable domain, Claude reads the corresponding agent file
   (e.g., `agents/security-assessment-agent.md`).
4. Claude follows the agent's assessment procedure, records findings, and
   cites evidence.
5. Claude reads `agents/evidence-validation-agent.md` and validates all
   findings.
6. Claude runs `scripts/calculate-nfr-score.py` (if Python is available) or
   applies the scoring model manually.
7. Claude generates the report from `templates/nfr-assessment-report.md`.

## Single Source of Truth

The shared `SKILL.md` and `references/` in the skill directory remain the
single source of truth. Do not duplicate the core skill content into the
Claude agent file. The agent file should reference the skill directory.

## Claude Agent File Template

If creating a `.claude/agents/enterprise-nfr-engineer.md` file, use this
template:

```markdown
---
name: enterprise-nfr-engineer
description: Enterprise NFR engineering assessment skill
---

# Enterprise NFR Engineer

This agent uses the Enterprise NFR Engineer skill located at
`.claude/skills/enterprise-nfr-engineer/`.

Read `SKILL.md` in that directory for the full assessment pipeline, then
follow the specialist agent role definitions in `agents/` for each applicable
NFR domain.
```
