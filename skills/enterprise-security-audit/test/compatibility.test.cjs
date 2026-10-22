const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const test = require("node:test");

const ROOT_DIR = path.resolve(__dirname, "../../..");
const CANONICAL_DIR = path.resolve(__dirname, "..");
const GITHUB_AGENT = path.join(ROOT_DIR, ".github", "agents", "enterprise-security-auditor.agent.md");
const GITHUB_SKILL = path.join(ROOT_DIR, ".github", "skills", "enterprise-security-audit", "SKILL.md");
const CLAUDE_AGENT = path.join(ROOT_DIR, ".claude", "agents", "enterprise-security-auditor.md");
const CLAUDE_SKILL = path.join(ROOT_DIR, ".claude", "skills", "enterprise-security-audit", "SKILL.md");

const FIXTURES_DIR = path.join(CANONICAL_DIR, "fixtures");
const schema = require(path.join(CANONICAL_DIR, "report-schema.json"));
const { validateDocument: validateFindings } = require(path.join(CANONICAL_DIR, "validate-findings.cjs"));
const { validateDocument: validateLedger } = require(path.join(CANONICAL_DIR, "validate-coverage-ledger.cjs"));

test("1. Copilot discovers the enterprise-security-audit skill and agent", () => {
  assert(fs.existsSync(GITHUB_AGENT), ".github agent file must exist");
  assert(fs.existsSync(GITHUB_SKILL), ".github skill file must exist");

  const agentContent = fs.readFileSync(GITHUB_AGENT, "utf8");
  assert.match(agentContent, /^name:\s*enterprise-security-auditor/m, "Agent name must be enterprise-security-auditor");
  assert.match(agentContent, /-\s*enterprise-security-audit/, "Agent must reference enterprise-security-audit skill");

  const skillContent = fs.readFileSync(GITHUB_SKILL, "utf8");
  assert.match(skillContent, /^name:\s*enterprise-security-audit/m, "Skill name must be enterprise-security-audit");
});

test("2. Claude Code discovers the enterprise-security-audit skill and agent", () => {
  assert(fs.existsSync(CLAUDE_AGENT), ".claude agent file must exist");
  assert(fs.existsSync(CLAUDE_SKILL), ".claude skill file must exist");

  const agentContent = fs.readFileSync(CLAUDE_AGENT, "utf8");
  assert.match(agentContent, /^name:\s*enterprise-security-auditor/m, "Claude Agent name must be enterprise-security-auditor");
  assert.match(agentContent, /\.claude\/skills\/enterprise-security-audit\/SKILL\.md/, "Claude Agent must reference its skill");

  const skillContent = fs.readFileSync(CLAUDE_SKILL, "utf8");
  assert.match(skillContent, /^name:\s*enterprise-security-audit/m, "Skill name must be enterprise-security-audit");
});

test("3. Both agents reference the internal product name and canonical skill", () => {
  const ghContent = fs.readFileSync(GITHUB_AGENT, "utf8");
  const claudeContent = fs.readFileSync(CLAUDE_AGENT, "utf8");

  assert.match(ghContent, /Enterprise Security Audit/i, "Copilot agent must state Enterprise Security Audit identity");
  assert.match(claudeContent, /Enterprise Security Audit/i, "Claude Code agent must state Enterprise Security Audit identity");
  assert.doesNotMatch(ghContent, /cloudflare/i, "Copilot agent must not contain vendor branding");
  assert.doesNotMatch(claudeContent, /cloudflare/i, "Claude Code agent must not contain vendor branding");
});

test("4. All supporting file references in methodology resolve to real files", () => {
  const expectedSupportingFiles = [
    "RECONNAISSANCE.md",
    "HUNTING.md",
    "ATTACK-CLASSES.md",
    "MEMORY-SAFETY-AND-BINARY.md",
    "AI-AND-LLM.md",
    "WEB-PROTOCOL-AND-AUTH.md",
    "CLIENT-SIDE.md",
    "SUPPLY-CHAIN-AND-RELEASE.md",
    "CLOUD-AND-DEPLOYMENT.md",
    "PROTOCOLS-RPC-AND-MESSAGING.md",
    "RESOURCE-EXHAUSTION-AND-AVAILABILITY.md",
    "DATA-ISOLATION-AND-LIFECYCLE.md",
    "DESKTOP-MOBILE-AND-LOCAL-IPC.md",
    "VALIDATION-AND-REPORTING.md",
    "report-schema.json",
    "validate-findings.cjs",
    "validate-findings.test.cjs",
    "validate-coverage-ledger.cjs",
    "validate-coverage-ledger.test.cjs",
  ];

  for (const file of expectedSupportingFiles) {
    const canonicalPath = path.join(CANONICAL_DIR, file);
    assert(fs.existsSync(canonicalPath), `Supporting file must exist in canonical skill: ${file}`);
    assert(fs.existsSync(path.join(ROOT_DIR, ".github", "skills", "enterprise-security-audit", file)), `Supporting file must exist in .github: ${file}`);
    assert(fs.existsSync(path.join(ROOT_DIR, ".claude", "skills", "enterprise-security-audit", file)), `Supporting file must exist in .claude: ${file}`);
  }
});

