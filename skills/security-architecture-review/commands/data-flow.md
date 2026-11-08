# /security-data-flow

Analyzes data flows through the system to identify sensitive data exposure, unencrypted transit, and unauthorized access paths.

## Invocation

```
/security-data-flow                       # Analyze all data flows
/security-data-flow --data <type>         # Trace a specific data type (PII, credentials, financial)
/security-data-flow --from <source>       # Trace from a specific source
```

## Process

1. Identify all data sources (user input, databases, external APIs, file storage).
2. Trace each data flow through the system: source → processing → storage → output.
3. For each flow, record:
   - What data is flowing (data classification).
   - What trust boundaries it crosses.
   - Whether it is encrypted in transit.
   - Whether it is encrypted at rest.
   - Who can access it at each point.
   - Whether it is logged (and whether logging exposes sensitive data).
4. Identify risks:
   - Sensitive data crossing untrusted boundaries without encryption.
   - Sensitive data in logs.
   - Sensitive data in error messages.
   - Overbroad access to sensitive data.
   - Data retained longer than necessary.

## Output

```
# Data Flow Analysis

## Data Flow 1: User credentials (login → auth → session)
Data classification: Credentials (highest sensitivity)

Source: User input (login form)
  → Trust level: Untrusted
  → Validation: Email format, password length

Flow: Login form → Auth service
  → Transport: HTTPS (TLS 1.3)
  → Boundary: Internet → Application
  → Risk: None (encrypted in transit)

Processing: Auth service verifies credentials
  → Access: Auth service only
  → Risk: Password hashed with bcrypt (good)

Storage: Session token in Redis
  → Encryption: At rest (Redis TLS)
  → Access: Auth service, session service
  → Risk: None

Output: Session token to user (HttpOnly cookie)
  → Risk: None (Secure, HttpOnly, SameSite=Strict)

## Data Flow 2: ...
```

## Rules

- Classify every data flow by sensitivity (Public, Internal, Confidential, Credentials, PII, PHI, Financial).
- Identify every trust boundary the data crosses.
- Note encryption status at every stage (in transit, at rest, in processing).
- Flag any flow where sensitive data crosses an untrusted boundary without encryption.
- Flag any flow where sensitive data appears in logs or error messages.
- Do not assume encryption is in place — verify from configuration or code.
