---
name: stack-diagram
description: "Create cloud-architecture-style diagrams of tech stacks, system architectures, infra layouts, and service topologies — with real brand logos, grouped containers, and clean orthogonal arrows — delivered as self-contained HTML, a PNG image, a React/TSX component, or a live artifact. Use this skill whenever the user asks for an architecture / system / stack / infra diagram, a tech-stack overview, a service topology, a cloud-vendor-style diagram, or wants tech logos arranged into a picture of how their services connect — in any language, even if they don't name an output format, and even if the tools involved aren't cloud services."
license: Apache-2.0 / MIT Dual License (AgentForge Enterprise); bundled fonts are SIL OFL 1.1
compatibility: Python 3.9+; fully offline (no network access). PNG output also needs Playwright with Chromium
---

# stack-diagram

Produces engineering-drawing-style architecture diagrams: real logos on white tiles, labeled group boxes (like cloud-vendor VPC diagrams), orthogonal arrows with monospace labels, on a cool graph-paper background. One self-contained HTML file is the source of truth; PNG / TSX / artifact are derived from it.

## Requirements

- Python 3.9+ (standard library only for `fetch_icons.py`, `build.py` and `share.py`)
- No network access is required or used. Logos are resolved only from local files under `assets/logos/` (or `--logos DIR`); missing logos become text placeholder tiles.
- Playwright + Chromium for `render_png.py`: `pip install playwright && python3 -m playwright install --with-deps chromium`

## Workflow

1. Settle the content (nodes, groups, edges)
2. Resolve local icons — `scripts/fetch_icons.py`
3. Plan coordinates — read `references/geometry.md`
4. Build the HTML from `assets/template.html` — `scripts/build.py`
5. Render and inspect (PNG) — `scripts/render_png.py`
6. Deliver in the requested format(s)

**Before writing any HTML**, read `references/geometry.md` in full — it defines the coordinate system, spacing constants, edge-anchoring rules, and the collision checks that keep the diagram clean. Do not skip it.

## Step 1 — Settle the content

Collect from the user (or the repository, if they asked to diagram the repo):
- **Nodes**: each component, service, database, external API, dev tool, etc. For each node: a display name, a role label (1–3 words under the name), and a technology identifier for local icon lookup.
- **Groups**: boundary boxes that cluster nodes (e.g. "AWS VPC", "Public Subnet", "Application Boundary", "External Services"). Groups can nest.
- **Edges**: connections between nodes. Each edge has a source, target, an optional label (1–2 words, monospace), a class (`accent` / `neutral` / `dashed`), and a direction.

Distinguish:
- **CONFIRMED**: directly verified from source code, configuration, or explicit user statement.
- **INFERRED**: reasonable conclusion from available evidence.
- **UNKNOWN**: insufficient evidence — ask the user or leave out.

Never include secrets, API keys, passwords, or private certificate values in any node, label, edge, or metadata.

## Step 2 — Resolve local icons

```bash
python3 scripts/fetch_icons.py icons/ node1 node2:slug node3=./logos/example.svg node4:aws/AWS-Lambda
```

Spec forms:
- `name` → local logo with the same name (e.g. `hono`)
- `name:slug` → local logo under a different name (e.g. `betterauth:better-auth`)
- `name=PATH` → copy a local image file (e.g. `orpc=./logos/orpc.webp`)
- `name:aws/Service` → local AWS logo (e.g. `lambda:aws/AWS-Lambda`)
- `name:gcp/Product` → local Google Cloud logo (e.g. `run:gcp/Cloud-Run`)
- `name:azure/Service` → local Azure logo (e.g. `vault:azure/Key-Vaults`)

Local lookup order:
1. exact relative path inside `assets/logos/` (or `--logos DIR`)
2. file stem, case- and separator-insensitive
3. vendor-qualified name without its prefix
4. dark variant in `_dark/` or `<name>.dark.<ext>`

This step never opens a network connection and never downloads a logo. Put the logos you are allowed to use under `assets/logos/`. When a logo is missing, the script writes a text-placeholder SVG so the diagram build never breaks. Do not substitute remote URLs.

## Step 3 — Plan coordinates

Read `references/geometry.md`. Key rules:
- Canvas is a fixed-size absolutely-positioned coordinate system (default 1000px wide; height as needed).
- Each node occupies roughly **132w × 100h** (60×60 tile + name text + role text).
- Horizontal spacing: ≥140px between node centers on the same row.
- Vertical spacing: 140px between tile tops of consecutive rows.
- Groups: edges 24px outside outermost node boxes; top edge = first tile top − 60; bottom edge ≥ last tile top + 150.
- Horizontal edges connect tile side to tile side at tile mid-height (`y = topY+30`).
- Vertical edges connect box bottom to tile top (`y = topY_upper + 100` → `y = topY_lower - 4`). Never draw through label text.
- Elbow edges: run vertical segment in a free x-corridor; run horizontal segment in the clear band between rows.
- Edge labels use `paint-order: stroke` with a paper-colored halo for readability.

