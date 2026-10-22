# Anvil Installation & Multi-Platform Usage Guide

This document describes how to deploy, configure, and invoke the Anvil Token Optimization Suite across supported AI coding platforms: **AgentForge (VS Code)**, **GitHub Copilot Chat**, and **Claude Code**.

---

## 1. Automated Installation via AgentForge Plugin

Anvil is pre-configured as an integrated core capability within AgentForge:

1. Open the VS Code Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`).
2. Run `AgentForge: Open` or click the **AgentForge** activity bar icon.
3. In **Skill Studio**, select **Anvil** (`anvil`).
4. Click **Install to Workspace** and select your target platform (**GitHub Copilot**, **Claude Code**, or **Neutral Workspace**).

---

## 2. Multi-Platform File Placement

When deployed to a repository workspace, Anvil installs into the following locations:

### GitHub Copilot
- Skill directory: `.github/skills/anvil/`
- Copilot Agent: `.github/agents/anvil.agent.md`

### Claude Code
- Skill directory: `.claude/skills/anvil/`
- Claude Agent: `.claude/agents/anvil.md`

### AgentForge Neutral Standard
- Skill directory: `.agents/skills/anvil/`

---

## 3. Usage & Invocation

### In GitHub Copilot Chat:
```text
@anvil Debug the failed payment webhook test and optimize output.
```
The `@anvil` agent automatically:
1. Detects large logs, traces, or schemas and runs `anvil_shrink_input`.
2. Inspects multi-file reads with `anvil_audit_waste`.
3. Selects optimal reasoning effort with `anvil_route_effort`.
4. Enforces ASD-STE100 concise voice on the final answer with `anvil_format_output`.

### In Slash Command Mode:
```text
/anvil Refactor the auth middleware to support PKCE.
```
Activates standard terse voice: answer first, zero conversational filler, 100% exact code blocks.

```text
/anvil-dense
```
Activates telegraphic fragments for maximum density.

```text
/anvil-core
```
Activates ultra-condensed symbolic representation.

```text
stop anvil
```
Restores default verbose assistant voice.

---

## 4. Running Scripts & Validators

### Validate Suite Integrity:
```bash
node skills/anvil/scripts/validate-anvil.cjs
```

### Run Compression Test Suite:
```bash
node skills/anvil/tests/anvil.test.cjs
```

### Sync Skills Across Platforms:
```bash
node scripts/sync-skills.cjs
```
