# AgentForge: Comprehensive Plugin Features & Architecture Guide

> **Universal AI Skills, Autonomous Agents & Multi-Agent Harness Pipeline Engineering Platform**  
> *Version 0.1.0 — Enterprise-Grade VS Code Extension & Local Workbench*

---

## Table of Contents

1. [Executive Overview & Core Value](#1-executive-overview--core-value)
2. [High-Level Architecture](#2-high-level-architecture)
3. [Deep Dive: The 11 Functional Workbench Modules](#3-deep-dive-the-11-functional-workbench-modules)
   - [3.1 Executive Dashboard](#31-executive-dashboard)
   - [3.2 Skills Studio](#32-skills-studio)
   - [3.3 Agent Studio](#33-agent-studio)
   - [3.4 Harness Pipeline Visual Canvas](#34-harness-pipeline-visual-canvas)
   - [3.5 Deterministic Local Simulation Engine](#35-deterministic-local-simulation-engine)
   - [3.6 Execution History & Run Inspector](#36-execution-history--run-inspector)
   - [3.7 Pipeline & Execution Comparison Studio](#37-pipeline--execution-comparison-studio)
   - [3.8 Test & Evaluation Studio](#38-test--evaluation-studio)
   - [3.9 Platform Integrations & Mock Registry](#39-platform-integrations--mock-registry)
   - [3.10 Package Manager & Backup Snapshots](#310-package-manager--backup-snapshots)
   - [3.11 Governance, Least-Privilege & Audit Logging](#311-governance-least-privilege--audit-logging)
   - [3.12 Settings, Administration & Workspace Portability](#312-settings-administration--workspace-portability)
4. [The 14 Pipeline Canvas Node Types](#4-the-14-pipeline-canvas-node-types)
5. [End-to-End Lifecycle Workflows](#5-end-to-end-lifecycle-workflows)
   - [Scenario A: Authoring & Exporting a Platform-Agnostic Skill](#scenario-a-authoring--exporting-a-platform-agnostic-skill)
   - [Scenario B: Designing & Simulating a Multi-Agent Pipeline with Human Gates](#scenario-b-designing--simulating-a-multi-agent-pipeline-with-human-gates)
6. [Security Guardrails & Zero-Trust Mechanics](#6-security-guardrails--zero-trust-mechanics)
7. [Storage, File Formats & Technical Reference](#7-storage-file-formats--technical-reference)
8. [Frequently Asked Questions (FAQ)](#8-frequently-asked-questions-faq)

---

## 1. Executive Overview & Core Value

**AgentForge** is an integrated development workbench inside Visual Studio Code engineered for AI developers, systems architects, and enterprise engineers building modular agentic architectures.

Modern AI tooling often suffers from four critical problems:
1. **Vendor Lock-in**: Skills and prompts written for GitHub Copilot cannot run in Claude Code, Anthropic, or OpenAI without full rewrites.
2. **Expensive & Non-Deterministic Debugging**: Testing multi-agent workflows directly against live LLM APIs incurs high latency, variable costs, and flaky non-deterministic outputs during iterative UI/logic design.
3. **Security Risks**: Agent tools granted uncontrolled filesystem or terminal access can overwrite critical files or leak environment secrets.
4. **Lack of Orchestration Visibility**: Complex multi-step agent pipelines run as black boxes without clear visualization of step dependencies, data handoffs, and approval gates.

### The AgentForge Solution

```
┌────────────────────────────────────────────────────────────────────────┐
│                          AGENTFORGE PLATFORM                           │
├────────────────────┬──────────────────────┬────────────────────────────┤
│   ENGINEER SKILLS  │   CONFIGURE AGENTS   │    ORCHESTRATE HARNESS     │
│   • Standard       │   • Typed Contracts  │    • 14 Visual Node Types  │
│     SKILL.md       │   • Tool Sandboxes   │    • Dynamic Context Handoff│
│   • Multi-Platform │   • Cross-Platform   │    • Human Approval Gates  │
│     Compatibility  │     Adapters         │    • Deterministic Sim     │
└─────────┬──────────┴──────────┬───────────┴─────────────┬──────────────┘
          │                     │                         │
          ▼                     ▼                         ▼
┌────────────────────────────────────────────────────────────────────────┐
│                   LOCAL GOVERNANCE & SECURITY SHIELD                   │
│ • Secret Scrubbing  • Path Traversal Sandbox  • Immutable Audit Trail  │
└────────────────────────────────────────────────────────────────────────┘
```

- **Universal Portability**: Author reusable skills (`SKILL.md`) and agents once, then export to **GitHub Copilot**, **Claude / Claude Code**, or **OpenAI Assistant** platforms with automatic translation and compatibility warnings.
- **Deterministic Local Simulation Engine**: Test complex graphs with topological execution, branching logic, retry backoffs, and approval gates—**100% offline with zero token spend**.
- **Human-in-the-Loop Governance**: Define explicit approval policies that pause execution until human verification is provided.
- **Least-Privilege Security**: Hardened with built-in path-traversal protection (`..` and null-byte defenses), sensitive API secret scrubbing, and complete audit logging.

---

## 2. High-Level Architecture

AgentForge uses an isolated, asynchronous bi-directional RPC bridge connecting the VS Code Extension Host (Node.js) to a responsive React 18 Webview.

```
                      VS CODE ENVIRONMENT
┌──────────────────────────────────────────────────────────────┐
│  VS Code Activity Bar & Command Palette                      │
│   ├── command: agentforge.open                               │
│   ├── command: agentforge.openFromSidebar                    │
│   └── provider: AgentForgeViewProvider                       │
└──────────────────────────────┬───────────────────────────────┘
                               │ Activates
                               ▼
┌──────────────────────────────────────────────────────────────┐
│  VS Code Extension Host (Node.js)                            │
│   ├── AgentForgePanel (Webview Panel Manager)                │
│   ├── AgentForgeBridge (Type-Safe RPC Message Router)        │
│   │    ├── SkillService & SkillPackageService                │
│   │    ├── InstallationService & Target Planners             │
│   │    ├── AgentValidator & Exporters (Copilot/Claude/OpenAI)│
│   │    ├── WorkflowValidator & Format Parsers                │
│   │    ├── LocalSimulationEngine (Topological Exec State)    │
│   │    ├── PackageManagerService & Integrity Verifier        │
│   │    └── AuditRepository & Governance Filters              │
│   └── safeStorage (Atomic FS & VS Code globalState)          │
└──────────────────────────────┬───────────────────────────────┘
                               │ Asynchronous PostMessage Bus
                               ▼
┌──────────────────────────────────────────────────────────────┐
│  React 18 Webview Workbench (Vite + xyflow + Tailwind)       │
│   ├── AppLayout (Sidebar, Breadcrumbs, Theme, Error Boundary)│
│   ├── State Store (VS Code API wrapper, Bridge Dispatcher)   │
│   └── 11 Visual Feature Modules                              │
└──────────────────────────────────────────────────────────────┘
```

### Core Architectural Guarantees:
- **No Background Remote Calls Without Consent**: All authoring, validation, graph calculation, and mock executions occur locally.
- **Atomic Persistence**: Configuration files and database states use write-to-temporary and atomic-rename operations (`safeStorage.ts`) to eliminate partial-write corruptions.
- **CSP Hardening**: Extension webviews enforce strict Content Security Policies (`default-src 'none'`) with dynamic nonces on scripts and styles.

---

## 3. Deep Dive: The 11 Functional Workbench Modules

AgentForge organizes the agentic development lifecycle into **11 specialized targets** across Overview, Engineering Studio, Operations, Platform, Governance, and Administration.

```
WORKBENCH MODULES
├── 1. Overview
│   └── Dashboard                   # Platform health, metrics & activity feed
├── 2. Engineering Studio
│   ├── Skills Studio               # SKILL.md authoring, validation & packages
│   ├── Agent Studio                # Persona, tool binding & platform export
│   └── Harness Pipeline            # Drag-and-drop orchestration canvas
├── 3. Operations
│   ├── Execution History           # Historical run logs & node inspector
│   ├── Test & Evaluation           # Scorecards & deterministic benchmarks
│   └── Pipeline Comparison         # Structural diff & execution variance
├── 4. Platform
│   ├── Platform Integrations       # Copilot, Claude & OpenAI connectors
│   └── Package Manager             # Ecosystem bundles, SHA-256 & backups
├── 5. Governance
│   └── Governance & Audit          # Least-privilege policies & audit log
└── 6. Administration
    └── Settings                    # Preferences, timeouts & full-state backup
```

### Canonical Enterprise Skills & Agents

| Skill | Name | Purpose |
| :--- | :--- | :--- |
| **1. Ponytail-inspired** (`@ponytail`) | **Engineering Discipline** | Controls code quality, complexity, maintainability, and implementation discipline. |
| **2. Graphify-inspired** (`@graphify`) | **Codebase Intelligence** | Understands architecture, dependencies, relationships, and impact across the codebase. |
| **3. SecurityReview-inspired** (`@security-architecture-review`) | **Security & Architecture Assurance** | Performs code reviews, security assessments, threat modeling, and architecture audits. |


---

### 3.1 Executive Dashboard

The **Dashboard** acts as mission control for the workbench. It aggregates system status, component counts, recent runs, and immediate entry points.

- **System Health & Engine Status**: Displays real-time operational status (e.g., Local Simulation Engine Ready, Storage Healthy, Mock Registry Active).
- **Metric Cards**:
  - **Skills Count**: Total active, draft, or deprecated skills.
  - **Agents Count**: Configured autonomous agents with validation statuses.
  - **Workflows Count**: Production harness pipelines with active/draft states.
  - **Recent Runs**: Total simulation executions, success rates, and average durations.
- **Quick Action Bar**: One-click workflows to "Create New Skill", "Configure Agent", "Design Pipeline", or "Reset Demo Data".
- **Recent Activity Feed**: Real-time audit events showing timestamped modifications across all resources with severity tags (`info`, `warning`, `error`).
- **Resource Spotlights**: Direct jump links to recently modified skills, agents, and pipelines.

---

### 3.2 Skills Studio

The **Skills Studio** provides an IDE-grade environment for engineering, editing, linting, packaging, and installing reusable AI skills based on the canonical `SKILL.md` format.

#### Key Features:
- **Dual-Pane Editor**: Edit markdown instructions and YAML frontmatter simultaneously with live HTML rendering and syntax highlighting.
- **Frontmatter Schema Validation**: Validates required fields (`name`, `description`, `version`, `author`, `compatibility`, `tags`, `requirements`) with real-time error flags.
- **Multi-File Skill Bundles**: Go beyond single markdown files. Attach supporting resources:
  - Reference files (`.md`, `.txt`, `.pdf` references)
  - Execution helper scripts (`.py`, `.sh`, `.js`)
  - JSON schemas and templates
  - Unit test scenarios
- **Version History & Diff Inspector**: Every modification produces a timestamped snapshot. Compare any two versions side-by-side with color-coded additions and deletions, or restore earlier revisions with a single click.
- **Multi-Platform Installation Planner**:
  - Targets: Antigravity/Agy (`.agents/skills`), GitHub Copilot (`.github/skills`), Claude Code (`.claude/skills`), and OpenAI (`.openai/skills`).
  - Supports **Workspace Scope** (committed with repository) and **Global User Profile Scope** (available across all VS Code projects).
  - Pre-flight conflict analysis detects filename collisions and allows safe overwrite or rollback.
- **Import & Export Engine**:
  - Export as standalone `SKILL.md`, JSON skill manifest, or complete multi-file archive.
  - Import previews check for duplicate IDs, missing files, and frontmatter validation errors before committing to storage.

---

### 3.3 Agent Studio

The **Agent Studio** allows engineers to build specialized, role-driven autonomous agents with strongly typed contracts, tool bindings, and security boundaries.

#### Key Capabilities:
- **Agent Identity & Role Specification**:
  - Define Agent Name, Role, Mission Objective, Operating Scope, Out-of-Scope boundaries, and Core Principles.
  - Detailed system prompt instructions with parameter substitution.
- **Skill Association**:
  - Connect one or more modular skills authored in the Skills Studio to the agent.
  - Displays skill compatibility badges to warn when a skill does not support the agent's target environment.
- **Tool Definitions & Parameter Schemas**:
  - Declare tools available to the agent (e.g., Code Search, Test Runner, Database Query).
  - Define tool invocation schemas (JSON Schema), descriptions, and execution requirements (network, shell, filesystem).
- **Strict Input / Output Contracts**:
  - JSON Schema definitions enforcing expected input parameters and deterministic output shapes.
  - Form validation prevents unformatted text responses when structured JSON is required by downstream nodes.
- **Permission & Security Policy**:
  - Configurable filesystem sandbox (`none`, `read-only`, `read-write`).
  - Network egress toggle (enabled/disabled).
  - Shell command execution toggle.
  - Maximum token context boundaries and mandatory human approval triggers.
- **Cross-Platform Export Adapters**:
  - **GitHub Copilot**: Exports as `.github/copilot-instructions.md` or custom Copilot agent configurations.
  - **Claude / Claude Code**: Generates `claude.json` subagent manifests with tool definitions formatted for Anthropic's tool-use API.
  - **OpenAI Assistant**: Exports OpenAI-compliant Assistant configurations including system instructions, `tools` function definitions, and JSON schemas.
  - **Compatibility Analyzer**: Highlights platform-specific gaps (e.g., warning if Claude-style tools are exported to a Copilot format that only supports markdown instructions).

---

### 3.4 Harness Pipeline Visual Canvas

The **Harness Pipeline** is a visual orchestrator powered by `@xyflow/react`. It allows architects to construct complex, multi-agent workflows with deterministic routing, parallel branches, and human oversight.

#### Core Capabilities:
- **Visual Drag-and-Drop Canvas**:
  - Drag nodes from the left palette directly onto the infinite canvas.
  - Interactive edge snapping with labeled conditional ports (e.g., "True" / "False", "Approved" / "Rejected").
  - Mini-map navigator, zoom-to-fit, snap-to-grid, and canvas overview controls.
- **14 Specialized Node Types**: Full support for inputs, skills, agents, conditional branches, parallel splits, validations, retries, and human approvals (detailed in [Section 4](#4-the-14-pipeline-canvas-node-types)).
- **Properties Sidebar & Node Configuration Drawer**:
  - Deep configuration for each selected node: custom prompts, agent/skill bindings, timeout thresholds, retry backoffs, context mapping expressions, and approval messages.
- **Centralized Graph Validation Engine**:
  - Detects infinite cycles and deadlocks.
  - Identifies unreachable/orphan nodes and missing terminal (`End`) nodes.
  - Flags unconnected branch condition handles and missing agent/skill references.
- **Format Persistence**: Lossless save, import, and export using standard `.agentforge.workflow.json` files.

---

### 3.5 Deterministic Local Simulation Engine

Building complex agent pipelines against live APIs is slow and costly. AgentForge includes a **Deterministic Local Simulation Engine** that runs entirely within the VS Code extension host.

#### Execution Mechanics:
1. **Topological Graph Sorting**: Calculates node execution order based on directed edges, grouping parallel nodes into concurrent evaluation tiers.
2. **Deterministic Step Output Generation**: Generates simulated, schema-conforming mock responses based on node configurations, assigned agents, and input contracts.
3. **Dynamic Context Handoffs**: Evaluates context expressions, passing filtered outputs from upstream nodes directly into downstream node inputs.
4. **Conditional Expression Evaluation**: Parses condition branch logic (e.g., `context.confidenceScore >= 0.85`) to dynamically route to True/False target branches.
5. **Interactive Human Approval Gates**:
   - When a `human_approval` node is reached, the simulation pauses cleanly.
   - The UI presents an approval modal displaying upstream payloads, approval requests, and policy notes.
   - The user can **Approve**, **Reject**, or **Provide Revision Feedback**, dictating subsequent branch routing.
6. **Retry Policies with Exponential Backoff**: Simulates intermittent failures, tracking retry count and backoff math before proceeding or terminating.
7. **Telemetry & Execution Metrics**: Emits step-by-step timestamps, durations (ms), memory payloads, and execution logs.

---

### 3.6 Execution History & Run Inspector

Every pipeline simulation run is preserved in the local atomic storage layer for post-mortem analysis and operational audits.

- **Filterable Run Log**: Search and filter past executions by workflow name, status (`Succeeded`, `Failed`, `Paused`, `Cancelled`), date range, or execution ID.
- **Node-by-Node Timeline Visualizer**: Inspect the execution graph chronologically. Each node displays execution duration, completion status, and error states.
- **Side-by-Side Payload Inspector**: Click any step to inspect the exact **Input Context Payload** received and the resulting **Output Context Payload** emitted.
- **Run Controls**: Cancel running simulations or trigger instant re-runs with original or updated parameters.

---

### 3.7 Pipeline & Execution Comparison Studio

The **Comparison Studio** provides side-by-side diff capabilities across two distinct dimensions:

```
┌────────────────────────────────────────────────────────┐
│             PIPELINE COMPARISON STUDIO                 │
├───────────────────────────┬────────────────────────────┤
│   WORKFLOW DEFINITIONS    │      EXECUTION RUNS        │
│   (Version A vs B)        │      (Run 1 vs Run 2)      │
│ • Added/removed nodes     │ • Execution duration diff  │
│ • Routing & edge changes  │ • Branch path divergence   │
│ • Prompt & parameter diff │ • Intermediate payload diff│
│ • Retry & approval policy │ • Failure root-cause diff  │
└───────────────────────────┴────────────────────────────┘
```

1. **Workflow Structure Diff**: Compare two revisions of a pipeline (e.g., v1.0.0 vs v1.1.0). Highlights added, removed, or modified nodes, parameter shifts, and edge rerouting.
2. **Execution Run Diff**: Compare two execution instances of the same workflow. Identifies why Run A succeeded while Run B failed, comparing node latency spikes, branch decisions, and output payloads.

---

### 3.8 Test & Evaluation Studio

The **Test & Evaluation Studio** enables systematic quality assurance for Skills, Agents, and Workflows without consuming external LLM credits.

- **Automated Quality Scorecards**:
  - **Completeness**: Checks for required fields, documentation, examples, and fallback definitions.
  - **Schema Conformity**: Validates JSON schema validity, input/output typing, and handling of malformed inputs.
  - **Safety & Prompt Guardrails**: Detects unsafe prompts, missing permission restrictions, and excessive privilege grants.
  - **Structural Soundness**: Validates graph connectivity, timeouts, and cycle freedom.
- **Configurable Test Suites**: Create test cases with defined input payloads, expected output matchers, and execution status assertions.
- **Actionable Remediation**: Generates actionable diagnostic messages pointing directly to offending fields with suggested fixes.

---

### 3.9 Platform Integrations & Mock Registry

AgentForge connects to external AI ecosystems while maintaining complete transparency regarding connection validity.

- **Supported Platforms**:
  - **GitHub Copilot**: Integration with Copilot Chat, workspace skills, and instruction files.
  - **Claude / Anthropic**: Integration with Claude Code, Claude Desktop, and subagent schemas.
  - **OpenAI**: Integration with OpenAI Assistants API, custom GPT schemas, and tool calling.
- **The "Mock Registry" Transparency Guarantee**:
  - If a user has not configured live API credentials in VS Code's secure credential vault (`SecretStorage`), AgentForge explicitly marks the connection as **"Mock Registry Active"**.
  - All operations remain functional via local simulation without deceptive "connected" claims.
- **Platform Capability Matrix**: Compares feature support across platforms (e.g., Tool Calling, Multi-Turn Memory, Context Handoffs, Approval Gates).

---

### 3.10 Package Manager & Backup Snapshots

The **Package Manager** allows engineers to bundle, distribute, and install modular collections of skills, agents, and pipelines (`.agentforge.pkg.json`).

- **Package Types**:
  - `skill-package`: Standalone or bundled skills with supporting assets.
  - `agent-bundle`: Configured agents with their required skills and schemas.
  - `workflow-pipeline`: Full pipeline templates with node definitions and configurations.
  - `full-kit`: Comprehensive enterprise kits containing skills, agents, and pipelines.
- **Cryptographic Integrity**: Every package includes a SHA-256 hash manifest. AgentForge verifies bundle contents before installation to prevent corrupted or tampered packages.
- **Automated Point-in-Time Backup Snapshots**:
  - Prior to any package install, update, or removal, AgentForge creates an automated snapshot.
  - One-click rollback restores the workspace to its exact prior state if a conflict arises.
- **Zero-Code Execution Guarantee**: Packages contain declarative JSON and Markdown assets only. AgentForge **never** executes untrusted scripts upon import.

---

### 3.11 Governance, Least-Privilege & Audit Logging

AgentForge includes an enterprise governance layer enforcing defense-in-depth security principles.

- **Default Least-Privilege Policy**:
  - Default Network Access: **Disabled**
  - Default Filesystem Mode: **Read-Only**
  - Default Shell Command Execution: **Disabled**
  - Default Human Approval: **Mandatory on High-Impact Actions**
- **Restricted Path Traversal Sandboxing**:
  - Prohibits relative traversal paths (`..`, `../`).
  - Rejects URL-encoded traversal (`%2e%2e`) and null-byte injection attacks (`\0`, `%00`).
  - Blacklists critical files: `.git/`, `.env`, `*.pem`, `*.key`, `id_rsa*`, `credentials*`, `secrets*`.
- **Sensitive Secret Scrubbing**:
  - Automatically intercepts payloads before persistence or display.
  - Redacts OpenAI API keys (`sk-...`), GitHub personal access tokens (`ghp_...`, `github_pat_...`), Bearer authorization headers, AWS credentials, and private keys.
- **Immutable Local Audit Trail**:
  - Logs all lifecycle operations (created, edited, deleted, simulated, exported, installed, approved).
  - Searchable by actor, severity (`info`, `warning`, `error`, `critical`), outcome (`success`, `failure`, `denied`), and date range.
  - Storage is capped with circular retention policies to prevent disk exhaustion.

---

### 3.12 Settings, Administration & Workspace Portability

The **Settings** module provides complete control over platform preferences and workspace backup.

- **Workspace Preferences**:
  - Default Landing Page (Dashboard, Skills Studio, Pipeline Canvas, etc.).
  - Default Export Formats (Markdown, JSON, YAML).
  - Execution Timeouts & Maximum Retry Thresholds.
  - Confirmation modals for destructive actions.
- **Full Workspace State Backup & Restore**:
  - One-click export of entire platform state: all skills, agents, workflows, execution logs, packages, and audit history into a single JSON snapshot.
  - Restore workspace state with format validation and schema migration checks.
- **Demo Data Management**:
  - Seed enterprise sample skills, agents, and workflows for training, testing, or demonstrations.
  - Reset Demo Data returns the platform to a pristine initial configuration at any time.

---

## 4. The 14 Pipeline Canvas Node Types

The visual Harness Pipeline canvas provides **14 specialized node types** designed to model any agentic workflow:

| Node Type | Icon / Visual | Category | Functional Purpose & Behavior |
|---|---|---|---|
| **`start`** | 🟢 Play | Flow Control | Entry point of the pipeline. Ingests initial pipeline trigger parameters and environment configuration. |
| **`requirement_input`** | 📝 Document | Data Input | Validates and structures human requirements or user prompts against defined input schemas before execution begins. |
| **`skill_invocation`** | ✨ Sparkles | Execution | Executes a specific modular skill authored in Skills Studio with targeted input parameters. |
| **`agent_execution`** | 🤖 Bot | Execution | Invokes an autonomous agent configured in Agent Studio, carrying out multi-step tasks according to instructions and tools. |
| **`planning`** | 🧠 Brain | Reasoning | Analyzes complex objectives and generates structured subtasks, execution plans, or milestone decompositions. |
| **`human_approval`** | 🛡️ Shield / Hand | Governance | Mandatory gatekeeper node. Halts execution until an authorized human reviews intermediate payloads and provides Approve/Reject decisions. |
| **`condition_branch`** | 🔀 Split | Flow Control | Evaluates logical expressions against current context; dynamically routes downstream execution to the `True` or `False` handle. |
| **`context_handoff`** | 🔄 Transfer | Data Flow | Context filter and payload mapper. Extracts designated fields from upstream nodes and shapes them for downstream consumption. |
| **`parallel_execution`**| ⚡ Branch | Flow Control | Fan-out node. Spawns multiple independent execution branches to run concurrently. |
| **`merge_results`** | 🔗 Merge | Flow Control | Fan-in synchronization node. Waits for parallel branches to conclude and aggregates their outputs into a single context payload. |
| **`validation`** | 🔍 Check | Quality | Evaluates intermediate outputs against schemas, business rules, or assertion criteria, flagging discrepancies before proceeding. |
| **`retry`** | 🔁 Loop | Resilience | Configures automated retry logic with exponential backoff and error-type filtering for unreliable downstream operations. |
| **`artifact_output`** | 📦 Box | Output | Formats and emits final deliverables (e.g., code pull requests, markdown reports, configuration bundles). |
| **`end`** | 🔴 Square | Flow Control | Terminal node. Concludes pipeline execution, records final metrics, and packages the concluding response payload. |

---

## 5. End-to-End Lifecycle Workflows

### Scenario A: Authoring & Exporting a Platform-Agnostic Skill

```
1. Skills Studio
   └── Click "Create Skill"
   └── Fill YAML Frontmatter (name: "security-auditor", version: "1.0.0")
   └── Define Markdown Instructions & Add Example Scenarios
   └── Live Preview & Real-Time Validation Passes
2. Testing & Versioning
   └── Run Quality Scorecard in Test & Evaluation Studio
   └── Save Version Snapshot (v1.0.0 committed to history)
3. Multi-Platform Deployment
   └── Open Installation Planner
   └── Select Target: GitHub Copilot (.github/skills/)
   └── Review File Diff & Overwrite Safety
   └── Click "Install" -> Written to workspace ready for team use
```

### Scenario B: Designing & Simulating a Multi-Agent Pipeline with Human Gates

```
1. Harness Pipeline Canvas
   └── Drag 'start' -> 'requirement_input' -> 'planning'
   └── Connect 'planning' -> 'parallel_execution'
         ├── Branch A: 'agent_execution' (Frontend Spec Agent)
         └── Branch B: 'agent_execution' (Backend Architecture Agent)
   └── Both branches feed into -> 'merge_results'
   └── Connect 'merge_results' -> 'human_approval' (Architect Review Gate)
         ├── If Approved -> 'artifact_output' -> 'end'
         └── If Rejected -> Route back to 'planning' with revision comments
2. Graph Validation
   └── Click "Validate Graph" -> Cycle detection, connectivity, and handles verified
3. Local Simulation Run
   └── Click "Run Simulation"
   └── Watch real-time node execution highlights (Green = Success, Blue = Active)
   └── Execution halts at 'human_approval' node
   └── Review merged architecture output in the modal -> Click "Approve"
   └── Pipeline resumes to completion -> Inspect run telemetry in Execution History
```

---

## 6. Security Guardrails & Zero-Trust Mechanics

AgentForge implements a defense-in-depth model across the platform:

```
                  SECURITY DEFENSE TIERS
┌────────────────────────────────────────────────────────┐
│ TIER 1: INPUT & PATH TRAVERSAL DEFENSE                 │
│ • Rejection of '..' and URL-encoded '%2e%2e'           │
│ • Null-byte injection blocking ('\0', '%00')           │
│ • System path blocking (.git, .env, *.pem, id_rsa)     │
├────────────────────────────────────────────────────────┤
│ TIER 2: SENSITIVE DATA SCRUBBING                       │
│ • Regex scrubbing of OpenAI, GitHub & Bearer tokens    │
│ • Zero persistence of unmasked secrets in local logs   │
├────────────────────────────────────────────────────────┤
│ TIER 3: LEAST-PRIVILEGE AGENT POLICIES                 │
│ • Sandboxed filesystem flags (none, read, readwrite)   │
│ • Network and shell execution default to disabled      │
│ • Mandatory human gates for irreversible operations    │
├────────────────────────────────────────────────────────┤
│ TIER 4: PACKAGE INTEGRITY & SNAPSHOTS                  │
│ • SHA-256 cryptographic verification of packages       │
│ • Automated point-in-time workspace rollback snapshots│
│ • Absolute ban on automated script execution on import │
└────────────────────────────────────────────────────────┘
```

> [!NOTE]
> **Operational Boundary**: Local permission policies provide defense-in-depth guardrails inside VS Code. They govern agent tool invocation contracts and simulation behaviors.

---

## 7. Storage, File Formats & Technical Reference

### File Formats & Schema Specifications

#### 1. Skill Specification (`SKILL.md`)
```markdown
---
name: code-review-expert
version: 1.0.0
description: Performs rigorous multi-language static analysis and security auditing.
author: AgentForge Engineering
category: Quality & Security
tags: [security, code-review, audit]
compatibility: [copilot, claude, openai]
requirements: Git repository workspace
---

# Code Review Expert Instructions
Review code changes against OWASP Top 10 guidelines and clean architecture principles...
```

#### 2. Canonical Workflow Format (`.agentforge.workflow.json`)
```json
{
  "id": "wf-security-pipeline",
  "name": "Security Audit Pipeline",
  "description": "Multi-agent vulnerability analysis workflow",
  "version": "1.0.0",
  "status": "Ready",
  "nodes": [ ... ],
  "edges": [ ... ],
  "executionSettings": {
    "maxParallelNodes": 4,
    "retryPolicy": { "maxRetries": 3, "backoffSeconds": 2 },
    "requireApprovalFor": ["node-approval-gate"]
  }
}
```

#### 3. Package Bundle (`.agentforge.pkg.json`)
```json
{
  "manifest": {
    "id": "pkg-enterprise-audit",
    "name": "Enterprise Audit Kit",
    "version": "1.0.0",
    "type": "full-kit",
    "integrity": {
      "algorithm": "sha256",
      "hash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
    }
  },
  "skills": [ ... ],
  "agents": [ ... ],
  "workflows": [ ... ]
}
```

### Storage Locations on Disk

| Data Category | Storage Mechanism | Location / Details |
|---|---|---|
| **Workbench State** | VS Code `globalState` & Workspace Storage | Managed by VS Code runtime with atomic write-rename guards (`safeStorage.ts`). |
| **Installed Skills** | Local File System | `.agents/skills/`, `.github/skills/`, `.claude/skills/` (Workspace or User Profile). |
| **Audit Logs** | Local Storage JSON | Capped circular buffer (maximum 500 records) to preserve disk space. |
| **Backup Snapshots** | Internal Snapshots Store | Point-in-time JSON states recorded before package updates. |

---

## 8. Frequently Asked Questions (FAQ)

#### Q1: Does AgentForge require an active internet connection or paid API keys?
**No.** All core features—Skills Studio, Agent Studio, Harness Pipeline visual canvas, Local Simulation Engine, Comparison Studio, and Test & Evaluation—run 100% locally inside VS Code. The simulation engine provides deterministic mock execution with zero external token cost.

#### Q2: What is the "Mock Registry Active" indicator?
When external API keys (for OpenAI, Anthropic, or Copilot) are not saved in VS Code's `SecretStorage`, AgentForge transparently displays "Mock Registry Active". This ensures you always know when data is being simulated locally versus communicating with remote services.

#### Q3: Can I check my skills and pipelines into Git?
**Yes.** Skills can be installed directly into your repository (e.g. `.agents/skills/` or `.github/skills/`), and workflows can be exported as `.agentforge.workflow.json` files to be committed, versioned, and shared across your engineering team.

#### Q4: How does AgentForge prevent infinite loops in complex pipelines?
The workflow graph validator runs Tarjan's cycle-detection algorithm before any simulation or execution. If a circular edge is detected without a condition or retry termination threshold, the graph validator flags the cycle and prevents execution.

#### Q5: Can I export an agent designed in AgentForge to Claude Code or GitHub Copilot?
**Yes.** Open the agent in Agent Studio, navigate to the **Export** tab, and select **GitHub Copilot** (`copilot-instructions.md`), **Claude Code** (`claude.json`), or **OpenAI Assistant** format. AgentForge automatically maps the instructions, schemas, and tools to the target platform while highlighting any compatibility warnings.

---

*AgentForge — Engineered for precision, security, and universal agent portability.*
