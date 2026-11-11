# code-atlas reference: extra exports and benchmark

Load this when the user passed one of the export flags (`--wiki`, `--neo4j`, `--neo4j-push`, `--falkordb`, `--falkordb-push`, `--svg`, `--graphml`, `--mcp`), or when the corpus is large enough for the token-reduction benchmark. Each step runs only for its own flag.

### Step 6b - Wiki (only if --wiki flag)

**Only run this step if `--wiki` was explicitly given in the original command.**

Run this before Step 9 (cleanup) so `.code_atlas_labels.json` is still available.

```bash
code-atlas export wiki
```

### Step 7 - Neo4j export (only if --neo4j or --neo4j-push flag)

**If `--neo4j`** - generate a Cypher file for manual import:

```bash
code-atlas export neo4j
```

**If `--neo4j-push`** - push directly to Neo4j using the destination URI supplied with the original `/code-atlas` command. Only push when this flag was explicitly given.

Pass the exact URI from the original `/code-atlas` command as one argument. When constructing a shell command, quote the URI for the shell that will execute the command (use `shlex.quote` for POSIX shells), or use a structured argument interface. Keep the URI as data; never interpolate it unquoted or evaluate it as shell code. Never replace a supplied URI with localhost. If the user explicitly requested a push but supplied no URI, use the documented local default. Do not print the URI or credentials in status output or generated artifacts.

```bash
code-atlas export neo4j --push 'bolt://remote-host:7687' --user neo4j
```

Default URI is `bolt://localhost:7687`, default user is `neo4j`. Prefer the `NEO4J_PASSWORD` environment variable so the password is kept off argv; ask for credentials only when needed. Uses MERGE - safe to re-run without creating duplicates.

### Step 7a - FalkorDB export (only if --falkordb or --falkordb-push flag)

**If `--falkordb`** - generate a Cypher file. The statements are OpenCypher, but FalkorDB's `GRAPH.QUERY` runs one statement at a time (no bulk script import like Neo4j's `cypher-shell`), so prefer `--falkordb-push` to load a graph. Use this only when you want the portable `cypher.txt` artifact:

```bash
code-atlas export falkordb
```

**If `--falkordb-push`** - push directly to FalkorDB using the destination URI supplied with the original `/code-atlas` command. Only push when this flag was explicitly given.

Pass the exact URI from the original `/code-atlas` command as one argument. When constructing a shell command, quote the URI for the shell that will execute the command (use `shlex.quote` for POSIX shells), or use a structured argument interface. Keep the URI as data; never interpolate it unquoted or evaluate it as shell code. Never replace a supplied URI with localhost. If the user explicitly requested a push but supplied no URI, use the documented local default. Do not print the URI or credentials in status output or generated artifacts. Credentials are optional; ask only if the instance requires authentication, and use `FALKORDB_PASSWORD` for a password rather than printing it.

```bash
code-atlas export falkordb --push 'falkordb://remote-host:6379'
```

Default URI is `falkordb://localhost:6379` (the scheme is informational - `redis://` or a bare `host:port` work too), auth is optional, and the target graph defaults to `code-atlas`. Uses MERGE - safe to re-run without creating duplicates.

### Step 7b - SVG export (only if --svg flag)

```bash
code-atlas export svg
```

### Step 7c - GraphML export (only if --graphml flag)

```bash
code-atlas export graphml
```

### Step 7d - MCP server (only if --mcp flag)

```bash
$(cat code-atlas-out/.code_atlas_python) -m code_atlas.serve code-atlas-out/graph.json
```

This starts a stdio MCP server that exposes tools: `query_graph`, `get_node`, `get_neighbors`, `get_community`, `god_nodes`, `graph_stats`, `shortest_path`. Add to Claude Desktop or any MCP-compatible agent orchestrator so other agents can query the graph live.

To configure in Claude Desktop, add to `claude_desktop_config.json`. Claude Desktop can't run `$(...)`, and under `uv tool install` the system `python3` can't import code_atlas — so set `command` to the **absolute interpreter path** printed by `cat code-atlas-out/.code_atlas_python`:
```json
{
  "mcpServers": {
    "code-atlas": {
      "command": "<absolute path from: cat code-atlas-out/.code_atlas_python>",
      "args": ["-m", "code_atlas.serve", "/absolute/path/to/code-atlas-out/graph.json"]
    }
  }
}
```

### Step 8 - Token reduction benchmark (only if total_words > 5000)

If `total_words` from `code-atlas-out/.code_atlas_detect.json` is greater than 5,000, run:

```bash
code-atlas benchmark
```

Print the output directly in chat. If `total_words <= 5000`, skip silently - the graph value is structural clarity, not token compression, for small corpora.
