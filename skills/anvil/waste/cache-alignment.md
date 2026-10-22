---
name: anvil-waste-fixes
description: Token leak prevention and prompt cache prefix alignment auditor. Eliminates redundant full-file reads and protects KV-cache hits.
trigger: /anvil-waste
---

# Anvil Waste: Token Leak & Cache Prefix Auditor

Modern LLM APIs (Anthropic prompt caching, OpenAI prefix caching, DeepSeek context caching) offer 80-90% cost discounts and 4-10x latency speedups on cached prefix tokens. However, naive agent loops frequently break cache alignment and bleed tokens through redundant file operations.

---

## Waste Prevention Rules

### 1. Targeted Line-Range Reads
- **Rule**: Never read an entire multi-thousand-line file into context when investigating a bug localized to a specific function or class.
- **Action**: Use targeted line ranges (`StartLine` and `EndLine` parameters or `grep`) instead of loading full file contents.
- **Trigger**: Flag any single tool call reading > 200 lines if the user query references a specific symbol or line number.

### 2. Prompt Cache Prefix Alignment
- **Rule**: Keep static system instructions, tool definitions, and reusable documentation pinned at the head of the prompt.
- **Anti-Pattern**: Dynamically injecting timestamps, random UUIDs, or fluctuating session metadata into the top of system prompts invalidates the entire KV cache prefix.
- **Best Practice**:
  - Keep the system prompt strictly static.
  - Pin the MCP tool definitions schema.
  - Append dynamic session messages strictly at the end of the conversation history.

### 3. Redundant Search Deduplication
- **Rule**: Before dispatching full-text search sweeps across the repository, check if identical or overlapping searches were performed earlier in the session.
- **Action**: Reuse previous search hits rather than repeating tool calls.

### 4. Cache Prefix Warm-Up (Keep-Warm)
- When a user session pauses for several minutes, high-end provider prompt caches may expire (typically after 5 minutes of idle time).
- Anvil can execute a minimal no-op keep-warm ping to keep the prefix resident in memory during active developer think-time.
