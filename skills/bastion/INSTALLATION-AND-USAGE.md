<!--
AgentForge Enterprise Dual License: Apache-2.0 / MIT
Copyright (C) AgentForge Engineering. All rights reserved.
Adapted with attribution from JPeetz/agent-skills (Supply Chain Security Scanner).
Licensed under the Apache License, Version 2.0 or the MIT License.
-->

# Bastion Multi-Platform Deployment & Invocation Guide

## 1. Invocation in GitHub Copilot
Use `@bastion` in GitHub Copilot Chat:
```text
@bastion scan dependencies in package.json and requirements.txt
@bastion generate a CycloneDX SBOM for this repository
@bastion verify SLSA provenance for container image my-org/service:v1.0.0
@bastion audit licenses of our third-party dependencies for copyleft risks
```

## 2. Invocation via AgentForge Skills Studio
- Open AgentForge workbench.
- Navigate to **Skills Studio** -> Select **Bastion Supply Chain Security Skill**.
- Click **Run Audit** or inspect tools and references.

## 3. Invocation via CLI (Node.js Engine)
```bash
node skills/bastion/scripts/bastion-scanner.cjs --path . --sbom cyclonedx
node skills/bastion/scripts/bastion-scanner.cjs --path . --audit-licenses
node skills/bastion/scripts/bastion-scanner.cjs --path . --format json --output bastion-report.json
```
