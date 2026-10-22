---
name: anvil-shrink-csv
description: Tabular and CSV output compression. Retains header schemas and alert/failure rows while folding repetitive nominal data.
---

# Anvil Shrink: CSV & Tabular Compression

Data tables and CSV reports with hundreds of nominal status rows exhaust token limits without aiding code diagnosis. Anvil CSV Shrink preserves the schema header and isolates anomalous rows.

---

## Tabular Reduction Rules

### 1. Header Preservation
Always preserve:
- The first line (column headers).
- Markdown table alignment rows (e.g. `|---|---|---:|`).

### 2. Row Filtering Regex
Rows are retained if any cell contains an alert or failure indicator:
```regex
(?i)\b(ERROR|FAIL|FAILED|FATAL|PANIC|EXCEPTION|WARNING|SECURITY|DENIED|REJECTED|TIMEOUT|CRITICAL)\b
```

### 3. Nominal Row Elision
Runs of consecutive rows that contain only nominal values (`200`, `OK`, `SUCCESS`, `PASS`) are collapsed into:
```text
… N rows elided (anvil) …
```

---

## Example Transformation

### Before (CSV Dump):
```csv
id,status,endpoint,latency_ms
101,SUCCESS,/api/auth,12
102,SUCCESS,/api/users,15
103,SUCCESS,/api/users,18
104,FAILED,/api/checkout,5002
105,SUCCESS,/api/cart,14
106,SUCCESS,/api/health,2
```

### After (Anvil Shrink):
```csv
id,status,endpoint,latency_ms
… 3 rows elided (anvil) …
104,FAILED,/api/checkout,5002
… 2 rows elided (anvil) …
```
