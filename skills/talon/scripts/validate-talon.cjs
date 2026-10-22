#!/usr/bin/env node

/**
 * Talon Suite Validator
 * Verifies that the Talon skill files, frontmatters, licensing, and submodules conform to specifications.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const TALON_DIR = path.resolve(__dirname, '..');

const REQUIRED_FILES = [
  'SKILL.md',
  'README.md',
  'INSTALLATION-AND-USAGE.md',
  'LICENSE',
  'license.md',
  'graph/graph-orchestrator.md',
  'graph/worker-agents.md',
  'proxy/traffic-interceptor.md',
  'proxy/api-security.md',
  'browser/dom-xss-auditor.md',
  'browser/auth-session-tester.md',
  'runner/poc-generator.md',
  'runner/sandbox-executor.md',
  'audit/owasp-top-10.md',
  'audit/cwe-catalog.md',
  'audit/injection-matrix.md',
  'scripts/talon-auditor.cjs',
];

function validate() {
  console.log(`[TALON] Validating Talon suite at: ${TALON_DIR}`);
  let errors = 0;

  for (const rel of REQUIRED_FILES) {
    const fullPath = path.join(TALON_DIR, rel);
    if (!fs.existsSync(fullPath)) {
      console.error(`  [FAIL] Missing required file: ${rel}`);
      errors++;
    } else {
      console.log(`  [OK] Found ${rel}`);
    }
  }

  // Validate SKILL.md frontmatter
  const skillMdPath = path.join(TALON_DIR, 'SKILL.md');
  if (fs.existsSync(skillMdPath)) {
    const content = fs.readFileSync(skillMdPath, 'utf8');
    if (!content.startsWith('---') || !content.includes('name: talon') || !content.includes('version: 1.0.0')) {
      console.error('  [FAIL] SKILL.md does not have valid frontmatter header.');
      errors++;
    } else {
      console.log('  [OK] SKILL.md frontmatter validated.');
    }
  }

  // Validate license header
  const licenseMdPath = path.join(TALON_DIR, 'license.md');
  if (fs.existsSync(licenseMdPath)) {
    const content = fs.readFileSync(licenseMdPath, 'utf8');
    if (!content.includes('Apache-2.0') || !content.includes('MIT')) {
      console.error('  [FAIL] license.md missing dual license mention.');
      errors++;
    } else {
      console.log('  [OK] license.md validated.');
    }
  }

  if (errors === 0) {
    console.log('\n[TALON] All validation checks passed successfully!');
    process.exit(0);
  } else {
    console.error(`\n[TALON] Validation failed with ${errors} error(s).`);
    process.exit(1);
  }
}

if (require.main === module) {
  validate();
}

module.exports = { validate };
