# TALON SKILL & COPILOT AGENT SPECIFICATION (AGENTFORGE v0.1.0)

> **Target Platform:** AgentForge VS Code Extension & GitHub Copilot Chat / Claude Code
>
> **Namespace & Brand:** `Talon` (`talon` unified skill folder & `@talon` agent)
>
> **Licensing Header:** Copyright (C) AgentForge Engineering — Licensed under Apache-2.0 / MIT Dual License (Adapted from `usestrix/strix`)
>
> **Scope:** Skills (`skills/talon/`) + GitHub Copilot Agent (`.github/agents/talon.agent.md`) with automated security scanning, vulnerability orchestration, and autonomous penetration testing rules.

---

## 1. ROLE & OBJECTIVE

You are the Lead Principal Systems Architect for **AgentForge (v0.1.0)**. Your objective is to fetch the upstream open-source autonomous security repository **`usestrix/strix`** (`https://github.com/usestrix/strix`), rebrand all components from Strix to **`Talon`**, apply our enterprise licensing headers, and generate two core targets directly in the workspace:

1. **The Unified Talon Skill Suite**: Packed inside `skills/talon/`, containing the master `SKILL.md` and all sub-feature modules (Graph of Agents execution, browser/proxy security auditing, local containerized terminal execution, and vulnerability proof-of-concept generators) preserving 100% of upstream heuristics and security rules.

2. **The GitHub Copilot Security Agent**: Configured at `.github/agents/talon.agent.md` so that when a user selects `@talon` in Copilot Chat, it automatically routes, selects, and executes the appropriate security auditing skills without manual prompting.

---

## 2. STEP 1: CLONE & INSPECT UPSTREAM REPOSITORY AS-IS

1. Clone `https://github.com/usestrix/strix` locally or fetch its source files:
   ```bash
   git clone --depth 1 https://github.com/usestrix/strix.git /tmp/strix-upstream
   ```

2. Extract all prompt instructions, agent graphs, proxy configs, and security routines from `/tmp/strix-upstream`:
   - `README.md`, `SECURITY.md`, `agents/`, `graphs/`
   - `skills/`, `tools/`, `proxy/`, `browser/`
   - `evals/`, `templates/`, `runners/`

3. **AS-IS PRESERVATION RULE**: Retain 100% of upstream security evaluation metrics, vulnerability detection patterns (OWASP Top 10, CWE mappings), graph-of-agents execution loops, and payload execution schemas. Rebrand branding terminology from `Strix` to `Talon`.

---

## 3. STEP 2: GENERATE THE UNIFIED TALON SKILL SUITE (`skills/talon/`)

Create the directory structure `skills/talon/` containing the master `SKILL.md` and all modular sub-feature files:
```text
skills/talon/
├── SKILL.md                  # Master security entrypoint & threat matrix
├── license.md                # Apache-2.0 / MIT AgentForge Custom Header
├── graph/                    # Graph of Agents execution & handoff rules
├── proxy/                    # HTTP interceptor & traffic analyzer
├── browser/                  # DOM/Browser security inspection & XSS/CSRF testing
├── runner/                   # Sandboxed execution & PoC generation rules
└── audit/                    # Static/Dynamic vulnerability scanners & CVE mapping
```

### Master Skill Frontmatter & Definition (`skills/talon/SKILL.md`)

Every skill file must use this validated AgentForge header with licensing:

```yaml
---
name: talon
version: 1.0.0
description: Autonomous AI penetration testing and security auditing suite. Orchestrates Graph of Agents, browser security analysis, and dynamic vulnerability PoC generation.
author: AgentForge Engineering (Adapted from usestrix/strix)
category: Security & Penetration Testing
tags: [talon, security, pentest, vulnerability-audit, graph-of-agents, copilot-skill]
compatibility: [agy, copilot, claude, openai]
requirements: AgentForge v0.1.0+ Workspace, Least-Privilege Sandbox
license: Apache-2.0 / MIT Dual License (AgentForge Enterprise)
---

# Talon Security & Penetration Testing Suite
Copyright (C) AgentForge Engineering. All rights reserved.
Licensed under the Apache-2.0 and MIT open-source licenses. Adapted with attribution from Strix (usestrix/strix).
```

