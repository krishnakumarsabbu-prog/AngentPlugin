<!--
AgentForge Enterprise Dual License: Apache-2.0 / MIT
Copyright (C) AgentForge Engineering. All rights reserved.
Adapted with attribution from JPeetz/agent-skills (Supply Chain Security Scanner).
Licensed under the Apache License, Version 2.0 or the MIT License.
-->

# Bastion Security Governance & Guardrails Specification

This document defines the strict, least-privilege governance policies enforced by the **Bastion Supply Chain Security Skill** (`forge-bastion`) and **Bastion Agent** (`@bastion`).

---

## 1. Sandbox Execution Policy

| Guardrail | Enforcement Level | Description |
|:---|:---|:---|
| **Filesystem Access** | **Read-Only (`read-only`)** | Bastion only reads package manifests, lockfiles, and container manifests for auditing. Modifying, creating, or deleting repository files is forbidden during auditing. |
| **Network Egress** | **Disabled (`egress: none`)** | The scanner engine and subagents operate entirely offline or strictly through verified local caches without arbitrary outbound telemetry or data exfiltration. |
| **Shell Privileges** | **Sandboxed / Non-Interactive** | Execution runs in sandboxed environments without interactive terminal access. Dynamic shell code concatenation is prohibited. |

---

## 2. Path Traversal & Sensitive File Protection

Target path inputs are strictly normalized and audited prior to filesystem operations:

1. **Forbidden Path Sequences**:
   - Traversal tokens: `..`, `../`, `..\`, `%2e%2e`, `%2f`, `\0` (null byte).
   - Any attempt to escape the approved workspace boundaries triggers a security guardrail violation.

2. **Sensitive Path Blacklist**:
   Bastion blocks access to:
   - Version control metadata: `.git/`, `.git/**`
   - Secret configuration files: `.env`, `.env.*`
   - Cryptographic keys: `*.pem`, `*.key`, `id_rsa*`, `id_ed25519*`
   - Credential stores: `credentials*`, `secrets*`, `*.pfx`, `*.p12`

---

## 3. Automated Secret Scrubbing

Prior to emitting any SBOM, dependency scan report, or terminal output, text is piped through Bastion's Secret Redaction filter:

- **API Keys**: OpenAI (`sk-...`), Anthropic (`sk-ant-...`), HuggingFace (`hf_...`)
- **Tokens**: GitHub Personal Access Tokens (`ghp_...`, `gho_...`, `ghs_...`), npm auth tokens, PyPI upload tokens
- **Cloud Credentials**: AWS Access Keys (`AKIA...`), Azure service principal secrets
- **JSON Web Tokens (JWT)**: `eyJ...`
- **Private Keys**: `-----BEGIN [A-Z ]+ PRIVATE KEY-----`

All detected occurrences are replaced with:
```text
[REDACTED_SECRET]
```
