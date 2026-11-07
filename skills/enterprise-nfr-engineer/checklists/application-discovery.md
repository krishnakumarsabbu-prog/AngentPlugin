# Application Discovery Checklist

Use this checklist during the discovery phase to ensure complete application context mapping.

## Repository Inspection

- [ ] Project type identified (language, framework, runtime)
- [ ] Manifest files inspected (package.json, requirements.txt, go.mod, etc.)
- [ ] Lockfiles present and inspected
- [ ] Dockerfile / Containerfile inspected (if present)
- [ ] docker-compose.yml inspected (if present)
- [ ] Kubernetes manifests inspected (if present)
- [ ] Terraform / IaC inspected (if present)
- [ ] CI/CD pipeline inspected (.github/workflows, .gitlab-ci.yml, etc.)
- [ ] API definitions inspected (openapi.yaml, swagger.json, .proto)

## System Type

- [ ] System type classified (frontend, REST API, GraphQL, event-driven, microservices, monolith, RAG, agentic AI)
- [ ] Hybrid systems identified (e.g., frontend + API)

## Component Mapping

- [ ] Entry points identified (HTTP handlers, job processors, event consumers)
- [ ] Business logic modules identified
- [ ] Data stores identified (databases, caches, object storage, vector stores)
- [ ] External integrations identified (third-party APIs, payment, email)
- [ ] Infrastructure components identified (load balancers, CDNs, message brokers)

## Domain Selection

- [ ] Applicable NFR domains selected from the 16-domain catalog
- [ ] Excluded domains documented with justifications
- [ ] AI components identified (if any) to include AI System Quality domain

## Existing Requirements

- [ ] SLO/SLA definitions discovered (if any)
- [ ] Compliance obligations discovered (if any)
- [ ] Performance targets discovered (if any)
- [ ] DR plans discovered (if any)
- [ ] Stakeholder owners identified per domain
