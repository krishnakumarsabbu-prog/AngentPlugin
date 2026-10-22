# Anvil: Enterprise Token Optimization Suite

> **Version:** 4.0.1  
> **Target:** AgentForge, GitHub Copilot Chat, Claude Code, OpenAI  
> **Upstream Lineage:** Adapted from `JuliusBrussee/caveman` (Apache-2.0)

Anvil makes your AI agent **say less** and **read less** without losing technical accuracy. Code stays exact. Reasoning stays deep.

---

## Performance Metrics & Benchmark Summary

| Feature Module | Upstream & Anvil Metric | Impact |
|---|---|---|
| **Say Less (Voices)** | **65% fewer output tokens** | ASD-STE100 active voice, eliminates pleasantries & preamble |
| **Read Less (Shrink)** | **33.2% fewer input tokens** | Folds uninformative logs, stacks, test suites, and schemas |
| **Auto (Effort Routing)**| **54% cheaper inference** | Routes tasks dynamically between Tier-1, Tier-2, and Tier-3 |
| **Blocks (Code-Mode)** | **397 → 76 tokens** for runs | Reuses deterministic SHA-256 cached execution scripts |
| **Browse (DOM Extractor)**| **129.8x context reduction** | Extracts documentation markdown from noisy web pages |

---

## The Six Operational Pillars

1. **Say Less**: Controlled technical English (`[thing] [action] [reason]. [next step].`). Negation locks (`not`, `never`, `no`, `only`) and verbatim locks on code blocks, CLI commands, and paths.
2. **Read Less**: Deterministic reduction of raw logs, stack traces, JSON tool catalogs, CSV tables, and unit test outputs.
3. **Auto**: Three-tier complexity classifier routing prompts to optimal model tiers and reasoning effort budgets.
4. **Blocks**: Deterministic script cache preventing expensive multi-turn LLM generation loops.
5. **Waste Fixes**: Detects multi-file full-content reads, enforcing targeted line-ranges and preserving KV prompt-cache prefix alignment.
6. **Browse**: Readability-based web page extractor removing ads, navbars, cookies, and trackers.

---

## Directory Structure

```
skills/anvil/
├── SKILL.md                  # Master skill frontmatter & definition
├── README.md                 # Product documentation and benchmarks
├── INSTALLATION-AND-USAGE.md # Deployment and multi-platform usage guide
├── LICENSE                   # Apache-2.0 License
├── voices/                   # Say Less voices
│   ├── anvil.md              # /anvil (standard terse ASD-STE100)
│   ├── anvil-dense.md        # /anvil-dense (payload only, telegraphic)
│   └── anvil-core.md         # /anvil-core (ultra-dense symbolic notation)
├── shrink/                   # Read Less compression patterns
│   ├── logs.md               # Log noise reduction
│   ├── stacktraces.md        # Stack trace folding
│   ├── json.md               # JSON schema and tool catalog shrinking
│   ├── csv.md                # CSV and tabular filtering
│   └── test-output.md        # Test suite failure extraction
├── auto/                     # Model routing
│   └── routing-matrix.md     # 3-tier complexity model router
├── blocks/                   # Deterministic scripts
│   ├── manifest.json         # Block manifest registry
│   └── release-smoke.py      # Release smoke verification block
├── waste/                    # Context leakage prevention
│   └── cache-alignment.md    # Targeted line reads & prompt cache alignment
├── browse/                   # Web page extractor
│   └── dom-extractor.md      # 129.8x DOM-to-Markdown extractor
├── scripts/                  # Runnable engines & tools
│   ├── anvil-compressor.cjs  # Core JS compression implementation
│   ├── detect.cjs            # Input payload classifier
│   └── validate-anvil.cjs    # Integrity validator
└── tests/                    # Test suite
    └── anvil.test.cjs        # Automated unit tests
```

---

## License

Licensed under the Apache License, Version 2.0. Adapted from JuliusBrussee/caveman.