---

## 4. STEP 3: CONFIGURE THE GITHUB COPILOT SECURITY AGENT (`.github/agents/talon.agent.md`)

Create the file `.github/agents/talon.agent.md`. This file instructs GitHub Copilot Chat to automatically select and execute the correct Talon security skills based on user input context.

Write `.github/agents/talon.agent.md` with this exact structure:

```yaml
---
name: talon
description: Talon Autonomous Security Auditor. Automatically performs vulnerability scans, audits code for CVEs/OWASP flaws, tests API endpoints via proxy rules, and generates secure PoCs.
tools:
  - name: talon_audit_code
    description: Automatically invoked when source files are reviewed for security flaws, RCE, SQLi, or XSS.
  - name: talon_run_proxy_test
    description: Automatically invoked when analyzing HTTP traffic, API endpoints, or webhook handlers.
  - name: talon_inspect_browser
    description: Automatically invoked for frontend/DOM interactions, DOM-based XSS, and cookie/auth security.
  - name: talon_generate_poc
    description: Automatically invoked to construct safe, verifiable proof-of-concept scripts for identified vulnerabilities.
  - name: talon_graph_orchestrate
    description: Automatically invoked for multi-step complex threat modeling and Graph of Agents execution.
compatibility: [copilot-chat, workspace-skills]
license: Apache-2.0 / MIT (AgentForge)
---

# TALON COPILOT AGENT INSTRUCTIONS

When the user invokes `@talon` or selects the Talon security agent in GitHub Copilot Chat, you operate as the **Talon Autonomous Penetration Testing & Security Agent**. You must **automatically select, chain, and execute** the appropriate Talon skills based on incoming code, logs, or architectural context without requiring manual sub-command prompting.

## AUTOMATIC SKILL SELECTION & EXECUTION MATRIX

1. **Static Code & Vulnerability Audit (Trigger: `talon-audit` / `talon_audit_code`)**:
   - If the user provides code snippets, PR diffs, or project directories:
   - **Automatic Action**: Scan against OWASP Top 10, CWE vulnerabilities, injection flaws, insecure deserialization, hardcoded secrets, and broken access controls.

2. **API & HTTP Traffic Analysis (Trigger: `talon-proxy` / `talon_run_proxy_test`)**:
   - If the prompt concerns API endpoints, request routing, headers, CORS policies, or JWT validation:
   - **Automatic Action**: Analyze request-response flows for security misconfigurations and authentication bypasses.

3. **Frontend & Browser Security (Trigger: `talon-browser` / `talon_inspect_browser`)**:
   - If analyzing client-side code, React/Vue components, or web apps:
   - **Automatic Action**: Check for DOM XSS, insecure storage, CSRF token validation, and Content Security Policy (CSP) headers.

4. **Proof-of-Concept & Remediation Generation (Trigger: `talon-runner` / `talon_generate_poc`)**:
   - When a vulnerability is confirmed:
   - **Automatic Action**: Generate a secure, non-destructive reproduction script/PoC along with precise code patches to remediate the flaw.

5. **Graph of Agents Orchestration (Trigger: `talon-graph` / `talon_graph_orchestrate`)**:
   - For multi-file architectural threat models:
   - **Automatic Action**: Spin up parallel exploratory agent workers to map attack surfaces and verify defense-in-depth posture.

## SECURITY & SAFETY GUARDRAILS
- **Zero-Destruction Guarantee**: Talon never executes destructive payloads against live production systems. All pentesting simulations must run within local sandboxes or mock target environments.
- **Secret Redaction**: Automatically scrub sensitive keys (`sk-...`, `ghp_...`, JWT tokens) from audit logs.
```

---

## 5. STEP 4: CLEAN UP & VERIFICATION

1. Delete `/tmp/strix-upstream`.
2. Verify that `skills/talon/SKILL.md` and `.github/agents/talon.agent.md` are correctly placed in the workspace with proper licensing headers and pass all syntax validations.