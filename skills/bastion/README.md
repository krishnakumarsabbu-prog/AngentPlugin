<!--
AgentForge Enterprise Dual License: Apache-2.0 / MIT
Copyright (C) AgentForge Engineering. All rights reserved.
Adapted with attribution from JPeetz/agent-skills (Supply Chain Security Scanner).
Licensed under the Apache License, Version 2.0 or the MIT License.
-->

# Bastion Supply Chain Security Skill (`forge-bastion`)

> **Version:** 1.0.0  
> **Brand & Namespace:** Bastion (`forge-bastion` / `@bastion` agent & `bastion-supply-chain-security-skill`)  
> **Target:** AgentForge (v0.1.0+), GitHub Copilot Chat, Claude Code, Antigravity 2.0  
> **Upstream Lineage:** Adapted from `JPeetz/agent-skills` (Supply Chain Security Scanner)  
> **License:** Apache-2.0 / MIT Dual License (AgentForge Enterprise)

**Bastion** is our enterprise software supply chain security auditing suite, SBOM generator, dependency vulnerability gate, and license compliance verification engine for AI agent systems and modern software repositories.

---

## Key Differentiators

| Dimension | Standard Scanners | Bastion Supply Chain Security (`forge-bastion`) |
|:---|:---|:---|
| **Ecosystem Coverage** | npm or Python only | **npm, PyPI, Maven, Go modules, Cargo, Docker / Container images** |
| **SBOM Formats** | Proprietary formats | **SPDX v2.3 and CycloneDX v1.5 JSON & Tag-Value** via Syft/Grype |
| **Provenance & Attestation** | Missing or manual | **SLSA Level 1-3 Provenance & Cosign cryptographic verification** |
| **License Compliance** | Simple string match | **Comprehensive policy validation (GPL/AGPL copyleft risk flags)** |
| **Security Guardrails** | Full system access | **Read-Only Sandbox, Egress Disabled, Traversal Blocking, Secret Scrubbing** |

---

## Directory Structure

```text
skills/bastion/
├── SKILL.md                  # Master entrypoint & Supply Chain Security specification
├── README.md                 # Product overview, differentiators, & architecture
├── INSTALLATION-AND-USAGE.md # Multi-platform deployment & invocation guide
├── LICENSE                   # Apache-2.0 / MIT dual-license text
├── license.md                # Enterprise dual-licensing documentation
├── CHANGELOG.md              # Version and release history
├── governance.md             # Security guardrails & sandboxing policies
├── references/
│   ├── ecosystem-vuln-databases.md # OSV, NVD, GHSA, PyPA advisory mappings
│   ├── owasp-ast10-summary.md      # AST10 supply chain mapping
│   └── sbom-formats.md             # SPDX & CycloneDX specifications
├── scripts/
│   ├── generate-sbom.sh            # SPDX & CycloneDX SBOM generator (Syft/Cosign)
│   ├── scan-dependencies.sh        # Multi-ecosystem vulnerability scanner
│   ├── verify-provenance.sh        # SLSA provenance & cryptographic verifier
│   ├── bastion-scanner.cjs         # Standalone Node.js supply chain engine
│   └── validate-bastion.cjs        # Integrity validator for the Bastion suite
├── tests/
│   └── bastion.test.cjs            # Unit test suite for Bastion rules & engine
└── evals/
    └── evals.json                  # Benchmark evaluation test cases
```
