const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const ROOT_DIR = path.resolve(__dirname, "../../..");
const CANONICAL_DIR = path.resolve(__dirname, "..");
const FIXTURES_DIR = path.join(CANONICAL_DIR, "fixtures");
const MOCK_REPO_DIR = path.join(FIXTURES_DIR, "mock-repo");

const reportSchema = require(path.join(CANONICAL_DIR, "report-schema.json"));
const metadataSchema = require(path.join(CANONICAL_DIR, "metadata-schema.json"));
const { validateDocument: validateFindings } = require(path.join(CANONICAL_DIR, "validate-findings.cjs"));
const { validateDocument: validateLedger, canonicalCoverageId } = require(path.join(CANONICAL_DIR, "validate-coverage-ledger.cjs"));
const {
  validateAuditRun,
  validateMetadata,
  validateSourceLocations,
  validateReportConsistency
} = require(path.join(CANONICAL_DIR, "validate-audit.cjs"));

// Load valid synthetic base fixtures
const baseFindings = JSON.parse(fs.readFileSync(path.join(FIXTURES_DIR, "synthetic-findings.json"), "utf8"));
const baseLedger = JSON.parse(fs.readFileSync(path.join(FIXTURES_DIR, "synthetic-coverage-ledger.json"), "utf8"));
const baseMetadata = JSON.parse(fs.readFileSync(path.join(FIXTURES_DIR, "run-metadata.json"), "utf8"));

test("1. Confirmed vulnerabilities supported by source evidence", () => {
  const confirmedFinding = baseFindings.find(f => f.verdict === "confirmed");
  assert(confirmedFinding, "Confirmed finding fixture must exist");
  assert.equal(confirmedFinding.verdict, "confirmed");
  assert(Array.isArray(confirmedFinding.trace) && confirmedFinding.trace.length >= 2, "Confirmed finding requires multi-step trace");
  assert(confirmedFinding.trace.some(t => t.kind === "entrypoint"), "Trace must have entrypoint");
  assert(confirmedFinding.trace.some(t => t.kind === "sink"), "Trace must have sink");
  assert(confirmedFinding.severity?.overall_severity, "Confirmed finding must have overall_severity");
  assert(confirmedFinding.confidence?.score, "Confirmed finding must have confidence score");

  const errors = validateFindings([confirmedFinding], reportSchema);
  assert.deepEqual(errors, [], "Confirmed finding must pass schema validation");
});

test("2. False-positive candidates rejected by verification", () => {
  const rejectedCandidate = baseFindings.find(f => f.verdict === "rejected");
  assert(rejectedCandidate, "Rejected candidate fixture must exist");
  assert.equal(rejectedCandidate.verdict, "rejected");
  assert(rejectedCandidate.reason, "Rejected candidate must have explicit reason");
  assert.equal(rejectedCandidate.severity, undefined, "Rejected candidate must not have severity");
  assert.equal(rejectedCandidate.remediation, undefined, "Rejected candidate must not have remediation");

  const errors = validateFindings([rejectedCandidate], reportSchema);
  assert.deepEqual(errors, [], "Rejected candidate must pass schema validation");
});

test("3. Unresolved runtime-dependent candidates (needs_validation)", () => {
  const needsVal = baseFindings.find(f => f.verdict === "needs_validation");
  assert(needsVal, "needs_validation candidate fixture must exist");
  assert.equal(needsVal.verdict, "needs_validation");
  assert(Array.isArray(needsVal.blockers) && needsVal.blockers.length > 0, "Must specify blockers");
  assert(needsVal.validation_plan, "Must specify validation_plan");
  assert.equal(needsVal.severity, undefined, "needs_validation must not have severity");

  const errors = validateFindings([needsVal], reportSchema);
  assert.deepEqual(errors, [], "needs_validation candidate must pass schema validation");
});

test("4. Missing scanners are transparently recorded and do not silently pass", () => {
  const metaWithMissingScanner = {
    ...baseMetadata,
    scanners_unavailable: ["trivy-container-scanner", "semgrep-pro-rules"],
    run_status: "incomplete",
    incomplete_reason: "scanners_unavailable: trivy-container-scanner was missing from host environment"
  };

  const errors = validateMetadata(metaWithMissingScanner);
  assert.deepEqual(errors, [], "Metadata with recorded missing scanners must pass schema");
  assert.equal(metaWithMissingScanner.run_status, "incomplete");
  assert.match(metaWithMissingScanner.incomplete_reason, /trivy-container-scanner/);
});

