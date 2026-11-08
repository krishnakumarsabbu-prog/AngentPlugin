# Trust Boundaries

## Definition

A trust boundary is any point where data, control, or authority crosses from one trust level to another. Security controls must be enforced at every trust boundary.

## Why Trust Boundaries Matter

Most security vulnerabilities occur at trust boundaries — where untrusted input enters a trusted zone, or where a trusted component accesses a more privileged zone. Identifying and mapping trust boundaries is essential for:

- Knowing where validation is needed.
- Knowing where authentication and authorization must be enforced.
- Knowing where encryption is required.
- Identifying where an attacker can cross from a low-trust to a high-trust zone.

## Common Trust Boundaries

### Network-Level Boundaries
- Internet → CDN/WAF: Untrusted traffic enters the edge.
- CDN → Origin server: Edge forwards potentially filtered traffic.
- Public subnet → Private subnet: Traffic crosses network segmentation.
- VPC → Internet: Outbound traffic leaves the trusted network.
- On-premises → Cloud: Hybrid network boundary.

### Application-Level Boundaries
- Browser → Frontend app: User input enters the client application.
- Frontend → Backend API: Client sends data to the server.
- API gateway → Microservice: Traffic passes through the gateway.
- Microservice A → Microservice B: Inter-service communication.
- Application → Database: Application queries the database.
- Application → Message queue: Application publishes messages.
- Application → External API: Application calls a third-party service.

### Process-Level Boundaries
- User input → Application logic: Raw input enters processing.
- Application logic → SQL query: Data is used in a database query.
- Application logic → Shell command: Data is used in a command.
- Application logic → File path: Data is used in a file operation.
- Application logic → Template engine: Data is rendered in a template.

### AI/Agent-Specific Boundaries
- User prompt → LLM: User input enters the model.
- LLM → Tool execution: Model output triggers a tool call.
- LLM → External API (MCP): Model calls an external service.
- Agent A → Agent B: Inter-agent communication.
- Training data → Model: Data enters the model during training.
- Model output → Application: Model output is used in application logic.

## Trust Boundary Analysis

For each trust boundary, document:

```
## Boundary: <name>
- From: <source zone> (trust level: <untrusted | low | medium | high>)
- To: <destination zone> (trust level: <untrusted | low | medium | high>)
- What crosses: <data type, command type>
- Validation: <what validation exists at this boundary>
- Authentication: <what auth is enforced>
- Authorization: <what authz is enforced>
- Encryption: <is data encrypted in transit>
- Risks: <what happens if this boundary is bypassed>
```

## Common Boundary Failures

1. **Missing validation at API boundary**: Frontend trusts backend to validate, backend trusts frontend to have validated. Neither validates.
2. **Service-to-service trust without verification**: Service A trusts Service B because "they're both internal." If Service B is compromised, Service A is also compromised.
3. **User input reaching a sink without boundary check**: User input flows through multiple layers without validation at any boundary, reaching a SQL query or shell command.
4. **Agent tool without boundary enforcement**: An AI agent's tool can access files or APIs beyond its intended scope because no boundary was enforced.
5. **Overly broad database grants**: Application database user has admin privileges instead of least-privilege CRUD grants.

## Boundary Enforcement Patterns

- **Validate at every external boundary**: Every point where data enters from a less-trusted zone must validate.
- **Authenticate at every service boundary**: Service-to-service calls must verify the caller's identity.
- **Authorize at every data access**: Every data read or write must check the caller's permissions.
- **Encrypt at every network boundary**: All data crossing a network boundary must be encrypted.
- **Sandbox at every execution boundary**: Code execution (agent tools, plugins, user scripts) must be sandboxed.
