#!/usr/bin/env node

/**
 * Skill Synchronization Script
 * Synchronizes canonical skill methodologies, supporting files, schemas,
 * and validators to platform-specific directories (.github, .claude, and .agents).
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');

// 1. Enterprise Security Audit paths & files
const CANONICAL_DIR = path.join(ROOT_DIR, 'skills', 'enterprise-security-audit');
const TARGET_DIRS = [
  path.join(ROOT_DIR, '.github', 'skills', 'enterprise-security-audit'),
  path.join(ROOT_DIR, '.claude', 'skills', 'enterprise-security-audit'),
];

const SYNC_FILES = [
  'SKILL.md',
  'RECONNAISSANCE.md',
  'HUNTING.md',
  'ATTACK-CLASSES.md',
  'MEMORY-SAFETY-AND-BINARY.md',
  'AI-AND-LLM.md',
  'WEB-PROTOCOL-AND-AUTH.md',
  'CLIENT-SIDE.md',
  'SUPPLY-CHAIN-AND-RELEASE.md',
  'CLOUD-AND-DEPLOYMENT.md',
  'PROTOCOLS-RPC-AND-MESSAGING.md',
  'RESOURCE-EXHAUSTION-AND-AVAILABILITY.md',
  'DATA-ISOLATION-AND-LIFECYCLE.md',
  'DESKTOP-MOBILE-AND-LOCAL-IPC.md',
  'VALIDATION-AND-REPORTING.md',
  'report-schema.json',
  'metadata-schema.json',
  'validate-findings.cjs',
  'validate-findings.test.cjs',
  'validate-coverage-ledger.cjs',
  'validate-coverage-ledger.test.cjs',
  'validate-audit.cjs',
];

// 2. Anvil paths & files
const ANVIL_CANONICAL_DIR = path.join(ROOT_DIR, 'skills', 'anvil');
const ANVIL_TARGET_DIRS = [
  path.join(ROOT_DIR, '.github', 'skills', 'anvil'),
  path.join(ROOT_DIR, '.claude', 'skills', 'anvil'),
  path.join(ROOT_DIR, '.agents', 'skills', 'anvil'),
];

const ANVIL_SYNC_FILES = [
  'SKILL.md',
  'README.md',
  'INSTALLATION-AND-USAGE.md',
  'LICENSE',
  path.join('voices', 'anvil.md'),
  path.join('voices', 'anvil-dense.md'),
  path.join('voices', 'anvil-core.md'),
  path.join('shrink', 'logs.md'),
  path.join('shrink', 'stacktraces.md'),
  path.join('shrink', 'json.md'),
  path.join('shrink', 'csv.md'),
  path.join('shrink', 'test-output.md'),
  path.join('auto', 'routing-matrix.md'),
  path.join('blocks', 'manifest.json'),
  path.join('blocks', 'release-smoke.py'),
  path.join('waste', 'cache-alignment.md'),
  path.join('browse', 'dom-extractor.md'),
  path.join('scripts', 'anvil-compressor.cjs'),
  path.join('scripts', 'detect.cjs'),
  path.join('scripts', 'validate-anvil.cjs'),
  path.join('tests', 'anvil.test.cjs'),
];

// 3. Talon paths & files
const TALON_CANONICAL_DIR = path.join(ROOT_DIR, 'skills', 'talon');
const TALON_TARGET_DIRS = [
  path.join(ROOT_DIR, '.github', 'skills', 'talon'),
  path.join(ROOT_DIR, '.claude', 'skills', 'talon'),
  path.join(ROOT_DIR, '.agents', 'skills', 'talon'),
];

const TALON_SYNC_FILES = [
  'SKILL.md',
  'README.md',
  'INSTALLATION-AND-USAGE.md',
  'LICENSE',
  'license.md',
  path.join('graph', 'graph-orchestrator.md'),
  path.join('graph', 'worker-agents.md'),
  path.join('proxy', 'traffic-interceptor.md'),
  path.join('proxy', 'api-security.md'),
  path.join('browser', 'dom-xss-auditor.md'),
  path.join('browser', 'auth-session-tester.md'),
  path.join('runner', 'poc-generator.md'),
  path.join('runner', 'sandbox-executor.md'),
  path.join('audit', 'owasp-top-10.md'),
  path.join('audit', 'cwe-catalog.md'),
  path.join('audit', 'injection-matrix.md'),
  path.join('scripts', 'talon-auditor.cjs'),
  path.join('scripts', 'validate-talon.cjs'),
  path.join('tests', 'talon.test.cjs'),
  path.join('tests', 'talon-integration.test.cjs'),
];

// 4. Sentry Code Review paths & files
const SENTRY_CANONICAL_DIR = path.join(ROOT_DIR, 'skills', 'sentry-code-review');
const SENTRY_TARGET_DIRS = [
  path.join(ROOT_DIR, '.github', 'skills', 'sentry-code-review'),
  path.join(ROOT_DIR, '.claude', 'skills', 'sentry-code-review'),
  path.join(ROOT_DIR, '.agents', 'skills', 'sentry-code-review'),
];

function getAllRelativeFiles(dir, baseDir = dir) {
  let files = [];
  if (!fs.existsSync(dir)) return files;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files = files.concat(getAllRelativeFiles(full, baseDir));
    } else {
      files.push(path.relative(baseDir, full));
    }
  }
  return files;
}

const SENTRY_SYNC_FILES = getAllRelativeFiles(SENTRY_CANONICAL_DIR);

function syncDirectory(targetDir) {
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  let count = 0;
  for (const filename of SYNC_FILES) {
    const srcFile = path.join(CANONICAL_DIR, filename);
    const destFile = path.join(targetDir, filename);

    if (!fs.existsSync(srcFile)) {
      console.warn(`[WARN] Source file not found: ${srcFile}`);
      continue;
    }

    const content = fs.readFileSync(srcFile, 'utf8');
    fs.writeFileSync(destFile, content, 'utf8');
    count++;
  }
  return count;
}

function syncCustomDirectory(canonicalDir, targetDir, filesList) {
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  let count = 0;
  for (const filename of filesList) {
    const srcFile = path.join(canonicalDir, filename);
    const destFile = path.join(targetDir, filename);
    const destDir = path.dirname(destFile);

    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }

    if (!fs.existsSync(srcFile)) {
      console.warn(`[WARN] Source file not found: ${srcFile}`);
      continue;
    }

    const content = fs.readFileSync(srcFile, 'utf8');
    fs.writeFileSync(destFile, content, 'utf8');
    count++;
  }
  return count;
}

function syncAnvilDirectory(targetDir) {
  return syncCustomDirectory(ANVIL_CANONICAL_DIR, targetDir, ANVIL_SYNC_FILES);
}

function syncTalonDirectory(targetDir) {
  return syncCustomDirectory(TALON_CANONICAL_DIR, targetDir, TALON_SYNC_FILES);
}

function syncSentryDirectory(targetDir) {
  return syncCustomDirectory(SENTRY_CANONICAL_DIR, targetDir, SENTRY_SYNC_FILES);
}

function main() {
  console.log(`Starting synchronization for Enterprise Security Audit...`);
  if (fs.existsSync(CANONICAL_DIR)) {
    for (const targetDir of TARGET_DIRS) {
      const relativeTarget = path.relative(ROOT_DIR, targetDir);
      const synced = syncDirectory(targetDir);
      console.log(`✓ Synchronized ${synced} files to ${relativeTarget}`);
    }
  }

  console.log(`Starting synchronization for Anvil...`);
  if (fs.existsSync(ANVIL_CANONICAL_DIR)) {
    for (const targetDir of ANVIL_TARGET_DIRS) {
      const relativeTarget = path.relative(ROOT_DIR, targetDir);
      const synced = syncAnvilDirectory(targetDir);
      console.log(`✓ Synchronized ${synced} files to ${relativeTarget}`);
    }
  }

  console.log(`Starting synchronization for Talon...`);
  if (fs.existsSync(TALON_CANONICAL_DIR)) {
    for (const targetDir of TALON_TARGET_DIRS) {
      const relativeTarget = path.relative(ROOT_DIR, targetDir);
      const synced = syncTalonDirectory(targetDir);
      console.log(`✓ Synchronized ${synced} files to ${relativeTarget}`);
    }
  }

  console.log(`Starting synchronization for Sentry Code Review...`);
  if (fs.existsSync(SENTRY_CANONICAL_DIR)) {
    for (const targetDir of SENTRY_TARGET_DIRS) {
      const relativeTarget = path.relative(ROOT_DIR, targetDir);
      const synced = syncSentryDirectory(targetDir);
      console.log(`✓ Synchronized ${synced} files to ${relativeTarget}`);
    }
  }

  console.log('Skill synchronization completed successfully.');
}

if (require.main === module) {
  main();
}

module.exports = {
  CANONICAL_DIR,
  TARGET_DIRS,
  SYNC_FILES,
  syncDirectory,
  ANVIL_CANONICAL_DIR,
  ANVIL_TARGET_DIRS,
  ANVIL_SYNC_FILES,
  syncAnvilDirectory,
  TALON_CANONICAL_DIR,
  TALON_TARGET_DIRS,
  TALON_SYNC_FILES,
  syncTalonDirectory,
  SENTRY_CANONICAL_DIR,
  SENTRY_TARGET_DIRS,
  SENTRY_SYNC_FILES,
  syncSentryDirectory,
};
