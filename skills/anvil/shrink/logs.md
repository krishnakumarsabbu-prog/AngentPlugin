---
name: anvil-shrink-logs
description: Log stream and server output compression rules. Strips ANSI escapes, folds repeated lines, and elides uninformative debug noise.
---

# Anvil Shrink: Logs Compression Pattern

Log streams typically contain 80-95% repetitive boilerplate, heartbeats, and non-actionable info lines. Anvil Shrink isolates critical signals while folding repetitive or nominal lines into deterministic elision markers.

---

## Signal Extraction Rules

### 1. Important Line Regex
A log line is retained if it matches the signal regex:
```regex
(?i)(\b(ERROR|FATAL|PANIC|EXCEPTION|TRACEBACK|FAIL|FAILED|FAILURE|WARN|WARNING|CRIT|CRITICAL|ALERT|EMERG|EMERGENCY)\b|^\s+at\s|^\s+File "|\.go:\d+|^\s+--->|caused by)
```

### 2. ANSI Escape Strip
All terminal control sequences, color codes, and cursor movements are stripped completely:
```regex
\x1b\[[0-9;?]*[ -/]*[@-~]|\x1b\][^\x07\x1b]*(?:\x07|\x1b\\)|\x1b[@-Z\x5c-_]
```

### 3. Timestamp & PID Normalization
Where high-frequency ISO timestamps or PIDs inflate token length without adding diagnostic value, replace with normalized tokens:
- `2026-10-21T13:45:12.891234Z [pid: 48921]` -> `[13:45:12]`

### 4. Idempotent Elision Markers
Consecutive non-signal lines (healthy 200 OKs, trace heartbeats) are collapsed into a canonical marker:
```text
… N lines elided (anvil) …
```
If an elision marker is already present, it is preserved across repeated compression passes.

---

## Example Transformation

### Before (Raw Log):
```text
2026-10-21 12:00:01.102 [info] [worker-1] Heartbeat acknowledged status=OK
2026-10-21 12:00:02.103 [info] [worker-1] Heartbeat acknowledged status=OK
2026-10-21 12:00:03.104 [info] [worker-1] Heartbeat acknowledged status=OK
2026-10-21 12:00:04.105 [info] [worker-2] GET /api/v1/health -> 200 OK (1.2ms)
2026-10-21 12:00:05.106 [error] [worker-2] Connection pool timeout after 5000ms: max connections (50) exhausted
2026-10-21 12:00:06.107 [info] [worker-1] Heartbeat acknowledged status=OK
2026-10-21 12:00:07.108 [info] [worker-1] Heartbeat acknowledged status=OK
```

### After (Anvil Shrink):
```text
… 4 lines elided (anvil) …
2026-10-21 12:00:05.106 [error] [worker-2] Connection pool timeout after 5000ms: max connections (50) exhausted
… 2 lines elided (anvil) …
```
Token reduction: ~70%.
