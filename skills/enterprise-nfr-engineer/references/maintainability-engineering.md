# Maintainability Engineering

## Objective

Assess maintainability across complexity, coupling, cohesion, modularity,
technical debt, duplication, testability, and dependency management.

## Assessment Areas

### Complexity
- Cyclomatic complexity per function (flag > 15 for review)
- Cognitive complexity (how hard is it to understand?)
- File length (flag files > 500 lines for review)
- Function length (flag functions > 50 lines for review)

### Coupling & Cohesion
- Afferent and efferent coupling (see `architecture-assessment.md`)
- Circular dependencies between modules
- Single responsibility adherence per module

### Technical Debt
- TODO/FIXME/HACK markers: count and age
- Duplicated code blocks (DRY violations)
- Dead code and commented-out code
- Outdated or unused dependencies
- Missing or outdated documentation for public APIs

### Testability
- Can units be tested in isolation (dependency injection, mocking)?
- Are side effects isolated and injectable?
- Is there a clear separation of pure logic and I/O?
- Are test fixtures manageable and maintainable?

### Dependency Management
- Are dependencies pinned?
- Are there deprecated or unmaintained dependencies?
- Are there dependencies with known vulnerabilities?
- Is the dependency count reasonable for the project scope?

## Measurable Criteria Examples

- "Cyclomatic complexity per function <= 15"
- "No circular dependencies between modules (verified by dependency analysis)"
- "Code duplication ratio < 3% (verified by duplication detection)"
- "All public APIs have documentation"
- "No TODO/FIXME markers older than 90 days"

## Assessment Questions

1. How long does it take a new developer to make a productive change?
2. What is the biggest maintainability risk and what would it take to address it?
3. Are there modules that everyone is afraid to touch?
4. Is the test suite reliable (not flaky) and fast enough to run frequently?

## Standards Reference

ISO/IEC 25010:2023 — Maintainability characteristic (modularity, reusability,
analyzability, modifiability, testability). Used as guidance only.
