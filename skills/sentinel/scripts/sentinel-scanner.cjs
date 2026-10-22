#!/usr/bin/env node

/**
 * AgentForge Enterprise Dual License: Apache-2.0 / MIT
 * Copyright (C) AgentForge Engineering. All rights reserved.
 * Adapted with attribution from JPeetz/agent-skills (OWASP Agentic Skills Top 10).
 * Licensed under the Apache License, Version 2.0 or the MIT License.
 *
 * Sentinel Security Scanner — High-Performance Node.js Engine (forge-sentinel)
 */

'use strict';

const fs = require('fs');
const path = require('path');

const SEVERITY_WEIGHTS = {
  critical: 25,
  high: 15,
  medium: 8,
  low: 3,
  info: 0,
};

const SECRET_PATTERNS = [
  /sk-[a-zA-Z0-9_-]{20,}/g,
  /sk-ant-[a-zA-Z0-9_-]{20,}/g,
  /ghp_[a-zA-Z0-9]{36}/g,
  /gho_[a-zA-Z0-9]{36}/g,
  /ghs_[a-zA-Z0-9]{36}/g,
  /AKIA[0-9A-Z]{16}/g,
  /eyJ[A-Za-z0-9-_]{10,}\.[A-Za-z0-9-_]{10,}\.[A-Za-z0-9-_.]+/g,
  /-----BEGIN [A-Z ]+ PRIVATE KEY-----/g,
];

function redactSecrets(text) {
  if (typeof text !== 'string') return text;
  let out = text;
  for (const pattern of SECRET_PATTERNS) {
    out = out.replace(pattern, '[REDACTED_SECRET]');
  }
  return out;
}

function validatePath(inputPath) {
  const normalized = inputPath.replace(/\\/g, '/');
  const blockedTokens = ['..', '%2e%2e', '\0'];
  for (const token of blockedTokens) {
    if (normalized.includes(token)) {
      throw new Error(`Security Guardrail Violation: Path traversal token '${token}' detected.`);
    }
  }

  const parts = normalized.split('/').map(p => p.toLowerCase());
  const sensitiveNames = ['.git', '.env', 'id_rsa', 'id_ed25519', 'credentials', 'secrets'];
  for (const part of parts) {
    for (const name of sensitiveNames) {
      if (part === name || part.startsWith(name)) {
        throw new Error(`Security Guardrail Violation: Access to sensitive path '${name}' is restricted.`);
      }
    }
  }

  return path.resolve(inputPath);
}

