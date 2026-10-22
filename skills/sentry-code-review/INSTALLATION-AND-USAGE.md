# Sentry Code Review Installation & Deployment Guide

This document describes how to deploy, configure, and invoke **Sentry Code Review** across **AgentForge (VS Code)**, **GitHub Copilot Chat**, and **Claude Code**.

---

## 1. Automated Installation via AgentForge

1. Open the VS Code Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`).
2. Run `AgentForge: Open` or click the **AgentForge** activity bar icon.
3. In **Skill Studio**, select **Sentry Code Review** (`sentry-code-review`).
4. Click **Install to Workspace** and select your target platform (**GitHub Copilot**, **Claude Code**, or **Neutral Workspace**).

---

## 2. Platform Installation Locations

When deployed to a workspace, Sentry Code Review populates:

### GitHub Copilot
- Skill directory: `.github/skills/sentry-code-review/`
- Copilot Agent: `.github/agents/sentry-code-review.agent.md`

### Claude Code
- Skill directory: `.claude/skills/sentry-code-review/`
- Claude Agent: `.claude/agents/sentry-code-review.md`

### AgentForge Neutral Standard
- Skill directory: `.agents/skills/sentry-code-review/`

---

## 3. Usage & Invocation in GitHub Copilot Chat

### Pull Request & Diff Review:
```text
@sentry-code-review Review the git diff against main branch and identify blocking bugs or performance issues.
```

### Targeted File Quality Audit:
```text
@sentry-code-review Audit src/services/billing.ts for error handling, N+1 database queries, and boundary checks.
```

### Architecture Review:
```text
@sentry-code-review Evaluate the coupling and separation of concerns in our new payment module.
```

---

## 4. Running Validation & Tests

### Validate Suite Files:
```bash
node skills/sentry-code-review/scripts/validate-sentry.cjs
```

### Run Unit Tests:
```bash
node skills/sentry-code-review/tests/sentry-review.test.cjs
```

### Run Cross-Platform Integration Tests:
```bash
node skills/sentry-code-review/tests/sentry-integration.test.cjs
```

### Sync Across Platforms:
```bash
node scripts/sync-skills.cjs
```
