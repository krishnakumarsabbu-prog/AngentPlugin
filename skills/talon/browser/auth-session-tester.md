---
name: talon-auth-session-tester
description: Browser session storage, cookie security flags, and CSRF protection validation.
---

# Talon Browser: Session Storage & CSRF Verification

Evaluates whether client-side authentication tokens, session identifiers, and sensitive credentials are store safely against exfiltration and cross-site attacks.

---

## Storage & Cookie Security Auditing

### 1. Cookie Attribute Enforcement
Verify all session and authentication cookies (`sessionid`, `jwt`, `token`) set the following flags:
- `HttpOnly`: Prevents client-side scripts from reading the cookie via `document.cookie`, mitigating XSS credential theft.
- `Secure`: Ensures the cookie is only transmitted over encrypted TLS/HTTPS connections.
- `SameSite`: Set to `Strict` or `Lax` to prevent Cross-Site Request Forgery (CSRF). Flag `SameSite=None` without appropriate anti-CSRF tokens.
- `__Host-` or `__Secure-` prefix: Enforce cookie domain isolation.

### 2. Insecure Client Storage Inspection
- **Anti-Pattern**: Storing access tokens, refresh tokens, API secrets, or PII inside `localStorage` or `sessionStorage`.
- **Reasoning**: `localStorage` is completely accessible to any script executing in the page context. If an XSS vulnerability occurs, all secrets are immediately exfiltrated.
- **Remediation**: Use secure, `HttpOnly` cookies or memory-only closures for short-lived access tokens.

### 3. Anti-CSRF Protection Verification
- State-changing HTTP methods (`POST`, `PUT`, `DELETE`, `PATCH`) must validate an anti-CSRF token (Double Submit Cookie, Synchronizer Token Pattern, or custom header `X-Requested-With` / `X-CSRF-Token`).
- Verify tokens are tied to the authenticated user's session and cannot be predicted or reused across users.
