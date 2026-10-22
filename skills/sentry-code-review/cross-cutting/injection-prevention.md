---
name: sentry-cross-cutting-injection
description: Deep-dive review guide on preventing SQL, OS command, template, and code injection vulnerabilities.
---

# Sentry Cross-Cutting: Injection Vulnerability Prevention

Injection vulnerabilities allow attackers to break out of data context and execute unauthorized commands within an interpreter.

---

## Language-Agnostic Prevention Invariants

### 1. Structural Separation of Code and Data
- Never construct query strings or commands by string concatenation of untrusted variables.
- Pass parameters separately through native driver protocols:
  - SQL: Parameter placeholders (`?`, `$1`, `:param`)
  - OS Commands: Argument vectors (`["-la", targetPath]`) without shell interpolation.

### 2. Context-Aware Output Escaping
- Context determines escaping requirements: HTML body, HTML attribute, JavaScript context, and CSS context require distinct escaping tables.
- Use established sanitization libraries (`DOMPurify`, `validator.js`, `Bleach`) rather than ad-hoc regex replacements.
