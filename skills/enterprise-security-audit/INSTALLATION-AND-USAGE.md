# Installation and Usage Guide

This guide details how to install, configure, and invoke **Enterprise Security Audit** across GitHub Copilot and Claude Code environments.

---

## 1. Prerequisites

- **Node.js**: v18.0.0 or higher (for validator execution).
- **GitHub Copilot**: VS Code or GitHub.com workspace configured with GitHub Copilot Chat and custom agent support.
- **Claude Code**: Claude Code CLI or Claude Code IDE integration.

---

## 2. Installation

### Option A: Repository-Level Installation (Recommended)
Place the `.github` and `.claude` folders at the root of your target repository:
```
my-target-repo/
├── .github/
│   ├── agents/
│   │   └── enterprise-security-auditor.agent.md
│   └── skills/
│       └── enterprise-security-audit/
│           ├── SKILL.md
│           └── ... (all supporting files)
├── .claude/
│   ├── agents/
│   │   └── enterprise-security-auditor.md
│   └── skills/
│       └── enterprise-security-audit/
│           ├── SKILL.md
│           └── ... (all supporting files)
└── src/
```

### Option B: Synchronizing Updates
If working within this development repository or an enterprise monorepo:
```bash
node scripts/sync-skills.cjs
```

---

## 3. Usage Workflows

### Mode 1: Guidance Mode (Default)
Use Guidance Mode for interactive reviews, triage, and specific questions without initializing audit directories or writing reports.

**Sample Prompts**:
- `Review this pull request diff for potential IDOR or authorization bypass flaws.`
- `What attack classes apply to this WebSockets message handler?`
- `How should we enforce tenant data isolation in this PostgreSQL query?`
- `Check src/auth/jwt.ts for algorithm confusion or token signature bypasses.`

### Mode 2: Full Audit Mode
Invoke Full Audit Mode when you require an end-to-end, multi-phase security review with verified output reports and coverage metrics.

**Sample Prompts**:
- `@enterprise-security-auditor Perform an enterprise security audit on this repository.`
- `Run an end-to-end security review of ./services/billing and output findings to ~/audits/billing-run.`
- `Conduct a deep security audit focusing on supply chain and authentication boundaries.`
- `Pen-test the API surfaces in this codebase and produce REPORT.md and findings.json.`

---

## 4. Audit Run Artifacts

In Full Audit Mode, artifacts are saved to `<output-dir>` (default: `~/enterprise-security-audit/<repo-name>/run-<N>`):

| File | Description |
|---|---|
| `run-metadata.json` | Metadata including commit ref, profile, scope paths, and run status. |
| `architecture.md` | Target architecture map, trust boundaries, entrypoints, and sensitive sinks. |
| `coverage-ledger.json` | Schema-validated ledger of all explored surfaces, states, and check evidence. |
| `findings.json` | Schema-validated findings array (`confirmed`, `needs_validation`, `rejected`). |
| `REPORT.md` | Executive summary, methodology disclosure, and high-level vulnerability tables. |
| `FINDINGS-DETAIL.md` | Detailed breakdown of each confirmed vulnerability with reproduction steps and invariants. |
| `NEEDS-VALIDATION.md` | Blocked hypotheses requiring external environment verification or human triage. |

---

## 5. Validating Artifacts Manually

You can validate generated artifacts directly using the zero-dependency CLI validators:

```bash
# Validate coverage ledger
node .github/skills/enterprise-security-audit/validate-coverage-ledger.cjs path/to/coverage-ledger.json

# Validate findings against report schema
node .github/skills/enterprise-security-audit/validate-findings.cjs path/to/findings.json
```
