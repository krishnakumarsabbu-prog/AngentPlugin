#!/usr/bin/env node

/**
 * Enterprise Security Audit — Comprehensive Deterministic Audit Validator
 * Validates run-metadata.json, findings.json, coverage-ledger.json,
 * source file/line existence, report-to-JSON consistency, and completion contracts.
 */

const fs = require('fs');
const path = require('path');

const reportSchema = require('./report-schema.json');
const metadataSchema = require('./metadata-schema.json');
const { validateDocument: validateFindings } = require('./validate-findings.cjs');
const { validateDocument: validateLedger } = require('./validate-coverage-ledger.cjs');

function safeReadJson(filePath) {
  try {
    if (!fs.existsSync(filePath)) return { error: `File not found: ${filePath}` };
    const content = fs.readFileSync(filePath, 'utf8');
    return { data: JSON.parse(content) };
  } catch (err) {
    return { error: `Malformed JSON in ${filePath}: ${err.message}` };
  }
}

function validateMetadata(metadata) {
  const errors = [];
  if (!metadata || typeof metadata !== 'object') {
    return ['metadata: must be an object'];
  }

  for (const field of metadataSchema.required) {
    if (metadata[field] === undefined) {
      errors.push(`metadata: missing required field "${field}"`);
    }
  }

  if (metadata.run_status === 'incomplete' && (!metadata.incomplete_reason || typeof metadata.incomplete_reason !== 'string')) {
    errors.push('metadata: run_status "incomplete" requires an explicit "incomplete_reason"');
  }

  if (metadata.mode === 'execution-validation' && metadata.sandbox_available === false) {
    errors.push('metadata: execution safety violation: execution-validation mode cannot be enabled when sandbox_available is false');
  }

  if (metadata.dirty_worktree === true && (!Array.isArray(metadata.uncommitted_files) || metadata.uncommitted_files.length === 0)) {
    errors.push('metadata: dirty_worktree is true but uncommitted_files is empty or missing');
  }

  return errors;
}

function validateSourceLocations(findings, repoRoot) {
  const errors = [];
  if (!repoRoot || !fs.existsSync(repoRoot)) {
    return errors; // Skip disk check if target repoRoot not provided
  }

  for (let i = 0; i < findings.length; i++) {
    const finding = findings[i];
    const prefix = `findings[${i}] (${finding.fingerprint || 'unknown'})`;

    // Check trace locations
    if (Array.isArray(finding.trace)) {
      finding.trace.forEach((t, tidx) => {
        const fullPath = path.join(repoRoot, t.file);
        if (!fs.existsSync(fullPath)) {
          errors.push(`${prefix}.trace[${tidx}]: file does not exist in target workspace: "${t.file}"`);
        } else if (Number.isInteger(t.line)) {
          const lines = fs.readFileSync(fullPath, 'utf8').split('\n').length;
          if (t.line < 1 || t.line > lines) {
            errors.push(`${prefix}.trace[${tidx}]: line ${t.line} out of bounds (file has ${lines} lines): "${t.file}"`);
          }
        }
      });
    }

    // Check evidence locations
    if (Array.isArray(finding.evidence)) {
      finding.evidence.forEach((e, eidx) => {
        const fullPath = path.join(repoRoot, e.file);
        if (!fs.existsSync(fullPath)) {
          errors.push(`${prefix}.evidence[${eidx}]: file does not exist in target workspace: "${e.file}"`);
        } else if (Number.isInteger(e.line)) {
          const lines = fs.readFileSync(fullPath, 'utf8').split('\n').length;
          if (e.line < 1 || e.line > lines) {
            errors.push(`${prefix}.evidence[${eidx}]: line ${e.line} out of bounds (file has ${lines} lines): "${e.file}"`);
          }
        }
      });
    }
  }

  return errors;
}

