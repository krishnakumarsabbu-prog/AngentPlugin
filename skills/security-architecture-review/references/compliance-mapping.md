# Compliance Mapping Methodology

## Objective

Map security findings to applicable controls from recognized frameworks. This provides context for the findings and helps prioritize remediation based on compliance obligations.

## Important Disclaimer

This mapping is an AI-assisted assessment, NOT a formal compliance audit or certification. It:
- Identifies which controls are relevant to each finding.
- Shows where evidence supports or contradicts compliance.
- Highlights gaps where controls are not met.
- Recommends actions to achieve compliance.

It does NOT:
- Certify the system as compliant with any framework.
- Replace a formal audit by a qualified assessor.
- Guarantee that a regulatory body will accept the assessment.

## Supported Frameworks

### OWASP ASVS (Application Security Verification Standard)
- Level 1: Basic security verification (opportunistic).
- Level 2: Standard security verification (most applications).
- Level 3: Advanced security verification (high-value applications).

Mapping format: `ASVS V<version> <section>.<requirement>`

### OWASP Top 10 (2021)
- A01: Broken Access Control
- A02: Cryptographic Failures
- A03: Injection
- A04: Insecure Design
- A05: Security Misconfiguration
- A06: Vulnerable and Outdated Components
- A07: Identification and Authentication Failures
- A08: Software and Data Integrity Failures
- A09: Security Logging and Monitoring Failures
- A10: Server-Side Request Forgery (SSRF)

Mapping format: `OWASP Top 10 A<NN>`

### NIST Cybersecurity Framework
- Identify (ID): Asset management, risk assessment.
- Protect (PR): Access control, awareness, data security.
- Detect (DE): Anomaly detection, continuous monitoring.
- Respond (RS): Response planning, mitigation.
- Recover (RC): Recovery planning, improvements.

Mapping format: `NIST CSF <function>.<category>.<subcategory>`

### NIST SP 800-53
- AC: Access Control
- AU: Audit and Accountability
- SC: System and Communications Protection
- SI: System and Information Integrity
- IA: Identification and Authentication

Mapping format: `NIST 800-53 <family>-<control>`

### PCI DSS (v4.0)
- Requirement 3: Stored account data protection.
- Requirement 4: Transmission of cardholder data over open networks.
- Requirement 6: Secure software development.
- Requirement 7: Access control by need-to-know.
- Requirement 8: User identification and authentication.
- Requirement 10: Logging and monitoring.

Mapping format: `PCI DSS v4.0 Req <N>.<sub>`

### ISO 27001
- A.5: Information security policies
- A.6: Organization of information security
- A.7: Human resource security
- A.8: Asset management
- A.9: Access control
- A.10: Cryptography
- A.12: Operations security
- A.14: System acquisition, development and maintenance

Mapping format: `ISO 27001 A.<section>.<control>`

### SOC 2
- Security (Common Criteria)
- Availability
- Processing Integrity
- Confidentiality
- Privacy

Mapping format: `SOC 2 <category> CC<N>`

### CWE (Common Weakness Enumeration)
- CWE-79: XSS
- CWE-89: SQL Injection
- CWE-78: OS Command Injection
- CWE-22: Path Traversal
- CWE-352: CSRF
- CWE-918: SSRF
- CWE-287: Improper Authentication
- CWE-862: Missing Authorization
- CWE-200: Information Exposure

Mapping format: `CWE-<id>`

## Mapping Output Format

For each finding, the compliance mapping section looks like:

```
## Compliance Mapping for RISK-<id>

| Framework | Control | Status | Evidence |
|---|---|---|---|
| OWASP Top 10 | A01: Broken Access Control | Non-compliant | No object-level auth on /api/orders/<id> |
| OWASP ASVS | V4.0 4.1.1 | Non-compliant | Same |
| NIST 800-53 | AC-3 | Non-compliant | Access enforcement missing |
| CWE | CWE-862 | Confirmed | Missing authorization |
| ISO 27001 | A.9.4.1 | Gap | Access control policy not enforced |
```

Status values:
- **Compliant**: The control is met. Evidence supports compliance.
- **Non-compliant**: The control is not met. Evidence shows a gap.
- **Partially compliant**: Some aspects of the control are met, others are not.
- **Gap**: The control could not be fully assessed due to missing information.
- **Not applicable**: The control does not apply to this system.

## Summary Report

After mapping all findings, produce a compliance summary:

```
## Compliance Summary

### OWASP Top 10 Coverage
- A01: Broken Access Control — 3 findings (1 High, 2 Medium)
- A02: Cryptographic Failures — 1 finding (High)
- A07: Auth Failures — 2 findings (1 Critical, 1 Medium)
...

### Framework Status Overview
| Framework | Controls Assessed | Compliant | Non-compliant | Partial | Gap |
|---|---|---|---|---|---|
| OWASP Top 10 | 10 | 5 | 3 | 1 | 1 |
| OWASP ASVS L2 | 78 | 52 | 12 | 8 | 6 |
| NIST CSF | 23 | 15 | 4 | 2 | 2 |
...
```
