# STRIDE Threat Modeling Methodology

## Overview

STRIDE is a threat classification framework that categorizes threats into six types. Each threat type answers a specific security question.

| Threat Type | Security Property Violated | Question |
|---|---|---|
| Spoofing | Authentication | Are you who you claim to be? |
| Tampering | Integrity | Has the data been modified? |
| Repudiation | Non-repudiation | Can you deny you did it? |
| Information Disclosure | Confidentiality | Can anyone see data they shouldn't? |
| Denial of Service | Availability | Can the service be disrupted? |
| Elevation of Privilege | Authorization | Can you gain more access than intended? |

## Process

1. **Identify assets**: What data, services, and capabilities need protection?
2. **Map the attack surface**: Entry points, exposed APIs, user-facing features, external integrations.
3. **Apply STRIDE to each component**: For each component in the system model, consider each of the six threat types.
4. **Identify attack scenarios**: For each threat, describe how an attacker would exploit it.
5. **Assess exploitability and impact**: Rate each threat.
6. **Identify existing controls**: What mitigations are already in place?
7. **Recommend additional mitigations**: What else should be done?
8. **Calculate residual risk**: What risk remains after controls?

## Threat Record Format

```
## THREAT-<id>: <title>
- Category: Spoofing | Tampering | Repudiation | Information Disclosure | Denial of Service | Elevation of Privilege
- Affected component: <component name>
- Attack scenario: <step-by-step description of how the threat is realized>
- Entry point: <how the attacker initiates the attack>
- Preconditions: <what must be true for the attack to succeed>
- Exploitability: Low | Medium | High
- Business impact: Low | Medium | High | Critical
- Likelihood: Low | Medium | High
- Severity: Critical | High | Medium | Low (derived from likelihood × impact)
- Existing controls: <what is already in place to prevent this>
- Recommended mitigation: <what should be done to reduce the risk>
- Evidence: <file, line, config reference>
- Residual risk: Low | Medium | High | Critical
```

## Spoofing Threats

Common spoofing scenarios:
- Attacker uses stolen credentials to impersonate a legitimate user.
- Attacker forges a JWT token with elevated claims.
- Service A receives a request claiming to be from Service B without verifying Service B's identity.
- Attacker registers a domain similar to the legitimate service for phishing.
- API accepts requests without verifying the caller's identity.

Mitigation patterns:
- Multi-factor authentication.
- Token signing and verification (JWT with strong signatures).
- Mutual TLS for service-to-service communication.
- Certificate pinning for mobile clients.
- Session binding to IP or device fingerprint.

## Tampering Threats

Common tampering scenarios:
- Man-in-the-middle modifies data in transit.
- Attacker modifies data in the database directly.
- Attacker modifies a file in shared storage.
- Attacker tampers with configuration to weaken security.
- Attacker modifies a signed token's payload.

Mitigation patterns:
- TLS for all data in transit.
- Input validation and integrity checks.
- Database access controls and audit logging.
- File integrity monitoring.
- Signed tokens with strong signature verification.
- Immutable infrastructure for configuration.

## Repudiation Threats

Common repudiation scenarios:
- User performs an action but the system does not log it.
- Logs can be modified or deleted by the user.
- No timestamp or actor is recorded with critical actions.
- Transaction records can be altered after the fact.

Mitigation patterns:
- Comprehensive audit logging for all critical actions.
- Append-only log storage.
- Signed audit records.
- Correlation IDs across service boundaries.
- Non-repudiation through cryptographic signatures.

## Information Disclosure Threats

Common information disclosure scenarios:
- API returns sensitive data in responses that the user should not see.
- Error messages reveal internal system details (stack traces, SQL queries).
- Logs contain sensitive data (passwords, tokens, PII).
- Data is accessible without authentication.
- Sensitive data is stored unencrypted.

Mitigation patterns:
- Field-level authorization (only return fields the user is authorized to see).
- Generic error messages with internal logging.
- Secret scrubbing in log pipelines.
- Encryption at rest and in transit.
- Data minimization (only collect and store what is needed).
- Access control enforcement on every data access path.

## Denial of Service Threats

Common DoS scenarios:
- Attacker floods an API with requests, exhausting resources.
- A single expensive request consumes disproportionate resources.
- Attacker triggers a resource-intensive operation (file upload, complex query).
- Dependency failure cascades to service failure.
- Storage exhaustion through unbounded uploads.

Mitigation patterns:
- Rate limiting and quota enforcement.
- Request size and complexity limits.
- Circuit breakers and bulkheads.
- Async processing for expensive operations.
- Resource quotas and monitoring.
- DDoS protection at the network layer.

## Elevation of Privilege Threats

Common elevation of privilege scenarios:
- User accesses an endpoint reserved for admins without role check.
- IDOR: user accesses another user's data by changing an ID in the URL.
- Attacker manipulates a token to add elevated claims.
- Service runs with more permissions than needed.
- Agent tool has broader access than its task requires.

Mitigation patterns:
- Authorization checks on every request (not just authentication).
- Object-level authorization (BOLA/IDOR prevention).
- Least privilege for service accounts and agents.
- Token validation with claim verification.
- Regular access reviews.
- Separation of duties for privileged operations.

## Attack Path Analysis

An attack path chains multiple threats across components to achieve a larger objective.

Format:
```
## Attack Path: <name>
Objective: <what the attacker achieves>

1. [Spoofing] THREAT-003: Attacker forges a service token → gains access to internal API
2. [Elevation of Privilege] THREAT-007: Internal API lacks object-level auth → accesses other tenants' data
3. [Information Disclosure] THREAT-012: Response includes PII for all tenants

Overall impact: Mass PII exposure across all tenants
Overall likelihood: Medium (requires forged token, but no object-level auth once inside)
```