test("5. Unsupported languages are marked unresolved in ledger rather than crashing", () => {
  const unitRefs = {
    surface: "firmware/bootloader.bin#Entry",
    boundary: "hardware/tpm#Verify",
    subsystem: "firmware",
    attack_class: "ATTACK-CLASSES.md#Binary exploitation"
  };
  const unitId = canonicalCoverageId(unitRefs);

  const unsupportedUnit = {
    coverage_id: unitId,
    canonical_refs: unitRefs,
    surface: "Firmware binary entrypoint",
    boundary: "Hardware TPM boundary",
    subsystem: "Firmware",
    attack_class: "Binary exploitation",
    starting_paths: ["firmware/bootloader.bin"],
    ordinary_attack_class_block: "ATTACK-CLASSES.md#Binary exploitation",
    selected_companion_blocks: [],
    excluded_blocks: [],
    prior_status: "new",
    attempts: [],
    wave: 1,
    status: "blocked",
    agent_id: "agent-hunter-bin",
    reviewed_paths: ["firmware/bootloader.bin"],
    local_checks: [
      {
        agent_id: "agent-hunter-bin",
        reviewed_paths: ["firmware/bootloader.bin"],
        invariant: "Binary parser requires disassembler",
        method: "source",
        result: "Static disassembly unavailable on host",
        artifact: null
      }
    ],
    result_fingerprints: [],
    unresolved: ["Unsupported binary architecture on host: ghidra/objdump not available."]
  };

  const errors = validateLedger([unsupportedUnit]);
  assert.deepEqual(errors, [], "Blocked unit for unsupported language must pass ledger validation");
});

test("6. Partial file coverage correctly flags out-of-scope paths", () => {
  const unitRefs = {
    surface: "packages/legacy/old_route.ts#GET /old",
    boundary: "packages/legacy/auth.ts#check",
    subsystem: "packages/legacy",
    attack_class: "ATTACK-CLASSES.md#Access control"
  };
  const unitId = canonicalCoverageId(unitRefs);

  const outOfScopeUnit = {
    coverage_id: unitId,
    canonical_refs: unitRefs,
    surface: "Legacy unreviewed route",
    boundary: "Legacy boundary",
    subsystem: "Legacy module",
    attack_class: "Access control",
    starting_paths: ["packages/legacy/old_route.ts"],
    ordinary_attack_class_block: "ATTACK-CLASSES.md#Access control",
    selected_companion_blocks: [],
    excluded_blocks: [],
    prior_status: "new",
    attempts: [],
    wave: 1,
    status: "out_of_scope",
    agent_id: null,
    reviewed_paths: [],
    local_checks: [],
    result_fingerprints: [],
    unresolved: ["Excluded from scoped run configuration."]
  };

  const errors = validateLedger([outOfScopeUnit]);
  assert.deepEqual(errors, [], "Out of scope unit in partial coverage pass must pass validation");
  assert.notEqual(outOfScopeUnit.status, "covered", "Out of scope unit must never be marked covered");
});

