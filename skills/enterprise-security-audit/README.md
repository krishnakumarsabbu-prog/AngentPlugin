# Enterprise Security Audit — Cross-Platform Agent Skill

An enterprise security-audit capability that investigates source-code vulnerabilities using structured reconnaissance, coverage-led investigation, independent validation, machine-readable findings and evidence-based reporting.

Compatible with **GitHub Copilot** and **Claude Code**.

---

## 1. Overview & Core Philosophy

Enterprise Security Audit transforms AI coding agents into rigorous, defensive security auditors. Rather than providing generic checklist advice or hallucinated vulnerabilities, the methodology enforces:

- **Source-Grounded Evidence**: Every finding must trace from a concrete lower-trust entrypoint through propagation to a critical sink.
- **Strict Role Separation**: The agent validating a vulnerability is never the agent that discovered it.
- **Machine-Readable Artifacts**: All candidate findings and coverage progress are recorded in schema-validated files (`coverage-ledger.json`, `findings.json`).
- **Target-Neutral Reporting**: Reports are generated strictly from verified records with no destructive live probing instructions.
- **Universal Execution Safety**: Target-controlled code is executed strictly in an OS-enforced sandbox with network isolation; if sandbox controls are unavailable, the lead safely defaults to `needs_validation`.

---

## 2. The Six Audit Phases

1. **Phase 1 — Reconnaissance**:
   Map architecture, entrypoints, trust boundaries, sensitive data flows, and build the initial deterministic coverage ledger (`architecture.md`, `coverage-ledger.json`).
2. **Phase 2 — Coverage-Led Hunting**:
   Organize ledger units into prioritized hunting waves using attack-class prompts (`ATTACK-CLASSES.md` and domain companions). Deploy coverage critics between waves to prevent blind spots.
3. **Phase 3 — Candidate Validation**:
   Submit each discovered candidate to an independent verifier whose objective is to disprove the candidate by testing counter-invariants, path reachability, and authorization barriers.
4. **Phase 4 — Structured Findings**:
   Emit schema-compliant JSON records into `findings.json` matching `report-schema.json`. Enforce strict distinctions between `confirmed`, `needs_validation`, and `rejected`.
5. **Phase 5 — Independent Record Verification**:
   Execute independent factual verification of line references, code snippets, and claims directly against the repository source code before final publication.
6. **Phase 6 — Target-Neutral Reporting**:
   Synthesize human-readable reports derived strictly from verified data:
   - `REPORT.md`: Executive summary and coverage disclosure.
   - `FINDINGS-DETAIL.md`: Deep technical breakdowns and recommended smallest effective fixes.
   - `NEEDS-VALIDATION.md`: Blocked leads with safe manual verification instructions.

---

## 3. Directory Structure

```
skills/enterprise-security-audit/
├── SKILL.md                              # Core audit rules, execution safety, and anti-patterns
├── RECONNAISSANCE.md                     # Phase 1 reconnaissance prompts and ledger building
├── HUNTING.md                            # Phase 2 hunting waves, critic passes, and tracking
├── ATTACK-CLASSES.md                     # Core, wildcard, and obvious vulnerability prompts
├── AI-AND-LLM.md                         # Prompt injection, tool execution, and output handling
├── CLIENT-SIDE.md                        # DOM-XSS, postMessage, CSRF, UI-redress, prototype pollution
├── CLOUD-AND-DEPLOYMENT.md               # IAM, IaC, container escapes, serverless, ingress rules
├── DATA-ISOLATION-AND-LIFECYCLE.md       # Multi-tenant isolation, cache poisoning, backup/restore
├── DESKTOP-MOBILE-AND-LOCAL-IPC.md       # Deep links, IPC, local daemons, webviews
├── MEMORY-SAFETY-AND-BINARY.md           # Buffer overflows, UAF, race conditions, native binary flaws
├── PROTOCOLS-RPC-AND-MESSAGING.md        # gRPC, Protobuf, Kafka, message queues, deserialization
├── RESOURCE-EXHAUSTION-AND-AVAILABILITY.md# ReDoS, memory leaks, thread starvation, asymmetric compute
├── SUPPLY-CHAIN-AND-RELEASE.md           # Dependencies, build pipelines, signing, malicious updates
├── VALIDATION-AND-REPORTING.md           # Phases 3-6 candidate verification and reporting logic
├── WEB-PROTOCOL-AND-AUTH.md              # HTTP request smuggling, cache deception, OAuth, JWT flaws
├── report-schema.json                    # Canonical JSON Schema for findings.json
├── validate-findings.cjs                 # Zero-dependency validator for findings.json
├── validate-findings.test.cjs            # Test suite for findings validator
├── validate-coverage-ledger.cjs          # Zero-dependency validator for coverage-ledger.json
├── validate-coverage-ledger.test.cjs     # Test suite for coverage-ledger validator
├── fixtures/                             # Synthetic test fixtures and sample reports
├── test/                                 # Compatibility test suite
├── PLATFORM-COMPATIBILITY.md             # Cross-platform integration guide
├── INSTALLATION-AND-USAGE.md             # Usage examples and instructions
└── LICENSE                               # Agent Forge Plugin License
```

---

## 4. Platform Integrations

- **GitHub Copilot**:
  - Agent: `.github/agents/enterprise-security-auditor.agent.md`
  - Skill: `.github/skills/enterprise-security-audit/SKILL.md`
- **Claude Code**:
  - Agent: `.claude/agents/enterprise-security-auditor.md`
  - Skill: `.claude/skills/enterprise-security-audit/SKILL.md`

Maintain synchronization across platforms using:
```bash
node scripts/sync-skills.cjs
```
