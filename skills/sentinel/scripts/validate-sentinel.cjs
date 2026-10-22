#!/usr/bin/env node

/**
 * AgentForge Enterprise Dual License: Apache-2.0 / MIT
 * Copyright (C) AgentForge Engineering. All rights reserved.
 * Adapted with attribution from JPeetz/agent-skills (OWASP Agentic Skills Top 10).
 * Licensed under the Apache License, Version 2.0 or the MIT License.
 *
 * Sentinel Suite Integrity Validator
 */

'use strict';

const fs = require('fs');
const path = require('path');

const SENTINEL_DIR = path.resolve(__dirname, '..');

const REQUIRED_FILES = [
  'SKILL.md',
  'README.md',
  'INSTALLATION-AND-USAGE.md',
  'LICENSE',
  'license.md',
  'CHANGELOG.md',
  'governance.md',
  'evals/cases.md',
  'scripts/scan_skill.py',
  'scripts/sentinel-scanner.cjs',
  'tests/sentinel.test.cjs',
];

function validateSentinel() {
  console.log(`[SENTINEL] Validating Sentinel suite at: ${SENTINEL_DIR}`);
  let errors = 0;

  for (const rel of REQUIRED_FILES) {
    const fullPath = path.join(SENTINEL_DIR, rel);
    if (!fs.existsSync(fullPath)) {
      console.error(`  [FAIL] Missing required file: ${rel}`);
      errors++;
    } else {
      console.log(`  [OK] Found ${rel}`);
    }
  }

  // Validate SKILL.md YAML Frontmatter
  const skillMdPath = path.join(SENTINEL_DIR, 'SKILL.md');
  if (fs.existsSync(skillMdPath)) {
    const content = fs.readFileSync(skillMdPath, 'utf8');
    if (!content.startsWith('---')) {
      console.error('  [FAIL] SKILL.md does not start with --- frontmatter delimiter.');
      errors++;
    } else if (!content.includes('name: sentinel-security-scanner-skill')) {
      console.error('  [FAIL] SKILL.md frontmatter missing name: sentinel-security-scanner-skill.');
      errors++;
    } else if (!content.includes('version: 1.0.0')) {
      console.error('  [FAIL] SKILL.md frontmatter missing version: 1.0.0.');
      errors++;
    } else if (!content.includes('title: Sentinel Security Scanner Skill')) {
      console.error('  [FAIL] SKILL.md frontmatter missing title: Sentinel Security Scanner Skill.');
      errors++;
    } else {
      console.log('  [OK] SKILL.md frontmatter validated.');
    }
  }

  // Validate Dual License
  const licensePath = path.join(SENTINEL_DIR, 'LICENSE');
  if (fs.existsSync(licensePath)) {
    const content = fs.readFileSync(licensePath, 'utf8');
    if (!content.includes('Apache License') || !content.includes('MIT License')) {
      console.error('  [FAIL] LICENSE does not contain both Apache-2.0 and MIT terms.');
      errors++;
    } else {
      console.log('  [OK] Dual Apache-2.0 / MIT LICENSE validated.');
    }
  }

  if (errors === 0) {
    console.log('\n[SENTINEL] All validation checks passed successfully with 0 errors!\n');
    return true;
  } else {
    console.error(`\n[SENTINEL] Validation failed with ${errors} error(s).\n`);
    return false;
  }
}

if (require.main === module) {
  const success = validateSentinel();
  process.exit(success ? 0 : 1);
}

module.exports = { validateSentinel };