const DANGEROUS_PATTERNS = [
  {
    regex: /curl\s+.*\|\s*(?:ba)?sh/i,
    astId: 'AST01',
    severity: 'critical',
    title: 'Remote Pipe-to-Shell Detected',
    remediation: 'Remove remote pipe-to-shell; use verified local scripts.',
  },
  {
    regex: /wget\s+.*\|\s*(?:ba)?sh/i,
    astId: 'AST01',
    severity: 'critical',
    title: 'Wget Pipe-to-Shell Detected',
    remediation: 'Download script, verify integrity hash, and execute in sandbox.',
  },
  {
    regex: /eval\s*\(.*(?:\$|process\.argv|req\.)/i,
    astId: 'AST01',
    severity: 'high',
    title: 'eval() with Dynamic Input',
    remediation: 'Replace eval() with safe deterministic parsing.',
  },
  {
    regex: /base64\s+-d.*\|/i,
    astId: 'AST01',
    severity: 'high',
    title: 'Base64 Decode Piped to Command Execution',
    remediation: 'Remove obfuscated payload execution.',
  },
  {
    regex: /(?:ignore|disregard|override)\s+(?:all\s+)?(?:previous|prior)\s+instructions/i,
    astId: 'AST02',
    severity: 'high',
    title: 'Instruction Override Pattern in Prompt',
    remediation: 'Isolate user input in delimited delimiters and reject instruction overrides.',
  },
  {
    regex: /(?:bypass|disable)\s+(?:safety|security|guardrails)/i,
    astId: 'AST02',
    severity: 'high',
    title: 'Safety Bypass Prompt Instruction',
    remediation: 'Enforce immutable system policy boundaries.',
  },
  {
    regex: /(?:curl|wget).*-[sS].*\$\{?(?:API_KEY|TOKEN|SECRET|PASSWORD)/i,
    astId: 'AST03',
    severity: 'critical',
    title: 'Potential Secret Exfiltration in Network Call',
    remediation: 'Never include secrets or environment tokens in external requests.',
  },
  {
    regex: /(?:\.env|credentials|secrets).*>\s*(?:\/tmp|\/dev\/tcp)/i,
    astId: 'AST03',
    severity: 'high',
    title: 'Writing Secrets to Insecure Location or Socket',
    remediation: 'Use secure local credential stores with least-privilege permissions.',
  },
  {
    regex: /subprocess\.(?:call|run|Popen)\s*\(.*shell\s*=\s*True/i,
    astId: 'AST06',
    severity: 'high',
    title: 'Subprocess with shell=True',
    remediation: 'Use shell=False with explicit argument lists.',
  },
  {
    regex: /child_process\.(?:exec|execSync)\s*\(/i,
    astId: 'AST06',
    severity: 'high',
    title: 'Unsanitized Shell Command Execution',
    remediation: 'Use execFile or spawn with parameter arrays instead of raw shell concatenation.',
  },
];

const PROTECTED_FILES = ['SOUL.md', 'MEMORY.md', 'AGENTS.md', 'IDENTITY.md', 'USER.md'];

function scanDirectory(targetDir) {
  const dirPath = validatePath(targetDir);
  if (!fs.existsSync(dirPath)) {
    throw new Error(`Target directory not found: ${targetDir}`);
  }

  const findings = [];
  const warnings = [];
  const skillName = path.basename(dirPath);

  const skillMdPath = path.join(dirPath, 'SKILL.md');
  if (!fs.existsSync(skillMdPath)) {
    findings.push({
      astId: 'AST07',
      title: 'Missing SKILL.md',
      severity: 'critical',
      file: skillName,
      line: 0,
      description: 'No SKILL.md file found — skill is missing its canonical manifest.',
      remediation: 'Create a SKILL.md file with required AgentForge YAML frontmatter.',
    });
    return {
      skill: skillName,
      score: 100,
      riskTier: 'Critical',
      findings,
      warnings,
    };
  }

  const skillContent = fs.readFileSync(skillMdPath, 'utf8');
  const parts = skillContent.split('---');
  const frontmatter = parts.length >= 3 ? parts[1] : skillContent;
  const lowerFrontmatter = frontmatter.toLowerCase();

  // 1. Frontmatter Validation (AST07)
  if (!skillContent.startsWith('---')) {
    findings.push({
      astId: 'AST07',
      title: 'Missing YAML Frontmatter',
      severity: 'high',
      file: 'SKILL.md',
      line: 1,
      description: 'SKILL.md must start with YAML frontmatter header.',
      remediation: 'Add --- delimited YAML frontmatter with metadata.',
    });
  } else {
    for (const field of ['name:', 'version:', 'description:']) {
      if (!frontmatter.includes(field)) {
        findings.push({
          astId: 'AST07',
          title: `Missing Field: ${field.replace(':', '')}`,
          severity: 'medium',
          file: 'SKILL.md',
          line: 0,
          description: `Frontmatter missing required field '${field.replace(':', '')}'.`,
          remediation: `Add '${field}' to YAML frontmatter.`,
        });
      }
    }
  }

  // 2. Permissions (AST04, AST08, AST09)
  if (!lowerFrontmatter.includes('permissions:')) {
    findings.push({
      astId: 'AST04',
      title: 'Missing Permissions Declaration',
      severity: 'high',
      file: 'SKILL.md',
      line: 0,
      description: 'No permissions block found — skill may have unrestricted access.',
      remediation: 'Add explicit permissions.files and permissions.network blocks.',
    });
  } else {
    if (/read:\s*\[.*["']\*["']/i.test(frontmatter)) {
      findings.push({
        astId: 'AST04',
        title: 'Wildcard File Read Permission',
        severity: 'high',
        file: 'SKILL.md',
        line: 0,
        description: 'Unrestricted file read access violates least privilege.',
        remediation: 'Specify explicit file paths instead of wildcards.',
      });
    }

    if (/write:\s*\[.*["']\*["']/i.test(frontmatter)) {
      findings.push({
        astId: 'AST08',
        title: 'Wildcard File Write Permission',
        severity: 'critical',
        file: 'SKILL.md',
        line: 0,
        description: 'Unrestricted file write access can modify any workspace file.',
        remediation: 'Specify explicit write paths; add deny_write for protected files.',
      });
    }

    if (lowerFrontmatter.includes('deny_write:')) {
      for (const protectedFile of PROTECTED_FILES) {
        if (!lowerFrontmatter.includes(protectedFile.toLowerCase())) {
          warnings.push(`Protected file '${protectedFile}' not in deny_write list.`);
        }
      }
    } else {
      findings.push({
        astId: 'AST08',
        title: 'Missing deny_write for Protected Files',
        severity: 'medium',
        file: 'SKILL.md',
        line: 0,
        description: 'No deny_write list — identity files like SOUL.md may be modified.',
        remediation: 'Add deny_write with protected identity files.',
      });
    }

    if (lowerFrontmatter.includes('network:')) {
      if (/allow:\s*\[.*["']\*["']/i.test(frontmatter)) {
        findings.push({
          astId: 'AST09',
          title: 'Wildcard Network Allowlist',
          severity: 'high',
          file: 'SKILL.md',
          line: 0,
          description: 'Network allowlist contains wildcard — unrestricted egress.',
          remediation: 'Specify explicit domain allowlists; use deny: "*" as default.',
        });
      }
      if (!lowerFrontmatter.includes('deny:') || !frontmatter.includes('"*"')) {
        warnings.push("Network deny not set to '*' — non-allowlisted domains may be accessible.");
      }
    } else {
      findings.push({
        astId: 'AST09',
        title: 'Missing Network Permissions Declaration',
        severity: 'medium',
        file: 'SKILL.md',
        line: 0,
        description: 'No network permissions block — egress may be unrestricted.',
        remediation: 'Add permissions.network with allow/deny domain lists.',
      });
    }
  }

  // 3. Scan files recursively
  function walkDir(cur) {
    const entries = fs.readdirSync(cur, { withFileTypes: true });
    for (const ent of entries) {
      const full = path.join(cur, ent.name);
      if (ent.isDirectory()) {
        if (ent.name !== 'node_modules' && ent.name !== '.git' && ent.name !== 'evals' && ent.name !== 'tests') {
          walkDir(full);
        }
      } else if (ent.isFile()) {
        const ext = path.extname(ent.name).toLowerCase();
        if (['.md', '.py', '.sh', '.js', '.cjs', '.ts', '.yaml', '.yml', '.json'].includes(ext)) {
          scanFile(full, dirPath, findings);
        }
      }
    }
  }

  walkDir(dirPath);

  // 4. Integrity check (AST07)
  if (!skillContent.includes('content_hash:') && !skillContent.includes('signature:')) {
    findings.push({
      astId: 'AST07',
      title: 'Missing Content Integrity Fields',
      severity: 'low',
      file: 'SKILL.md',
      line: 0,
      description: 'No content_hash or signature found — skill cannot be verified.',
      remediation: 'Add content_hash (SHA-256) and signature (Ed25519) to frontmatter.',
    });
  }

  let totalScore = 0;
  for (const f of findings) {
    totalScore += SEVERITY_WEIGHTS[f.severity] || 0;
  }
  const score = Math.min(totalScore, 100);

  let riskTier = 'L0 (Safe)';
  if (score > 80) riskTier = 'Critical';
  else if (score > 60) riskTier = 'L3 (High)';
  else if (score > 40) riskTier = 'L2 (Elevated)';
  else if (score > 20) riskTier = 'L1 (Low)';

  return {
    skill: skillName,
    score,
    riskTier,
    findings,
    warnings,
  };
}

function scanFile(filePath, rootDir, findings) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    const relPath = path.relative(rootDir, filePath).replace(/\\/g, '/');

    const isMarkdown = filePath.endsWith('.md');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();
      // Skip self-referencing pattern constants
      if (line.includes('DANGEROUS_PATTERNS') || line.includes('regex: /') || (line.includes('AST0') && line.includes('pattern'))) {
        continue;
      }
      // Skip markdown documentation lines that describe detection rules
      if (isMarkdown) {
        if (trimmed.startsWith('- **Detection:**') ||
            trimmed.startsWith('- **Risk:**') ||
            trimmed.startsWith('- **CVE') ||
            trimmed.startsWith('#') ||
            trimmed.startsWith('|') ||
            trimmed.startsWith('<!--') ||
            trimmed.startsWith('-->')) {
          continue;
        }
      }

      for (const rule of DANGEROUS_PATTERNS) {
        if (rule.regex.test(line)) {
          findings.push({
            astId: rule.astId,
            title: rule.title,
            severity: rule.severity,
            file: relPath,
            line: i + 1,
            description: `Detected in line: ${line.trim().slice(0, 100)}`,
            remediation: rule.remediation,
          });
        }
      }
    }
  } catch {
    // Ignore read errors
  }
}

function formatSarif(result) {
  const sarif = {
    version: '2.1.0',
    $schema: 'https://json.schemastore.org/sarif-2.1.0.json',
    runs: [{
      tool: {
        driver: {
          name: 'Sentinel Security Scanner (forge-sentinel)',
          version: '1.0.0',
          informationUri: 'https://github.com/agentforge/skills/sentinel',
          rules: Array.from({ length: 10 }, (_, i) => ({
            id: `AST${String(i + 1).padStart(2, '0')}`,
            name: `OWASP AST${String(i + 1).padStart(2, '0')}`,
          })),
        },
      },
      results: result.findings.map(f => ({
        ruleId: f.astId,
        level: ['critical', 'high'].includes(f.severity) ? 'error' : 'warning',
        message: { text: f.description },
        locations: [{
          physicalLocation: {
            artifactLocation: { uri: f.file },
            region: { startLine: f.line || 1 },
          },
        }],
        properties: {
          remediation: f.remediation,
          severity: f.severity,
        },
      })),
    }],
  };
  return redactSecrets(JSON.stringify(sarif, null, 2));
}

function formatJson(result) {
  return redactSecrets(JSON.stringify(result, null, 2));
}

function formatText(result) {
  const lines = [
    `🔍 Sentinel Security Scan Report: ${result.skill}`,
    '='.repeat(60),
    `Score: ${result.score}/100 — ${result.riskTier}`,
    `Total Findings: ${result.findings.length}`,
    `Warnings: ${result.warnings.length}`,
    '',
  ];
  if (result.findings.length > 0) {
    lines.push('Findings:');
    for (const f of result.findings) {
      lines.push(`  [${f.astId}] ${f.severity.toUpperCase()}: ${f.title}`);
      lines.push(`    File: ${f.file}:${f.line}`);
      lines.push(`    ${f.description}`);
      lines.push(`    Remediation: ${f.remediation}`);
      lines.push('');
    }
  }
  if (result.warnings.length > 0) {
    lines.push('Warnings:');
    for (const w of result.warnings) {
      lines.push(`  ⚠ ${w}`);
    }
  }
  return redactSecrets(lines.join('\n'));
}

if (require.main === module) {
  const args = process.argv.slice(2);
  let targetDir = '.';
  let fmt = 'text';
  let outFile = null;
  let maxScore = 100;
  let ci = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--dir' && args[i + 1]) targetDir = args[++i];
    else if (args[i] === '--format' && args[i + 1]) fmt = args[++i];
    else if (args[i] === '--output' && args[i + 1]) outFile = args[++i];
    else if (args[i] === '--max-score' && args[i + 1]) maxScore = parseInt(args[++i], 10);
    else if (args[i] === '--ci') ci = true;
  }

  try {
    const res = scanDirectory(targetDir);
    let out = '';
    if (fmt === 'sarif') out = formatSarif(res);
    else if (fmt === 'json') out = formatJson(res);
    else out = formatText(res);

    if (outFile) {
      fs.writeFileSync(outFile, out, 'utf8');
      console.log(`Results written to ${outFile}`);
    } else {
      console.log(out);
    }

    if (ci && res.score > maxScore) {
      console.error(`\n[CI Gate Failed] Score ${res.score} exceeds max ${maxScore}.`);
      process.exit(1);
    }
    process.exit(0);
  } catch (err) {
    console.error(`Error: ${err.message}`);
    process.exit(2);
  }
}

module.exports = {
  scanDirectory,
  redactSecrets,
  validatePath,
  formatSarif,
  formatJson,
  formatText,
};
