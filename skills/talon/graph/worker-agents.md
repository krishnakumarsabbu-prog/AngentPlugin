---
name: talon-worker-agents
description: Worker agent roles, responsibilities, and prompt interfaces within the Talon Graph of Agents.
---

# Talon Worker Agents Specification

Talon divides penetration testing into specialized agent personas, each optimized with narrow tool permissions and focused heuristics.

---

## 1. Recon Worker (`recon-agent`)
- **Objective**: Discover external entry points, route definitions, parameters, and trust boundaries.
- **Tools**: Source inspection, route parser, dependency manifest reader.
- **Output Contract**: Emits `recon-map.json` detailing:
  - Public endpoints and accepted HTTP methods.
  - Required authentication tokens and scopes.
  - Ingress data parameters (query, body, path, headers).

## 2. Vulnerability Hunter (`hunter-agent`)
- **Objective**: Identify candidate vulnerabilities by tracing untrusted inputs into dangerous sinks.
- **Target Classes**: OWASP Top 10, CWE-89 (SQLi), CWE-78 (Command Injection), CWE-79 (XSS), CWE-918 (SSRF).
- **Output Contract**: Emits `candidate-findings.json` containing exact file locations, taint paths, and proposed attack vectors.

## 3. Exploit Synthesizer (`exploit-agent`)
- **Objective**: Construct a minimal, non-destructive Proof-of-Concept (PoC) script to verify that the flaw can be triggered.
- **Constraints**: Strictly non-destructive. Destructive SQL (`DROP`, `DELETE`), system wipes (`rm -rf`), or denial-of-service loops are strictly prohibited.

## 4. Independent Verifier (`verifier-agent`)
- **Objective**: Actively challenge candidate findings by running the generated PoC in a local sandbox or inspecting defense-in-depth sanitizers.
- **Verdicts**:
  - `confirmed`: Exploit succeeded in sandbox; impact is proven.
  - `needs_validation`: Vulnerability likely exists but requires external service configuration.
  - `rejected`: False positive; sanitizer, ORM, or type guard prevents exploit.
