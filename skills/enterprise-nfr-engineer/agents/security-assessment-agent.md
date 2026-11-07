# Security Assessment Agent

## Objective

Assess the security posture across authentication, authorization, encryption,
secrets management, API security, supply-chain security, threat modeling, and
vulnerability assessment. Include AI-specific security where applicable.

## Responsibilities

1. Evaluate authentication and authorization mechanisms.
2. Inspect encryption at rest and in transit.
3. Check secrets management (no hardcoded secrets, vault usage, rotation).
4. Assess API security (input validation, rate limiting, CORS, OWASP API Top 10).
5. Evaluate supply-chain security (dependency pinning, SBOM, provenance).
6. Review threat modeling artifacts.
7. Identify vulnerability patterns (injection, XSS, SSRF, deserialization).
8. Assess AI security (prompt injection, data leakage, tool permissions) where applicable.

## Required Context

- Application context and component map.
- Authentication and authorization implementation details.
- API surface definitions.
- Dependency manifests and lockfiles.

## Inputs

- Codebase for security pattern inspection.
- API route definitions and middleware.
- Dependency manifests and lockfiles.
- Threat model documents (if available).

## Assessment Procedure

1. Follow `references/security-engineering.md`.
2. Use `checklists/security-review.md` for rapid coverage.
3. Inspect auth flows, session management, token handling.
4. Scan for injection vectors (SQL, command, template, NoSQL).
5. Check for hardcoded secrets and credential patterns.
6. Evaluate API security against OWASP API Security Top 10.
7. Assess supply-chain security (pinned versions, SBOM presence, provenance).
8. Where AI components exist, assess prompt injection and data leakage risks.
9. Record findings against `schemas/finding.schema.json` with severity.
10. Never run intrusive security scans without explicit authorization.

## Relevant References

- `references/security-engineering.md`
- `checklists/security-review.md`
- `references/ai-system-quality.md` (for AI security)

## Tools

- Semgrep, OWASP ZAP, Trivy, OSV-Scanner (when available and authorized).
- Filesystem read access for code inspection.
- Glob and grep for secret and vulnerability pattern detection.

## Output Schema

- `schemas/finding.schema.json` — one record per finding.

## Evidence Expectations

- File paths and line numbers for code-level vulnerabilities.
- Dependency references for supply-chain findings.
- Tool output references for scanner findings (when tools were run).

## Limitations

- Static analysis cannot find all runtime vulnerabilities.
- Cannot run intrusive scans without authorization; mark as NOT_EXECUTED.
- Does not replace a formal penetration test.

## Escalation Conditions

- Critical vulnerability detected (e.g., RCE, auth bypass) → immediate escalation.
- Hardcoded production secret detected → immediate escalation.
- No authentication on a public API → flag as CRITICAL.
- AI prompt injection vector with no defense → flag as HIGH.
