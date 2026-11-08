# Architecture Assessment Methodology

## Objective

Build a complete system model from available artifacts to understand the architecture before identifying security weaknesses.

## Information Sources

Gather information from (in priority order):
1. Architecture documents and design diagrams.
2. Source code (the authoritative source).
3. API specifications (OpenAPI/Swagger, GraphQL schemas, gRPC proto files).
4. Database schemas and migration files.
5. Infrastructure configuration (Terraform, CloudFormation, Dockerfile, k8s manifests).
6. CI/CD pipeline configuration.
7. Environment configuration files (excluding secrets).
8. External integration documentation.

If a source is not available, record it as a gap. Do not assume behavior that cannot be verified.

## System Model Components

### Users and Actors
- End users (authenticated and anonymous).
- Administrative users.
- Service accounts and internal services.
- External systems and third-party integrations.
- Automated agents and AI systems.

For each actor, record:
- Identity: How is the actor identified?
- Authentication: How is the actor's identity verified?
- Authorization: What can the actor do?
- Trust level: What level of trust does the system place in this actor?

### Applications and Services
- Service name and purpose.
- Technology stack.
- Entry points (HTTP endpoints, message queue consumers, scheduled jobs).
- Dependencies (other services, databases, external APIs).
- Deployment model (container, serverless, VM, bare metal).
- Network exposure (public internet, internal network, VPC-only).

### APIs
- Protocol (REST, GraphQL, gRPC, WebSocket).
- Authentication mechanism.
- Authorization model.
- Rate limiting.
- Input validation.
- Error handling.
- Sensitive data in requests or responses.

### Databases
- Database type (relational, document, key-value, graph).
- Schema overview (tables, collections, key patterns).
- Access control model (grants, roles, row-level security).
- Encryption at rest.
- Backup and retention.
- Data classification (which tables hold sensitive data).

### External Systems
- Third-party services integrated.
- Data shared with each service.
- Authentication method for the integration.
- Network path (direct, VPN, service mesh).
- Trust direction (do we trust them, do they trust us).

## Trust Boundary Mapping

A trust boundary is any point where data or control crosses from one trust level to another. Common trust boundaries:

- Internet → CDN/WAF
- CDN → Load Balancer
- Load Balancer → Application
- Application → Database
- Application → External API
- Frontend → Backend API
- Microservice A → Microservice B
- User input → Application logic
- Application → AI/LLM provider
- AI agent → Tool execution

For each trust boundary, record:
- What crosses the boundary (data, commands, files).
- What trust level changes (e.g., untrusted → trusted, trusted → privileged).
- What validation or sanitization occurs at the boundary.
- What authentication/authorization is enforced at the boundary.

## Output

The system model is the foundation for all subsequent analysis (threat modeling, risk assessment, compliance mapping). It should be a structured document that can be referenced throughout the review.

## Assumptions

Record every assumption made when source material is incomplete:
- "Assumed the API is not publicly accessible because no public ingress was found, but could not verify network configuration."
- "Assumed JWT tokens are validated server-side, but the validation code was not found in the reviewed files."

Mark each assumption for verification.
