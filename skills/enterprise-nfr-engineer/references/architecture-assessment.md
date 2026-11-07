# Architecture Assessment

## Objective

Evaluate the software architecture for modularity, coupling, cohesion,
separation of concerns, dependency management, and structural risks.

## Assessment Areas

### Modularity & Separation of Concerns
- Are business logic, presentation, and persistence separated?
- Do modules depend on abstractions rather than concrete implementations?
- Are domain boundaries clear and consistent with bounded contexts?
- Is there brittle monkey-patching or rigid coupling?

### Coupling & Cohesion
- Afferent coupling (Ca): how many modules depend on this one?
- Efferent coupling (Ce): how many modules does this one depend on?
- High Ca + high Ce = fragile hub; flag for review.
- Cohesion: does each module have a single, clear responsibility?

### Dependency Management
- Are dependencies pinned to specific versions?
- Are there unused dependencies?
- Are there circular dependencies between modules?
- Is dependency injection used where appropriate?

### Technical Debt
- Is there duplicated logic that should be extracted?
- Are there TODO/FIXME/HACK markers indicating deferred work?
- Is there dead code or commented-out code?
- Are there overly complex functions (high cyclomatic complexity)?

### Deployment Topology
- Is the deployment topology documented?
- Are components independently deployable (if microservices)?
- Is there a clear mapping from code components to deployable units?
- Are infrastructure configs version-controlled (IaC)?

## Assessment Questions

1. Can you describe the architecture in one paragraph? If not, it may be unclear.
2. What are the bounded contexts and how do they communicate?
3. Where is the system tightly coupled, and what would break if that coupling changed?
4. What is the biggest technical debt item and what is its business impact?
5. Can a single service be deployed without deploying others?

## Evidence Requirements

- File paths for coupling and complexity findings.
- Architecture diagram references (if available).
- Dependency graph references.
- Deployment config references.

## Remediation Guidance

- Extract shared logic into well-defined modules.
- Introduce interfaces to invert dependencies.
- Remove dead code and unused dependencies.
- Document the deployment topology.
- Reduce cyclomatic complexity by decomposing large functions.

## Standards Reference

ISO/IEC 25010:2023 — Maintainability characteristic (modularity, reusability,
analyzability, modifiability, testability). Used as guidance only.
