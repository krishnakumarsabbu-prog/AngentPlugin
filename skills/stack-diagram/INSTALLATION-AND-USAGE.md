# Installation and Usage — Stack Diagram

## Prerequisites

- **Python 3.9+**: Required for icon fetching, HTML building, and PNG rendering.
- **Network access**: Required to fetch logos from svgl, devicon, gilbarbara/logos, and vendor icon packages.
- **Playwright + Chromium** (optional, for PNG only): `pip install playwright && python3 -m playwright install --with-deps chromium`

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
- Logo fetching requires network access. If unavailable, text fallback tiles are used.
- Public sharing is disabled by default. Any external publication requires explicit user approval.
