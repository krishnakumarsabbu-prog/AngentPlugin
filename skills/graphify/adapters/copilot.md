# Graphify — GitHub Copilot Adapter

## Activation

In GitHub Copilot Chat, Graphify is activated by:
- Exporting the skill as Copilot instructions (via Agent Studio export).
- Including the graph query methodology in `.github/copilot-instructions.md`.
- Or invoking through the AgentForge Copilot chat participant.

## Copilot Instructions Format

The exported instructions include:
- The graphify usage commands.
- The fast path (check for existing graph.json before rebuilding).
- The query methodology (vocabulary expansion, BFS/DFS, NetworkX fallback).
- The honesty rules (EXTRACTED vs INFERRED, no invented edges).
- The impact analysis methodology.

## Command Mapping

Copilot does not support slash commands for custom skills. Commands are invoked via natural language:
- "graphify build" or "build knowledge graph" → full pipeline
- "graphify query <question>" or "ask the codebase <question>" → graph query
- "graphify path A to B" → shortest path
- "graphify explain X" → explain a concept
- "graphify impact X" → change impact report

## Prerequisites

- Python 3.9+ must be installed on the user's machine.
- The `graphifyy` package must be installed (`pip install graphifyy` or `uv tool install graphifyy`).
- The Copilot workspace must have shell/terminal access to run the graphify CLI.
- If the CLI is not available, the skill falls back to inline NetworkX traversal of graph.json.

## Limitations

- Copilot Chat cannot dispatch parallel subagents for semantic extraction. For corpora with docs/papers/images, either set GEMINI_API_KEY or extract inline.
- Code-only corpora work fully (AST extraction is deterministic and does not need subagents).
- The graph is built in the workspace's `graphify-out/` directory and persists across sessions.
