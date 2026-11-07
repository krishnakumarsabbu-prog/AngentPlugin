# Security Engineering

## Objective

Assess security across authentication, authorization, encryption, secrets
management, API security, supply-chain security, threat modeling, and
vulnerability assessment.

## Assessment Areas

### Authentication
- What authentication mechanism is used (OAuth 2.1, OIDC, SAML, API keys, mTLS)?
- Are passwords stored with a strong hashing algorithm (bcrypt, argon2, scrypt)?
- Is MFA available and enforced for sensitive operations?
- Are session tokens short-lived with refresh token rotation?
- Are JWT signatures validated and algorithm pinned?

### Authorization
- Is authorization enforced at every endpoint (not just at the entry point)?
- Is least privilege enforced?
- Are there IDOR (insecure direct object reference) vulnerabilities?
- Is role-based or attribute-based access control used and tested?
- Are admin functions protected by additional checks?

### Encryption
- Is TLS enforced for all traffic (no plaintext HTTP)?
- Is HSTS configured?
- Is sensitive data encrypted at rest?
- Are encryption keys rotated and managed in a KMS or vault?
- Are strong cipher suites used (no deprecated algorithms)?

### Secrets Management
- Are there hardcoded secrets in source code, configs, or environment files?
- Are secrets stored in a vault (HashiCorp Vault, AWS Secrets Manager, etc.)?
- Are secrets rotated regularly?
- Are secrets excluded from logs, error messages, and debug output?
- Are CI/CD secrets scoped and rotated?

### API Security (OWASP API Security Top 10)
- API1: Broken object level authorization (BOLA/IDOR)
- API2: Broken authentication
- API3: Broken object property level authorization (mass assignment)
- API4: Unrestricted resource consumption (no rate limiting)
- API5: Broken function level authorization
- API6: Unrestricted access to sensitive business flows
- API7: Server-side request forgery (SSRF)
- API8: Security misconfiguration
- API9: Improper inventory management (orphaned endpoints, staging exposed)
- API10: Unsafe consumption of APIs (trusting third-party APIs without validation)

### Supply Chain Security
- Are dependencies pinned to specific versions?
- Are lockfiles committed and used?
- Is dependency scanning configured in CI?
- Is an SBOM generated and stored?
- Are provenance attestations verified (SLSA)?

### Threat Modeling
- Is there a threat model for the system?
- Are trust boundaries identified?
- Are threat scenarios (STRIDE) documented and mitigated?
- Is the threat model updated when the architecture changes?

### Vulnerability Patterns
- Injection (SQL, command, template, NoSQL, LDAP)
- XSS (stored, reflected, DOM-based)
- SSRF (server-side request forgery)
- Insecure deserialization
- Path traversal
- Open redirects
- Mass assignment
- CSRF (for state-changing operations)

## Measurable Criteria Examples

- "No hardcoded secrets in source code (verified by secret scanning)"
- "All dependencies pinned and scanned with [tool] with zero critical CVEs"
- "All authentication uses OAuth 2.1 with PKCE"
- "Rate limiting configured on all public endpoints (max X RPS per client)"

## Tools

| Tool | Use Case |
|------|----------|
| Semgrep | Static analysis, custom rules |
| OWASP ZAP | Dynamic application security testing |
| Trivy | Container and dependency scanning |
| OSV-Scanner | Open-source vulnerability scanning |

When a tool is unavailable, mark the check NOT_EXECUTED. Never fabricate tool
output. Never run intrusive security scans without explicit authorization.

## Standards Reference

OWASP ASVS — Application Security Verification Standard. OWASP Top 10 — Web
Application Security Risks. OWASP API Security Top 10. NIST SSDF — Secure
Software Development Framework. Used as guidance only. Do not claim certified
compliance.
