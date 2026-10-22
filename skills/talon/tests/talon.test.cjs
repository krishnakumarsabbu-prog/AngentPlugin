/**
 * Talon Suite Unit Tests
 * Verifies vulnerability detection rules, secret scrubbing, HTTP header auditing, and PoC synthesis.
 */

'use strict';

const assert = require('assert');
const {
  auditCode,
  redactSecrets,
  auditHttpHeaders,
  generatePoC,
} = require('../scripts/talon-auditor.cjs');

console.log('Running Talon Suite Unit Tests...\n');

// 1. SQL Injection Detection
{
  const vulnerableCode = `
    async function getUser(req, res) {
      const query = "SELECT * FROM users WHERE email = '" + req.body.email + "'";
      const user = await db.query(query);
      return res.json(user);
    }
  `;
  const findings = auditCode(vulnerableCode, 'userController.js');
  assert.ok(findings.some(f => f.cwe === 'CWE-89'), 'Must detect SQL Injection');
  console.log('✓ auditCode detects SQL Injection (CWE-89)');
}

// 2. Command Injection Detection
{
  const vulnerableCode = `
    const { exec } = require('child_process');
    function pingHost(host) {
      exec("ping -c 1 " + host, (err, stdout) => console.log(stdout));
    }
  `;
  const findings = auditCode(vulnerableCode, 'network.js');
  assert.ok(findings.some(f => f.cwe === 'CWE-78'), 'Must detect Command Injection');
  console.log('✓ auditCode detects Command Injection (CWE-78)');
}

// 3. DOM XSS Detection
{
  const vulnerableCode = `
    function renderProfile() {
      document.getElementById('name').innerHTML = location.hash;
    }
  `;
  const findings = auditCode(vulnerableCode, 'profile.js');
  assert.ok(findings.some(f => f.cwe === 'CWE-79'), 'Must detect DOM XSS');
  console.log('✓ auditCode detects DOM XSS (CWE-79)');
}

// 4. Hardcoded Credentials Detection
{
  const vulnerableCode = `
    const config = {
      apiKey: "sk-proj-1234567890abcdef1234567890",
      dbPassword: "supersecretpassword123456"
    };
  `;
  const findings = auditCode(vulnerableCode, 'config.js');
  assert.ok(findings.some(f => f.cwe === 'CWE-798'), 'Must detect Hardcoded Credentials');
  console.log('✓ auditCode detects Hardcoded Credentials (CWE-798)');
}

// 5. Secret Redaction
{
  const rawLog = 'Connecting with token: ghp_1234567890abcdefghijklmnopqrstuvwxyz and sk-abcdef1234567890123456';
  const scrubbed = redactSecrets(rawLog);
  assert.ok(!scrubbed.includes('ghp_1234567890'), 'Must redact GitHub token');
  assert.ok(!scrubbed.includes('sk-abcdef'), 'Must redact API key');
  assert.ok(scrubbed.includes('[REDACTED_SECRET]'), 'Must insert redaction token');
  console.log('✓ redactSecrets scrubs sensitive tokens and keys');
}

// 6. HTTP Header Security Audit
{
  const badHeaders = {
    'content-type': 'application/json',
    'access-control-allow-origin': '*',
    'access-control-allow-credentials': 'true',
  };
  const issues = auditHttpHeaders(badHeaders);
  assert.ok(issues.some(i => i.header === 'Strict-Transport-Security'), 'Must flag missing HSTS');
  assert.ok(issues.some(i => i.header === 'Content-Security-Policy'), 'Must flag missing CSP');
  assert.ok(issues.some(i => i.header === 'Access-Control-Allow-Origin'), 'Must flag wildcard CORS with credentials');
  console.log('✓ auditHttpHeaders evaluates baseline security headers');
}

// 7. Non-Destructive PoC Generation
{
  const finding = {
    name: 'SQL Injection',
    cwe: 'CWE-89',
    file: 'src/db.js',
    line: 42,
    severity: 'critical'
  };
  const pocScript = generatePoC(finding, 'http://localhost:8080');
  assert.ok(pocScript.includes('Zero-Destruction Guarantee'), 'Must include safety guarantee');
  assert.ok(pocScript.includes('http://localhost:8080'), 'Must target specified host');
  assert.ok(pocScript.includes('talon_proof_verified'), 'Must use harmless proof token');
  console.log('✓ generatePoC constructs safe, reproducible test scripts');
}

console.log('\nAll 7 Talon unit test suites passed successfully!\n');