Sanity-check: list every vertical/elbow segment and ask which node boxes the x-corridor passes through. The answer must be none.

## Step 4 — Build the HTML

Write a draft HTML file using `assets/template.html` as the base. Replace:
- `%%FONT_DISPLAY%%` → base64 of `assets/fonts/Geist.woff2`
- `%%FONT_JBM%%` → base64 of `assets/fonts/JetBrainsMono.woff2`
- `%%ICON_{name}%%` → data URI of `icons/{name}.(svg|png|webp)`

Then run:

```bash
python3 scripts/build.py draft.html icons/ architecture.html --fonts assets/fonts/
```

The build script fails loudly if any `%%...%%` token is left unresolved.

The final HTML must be fully self-contained — no external network dependencies at viewing time.

## Step 5 — Render and inspect

```bash
python3 scripts/render_png.py architecture.html architecture.png
```

If Playwright/Chromium is not installed, explain what is needed and offer the installation command. Do not silently skip PNG rendering — tell the user.

After rendering, inspect the PNG:
- No overlapping components
- No clipped labels
- No missing assets
- No broken arrows
- No unreadable connection labels
- No layout overflow

If an issue is detected, correct the diagram and render again. Do not deliver an uninspected diagram as a completed result.

## Step 6 — Deliver

Default: self-contained HTML file.

Additional formats on request:
- **PNG**: rendered from the same HTML via Playwright.
- **React/TSX**: generated from the same diagram model as a dependency-free React component.
- **Light and dark themes**: every diagram supports both. Tiles stay white so logos keep their own colors. Group labels switch to the brand's dark-theme logo. Apply the theme as an independent output setting — do not change the user's application theme.

## Output formats

### Self-contained HTML (default)
Single HTML file with embedded styles, fonts, and logo assets. Renders in any browser without network access.

### PNG
High-quality image export via Playwright + Chromium. Suitable for presentations, documentation, and sharing.

### React / TSX
A dependency-free React component generated from the same diagram model. Usable in any existing React application.

### Light and dark themes
Every diagram is rendered in both themes. Tiles stay white so logos keep their own colors. Group labels switch to the brand's dark-theme logo.

## Repository-aware generation

When a user asks to "generate an architecture diagram from my repository":
1. Identify the repository root.
2. Inspect the project structure.
3. Inspect dependency manifests (`package.json`, `pom.xml`, `build.gradle`, `requirements.txt`, `pyproject.toml`, `go.mod`, `Cargo.toml`, `composer.json`).
4. Inspect configuration files (`application.yml`, `Dockerfile`, `docker-compose.yml`, Kubernetes manifests, Terraform files).
5. Inspect CI/CD workflows (`.github/workflows/`).
6. Identify frontend technologies, backend technologies, databases, APIs, external services.
7. Distinguish CONFIRMED from INFERRED from UNKNOWN.
8. Generate the architecture model.
9. Produce the diagram.
10. Render and validate.

Do not assume a technology is used merely because it appears in a dependency file. Never expose secrets in any generated output.

## Node types

Frontend, Backend, API, Database, Cache, Message Broker, Cloud Service, Infrastructure, Authentication, External Service, CI/CD, Developer Tool, AI Model, MCP Server, Agent, Storage, Monitoring.

## Group examples

AWS VPC, Public Subnet, Private Subnet, Kubernetes Cluster, Application Boundary, Database Layer, External Services, Development Environment, CI/CD Pipeline.

## Edge classes

- `accent solid` — primary flow
- `neutral solid` — internal
- `dashed` — dev/deploy

## Example prompts

1. "Create an architecture diagram for React, FastAPI, PostgreSQL and Redis."
2. "Draw my AWS architecture with CloudFront, S3, API Gateway, Lambda, RDS and ElastiCache."
3. "Analyze my current repository and generate its architecture diagram."
4. "Create an architecture diagram for my AI application with React, Python FastAPI, an agent, MCP tools, PostgreSQL and an LLM provider."
5. "Visualize my monorepo with pnpm, Turborepo, Biome, Vitest, GitHub Actions and npm publishing."
6. "Give me the same architecture as a React component."
7. "Generate this architecture in dark theme."
8. "Export my architecture as HTML and PNG."

## AgentForge integration notes

- Activation mode: TASK_TRIGGERED
- Permissions: workspace read access for repository inspection, workspace write access for generated artifacts, no network access, optional local Playwright/Chromium for PNG generation.
- Output location: `artifacts/stack-diagram/[diagram-name]/` within the workspace.
- Disable upstream public-sharing behavior by default. Any external publication requires explicit user approval.
- Compatible agents: Software Developer, Full Stack Developer, Principal Engineer, Solution Architect, Enterprise Architect, DevOps Engineer, Platform Engineer, Technical Lead.
