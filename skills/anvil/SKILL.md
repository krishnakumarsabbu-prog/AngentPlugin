---
name: anvil
version: 4.0.1
description: Enterprise token optimization suite. Cuts output tokens by 65% and input tokens by 33.2% via ASD-STE100 controlled voice and targeted compression.
author: AgentForge Engineering (adapted from JuliusBrussee/caveman)
category: Token Optimization & Compression
tags: [anvil, token-optimization, compression, asd-ste100, copilot-skill]
compatibility: [agy, copilot, claude, openai]
requirements: AgentForge v0.1.0+ Workspace
---

# Anvil Token Optimization Suite

Anvil is the enterprise-grade token optimization system for AI agents, developers, and code assistants. It slashes output tokens by up to 65% and input context tokens by 33.2% without sacrificing technical accuracy, reasoning depth, or code correctness.

Built on Aerospace Simplified Technical English (**ASD-STE100**) principles and deterministic AST/log/DOM compressors, Anvil ensures every token in your context window delivers maximum signal.

---

## Architecture & Submodules

The Anvil suite is partitioned into six core operational pillars:

```
skills/anvil/
├── SKILL.md                  # Master entrypoint & routing index
├── voices/                   # Say Less voice modes
│   ├── anvil.md              # Standard terse ASD-STE100 voice (/anvil)
│   ├── anvil-dense.md        # Fragments & payload-only voice (/anvil-dense)
│   └── anvil-core.md         # Maximum symbolic compression (/anvil-core)
├── shrink/                   # Read Less input and log compression patterns
│   ├── logs.md               # Log noise reduction, timestamps, levels, elision rules & regexes
│   ├── stacktraces.md        # Root exception + top 3 project frames, runtime internal elision
│   ├── json.md               # Tool catalog / JSON schema collapsing, meta dropping, TOON encoding
│   ├── csv.md                # Tabular / CSV compression, delimiter handling, row elision markers
│   └── test-output.md        # Test report noise suppression (JUnit/pytest/Jest failure summarizer)
├── auto/                     # Model tier & reasoning effort routing matrix
│   └── routing-matrix.md     # 3-tier complexity model router (Tier 1 Fast, Tier 2 Balanced, Tier 3 Deep)
├── blocks/                   # Deterministic code-mode script cache & reuse
│   ├── manifest.json         # SHA-256 block registry and index
│   └── release-smoke.py      # Deterministic validation script
├── waste/                    # Token leak & cache prefix warm-up auditor
│   └── cache-alignment.md    # Multi-file targeted line reads & prompt-cache prefix alignment
├── browse/                   # 129.8x web DOM-to-Markdown extractor
│   └── dom-extractor.md      # A11y tree & DOM readability heuristics, navigation/ad stripping
├── scripts/                  # Production-ready executable utilities
│   ├── anvil-compressor.cjs  # Fully working JS compressor engine for logs, stacks, JSON, CSV, tests, DOM
│   ├── detect.cjs            # Content type detector & compressor router
│   └── validate-anvil.cjs    # Production validator for anvil artifacts & configuration
└── tests/                    # Production test suite for Anvil
    └── anvil.test.cjs        # Comprehensive unit & regression tests
```

---

## The Six Core Pillars

### 1. Say Less (Voices)
Enforces concise output without conversational filler:
- **Structure**: `[thing] [action] [reason]. [next step].`
- **ASD-STE100 Rules**: Max 20 words per sentence, active voice, imperative for instructions. Zero pleasantries, zero apologies, zero preamble, zero recap.
- **Payload Strict Invariant**: All code snippets, CLI flags, file paths, variable names, errors, and negation terms (`not`, `never`, `no`, `only`, `except`) are preserved **100% character-for-character**.
- **Voice Modes**:
  - `/anvil`: Standard terse enterprise voice.
  - `/anvil-dense`: Fragmented telegraphic voice; articles and copulas dropped.
  - `/anvil-core`: Ultra-dense symbolic and notation-compressed mode.

### 2. Read Less (Shrink)
Compresses bloated diagnostic contexts before model ingestion:
- **Logs**: Strips verbose timestamps, thread identifiers, and healthy debug lines. Collapses consecutive uninformative lines into elision markers (`… N lines elided (anvil) …`).
- **Stack Traces**: Pinpoints root failure and leaf cause, preserving top 3 relevant application frames while folding framework and node/runtime internals.
- **JSON & Tool Schemas**: Drops metadata annotations (`examples`, `$schema`, `title`), truncates redundant descriptions past lead sentence, preserving exact parameter names, types, and constraints.
- **CSV & Tables**: Strips repetitive nominal data, preserving header schemas and error/warning rows.
- **Test Reports**: Strips hundreds of green passing assertions, condensing output to failing test names, exact assertions, and total counts.

### 3. Auto (Model & Effort Routing)
Dynamically classifies inbound requests into computational tiers:
- **Tier 1 (Fast / Low Effort)**: Single-file edits, renames, syntax fixes, formatting.
- **Tier 2 (Balanced / Medium Effort)**: Multi-file features, bug fixing, test suite authoring.
- **Tier 3 (Deep / High Effort)**: Concurrency, architectural redesign, security reviews.

### 4. Blocks (Deterministic Script Reuse)
Replaces repetitive multi-turn LLM code generation with cached, SHA-256 verified deterministic scripts stored in `.blocks/`. Prevents repeated round-trips for established CLI workflows, release checks, and database checks.

### 5. Waste Fixes (Context Auditing)
Eliminates context window exhaustion:
- Flags full-file reads where targeted line ranges suffice.
- Prevents cache invalidation by aligning invariant system prompts at the prompt cache boundary.

### 6. Browse (Web Page Compression)
Transforms massive web pages and API docs into clean Markdown (up to 129.8x reduction):
- Extracts `<main>`, `<article>`, and documentation content.
- Strips navigation trees, footers, headers, cookie banners, tracking scripts, and stylesheets.

---

## Quick Reference Commands

| Trigger | Description | Mode |
|---|---|---|
| `/anvil` | Activate standard terse ASD-STE100 voice | Output |
| `/anvil-dense` | Activate maximum compression telegraphic fragments | Output |
| `/anvil-core` | Activate ultra-dense symbolic voice | Output |
| `/anvil status` | Display current active Anvil configuration & metrics | Diagnostic |
| `stop anvil` | Restore default conversational voice | Output |
| `anvil-shrink` | Compress attached logs, stack traces, JSON, or test runs | Input |

---

## Production Invariants & Safety

1. **User Prompt Preservation**: Anvil **never** rewrites, truncates, or modifies the user's incoming prompt.
2. **Safety Override**: When an irreversible operation, destructive command, or security vulnerability is encountered, Anvil automatically suspends brevity and issues complete, unambiguous warnings.
3. **Lossless Code Modification**: Code edits in chat show target lines plus 1-2 context lines. Comments already existing in user files are never stripped or summarized.
