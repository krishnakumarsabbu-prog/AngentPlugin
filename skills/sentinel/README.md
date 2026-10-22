<!--
AgentForge Enterprise Dual License: Apache-2.0 / MIT
Copyright (C) AgentForge Engineering. All rights reserved.
Adapted with attribution from JPeetz/agent-skills (OWASP Agentic Skills Top 10).
Licensed under the Apache License, Version 2.0 or the MIT License.
-->

# Sentinel Security Scanner (`forge-sentinel`)

> **Version:** 1.0.0  
> **Brand & Namespace:** Sentinel (`forge-sentinel` / `@sentinel` agent & `sentinel-security-scanner-skill`)  
> **Target:** AgentForge (v0.1.0+), GitHub Copilot Chat, Claude Code, Antigravity 2.0  
> **Upstream Lineage:** Adapted from `JPeetz/agent-skills` (OWASP Agentic Skills Top 10, SkillSpector Scanner)  
> **License:** Apache-2.0 / MIT Dual License (AgentForge Enterprise)

**Sentinel** is our enterprise autonomous security scanner, vulnerability gate, and prompt-injection defense suite for AI agent skills, workflows, and tool manifests. It rigorously checks assets against the **OWASP Agentic Skills Top 10 (AST10)** security standard, detecting hidden shell exploits, prompt injection templates, unauthorized network egress, and cross-platform security degradation.

---

## Key Differentiators

| Dimension | Conventional Linters | Sentinel Security Scanner (`forge-sentinel`) |
|:---|:---|:---|
| **Domain** | General programming syntax | **Agent Skill manifests, system prompts, tool schemas, harness graphs** |
| **Standard** | Generic lint rules | **OWASP Agentic Skills Top 10 (AST01 – AST10)** |
| **Output** | Ad-hoc terminal text | **SARIF v2.1.0** for GitHub Code Scanning, VS Code, CI/CD gates |
| **Risk Scoring** | Pass/Fail binary | **0 – 100 Granular Risk Score with L0 – L3 and Critical tiers** |
| **Multi-Platform** | Single language / platform | **AgentForge, Claude Code, GitHub Copilot, Cursor, OpenClaw** |
| **Guardrails** | Execution privileges | **Read-Only Sandbox, Egress Disabled, Traversal Blocking, Secret Scrubbing** |

---

## Architecture & Submodules

```text
skills/sentinel/
├── SKILL.md                  # Master entrypoint & AST10 specification
├── README.md                 # Product overview, differentiators, & architecture
├── INSTALLATION-AND-USAGE.md # Multi-platform deployment & invocation guide
├── LICENSE                   # Apache-2.0 / MIT dual-license text
├── license.md                # Enterprise dual-licensing documentation
├── CHANGELOG.md              # Version and release history
├── governance.md             # Security guardrails & sandboxing policies
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

## Quick Start

### 1. Run via Python Engine
```bash
py skills/sentinel/scripts/scan_skill.py --skill-dir skills/my-skill/ --format sarif --output results.sarif
```

### 2. Run via Node.js Engine
```bash
node skills/sentinel/scripts/sentinel-scanner.cjs --dir skills/my-skill/ --format sarif --output results.sarif
```

### 3. CI Gate Threshold (Fail if Risk Score > 40)
```bash
py skills/sentinel/scripts/scan_skill.py --skill-dir skills/my-skill/ --max-score 40 --ci
```

---

## License

Licensed under the Apache License, Version 2.0 or the MIT License. Adapted with attribution from `JPeetz/agent-skills`. See [LICENSE](LICENSE) and [license.md](license.md).
