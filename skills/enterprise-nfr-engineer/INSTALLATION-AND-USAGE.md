# Enterprise NFR Engineer — Installation & Usage Guide

This guide covers deployment, configuration, and invocation for **Enterprise
NFR Engineer** across **AgentForge (VS Code)**, **GitHub Copilot Chat**, and
**Claude Code**.

---

## 1. Automated Installation via AgentForge Plugin

Enterprise NFR Engineer is integrated into the AgentForge workbench:

1. Open VS Code Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`).
2. Run `AgentForge: Open` or click the **AgentForge** icon in the activity bar.
3. In **Skill Studio**, select **Enterprise NFR Engineer** (`enterprise-nfr-engineer`).
4. Click **Install to Workspace** and pick your target platform (**GitHub Copilot**, **Claude Code**, or **Neutral Workspace**).

---

## 2. File Deployment Locations

When installed to your workspace, the skill writes files into:

### GitHub Copilot
- Skill directory: `.github/skills/enterprise-nfr-engineer/`
- Copilot Agent: `.github/agents/enterprise-nfr-engineer.agent.md`

### Claude Code
- Skill directory: `.claude/skills/enterprise-nfr-engineer/`
- Claude Agent: `.claude/agents/enterprise-nfr-engineer.md`

### AgentForge Neutral Standard
- Skill directory: `.agents/skills/enterprise-nfr-engineer/`

See `adapters/claude-code.md` and `adapters/github-copilot.md` for detailed
adapter instructions.

---

## 3. Invoking in GitHub Copilot Chat

### Full NFR Assessment:
```text
@enterprise-nfr-engineer Assess the NFRs of this repository. Cover performance, scalability, reliability, security, observability, and disaster recovery.
```

### Quantify Requirements:
```text
@enterprise-nfr-engineer Quantify our non-functional requirements. Convert "must be fast" and "must be secure" into measurable criteria with targets and acceptance criteria.
```

### Production Readiness Review:
```text
@enterprise-nfr-engineer Run a production-readiness review for the payments service. Check availability, reliability, operability, and DR.
```

### AI Quality Assessment:
```text
@enterprise-nfr-engineer Evaluate the AI quality of our RAG application. Check hallucination controls, grounding, prompt injection defenses, and evaluation coverage.
```

### Score and Report:
```text
@enterprise-nfr-engineer Score our findings and generate the full NFR assessment report.
```

---

## 4. Invoking in Claude Code

```text
Run the enterprise-nfr-engineer skill to assess this codebase. Discover the application context, identify applicable NFR domains, quantify requirements, assess each domain, validate evidence, calculate scores, and generate the report.
```

---

## 5. Running Validation and Tests

### Validate Suite Files and Schemas:
```bash
node skills/enterprise-nfr-engineer/scripts/validate-nfr-engineer.cjs
```

### Run Unit Tests:
```bash
node skills/enterprise-nfr-engineer/tests/nfr-engineer.test.cjs
```

### Validate JSON Schemas:
```bash
python3 skills/enterprise-nfr-engineer/scripts/validate-schemas.py
```

### Validate a Sample Assessment:
```bash
python3 skills/enterprise-nfr-engineer/scripts/validate-assessment.py examples/sample-assessment.json
```

### Calculate NFR Scores:
```bash
python3 skills/enterprise-nfr-engineer/scripts/calculate-nfr-score.py examples/sample-assessment.json
```

### Sync Skills Across Platforms:
```bash
node scripts/sync-skills.cjs
```
