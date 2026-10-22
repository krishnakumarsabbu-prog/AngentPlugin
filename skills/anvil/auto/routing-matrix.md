---
name: anvil-auto
description: Model tier and reasoning effort routing matrix. Classifies task complexity to select optimal model tiers and compute budgets.
trigger: /anvil-auto
---

# Anvil Auto: Complexity & Model Tier Routing Matrix

Anvil Auto routes prompts to the most cost-effective model tier and reasoning effort level, preventing expensive frontier models from being squandered on mechanical formatting tasks while ensuring complex architectural refactors receive sufficient reasoning compute.

---

## The Three Complexity Tiers

| Tier | Category | Target Model Types | Reasoning Effort | Suitable Workflows |
|---|---|---|---|---|
| **Tier 1** | **Fast / Low Effort** | Flash / Haiku / Mini models (Claude 3.5 Haiku, GPT-4o-mini, Gemini 2.0 Flash) | None / Low | Linting, syntax fixes, documentation typos, formatting, simple symbol renames, unit test mocks. |
| **Tier 2** | **Balanced / Standard** | Mid-tier flagship models (Claude 3.5 Sonnet, GPT-4o, Gemini 1.5 Pro) | Medium | Feature implementation, component authoring, standard bug diagnosis, multi-file refactoring, writing test suites. |
| **Tier 3** | **Deep / Extended Effort** | Frontier reasoning models (Claude 3 Opus, o1, o3-mini xhigh) | High / xHigh | Concurrency deadlocks, architectural refactors, cryptographic implementations, complex distributed systems debugging, zero-day security hunting. |

---

## Routing Heuristics

### Tier 1 Trigger Criteria:
- Single-file edits involving fewer than 30 lines changed.
- Explanations of standard library APIs or syntax error queries.
- Mechanical transformations (e.g. converting commonjs `require` to esm `import`).
- Generating boilerplate types or interface declarations.

### Tier 2 Trigger Criteria:
- Cross-file edits involving 2-5 files.
- Implementing an API endpoint including validation and database query.
- Diagnosing a test failure with clear stack traces.
- Standard CRUD workflows and frontend UI components.

### Tier 3 Trigger Criteria:
- Work spanning > 5 interdependent modules or microservices.
- Race conditions, thread safety, memory leak investigations.
- Protocol implementations, AST parsers, compiler passes.
- Cryptographic handshakes, security threat boundary audits.

---

## Automated Policy Configuration

When operating under Copilot Chat or AgentForge:
```json
{
  "anvil.auto.enabled": true,
  "anvil.auto.default_tier": "tier-2-balanced",
  "anvil.auto.fallback": "tier-1-fast",
  "anvil.auto.escalation_rules": {
    "test_failure_count_gt": 3,
    "concurrency_keywords": ["deadlock", "mutex", "race condition", "atomic"],
    "security_keywords": ["cve", "injection", "memory safety", "buffer overflow"]
  }
}
```
