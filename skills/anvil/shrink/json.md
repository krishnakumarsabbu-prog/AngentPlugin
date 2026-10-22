---
name: anvil-shrink-json
description: Tool catalog, OpenAPI, and JSON payload compression. Drops schema metadata and annotation bloat while preserving parameter selection invariants.
---

# Anvil Shrink: JSON & Tool Schema Compression

MCP tool catalogs, OpenAI function schemas, and large API JSON payloads often consume over 50% of the entire system prompt. Anvil JSON Shrink drops decorative schema metadata while preserving the exact selection and argument validation surface.

---

## Tool Catalog Reduction Rules

### 1. Drop Pure Annotation Metadata
Strip metadata keys that never alter tool selection or execution logic:
- `examples`, `example`
- `title`
- `$schema`, `$comment`
- Decorative markdown headers within parameter descriptions

### 2. Description Truncation (Max 80 Characters)
Truncate long non-constraint descriptions to their lead sentence (capped at 80 characters).
- *Strict Invariant*: **Constraint-bearing sentences are NEVER dropped**.
  Sentences containing constraints (`must`, `required`, `one of`, `regex`, `valid values`, `range`, `default`) are kept in full.

### 3. Preserved Selection Tokens (100% Byte-Exact)
- Tool names and parameter names.
- Parameter types (`string`, `number`, `boolean`, `array`, `object`).
- `required` fields array.
- `enum` values and `default` values.
- `items` schema definitions.

---

## TOON (Token-Oriented Object Notation) Encoding

For uniform JSON arrays of objects (e.g. database rows, user records), convert verbose key-value maps to columnar/tabular TOON:

### Standard JSON:
```json
[
  {"id": "usr_101", "name": "Alice", "role": "admin", "active": true},
  {"id": "usr_102", "name": "Bob", "role": "editor", "active": true},
  {"id": "usr_103", "name": "Charlie", "role": "viewer", "active": false}
]
```

### TOON Encoded:
```text
[id,name,role,active]
usr_101|Alice|admin|true
usr_102|Bob|editor|true
usr_103|Charlie|viewer|false
```
Token reduction: ~55%.
