# AgentForge

**Universal AI Skills, Agents & Harness Pipeline Engineering Platform**

AgentForge is an enterprise VS Code extension that provides a React-based WebView workbench for
designing reusable AI skills, configuring specialized agents, and orchestrating multi-agent
harness pipelines. This repository contains the initial, runnable foundation that will be extended
across subsequent implementation prompts.

> No remote AI execution, API credentials, Docker, or separate backend server are required for this
> initial version. Sample data is bundled locally and persisted through VS Code extension storage.

---

## Feature Overview

- **Enterprise light dashboard** with metrics derived from local sample records.
- **Functional sidebar navigation** across Overview, Engineering Studio, Operations, Platform,
  Governance, and Administration sections.
- **Placeholder pages** for every future module, each describing its purpose and planned features.
- **Typed domain models** for Skills, Agents, Workflows, Workflow Nodes, Execution Records, and
  Settings.
- **Secure WebView message bridge** with request/response tracking, payload validation, and unknown
  message rejection.
- **Extension-managed local storage** with schema versioning and reset-demo-data capability.
- **Browser preview fallback** so the React UI can be developed outside VS Code using sample data.

### Current limitations

- Only the Dashboard is a fully featured page. All other modules show planned-feature placeholders.
- No real AI execution, no external integrations, and no live platform connections.
- Writes (create/update/delete) for skills, agents, and workflows are intentionally not implemented
  yet; the bridge returns a clear unsupported response for those operations.
- Pipeline editor, evaluation, governance audit, and package manager are scaffolded as navigation
  entries only.

---

## Project Architecture

```
agentforge/
├── package.json            # Root: VS Code extension manifest + scripts
├── tsconfig.json           # Extension host TS config
├── esbuild.js              # Bundles src/extension.ts -> out/extension.js
├── vitest.config.ts        # Test runner config
├── media/agentforge.svg    # Activity bar icon
├── src/                    # VS Code extension host (Node)
│   ├── extension.ts
│   ├── commands/openAgentForge.ts
│   ├── providers/AgentForgeViewProvider.ts
│   ├── bridge/             # Typed message bridge + validator
│   ├── domain/             # Shared domain models (skills, agents, workflows, executions)
│   ├── services/           # Repository + service interfaces
│   └── storage/            # LocalRepository, sample data, settings defaults
├── tests/                  # Vitest tests
└── webview-ui/             # React + Vite WebView app
    ├── package.json
    ├── vite.config.ts
    ├── tsconfig.json
    └── src/
        ├── main.tsx
        ├── App.tsx
        ├── types/
        ├── services/vscodeApi.ts
        ├── data/demoData.ts
        ├── navigation/registry.ts
        ├── layouts/AppLayout.tsx
        ├── components/      # Sidebar, Header, MetricCard, StatusBadge, EmptyState
        ├── features/        # DashboardPage + PlaceholderPage
        └── styles/globals.css
```

The extension host compiles to `out/extension.js`. The WebView builds into `dist/webview/`, which
the extension loads via webview URIs. The production extension does not depend on a running Vite
dev server.

---

## Prerequisites

- Node.js 18+ (tested with Node 20/22)
- npm 9+
- VS Code 1.80+ (for running the extension)

---

## Dependency Installation

From the project root:

```bash
npm install
cd webview-ui && npm install && cd ..
```

The root `build:webview` script also installs WebView dependencies automatically.

---

## Development Commands

### Run the WebView dev server (browser preview)

```bash
cd webview-ui
npm run dev
```

When the WebView runs outside VS Code, it detects the missing `acquireVsCodeApi` and falls back to
the bundled sample data so you can iterate on the UI.

### Build everything (WebView + extension host)

```bash
npm run build
```

This runs `build:webview` (installs WebView deps and produces `dist/webview/`) and then
`build:extension` (esbuild bundles the host to `out/extension.js`).

### Compile / type-check

```bash
npm run typecheck
```

Runs TypeScript with `noEmit` for both the extension host and the WebView.

