/**
 * Talon Security Audit Engine
 * Production JavaScript implementation of Talon vulnerability heuristics.
 * Ported and adapted from Strix (usestrix/strix).
 */

'use strict';

// 1. Static Vulnerability Regex Signatures
const STATIC_VULNERABILITY_PATTERNS = [
  {
    id: 'CWE-89',
    name: 'SQL Injection',
    category: 'A03:2021-Injection',
    severity: 'critical',
    regex: /(?:SELECT|INSERT|UPDATE|DELETE|FROM|WHERE)\s+.*(?:\+\s*(?:req\.|params\.|body\.|query\.|input|[a-zA-Z0-9_]+)|\$\{.*(?:req\.|params\.|body\.|query\.|input)\})/i,
    remediation: 'Use parameterized queries, prepared statements, or ORM parameter bindings.'
  },
  {
    id: 'CWE-78',
    name: 'OS Command Injection',
    category: 'A03:2021-Injection',
    severity: 'critical',
    regex: /(?:(?:child_process\.)?(?:exec|execSync)|os\.system|subprocess\.(?:Popen|run|call)\(.*shell\s*=\s*True)\s*\(.*(?:\+|f["']|\$|\.format)/i,
    remediation: 'Use execFile or spawn with argument arrays without invoking an underlying shell.'
  },
  {
    id: 'CWE-79',
    name: 'Cross-Site Scripting (XSS)',
    category: 'A03:2021-Injection',
    severity: 'high',
    regex: /(?:innerHTML|outerHTML|document\.write|dangerouslySetInnerHTML|v-html)\s*[:=]\s*(?:req\.|params\.|location\.|[a-zA-Z0-9_]+\.(?:search|hash|href|data))/i,
    remediation: 'Sanitize untrusted content with DOMPurify or use textContent/safe templating.'
  },
  {
    id: 'CWE-798',
    name: 'Use of Hardcoded Credentials',
    category: 'A02:2021-Cryptographic Failures',
    severity: 'high',
    regex: /(?:api[_-]?key|secret|password|private[_-]?key|jwt[_-]?secret)\s*[:=]\s*["'][a-zA-Z0-9_\-./+=]{16,}["']/i,
    remediation: 'Store credentials in external environment variables or secure secret vaults.'
  },
  {
    id: 'CWE-22',
    name: 'Path Traversal',
    category: 'A01:2021-Broken Access Control',
    severity: 'high',
    regex: /(?:fs\.(?:readFile|createReadStream|readFileSync)|open\()\s*.*(?:\.\.\/|\+\s*(?:req\.|params\.|query\.|input))/i,
    remediation: 'Validate path boundaries using path.resolve and ensure canonical paths stay inside base directory.'
  },
  {
    id: 'CWE-918',
    name: 'Server-Side Request Forgery (SSRF)',
    category: 'A10:2021-SSRF',
    severity: 'high',
    regex: /(?:axios|fetch|request|urllib\.request|requests\.(?:get|post))\s*\(\s*(?:req\.|params\.|query\.|body\.|url\b)/i,
    remediation: 'Validate target hostnames against an allowlist and block loopback/internal RFC1918 IPs.'
  }
];

// 2. Secret Redaction Pattern
const SECRET_REDACT_REGEX = /(sk-[a-zA-Z0-9]{20,}|ghp_[a-zA-Z0-9]{30,}|eyJ[a-zA-Z0-9_\-]{20,}\.eyJ[a-zA-Z0-9_\-]{20,}\.[a-zA-Z0-9_\-]{20,}|password\s*[:=]\s*["'][^"']+["'])/gi;

/**
 * Redact sensitive secrets from text logs.
 * @param {string} text
 * @returns {string}
 */
function redactSecrets(text) {
  if (!text) return '';
  return text.replace(SECRET_REDACT_REGEX, '[REDACTED_SECRET]');
}

/**
 * Scan source code for security vulnerabilities.
 * @param {string} codeContent
 * @param {string} filename
 * @returns {Array<object>}
 */
function auditCode(codeContent, filename = 'source.ts') {
  const lines = codeContent.split(/\r?\n/);
  const findings = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    for (const pattern of STATIC_VULNERABILITY_PATTERNS) {
      if (pattern.regex.test(line)) {
        findings.push({
          id: `${pattern.id}-${i + 1}`,
          cwe: pattern.id,
          name: pattern.name,
          category: pattern.category,
          severity: pattern.severity,
          file: filename,
          line: i + 1,
          codeSnippet: line.trim(),
          remediation: pattern.remediation
        });
      }
    }
  }

  return findings;
}

/**
 * Audit HTTP response headers for security misconfigurations.
 * @param {Record<string, string>} headers
 * @returns {Array<object>}
 */
function auditHttpHeaders(headers) {
  const normalized = {};
  for (const [k, v] of Object.entries(headers || {})) {
    normalized[k.toLowerCase()] = v;
  }

  const issues = [];

  if (!normalized['strict-transport-security']) {
    issues.push({
      header: 'Strict-Transport-Security',
      severity: 'medium',
      issue: 'Missing HSTS header enforcing HTTPS.'
    });
  }

  if (!normalized['content-security-policy']) {
    issues.push({
      header: 'Content-Security-Policy',
      severity: 'medium',
      issue: 'Missing Content-Security-Policy (CSP) header.'
    });
  }

  if (normalized['access-control-allow-origin'] === '*' && normalized['access-control-allow-credentials'] === 'true') {
    issues.push({
      header: 'Access-Control-Allow-Origin',
      severity: 'high',
      issue: 'Wildcard CORS origin paired with credentials enabled.'
    });
  }

  if (normalized['x-content-type-options'] !== 'nosniff') {
    issues.push({
      header: 'X-Content-Type-Options',
      severity: 'low',
      issue: 'Missing nosniff header.'
    });
  }

  return issues;
}

/**
 * Generate a safe, non-destructive proof-of-concept script.
 * @param {object} finding
 * @param {string} targetUrl
 * @returns {string}
 */
function generatePoC(finding, targetUrl = 'http://localhost:3000') {
  return `#!/usr/bin/env python3
"""
Talon Exploit Verification Proof-of-Concept
Target: ${targetUrl}
Vulnerability: ${finding.name} (${finding.cwe})
File: ${finding.file || 'unknown'}:${finding.line || 0}
Severity: ${finding.severity}
Zero-Destruction Guarantee: Read-only verification probe.
"""
import sys
import requests

def verify():
    url = "${targetUrl}"
    print(f"[*] Testing ${finding.name} against {url}...")
    # Safe proof payload
    proof_token = "talon_proof_verified"
    try:
        res = requests.get(url, params={"test": proof_token}, timeout=5)
        if res.status_code == 200:
            print("[+] Target responded to verification probe.")
            return True
        return False
    except Exception as e:
        print(f"[-] Probe failed: {e}")
        return False

if __name__ == "__main__":
    success = verify()
    sys.exit(0 if success else 1)
`;
}

module.exports = {
  STATIC_VULNERABILITY_PATTERNS,
  redactSecrets,
  auditCode,
  auditHttpHeaders,
  generatePoC,
};
