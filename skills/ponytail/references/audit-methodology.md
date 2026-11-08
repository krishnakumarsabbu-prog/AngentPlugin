# Ponytail Audit Methodology

The audit mode examines the entire repository (not just the diff) for structural problems and produces an actionable audit report.

## Audit Scope

Unlike review (which focuses on the current diff), audit covers the whole codebase. It is typically run:
- Before a major refactoring effort.
- As part of a technical debt assessment.
- Before onboarding a new team member.
- Periodically as codebase health check.

## Audit Dimensions

### 1. Unnecessary Abstractions

Look for:
- **Interfaces with one implementation**: If only one class implements an interface, the interface may be premature. Check if a second implementation is planned.
- **Abstract base classes with one subclass**: Same as above.
- **Factories producing one product**: A factory that only ever creates one type of object.
- **Generic functions used with one type**: A generic that is always called with the same type parameter.
- **Wrapper layers that add no behavior**: A function that just calls another function with no additional logic.
- **Configuration systems for a single value**: A config framework when only one setting exists.

For each finding: name the abstraction, its file, and whether a second consumer is realistic.

### 2. Code Duplication

Look for:
- **Copy-paste blocks**: 5+ identical or near-identical lines in multiple locations.
- **Parallel logic**: Same algorithm implemented in multiple places with minor variations.
- **Duplicate validation**: Same input validation logic repeated across handlers.
- **Duplicate error mapping**: Same error-to-response mapping in multiple controllers.

For each finding: identify the duplicated blocks, their locations, and suggest a shared utility or function.

### 3. Risky Logic

Look for:
- **Unsafe casts**: `as any`, `unsafe`, `int(...)`, type assertions that bypass the type system.
- **Unchecked null/undefined**: Accessing properties on potentially-null values without guards.
- **Race conditions**: Shared mutable state accessed from multiple threads/goroutines/async paths.
- **Silent error swallowing**: `catch {}` or `catch (e) {}` with no logging or re-throw.
- **Mutable global state**: Module-level variables that are modified at runtime.
- **Dangerous eval**: `eval`, `exec`, `Function()`, `new Function()` with user input.

For each finding: describe the risk, the file and line, and the recommended safe pattern.

### 4. Unused Code

Look for:
- **Dead exports**: Functions/classes exported but never imported anywhere.
- **Unreachable branches**: `if (false)`, code after `return`, `switch` cases that never match.
- **Commented-out code**: Blocks of code commented out but not deleted.
- **Unused imports**: Import statements for symbols not referenced.
- **Unused dependencies**: Packages in the manifest that are never imported.
- **Unused private methods**: Private methods never called within the class.

For each finding: verify with a usage search (static + dynamic). Mark as "confirmed unused" or "possibly unused — verify dynamic usage".

### 5. Maintainability Problems

Look for:
- **Circular dependencies**: Module A imports B, B imports C, C imports A.
- **God classes/files**: Files with 500+ lines or classes with 20+ methods.
- **Deep nesting**: Functions with 4+ levels of nesting.
- **Long parameter lists**: Functions with 6+ parameters.
- **Inconsistent naming**: Same concept named differently across the codebase.
- **Missing error context**: Errors thrown without enough context to diagnose.

For each finding: describe the problem, its location, and suggest a refactoring approach.

## Audit Report Format

```
# Ponytail Repository Audit Report

## Summary
- Repository: <name>
- Audit date: <date>
- Total findings: X
  - Unnecessary abstractions: N
  - Code duplication: N
  - Risky logic: N
  - Unused code: N
  - Maintainability: N

## Findings by Priority

### High Priority
1. [Risky Logic] Unchecked null in auth middleware (src/middleware/auth.ts:28)
   ...

### Medium Priority
...

### Low Priority
...

## Recommended Actions
1. ...
2. ...
3. ...
```

## Honesty Rules

- Never claim code is unused without a usage search. State the search method used.
- Never claim a dependency is unused without checking for dynamic imports, reflection, or config-file usage.
- Distinguish "confirmed unused" from "possibly unused — needs verification".
- Do not recommend deleting code without checking for external consumers (published APIs, other repos).
- Cite file and line for every finding.
