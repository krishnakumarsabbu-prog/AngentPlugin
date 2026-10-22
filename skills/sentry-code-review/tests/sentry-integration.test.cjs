/**
 * Sentry Code Review Suite End-to-End Integration Tests
 * Validates cross-platform file discovery, frontmatter parity, sync integrity,
 * and automated review execution across AgentForge, GitHub Copilot, and Claude Code.
 */

'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..', '..', '..');
const CANONICAL_DIR = path.join(ROOT_DIR, 'skills', 'sentry-code-review');

test('1. GitHub Copilot discovers sentry-code-review agent and tools', () => {
  const agentPath = path.join(ROOT_DIR, '.github', 'agents', 'sentry-code-review.agent.md');
  assert.ok(fs.existsSync(agentPath), 'Agent file .github/agents/sentry-code-review.agent.md must exist');

  const content = fs.readFileSync(agentPath, 'utf8');
  assert.ok(content.includes('name: sentry-code-review'), 'Must have name: sentry-code-review');
  assert.ok(content.includes('sentry_review_diff'), 'Must register sentry_review_diff');
  assert.ok(content.includes('sentry_audit_architecture'), 'Must register sentry_audit_architecture');
  assert.ok(content.includes('sentry_inspect_performance'), 'Must register sentry_inspect_performance');
  assert.ok(content.includes('sentry_verify_security'), 'Must register sentry_verify_security');
  assert.ok(content.includes('sentry_generate_review_summary'), 'Must register sentry_generate_review_summary');
  assert.ok(content.includes('AUTOMATIC SKILL SELECTION & EXECUTION MATRIX'), 'Must include execution matrix');
});

test('2. Claude Code discovers sentry-code-review agent', () => {
  const agentPath = path.join(ROOT_DIR, '.claude', 'agents', 'sentry-code-review.md');
  assert.ok(fs.existsSync(agentPath), 'Agent file .claude/agents/sentry-code-review.md must exist');

  const content = fs.readFileSync(agentPath, 'utf8');
  assert.ok(content.includes('name: sentry-code-review'), 'Must have name: sentry-code-review');
  assert.ok(content.includes('compatibility: [claude, claude-code]'), 'Must support claude');
});

test('3. Canonical skill frontmatter and metadata validation', () => {
  const skillPath = path.join(CANONICAL_DIR, 'SKILL.md');
  assert.ok(fs.existsSync(skillPath), 'Canonical SKILL.md must exist');

  const content = fs.readFileSync(skillPath, 'utf8');
  assert.ok(content.startsWith('---'), 'Must start with YAML frontmatter delimiter');
  assert.ok(content.includes('name: sentry-code-review'), 'Must have name: sentry-code-review');
  assert.ok(content.includes('version: 1.0.0'), 'Must match version 1.0.0');
  assert.ok(content.includes('category: Code Review & Quality Assurance'), 'Must specify category');
  assert.ok(content.includes('compatibility: [agy, copilot, claude, openai]'), 'Must support all specified platforms');
});

test('4. All submodules exist in canonical and synced directories', () => {
  const syncModule = require(path.join(ROOT_DIR, 'scripts', 'sync-skills.cjs'));
  const syncFiles = syncModule.SENTRY_SYNC_FILES;

  const targets = [
    path.join(ROOT_DIR, '.github', 'skills', 'sentry-code-review'),
    path.join(ROOT_DIR, '.claude', 'skills', 'sentry-code-review'),
    path.join(ROOT_DIR, '.agents', 'skills', 'sentry-code-review'),
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

test('5. Review engine identifies blocking security flaws', () => {
  const { reviewCode } = require(path.join(CANONICAL_DIR, 'scripts', 'review-engine.cjs'));
  const code = 'const query = "SELECT * FROM users WHERE id = " + userId;';
  const findings = reviewCode(code, 'app.ts');
  assert.ok(findings.some(f => f.severity === 'BLOCKING'), 'Must identify SQL injection as BLOCKING');
});
