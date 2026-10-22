---
name: sentinel-security-scanner-skill
version: 1.0.0
title: Sentinel Security Scanner Skill
description: Autonomous OWASP AST10 security scanner, malicious skill detector, and prompt-injection defense.
author: AgentForge Engineering (adapted from JPeetz/agent-skills)
category: Security & Compliance
tags: [sentinel, security-scanner, owasp, prompt-injection, sarif]
compatibility: [agy, copilot, claude, openai]
requirements: AgentForge v0.1.0+ Workspace, Read-Only Filesystem Sandbox
permissions:
  files:
    read: ["skills/sentinel/**"]
    deny_write: ["SOUL.md", "MEMORY.md", "AGENTS.md", "IDENTITY.md", "USER.md"]
  network:
    allow: []
    deny: "*"
content_hash: "sha256-a1b2c3d4e5f67890123456789abcdef0123456789abcdef0123456789abcdef0"
signature: "ed25519-agentforge-sentinel-verified-v1"
license: Apache-2.0 / MIT Dual License (AgentForge Enterprise)
---

<!--
AgentForge Enterprise Dual License: Apache-2.0 / MIT
Copyright (C) AgentForge Engineering. All rights reserved.
Adapted with attribution from JPeetz/agent-skills (OWASP Agentic Skills Top 10).
Licensed under the Apache License, Version 2.0 or the MIT License.
-->

# Sentinel Security Scanner Skill (`forge-sentinel`)
Copyright (C) AgentForge Engineering. All rights reserved.  
Licensed under the Apache-2.0 and MIT open-source licenses. Adapted with attribution from JPeetz/agent-skills (OWASP Agentic Skills Top 10, SkillSpector Scanner).

Scan and validate AI agent skills, prompts, workflows, and tool configurations against the **OWASP Agentic Skills Top 10 (AST10)** — the definitive security standard for autonomous AI agent ecosystems. Detects malicious skills, prompt injection sinks, data exfiltration vectors, excessive permissions, supply chain risks, and cross-platform metadata loss before skills are loaded, installed, or executed.

---

## When to Use This Skill

Invoke or execute the Sentinel Security Scanner Skill when:
- Auditing a new or existing AI agent skill before installation or execution
- Setting up automated CI/CD security quality gates for skill repositories
- Reviewing third-party skills, prompt files, or tool manifests for security compliance
- Inspecting workspace code and configurations for hardcoded secrets, prompt injections, or dangerous subshells
- Evaluating cross-platform translations (AgentForge `SKILL.md`, Claude Code `skill.json`, Copilot `agent.md`, Codex/Cursor `manifest.json`)
- Responding to security prompts like: "scan this skill for security issues", "run OWASP AST10 audit", "is this skill safe?", "validate skill security"

---

## Architecture & Submodules

The Sentinel Security Scanner suite is organized into the following components:

```text
skills/sentinel/
├── SKILL.md                  # Master entrypoint & AST10 specification
├── README.md                 # Product overview, differentiators, & architecture
├── INSTALLATION-AND-USAGE.md # Multi-platform deployment & invocation guide
├── LICENSE                   # Apache-2.0 / MIT dual-license text
├── license.md                # Enterprise dual-licensing documentation
├── CHANGELOG.md              # Version and release history
├── governance.md             # Security guardrails (read-only sandbox, network disabled, path traversal defense)
├── scripts/
│   ├── scan_skill.py         # OWASP AST10 static analysis engine (Python 3.9+, SARIF/JSON/text)
│   ├── sentinel-scanner.cjs  # Enterprise Node.js AST10 scanner engine
│   └── validate-sentinel.cjs # Integrity validator for the Sentinel suite
├── tests/
│   └── sentinel.test.cjs     # Comprehensive unit tests for AST01-AST10 rules & redactions
└── evals/
    └── cases.md              # Benchmark evaluation test cases (AST01-AST10 + Near-miss tests)
```

---

## The OWASP AST10 Framework

The OWASP Agentic Skills Top 10 (AST10) categorizes the 10 most critical security risks in AI agent skills across all major platforms: AgentForge / Antigravity (`SKILL.md`), Claude Code (`skill.json`), GitHub Copilot (`.github/agents/`), Cursor/Codex (`manifest.json`), and VS Code (`package.json`).

