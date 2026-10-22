<!--
AgentForge Enterprise Dual License: Apache-2.0 / MIT
Copyright (C) AgentForge Engineering. All rights reserved.
Adapted with attribution from JPeetz/agent-skills (OWASP Agentic Skills Top 10).
Licensed under the Apache License, Version 2.0 or the MIT License.
-->

# Sentinel Security Scanner Deployment & Invocation Guide

This guide details deployment, configuration, and automated invocation workflows for the **Sentinel Security Scanner Skill** (`forge-sentinel`) and **Sentinel Agent** (`@sentinel`) across **AgentForge (VS Code)**, **GitHub Copilot Chat**, and **Claude Code**.

---

## 1. Automated Installation via AgentForge Studio

1. Open VS Code Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`).
2. Run `AgentForge: Open` to launch the Studio.
3. In **Skills Studio**, locate **Sentinel Security Scanner Skill** (`sentinel-security-scanner-skill`).
4. Click **Install to Workspace** to automatically target GitHub Copilot, Claude Code, or AgentForge Neutral root.

---

## 2. File Deployment Locations

- **Workspace Canonical:** `skills/sentinel/`
- **AgentForge Neutral Root:** `.agents/skills/sentinel/`
- **GitHub Copilot Skills:** `.github/skills/sentinel/`
- **Claude Code Skills:** `.claude/skills/sentinel/`
- **GitHub Copilot Agent:** `.github/agents/sentinel.agent.md`
- **Claude Code Agent:** `.claude/agents/sentinel.md`

---

## 3. GitHub Copilot Chat Invocations

When you mention `@sentinel` in Copilot Chat, the Sentinel Security Scanner Agent is activated automatically:

### Audit a Local Skill or Directory
```text
@sentinel Scan the skill located at skills/my-skill against OWASP AST10 and generate a SARIF report.
```

### Detect Prompt Injection in Instructions
```text
@sentinel Inspect our agent system prompts and SKILL.md instructions for unparameterized inputs and prompt injection vulnerabilities (AST02).
```

### Check Permissions & File Safety
```text
@sentinel Verify that this skill manifest has no excessive permissions (AST04), wildcard writes (AST08), or missing deny_write protections.
```

### CI/CD Compliance Gate
```text
@sentinel Evaluate this pull request diff for secret leaks, malicious shell invocations, and network egress violations.
```

---

## 4. CLI & Automation Execution

### Python Scanner Execution:
```bash
# Human-readable text report:
py skills/sentinel/scripts/scan_skill.py --skill-dir skills/my-skill/

# JSON output for automated processing:
py skills/sentinel/scripts/scan_skill.py --skill-dir skills/my-skill/ --format json --output report.json

# SARIF v2.1.0 output for GitHub Advanced Security:
py skills/sentinel/scripts/scan_skill.py --skill-dir skills/my-skill/ --format sarif --output results.sarif

# CI/CD Gate mode (exit code 1 if score > 40):
py skills/sentinel/scripts/scan_skill.py --skill-dir skills/my-skill/ --max-score 40 --ci
```

### Node.js Scanner Execution:
```bash
# Run Node.js engine with SARIF output:
node skills/sentinel/scripts/sentinel-scanner.cjs --dir skills/my-skill/ --format sarif --output results.sarif

# Run unit tests:
node skills/sentinel/tests/sentinel.test.cjs
```
