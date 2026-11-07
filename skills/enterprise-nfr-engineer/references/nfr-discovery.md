# NFR Discovery

## Objective

Discover the application context: system type, components, dependencies, data
stores, external integrations, deployment topology, and applicable NFR domains.

## Discovery Procedure

### Step 1: Repository Inspection

Inspect the repository root for manifest and config files:

| File | Indicates |
|------|-----------|
| `package.json`, `package-lock.json` | Node.js / JavaScript / TypeScript |
| `requirements.txt`, `pyproject.toml`, `Pipfile.lock` | Python |
| `go.mod`, `go.sum` | Go |
| `Cargo.toml`, `Cargo.lock` | Rust |
| `pom.xml`, `build.gradle` | Java / JVM |
| `Dockerfile`, `docker-compose.yml` | Containerized deployment |
| `*.yaml` in `k8s/`, `deploy/`, `manifests/` | Kubernetes deployment |
| `*.tf`, `*.json` in `terraform/`, `infra/` | Infrastructure as Code |
| `.github/workflows/`, `.gitlab-ci.yml` | CI/CD pipeline |
| `openapi.yaml`, `swagger.json` | API definition |
| `*.proto` | gRPC / Protocol Buffers |

### Step 2: System Type Identification

Classify the system type:

- **Frontend** — SPA, SSR, static site, mobile app.
- **REST API** — HTTP API with defined routes.
- **GraphQL API** — GraphQL schema and resolvers.
- **Event-driven** — message queues, event streams, Kafka, RabbitMQ.
- **Microservices** — multiple independently deployable services.
- **Monolith** — single deployable unit.
- **RAG application** — retrieval-augmented generation with vector store.
- **Agentic AI** — autonomous agent with tool use and planning.

A system may be a hybrid (e.g., frontend + REST API + microservices).

### Step 3: Component Mapping

Map the components:

1. **Entry points** — HTTP handlers, job processors, event consumers.
2. **Business logic** — services, domain modules, use cases.
3. **Data stores** — databases, caches, object storage, vector stores.
4. **External integrations** — third-party APIs, payment providers, email services.
5. **Infrastructure** — load balancers, CDNs, message brokers, container orchestration.

### Step 4: Applicable Domain Selection

Based on the system type and components, select applicable NFR domains from
`nfr-domain-catalog.md`. Record excluded domains with justifications.

### Step 5: Existing Requirements Discovery

Search for existing documented requirements:

- SLO/SLA definitions in docs, dashboards, or config.
- Compliance obligations in contracts or regulatory documents.
- Performance targets in design docs or APM tools.
- Availability targets in runbooks or incident policies.
- DR plans and RTO/RPO targets.

### Output

- Application context record (part of `schemas/assessment.schema.json`).
- Component map with file references.
- List of applicable and excluded NFR domains with justifications.
- Existing requirements inventory (passed to the Quantification agent).