function validateReportConsistency(findings, runDir) {
  const errors = [];
  const reportPath = path.join(runDir, 'REPORT.md');
  const detailPath = path.join(runDir, 'FINDINGS-DETAIL.md');
  const needsValPath = path.join(runDir, 'NEEDS-VALIDATION.md');

  if (!fs.existsSync(reportPath)) errors.push('Missing REPORT.md in run directory');
  if (!fs.existsSync(detailPath)) errors.push('Missing FINDINGS-DETAIL.md in run directory');
  if (!fs.existsSync(needsValPath)) errors.push('Missing NEEDS-VALIDATION.md in run directory');

  if (errors.length > 0) return errors;

  const reportText = fs.readFileSync(reportPath, 'utf8');
  const detailText = fs.readFileSync(detailPath, 'utf8');
  const needsValText = fs.readFileSync(needsValPath, 'utf8');

  for (const finding of findings) {
    const fp = finding.fingerprint;
    if (finding.verdict === 'confirmed') {
      if (!reportText.includes(fp)) {
        errors.push(`REPORT.md: missing confirmed finding fingerprint "${fp}"`);
      }
      if (!detailText.includes(fp)) {
        errors.push(`FINDINGS-DETAIL.md: missing confirmed finding detail for "${fp}"`);
      }
      const overallSev = finding.severity?.overall_severity;
      if (overallSev && !reportText.toLowerCase().includes(overallSev.toLowerCase())) {
        errors.push(`REPORT.md: severity for "${fp}" does not reflect "${overallSev}"`);
      }
    } else if (finding.verdict === 'needs_validation') {
      if (!needsValText.includes(fp)) {
        errors.push(`NEEDS-VALIDATION.md: missing unresolved candidate fingerprint "${fp}"`);
      }
      if (reportText.includes(`Confirmed Vulnerabilities`) && reportText.includes(fp)) {
        // Disallow needs_validation in confirmed section
        const confirmedSection = reportText.split(/##.*Confirmed/i)[1]?.split(/##/)[0] || '';
        if (confirmedSection.includes(fp)) {
          errors.push(`REPORT.md: needs_validation finding "${fp}" erroneously listed in Confirmed section`);
        }
      }
    } else if (finding.verdict === 'rejected') {
      const confirmedSection = reportText.split(/##.*Confirmed/i)[1]?.split(/##/)[0] || '';
      if (confirmedSection.includes(fp)) {
        errors.push(`REPORT.md: rejected candidate "${fp}" erroneously listed in Confirmed section`);
      }
    }
  }

  return errors;
}

function validateAuditRun(runDir, options = {}) {
  const result = {
    valid: false,
    errors: [],
    warnings: [],
    completionStatus: 'unknown'
  };

  const metadataFile = path.join(runDir, 'run-metadata.json');
  const findingsFile = path.join(runDir, 'findings.json');
  const ledgerFile = path.join(runDir, 'coverage-ledger.json');

  const metaRes = safeReadJson(metadataFile);
  if (metaRes.error) result.errors.push(metaRes.error);

  const findingsRes = safeReadJson(findingsFile);
  if (findingsRes.error) result.errors.push(findingsRes.error);

  const ledgerRes = safeReadJson(ledgerFile);
  if (ledgerRes.error) result.errors.push(ledgerRes.error);

  if (result.errors.length > 0) return result;

  const metadata = metaRes.data;
  const findings = findingsRes.data;
  const ledger = ledgerRes.data;

  result.completionStatus = metadata.run_status || 'unknown';

  // 1. Metadata Schema Validation
  const metaErrors = validateMetadata(metadata);
  result.errors.push(...metaErrors);

  // 2. Findings Schema Validation
  const findingErrors = validateFindings(findings, reportSchema);
  result.errors.push(...findingErrors);

  // 3. Coverage Ledger Validation
  const ledgerErrors = validateLedger(ledger);
  result.errors.push(...ledgerErrors);

  // 4. Source Location Validation (if repo root provided)
  const repoRoot = options.target || metadata.target;
  if (repoRoot) {
    const locationErrors = validateSourceLocations(findings, repoRoot);
    result.errors.push(...locationErrors);
  }

  // 5. Report Consistency Validation
  const reportErrors = validateReportConsistency(findings, runDir);
  result.errors.push(...reportErrors);

  // 6. Completion Contract Validation
  if (metadata.run_status === 'complete') {
    if (result.errors.length > 0) {
      result.errors.push(`Completion Contract Violation: run_status is "complete" but mandatory validation checks failed`);
    }
  }

  result.valid = result.errors.length === 0;
  return result;
}

function main() {
  const args = process.argv.slice(2);
  if (args.length === 0 || args.includes('--help')) {
    console.log('Usage: node validate-audit.cjs <path-to-run-directory> [--target <target-repo-directory>]');
    process.exit(1);
  }

  const runDir = path.resolve(args[0]);
  let target = null;
  const targetIdx = args.indexOf('--target');
  if (targetIdx !== -1 && args[targetIdx + 1]) {
    target = path.resolve(args[targetIdx + 1]);
  }

  const report = validateAuditRun(runDir, { target });
  if (report.valid) {
    console.log(`✓ Audit run validation passed for: ${runDir} (Status: ${report.completionStatus})`);
    process.exit(0);
  } else {
    console.error(`✖ Audit run validation failed with ${report.errors.length} errors:`);
    report.errors.forEach(err => console.error(`  - ${err}`));
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  validateAuditRun,
  validateMetadata,
  validateSourceLocations,
  validateReportConsistency
};
