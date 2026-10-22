---
name: talon-sandbox-executor
description: Sandboxed execution containment, least-privilege guardrails, and dynamic verification environment rules.
---

# Talon Runner: Sandboxed Dynamic Execution

Dynamic testing and PoC validation must run under strict isolation to prevent accidental damage to host developer environments or unauthorized network transmissions.

---

## Containment Invariants

### 1. Isolated Execution Boundaries
- Dynamic tests and verification scripts execute inside temporary scratch environments or containerized runtimes.
- Access to root or elevated privileges (`sudo`, Administrator) is strictly denied.
- Filesystem writes are confined strictly to an isolated temporary directory (`tempdir`).

### 2. Network Isolation & Egress Filtering
- Outbound traffic is restricted strictly to local target ports (`localhost`, `127.0.0.1`, mock containers).
- Outbound connections to external arbitrary Internet IPs are blocked unless explicitly whitelisted in the scan scope configuration.
- Local link-local addresses (`169.254.169.254`) and internal cloud metadata endpoints are blacklisted by default.

### 3. Resource Execution Quotas
- Execution timeout: Maximum 10 seconds per individual verification probe.
- Memory ceiling: Process tree killed if memory usage exceeds 256 MB.
- Output buffer: Output capped at 64 KB to prevent terminal flooding or log memory denial-of-service.

### 4. Safe Fallback
If sandbox capabilities (Docker, OS seccomp/apparmor, or node worker isolation) are unavailable on the host machine, Talon transparently downgrades findings requiring live dynamic reproduction to `needs_validation` rather than executing unconfined payloads.
