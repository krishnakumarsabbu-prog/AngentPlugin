# /ponytail-audit

Examines the entire repository for structural problems: unnecessary abstractions, duplication, risky logic, unused code, and maintainability issues.

## Invocation

```
/ponytail-audit                    # Audit the entire repository
/ponytail-audit <path>             # Audit a specific directory
/ponytail-audit --focus <dimension> # Audit only one dimension (abstractions, duplication, risky-logic, unused-code, maintainability)
```

## Process

1. Map the repository structure: identify languages, frameworks, entry points, modules.

2. For each audit dimension (see `references/audit-methodology.md`):
   - Scan for the patterns described in the methodology.
   - Collect findings with file, line, description, and recommendation.

3. Verify findings:
   - For "unused code" claims, run a usage search and state the method used.
   - Distinguish "confirmed unused" from "possibly unused — verify dynamic usage".

4. Prioritize findings by impact:
   - High: risky logic, security-relevant dead code, circular dependencies.
   - Medium: duplication, god classes, missing tests.
   - Low: style inconsistencies, minor naming issues.

5. Output the audit report (see format in `references/audit-methodology.md`).

## Rules

- Never claim code is unused without a usage search. State the search method.
- Cite file and line for every finding.
- Provide a recommended action for every finding.
- Do not recommend deleting code without checking for external consumers.
- Distinguish confirmed findings from suspected ones.
- Keep the report actionable: every finding should have a next step.
