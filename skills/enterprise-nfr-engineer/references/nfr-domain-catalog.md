# NFR Domain Catalog

The 16 NFR domains assessed by this skill, aligned with ISO/IEC 25010:2023
quality characteristics where applicable.

| # | Domain | ISO/IEC 25010 Characteristic | Reference |
|---|--------|-------------------------------|-----------|
| 1 | Performance Engineering | Performance Efficiency | `performance-engineering.md` |
| 2 | Scalability Engineering | Performance Efficiency (capacity) | `scalability-engineering.md` |
| 3 | Availability Engineering | Reliability (availability) | `availability-engineering.md` |
| 4 | Reliability & Resilience | Reliability (maturity, fault tolerance) | `reliability-resilience.md` |
| 5 | Security Engineering | Security | `security-engineering.md` |
| 6 | Maintainability Engineering | Maintainability | `maintainability-engineering.md` |
| 7 | Usability Engineering | Usability | `usability-engineering.md` |
| 8 | Compatibility Engineering | Compatibility | `compatibility-engineering.md` |
| 9 | Observability Engineering | Operability (monitoring) | `observability-engineering.md` |
| 10 | Disaster Recovery | Reliability (recoverability) | `disaster-recovery.md` |
| 11 | Portability Engineering | Portability | `portability-engineering.md` |
| 12 | Compliance & Privacy | Security (compliance) | `compliance-privacy.md` |
| 13 | Operability Engineering | Operability | `operability-engineering.md` |
| 14 | Accessibility Engineering | Usability (accessibility) | `accessibility-engineering.md` |
| 15 | Cost Efficiency Engineering | Performance Efficiency (resource utilization) | `cost-efficiency.md` |
| 16 | AI System Quality | (Extension beyond ISO/IEC 25010) | `ai-system-quality.md` |

## Domain Applicability

Not every domain applies to every system. Use the following guidance:

| System Type | Typically Applicable | Typically Excluded |
|-------------|---------------------|--------------------|
| Simple frontend | Performance, Usability, Compatibility, Accessibility, Maintainability, Observability | Scalability, DR (if stateless), AI Quality |
| REST API | Performance, Scalability, Availability, Reliability, Security, Observability, Operability, Compatibility | Accessibility (if no UI), AI Quality |
| Microservices | All except possibly Accessibility, AI Quality | Accessibility (if no UI), AI Quality |
| Financial system | All domains at T1 depth | AI Quality (if no AI) |
| RAG application | All domains including AI Quality | (none typically excluded) |
| Agentic AI | All domains including AI Quality | (none typically excluded) |

Exclusion always requires a documented justification. The Evidence Validation
agent verifies that exclusions are justified.

## Domain Weights

Default weights (configurable via scoring policy):

| Domain | Default Weight |
|--------|---------------|
| Security | 15 |
| Reliability & Resilience | 12 |
| Availability | 10 |
| Performance | 10 |
| Scalability | 8 |
| Observability | 8 |
| Disaster Recovery | 8 |
| Operability | 6 |
| Compliance & Privacy | 8 |
| Maintainability | 5 |
| Usability | 3 |
| Compatibility | 3 |
| Portability | 3 |
| Accessibility | 3 |
| Cost Efficiency | 3 |
| AI System Quality | 5 (0 if no AI components) |

These are defaults. Always adjust based on business context and criticality.