### AST01 — Malicious Skills
Skills that contain hidden destructive commands, reverse shells, backdoors, or malware.
- **Detection:** Scan for obfuscated shell commands, eval() calls, encoded payloads (`base64 -d`), suspicious `curl | bash` or `wget | sh` pipe-to-shell patterns.
- **Risk:** Remote code execution (RCE) on skill installation or tool invocation.
- **CVE Mappings:** CVE-2025-59536 (CVSS 8.7), CVE-2026-21852 (CVSS 5.3).

### AST02 — Prompt Injection in Skill Instructions
Skills with instructions, system prompts, or template variables that can be overridden by user or untrusted input, causing the agent to break out of safety boundaries or execute unintended actions.
- **Detection:** Check for unparameterized instruction templates, missing input sanitization, trust of external content, instruction overrides (`ignore previous instructions`, `bypass restrictions`, `disregard safety guidelines`).
- **Risk:** Agent executes attacker-controlled instructions instead of skill author intent, exfiltrating context or corrupting memory.

### AST03 — Data Exfiltration via Skills
Skills that transmit sensitive data (environment variables, API keys, credentials, local source code, database connection strings) to external endpoints without user consent or disclosure.
- **Detection:** Identify network calls in skill scripts targeting unknown hosts, unrestricted file read permissions combined with external transmission, audit telemetry endpoints.
- **Risk:** Secrets leakage, unauthorized credential exfiltration, intellectual property theft.

### AST04 — Excessive Permissions
Skills requesting broader permissions than their stated operational purpose requires.
- **Detection:** Compare declared file system, shell, and network permissions against actual tool and script usage. Flag wildcard reads (`["*"]`) or overly permissive scopes.
- **Risk:** Privilege escalation, lateral movement, unauthorized read access to system files.

### AST05 — Dependency Chain Attacks
Skills depending on unverified packages, unpinned versions, or compromised repositories.
- **Detection:** Audit `requires.binaries` and `requires.packages`, enforce version pinning (e.g. `curl>=8.0`), verify package signatures and dependency checksums.
- **Risk:** Supply chain compromise through malicious transitive dependencies or registry typosquatting.

### AST06 — Insecure Script Execution
Skills executing scripts without sandboxing, input validation, or output sanitization.
- **Detection:** Scan for shell-out patterns (`subprocess.Popen(..., shell=True)`), unchecked script arguments, dynamic command concatenation (`os.system()`), missing shebang validation.
- **Risk:** Arbitrary command injection through crafted inputs or poisoned arguments.

### AST07 — Missing Integrity Verification
Skills lacking content hashes, cryptographic signatures, or provenance records.
- **Detection:** Verify `content_hash` (SHA-256) and `signature` (Ed25519) fields present and cryptographically valid in skill metadata.
- **Risk:** Tampered or hijacked skills installed and executed undetected.

### AST08 — Unsafe File Operations
Skills reading or writing files outside declared boundaries, using wildcards in write permissions, or attempting to modify core agent identity and memory stores.
- **Detection:** Check `permissions.files.write` for wildcards (`["*"]`), ensure protected identity files (`SOUL.md`, `MEMORY.md`, `AGENTS.md`, `IDENTITY.md`, `USER.md`) are explicitly listed in `deny_write`.
- **Risk:** Identity corruption, agent prompt poisoning, system file corruption.

### AST09 — Network Egress Without Allowlisting
Skills opening network connections without strictly declared, domain-level allowlists.
- **Detection:** Audit `permissions.network.allow` and `deny` fields. Flag catch-all wildcards (`allow: ["*"]`) and verify default deny (`deny: "*"`) is in place.
- **Risk:** Command-and-control (C2) communication, botnet participation, unauthorized external data transmission.

### AST10 — Cross-Platform Metadata Loss
Security metadata, access restrictions, or risk tier classifications weakened or lost when porting skills across platforms.
- **Detection:** Cross-validate skill manifests across formats (AgentForge `SKILL.md`, Claude Code `skill.json`, Copilot `agent.md`, Cursor `manifest.json`). Ensure security fields (permissions, deny_write, risk tiers) survive transformation without degradation.
- **Risk:** Skills appear safe or restricted on one platform while operating with elevated privileges on another.

