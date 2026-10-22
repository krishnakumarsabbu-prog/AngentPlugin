/**
 * Sentry Automated Review Engine
 * Scans code changes for anti-patterns, logic hazards, and code smells.
 * Employs [BLOCKING], [WARNING], and [NIT] classification.
 */

'use strict';

const REVIEW_RULES = [
  {
    id: 'SEC-SQLI',
    category: 'Security',
    severity: 'BLOCKING',
    regex: /(?:SELECT|INSERT|UPDATE|DELETE|FROM|WHERE)\s+.*(?:\+\s*(?:req\.|params\.|body\.|query\.|input|[a-zA-Z0-9_]+)|\$\{.*(?:req\.|params\.|body\.|query\.|input)\})/i,
    message: 'Raw SQL query constructed via string concatenation/interpolation.',
    suggestion: 'Use parameterized queries or ORM placeholders to prevent SQL Injection.'
  },
  {
    id: 'SEC-XSS',
    category: 'Security',
    severity: 'BLOCKING',
    regex: /(?:innerHTML|dangerouslySetInnerHTML|v-html)\s*[:=]\s*(?:req\.|params\.|location\.|[a-zA-Z0-9_]+\.(?:search|hash|href|data))/i,
    message: 'Untrusted data assigned directly to DOM HTML sink without sanitization.',
    suggestion: 'Sanitize content with DOMPurify or use textContent/safe templating.'
  },
  {
    id: 'SEC-SECRET',
    category: 'Security',
    severity: 'BLOCKING',
    regex: /(?:api[_-]?key|secret|password|private[_-]?key|jwt[_-]?secret)\s*[:=]\s*["'][a-zA-Z0-9_\-./+=]{16,}["']/i,
    message: 'Hardcoded secret or credential detected in source code.',
    suggestion: 'Move sensitive credentials to external environment variables.'
  },
  {
    id: 'ERR-SWALLOWED',
    category: 'Logic & Correctness',
    severity: 'WARNING',
    regex: /catch\s*\([^)]*\)\s*\{\s*\}/,
    message: 'Empty catch block silently swallows exceptions.',
    suggestion: 'Log the error with stack trace or rethrow. Never swallow errors silently.'
  },
  {
    id: 'PERF-NPLUSONE',
    category: 'Performance',
    severity: 'WARNING',
    regex: /(?:for|while)\s*\([^)]*\)\s*\{[^}]*(?:await\s+db\.|await\s+prisma\.|await\s+repository\.)/,
    message: 'Database query invoked inside an iteration loop (Potential N+1 Query).',
    suggestion: 'Batch queries using WHERE IN, JOINs, or DataLoader.'
  },
  {
    id: 'QUAL-TS-ANY',
    category: 'Code Quality',
    severity: 'NIT',
    regex: /:\s*any\b(?!\s*\[\])/,
    message: 'Explicit `any` type bypasses TypeScript type safety.',
    suggestion: 'Use `unknown` with a type guard, or specify a generic or structured interface.'
  },
  {
    id: 'QUAL-DEBUG',
    category: 'Maintainability',
    severity: 'NIT',
    regex: /(?:console\.(?:log|debug|trace)|debugger;|fmt\.Println\(|print\("DEBUG)/,
    message: 'Leftover debugging or console logging statement.',
    suggestion: 'Remove temporary debug logging before merging to production.'
  }
];

/**
 * Review code lines against Sentry review rules.
 * @param {string} code
 * @param {string} filename
 * @returns {Array<object>}
 */
function reviewCode(code, filename = 'code.ts') {
  if (!code || typeof code !== 'string') return [];

  const lines = code.split(/\r?\n/);
  const findings = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    for (const rule of REVIEW_RULES) {
      if (rule.regex.test(line)) {
        findings.push({
          ruleId: rule.id,
          file: filename,
          line: i + 1,
          severity: rule.severity,
          category: rule.category,
          message: rule.message,
          codeSnippet: line.trim(),
          suggestion: rule.suggestion
        });
      }
    }
  }

  return findings;
}

/**
 * Format findings into standard GitHub PR review markdown comments.
 * @param {Array<object>} findings
 * @returns {string}
 */
function formatReviewMarkdown(findings) {
  if (!findings || findings.length === 0) {
    return '### ✅ Sentry Code Review: Clean\n\nNo blocking issues, security hazards, or code smells detected.';
  }

  const blocking = findings.filter(f => f.severity === 'BLOCKING');
  const warnings = findings.filter(f => f.severity === 'WARNING');
  const nits = findings.filter(f => f.severity === 'NIT');

  let md = `### 🛡️ Sentry Code Review Report\n\n`;
  md += `**Findings Summary:** ${blocking.length} Blocking, ${warnings.length} Warnings, ${nits.length} Nits\n\n`;

  if (blocking.length > 0) {
    md += `#### 🚨 [BLOCKING] Critical Issues\n`;
    for (const f of blocking) {
      md += `- **${f.file}:${f.line}** (${f.category}): ${f.message}\n`;
      md += `  \`\`\`${f.file.endsWith('.py') ? 'python' : 'typescript'}\n  ${f.codeSnippet}\n  \`\`\`\n`;
      md += `  *Suggested Fix:* ${f.suggestion}\n\n`;
    }
  }

  if (warnings.length > 0) {
    md += `#### ⚠️ [WARNING] Improvements\n`;
    for (const f of warnings) {
      md += `- **${f.file}:${f.line}** (${f.category}): ${f.message}\n`;
      md += `  *Suggested Fix:* ${f.suggestion}\n\n`;
    }
  }

  if (nits.length > 0) {
    md += `#### 💡 [NIT] Polish & Hygiene\n`;
    for (const f of nits) {
      md += `- **${f.file}:${f.line}**: ${f.message} (${f.suggestion})\n`;
    }
    md += '\n';
  }

  return md;
}

module.exports = {
  REVIEW_RULES,
  reviewCode,
  formatReviewMarkdown,
};
