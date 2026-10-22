# Sentry Code Review: Autonomous Enterprise Code Review Agent

> **Version:** 1.0.0  
> **Brand & Namespace:** Sentry Code Review (`@sentry-code-review` agent & `sentry-code-review` skill)  
> **Target Platforms:** AgentForge (VS Code), GitHub Copilot Chat, Claude Code  
> **Upstream Lineage:** Adapted from `awesome-skills/code-review-skill` (Apache-2.0 / MIT)

Sentry Code Review is an AI pair programmer and pull request reviewer that evaluates source changes for architectural integrity, algorithmic complexity, OWASP security vulnerabilities, and code quality across 25+ modern programming languages.

---

## Language Ecosystems Covered

| Category | Languages & Frameworks |
|---|---|
| **Web & Frontend** | TypeScript, JavaScript, React 19, Vue 3, Angular 17+, Svelte 5, Next.js, HTML5/CSS |
| **Backend & Systems** | Node.js, NestJS, Python (FastAPI, Django), Go, Rust, Java / Kotlin, C# / .NET, PHP |
| **Native & Mobile** | Swift (iOS), Kotlin / Java (Android), Dart (Flutter), C/C++, Qt, Zig |

---

## Core Capabilities

- **PR Risk Scoring & Analysis (`scripts/pr-analyzer.cjs`)**: Evaluates PR line churn, test ratio, and file spread to compute a risk score (`LOW`, `MEDIUM`, `HIGH`).
- **Automated Rule Engine (`scripts/review-engine.cjs`)**: Checks code for anti-patterns: unhandled promises, raw SQL concatenation, XSS sinks, N+1 query loops, missing error handling, and leftover debug code.
- **Structured Feedback Templates (`assets/`)**: Provides GitHub-ready PR comments with `[BLOCKING]`, `[WARNING]`, and `[NIT]` classification.
- **Cross-Cutting Deep Dives (`cross-cutting/`)**: Comprehensive technical playbooks for concurrency safety, error escalation, and database optimization.

---

## License

Licensed under the Apache-2.0 and MIT Dual License (AgentForge Enterprise). Adapted with attribution from `awesome-skills/code-review-skill`.
