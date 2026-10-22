/**
 * Anvil Suite End-to-End Integration Tests
 * Validates cross-platform file discovery, frontmatter parity, sync integrity,
 * and compression invariants across AgentForge, GitHub Copilot, and Claude Code.
 */

'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..', '..', '..');
const CANONICAL_DIR = path.join(ROOT_DIR, 'skills', 'anvil');

test('1. GitHub Copilot discovers anvil agent and tools', () => {
  const agentPath = path.join(ROOT_DIR, '.github', 'agents', 'anvil.agent.md');
  assert.ok(fs.existsSync(agentPath), 'Agent file .github/agents/anvil.agent.md must exist');

  const content = fs.readFileSync(agentPath, 'utf8');
  assert.ok(content.includes('name: anvil'), 'Must have name: anvil');
  assert.ok(content.includes('anvil_shrink_input'), 'Must register anvil_shrink_input');
  assert.ok(content.includes('anvil_audit_waste'), 'Must register anvil_audit_waste');
  assert.ok(content.includes('anvil_browse_compact'), 'Must register anvil_browse_compact');
  assert.ok(content.includes('anvil_route_effort'), 'Must register anvil_route_effort');
  assert.ok(content.includes('anvil_execute_block'), 'Must register anvil_execute_block');
  assert.ok(content.includes('anvil_format_output'), 'Must register anvil_format_output');
  assert.ok(content.includes('AUTOMATIC SKILL SELECTION & EXECUTION MATRIX'), 'Must include execution matrix');
});

test('2. Claude Code discovers anvil agent', () => {
  const agentPath = path.join(ROOT_DIR, '.claude', 'agents', 'anvil.md');
  assert.ok(fs.existsSync(agentPath), 'Agent file .claude/agents/anvil.md must exist');

  const content = fs.readFileSync(agentPath, 'utf8');
  assert.ok(content.includes('name: anvil'), 'Must have name: anvil');
  assert.ok(content.includes('compatibility: [claude, claude-code]'), 'Must support claude');
});

test('3. Canonical skill frontmatter and metadata validation', () => {
  const skillPath = path.join(CANONICAL_DIR, 'SKILL.md');
  assert.ok(fs.existsSync(skillPath), 'Canonical SKILL.md must exist');

  const content = fs.readFileSync(skillPath, 'utf8');
  assert.ok(content.startsWith('---'), 'Must start with YAML frontmatter delimiter');
  assert.ok(content.includes('name: anvil'), 'Must have name: anvil');
  assert.ok(content.includes('version: 4.0.1'), 'Must match version 4.0.1');
  assert.ok(content.includes('ASD-STE100'), 'Must specify ASD-STE100 in description');
  assert.ok(content.includes('compatibility: [agy, copilot, claude, openai]'), 'Must support all specified platforms');
});

test('4. All submodules exist in canonical and synced directories', () => {
  const syncModule = require(path.join(ROOT_DIR, 'scripts', 'sync-skills.cjs'));
  const syncFiles = syncModule.ANVIL_SYNC_FILES;

  const targets = [
    path.join(ROOT_DIR, '.github', 'skills', 'anvil'),
    path.join(ROOT_DIR, '.claude', 'skills', 'anvil'),
    path.join(ROOT_DIR, '.agents', 'skills', 'anvil'),
  ];

  for (const rel of syncFiles) {
    const canonicalFile = path.join(CANONICAL_DIR, rel);
    assert.ok(fs.existsSync(canonicalFile), `Canonical file ${rel} must exist`);

    const canonicalBytes = fs.readFileSync(canonicalFile);

    for (const target of targets) {
      const targetFile = path.join(target, rel);
      assert.ok(fs.existsSync(targetFile), `Target file ${targetFile} must exist`);
      const targetBytes = fs.readFileSync(targetFile);
      assert.ok(canonicalBytes.equals(targetBytes), `File ${rel} must be byte-identical in ${target}`);
    }
  }
});

test('5. Blocks manifest and release-smoke script are valid', () => {
  const manifestPath = path.join(CANONICAL_DIR, 'blocks', 'manifest.json');
  assert.ok(fs.existsSync(manifestPath), 'manifest.json must exist');

  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  assert.ok(Array.isArray(manifest.blocks), 'blocks array must exist');
  assert.ok(manifest.blocks.length >= 1, 'Must have at least 1 registered block');

  const smokeBlock = manifest.blocks.find(b => b.id === 'release-smoke');
  assert.ok(smokeBlock, 'release-smoke block must be registered');

  const scriptPath = path.join(CANONICAL_DIR, 'blocks', smokeBlock.file);
  assert.ok(fs.existsSync(scriptPath), 'release-smoke.py script must exist');
});

test('6. Compression engine verifies core heuristics', () => {
  const compressor = require(path.join(CANONICAL_DIR, 'scripts', 'anvil-compressor.cjs'));

  // Test log elision
  const logInput = 'info 1\ninfo 2\nERROR crash occurred\ninfo 3\ninfo 4';
  const compressedLog = compressor.compressLogs(logInput);
  assert.ok(compressedLog.includes('lines elided (anvil)'));
  assert.ok(compressedLog.includes('ERROR crash occurred'));

  // Test ANSI strip
  const ansiText = '\x1b[32mPASS\x1b[0m test';
  assert.strictEqual(compressor.stripAnsi(ansiText), 'PASS test');
});
