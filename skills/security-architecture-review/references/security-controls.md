# Security Controls Reference

## Overview

This document lists the security controls assessed during a security architecture review, organized by domain.

## A. Identity and Access Management (IAM)

### Authentication
- Password policy: complexity, length, rotation, breach checking.
- MFA: availability, enforcement, backup methods.
- Token validation: signature verification, expiration, audience/issuer checks.
- Session management: timeout, rotation on privilege change, secure cookie flags.
- Service authentication: mTLS, API keys, OAuth client credentials.

### Authorization
- Role-based access control (RBAC): role definitions, role assignment, role enforcement.
- Attribute-based access control (ABAC): policy engine, attribute sources, enforcement.
- Object-level authorization (BOLA/IDOR): per-object ownership checks.
- Least privilege: service accounts, database users, agent tools.
- Privilege escalation paths: horizontal (same role, different user), vertical (lower role to higher role).

### Session Management
- Session token generation: cryptographically random, sufficient entropy.
- Session storage: secure cookies, server-side session store, JWT in HttpOnly cookie.
- Session invalidation: logout, timeout, revocation.
- Concurrent session control.

## B. Application Security

### Input Validation
- Validation at every external boundary.
- Allowlist validation preferred over blocklist.
- Type checking, range checking, length checking.
- Canonicalization before validation (path normalization, URL parsing).

### Injection Prevention
- SQL injection: parameterized queries, ORM, stored procedures with parameters.
- Command injection: no shell=True, argument arrays, allowlisted commands.
- Template injection: sandboxed template engines, no user input in template strings.
- LDAP injection: parameterized LDAP queries.
- XPath injection: parameterized XPath.

### XSS Prevention
- Output encoding by context (HTML, attribute, JavaScript, URL, CSS).
- Content Security Policy headers.
- HttpOnly and Secure cookies.
- Avoiding innerHTML/dangerouslySetInnerHTML with user input.

### CSRF Protection
- Anti-CSRF tokens or double-submit cookies.
- SameSite cookie attribute.
- Custom header requirement for state-changing requests.

### SSRF Prevention
- URL validation and allowlisting for server-side fetches.
- Blocking internal IP ranges (127.0.0.0/8, 10.0.0.0/8, 169.254.0.0/16, etc.).
- DNS rebinding protection.

### Path Traversal Prevention
- Path normalization before use.
- Allowlisted directories.
- Chroot or container filesystem isolation.

### Insecure Deserialization
- Avoid native deserialization of untrusted data.
- Use JSON or protocol buffers with schema validation.
- Type allowlists for deserializers.

## C. API Security

- Authentication on every endpoint.
- Authorization per object and per action.
- Rate limiting and quota enforcement.
- Request size limits.
- Response data minimization (no sensitive data in responses).
- Error handling (no stack traces, no internal details in error messages).
- CORS configuration (specific origins, not wildcard).
- API versioning and deprecation.

## D. Data Security

- Data classification: identify PII, PHI, financial, credentials.
- Encryption at rest: database-level, file-level, field-level for highly sensitive data.
- Encryption in transit: TLS 1.2+, HSTS, certificate management.
- Key management: rotation, separation of duties, HSM or cloud KMS.
- Data minimization: collect only what is needed.
- Data retention: defined policies, automated deletion.
- Data leakage prevention: DLP scanning, access logging, egress monitoring.

## E. Infrastructure and Cloud Security

- Network segmentation: public/private subnets, security groups, NACLs.
- IAM policies: least privilege, no wildcard permissions, regular review.
- Public exposure: no public S3 buckets, no public databases, no public internal APIs.
- Storage permissions: bucket policies, database grants, file permissions.
- Secrets management: no secrets in code or config files, use vault/KMS.
- Container security: non-root user, read-only filesystem, image scanning, no privileged containers.
- Configuration: debug mode off in production, no default credentials, security headers.

## F. AI and Agent Security

- Prompt injection defense: system prompt isolation, input/output filtering, structured prompts.
- Tool misuse prevention: tool scope limiting, human approval for destructive tools.
- Excessive privilege prevention: agents run with least privilege, tools are scoped.
- Sensitive context leakage: no PII/credentials in prompts to external models, data residency awareness.
- MCP tool security: tool signature verification, allowlisted endpoints, sandboxed execution.
- Untrusted instruction handling: treat all user input as untrusted, even in agent context.
- Agent-to-agent trust: mutual authentication, scope limitation, audit logging.
- Autonomous execution safety: dry-run mode, rollback capability, human-in-the-loop for irreversible actions.
