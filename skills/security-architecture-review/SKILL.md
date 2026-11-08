---
name: security-architecture-review
version: 1.0.0
description: "Performs code reviews, security assessments, threat modeling, and architecture audits."
author: AgentForge Engineering (inspired by SecurityReview.ai methodology)
category: Security & Architecture Assurance
tags: [security, architecture, threat-modeling, stride, risk-assessment, compliance, owasp, copilot-skill]
compatibility: [copilot, claude, openai]
requirements: AgentForge v0.1.0+ Workspace, Read-Only Source Access
license: MIT
---

# /security-architecture-review — Security & Architecture Assurance

Performs code reviews, security assessments, threat modeling, and architecture audits. Analyzes applications and systems to identify architecture-level vulnerabilities, security design weaknesses, trust boundary violations, and produces structured threat models, risk registers, and remediation plans.

## Usage

```
/security-architecture-review          # Full security architecture review
/security-threat-model                 # STRIDE threat model of the system
/security-risk-assessment              # Risk assessment with likelihood × impact
/security-attack-path                  # Attack path analysis across services
/security-data-flow                    # Data flow analysis and sensitive data tracing
/security-compliance-mapping           # Map findings to OWASP/NIST/PCI/ISO controls
/security-remediation-plan             # Prioritized remediation plan
/security-review-report                # Generate the full security review report
```

## What This Skill Does

This skill performs **read-only** security architecture analysis. It does NOT:
- Perform penetration testing or active exploitation.
- Modify security configurations.
- Execute attack tools against production systems.
- Generate exploit code for active use.

It DOES:
- Inspect source code, configuration, and architecture documents.
- Build a system model with trust boundaries and data flows.
- Identify architecture-level security weaknesses.
- Produce STRIDE threat models.
- Assess risk using a transparent likelihood × impact model.
- Map findings to security compliance frameworks.
- Generate prioritized remediation plans.

## Review Process

### Phase 1 — Architecture Understanding

Inspect available artifacts:
- Architecture documents and diagrams.
- Application source code.
- API specifications (OpenAPI, GraphQL schemas).
- Database schemas and migrations.
- Infrastructure and deployment configuration (Terraform, Dockerfile, k8s manifests).
- Authentication and authorization configuration.
- External integration points.

Build a system model containing:
- **Users and actors**: Who interacts with the system (end users, admins, services, external systems).
- **Applications and services**: What components exist and their responsibilities.
- **APIs**: What endpoints are exposed and to whom.
- **Databases**: What data is stored and how.
- **External systems**: What third-party services are integrated.
- **Trust boundaries**: Where data crosses from one trust level to another.
- **Sensitive data**: What data is classified as sensitive (PII, credentials, financial, health).
- **Authentication mechanisms**: How identity is verified.
- **Authorization mechanisms**: How access is granted and enforced.

Do not assume missing architecture details. Record assumptions explicitly and flag them for verification.

See `references/architecture-assessment.md` for the full assessment methodology.

### Phase 2 — Threat Modeling (STRIDE)

Apply STRIDE to each component and trust boundary:

1. **Spoofing**: Can an attacker impersonate a legitimate user or service?
2. **Tampering**: Can an attacker modify data in transit or at rest?
3. **Repudiation**: Can an attacker deny actions they performed?
4. **Information Disclosure**: Can an attacker access data they should not see?
5. **Denial of Service**: Can an attacker disrupt service availability?
6. **Elevation of Privilege**: Can an attacker gain higher access than intended?

For each threat, record:
- Threat ID
- Affected component
- Threat category (S/T/R/I/D/E)
- Attack scenario
- Entry point
- Preconditions
- Exploitability (Low/Medium/High)
- Business impact (Low/Medium/High/Critical)
- Likelihood (Low/Medium/High)
- Severity (derived from likelihood × impact)
- Existing controls
- Recommended mitigation
- Evidence (file, line, config reference)
- Residual risk

Identify attack paths that chain multiple threats across interconnected services.

See `references/stride-methodology.md` for the full STRIDE methodology.

### Phase 3 — Security Architecture Assessment

Assess each domain:

**A. Identity and Access Management**
- Authentication mechanisms and strength.
- Authorization models (RBAC, ABAC, direct object reference).
- Privilege escalation paths.
- Session management and token validation.
- MFA presence and enforcement.

**B. Application Security**
- Input validation at boundaries.
- Injection vulnerabilities (SQL, command, template, LDAP).
- XSS (stored, reflected, DOM-based).
- CSRF protection.
- SSRF in server-side URL fetching.
- Path traversal in file operations.
- Insecure deserialization.
- Business logic abuse.

