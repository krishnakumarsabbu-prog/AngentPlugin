---
name: sentry-code-review
version: 1.0.0
description: Autonomous enterprise code review agent. Evaluates pull requests and source changes for architecture, logic correctness, performance bottlenecks, security vulnerabilities, and code quality across 25+ programming languages.
author: AgentForge Engineering (Adapted from awesome-skills/code-review-skill)
category: Code Review & Quality Assurance
tags: [code-review, sentry, pull-request, architecture, security, performance, copilot-skill]
compatibility: [agy, copilot, claude, openai]
requirements: AgentForge v0.1.0+ Workspace
license: Apache-2.0 / MIT Dual License (AgentForge Enterprise)
---

# Sentry Code Review Suite
Copyright (C) AgentForge Engineering. All rights reserved.
Licensed under the Apache-2.0 and MIT open-source licenses. Adapted with attribution from `awesome-skills/code-review-skill`.

Sentry Code Review is an enterprise code review capability designed for pull requests, Git diffs, and codebase audits. It shifts code reviews from nitpicking style formatting to high-impact architectural analysis, concurrency safety, algorithmic performance, OWASP security, and maintainability.

---

## Review Architecture & Submodules

The Sentry Code Review suite is structured across five core review dimensions:

```
skills/sentry-code-review/
├── SKILL.md                  # Master review protocol and operational index
├── README.md                 # Product overview, multi-language matrix & scoring
├── INSTALLATION-AND-USAGE.md # Multi-platform invocation & orchestration guide
├── LICENSE                   # Root Apache-2.0 license
├── license.md                # Dual Apache-2.0 / MIT licensing documentation
├── assets/                   # Checklists and comment templates
│   ├── review-checklist.md   # Universal quick-review checklist
│   └── pr-review-template.md # Standardized PR review feedback template
├── reference/                # Deep-dive review guides by language and dimension
│   ├── code-quality-universal.md    # Clean code, SOLID, DRY, naming conventions
│   ├── architecture-review-guide.md # Modularity, boundaries, coupling, cohesion
│   ├── performance-review-guide.md  # Complexity, memory allocation, caching
│   ├── security-review-guide.md     # OWASP Top 10, sanitization, secret checks
│   ├── common-bugs-checklist.md     # Off-by-one, null safety, race conditions
│   ├── java8.md                     # Modern Java 8+ streams, lambdas, Optional, memory
│   ├── java.md                      # Core Java concurrency, collections, exceptions
│   ├── typescript.md                # TypeScript/JavaScript modern patterns
│   ├── python.md                    # Pythonic patterns, async, type hints
│   ├── go.md                        # Go idioms, goroutines, defer, errors
│   ├── rust.md                      # Rust ownership, lifetimes, unsafe, concurrency
│   ├── react.md                     # React hooks, memoization, render loops
│   ├── angular.md, vue.md, svelte.md# Modern frontend framework standards
│   ├── django.md, fastapi.md, nestjs.md # Backend web application frameworks
│   └── c.md, cpp.md, csharp.md, etc.# Systems and enterprise language guides (30 total)
├── cross-cutting/            # Systemic failure mode reviews
│   ├── async-concurrency.md         # Deadlocks, unhandled rejections, race states
│   ├── error-handling.md            # Exception escalation, typed errors, fail-fast
│   ├── n-plus-one-queries.md        # Database batching, DataLoader, JOIN optimization
│   └── injection-prevention.md      # SQL, Command, and Template injection guards
├── scripts/                  # Production automated review engines
│   ├── pr-analyzer.cjs              # PR diff complexity and risk scorer
│   ├── review-engine.cjs            # Multi-language AST and pattern code reviewer
│   └── validate-sentry.cjs          # Suite file integrity and schema validator
└── tests/                    # Verification test suites
    ├── sentry-review.test.cjs       # Unit tests for analyzer and review engines
    └── sentry-integration.test.cjs  # Cross-platform integration tests
```

---

## The Four-Stage Review Protocol

Every code review orchestrated by Sentry follows a disciplined four-stage pipeline:

### Stage 1: Diff & Complexity Analysis (`pr-analyzer`)
- Calculates PR size (additions, deletions, total modified lines).
- Evaluates test change ratio (warns if code changes lack corresponding unit tests).
- Scores PR risk (`LOW`, `MEDIUM`, `HIGH`) based on file count, churn rate, and critical path modifications.

### Stage 2: Architecture & High-Level Design
- **Separation of Concerns**: Verifies business logic is distinct from presentation and persistence.
- **Dependency Inversion**: Checks if modules depend on abstractions rather than concrete implementations.
- **Extensibility**: Flags brittle monkey-patching or rigid coupling.

### Stage 3: Logic, Performance & Security Verification
- **Logic Correctness**: Scans for off-by-one errors, unhandled boundary conditions, and null/undefined dereferences.
- **Performance**: Flags N+1 queries, unindexed database filters, memory leaks in closures/event listeners, and unnecessary deep clones.
- **Security**: Identifies injection vectors (SQL, command, template), unvalidated redirects, missing authentication gates, and hardcoded secrets.

### Stage 4: Constructive Structured Feedback
- Employs standardized review labels:
  - `[BLOCKING]`: Critical bugs, data loss hazards, security vulnerabilities, or broken contracts.
  - `[WARNING]`: Potential performance bottlenecks or maintainability regressions.
  - `[NIT]`: Minor idiomatic refinements or documentation suggestions (non-blocking).
- Always provides a concrete, copy-pasteable code suggestion or patch.

---

## Quick Reference Commands

| Command | Action | Scope |
|---|---|---|
| `@sentry-code-review` | Trigger autonomous review in Copilot Chat | Active PR or Diff |
| `/sentry review` | Perform complete four-stage review of current diff | Changeset |
| `/sentry architecture` | Audit modularity and dependency architecture | Workspace |
| `/sentry performance` | Inspect code for N+1 queries and memory leaks | Target Files |
| `/sentry security` | Audit diff for OWASP vulnerabilities and secrets | Target Files |
| `/sentry checklist` | Output quick-reference review checklist | Markdown |
