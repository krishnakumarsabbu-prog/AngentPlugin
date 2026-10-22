#!/usr/bin/env node

/**
 * Anvil Suite Validator
 * Verifies that the Anvil skill files, frontmatters, blocks, and submodules conform to specifications.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ANVIL_DIR = path.resolve(__dirname, '..');

const REQUIRED_FILES = [
  'SKILL.md',
  'README.md',
  'INSTALLATION-AND-USAGE.md',
  'LICENSE',
  'voices/anvil.md',
  'voices/anvil-dense.md',
  'voices/anvil-core.md',
  'shrink/logs.md',
  'shrink/stacktraces.md',
  'shrink/json.md',
  'shrink/csv.md',
  'shrink/test-output.md',
  'auto/routing-matrix.md',
  'blocks/manifest.json',
  'blocks/release-smoke.py',
  'waste/cache-alignment.md',
  'browse/dom-extractor.md',
  'scripts/anvil-compressor.cjs',
  'scripts/detect.cjs',
];

function validate() {
  console.log(`[ANVIL] Validating Anvil suite at: ${ANVIL_DIR}`);
  let errors = 0;

  for (const rel of REQUIRED_FILES) {
    const fullPath = path.join(ANVIL_DIR, rel);
    if (!fs.existsSync(fullPath)) {
      console.error(`  [FAIL] Missing required file: ${rel}`);
      errors++;
    } else {
      console.log(`  [OK] Found ${rel}`);
    }
  }

  // Validate SKILL.md frontmatter
  const skillMdPath = path.join(ANVIL_DIR, 'SKILL.md');
  if (fs.existsSync(skillMdPath)) {
    const content = fs.readFileSync(skillMdPath, 'utf8');
    if (!content.startsWith('---') || !content.includes('name: anvil') || !content.includes('version: 4.0.1')) {
      console.error('  [FAIL] SKILL.md does not have valid frontmatter header.');
      errors++;
    } else {
      console.log('  [OK] SKILL.md frontmatter validated.');
    }
  }

  // Validate blocks manifest
  const manifestPath = path.join(ANVIL_DIR, 'blocks', 'manifest.json');
  if (fs.existsSync(manifestPath)) {
    try {
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
      if (!manifest.blocks || !Array.isArray(manifest.blocks)) {
        console.error('  [FAIL] blocks/manifest.json missing blocks array.');
        errors++;
      } else {
        console.log(`  [OK] blocks/manifest.json contains ${manifest.blocks.length} registered block(s).`);
      }
    } catch (e) {
      console.error(`  [FAIL] Invalid JSON in blocks/manifest.json: ${e.message}`);
      errors++;
    }
  }

  if (errors === 0) {
    console.log('\n[ANVIL] All validation checks passed successfully!');
    process.exit(0);
  } else {
    console.error(`\n[ANVIL] Validation failed with ${errors} error(s).`);
    process.exit(1);
  }
}

if (require.main === module) {
  validate();
}

module.exports = { validate };