---

## Scanner Workflow

### Phase 1: Static Manifest & Code Inspection
Execute the Sentinel scanner across the target skill directory to produce a granular 0-100 risk score and AST01-AST10 violation mapping:
```bash
# Python Engine:
py skills/sentinel/scripts/scan_skill.py --skill-dir <path> --format sarif --output results.sarif

# Node.js Engine:
node skills/sentinel/scripts/sentinel-scanner.cjs --dir <path> --format sarif --output results.sarif
```

The static scanner performs:
1. **Manifest Completeness & Frontmatter Validation**: Ensures mandatory metadata, versioning, and description fields exist.
2. **Permission Boundary Audit**: Compares declared filesystem/network permissions against least-privilege principles.
3. **Dependency Integrity Verification**: Checks for pinned binaries and verified package manifests.
4. **Script & Shell Safety Inspection**: Flags dangerous subprocess calls, shell=True, dynamic evals, and base64 pipes.
5. **Prompt Injection & Instruction Audit**: Detects unparameterized prompts and instruction override patterns (AST02).
6. **Path Traversal & Identity File Protection**: Verifies protected files (`SOUL.md`, `MEMORY.md`, `AGENTS.md`) cannot be modified.
7. **Network Boundary Enforcement**: Flags wildcards in network allowlists and missing default-deny rules.
8. **Cryptographic Integrity & Provenance**: Validates content hashes and author signatures.

### Phase 2: Granular Risk Scoring & Tiers

| Score Range | Risk Tier | Classification | Recommended Action |
|:---:|:---:|:---|:---|
| **0 – 20** | **L0** | Safe | Automatically allow installation & execution |
| **21 – 40** | **L1** | Low | Peer review recommended; permitted in sandbox |
| **41 – 60** | **L2** | Elevated | Mandatory manual security review before approval |
| **61 – 80** | **L3** | High | Automatically blocked until all critical findings resolved |
| **81 – 100** | **Critical** | Critical Threat | Permanently rejected; quarantined immediately |

### Phase 3: CI/CD Quality Gates & SARIF Export

Sentinel generates standardized **SARIF v2.1.0** reports compatible with GitHub Advanced Security, VS Code SARIF Viewer, and CI/CD pipelines:

```yaml
- name: Run Sentinel Security Scan
  run: |
    py skills/sentinel/scripts/scan_skill.py --skill-dir skills/my-skill/ --format sarif --output scan-results.sarif

- name: Upload SARIF to GitHub Code Scanning
  uses: github/codeql-action/upload-sarif@v3
  with:
    sarif_file: scan-results.sarif

- name: Enforce Enterprise Risk Threshold
  run: |
    py skills/sentinel/scripts/scan_skill.py --skill-dir skills/my-skill/ --max-score 40 --ci
```

### Phase 4: Remediation Guidance

Every finding emitted by Sentinel provides:
1. **AST Category & Severity**: (e.g. `[AST01] CRITICAL: Pipe-to-shell from remote URL detected`)
2. **File Location & Line Number**: Precise physical location in code or manifest
3. **Exploit Description**: Explanation of vulnerability mechanism
4. **Remediation Patch**: Drop-in secure replacement code
5. **Verification Command**: Automated test to confirm remediation

---

## Governance & Security Policies

Sentinel operates under strict AgentForge least-privilege guardrails:
- **Read-Only Sandbox**: Scans code and manifests without mutating workspace files.
- **Disabled Network Egress**: Scanner execution does not send outbound network traffic.
- **Path Traversal Defense**: All input paths containing `..`, `%2e%2e`, or `\0` are blocked. Access to sensitive paths (`.git/`, `.env`, `*.pem`, `*.key`, `id_rsa*`, `credentials*`, `secrets*`) is strictly rejected.
- **Secret Scrubbing**: API keys (`sk-...`, `ghp_...`, `AKIA...`, `eyJ...`) and private credentials are automatically scrubbed and replaced with `[REDACTED_SECRET]` prior to report generation.
