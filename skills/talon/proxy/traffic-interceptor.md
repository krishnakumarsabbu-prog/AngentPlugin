---
name: talon-traffic-interceptor
description: HTTP/WebSocket proxy interceptor and traffic analyzer. Evaluates request-response cycles, security headers, and tampering surfaces.
---

# Talon Proxy: Traffic Interception & Header Analysis

Talon integrates HTTP/WebSocket proxy hooks (compatible with Caido, Burp Suite, or local reverse proxies) to analyze live API communication.

---

## Interception & Analysis Checks

### 1. Security Header Matrix
Every HTTP response is audited against standard baseline security headers:
- `Strict-Transport-Security`: Enforce HTTPS and preload flag.
- `Content-Security-Policy`: Check for missing or overly permissive directives (`unsafe-inline`, `unsafe-eval`, `*`).
- `X-Frame-Options` / `frame-ancestors`: Defend against UI redressing / clickjacking.
- `X-Content-Type-Options`: Verify `nosniff` is present.
- `Referrer-Policy`: Ensure sensitive tokens are not leaked in query parameters across origins.

### 2. CORS Policy Evaluation
- **Misconfiguration 1 (Reflected Origin)**: Check if `Access-Control-Allow-Origin: <origin>` is mirrored from request without validation.
- **Misconfiguration 2 (Wildcard with Credentials)**: Flag `Access-Control-Allow-Origin: *` paired with `Access-Control-Allow-Credentials: true`.
- **Misconfiguration 3 (Null Origin Trust)**: Flag trust in `Origin: null`.

### 3. Authentication & Session Flow Testing
- Token stripping: Send request with `Authorization` header removed; verify 401 Unauthorized is returned.
- Alg-none attack: Verify JWT with `"alg": "none"` or forged HMAC key is rejected.
- Session token entropy: Verify session identifiers contain at least 128 bits of cryptographic randomness.
