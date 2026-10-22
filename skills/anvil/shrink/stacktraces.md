---
name: anvil-shrink-stacktraces
description: Exception and stack trace compression. Retains root cause, leaf error, and top 3 project frames while folding node/framework internals.
---

# Anvil Shrink: Stack Trace Compression Pattern

Standard stack traces from Node.js, Python, Java, and Go frequently span 30-100 lines, where 90% consists of framework internals (`node:internal/*`, `express/lib/*`, `site-packages/*`) that add no diagnostic information for debugging application logic.

---

## Reduction Heuristics

### 1. Root & Leaf Preservation
Always retain:
- The top-level error name, code, and error message.
- The leaf causal exception (e.g. `Caused by: ...`).
- The exact file location where the unhandled exception was raised.

### 2. Application Frame Filtering
Identify project frames versus vendor/runtime internal frames:
- **Internal / Vendor patterns to fold**:
  - `node:internal/`
  - `node_modules/`
  - `site-packages/`
  - `vendor/bundle/`
  - `/usr/local/go/src/`
- **Project frames to retain**:
  - Top 3 application/workspace frames nearest to the error origin.
  - The entrypoint frame if distinct.

### 3. Elision Marker
Collapse consecutive internal framework lines into:
```text
    … N internal frames elided (anvil) …
```

---

## Example Transformation

### Before (Raw Stack Trace):
```text
TypeError: Cannot read properties of undefined (reading 'tokenCount')
    at calculateBudget (/app/src/billing/calculator.ts:42:18)
    at processTransaction (/app/src/billing/service.ts:112:5)
    at Layer.handle [as handle_request] (/app/node_modules/express/lib/router/layer.js:95:5)
    at trim_prefix (/app/node_modules/express/lib/router/index.js:328:13)
    at /app/node_modules/express/lib/router/index.js:286:9
    at Function.process_params (/app/node_modules/express/lib/router/index.js:346:12)
    at next (/app/node_modules/express/lib/router/index.js:280:10)
    at /app/node_modules/body-parser/lib/read.js:137:5
    at invokeCallback (/app/node_modules/raw-body/index.js:238:16)
    at done (/app/node_modules/raw-body/index.js:227:7)
    at IncomingMessage.onEnd (/app/node_modules/raw-body/index.js:287:7)
    at IncomingMessage.emit (node:events:517:28)
    at endReadableNT (node:internal/streams/readable:1400:12)
    at process.processTicksAndRejections (node:internal/process/task_queues:89:21)
```

### After (Anvil Shrink):
```text
TypeError: Cannot read properties of undefined (reading 'tokenCount')
    at calculateBudget (/app/src/billing/calculator.ts:42:18)
    at processTransaction (/app/src/billing/service.ts:112:5)
    … 12 internal frames elided (anvil) …
```
Token reduction: ~78%.
