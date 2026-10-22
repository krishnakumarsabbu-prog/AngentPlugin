#!/usr/bin/env node

/**
 * AgentForge Enterprise Dual License: Apache-2.0 / MIT
 * Copyright (C) AgentForge Engineering. All rights reserved.
 * Adapted with attribution from JPeetz/agent-skills (Supply Chain Security Scanner).
 * Licensed under the Apache License, Version 2.0 or the MIT License.
 *
 * Bastion Unit Test Suite
 */

'use strict';

const assert = require('assert');
const path = require('path');
const {
  validatePath,
  redactSecrets,
  auditComponents,
  generateCycloneDX,
  generateSPDX,
} = require('../scripts/bastion-scanner.cjs');

console.log('Running Bastion Unit Tests...');

// 1. Test Path Traversal Guardrails
assert.throws(() => {
  validatePath('../outside-dir');
}, /Path traversal token/);

assert.throws(() => {
  validatePath('foo/%2e%2e/bar');
}, /Path traversal token/);

assert.throws(() => {
  validatePath('.git/config');
}, /sensitive path/);

assert.throws(() => {
  validatePath('.env');
}, /sensitive path/);

console.log('✅ Path traversal & sensitive blacklist guardrails passed.');

// 2. Test Secret Redaction
const secretStr = 'api_key = "sk-12345678901234567890abcdef" and token = "ghp_123456789012345678901234567890123456"';
const redacted = redactSecrets(secretStr);
assert(!redacted.includes('sk-12345'));
assert(!redacted.includes('ghp_12345'));
assert(redacted.includes('[REDACTED_SECRET]'));
console.log('✅ Secret redaction filter passed.');

// 3. Test Vulnerability & License Audit
const testComponents = [
  { name: 'event-stream', version: '3.3.6', rawVersion: '3.3.6', ecosystem: 'npm', purl: 'pkg:npm/event-stream@3.3.6', license: 'MIT' },
  { name: 'unpinned-pkg', version: '*', rawVersion: '*', ecosystem: 'npm', purl: 'pkg:npm/unpinned-pkg@*', license: 'GPL-3.0' },
  { name: 'safe-pkg', version: '1.0.0', rawVersion: '^1.0.0', ecosystem: 'npm', purl: 'pkg:npm/safe-pkg@1.0.0', license: 'Apache-2.0' },
];

const audit = auditComponents(testComponents);
assert.strictEqual(audit.findings.length, 2); // event-stream CVE & unpinned-pkg AST10
assert.strictEqual(audit.licenseRisks.length, 1); // GPL-3.0 copyleft risk
console.log('✅ Component vulnerability & license auditing passed.');

// 4. Test CycloneDX SBOM Generation
const cdx = generateCycloneDX('test-project', testComponents);
assert.strictEqual(cdx.bomFormat, 'CycloneDX');
assert.strictEqual(cdx.specVersion, '1.5');
assert.strictEqual(cdx.components.length, 3);
console.log('✅ CycloneDX SBOM generator passed.');

// 5. Test SPDX SBOM Generation
const spdx = generateSPDX('test-project', testComponents);
assert.strictEqual(spdx.spdxVersion, 'SPDX-2.3');
assert.strictEqual(spdx.packages.length, 3);
console.log('✅ SPDX SBOM generator passed.');

console.log('\n🎉 ALL BASTION UNIT TESTS PASSED SUCCESSFULLY!');
