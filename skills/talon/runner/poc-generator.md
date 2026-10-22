---
name: talon-poc-generator
description: Deterministic, non-destructive proof-of-concept generator. Constructs minimal reproduction scripts and verified remediation code diffs.
---

# Talon Runner: Proof-of-Concept & Patch Generator

Talon separates theoretical vulnerabilities from actionable engineering deliverables by providing safe, verified Proof-of-Concept (PoC) scripts accompanied by minimal context-preserving remediation patches.

---

## PoC Generation Principles

### 1. Zero-Destruction Guarantee
All generated exploit demonstrations must be strictly read-only or harmless:
- *SQL Injection*: Use benign proof queries (e.g. `' OR 1=1 --`, `UNION SELECT 'talon_poc', 2, 3 --`) rather than data-destructive `DROP`, `UPDATE`, or `DELETE`.
- *Command Injection*: Execute harmless environment inspection commands (e.g. `whoami`, `echo "talon_proof"`, `uname -a`) rather than file alteration or reverse shells.
- *XSS*: Execute harmless payload markers (e.g. `<img src=x onerror="console.log('talon_xss')">` or alert tokens) rather than credential exfiltration.
- *SSRF*: Query loopback echo servers or harmless DNS canary tokens rather than cloud metadata credential endpoints.

### 2. Standardized PoC Schema
Every PoC artifact is formatted as a self-contained executable script (Python or Node.js) with clear parameters:
```python
#!/usr/bin/env python3
"""
Talon Exploit Verification Proof-of-Concept
Target: /api/v1/search
Vulnerability: SQL Injection (CWE-89)
Author: Talon Autonomous Pentesting Agent
"""
import sys
import requests

def test_vulnerability(base_url: str):
    target = f"{base_url}/api/v1/search"
    # Harmless proof payload
    payload = {"q": "' UNION SELECT 'talon_poc_verified', null -- "}
    res = requests.get(target, params=payload, timeout=5)
    
    if "talon_poc_verified" in res.text:
        print("[+] VULNERABILITY CONFIRMED: Target reflected injected proof string.")
        return True
    print("[-] Exploit unconfirmed or blocked.")
    return False

if __name__ == "__main__":
    url = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:3000"
    sys.exit(0 if test_vulnerability(url) else 1)
```

### 3. Remediation Patch Generation
Along with the PoC, Talon synthesizes the smallest effective code change at the last trusted decision point (e.g. replacing string concatenation with parameterized SQL queries or applying context-aware escaping).