test("7. Malformed scanner output is rejected cleanly without throwing", () => {
  const tmpDir = fs.mkdtempSync(path.join(FIXTURES_DIR, "malformed-test-"));
  try {
    fs.writeFileSync(path.join(tmpDir, "run-metadata.json"), "{ NOT_VALID_JSON", "utf8");
    fs.writeFileSync(path.join(tmpDir, "findings.json"), "12345", "utf8");
    fs.writeFileSync(path.join(tmpDir, "coverage-ledger.json"), '{"not": "array"}', "utf8");

    const result = validateAuditRun(tmpDir);
    assert.equal(result.valid, false);
    assert(result.errors.length > 0, "Must report errors for malformed scanner output");
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test("8. Duplicate findings are detected and rejected", () => {
  const f1 = baseFindings[0];
  const f2 = JSON.parse(JSON.stringify(f1));
  f2.title = "Altered title with duplicate fingerprint";

  const errors = validateFindings([f1, f2], reportSchema);
  assert(errors.some(e => e.includes("duplicate") || e.includes("repeated")), "Must reject duplicate fingerprints");
});

test("9. Invalid source locations (non-existent file or out-of-bounds line) are rejected", () => {
  const badLocationFinding = JSON.parse(JSON.stringify(baseFindings[1])); // confirmed finding
  badLocationFinding.trace[0].file = "src/non_existent_file.ts";
  badLocationFinding.trace[0].line = 99999;

  const errors = validateSourceLocations([badLocationFinding], MOCK_REPO_DIR);
  assert(errors.length > 0, "Must detect non-existent file or out-of-bounds line");
  assert(errors.some(e => e.includes("file does not exist in target workspace")), "Must report file does not exist");
});

test("10. Failed validators prevent run completion", () => {
  const tmpDir = fs.mkdtempSync(path.join(FIXTURES_DIR, "contract-test-"));
  try {
    // Write metadata claiming "complete", but invalid findings
    const invalidFindings = [{ invalid: "data" }];
    fs.writeFileSync(path.join(tmpDir, "run-metadata.json"), JSON.stringify({ ...baseMetadata, run_status: "complete" }), "utf8");
    fs.writeFileSync(path.join(tmpDir, "findings.json"), JSON.stringify(invalidFindings), "utf8");
    fs.writeFileSync(path.join(tmpDir, "coverage-ledger.json"), JSON.stringify(baseLedger), "utf8");
    fs.writeFileSync(path.join(tmpDir, "REPORT.md"), "# Report", "utf8");
    fs.writeFileSync(path.join(tmpDir, "FINDINGS-DETAIL.md"), "# Detail", "utf8");
    fs.writeFileSync(path.join(tmpDir, "NEEDS-VALIDATION.md"), "# Needs", "utf8");

    const report = validateAuditRun(tmpDir);
    assert.equal(report.valid, false, "Audit run must be invalid");
    assert(report.errors.some(e => e.includes("Completion Contract Violation")), "Must enforce completion contract violation");
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test("11. Dirty worktree is explicitly detected and tracked", () => {
  const dirtyMeta = {
    ...baseMetadata,
    dirty_worktree: true,
    uncommitted_files: ["src/api/routes/invoices.ts", "package.json"]
  };

  const errors = validateMetadata(dirtyMeta);
  assert.deepEqual(errors, [], "Dirty worktree metadata must pass schema");

  const invalidDirtyMeta = {
    ...baseMetadata,
    dirty_worktree: true,
    uncommitted_files: [] // empty uncommitted list with dirty=true
  };
  const invalidErrors = validateMetadata(invalidDirtyMeta);
  assert(invalidErrors.some(e => e.includes("dirty_worktree is true but uncommitted_files is empty")), "Must reject empty uncommitted_files when dirty");
});

test("12. Missing sandbox capabilities block execution-validation mode", () => {
  const unsafeMeta = {
    ...baseMetadata,
    mode: "execution-validation",
    sandbox_available: false
  };

  const errors = validateMetadata(unsafeMeta);
  assert(errors.some(e => e.includes("execution safety violation")), "Must reject execution-validation when sandbox is unavailable");
});

test("13. Static audit policy forbids repository-controlled scripts execution", () => {
  const skillText = fs.readFileSync(path.join(CANONICAL_DIR, "SKILL.md"), "utf8");

  assert.match(skillText, /Mode A — Repository-Local Static Audit \(Default\)/, "SKILL.md must define Mode A Static Audit");
  assert.match(skillText, /execute repository-controlled code/i, "SKILL.md must prohibit target-controlled code in Mode A");
  assert.match(skillText, /npm install.*build scripts/i, "SKILL.md must enumerate forbidden script actions");
});

test("14. Target application source files are immutable and read-only", () => {
  const skillText = fs.readFileSync(path.join(CANONICAL_DIR, "SKILL.md"), "utf8");

  assert.match(skillText, /read-only/i, "Must declare analysis strictly read-only");
  assert.match(skillText, /never modifies the target repository/i, "Must enforce target repository immutability");
});

test("15. Prompt-injection content in target files is defended against", () => {
  const skillText = fs.readFileSync(path.join(CANONICAL_DIR, "SKILL.md"), "utf8");

  assert.match(skillText, /Prompt Injection Defense/i, "Must contain prompt injection defense section");
  assert.match(skillText, /untrusted data/i, "Must treat repository files as untrusted data");
  assert.match(skillText, /strictly supersede all target-contained text/i, "Audit directives must supersede target contents");
});

test("16. Inconsistent Markdown and JSON reports are rejected", () => {
  const tmpDir = fs.mkdtempSync(path.join(FIXTURES_DIR, "consistency-test-"));
  try {
    // Report omitting confirmed fingerprint
    fs.writeFileSync(path.join(tmpDir, "REPORT.md"), "# Report with no findings", "utf8");
    fs.writeFileSync(path.join(tmpDir, "FINDINGS-DETAIL.md"), "# Detail", "utf8");
    fs.writeFileSync(path.join(tmpDir, "NEEDS-VALIDATION.md"), "# Needs", "utf8");

    const errors = validateReportConsistency(baseFindings, tmpDir);
    assert(errors.length > 0, "Must flag missing confirmed findings in Markdown report");
    assert(errors.some(e => e.includes("missing confirmed finding fingerprint")), "Must name the missing fingerprint");
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test("17. Copilot and Claude skills are discoverable", () => {
  const ghAgent = path.join(ROOT_DIR, ".github", "agents", "enterprise-security-auditor.agent.md");
  const ghSkill = path.join(ROOT_DIR, ".github", "skills", "enterprise-security-audit", "SKILL.md");
  const claudeAgent = path.join(ROOT_DIR, ".claude", "agents", "enterprise-security-auditor.md");
  const claudeSkill = path.join(ROOT_DIR, ".claude", "skills", "enterprise-security-audit", "SKILL.md");

  assert(fs.existsSync(ghAgent), "Copilot agent must exist");
  assert(fs.existsSync(ghSkill), "Copilot skill must exist");
  assert(fs.existsSync(claudeAgent), "Claude Code agent must exist");
  assert(fs.existsSync(claudeSkill), "Claude Code skill must exist");
});

test("18. Cross-platform schema and report parity across canonical, Copilot, and Claude", () => {
  const syncModule = require(path.join(ROOT_DIR, "scripts", "sync-skills.cjs"));
  for (const filename of syncModule.SYNC_FILES) {
    const canonicalBuf = fs.readFileSync(path.join(CANONICAL_DIR, filename));
    const ghBuf = fs.readFileSync(path.join(ROOT_DIR, ".github", "skills", "enterprise-security-audit", filename));
    const claudeBuf = fs.readFileSync(path.join(ROOT_DIR, ".claude", "skills", "enterprise-security-audit", filename));

    assert(canonicalBuf.equals(ghBuf), `${filename} must be identical between canonical and Copilot`);
    assert(canonicalBuf.equals(claudeBuf), `${filename} must be identical between canonical and Claude`);
  }
});

test("19. Static audit completes without requiring sandbox tools", () => {
  const auditReport = validateAuditRun(FIXTURES_DIR, { target: MOCK_REPO_DIR });
  assert.equal(auditReport.valid, true, "Static audit run on mock-repo must be valid");
  assert.equal(auditReport.completionStatus, "complete", "Static audit run must be complete");
  assert.equal(baseMetadata.mode, "static-audit", "Must use static-audit mode");
  assert.equal(baseMetadata.sandbox_available, false, "Must complete with sandbox_available = false");
});

test("20. Execution-dependent validation is blocked when sandbox is unavailable", () => {
  // Candidate requiring unverified runtime environment stays needs_validation
  const runtimeCandidate = baseFindings.find(f => f.fingerprint === "worker-task-queue-ssrf-unverified-callback");
  assert.equal(runtimeCandidate.verdict, "needs_validation", "Runtime-dependent candidate must stay needs_validation");
  assert(runtimeCandidate.blockers.length > 0, "Must record absent environment blocker");
  assert.equal(runtimeCandidate.severity, undefined, "Unverified runtime candidate must have no severity");
});
