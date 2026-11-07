# Security Review Checklist

## Authentication

- [ ] Strong authentication mechanism used (OAuth 2.1, OIDC, SAML, mTLS)
- [ ] Passwords hashed with bcrypt, argon2, or scrypt
- [ ] MFA available for sensitive operations
- [ ] Session tokens short-lived with refresh token rotation
- [ ] JWT signatures validated and algorithm pinned

## Authorization

- [ ] Authorization enforced at every endpoint
- [ ] Least privilege enforced
- [ ] No IDOR vulnerabilities
- [ ] Role-based or attribute-based access control tested
- [ ] Admin functions protected by additional checks

## Encryption

- [ ] TLS enforced for all traffic
- [ ] HSTS configured
- [ ] Sensitive data encrypted at rest
- [ ] Encryption keys managed in KMS or vault
- [ ] No deprecated cipher suites

## Secrets Management

- [ ] No hardcoded secrets in source code
- [ ] Secrets stored in a vault
- [ ] Secrets rotated regularly
- [ ] Secrets excluded from logs and error messages
- [ ] CI/CD secrets scoped and rotated

## API Security (OWASP API Top 10)

- [ ] No broken object level authorization (BOLA/IDOR)
- [ ] No broken authentication
- [ ] No mass assignment vulnerabilities
- [ ] Rate limiting configured on public endpoints
- [ ] No broken function level authorization
- [ ] No SSRF vulnerabilities
- [ ] No security misconfigurations
- [ ] No exposed staging or orphaned endpoints

## Supply Chain

- [ ] Dependencies pinned and lockfiles committed
- [ ] Dependency scanning configured in CI
- [ ] SBOM generated and stored
- [ ] No critical CVEs in production dependencies

## Vulnerability Patterns

- [ ] No SQL injection (parameterized queries used)
- [ ] No command injection
- [ ] No XSS (stored, reflected, DOM-based)
- [ ] No SSRF
- [ ] No insecure deserialization
- [ ] No path traversal
- [ ] No open redirects
- [ ] CSRF protection for state-changing operations
