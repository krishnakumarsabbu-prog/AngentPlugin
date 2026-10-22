<!--
AgentForge Enterprise Dual License: Apache-2.0 / MIT
Copyright (C) AgentForge Engineering. All rights reserved.
Adapted with attribution from JPeetz/agent-skills (OWASP Agentic Skills Top 10).
Licensed under the Apache License, Version 2.0 or the MIT License.
-->

# Sentinel Security Governance & Guardrails Specification

This document defines the strict, least-privilege governance policies enforced by the **Sentinel Security Scanner** (`forge-sentinel`) and **Sentinel Agent** (`@sentinel`).

---

## 1. Sandbox Execution Policy

| Guardrail | Enforcement Level | Description |
|:---|:---|:---|
| **Filesystem Access** | **Read-Only (`read-only`)** | Sentinel only reads files for AST10 compliance and vulnerability analysis. Write, delete, or append operations to workspace files are strictly forbidden during scan operations. |
| **Network Egress** | **Disabled (`egress: none`)** | The scanner engine and subagents operate entirely offline without network connections or external telemetry transmissions. |
| **Shell Privileges** | **Sandboxed / Non-Interactive** | Scripts run without interactive terminal access. Raw dynamic command string interpretation (`shell=True`) is explicitly prohibited. |

---

## 2. Path Traversal & Sensitive File Protection

To prevent path traversal exploits, target path inputs are normalized and inspected prior to filesystem access:

1. **Forbidden Path Sequences**:
   - Directory traversal tokens: `..`, `../`, `..\`, `%2e%2e`, `%2f`, `\0` (null byte).
   - Any attempt to resolve outside the approved workspace root triggers an immediate traversal violation error.

2. **Sensitive Path Blacklist**:
   Sentinel strictly blocks access to:
   - Version control metadata: `.git/`, `.git/**`
   - Secret configuration files: `.env`, `.env.*`
   - Cryptographic keys: `*.pem`, `*.key`, `id_rsa*`, `id_ed25519*`
   - Credential stores: `credentials*`, `secrets*`, `*.pfx`, `*.p12`

---

## 3. Automated Secret Scrubbing

Before any scan result, log entry, or SARIF / JSON artifact is formatted and emitted, all text is piped through Sentinel's high-entropy Secret Redaction filter.

### Redaction Rules:
- **API Keys**: OpenAI (`sk-[a-zA-Z0-9_-]{20,}`), Anthropic (`sk-ant-[a-zA-Z0-9_-]{20,}`), HuggingFace (`hf_[a-zA-Z0-9]{20,}`)
- **GitHub Tokens**: Personal Access & OAuth Tokens (`ghp_[a-zA-Z0-9]{36}`, `gho_[a-zA-Z0-9]{36}`, `ghs_[a-zA-Z0-9]{36}`)
- **Cloud Credentials**: AWS Access Key IDs (`AKIA[0-9A-Z]{16}`), Secret Keys, Azure client secrets
- **JSON Web Tokens (JWT)**: `eyJ[A-Za-z0-9-_]+\.eyJ[A-Za-z0-9-_]+\.[A-Za-z0-9-_.]+`
- **Private Key Headers**: `-----BEGIN [A-Z ]+ PRIVATE KEY-----`

All detected instances are scrubbed and replaced with the immutable redaction placeholder:
```text
[REDACTED_SECRET]
```
