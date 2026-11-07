/**
 * Enterprise NFR Engineer — Tools Suite Unit Tests
 * Verifies that all tools in the `tools/` directory execute properly,
 * output valid JSON, and complete within expected SLAs.
 */

'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const SKILL_DIR = path.resolve(__dirname, '..');
const TOOLS_DIR = path.join(SKILL_DIR, 'tools');

console.log('Running Enterprise NFR Engineer Tools Unit Tests...\n');

// 1. All tool files exist and are non-empty
const EXPECTED_TOOLS = [
  'i18n_validator.py',
  'restricted_org_auditor.py',
  'static_concurrency_profiler.py',
  'data_immutability_checker.py',
  'run_nfr_tools.py',
  'run_nfr_tools.cjs',
  'README.md'
];

for (const tf of EXPECTED_TOOLS) {
  const full = path.join(TOOLS_DIR, tf);
  assert.ok(fs.existsSync(full), `Tool file must exist: ${tf}`);
  assert.ok(fs.statSync(full).size > 100, `Tool file must be non-empty: ${tf}`);
}
console.log(`✓ All ${EXPECTED_TOOLS.length} tool files present and non-empty`);

// Helper to detect Python launcher
function findPythonCmd() {
  for (const cmd of ['py -3', 'python3', 'python']) {
    try {
      execSync(`${cmd} --version`, { stdio: 'ignore' });
      return cmd;
    } catch {
      // try next
    }
  }
  return null;
}
const pyCmd = findPythonCmd();

if (pyCmd) {
  // 2. i18n_validator.py produces valid JSON
  {
    const out = execSync(`${pyCmd} "${path.join(TOOLS_DIR, 'i18n_validator.py')}" "${SKILL_DIR}" --json`, {
      encoding: 'utf8',
      timeout: 15000
    });
    const parsed = JSON.parse(out);
    assert.strictEqual(parsed.tool, 'i18n_validator');
    assert.ok(typeof parsed.i18n_score === 'number');
    assert.ok(['PASS', 'CONDITIONAL_PASS', 'FAIL'].includes(parsed.status));
    console.log(`✓ i18n_validator executed successfully: score=${parsed.i18n_score}`);
  }

  // 3. restricted_org_auditor.py produces valid JSON
  {
    const out = execSync(`${pyCmd} "${path.join(TOOLS_DIR, 'restricted_org_auditor.py')}" "${SKILL_DIR}" --json`, {
      encoding: 'utf8',
      timeout: 15000
    });
    const parsed = JSON.parse(out);
    assert.strictEqual(parsed.tool, 'restricted_org_auditor');
    assert.ok(typeof parsed.air_gapped_readiness_score === 'number');
    assert.ok(['AIR_GAPPED_READY', 'RESTRICTED_WITH_EXCEPTIONS', 'AIR_GAPPED_NON_COMPLIANT'].includes(parsed.compliance_status));
    console.log(`✓ restricted_org_auditor executed successfully: score=${parsed.air_gapped_readiness_score}`);
  }

  // 4. static_concurrency_profiler.py produces valid JSON
  {
    const out = execSync(`${pyCmd} "${path.join(TOOLS_DIR, 'static_concurrency_profiler.py')}" "${SKILL_DIR}" --json`, {
      encoding: 'utf8',
      timeout: 15000
    });
    const parsed = JSON.parse(out);
    assert.strictEqual(parsed.tool, 'static_concurrency_profiler');
    assert.ok(typeof parsed.concurrency_score === 'number');
    assert.ok(['OPTIMAL', 'ACCEPTABLE', 'AT_RISK'].includes(parsed.concurrency_status));
    console.log(`✓ static_concurrency_profiler executed successfully: score=${parsed.concurrency_score}`);
  }

  // 5. data_immutability_checker.py produces valid JSON
  {
    const out = execSync(`${pyCmd} "${path.join(TOOLS_DIR, 'data_immutability_checker.py')}" "${SKILL_DIR}" --json`, {
      encoding: 'utf8',
      timeout: 15000
    });
    const parsed = JSON.parse(out);
    assert.strictEqual(parsed.tool, 'data_immutability_checker');
    assert.ok(typeof parsed.immutability_score === 'number');
    assert.ok(['VERIFIED_IMMUTABLE', 'PARTIALLY_PROTECTED', 'VULNERABLE_TO_TAMPERING'].includes(parsed.compliance_status));
    console.log(`✓ data_immutability_checker executed successfully: score=${parsed.immutability_score}`);
  }

  // 6. run_nfr_tools.py produces aggregated report
  {
    const out = execSync(`${pyCmd} "${path.join(TOOLS_DIR, 'run_nfr_tools.py')}" "${SKILL_DIR}" --json`, {
      encoding: 'utf8',
      timeout: 20000
    });
    const parsed = JSON.parse(out);
    assert.ok(typeof parsed.composite_gap_score === 'number');
    assert.ok(parsed.domain_breakdown);
    assert.ok(parsed.domain_breakdown.restricted_org_readiness);
    assert.ok(parsed.domain_breakdown.static_concurrency_resilience);
    assert.ok(parsed.domain_breakdown.data_immutability_and_audit);
    assert.ok(parsed.domain_breakdown.i18n_and_localization);
    console.log(`✓ run_nfr_tools.py executed: composite_score=${parsed.composite_gap_score}`);
  }

  // 7. run_nfr_tools.cjs Node.js wrapper
  {
    const out = execSync(`node "${path.join(TOOLS_DIR, 'run_nfr_tools.cjs')}" "${SKILL_DIR}" --json`, {
      encoding: 'utf8',
      timeout: 20000
    });
    const parsed = JSON.parse(out);
    assert.ok(typeof parsed.composite_gap_score === 'number');
    console.log(`✓ run_nfr_tools.cjs executed successfully`);
  }
} else {
  console.log('⚠ Python execution skipped (no python runtime detected)');
}

console.log('\nAll Tools Suite unit tests passed successfully!\n');
