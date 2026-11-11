# code-atlas reference: GitHub clone and cross-repo merge

Load this when the user passed one or more `https://github.com/...` URLs, or named several local subfolders to merge into one graph.

### Step 0 - Clone GitHub repo(s) (only if a GitHub URL was given)

**Single repo:**
```bash
LOCAL_PATH=$(code-atlas clone <github-url> [--branch <branch>])
# Use LOCAL_PATH as the target for all subsequent steps
```

**Multiple repos (cross-repo graph):**
```bash
# Clone each repo, run the full pipeline on each, then merge
code-atlas clone <url1>   # → ~/.code-atlas/repos/<owner1>/<repo1>
code-atlas clone <url2>   # → ~/.code-atlas/repos/<owner2>/<repo2>
# Run /code-atlas on each local path to produce their graph.json files
# Then merge:
code-atlas merge-graphs \
  ~/.code-atlas/repos/<owner1>/<repo1>/code-atlas-out/graph.json \
  ~/.code-atlas/repos/<owner2>/<repo2>/code-atlas-out/graph.json \
  --out code-atlas-out/cross-repo-graph.json
```

CodeAtlas clones into `~/.code-atlas/repos/<owner>/<repo>` and reuses existing clones on repeat runs. Each node in the merged graph carries a `repo` attribute so you can filter by origin.

**Multiple local subfolders (monorepo or multi-service layout):**

The skill pipeline writes all intermediate and final outputs to `code-atlas-out/` in the current working directory. Running the skill on each subfolder separately will clobber the same output dir. Instead, use the CLI directly for each subfolder — it places `code-atlas-out/` *inside* the scanned path:

```bash
code-atlas extract ./core/     # → ./core/code-atlas-out/graph.json
code-atlas extract ./service/  # → ./service/code-atlas-out/graph.json
code-atlas extract ./platform/ # → ./platform/code-atlas-out/graph.json
# Add --backend gemini|kimi|openai|deepseek|claude-cli depending on which API key you have set

# Then merge at the project root:
code-atlas merge-graphs \
  ./core/code-atlas-out/graph.json \
  ./service/code-atlas-out/graph.json \
  ./platform/code-atlas-out/graph.json \
  --out code-atlas-out/graph.json
```

Once `code-atlas-out/graph.json` exists, the fast path above takes over: any codebase question runs `code-atlas query` directly on the merged graph — no re-extraction, no size gate.
