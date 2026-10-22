#!/usr/bin/env node

/**
 * Sentry Suite Validator
 * Verifies that the Sentry Code Review skill files, frontmatters, checklists, and references conform to specifications.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const SENTRY_DIR = path.resolve(__dirname, '..');

const REQUIRED_FILES = [
  'SKILL.md',
  'README.md',
  'INSTALLATION-AND-USAGE.md',
  'LICENSE',
  'license.md',
  'assets/review-checklist.md',
  'assets/pr-review-template.md',
  'reference/code-quality-universal.md',
  'reference/architecture-review-guide.md',
  'reference/performance-review-guide.md',
  'reference/security-review-guide.md',
  'reference/common-bugs-checklist.md',
  'reference/typescript.md',
  'reference/python.md',
  'reference/go.md',
  'reference/react.md',
  'reference/java8.md',
  'reference/java.md',
  'reference/rust.md',
  'reference/cpp.md',
  'cross-cutting/async-concurrency.md',
  'cross-cutting/error-handling.md',
  'cross-cutting/n-plus-one-queries.md',
  'cross-cutting/injection-prevention.md',
  'scripts/pr-analyzer.cjs',
  'scripts/review-engine.cjs',
];

function validate() {
  console.log(`[SENTRY] Validating Sentry Code Review suite at: ${SENTRY_DIR}`);
  let errors = 0;

  for (const rel of REQUIRED_FILES) {
    const fullPath = path.join(SENTRY_DIR, rel);
    if (!fs.existsSync(fullPath)) {
      console.error(`  [FAIL] Missing required file: ${rel}`);
      errors++;
    } else {
      console.log(`  [OK] Found ${rel}`);
    }
  }

  // Validate SKILL.md frontmatter
  const skillMdPath = path.join(SENTRY_DIR, 'SKILL.md');
  if (fs.existsSync(skillMdPath)) {
    const content = fs.readFileSync(skillMdPath, 'utf8');
    if (!content.startsWith('---') || !content.includes('name: sentry-code-review') || !content.includes('version: 1.0.0')) {
      console.error('  [FAIL] SKILL.md does not have valid frontmatter header.');
      errors++;
    } else {
      console.log('  [OK] SKILL.md frontmatter validated.');
    }
  }

  // Validate license header
  const licenseMdPath = path.join(SENTRY_DIR, 'license.md');
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
    console.log('\n[SENTRY] All validation checks passed successfully!');
    process.exit(0);
  } else {
    console.error(`\n[SENTRY] Validation failed with ${errors} error(s).`);
    process.exit(1);
  }
}

if (require.main === module) {
  validate();
}

module.exports = { validate };
