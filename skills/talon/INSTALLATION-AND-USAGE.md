# Talon Installation & Deployment Guide

This guide covers deployment, configuration, and invocation for **Talon** across **AgentForge (VS Code)**, **GitHub Copilot Chat**, and **Claude Code**.

---

## 1. Automated Installation via AgentForge Plugin

Talon is integrated directly into the AgentForge workbench:

1. Open VS Code Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`).
2. Run `AgentForge: Open` or click the **AgentForge** icon in the activity bar.
3. In **Skill Studio**, select **Talon** (`talon`).
4. Click **Install to Workspace** and pick your target platform (**GitHub Copilot**, **Claude Code**, or **Neutral Workspace**).

---

## 2. File Deployment Locations

When installed to your workspace, Talon writes files into:

### GitHub Copilot
- Skill directory: `.github/skills/talon/`
- Copilot Agent: `.github/agents/talon.agent.md`

### Claude Code
- Skill directory: `.claude/skills/talon/`
- Claude Agent: `.claude/agents/talon.md`

### AgentForge Neutral Standard
- Skill directory: `.agents/skills/talon/`

---

## 3. Invoking Talon in GitHub Copilot Chat

### Full Security Audit:
```text
@talon Audit this repository for OWASP Top 10 vulnerabilities, injection flaws, and exposed credentials.
```

### API Endpoint Security Review:
```text
@talon Test the /api/v1/auth and /api/v1/billing endpoints for IDOR, JWT bypasses, and rate-limiting flaws.
```

### Frontend DOM XSS Inspection:
```text
@talon Inspect our React components in src/views for DOM-based XSS, unsafe innerHTML usage, and prototype pollution.
```

### Reproduce and Patch a Flaw:
```text
@talon Generate a safe reproduction PoC and a patch for the SQL injection in src/db/users.ts line 45.
```

---

## 4. Running Validation and Tests

### Validate Suite Files and Schemas:
```bash
node skills/talon/scripts/validate-talon.cjs
```

### Run Talon Core Unit Tests:
```bash
node skills/talon/tests/talon.test.cjs
```

### Run Cross-Platform Integration Tests:
```bash
node skills/talon/tests/talon-integration.test.cjs
```

### Sync Skills Across Platforms:
```bash
node scripts/sync-skills.cjs
```
