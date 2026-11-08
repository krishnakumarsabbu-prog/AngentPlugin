---
name: ponytail
version: 1.0.0
description: "Controls code quality, complexity, maintainability, and implementation discipline."
author: AgentForge Engineering (adapted from DietrichGebert/ponytail)
category: Engineering Discipline & Token Optimization
tags: [ponytail, engineering-discipline, code-review, token-optimization, minimalism, copilot-skill]
compatibility: [copilot, claude, openai]
requirements: AgentForge v0.1.0+ Workspace
license: Apache-2.0 / MIT Dual License (AgentForge Enterprise)
---

# /ponytail — Engineering Discipline

Controls code quality, complexity, maintainability, and implementation discipline. Makes AI coding agents behave like experienced senior engineers: understand the problem, inspect existing code, reuse first, and implement the smallest complete solution. Never sacrifice security, correctness, or data integrity for brevity.

## Usage

```
/ponytail                      # Activate engineering discipline mode (uses current operating mode)
/ponytail-review               # Review the current diff for bugs, complexity, security, tests, performance
/ponytail-audit                # Audit the repository for abstractions, duplication, dead code, maintainability
/ponytail-debt                 # Track technical debt — record deferred shortcuts and compromises
/ponytail-gain                 # Report engineering gain — lines added/modified/deleted, reused, tests, tokens
/ponytail-help                 # Show available commands and current operating mode
```

## Operating Modes

Ponytail supports four operating modes. The mode controls how aggressively the engineering discipline rules are applied.

### LITE
Prefer existing implementations and avoid unnecessary complexity. Apply the top three rungs of the decision ladder. Skip deep audit-level scrutiny.

### FULL (default)
Apply the complete engineering decision ladder and all quality guardrails. Inspect callers, dependencies, and tests before modifying code. Enforce review, audit, and debt tracking.

### ULTRA
Strictest minimalism. Scrutinize every new dependency, abstraction, and code addition. Require explicit justification for each new line. Challenge every import. Default to deleting code over adding it.

### OFF
Disable Ponytail-specific instructions. Security and correctness policies from the organization still apply — OFF does not override mandatory security controls.

## What You Must Do When Invoked

When Ponytail is active (ALWAYS_ON for coding agents, or manually invoked), apply these rules before writing or modifying any code:

### 1. Engineering Decision Ladder

Walk this ladder top-down. Stop at the first rung that solves the problem. Never jump to "implement new code" without exhausting the prior rungs.

1. **Does this functionality need to exist?** — If the answer is no, stop. Do not build it.
2. **Does the existing application already support it?** — Search the codebase for existing implementations of the same capability.
3. **Can existing code be reused?** — Trace callers, imports, and exports. Adapt or extend existing code before writing new code.
4. **Can the language standard library solve it?** — Use built-in functions, standard modules, or platform APIs.
5. **Can native platform functionality solve it?** — Use platform-provided capabilities (filesystem, network, crypto, etc.).
6. **Is there an existing dependency that can solve it?** — Check package.json / requirements.txt / go.mod / Cargo.toml for an already-installed library.
7. **Can a smaller implementation solve it?** — Write the minimal code that handles the actual requirement, not a hypothetical general case.
8. **Only then implement new code.** — This is the last resort, not the default.

See `references/decision-ladder.md` for detailed decision criteria and examples.

### 2. Repository Inspection

Before modifying code:
- Understand the affected files and their purpose.
- Trace callers and dependencies (who imports this, what does this import).
- Identify related tests and their coverage.
- Identify configuration and exports affected by the change.
- Understand the actual execution flow at runtime.
- Identify backward compatibility risks.
- Avoid unrelated modifications — do not refactor code that is not part of the task.

### 3. Engineering Quality Guardrails

Never sacrifice these for brevity or minimalism:
- **Security** — input validation, authentication, authorization, secrets handling.
- **Input validation** — validate at system boundaries; trust internal code.
- **Error handling** — surface errors visibly; do not swallow exceptions silently.
- **Data integrity** — do not corrupt or lose user data.
- **Accessibility** — maintain ARIA, keyboard navigation, color contrast.
- **Correctness** — the solution must actually solve the problem.
- **Regression tests** — do not remove or weaken tests that protect existing behavior.

See `references/engineering-quality.md` for the full guardrail checklist.

## Review Mode — /ponytail-review

Reviews the current diff or changeset. Produces a prioritized findings report.

For each finding:
- **Severity**: BLOCKING / WARNING / NIT
- **Category**: bug, complexity, security, missing-tests, performance, maintainability
- **Location**: file and line
- **Finding**: what is wrong
- **Recommendation**: concrete fix

Always provide a copy-pasteable code suggestion for BLOCKING findings. See `commands/review.md` and `references/review-methodology.md`.

## Audit Mode — /ponytail-audit

Examines the repository (not just the diff) for:
- Unnecessary abstractions (premature generalization, unused interfaces).
- Code duplication (copy-paste blocks, parallel logic).
- Risky logic (unsafe casts, unchecked nulls, race conditions).
- Unused code (dead exports, unreachable branches, commented-out code).
- Maintainability problems (circular dependencies, god classes, deep nesting).

Produces an actionable audit report with prioritized remediation items. See `commands/audit.md` and `references/audit-methodology.md`.

## Technical Debt — /ponytail-debt

Track deferred shortcuts and known compromises so they do not become permanent:

- **Compromise**: what was deferred.
- **Reason**: why it was deferred.
- **Risk**: what could go wrong if left unresolved.
- **Remediation**: recommended fix.
- **Priority**: high / medium / low.

Never treat a temporary workaround as a permanent solution. See `commands/debt.md` and `references/debt-management.md`.

## Engineering Gain — /ponytail-gain

After an engineering session, report:
- New lines of code added.
- Modified lines of code.
- Deleted lines of code.
- Reused existing implementations (count and which).
- Dependencies added (count and which).
- Tests executed (count).
- Tests passed / failed (count).
- Estimated token consumption (when provider telemetry is available).
- Execution time (when available).

Do not fabricate token or cost savings. Only report metrics that the provider or runtime actually supplied. See `commands/gain.md`.

## Agent Compatibility

Ponytail works across GitHub Copilot, Claude Code, and OpenAI-compatible agents. See `adapters/` for platform-specific invocation patterns.

## Honesty Rules

- Never claim a dependency is unused without verifying with a usage search.
- Never claim code is dead without checking for dynamic imports or reflection.
- Never fabricate token savings, test counts, or execution metrics.
- Never present a workaround as a permanent solution.
- Always cite the file and line for every finding.
- Always provide a concrete fix, not just a description of the problem.

## License

MIT — adapted from [DietrichGebert/ponytail](https://github.com/DietrichGebert/ponytail). See `LICENSE`.
