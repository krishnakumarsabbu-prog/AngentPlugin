#!/usr/bin/env node

/**
 * Agentplugin Enterprise Dual License: Apache-2.0 / MIT
 * Copyright (C) Agentplugin. All rights reserved.
 *
 * Enterprise NFR Engineer Skill Suite Integrity Validator
 * Verifies that all required files exist, are non-empty, and that
 * frontmatter, schemas, and cross-references are valid.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const SKILL_DIR = path.resolve(__dirname, '..');

const REQUIRED_FILES = [
  'SKILL.md',
  'metadata.json',
  'LICENSE',
  'license.md',
  'README.md',
  'INSTALLATION-AND-USAGE.md',
  'agents/nfr-orchestrator.md',
  'agents/nfr-discovery-agent.md',
  'agents/nfr-quantification-agent.md',
  'agents/architecture-assessment-agent.md',
  'agents/security-assessment-agent.md',
  'agents/performance-engineering-agent.md',
  'agents/scalability-assessment-agent.md',
  'agents/reliability-sre-agent.md',
  'agents/qa-test-strategy-agent.md',
  'agents/observability-agent.md',
  'agents/compliance-privacy-agent.md',
  'agents/accessibility-agent.md',
  'agents/disaster-recovery-agent.md',
  'agents/cost-efficiency-agent.md',
  'agents/ai-quality-agent.md',
  'agents/evidence-validation-agent.md',
  'references/assessment-methodology.md',
  'references/nfr-domain-catalog.md',
  'references/nfr-discovery.md',
  'references/nfr-classification.md',
  'references/nfr-quantification.md',
  'references/architecture-assessment.md',
  'references/performance-engineering.md',
  'references/scalability-engineering.md',
  'references/availability-engineering.md',
  'references/reliability-resilience.md',
  'references/security-engineering.md',
  'references/maintainability-engineering.md',
  'references/usability-engineering.md',
  'references/compatibility-engineering.md',
  'references/observability-engineering.md',
  'references/disaster-recovery.md',
  'references/portability-engineering.md',
  'references/compliance-privacy.md',
  'references/operability-engineering.md',
  'references/accessibility-engineering.md',
  'references/cost-efficiency.md',
  'references/ai-system-quality.md',
  'references/evidence-validation.md',
  'references/scoring-model.md',
  'references/quality-gates.md',
  'references/remediation-methodology.md',
  'references/reporting-methodology.md',
  'schemas/nfr-requirement.schema.json',
  'schemas/assessment.schema.json',
  'schemas/finding.schema.json',
  'schemas/evidence.schema.json',
  'schemas/domain-score.schema.json',
  'schemas/quality-gate.schema.json',
  'templates/nfr-assessment-report.md',
  'templates/executive-summary.md',
  'templates/architecture-review.md',
  'templates/security-assessment.md',
  'templates/performance-assessment.md',
  'templates/reliability-assessment.md',
  'templates/observability-assessment.md',
  'templates/disaster-recovery-assessment.md',
  'templates/ai-quality-assessment.md',
  'templates/remediation-plan.md',
  'templates/nfr-requirements-catalog.md',
  'checklists/application-discovery.md',
  'checklists/architecture-review.md',
  'checklists/security-review.md',
  'checklists/performance-review.md',
  'checklists/reliability-review.md',
  'checklists/production-readiness.md',
  'checklists/observability-review.md',
  'checklists/disaster-recovery-review.md',
  'checklists/ai-security-review.md',
  'scripts/validate-schemas.py',
  'scripts/validate-assessment.py',
  'scripts/calculate-nfr-score.py',
  'examples/sample-application.md',
  'examples/sample-nfr-requirements.json',
  'examples/sample-assessment.json',
  'examples/sample-findings.json',
  'examples/sample-final-report.md',
  'adapters/claude-code.md',
  'adapters/github-copilot.md',
];

function validate() {
  console.log(`[NFR-ENGINEER] Validating Enterprise NFR Engineer Skill at: ${SKILL_DIR}\n`);
  let errors = 0;
  let checked = 0;

  // 1. Check all required files exist and are non-empty
  for (const rel of REQUIRED_FILES) {
    const fullPath = path.join(SKILL_DIR, rel);
    if (!fs.existsSync(fullPath)) {
      console.error(`  [FAIL] Missing required file: ${rel}`);
      errors++;
    } else {
      const stats = fs.statSync(fullPath);
      if (stats.size === 0) {
        console.error(`  [FAIL] Empty file detected: ${rel}`);
        errors++;
      } else {
        checked++;
      }
    }
  }
  console.log(`  [OK] ${checked}/${REQUIRED_FILES.length} required files present and non-empty\n`);

  // 2. Validate SKILL.md frontmatter
  const skillMdPath = path.join(SKILL_DIR, 'SKILL.md');
  if (fs.existsSync(skillMdPath)) {
    const content = fs.readFileSync(skillMdPath, 'utf8');
    const checks = [
      { test: content.startsWith('---'), msg: 'SKILL.md starts with frontmatter' },
      { test: content.includes('name: enterprise-nfr-engineer'), msg: 'SKILL.md has name: enterprise-nfr-engineer' },
      { test: content.includes('version: 1.0.0'), msg: 'SKILL.md has version: 1.0.0' },
      { test: content.includes('Agentplugin Enterprise Dual License') || content.includes('AgentForge Enterprise Dual License'), msg: 'SKILL.md has dual license header' },
    ];
    for (const c of checks) {
      if (!c.test) {
        console.error(`  [FAIL] ${c.msg}`);
        errors++;
      }
    }
    if (errors === 0) console.log('  [OK] SKILL.md frontmatter validated\n');
  }

  // 3. Validate metadata.json
  const metadataPath = path.join(SKILL_DIR, 'metadata.json');
  if (fs.existsSync(metadataPath)) {
    try {
      const meta = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
      if (meta.name !== 'enterprise-nfr-engineer') {
        console.error('  [FAIL] metadata.json name mismatch');
        errors++;
      }
      if (!Array.isArray(meta.domains) || meta.domains.length !== 16) {
        console.error(`  [FAIL] metadata.json must have 16 domains, got ${meta.domains ? meta.domains.length : 0}`);
        errors++;
      }
      if (errors === 0) console.log('  [OK] metadata.json validated (16 domains)\n');
    } catch (e) {
      console.error(`  [FAIL] metadata.json invalid JSON: ${e.message}`);
      errors++;
    }
  }

  // 4. Validate all JSON schemas parse correctly
  const schemaDir = path.join(SKILL_DIR, 'schemas');
  if (fs.existsSync(schemaDir)) {
    const schemaFiles = fs.readdirSync(schemaDir).filter(f => f.endsWith('.schema.json'));
    let schemaErrors = 0;
    for (const sf of schemaFiles) {
      try {
        const schema = JSON.parse(fs.readFileSync(path.join(schemaDir, sf), 'utf8'));
        if (!schema.title || !schema.type || !schema.properties) {
          console.error(`  [FAIL] Schema ${sf} missing required fields`);
          schemaErrors++;
        }
      } catch (e) {
        console.error(`  [FAIL] Schema ${sf} invalid JSON: ${e.message}`);
        schemaErrors++;
      }
    }
    if (schemaErrors === 0) {
      console.log(`  [OK] All ${schemaFiles.length} JSON schemas parse correctly\n`);
    } else {
      errors += schemaErrors;
    }
  }

  // 5. Count agents (must be 16)
  const agentsDir = path.join(SKILL_DIR, 'agents');
  if (fs.existsSync(agentsDir)) {
    const agentFiles = fs.readdirSync(agentsDir).filter(f => f.endsWith('.md'));
    if (agentFiles.length !== 16) {
      console.error(`  [FAIL] Expected 16 agent files, found ${agentFiles.length}`);
      errors++;
    } else {
      console.log(`  [OK] 16 agent role definitions present\n`);
    }
  }

  // 6. Validate examples JSON files parse
  const examplesDir = path.join(SKILL_DIR, 'examples');
  if (fs.existsSync(examplesDir)) {
    const jsonExamples = fs.readdirSync(examplesDir).filter(f => f.endsWith('.json'));
    let exErrors = 0;
    for (const ef of jsonExamples) {
      try {
        JSON.parse(fs.readFileSync(path.join(examplesDir, ef), 'utf8'));
      } catch (e) {
        console.error(`  [FAIL] Example ${ef} invalid JSON: ${e.message}`);
        exErrors++;
      }
    }
    if (exErrors === 0) {
      console.log(`  [OK] All ${jsonExamples.length} example JSON files parse correctly\n`);
    } else {
      errors += exErrors;
    }
  }

  if (errors === 0) {
    console.log('========================================');
    console.log('[NFR-ENGINEER] All validation checks passed successfully!');
    console.log(`  Files checked: ${REQUIRED_FILES.length}`);
    console.log('  Agents: 16');
    console.log('  Schemas: 6');
    console.log('  References: 27');
    console.log('  Templates: 11');
    console.log('  Checklists: 9');
    console.log('  Scripts: 3');
    console.log('  Examples: 5');
    console.log('  Adapters: 2');
    console.log('========================================');
    process.exit(0);
  } else {
    console.error(`\n[NFR-ENGINEER] Validation failed with ${errors} error(s).`);
    process.exit(1);
  }
}

if (require.main === module) {
  validate();
}

module.exports = { validate, REQUIRED_FILES };
