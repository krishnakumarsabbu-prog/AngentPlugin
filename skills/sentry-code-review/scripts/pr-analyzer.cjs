/**
 * Sentry PR Analyzer
 * Analyzes pull request diff complexity, test ratios, and calculates risk scores.
 * Ported and adapted from awesome-skills/code-review-skill.
 */

'use strict';

/**
 * @typedef {Object} FileDiffStats
 * @property {string} file
 * @property {number} additions
 * @property {number} deletions
 * @property {boolean} isTest
 */

/**
 * @typedef {Object} PRAnalysisResult
 * @property {number} totalFiles
 * @property {number} additions
 * @property {number} deletions
 * @property {number} totalLines
 * @property {number} testRatio
 * @property {'SMALL'|'MEDIUM'|'LARGE'|'EXTREME'} size
 * @property {'LOW'|'MEDIUM'|'HIGH'} risk
 * @property {string[]} riskFlags
 * @property {FileDiffStats[]} files
 */

/**
 * Parse a raw unified git diff string.
 * @param {string} diffText
 * @returns {PRAnalysisResult}
 */
function analyzeDiff(diffText) {
  if (!diffText || typeof diffText !== 'string') {
    return {
      totalFiles: 0,
      additions: 0,
      deletions: 0,
      totalLines: 0,
      testRatio: 0,
      size: 'SMALL',
      risk: 'LOW',
      riskFlags: [],
      files: []
    };
  }

  const lines = diffText.split(/\r?\n/);
  const filesMap = new Map();
  let currentFile = null;

  for (const line of lines) {
    if (line.startsWith('diff --git ')) {
      const match = line.match(/diff --git a\/(.+) b\/(.+)/);
      if (match) {
        currentFile = match[2];
        const isTest = /(?:test|spec|__tests__|__mocks__)\b/i.test(currentFile);
        filesMap.set(currentFile, { file: currentFile, additions: 0, deletions: 0, isTest });
      }
    } else if (currentFile) {
      const stats = filesMap.get(currentFile);
      if (line.startsWith('+') && !line.startsWith('+++')) {
        stats.additions++;
      } else if (line.startsWith('-') && !line.startsWith('---')) {
        stats.deletions++;
      }
    }
  }

  const files = Array.from(filesMap.values());
  let totalAdditions = 0;
  let totalDeletions = 0;
  let codeAdditions = 0;
  let testAdditions = 0;

  for (const f of files) {
    totalAdditions += f.additions;
    totalDeletions += f.deletions;
    if (f.isTest) {
      testAdditions += f.additions;
    } else {
      codeAdditions += f.additions;
    }
  }

  const totalLines = totalAdditions + totalDeletions;
  const testRatio = codeAdditions > 0 ? Number((testAdditions / codeAdditions).toFixed(2)) : (testAdditions > 0 ? 1 : 0);

  // Size evaluation
  let size = 'SMALL';
  if (totalLines > 1000) {
    size = 'EXTREME';
  } else if (totalLines > 500) {
    size = 'LARGE';
  } else if (totalLines > 150) {
    size = 'MEDIUM';
  }

  // Risk evaluation
  const riskFlags = [];
  let riskScore = 0;

  if (size === 'LARGE' || size === 'EXTREME') {
    riskFlags.push('MASSIVE_DIFF');
    riskScore += 2;
  }

  if (codeAdditions > 3 && testAdditions === 0) {
    riskFlags.push('NO_TEST_CHANGES');
    riskScore += 2;
  } else if (codeAdditions > 100 && testRatio < 0.2) {
    riskFlags.push('LOW_TEST_RATIO');
    riskScore += 1;
  }

  if (files.some(f => /(?:auth|security|billing|crypto|payment|permission|token)/i.test(f.file))) {
    riskFlags.push('CRITICAL_PATH_MODIFIED');
    riskScore += 2;
  }

  let risk = 'LOW';
  if (riskScore >= 3) {
    risk = 'HIGH';
  } else if (riskScore >= 1) {
    risk = 'MEDIUM';
  }

  return {
    totalFiles: files.length,
    additions: totalAdditions,
    deletions: totalDeletions,
    totalLines,
    testRatio,
    size,
    risk,
    riskFlags,
    files
  };
}

module.exports = {
  analyzeDiff,
};
