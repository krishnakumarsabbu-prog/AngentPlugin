#!/usr/bin/env node

/**
 * Generates synthetic fixtures for Enterprise Security Audit:
 * - synthetic-findings.json (confirmed, needs_validation, rejected)
 * - synthetic-coverage-ledger.json (candidate, covered, blocked)
 * - REPORT.md, FINDINGS-DETAIL.md, NEEDS-VALIDATION.md
 */

const fs = require('fs');
const path = require('path');

const schema = require('../skills/enterprise-security-audit/report-schema.json');
const { canonicalCoverageId, validateDocument: validateLedger } = require('../skills/enterprise-security-audit/validate-coverage-ledger.cjs');
const { validateDocument: validateFindings } = require('../skills/enterprise-security-audit/validate-findings.cjs');

const fixturesDir = path.resolve(__dirname, '..', 'skills', 'enterprise-security-audit', 'fixtures');
if (!fs.existsSync(fixturesDir)) {
  fs.mkdirSync(fixturesDir, { recursive: true });
}

// 1. Synthetic Findings (alphabetically sorted by fingerprint)
const syntheticFindings = [
  {
    verdict: "rejected",
    fingerprint: "auth-session-cookie-httponly-missing",
    title: "Session cookie allegedly missing HttpOnly flag in browser storage",
    description: "Inspection confirmed that although HttpOnly is not set in development mode mock configs, production sets SameSite=Strict and HttpOnly in security headers middleware.",
    claimed_root_cause: "Development config omitted HttpOnly, but production reverse proxy enforces Secure and HttpOnly flags on all Set-Cookie headers.",
    trace: [
      { kind: "entrypoint", file: "src/server/auth.ts", line: 42, scope: "issueSessionCookie", description: "Configures session response headers." }
    ],
    evidence: [
      { file: "src/server/middleware/security.ts", line: 18, description: "Production middleware forces HttpOnly and Secure on Set-Cookie." }
    ],
    reason: "Production reverse proxy enforces Secure and HttpOnly flags on all Set-Cookie headers, disproving cross-boundary exploitability."
  },
  {
    verdict: "confirmed",
    fingerprint: "billing-invoice-idor-unauthorized-access",
    title: "Insecure Direct Object Reference in invoice download endpoint",
    description: "Unprivileged authenticated tenants can download invoices belonging to other organizations by manipulating the invoice ID parameter.",
    root_cause: "getInvoiceHandler queries the invoice table solely by ID without joining against the authenticated user organization ID.",
    intended_behavior: "Tenants must only be permitted to query and retrieve invoices associated with their verified organization ID.",
    trace: [
      { kind: "entrypoint", file: "src/api/routes/invoices.ts", line: 45, scope: "getInvoiceHandler", description: "Accepts invoiceId from request params." },
      { kind: "propagation", file: "src/services/invoiceService.ts", line: 88, scope: "fetchInvoiceById", description: "Forwards ID without tenant context." },
      { kind: "sink", file: "src/db/queries/invoices.ts", line: 112, scope: "queryInvoice", description: "Executes SELECT * FROM invoices WHERE id = :id." }
    ],
    evidence: [
      { file: "src/api/routes/invoices.ts", line: 48, description: "Missing requireTenantOwnership validation call." },
      { file: "src/db/queries/invoices.ts", line: 115, description: "Query lacks tenant organization filter." }
    ],
    conditions: [
      {
        kind: "authentication_level",
        description: "Attacker possesses valid credentials for any active tenant account."
      }
    ],
    execution: {
      attacker_perspective: "An authenticated unprivileged tenant user.",
      payloads: [
        "GET /api/v1/invoices/inv_9988234 HTTP/1.1 with Bearer token of Org B"
      ],
      instructions: [
        "Authenticate as Organization B user.",
        "Issue GET request to invoice endpoint passing invoice ID owned by Organization A.",
        "Observe HTTP 200 with full invoice metadata and PDF attachment belonging to Organization A."
      ],
      observed_result: "HTTP 200 returned containing Organization A billing details and line items."
    },
    remediation: {
      strategy: "Enforce organization-scoped query filtering and ownership verification at the API boundary.",
      code_changes: [
        {
          file_name: "src/db/queries/invoices.ts",
          fixed_code: "SELECT * FROM invoices WHERE id = :id AND org_id = :orgId;"
        }
      ]
    },
    severity: {
      likelihood: { score: "high", reason: "Directly accessible via public authenticated API without complex preconditions." },
      impact: { score: "high", reason: "Cross-tenant data disclosure exposing sensitive customer billing records and financial PII." },
      overall_severity: "high"
    },
    confidence: {
      score: "high",
      reason: "Direct source trace from router to query confirmed by independent verification."
    }
  },
  {
    verdict: "needs_validation",
    fingerprint: "worker-task-queue-ssrf-unverified-callback",
    title: "Unvalidated webhook callback URL in background queue worker",
    description: "Background worker processes webhook payloads with user-specified target URLs, potentially allowing requests to cloud metadata services if egress firewall is absent.",
    claimed_root_cause: "dispatchWebhook function executes HTTP POST to customer URL without hostname allowlisting or private IP checks in source code.",
    trace: [
      { kind: "entrypoint", file: "src/workers/webhookDispatcher.ts", line: 34, scope: "processTask", description: "Pulls job containing targetUrl from Redis queue." },
      { kind: "propagation", file: "src/workers/webhookDispatcher.ts", line: 62, scope: "dispatchWebhook", description: "Passes targetUrl to HTTP client." },
      { kind: "sink", file: "src/services/httpClient.ts", line: 20, scope: "post", description: "Initiates HTTP POST request." }
    ],
    evidence: [
      { file: "src/workers/webhookDispatcher.ts", line: 65, description: "Source code contains no DNS pre-resolution or IP range validation." }
    ],
    blockers: [
      "VPC egress firewall configuration and metadata service rules are external to this repository."
    ],
    validation_plan: {
      deployment: "Inspect VPC security group egress rules in the infrastructure repository to verify if 169.254.169.254/32 and RFC1918 traffic is blocked at the hypervisor level."
    }
  }
];

