---
name: talon-owasp-top-10
description: OWASP Top 10 vulnerability mapping, audit heuristics, and detection rules for Talon security suite.
---

# Talon Audit: OWASP Top 10 Vulnerability Classification

Talon aligns security hunting against the OWASP Top 10 web application security risks.

---

## OWASP Top 10 Categories & Talon Audit Actions

| OWASP Category | CWE Mappings | Talon Automated Audit Strategy |
|---|---|---|
| **A01: Broken Access Control** | CWE-284, CWE-639, CWE-200 | Verify endpoint authorization gates; test IDOR by swapping IDs across tenant contexts; test path traversal (`../`). |
| **A02: Cryptographic Failures** | CWE-259, CWE-327, CWE-330 | Inspect hardcoded secrets, weak hash algorithms (MD5, SHA1 for passwords), and missing TLS transport configurations. |
| **A03: Injection** | CWE-89, CWE-77, CWE-78, CWE-79 | Trace untrusted data into SQL strings, command executors (`exec`, `spawn`), template engines, and DOM innerHTML. |
| **A04: Insecure Design** | CWE-209, CWE-256, CWE-522 | Audit password reset workflows, business logic limits, and lack of defense-in-depth boundary controls. |
| **A05: Security Misconfiguration** | CWE-16, CWE-1004, CWE-614 | Check default credentials, verbose stack traces in HTTP responses, missing security headers, and permissive CORS. |
| **A06: Vulnerable & Outdated Components** | CWE-1104, CWE-1035 | Parse package manifests (`package.json`, `requirements.txt`, `pom.xml`, `go.mod`) for known CVE advisories. |
| **A07: Identification & Auth Failures** | CWE-287, CWE-384, CWE-613 | Audit session fixation, credential stuffing vulnerabilities, missing brute-force rate limits, and weak MFA logic. |
| **A08: Software & Data Integrity Failures**| CWE-502, CWE-829, CWE-494 | Detect untrusted deserialization (Python `pickle`, Java `ObjectInputStream`), unverified CI/CD artifacts, and script CDNs. |
| **A09: Security Logging & Monitoring** | CWE-778, CWE-117 | Check for missing audit logging on security-sensitive actions (password changes, role escalations) and log injection. |
| **A10: Server-Side Request Forgery (SSRF)**| CWE-918 | Detect unvalidated HTTP client fetches to user-controlled URLs; test access to loopback (`127.0.0.1`) and cloud metadata (`169.254.169.254`). |
