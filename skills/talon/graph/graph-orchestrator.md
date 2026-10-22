---
name: talon-graph-orchestrator
description: Graph of Agents coordinator. Maps repository attack surfaces, decomposes threat models into parallel subtasks, and tracks audit progress.
---

# Talon Graph of Agents: Orchestration Protocol

The Graph of Agents (GoA) architecture coordinates specialized autonomous agents in a directed acyclic graph (DAG) to execute comprehensive penetration tests without getting stuck in myopic single-agent reasoning loops.

---

## The GoA Execution Lifecycle

```text
       [1. Target Initialization & Scope Definition]
                            │
                            ▼
          [2. Attack Surface Recon Worker]
           ├── Endpoints & Routes
           ├── Authentication Gates
           └── Data Inputs & Sinks
                            │
             ┌──────────────┴──────────────┐
             ▼                             ▼
   [3A. Static Code Hunter]     [3B. Dynamic Proxy Hunter]
    - Injection & Logic Flaws     - Auth Bypass & IDOR
    - Insecure Deserialization    - Rate Limiting & Tampering
             │                             │
             └──────────────┬──────────────┘
                            │
                            ▼
           [4. Independent Verifier Agent]
            - Disprove Candidate Flaws
            - Sandbox PoC Execution
                            │
                            ▼
          [5. Reporting & Patch Synthesizer]
            - Reproducible PoC Script
            - Context-Preserving Fix Patch
```

---

## State Transition Rules

1. **Scope Gating**: No worker agent may interact with files, URLs, or network destinations outside the target scope definition.
2. **Deterministic Handoff**: Each phase outputs a structured JSON artifact (`recon-map.json`, `candidate-findings.json`, `verified-findings.json`) before the next agent begins.
3. **Adversarial Validation**: A finding discovered by Hunter Agent A must **never** be validated by Hunter Agent A; it must be challenged by an independent Verifier Agent whose objective is to disprove the vulnerability.