// Validate synthetic findings against schema
const findingsErrors = validateFindings(syntheticFindings, schema);
if (findingsErrors.length > 0) {
  console.error("Findings validation failed:", findingsErrors);
  process.exit(1);
}
console.log("✓ synthetic-findings.json passed schema validation (0 errors)");

fs.writeFileSync(
  path.join(fixturesDir, 'synthetic-findings.json'),
  JSON.stringify(syntheticFindings, null, 2),
  'utf8'
);

// 2. Synthetic Coverage Ledger (lexicographically ordered by canonical coverage_id)
const unitA_refs = {
  surface: "src/api/routes/invoices.ts#GET /invoices/:id",
  boundary: "src/authz.ts#requireTenantOwnership",
  subsystem: "packages/api",
  attack_class: "ATTACK-CLASSES.md#Access control"
};
const unitA_id = canonicalCoverageId(unitA_refs);

const unitB_refs = {
  surface: "src/server/auth.ts#issueSessionCookie",
  boundary: "src/server/middleware/security.ts#setSecurityHeaders",
  subsystem: "packages/server",
  attack_class: "CLIENT-SIDE.md#Cookie and credential handling"
};
const unitB_id = canonicalCoverageId(unitB_refs);

const unitC_refs = {
  surface: "src/workers/webhookDispatcher.ts#dispatchWebhook",
  boundary: "src/services/httpClient.ts#validateEgressTarget",
  subsystem: "packages/workers",
  attack_class: "ATTACK-CLASSES.md#Server-side request forgery"
};
const unitC_id = canonicalCoverageId(unitC_refs);

