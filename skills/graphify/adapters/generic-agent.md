# Graphify — Generic Agent Adapter

## Activation

For agents that do not fit the Copilot or Claude model (e.g., OpenAI Assistants, custom frameworks), Graphify is activated by:

1. Including the SKILL.md content in the agent's system prompt or instructions.
2. Loading relevant reference files based on the task (query, path, explain, impact).
3. Providing the agent with Bash and file read tools.

## Minimal Integration

At minimum, the agent must receive:
- The graphify usage commands.
- The fast path rule (check for graph.json before rebuilding).
- The honesty rules (EXTRACTED vs INFERRED, no invented edges).
- The query methodology.

## System Prompt Injection

```
## Active Skill: Graphify (Repository Intelligence)

Graphify builds a persistent knowledge graph from any repository using AST extraction
(deterministic, no API key) and optional semantic extraction (for docs/papers/images).

Graph evidence levels:
- EXTRACTED: Directly identified from source code (AST).
- INFERRED: Derived through analysis.
- AMBIGUOUS: Insufficient evidence.

Commands:
- /graphify: Build or query the graph
- graphify query "<q>": Natural-language graph query
- graphify path "A" "B": Shortest path
- graphify explain "X": Explain a node
- graphify impact "X": Change impact report
- graphify --update: Incremental update (only changed files)

Rules:
- Never invent an edge. Use AMBIGUOUS if unsure.
- Never present INFERRED relationships as EXTRACTED.
- Always check for existing graph.json before rebuilding.
- Report token costs from actual telemetry.
```

## Tool Requirements

The agent needs:
- **Bash/shell**: To run the graphify Python CLI and pip install.
- **File read**: To read graph.json, GRAPH_REPORT.md, and source files.
- **File write**: To write chunk files during semantic extraction (if dispatching subagents).

If Bash is unavailable, the skill cannot build the graph but can still answer questions if `graphify-out/graph.json` already exists (using inline JSON parsing).

## Prerequisites

- Python 3.9+ with `graphifyy` package.
- For code-only extraction: no API key needed.
- For semantic extraction: `GEMINI_API_KEY`/`GOOGLE_API_KEY` (optional) or the host agent acts as the LLM.