**C. API Security**
- Broken access control (BOLA/IDOR).
- Object-level authorization.
- Rate limiting and quota enforcement.
- API authentication.
- Sensitive data exposure in responses.
- Improper error handling (stack traces, internal details).

**D. Data Security**
- Data classification and handling.
- Encryption at rest.
- Encryption in transit.
- Key management practices.
- PII exposure and minimization.
- Data retention and deletion policies.
- Data leakage paths.

**E. Infrastructure and Cloud Security**
- Network segmentation and isolation.
- IAM policies and least privilege.
- Public exposure of services and storage.
- Storage permissions (S3 buckets, database grants).
- Secrets management (env vars, vaults, hardcoded secrets).
- Container security (privileged containers, image scanning).
- Configuration risks (debug mode, default credentials).

**F. AI and Agent Security**
- Prompt injection vulnerabilities.
- Tool misuse and excessive agent privileges.
- Sensitive context leakage to model providers.
- Insecure MCP tool integration.
- Untrusted instruction handling.
- Agent-to-agent trust boundaries.
- Unsafe autonomous execution paths.

See `references/trust-boundaries.md` and `references/security-controls.md` for detailed checklists.

### Phase 4 — Risk Assessment

For each finding, assign risk using:

**Risk = Likelihood × Impact**

Severity levels:
- **Critical**: Immediate threat to business operations or data. Exploitable with low effort. High impact.
- **High**: Significant threat. Exploitable with moderate effort. High or medium impact.
- **Medium**: Moderate threat. Requires specific conditions or access. Medium impact.
- **Low**: Minor threat. Difficult to exploit or low impact.
- **Informational**: Best practice or observation. No direct risk.

Explain the reasoning behind each rating. Do not produce unsupported vulnerability claims.

Separate findings into:
- **Confirmed**: Verified with evidence (code, config, test).
- **Suspected**: Likely issue but not fully verified.
- **Architectural assumption**: Based on assumed behavior that needs verification.
- **Missing evidence**: Could not assess due to missing information.

See `references/risk-assessment.md` for the full risk model.

### Phase 5 — Compliance Mapping

Map findings to applicable controls from:
- OWASP ASVS (Application Security Verification Standard)
- OWASP Top 10
- NIST Cybersecurity Framework
- NIST SP 800-53
- PCI DSS
- ISO 27001
- SOC 2
- CWE (Common Weakness Enumeration)

Do not claim formal compliance or certification based on this assessment. Show the control mapping, supporting evidence, gaps, and recommended actions.

See `references/compliance-mapping.md` for the control mapping methodology.

### Phase 6 — Remediation Planning

Produce a prioritized remediation plan:

1. **Immediate (0-7 days)**: Critical and high-severity findings that are easily exploitable.
2. **Short-term (1-4 weeks)**: High and medium-severity findings requiring code changes.
3. **Medium-term (1-3 months)**: Medium-severity findings requiring architectural changes.
4. **Long-term (3+ months)**: Low-severity findings and strategic improvements.

For each remediation item:
- Finding ID
- Priority
- Effort estimate (Small/Medium/Large)
- Responsible party (if known)
- Recommended action
- Verification method

## Security Review Outputs

Generate these artifacts:
1. Executive security assessment (summary for leadership)
2. Architecture security overview (system model and trust boundaries)
3. System component inventory
4. Trust boundary analysis
5. Data flow analysis
6. STRIDE threat model
7. Attack path analysis
8. Risk register
9. Security control mapping
10. Recommended mitigations
11. Prioritized remediation plan
12. Residual risk assessment

## Honesty Rules

- Never present a suspected finding as confirmed.
- Never claim a vulnerability exists without evidence (code, config, or documented behavior).
- Never claim formal compliance or certification.
- Always cite the file, line, or config reference for each finding.
- Always distinguish confirmed findings from assumptions and missing evidence.
- Never perform destructive testing or exploitation without explicit authorization.
- Always state limitations of the assessment (what was not reviewed, what was assumed).
- Never fabricate risk ratings — explain the likelihood and impact reasoning.

## Agent Compatibility

Works across GitHub Copilot, Claude Code, and OpenAI-compatible agents. See `adapters/` for platform-specific invocation patterns.

## License

MIT. This is an original implementation inspired by publicly described security architecture review methodologies. It does not copy or use proprietary source code from SecurityReview.ai.
