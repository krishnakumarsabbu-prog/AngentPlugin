# /graphify-path

Finds the shortest path between two concepts in the knowledge graph.

## Invocation

```
graphify path "AuthModule" "Database"           # Shortest path between two concepts
graphify path "Frontend" "PaymentService" --directed  # Directed path (respecting edge direction)
```

## Process

1. Check that `graphify-out/graph.json` exists.
2. Resolve the source and target node labels against the graph's nodes.
3. Run BFS (undirected) or DFS (directed) to find the shortest path.
4. Output the path as a sequence of nodes with edge types.

## Output

```
Path: AuthModule → [CALLS] → UserService → [READS] → UserTable → [STORES_IN] → Database

Length: 4 hops
Edge types: CALLS, READS, STORES_IN
Communities crossed: Auth (0) → Data Access (2) → Storage (3)
```

## Rules

- If no path exists, say so explicitly. Do not fabricate a path.
- Show the edge type for each hop.
- Note which community boundaries are crossed.
- If the graph is directed, respect edge direction unless --undirected is specified.
