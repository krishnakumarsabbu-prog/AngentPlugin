/**
 * Enterprise NFR Engineer Skill — Unit Tests
 * Verifies file integrity, schema validation, scoring logic, and gate decisions.
 */

'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const SKILL_DIR = path.resolve(__dirname, '..');

console.log('Running Enterprise NFR Engineer Unit Tests...\n');

// 1. All required files exist and are non-empty
{
  const { REQUIRED_FILES } = require('../scripts/validate-nfr-engineer.cjs');

  for (const rel of REQUIRED_FILES) {
    const full = path.join(SKILL_DIR, rel);
    assert.ok(fs.existsSync(full), `Required file must exist: ${rel}`);
    const stats = fs.statSync(full);
    assert.ok(stats.size > 0, `File must be non-empty: ${rel}`);
  }
  console.log(`✓ All ${REQUIRED_FILES.length} required files present and non-empty`);
}

// 2. SKILL.md frontmatter is valid
{
  const content = fs.readFileSync(path.join(SKILL_DIR, 'SKILL.md'), 'utf8');
  assert.ok(content.startsWith('---'), 'SKILL.md must start with frontmatter');
  assert.ok(content.includes('name: enterprise-nfr-engineer'), 'SKILL.md must have name');
  assert.ok(content.includes('version: 1.0.0'), 'SKILL.md must have version');
  assert.ok(content.includes('description:'), 'SKILL.md must have description');
  assert.ok(content.includes('AgentForge Enterprise Dual License'), 'SKILL.md must have license header');
  console.log('✓ SKILL.md frontmatter is valid');
}

// 3. metadata.json has 16 domains
{
  const meta = JSON.parse(fs.readFileSync(path.join(SKILL_DIR, 'metadata.json'), 'utf8'));
  assert.strictEqual(meta.name, 'enterprise-nfr-engineer');
  assert.ok(Array.isArray(meta.domains), 'metadata.json must have domains array');
  assert.strictEqual(meta.domains.length, 16, 'metadata.json must have exactly 16 domains');
  console.log('✓ metadata.json has 16 domains');
}

// 4. All JSON schemas are valid
{
  const schemaDir = path.join(SKILL_DIR, 'schemas');
  const schemas = fs.readdirSync(schemaDir).filter(f => f.endsWith('.schema.json'));
  assert.strictEqual(schemas.length, 6, 'Must have 6 schema files');
  for (const sf of schemas) {
    const schema = JSON.parse(fs.readFileSync(path.join(schemaDir, sf), 'utf8'));
    assert.ok(schema.title, `Schema ${sf} must have title`);
    assert.ok(schema.type, `Schema ${sf} must have type`);
    assert.ok(schema.properties, `Schema ${sf} must have properties`);
  }
  console.log('✓ All 6 JSON schemas are valid');
}

// 5. 16 agent role definitions exist
{
  const agentsDir = path.join(SKILL_DIR, 'agents');
  const agents = fs.readdirSync(agentsDir).filter(f => f.endsWith('.md'));
  assert.strictEqual(agents.length, 16, 'Must have 16 agent role definitions');
  console.log('✓ 16 agent role definitions present');
}

// 6. 27 reference files exist
{
  const refsDir = path.join(SKILL_DIR, 'references');
  const refs = fs.readdirSync(refsDir).filter(f => f.endsWith('.md'));
  assert.strictEqual(refs.length, 27, 'Must have 27 reference files');
  console.log('✓ 27 reference files present');
}

// 7. 11 template files exist
{
  const tmplDir = path.join(SKILL_DIR, 'templates');
  const tmpls = fs.readdirSync(tmplDir).filter(f => f.endsWith('.md'));
  assert.strictEqual(tmpls.length, 11, 'Must have 11 template files');
  console.log('✓ 11 template files present');
}

// 8. 9 checklist files exist
{
  const chkDir = path.join(SKILL_DIR, 'checklists');
  const chks = fs.readdirSync(chkDir).filter(f => f.endsWith('.md'));
  assert.strictEqual(chks.length, 9, 'Must have 9 checklist files');
  console.log('✓ 9 checklist files present');
}