const rawUnits = [
  {
    coverage_id: unitA_id,
    canonical_refs: unitA_refs,
    surface: "Invoice retrieval route",
    boundary: "Tenant data isolation",
    subsystem: "Billing API",
    attack_class: "Access control",
    starting_paths: ["src/api/routes/invoices.ts", "src/services/invoiceService.ts"],
    ordinary_attack_class_block: "ATTACK-CLASSES.md#Access control",
    selected_companion_blocks: ["DATA-ISOLATION-AND-LIFECYCLE.md#Tenant isolation"],
    excluded_blocks: [],
    prior_status: "new",
    attempts: [],
    wave: 1,
    status: "candidate",
    agent_id: "agent-hunter-01",
    reviewed_paths: ["src/api/routes/invoices.ts", "src/services/invoiceService.ts", "src/db/queries/invoices.ts"],
    local_checks: [
      {
        agent_id: "agent-hunter-01",
        reviewed_paths: ["src/api/routes/invoices.ts", "src/services/invoiceService.ts", "src/db/queries/invoices.ts"],
        invariant: "Tenant authorization check is executed prior to database query.",
        method: "source",
        result: "Confirmed check is omitted from handler.",
        artifact: null
      }
    ],
    result_fingerprints: ["billing-invoice-idor-unauthorized-access"],
    unresolved: []
  },
  {
    coverage_id: unitB_id,
    canonical_refs: unitB_refs,
    surface: "Session cookie generation",
    boundary: "Browser token security",
    subsystem: "Authentication Service",
    attack_class: "Cookie and credential handling",
    starting_paths: ["src/server/auth.ts"],
    ordinary_attack_class_block: "CLIENT-SIDE.md#Cookie and credential handling",
    selected_companion_blocks: [],
    excluded_blocks: [],
    prior_status: "new",
    attempts: [],
    wave: 1,
    status: "covered",
    agent_id: "agent-hunter-02",
    reviewed_paths: ["src/server/auth.ts", "src/server/middleware/security.ts"],
    local_checks: [
      {
        agent_id: "agent-hunter-02",
        reviewed_paths: ["src/server/auth.ts", "src/server/middleware/security.ts"],
        invariant: "HttpOnly and Secure flags must be active in production.",
        method: "source",
        result: "Security middleware injects required flags.",
        artifact: null
      }
    ],
    result_fingerprints: [],
    unresolved: []
  },
  {
    coverage_id: unitC_id,
    canonical_refs: unitC_refs,
    surface: "Webhook queue dispatcher",
    boundary: "Egress destination filter",
    subsystem: "Background Workers",
    attack_class: "Server-side request forgery",
    starting_paths: ["src/workers/webhookDispatcher.ts"],
    ordinary_attack_class_block: "ATTACK-CLASSES.md#Server-side request forgery",
    selected_companion_blocks: ["CLOUD-AND-DEPLOYMENT.md#Egress security"],
    excluded_blocks: [],
    prior_status: "new",
    attempts: [],
    wave: 1,
    status: "blocked",
    agent_id: "agent-hunter-03",
    reviewed_paths: ["src/workers/webhookDispatcher.ts", "src/services/httpClient.ts"],
    local_checks: [
      {
        agent_id: "agent-hunter-03",
        reviewed_paths: ["src/workers/webhookDispatcher.ts", "src/services/httpClient.ts"],
        invariant: "Worker blocks private IP ranges before sending requests.",
        method: "source",
        result: "No in-code IP filtering found; requires deployment firewall audit.",
        artifact: null
      }
    ],
    result_fingerprints: [],
    unresolved: ["VPC egress security rules not found in target repository."]
  }
];

// Sort units lexicographically by coverage_id
const syntheticLedger = rawUnits.sort((a, b) => a.coverage_id.localeCompare(b.coverage_id));

// Validate synthetic ledger
const ledgerErrors = validateLedger(syntheticLedger);
if (ledgerErrors.length > 0) {
  console.error("Coverage ledger validation failed:", ledgerErrors);
  process.exit(1);
}
console.log("✓ synthetic-coverage-ledger.json passed validator (0 errors)");

fs.writeFileSync(
  path.join(fixturesDir, 'synthetic-coverage-ledger.json'),
  JSON.stringify(syntheticLedger, null, 2),
  'utf8'
);

// 3. Synthetic REPORT.md
const reportMd = `# Enterprise Security Audit — Audit Report

## 1. Executive Summary

An Enterprise Security Audit was conducted on the synthetic sample codebase. The evaluation executed all six audit phases: structured reconnaissance, coverage-led hunting, adversarial candidate validation, structured findings extraction, independent record verification, and target-neutral reporting.

| Metric | Result |
|---|---|
| **Audit Profile** | Standard |
| **Audit Status** | Complete |
| **Coverage Units Total** | 3 |
| **Confirmed Vulnerabilities** | 1 |
| **Needs Validation (Blocked Leads)** | 1 |
| **Rejected Candidates** | 1 |

---

## 2. Confirmed Findings Overview

| Fingerprint | Severity | Title | Affected Subsystem |
|---|---|---|---|
| \`billing-invoice-idor-unauthorized-access\` | **High** | Insecure Direct Object Reference in invoice download endpoint | Billing API (\`packages/api\`) |

---

## 3. Coverage Ledger Summary

- **Total Planned Attack Surfaces**: 3
- **Units Fully Covered**: 1 (\`covered\`)
- **Units with Confirmed Candidates**: 1 (\`candidate\`)
- **Units Blocked by Environmental Gaps**: 1 (\`blocked\`)

All structured findings have been strictly validated against \`report-schema.json\` and verified against source-code facts.
`;

