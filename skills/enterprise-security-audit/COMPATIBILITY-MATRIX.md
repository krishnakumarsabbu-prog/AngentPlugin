# Compatibility Matrix & Known Limitations

## 1. Feature & Platform Matrix

| Capability / Feature | Canonical Core | GitHub Copilot | Claude Code | Windows (win32) | Linux / macOS (POSIX) |
|---|:---:|:---:|:---:|:---:|:---:|
| **Six-Phase Audit Workflow** | Supported | Supported | Supported | Supported | Supported |
| **Guidance Mode (Interactive Triage)** | Supported | Supported | Supported | Supported | Supported |
| **Full Audit Mode (6 Phases)** | Supported | Supported | Supported | Supported | Supported |
| **Task Delegation / Sub-agents** | Neutral | Supported (via task tool) | Supported (via `Task`) | Supported | Supported |
| **Single-Agent Fallback** | Supported | Supported | Supported | Supported | Supported |
| **Coverage Ledger Validation (`validate-coverage-ledger.cjs`)** | Supported | Supported | Supported | Supported | Supported |
| **Findings Schema Validation (`validate-findings.cjs`)** | Supported | Supported | Supported | Supported | Supported |
| **In-Memory Object Validation** | Supported | Supported | Supported | Supported | Supported |
| **CLI O_NOFOLLOW / O_NONBLOCK File Input Protection** | POSIX-only | Platform-dependent | Platform-dependent | **Unsupported** (Safe Error) | **Supported** |
| **OS-Enforced Network Sandboxing** | Required | Environment-dependent | Environment-dependent | **Unsupported** (Safe Fallback) | Supported (bwrap/ns) |
| **Safe Fallback to `needs_validation`** | Enforced | Enforced | Enforced | Enforced | Enforced |

---

## 2. Known Limitations & Safe Fallbacks

### 1. Windows Non-POSIX File Open Flags
- **Limitation**: Windows NTFS and Node.js on `win32` do not support POSIX `fs.constants.O_NOFOLLOW` or `fs.constants.O_NONBLOCK` open flags.
- **Security Impact**: When passing input files via CLI on Windows, the validators strictly abort with `SafeInputError: OS no-follow and nonblocking input protection is unavailable` rather than silently opening files without race or symlink protection.
- **Remediation / Safe Path**: In-memory programmatic validation via `validateDocument(findings, schema)` works across all platforms. In production environments where CLI verification is mandated, execute on Linux/macOS or inside a Linux container (Docker/WSL).

### 2. Sandbox Availability for Dynamic Checks
- **Limitation**: Neither GitHub Copilot nor Claude Code guarantee OS-level namespace network isolation out-of-the-box on developer workstations without containerized execution harnesses.
- **Security Impact**: Target-controlled code (e.g. running unit tests, malicious build scripts, parser fuzzing) must not be executed without guaranteed network isolation and sanitized environments.
- **Safe Fallback**: When an OS sandbox is unavailable, the workflow strictly preserves source-grounded leads as `needs_validation` with a concrete manual or infrastructure verification plan. It never attempts un-sandboxed execution of target-controlled code.

### 3. Agent Execution Token & Time Bounds
- **Limitation**: Large monolithic codebases may exceed LLM context windows or agent budget allowances during exhaustive Phase 2 hunting.
- **Safe Fallback**: The workflow supports `quick` and `scoped` run profiles. If the allocated budget cannot reserve mandatory coverage critics and validation passes, the run cleanly terminates with `run_status: "incomplete"` and logs the exact gap in `run-metadata.json` and `REPORT.md`.
