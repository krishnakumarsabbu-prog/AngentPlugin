# /graphify-build

Builds a knowledge graph from a repository or directory.

## Invocation

```
/graphify                                # Build graph from current directory
/graphify <path>                         # Build graph from specific path
/graphify <path> --mode deep             # Thorough extraction with richer INFERRED edges
/graphify <path> --update                # Incremental: re-extract only new/changed files
/graphify <path> --directed              # Build directed graph (preserves edge direction)
/graphify <url>                          # Clone GitHub repo then build
```

## Process

Follow the full pipeline described in SKILL.md:
1. Ensure graphify is installed (Step 1).
2. Detect files in the target path (Step 2).
3. Extract entities and relationships — AST for code, semantic for docs (Step 3).
4. Build graph, cluster, analyze (Step 4).
5. Label communities (Step 5).
6. Generate HTML visualization (Step 6).
7. Save manifest, update cost tracker, clean up (Step 9).

## Prerequisites

- Python 3.9+ with the `graphifyy` package installed.
- The skill will attempt to auto-install via `uv` or `pip` if not found.
- No API key required for code-only extraction (AST is deterministic and free).
- `GEMINI_API_KEY` or `GOOGLE_API_KEY` (optional) for Gemini-powered semantic extraction of docs/papers/images.

## Rules

- Always check for existing `graphify-out/graph.json` before rebuilding (fast path for queries).
- Report token costs honestly from actual telemetry.
- Show the corpus summary (file counts by type) before extraction.
- Warn on large corpora (>500 files or >2M words) and suggest narrowing.
- Never hide cohesion scores or graph health warnings.
