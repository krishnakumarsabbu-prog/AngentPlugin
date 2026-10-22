# AgentForge

**Universal AI Skills, Agents & Harness Pipeline Engineering Platform**

AgentForge is an enterprise-grade VS Code extension and visual workbench for engineering reusable AI skills, configuring specialized agents, and orchestrating deterministic multi-agent harness pipelines. All capabilities run locally in VS Code with atomic persistence, least-privilege security guardrails, and audit logging.

---

## Table of Contents

- [Architectural Overview](#architectural-overview)
- [Module Capabilities](#module-capabilities)
- [Prerequisites](#prerequisites)
- [Exact Development Commands](#exact-development-commands)
- [Launching the VS Code Extension Development Host](#launching-the-vs-code-extension-development-host)
- [Debugging Instructions](#debugging-instructions)
- [Running Automated Tests](#running-automated-tests)
- [VSIX Packaging & Installation](#vsix-packaging--installation)
- [Data Storage Locations & Security](#data-storage-locations--security)
- [Known Limitations & Simulated Features](#known-limitations--simulated-features)

---

## Architectural Overview

```
AgentForge Platform
├── VS Code Extension Host (Node.js runtime)
│   ├── src/extension.ts                  # Extension entry point & lifecycle
│   ├── src/commands/openAgentForge.ts    # Palette commands & quick status
│   ├── src/providers/AgentForgeViewProvider.ts  # Activity bar sidebar provider
│   ├── src/panels/AgentForgePanel.ts     # Main workbench editor panel
│   ├── src/bridge/AgentForgeBridge.ts    # Secure request/response message broker
│   ├── src/domain/                       # Canonical domain models (Skills, Agents, Workflows, Runs, Packages)
│   ├── src/skills/                       # Markdown frontmatter parsing, validation, multi-file packages
│   ├── src/agents/                       # Agent schema validation, export adapters (Copilot, Claude, OpenAI)
│   ├── src/workflows/                    # Graph validation, cycle detection, format import/export
│   ├── src/executions/                   # Deterministic simulation engine, context handoffs, retry & approval
│   ├── src/governance/                   # Secret scrubbing, path traversal defense, permission policy checker
│   ├── src/packages/                     # Package manager, SHA-256 integrity, backup snapshots
│   ├── src/integrations/                 # Platform integration registry, mock verification
│   └── src/storage/                      # LocalRepository, safeStorage atomic writes, migrations, audit log
│
└── React WebView Workbench (Vite + React 18)
    ├── webview-ui/src/layouts/AppLayout.tsx # Navigation router & layout shell
    ├── webview-ui/src/navigation/registry.ts # 11 workbench navigation targets
    └── webview-ui/src/features/          # Feature UI modules
        ├── dashboard/                    # Real-time metrics, quick actions & activity feed
        ├── skills/                       # Skills Studio (editing, preview, validation, import/export)
        ├── agents/                       # Agent Studio (configuration, skills, permissions, adapter exports)
        ├── workflows/                    # Harness Pipeline visual canvas (@xyflow/react)
        ├── executions/                   # Execution History & node timeline inspector
        ├── comparison/                   # Pipeline comparison diff (workflows and run comparisons)
        ├── evaluation/                   # Test & Evaluation Studio (scorecards & deterministic suites)
        ├── governance/                   # Audit activity log, permission guardrails, path sandbox
        ├── packages/                     # Package Manager (inspect, integrity checks, backup snapshots)
        ├── integrations/                 # Platform Integrations (Copilot, Claude, OpenAI with Mock Registry)
        └── settings/                     # Platform configuration, export format, themes, workspace backup
```

---

## Module Capabilities

1. **Dashboard**
   - High-level platform health, live metric cards, recent skill/agent/pipeline summaries, and system activity feed.
2. **Skills Studio**
   - Author and edit `SKILL.md` files with live preview, YAML frontmatter validation, reference asset management, multi-platform compatibility checking, version history, and import/export.
3. **Agent Studio**
   - Build specialized agents with role, mission instructions, assigned skill sets, JSON Schema input/output contracts, and declared tool definitions.
   - **Typed Export Adapters**: Native and simulated mapping for GitHub Copilot, Claude / Claude Code, and OpenAI API with capability matrix and compatibility warnings.
4. **Harness Pipeline Visual Canvas**
   - Full drag-and-drop workflow canvas built with `@xyflow/react`.
   - 14 distinct node types: Start, Requirement Input, Skill Invocation, Agent Execution, Planning, Human Approval, Condition / Branch, Context Handoff, Parallel Execution, Merge Results, Validation, Retry, Artifact Output, and End.
   - Visual edge routing, mini-map, zoom/pan controls, and deep node configuration panels.
5. **Workflow Graph Validation & Format Persistence**
   - Centralized validation detecting graph cycles, unreachable nodes, missing terminal nodes, invalid branch routing, and missing skill or agent references.
   - Canonical `.agentforge.workflow.json` import and export.
6. **Deterministic Local Simulation Engine**
   - Validates workflow graphs before execution.
   - Computes topological node dependency order and generates deterministic, simulated outputs for each step.
   - Evaluates condition branch expressions, tracks retries with exponential backoff calculation, and halts cleanly at Human Approval gates.
7. **Context Handoffs, Approval Gates & Run Inspector**
   - Field-level context filtering between upstream and downstream nodes.
   - Interactive human decision recording (Approve, Reject, Cancel) before execution continues.
   - Deep inspection of step input, output, duration, and error traces.
8. **Execution History & Pipeline Comparison**
   - Filter and search past execution runs by status, date, or workflow name.
   - Side-by-side visual and structural diff comparing two workflow versions or two run records (node changes, configuration diffs, duration metrics, failure points).
9. **Test & Evaluation Studio**
   - Automated evaluation scorecards across Skills, Agents, and Workflows without invoking external LLMs.
   - Category-level pass/fail checks, actionable suggestions, and mock scenario evaluation.
10. **Governance, Permissions & Audit Activity**
    - Least-privilege defaults (read-only filesystem, shell disabled, network disabled, human approval gates).
    - Extension-host path traversal protection (rejecting `..` and null-byte injection `%00`, `\0`).
    - Sensitive secret scrubbing (OpenAI keys, GitHub tokens, Bearer headers, private keys) before persistence.
    - Local audit event logging with retention caps and destructive action confirmation modals.
11. **Package Manager & Platform Integrations**
    - Browse, search, filter, install, update, and uninstall packages with SHA-256 integrity verification.
    - Automated point-in-time backup snapshots before updates or removals.
    - Strict security policy: **Imported scripts are never automatically executed**.
    - Truthful platform integration status: uses a clearly labeled **Mock Registry** when live credentials are not verified in VS Code `SecretStorage`.
12. **Settings & Administration**
    - Configurable startup page, confirm destructive actions, skill export format (Markdown/JSON/YAML), installation scope, pipeline timeout/retries, full workspace backup JSON download/import, and light theme default.

---

## Prerequisites

- **Node.js**: `v18.0.0` or higher (tested on Node `v20.x` and `v22.x`)
- **npm**: `v9.0.0` or higher
- **VS Code**: `1.80.0` or higher (for running the extension)
- **Git** (optional, for version control)

---

## Exact Development Commands

All commands are executed from the repository root:

```bash
# 1. Install extension and webview dependencies
npm install
cd webview-ui && npm install && cd ..

# 2. Compile TypeScript extension host (type-checking only)
npm run compile

# 3. Perform full TypeScript type-checking across both root and webview
npm run typecheck

# 4. Run linting across extension and webview
npm run lint
npm run lint:webview

# 5. Execute complete Vitest test suite (24 test files, 268 unit tests)
npm test

# 6. Build production bundles (both React webview and extension host)
npm run build

# 7. Package extension into installable VSIX archive
npm run package:vsix
```

---

## Launching the VS Code Extension Development Host

To launch and test the extension directly inside VS Code:

1. Open the repository root in VS Code (`code .`).
2. Build the webview and extension bundles:
   ```bash
   npm run build
   ```
3. Open the **Run and Debug** view (`Ctrl+Shift+D` or `Cmd+Shift+D`).
4. Select the launch configuration: **Run Extension**.
5. Press `F5`. An **Extension Development Host** window will open with AgentForge activated.
6. Open the AgentForge workbench using any of these methods:
   - Click the **AgentForge** icon in the Activity Bar.
   - Press `Ctrl+Shift+P` (or `Cmd+Shift+P`), type **AgentForge: Open**, and press `Enter`.
   - Click the navigation icon in the sidebar view title.

---

## Debugging Instructions

### Extension Host Debugging
- Set breakpoints in TypeScript files under `src/` (e.g. `src/bridge/AgentForgeBridge.ts` or `src/executions/LocalSimulationEngine.ts`).
- When running under `F5`, VS Code will break on breakpoints with full source-map fidelity.
- Check extension diagnostic logs in the **Output** channel:
  - Open the **Output** panel (`Ctrl+Shift+U`).
  - Select **AgentForge** from the channel dropdown.

### WebView UI Debugging
- In the Extension Development Host window, press `Ctrl+Shift+P` (or `Cmd+Shift+P`).
- Run the command: **Developer: Toggle Developer Tools**.
- Click the **Console** and **Elements** tabs to inspect React components, styles, or bridge message traffic.

---

## Running Automated Tests

AgentForge features 24 comprehensive test suites covering all domains, repositories, adapters, and engines:

```bash
# Run all tests once
npm test

# Run tests in watch mode
npx vitest

# Run a specific test suite
npx vitest tests/localSimulationEngine.test.ts
npx vitest tests/governanceAndAudit.test.ts
npx vitest tests/packageManagerAndSettings.test.ts
```

### Verified Test Suites (24 suites, 268 tests):
- `tests/agentExporter.test.ts`
- `tests/agentPlatformAdapters.test.ts`
- `tests/agentRepository.test.ts`
- `tests/agentValidator.test.ts`
- `tests/contextHandoffAndInspector.test.ts`
- `tests/demoData.test.ts`
- `tests/domain.test.ts`
- `tests/governanceAndAudit.test.ts`
- `tests/localSimulationEngine.test.ts`
- `tests/messageValidator.test.ts`
- `tests/migrations.test.ts`
- `tests/navigation.test.ts`
- `tests/packageManagerAndSettings.test.ts`
- `tests/safeStorage.test.ts`
- `tests/settings.test.ts`
- `tests/skillMd.test.ts`
- `tests/skillPackages.test.ts`
- `tests/skillService.test.ts`
- `tests/skillValidator.test.ts`
- `tests/testEvaluation.test.ts`
- `tests/workflowComparison.test.ts`
- `tests/workflowFormat.test.ts`
- `tests/workflowRepository.test.ts`
- `tests/workflowValidator.test.ts`

---

## VSIX Packaging & Installation

To generate the distribution `.vsix` file:

```bash
npm run package:vsix
```

This runs the prepublish build script and packages the extension into:
`agentforge-0.1.0.vsix`

To install the packaged VSIX into your main VS Code environment:

```bash
code --install-extension agentforge-0.1.0.vsix
```

---

## Data Storage Locations & Security

- **Storage Engine**: Persisted through VS Code's `globalState` and workspace storage using atomic write-replacement (`src/storage/safeStorage.ts`) to prevent data corruption.
- **Audit Logs**: Stored locally in atomic JSON records capped at 500 entries to prevent disk exhaustion.
- **Secret Redaction**: All API keys (`sk-*`), tokens (`ghp_*`, `gho_*`, `jwt`), passwords, and private key blocks are stripped before entering audit logs or execution records.
- **Path Traversal Defense**: All file operations validate paths against workspace root boundaries and reject null-byte injection (`\0`, `%00`).
- **No Remote Backend**: AgentForge is fully self-contained; no network backend or cloud telemetry is required.

---

## Known Limitations & Simulated Features

1. **Deterministic Local Simulation vs Live LLM Execution**:
   - The simulation engine generates deterministic, structural mock outputs for agent and skill steps.
   - It does not invoke paid external LLM APIs (OpenAI, Anthropic) or run background inference servers directly in local VS Code. All execution output is clearly flagged with `isSimulated: true`.
2. **Platform Export vs Autonomous Host Execution**:
   - Platform export adapters produce verified export formats (e.g. `.github/copilot-instructions.md`, `.claude/config.json`, Assistants API schemas).
   - However, actually running those agents autonomously in external editors depends on the host platform's native features and external subscription status.
3. **No Arbitrary Shell Execution from Webview**:
   - In accordance with enterprise security guidelines, the WebView UI cannot execute arbitrary shell commands on the host machine.
4. **Local UI Guardrails Disclaimer**:
   - Local permission declarations enforce operational safety, but do not claim complete isolation against a compromised host or hostile extension environment.
