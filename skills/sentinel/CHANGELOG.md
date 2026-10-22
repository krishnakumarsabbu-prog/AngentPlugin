<!--
AgentForge Enterprise Dual License: Apache-2.0 / MIT
Copyright (C) AgentForge Engineering. All rights reserved.
Adapted with attribution from JPeetz/agent-skills (OWASP Agentic Skills Top 10).
Licensed under the Apache License, Version 2.0 or the MIT License.
-->

# Changelog — Sentinel Security Scanner

All notable changes to the **Sentinel Security Scanner Skill** (`forge-sentinel`) and **Sentinel Agent** (`@sentinel`) will be documented in this file.

## [1.0.0] - 2026-10-22

### Added
- Initial enterprise release of **Sentinel Security Scanner Skill** (`sentinel-security-scanner-skill`).
- 100% compliant **OWASP Agentic Skills Top 10 (AST10)** detection engine with SARIF v2.1.0 and JSON export.
- Static checks for AST01 (Malicious Skills), AST02 (Prompt Injection), AST03 (Data Exfiltration), AST04 (Excessive Permissions), AST05 (Dependency Chain), AST06 (Insecure Scripts), AST07 (Missing Integrity), AST08 (Unsafe File Ops), AST09 (Network Egress), and AST10 (Cross-Platform Metadata Loss).
- AgentForge Governance Policies: Read-Only Filesystem Sandbox, Network Egress Disabled, Path Traversal Defense (`..`, `%2e%2e`, `\0`), and automated Secret Scrubbing.
- GitHub Copilot Agent (`.github/agents/sentinel.agent.md`) for automated `@sentinel` invocation.
- Claude Code subagent configuration (`.claude/agents/sentinel.md`) and manifest exports (`claude.json`).
- Python (`scan_skill.py`) and Node.js (`sentinel-scanner.cjs`) dual-engine execution.
- Comprehensive unit test suite (`tests/sentinel.test.cjs`) and validation script (`scripts/validate-sentinel.cjs`).
