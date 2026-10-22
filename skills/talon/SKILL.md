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

Talon is the enterprise autonomous security auditing and penetration testing suite for AgentForge, GitHub Copilot, and Claude Code. Unlike conventional static scanners that emit noisy theoretical warnings, Talon reasons about live data flows, orchestrates specialized sub-agents through a **Graph of Agents**, verifies vulnerabilities in sandboxed runtimes, and constructs safe, deterministic Proof-of-Concepts (PoCs) with verified remediation patches.

---

## Architecture & Submodules

The Talon suite is organized into five modular functional domains:

```
skills/talon/
├── SKILL.md                  # Master entrypoint & threat matrix
├── license.md                # Dual Apache-2.0 / MIT license documentation
├── graph/                    # Graph of Agents execution & handoff rules
│   ├── graph-orchestrator.md # Coordinator agent routing and state DAG
│   └── worker-agents.md      # Recon, hunting, exploit, and validation workers
├── proxy/                    # HTTP interceptor & traffic analyzer
│   ├── traffic-interceptor.md# Request/response hook, header analysis, tampering
│   └── api-security.md       # REST, GraphQL, and webhook vulnerability checks
├── browser/                  # DOM/Browser security inspection & XSS/CSRF testing
│   ├── dom-xss-auditor.md    # Source-to-sink DOM taint tracking & payload verification
│   └── auth-session-tester.md# Cookie flags, storage security, and CSRF token audit
├── runner/                   # Sandboxed execution & PoC generation rules
│   ├── poc-generator.md      # Deterministic, non-destructive exploit script generation
│   └── sandbox-executor.md   # Isolated execution containment and safety guardrails
└── audit/                    # Static/Dynamic vulnerability scanners & CVE mapping
    ├── owasp-top-10.md       # OWASP Top 10 (2025/2026) category coverage
    ├── cwe-catalog.md        # Common Weakness Enumeration classification
    └── injection-matrix.md   # SQLi, NoSQLi, Command Injection, and SSTI patterns
```

---

## Core Capabilities

### 1. Graph of Agents (GoA) Orchestration
Talon structures complex penetration tests as a directed acyclic graph (DAG) of collaborative agents:
- **Coordinator Agent**: Decomposes targets, establishes scope boundaries, and coordinates parallel workers.
- **Recon Worker**: Discovers attack surfaces, open endpoints, parameters, and authentication gates.
- **Vulnerability Hunter**: Hypothesizes exploit paths based on code patterns and data flows.
- **Verifier Agent**: Challenges findings in an isolated sandbox to disprove false positives.

### 2. Full-Spectrum Vulnerability Coverage
- **Injection Flaws (CWE-89, CWE-77, CWE-78)**: SQL, NoSQL, OS Command, and Template Injection (SSTI).
- **Broken Access Control & IDOR (CWE-284, CWE-639)**: Horizontal and vertical authorization bypasses.
- **Cross-Site Scripting (CWE-79)**: Reflected, Stored, and DOM-based XSS with taint tracking.
- **Server-Side Request Forgery (SSRF - CWE-918)**: Cloud metadata, internal port scanning, protocol smuggling.
- **Insecure Deserialization & Memory Safety (CWE-502, CWE-119)**: Object graph tampering, unsafe native bindings.
- **Hardcoded Secrets & Credential Leaks**: API keys, private keys, database connection strings.

### 3. Dynamic HTTP & API Proxy Analysis
Intercepts and evaluates request-response sequences:
- Header analysis (HSTS, CSP, X-Frame-Options, CORS misconfigurations).
- Authentication flow verification (JWT signature stripping, algorithm confusion, refresh token reuse).
- Parameter tampering and boundary fuzzing.

### 4. Non-Destructive Proof-of-Concept (PoC) Generation
Every confirmed vulnerability is accompanied by:
1. Exact file path and vulnerable lines.
2. Attack vector and source-to-sink flow.
3. Safe reproduction script that demonstrates impact without altering or corrupting production data.
4. Minimal, localized remediation code patch.

---

## Quick Reference Commands

| Command | Description | Target |
|---|---|---|
| `@talon` | Invoke autonomous security agent in Copilot Chat | Agent Mode |
| `/talon audit` | Run full codebase static security scan | Source Code |
| `/talon proxy` | Audit HTTP traffic and API endpoint routes | Network / API |
| `/talon browser` | Inspect client-side DOM for XSS and storage flaws | Web Frontend |
| `/talon poc` | Generate reproduction script for identified flaw | Vulnerability |
| `/talon graph` | Initiate multi-agent collaborative threat audit | Architecture |

---

## Safety & Security Guardrails
1. **Zero-Destruction Guarantee**: Talon never runs destructive payloads (`DROP TABLE`, `rm -rf`, disk wipes).
2. **Strict Scope Enforcement**: Operations are restricted strictly to files and hostnames defined within the workspace.
3. **Secret Redaction**: All API keys (`sk-...`, `ghp_...`, JWT tokens) are masked in all output logs and reports.