### Run tests

```bash
npm test
```

Runs Vitest against `tests/**/*.test.ts`.

---

## Launching the VS Code Extension Development Host

1. Run a production build: `npm run build`
2. Open the project folder in VS Code.
3. Press `F5` (or run the "Extension Development Host" launch configuration). If no launch config
   exists, use the Command Palette → "Developer: Toggle Developer Tools" after opening the
   extension via the AgentForge activity bar.
4. The AgentForge icon appears in the activity bar. Click it, then click the "Open Workbench" icon
   in the view title (or run **AgentForge: Open** from the Command Palette).

---

## Debugging the WebView

Inside the Extension Development Host, run **Developer: Toggle Developer Tools** from the Command
Palette to inspect the WebView DOM, network, and console output. The WebView CSP allows only
nonce-tagged scripts and local stylesheets.

---

## Creating a VSIX Package

```bash
npm run build
npm run package:vsix
```

This uses `@vscode/vsce` to produce `agentforge-0.1.0.vsix`. The `.vscodeignore` file excludes
source maps, source TypeScript, tests, and dev-only files from the package.

---

## Local Storage Approach

AgentForge persists state through VS Code's `globalState` under the key `agentforge.state`. The
persisted object includes:

- `schemaVersion` — storage schema version (currently `1`)
- `settings` — application preferences
- `skills`, `agents`, `workflows`, `executions` — local records

On first activation, sample data is seeded. The **AgentForge: Reset Demo Data** command restores
the original sample data. Browser localStorage is only used to remember the last selected route
while developing the WebView outside VS Code; it is never the source of truth for extension data.

---

## Sample-Data Behavior

Sample data is clearly distinguishable from real user data and includes:

- 5 skills (Security Audit, Code Review, Token Efficiency, Test Generation, Architecture Analysis)
- 6 agents (Architecture, Planning, Implementation, Static Code Review, Test Validation, Documentation)
- 3 pipelines (Enterprise Feature Delivery, Security Review, Release Readiness)
- 5 execution records with varied statuses
- 3 platform integrations marked `Not Connected` or `Mock` — never represented as real connections

Dashboard metrics (totals, runs, success/failure counts, installed packages) are computed from
these records rather than hard-coded into the UI.

---

## Message Bridge

The WebView posts typed request messages to the extension host, which validates each envelope and
payload, dispatches to the appropriate service, and returns a structured response with a matching
request id. Unknown message types and invalid payloads are rejected. The initial supported types
are:

`app.ready`, `app.getState`, `app.getDashboardData`, `skills.list`, `agents.list`,
`workflows.list`, `executions.list`, `settings.get`, `settings.update`, `app.navigate`

Filesystem and VS Code operations happen only in the extension host. The WebView cannot invoke
arbitrary commands or write to arbitrary paths.

---

## Planned Implementation Phases

1. **Skills Studio** — SKILL.md editing, validation, testing, versioning, import/export.
2. **Agent Studio** — visual builder, skill assignments, tool definitions, permission policies,
   schemas, platform-specific exports.
3. **Harness Pipeline** — drag-and-drop editor using `@xyflow/react`, context handoffs, approval
   gates, retry policies, simulation, execution history.
4. **Operations** — evaluation suites, pipeline comparison, execution inspector.
5. **Platform** — adapter interfaces, package manager, capability matrix.
6. **Governance** — audit records, permission policies, change history.

---

## Commands Reference

| Command | Description |
| --- | --- |
| `npm install` | Install root dependencies |
| `cd webview-ui && npm install` | Install WebView dependencies |
| `npm run build` | Build WebView and extension host |
| `npm run build:webview` | Build the React WebView |
| `npm run build:extension` | Bundle the extension host |
| `npm run typecheck` | Type-check host and WebView |
| `npm test` | Run Vitest tests |
| `npm run dev:webview` | Vite dev server for the WebView |
| `npm run package:vsix` | Package the extension as a VSIX |
