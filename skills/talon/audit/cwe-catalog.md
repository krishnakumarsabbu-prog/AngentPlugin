---
name: talon-cwe-catalog
description: Comprehensive Common Weakness Enumeration (CWE) catalog and severity rating matrix for Talon.
---

# Talon Audit: Common Weakness Enumeration (CWE) Catalog

Talon standardizes all confirmed and suspected vulnerabilities using Common Weakness Enumeration (CWE) identifiers and CVSS 3.1 severity scores.

---

## Primary CWE Reference Index

### High & Critical Severity Classes
- **CWE-78: OS Command Injection (CVSS 9.8)**
  - Unsanitized inputs concatenated into shell invocations (`child_process.exec`, `os.system`, `subprocess.Popen(shell=True)`).
- **CWE-89: SQL Injection (CVSS 9.8)**
  - Unparameterized SQL query assembly allowing database exfiltration, modification, or auth bypass.
- **CWE-502: Deserialization of Untrusted Data (CVSS 9.8)**
  - Direct deserialization of serialized objects resulting in arbitrary remote code execution (RCE).
- **CWE-918: Server-Side Request Forgery (SSRF) (CVSS 8.6)**
  - Server making outgoing network requests to attacker-supplied addresses, exposing internal network services.
- **CWE-287: Improper Authentication (CVSS 9.1)**
  - Flaws in credential checking, token validation, or signature verification allowing identity assumption.
- **CWE-639: Insecure Direct Object Reference (IDOR) (CVSS 8.5)**
  - Accessing internal object keys without validating tenant ownership.

### Medium Severity Classes
- **CWE-79: Cross-Site Scripting (XSS) (CVSS 6.1)**
  - Reflected, stored, or DOM-based execution of untrusted scripts in the browser context.
- **CWE-352: Cross-Site Request Forgery (CSRF) (CVSS 6.5)**
  - Forcing an authenticated browser to submit unintended actions without anti-CSRF token verification.
- **CWE-942: Permissive Cross-Domain Policy (CORS) (CVSS 6.5)**
  - Overly permissive cross-origin resource sharing allowing unauthorized data exfiltration.
- **CWE-798: Use of Hardcoded Credentials (CVSS 7.5)**
  - Plaintext secrets, private keys, or API tokens committed in source files.
