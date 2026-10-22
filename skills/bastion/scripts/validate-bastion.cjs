#!/usr/bin/env node

/**
 * AgentForge Enterprise Dual License: Apache-2.0 / MIT
 * Copyright (C) AgentForge Engineering. All rights reserved.
 * Adapted with attribution from JPeetz/agent-skills (Supply Chain Security Scanner).
 * Licensed under the Apache License, Version 2.0 or the MIT License.
 *
 * Bastion Skill Suite Integrity Validator
 */

'use strict';

const fs = require('fs');
const path = require('path');

const SKILL_DIR = path.resolve(__dirname, '..');

const REQUIRED_FILES = [
  'SKILL.md',
  'README.md',
  'INSTALLATION-AND-USAGE.md',
  'LICENSE',
  'license.md',
  'CHANGELOG.md',
  'governance.md',
  'references/ecosystem-vuln-databases.md',
  'references/owasp-ast10-summary.md',
  'references/sbom-formats.md',
  'scripts/generate-sbom.sh',
  'scripts/scan-dependencies.sh',
  'scripts/verify-provenance.sh',
  'scripts/bastion-scanner.cjs',
  'evals/evals.json',
];

console.log(`Validating Bastion Skill Suite in: ${SKILL_DIR}`);
let errors = 0;

for (const rel of REQUIRED_FILES) {
  const full = path.join(SKILL_DIR, rel);
  if (!fs.existsSync(full)) {
    console.error(`❌ Missing required file: ${rel}`);
    errors++;
  } else {
    const stats = fs.statSync(full);
    if (stats.size === 0) {
      console.error(`❌ Empty file detected: ${rel}`);
      errors++;
    } else {
      console.log(`✅ Verified ${rel} (${stats.size} bytes)`);
    }
  }
}

// Validate SKILL.md Frontmatter
const skillContent = fs.readFileSync(path.join(SKILL_DIR, 'SKILL.md'), 'utf-8');
const expectedFields = ['name: bastion-supply-chain-security-skill', 'title: Bastion Supply Chain Security Skill', 'version: 1.0.0'];
for (const field of expectedFields) {
  if (!skillContent.includes(field)) {
    console.error(`❌ SKILL.md frontmatter missing required field: ${field}`);
    errors++;
  }
}

// Validate License Header in Markdown
if (!skillContent.includes('AgentForge Enterprise Dual License: Apache-2.0 / MIT')) {
  console.error(`❌ SKILL.md missing Apache-2.0 / MIT dual-license header!`);
  errors++;
}

if (errors > 0) {
  console.error(`\nValidation failed with ${errors} error(s).`);
  process.exit(1);
} else {
  console.log(`\n🎉 Bastion Skill Suite passed all integrity checks!`);
}
