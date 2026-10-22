/**
 * Sentry Code Review Unit Tests
 * Verifies diff complexity analysis, risk scoring, anti-pattern rule matching, and markdown report synthesis.
 */

'use strict';

const assert = require('assert');
const { analyzeDiff } = require('../scripts/pr-analyzer.cjs');
const { reviewCode, formatReviewMarkdown } = require('../scripts/review-engine.cjs');

console.log('Running Sentry Code Review Unit Tests...\n');

// 1. PR Diff Analyzer Tests
{
  const sampleDiff = `
diff --git a/src/auth/login.ts b/src/auth/login.ts
index 1234567..89abcdef 100644
--- a/src/auth/login.ts
+++ b/src/auth/login.ts
@@ -10,3 +10,45 @@
+export function authenticateUser(token: string) {
+  // new login logic
+  const payload = verifyJwt(token);
+  return payload;
+}
diff --git a/src/utils/helpers.ts b/src/utils/helpers.ts
--- a/src/utils/helpers.ts
+++ b/src/utils/helpers.ts
@@ -1,2 +1,30 @@
+export const format = (str) => str.trim();
  `;

  const analysis = analyzeDiff(sampleDiff);
  assert.strictEqual(analysis.totalFiles, 2, 'Must detect 2 modified files');
  assert.ok(analysis.additions > 0, 'Must count additions');
  assert.ok(analysis.riskFlags.includes('NO_TEST_CHANGES'), 'Must flag absence of test changes');
  assert.ok(analysis.riskFlags.includes('CRITICAL_PATH_MODIFIED'), 'Must flag auth path modification');
  assert.strictEqual(analysis.risk, 'HIGH', 'Must evaluate to HIGH risk');
  console.log('✓ analyzeDiff calculates churn, flags missing tests, and identifies critical paths');
}

// 2. Review Engine: SQL Injection Detection [BLOCKING]
{
  const code = `
    const user = await db.query("SELECT * FROM users WHERE email = '" + req.body.email + "'");
  `;
  const findings = reviewCode(code, 'src/api.ts');
  const sqli = findings.find(f => f.ruleId === 'SEC-SQLI');
  assert.ok(sqli, 'Must detect SQL injection');
  assert.strictEqual(sqli.severity, 'BLOCKING', 'Must mark SQL injection as BLOCKING');
  console.log('✓ reviewCode flags SQL injection as [BLOCKING]');
}

// 3. Review Engine: Swallowed Exception Detection [WARNING]
{
  const code = `
    try {
      performSync();
    } catch (err) {}
  `;
  const findings = reviewCode(code, 'src/worker.ts');
  const swallowed = findings.find(f => f.ruleId === 'ERR-SWALLOWED');
  assert.ok(swallowed, 'Must detect swallowed error');
  assert.strictEqual(swallowed.severity, 'WARNING', 'Must mark swallowed error as WARNING');
  console.log('✓ reviewCode flags empty catch blocks as [WARNING]');
}

// 4. Review Engine: Leftover Console Debugging & TS Any [NIT]
{
  const code = `
    console.log("DEBUG: reached here", data);
    const options: any = parseInput();
  `;
  const findings = reviewCode(code, 'src/service.ts');
  const debug = findings.find(f => f.ruleId === 'QUAL-DEBUG');
  const tsAny = findings.find(f => f.ruleId === 'QUAL-TS-ANY');
  assert.ok(debug, 'Must detect console.log');
  assert.strictEqual(debug.severity, 'NIT', 'Must mark debug log as NIT');
  assert.ok(tsAny, 'Must detect any type');
  assert.strictEqual(tsAny.severity, 'NIT', 'Must mark any type as NIT');
  console.log('✓ reviewCode flags console.log and any types as [NIT]');
}

// 5. Review Engine: Markdown Report Formatting
{
  const findings = [
    {
      ruleId: 'SEC-SQLI',
      file: 'src/api.ts',
      line: 42,
      severity: 'BLOCKING',
      category: 'Security',
      message: 'Raw SQL query constructed via string concatenation.',
      codeSnippet: 'db.query("SELECT * " + input)',
      suggestion: 'Use parameterized queries.'
    },
    {
      ruleId: 'QUAL-DEBUG',
      file: 'src/api.ts',
      line: 12,
      severity: 'NIT',
      category: 'Maintainability',
      message: 'Leftover debugging console.log.',
      codeSnippet: 'console.log(input)',
      suggestion: 'Remove debug logging.'
    }
  ];

  const markdown = formatReviewMarkdown(findings);
  assert.ok(markdown.includes('Sentry Code Review Report'), 'Must have title');
  assert.ok(markdown.includes('[BLOCKING] Critical Issues'), 'Must render BLOCKING section');
  assert.ok(markdown.includes('[NIT] Polish & Hygiene'), 'Must render NIT section');
  assert.ok(markdown.includes('src/api.ts:42'), 'Must cite file line');
  console.log('✓ formatReviewMarkdown formats structured GitHub review comments');
}

console.log('\nAll 5 Sentry Code Review unit test suites passed successfully!\n');