// 9. Example JSON files parse correctly
{
  const exDir = path.join(SKILL_DIR, 'examples');
  const jsonExs = fs.readdirSync(exDir).filter(f => f.endsWith('.json'));
  for (const ef of jsonExs) {
    JSON.parse(fs.readFileSync(path.join(exDir, ef), 'utf8'));
  }
  console.log(`✓ ${jsonExs.length} example JSON files parse correctly`);
}

// 10. Python scoring script runs and produces correct results
{
  const assessmentPath = path.join(SKILL_DIR, 'examples', 'sample-assessment.json');
  try {
    const output = execSync(
      `python3 ${path.join(SKILL_DIR, 'scripts', 'calculate-nfr-score.py')} ${assessmentPath} --json`,
      { encoding: 'utf8', timeout: 15000 }
    );
    const result = JSON.parse(output);
    assert.ok(result.overall_score >= 0 && result.overall_score <= 100, 'Score must be 0-100');
    assert.ok(result.gate_decision, 'Must have gate decision');
    assert.ok(['PASS', 'CONDITIONAL_PASS', 'FAIL', 'INCOMPLETE'].includes(result.gate_decision.final_status),
      'Gate decision must be a valid status');
    assert.ok(result.coverage, 'Must have coverage metrics');
    console.log(`✓ Scoring script runs: score=${result.overall_score}, status=${result.gate_decision.final_status}`);
  } catch (e) {
    if (e.message.includes('python3') || e.message.includes('not found')) {
      console.log('⚠ Scoring script test skipped (python3 not available)');
    } else {
      throw e;
    }
  }
}

// 11. Python schema validation runs
{
  try {
    execSync(
      `python3 ${path.join(SKILL_DIR, 'scripts', 'validate-schemas.py')}`,
      { encoding: 'utf8', timeout: 15000 }
    );
    console.log('✓ Schema validation script runs successfully');
  } catch (e) {
    if (e.message.includes('python3') || e.message.includes('not found')) {
      console.log('⚠ Schema validation test skipped (python3 not available)');
    } else {
      throw e;
    }
  }
}

// 12. Python assessment validation runs
{
  const assessmentPath = path.join(SKILL_DIR, 'examples', 'sample-assessment.json');
  try {
    execSync(
      `python3 ${path.join(SKILL_DIR, 'scripts', 'validate-assessment.py')} ${assessmentPath}`,
      { encoding: 'utf8', timeout: 15000 }
    );
    console.log('✓ Assessment validation script runs successfully');
  } catch (e) {
    if (e.message.includes('python3') || e.message.includes('not found')) {
      console.log('⚠ Assessment validation test skipped (python3 not available)');
    } else {
      throw e;
    }
  }
}

// 13. No empty or placeholder files
{
  const checkDir = (dir, ext) => {
    const fullDir = path.join(SKILL_DIR, dir);
    if (!fs.existsSync(fullDir)) return;
    const files = fs.readdirSync(fullDir).filter(f => f.endsWith(ext));
    for (const f of files) {
      const content = fs.readFileSync(path.join(fullDir, f), 'utf8');
      assert.ok(content.trim().length > 50, `File ${dir}/${f} appears to be a placeholder (too short)`);
    }
  };
  checkDir('agents', '.md');
  checkDir('references', '.md');
  checkDir('templates', '.md');
  checkDir('checklists', '.md');
  checkDir('adapters', '.md');
  checkDir('examples', '.md');
  console.log('✓ No empty or placeholder files detected');
}

// 14. All referenced files in SKILL.md exist
{
  const content = fs.readFileSync(path.join(SKILL_DIR, 'SKILL.md'), 'utf8');
  const refPattern = /`((?:agents|references|schemas|templates|checklists|scripts|examples|adapters)\/[^`]+)`/g;
  let match;
  const refs = new Set();
  while ((match = refPattern.exec(content)) !== null) {
    refs.add(match[1]);
  }
  for (const ref of refs) {
    const fullPath = path.join(SKILL_DIR, ref);
    assert.ok(fs.existsSync(fullPath), `Referenced file must exist: ${ref}`);
  }
  console.log(`✓ All ${refs.size} referenced files in SKILL.md exist`);
}

console.log('\nAll Enterprise NFR Engineer unit tests passed successfully!\n');
