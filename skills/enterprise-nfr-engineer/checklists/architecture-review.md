# Architecture Review Checklist

## Modularity & Separation of Concerns

- [ ] Business logic separated from presentation and persistence
- [ ] Modules depend on abstractions, not concrete implementations
- [ ] Domain boundaries clear and consistent with bounded contexts
- [ ] No brittle monkey-patching or rigid coupling

## Coupling & Cohesion

- [ ] No circular dependencies between modules
- [ ] High-cohesion, low-coupling principle followed
- [ ] Each module has a single, clear responsibility

## Dependency Management

- [ ] Dependencies pinned to specific versions
- [ ] No unused dependencies
- [ ] Lockfiles committed
- [ ] No deprecated or unmaintained dependencies

## Technical Debt

- [ ] No significant code duplication
- [ ] TODO/FIXME/HACK markers tracked and aged
- [ ] No dead code or commented-out code
- [ ] Cyclomatic complexity within acceptable bounds

## Deployment Topology

- [ ] Deployment topology documented
- [ ] Components independently deployable (if microservices)
- [ ] Infrastructure defined as code (IaC)
- [ ] Clear mapping from code components to deployable units
