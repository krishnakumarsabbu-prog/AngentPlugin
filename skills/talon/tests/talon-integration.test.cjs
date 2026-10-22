/**
 * Talon Suite End-to-End Integration Tests
 * Validates cross-platform file discovery, frontmatter parity, sync integrity,
 * and security scanning invariants across AgentForge, GitHub Copilot, and Claude Code.
 */

'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..', '..', '..');
const CANONICAL_DIR = path.join(ROOT_DIR, 'skills', 'talon');

test('1. GitHub Copilot discovers talon agent and tools', () => {
  const agentPath = path.join(ROOT_DIR, '.github', 'agents', 'talon.agent.md');
  assert.ok(fs.existsSync(agentPath), 'Agent file .github/agents/talon.agent.md must exist');

  const content = fs.readFileSync(agentPath, 'utf8');
  assert.ok(content.includes('name: talon'), 'Must have name: talon');
  assert.ok(content.includes('talon_audit_code'), 'Must register talon_audit_code');
  assert.ok(content.includes('talon_run_proxy_test'), 'Must register talon_run_proxy_test');
  assert.ok(content.includes('talon_inspect_browser'), 'Must register talon_inspect_browser');
  assert.ok(content.includes('talon_generate_poc'), 'Must register talon_generate_poc');
  assert.ok(content.includes('talon_graph_orchestrate'), 'Must register talon_graph_orchestrate');
  assert.ok(content.includes('AUTOMATIC SKILL SELECTION & EXECUTION MATRIX'), 'Must include execution matrix');
});

test('2. Claude Code discovers talon agent', () => {
  const agentPath = path.join(ROOT_DIR, '.claude', 'agents', 'anvil.md'); // check anvil still exists
  assert.ok(fs.existsSync(agentPath), 'Anvil claude agent must exist');

  const talonPath = path.join(ROOT_DIR, '.claude', 'agents', 'talon.md');
  assert.ok(fs.existsSync(talonPath), 'Agent file .claude/agents/talon.md must exist');

  const content = fs.readFileSync(talonPath, 'utf8');
  assert.ok(content.includes('name: talon'), 'Must have name: talon');
  assert.ok(content.includes('compatibility: [claude, claude-code]'), 'Must support claude');
});

test('3. Canonical skill frontmatter and metadata validation', () => {
  const skillPath = path.join(CANONICAL_DIR, 'SKILL.md');
  assert.ok(fs.existsSync(skillPath), 'Canonical SKILL.md must exist');

  const content = fs.readFileSync(skillPath, 'utf8');
  assert.ok(content.startsWith('---'), 'Must start with YAML frontmatter delimiter');
  assert.ok(content.includes('name: talon'), 'Must have name: talon');
  assert.ok(content.includes('version: 1.0.0'), 'Must match version 1.0.0');
  assert.ok(content.includes('category: Security & Penetration Testing'), 'Must specify category');
  assert.ok(content.includes('compatibility: [agy, copilot, claude, openai]'), 'Must support all specified platforms');
});

test('4. All submodules exist in canonical and synced directories', () => {
  const syncModule = require(path.join(ROOT_DIR, 'scripts', 'sync-skills.cjs'));
  const syncFiles = syncModule.TALON_SYNC_FILES;

  const targets = [
    path.join(ROOT_DIR, '.github', 'skills', 'talon'),
    path.join(ROOT_DIR, '.claude', 'skills', 'talon'),
    path.join(ROOT_DIR, '.agents', 'skills', 'talon'),
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

test('5. Static security audit detects SQLi and Command Injection', () => {
  const auditor = require(path.join(CANONICAL_DIR, 'scripts', 'talon-auditor.cjs'));
  const code = `
    const user = db.query("SELECT * FROM users WHERE id = '" + req.query.id + "'");
    exec("ping " + req.query.host);
  `;
  const findings = auditor.auditCode(code, 'app.js');
  assert.ok(findings.some(f => f.cwe === 'CWE-89'), 'Must detect SQL injection');
  assert.ok(findings.some(f => f.cwe === 'CWE-78'), 'Must detect Command injection');
});
