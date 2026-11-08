# Graphify — Claude Code Adapter

## Activation

In Claude Code, Graphify is activated by:
- Including the SKILL.md in the Claude project skills directory (`.claude/skills/graphify/`).
- Assigning the skill to an agent via Agent Studio (TASK_TRIGGERED for repository understanding tasks).
- Or invoking `/graphify` manually.

## System Prompt Integration

When Graphify is active, the following is injected:

```
## Active Skill: Graphify (Repository Intelligence)

Graphify turns any repository into a navigable knowledge graph with:
- AST extraction for code (deterministic, no API key needed)
- Semantic extraction for docs/papers/images (optional, uses Gemini or host agent)
- Community detection, god nodes, surprising connections
- Query, path, explain, and impact analysis tools

Commands:
- /graphify: Build or query the graph
- graphify query "<q>": Natural-language graph query
- graphify path "A" "B": Shortest path between concepts
- graphify explain "X": Plain-language explanation of a node
- graphify impact "X": Change impact report

Rules:
- Never invent an edge. Use AMBIGUOUS if unsure.
- Always check for existing graph.json before rebuilding.
- Report token costs honestly from telemetry.
- Distinguish EXTRACTED from INFERRED relationships.
```

## Tool Usage

Claude Code provides Bash, Read, Write, and Agent tools. Graphify uses:
- **Bash**: Run the graphify Python CLI, detect files, extract, build, query.
- **Read**: Read graph.json, GRAPH_REPORT.md, and source files for verification.
- **Agent**: Dispatch parallel subagents for semantic extraction (Step B2 in SKILL.md).
- **Write**: Write chunk files during semantic extraction.

## Prerequisites

- Python 3.9+ installed.
- `graphifyy` Python package (auto-installed via uv or pip if missing).
- `GEMINI_API_KEY` or `GOOGLE_API_KEY` (optional, for Gemini semantic extraction).
- No API key needed for code-only graph extraction.

## Mode Configuration

```json
{
  "skillId": "graphify",
  "activationMode": "task-triggered",
  "settings": {
    "mode": "standard",
    "directed": false
  }
}
```