fs.writeFileSync(path.join(fixturesDir, 'REPORT.md'), reportMd, 'utf8');

// 4. Synthetic FINDINGS-DETAIL.md
const findingsDetailMd = `# Enterprise Security Audit — Confirmed Findings Detail

## \`billing-invoice-idor-unauthorized-access\` — Insecure Direct Object Reference in invoice download endpoint

- **Overall Severity**: **High**
- **Likelihood**: High (directly reachable via authenticated REST API)
- **Impact**: High (cross-tenant exposure of billing invoices and financial data)
- **Root Cause**: \`getInvoiceHandler\` queries \`invoices\` by ID only, omitting tenant organization ID scoping.

### Trace & Sinks
1. **Entrypoint**: \`src/api/routes/invoices.ts:45\` (\`getInvoiceHandler\`)
2. **Propagation**: \`src/services/invoiceService.ts:88\` (\`fetchInvoiceById\`)
3. **Sink**: \`src/db/queries/invoices.ts:112\` (\`queryInvoice\`)

### Verified Evidence
- \`src/api/routes/invoices.ts:48\`: Missing \`requireTenantOwnership\` validation call.
- \`src/db/queries/invoices.ts:115\`: SQL query lacks \`AND org_id = :orgId\` clause.

### Recommended Invariant & Fix
Ensure that database query criteria explicitly enforce tenant boundaries:
\`\`\`sql
SELECT * FROM invoices WHERE id = :id AND org_id = :current_user_org_id;
\`\`\`
Return HTTP 404 if the record does not match the active organization context.
`;

fs.writeFileSync(path.join(fixturesDir, 'FINDINGS-DETAIL.md'), findingsDetailMd, 'utf8');

// 5. Synthetic NEEDS-VALIDATION.md
const needsValidationMd = `# Enterprise Security Audit — Items Needing Validation

## \`worker-task-queue-ssrf-unverified-callback\` — Unvalidated webhook callback URL in background queue worker

- **Subsystem**: Background Workers (\`packages/workers\`)
- **Attack Class**: Server-Side Request Forgery
- **Status**: \`needs_validation\` (No severity assigned)

### Hypothesis
Worker task dispatcher consumes URLs from job queues and makes HTTP requests without pre-validating whether the resolved IP address is a private, loopback, or cloud metadata address.

### Unresolved Blocker
VPC egress firewall configuration and cloud metadata protection rules are external to this source repository.

### Safe Validation Plan
1. Check cloud infrastructure repository (Terraform/CloudFormation) for egress security group rules on worker subnets.
2. Verify if IMDSv2 with hop-limit 1 or strict metadata endpoint blocking is active on worker host instances.
`;

fs.writeFileSync(path.join(fixturesDir, 'NEEDS-VALIDATION.md'), needsValidationMd, 'utf8');
fs.writeFileSync(path.join(fixturesDir, 'findings.json'), JSON.stringify(syntheticFindings, null, 2), 'utf8');
fs.writeFileSync(path.join(fixturesDir, 'coverage-ledger.json'), JSON.stringify(syntheticLedger, null, 2), 'utf8');

// 6. Synthetic run-metadata.json
const runMetadata = {
  run_id: "run-synthetic-001",
  repo: "sample-target-project",
  target: path.resolve(__dirname, '../skills/enterprise-security-audit/fixtures/mock-repo'),
  commit_sha: "e1f98c84d113edec49eaa6238ad5ff99",
  dirty_worktree: false,
  uncommitted_files: [],
  target_scope: ["src/api", "src/server", "src/workers"],
  languages: ["typescript", "javascript", "sql"],
  mode: "static-audit",
  sandbox_available: false,
  profile: "standard",
  orchestration: "single-agent-sequential",
  independent_verifier: false,
  run_status: "complete",
  incomplete_reason: null,
  scanners_executed: ["eslint-security", "regex-source-hunter"],
  scanners_unavailable: [],
  created_at: "2026-10-20T10:00:00Z",
  completed_at: "2026-10-20T10:15:00Z"
};

fs.writeFileSync(path.join(fixturesDir, 'run-metadata.json'), JSON.stringify(runMetadata, null, 2), 'utf8');

console.log("✓ All synthetic fixtures and markdown reports generated and validated successfully.");
