# Installation and Usage — Stack Diagram

## Prerequisites

- **Python 3.9+**: Required for local icon resolution, HTML building, and PNG rendering.
- **No network access**: The skill never downloads logos or contacts external services. Place allowed logo files under `assets/logos/` (or pass `--logos DIR`); missing logos become text placeholder tiles.
- **Playwright + Chromium** (optional, for PNG only): `pip install playwright && python3 -m playwright install --with-deps chromium`

## Local logos

`fetch_icons.py` resolves logos only from local files. Put SVG/PNG/WebP/JPG files under `assets/logos/`, or point to another local folder with `--logos DIR`. Dark variants can live in `_dark/` or use a `<name>.dark.<ext>` suffix. No download step exists.

## AgentForge installation

The Stack Diagram skill is pre-registered in AgentForge and appears in Skill Studio automatically. No manual installation is needed.

To assign it to an agent:
1. Open Agent Studio.
2. Select or create an agent (e.g. Solution Architect, Principal Engineer, DevOps Engineer).
3. Add `stack-diagram` to the agent's assigned skills.
4. Set activation mode to `TASK_TRIGGERED`.

## Invocation

The skill activates when a user requests:
- Architecture diagrams
- System architecture visualization
- Technology stack diagrams
- Cloud architecture diagrams
- Infrastructure diagrams
- Service topology diagrams
- Application component diagrams
- Monorepo tooling diagrams

### Example prompts

```
"Create an architecture diagram for React, FastAPI, PostgreSQL and Redis."
"Draw my AWS architecture with CloudFront, S3, API Gateway, Lambda, RDS and ElastiCache."
"Analyze my current repository and generate its architecture diagram."
"Generate this architecture in dark theme."
"Export my architecture as HTML and PNG."
```

## Output

Generated artifacts are saved to:
```
artifacts/stack-diagram/[diagram-name]/
  architecture.html       # self-contained HTML (source of truth)
  architecture.png        # PNG export (if requested, requires Playwright)
  architecture.tsx        # React component (if requested)
  architecture-model.json # diagram model
  execution-evidence.json # execution metadata
```

## Platform compatibility

- GitHub Copilot: supported
- Claude Code: supported
- OpenAI: supported
- AgentForge neutral: supported

## Limitations

- PNG export requires Playwright + Chromium. If not installed, HTML is still generated.
- Logos are local-only. If a logo is missing, text fallback tiles are used. The skill makes no network requests.
- Public sharing is disabled by default. Any external publication requires explicit user approval.