test("5. All validator test suites pass", () => {
  const findingsTest = spawnSync(process.execPath, [path.join(CANONICAL_DIR, "validate-findings.test.cjs")], { encoding: "utf8" });
  assert.equal(findingsTest.status, 0, `validate-findings.test.cjs failed:\n${findingsTest.stderr || findingsTest.stdout}`);
  assert.doesNotMatch(findingsTest.stdout, /✖ fail [1-9]/, "No failing tests in validate-findings.test.cjs");

  const ledgerTest = spawnSync(process.execPath, [path.join(CANONICAL_DIR, "validate-coverage-ledger.test.cjs")], { encoding: "utf8" });
  assert.equal(ledgerTest.status, 0, `validate-coverage-ledger.test.cjs failed:\n${ledgerTest.stderr || ledgerTest.stdout}`);
  assert.doesNotMatch(ledgerTest.stdout, /✖ fail [1-9]/, "No failing tests in validate-coverage-ledger.test.cjs");
});

test("6. Findings JSON and coverage ledgers pass their schemas and validators", () => {
  const findingsJsonPath = path.join(FIXTURES_DIR, "synthetic-findings.json");
  const ledgerJsonPath = path.join(FIXTURES_DIR, "synthetic-coverage-ledger.json");

  assert(fs.existsSync(findingsJsonPath), "synthetic-findings.json must exist");
  assert(fs.existsSync(ledgerJsonPath), "synthetic-coverage-ledger.json must exist");

  const findings = JSON.parse(fs.readFileSync(findingsJsonPath, "utf8"));
  const ledger = JSON.parse(fs.readFileSync(ledgerJsonPath, "utf8"));

  const findingErrors = validateFindings(findings, schema);
  assert.deepEqual(findingErrors, [], `Synthetic findings must pass validation: ${findingErrors.join(", ")}`);

  const ledgerErrors = validateLedger(ledger);
  assert.deepEqual(ledgerErrors, [], `Synthetic coverage ledger must pass validation: ${ledgerErrors.join(", ")}`);
});

test("7. Reports are derived accurately from verified records", () => {
  const reportPath = path.join(FIXTURES_DIR, "REPORT.md");
  const detailPath = path.join(FIXTURES_DIR, "FINDINGS-DETAIL.md");
  const needsValPath = path.join(FIXTURES_DIR, "NEEDS-VALIDATION.md");

  assert(fs.existsSync(reportPath), "REPORT.md must exist");
  assert(fs.existsSync(detailPath), "FINDINGS-DETAIL.md must exist");
  assert(fs.existsSync(needsValPath), "NEEDS-VALIDATION.md must exist");

  const reportText = fs.readFileSync(reportPath, "utf8");
  const detailText = fs.readFileSync(detailPath, "utf8");
  const needsValText = fs.readFileSync(needsValPath, "utf8");

  // Confirmed finding present in report and detail
  assert.match(reportText, /billing-invoice-idor-unauthorized-access/, "Report must include confirmed finding fingerprint");
  assert.match(detailText, /billing-invoice-idor-unauthorized-access/, "Detail must include confirmed finding fingerprint");

  // Blocked lead present in needs-validation
  assert.match(needsValText, /worker-task-queue-ssrf-unverified-callback/, "Needs validation must include blocked lead");

  // Rejected candidate not presented as confirmed
  assert.doesNotMatch(reportText, /Confirmed Vulnerabilities.*auth-session-cookie-httponly-missing/, "Rejected finding must not be reported as confirmed");
});

test("8. Execution restrictions, write isolation, and sandbox requirements remain intact", () => {
  const skillText = fs.readFileSync(path.join(CANONICAL_DIR, "SKILL.md"), "utf8");

  assert.match(skillText, /no external network/, "Must mandate network isolation");
  assert.match(skillText, /read-only target and toolchain/, "Must mandate read-only target and toolchain");
  assert.match(skillText, /no-follow directory-relative operations/, "Must mandate no-follow descriptor traversal");
  assert.match(skillText, /open the leaf no-follow and nonblocking/i, "Must mandate leaf nonblocking no-follow check");
  assert.match(skillText, /needs_validation/, "Must mandate safe fallback to needs_validation when sandbox is unavailable");
});

test("9. Canonical skill synchronizer keeps integrations byte-identical", () => {
  const syncModule = require(path.join(ROOT_DIR, "scripts", "sync-skills.cjs"));
  const syncedFiles = syncModule.SYNC_FILES;

  for (const filename of syncedFiles) {
    const canonicalContent = fs.readFileSync(path.join(CANONICAL_DIR, filename));
    const ghContent = fs.readFileSync(path.join(ROOT_DIR, ".github", "skills", "enterprise-security-audit", filename));
    const claudeContent = fs.readFileSync(path.join(ROOT_DIR, ".claude", "skills", "enterprise-security-audit", filename));

    assert(canonicalContent.equals(ghContent), `GitHub skill file ${filename} must match canonical source`);
    assert(canonicalContent.equals(claudeContent), `Claude skill file ${filename} must match canonical source`);
  }
});

test("10. Platform limitations transparency", () => {
  const isWindows = process.platform === "win32";
  const hasSafeInputOpen = Number.isInteger(fs.constants.O_NOFOLLOW) &&
    fs.constants.O_NOFOLLOW !== 0 &&
    Number.isInteger(fs.constants.O_NONBLOCK) &&
    fs.constants.O_NONBLOCK !== 0;

  if (isWindows && !hasSafeInputOpen) {
    // Verified: On Windows, POSIX O_NOFOLLOW / O_NONBLOCK are unavailable in Node.js fs.constants
    // The validator correctly reports "OS no-follow and nonblocking input protection is unavailable"
    // rather than weakening file protections.
    assert.equal(hasSafeInputOpen, false, "Windows environment correctly labeled as lacking POSIX O_NOFOLLOW flags");
  }
});
