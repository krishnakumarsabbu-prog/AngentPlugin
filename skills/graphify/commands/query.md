# /graphify-query

Queries the existing knowledge graph with a natural-language question.

## Invocation

```
graphify query "<question>"              # BFS traversal (broad context)
graphify query "<question>" --dfs        # DFS traversal (trace a specific path)
graphify query "<question>" --budget 1500 # Cap answer at N tokens
```

## Process

1. Check that `graphify-out/graph.json` exists. If not, run the full build pipeline first.
2. Expand the question against the graph's vocabulary (node labels, community names) to handle wording mismatches.
3. Run `graphify query "<question>"` using the CLI.
4. If the CLI is unavailable, fall back to an inline NetworkX traversal of `graphify-out/graph.json`.
5. Answer using only what the graph output contains.
6. Quote `source_location` when citing a specific fact.

## Examples

- "Which services call the payment API?"
- "What does the auth module depend on?"
- "How does the data flow from the frontend to the database?"

## Rules

- Answer from the graph only. Do not hallucinate relationships not in the graph.
- Cite source locations for every claim.
- If the graph does not contain enough information, say so explicitly.
- If the graph is stale (files changed since last build), suggest running `--update`.
