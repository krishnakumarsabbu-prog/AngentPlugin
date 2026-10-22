---
name: talon-api-security
description: API security auditing rules for REST, GraphQL, and Webhook interfaces (OWASP API Top 10).
---

# Talon Proxy: API Security & IDOR Auditing

Modern microservice applications expose REST and GraphQL endpoints that are vulnerable to authorization bypasses and mass assignment flaws.

---

## Targeted Vulnerability Vectors

### 1. Broken Object Level Authorization (BOLA / IDOR - API1:2023)
- **Detection Pattern**: Inquire whether endpoint parameters reference database IDs directly (e.g. `GET /api/documents/1049`).
- **Test Strategy**: Swap authenticated user identity in request while querying resource owned by another tenant. Verify 403 Forbidden is returned rather than tenant data.

### 2. Broken Authentication (API2:2023)
- Lack of rate limiting on login/reset routes (`POST /auth/login`).
- Flawed password reset token expiration or predictable token generation.

### 3. Broken Object Property Level Authorization (API3:2023 - Mass Assignment)
- **Detection Pattern**: Models accepting unvalidated payload bodies directly into database entities.
- **Test Strategy**: Inject privileged attributes in registration or profile updates:
  ```json
  {
    "name": "Jane",
    "isAdmin": true,
    "role": "superadmin",
    "verified": true
  }
  ```

### 4. Unrestricted Resource Consumption (API4:2023)
- Unbounded pagination (`?limit=1000000`).
- Deeply nested or cyclic GraphQL queries lacking complexity scoring.
- Uncompressed large payload processing triggering zip bomb or memory exhaustion.

### 5. Server-Side Request Forgery via Webhooks (API7:2023)
- Endpoints accepting user-supplied callback URLs.
- Verify that requests to loopback addresses (`127.0.0.1`, `localhost`), link-local IPs (`169.254.169.254`), and private subnets (`10.0.0.0/8`, `192.168.0.0/16`) are blocked before egress.
