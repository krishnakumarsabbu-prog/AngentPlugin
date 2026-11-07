# Enterprise NFR Engineer — Specialized Tools Suite

This directory contains standalone, production-ready, zero-dependency tools engineered to bridge the gaps identified in standard non-functional requirement audits.

## Zero-Dependency Guarantee
Every tool in this directory runs using **only standard runtime libraries**:
- **Python**: Uses Python 3.8+ built-in modules (`json`, `os`, `sys`, `re`, `datetime`). Zero `pip install` required.
- **Node.js**: Uses Node.js v16+ built-in modules (`fs`, `path`, `child_process`). Zero `npm install` required.

Safe for **air-gapped, isolated, and highly restricted enterprise environments**.

---

## Tool Catalog

### 1. `i18n_validator.py`
**Domain:** Internationalization & Localization (i18n / L10n)
- **Scans for:**
  - Hardcoded UI string literals in markup/templates (`<h1>...</h1>`, `<button>...</button>`) without translation tokens (`t()`, `formatMessage`).
  - Missing localization keys across translation dictionaries (`en.json` vs `es.json`, `fr.json`, etc.).
  - Right-to-Left (RTL) layout hazards (hardcoded `margin-left`, `float: left` vs CSS logical properties `margin-inline-start`).
  - Locale-sensitive currency, number, and date formatting concatenations.
- **Usage:**
  ```bash
  python tools/i18n_validator.py [target_path] [--json]
  ```

### 2. `restricted_org_auditor.py`
**Domain:** Restricted Org & Air-Gapped Compliance
- **Scans for:**
  - Hardcoded public CDN URLs (`jsdelivr`, `unpkg`, `cdnjs`, `fonts.googleapis.com`, `tailwindcss`).
  - Outbound telemetry and analytics beacons (`google-analytics.com`, `mixpanel.com`, `segment.io`, `sentry.io`).
  - Hardcoded non-RFC1918 public IP addresses.
  - Missing deterministic lockfiles (`package-lock.json`, `yarn.lock`, `pnpm-lock.yaml`).
  - Unverified remote script pipes (`curl | sh`).
- **Usage:**
  ```bash
  python tools/restricted_org_auditor.py [target_path] [--json]
  ```

### 3. `static_concurrency_profiler.py`
**Domain:** Concurrency, Capacity & Event-Loop Safety
- **Scans for:**
  - Event loop blocking synchronous I/O calls (`readFileSync`, `writeFileSync`, `execSync`, `time.sleep`) in request handling paths.
  - Unbounded data queries (`SELECT *` without `LIMIT`, missing pagination).
  - Presence of database connection pool declarations (`maxPoolSize`, `connectionLimit`).
  - Presence of ingress rate-limiting middleware (`express-rate-limit`, `bucket`, `throttle`).
- **Usage:**
  ```bash
  python tools/static_concurrency_profiler.py [target_path] [--json]
  ```

### 4. `data_immutability_checker.py`
**Domain:** Data Immutability, WORM & Audit Integrity
- **Scans for:**
  - Deletion or mutation paths on audit log records (`UPDATE`, `DELETE`, `destroy` on audit tables).
  - Cryptographic hash chaining (`sha256`, `prev_hash`, HMAC links between sequential audit events).
  - PII masking and credential redaction prior to log persistence.
- **Usage:**
  ```bash
  python tools/data_immutability_checker.py [target_path] [--json]
  ```

### 5. `run_nfr_tools.py` & `run_nfr_tools.cjs`
**Domain:** Unified Gap Analysis Orchestrator
- Executes all 4 tools in sequence, aggregates domain scores, evaluates critical overrides, and emits a structured NFR gap report.
- **Usage (Python):**
  ```bash
  py -3 tools/run_nfr_tools.py [target_path] [--json]
  ```
- **Usage (Node.js):**
  ```bash
  node tools/run_nfr_tools.cjs [target_path] [--json]
  ```
