/**
 * Anvil Content Detector
 * Automatically classifies incoming input payloads to route to the correct compressor.
 */

'use strict';

function detectPayloadType(text) {
  if (!text || typeof text !== 'string') return 'text';

  const trimmed = text.trim();

  // 1. JSON
  if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
    try {
      JSON.parse(trimmed);
      return 'json';
    } catch {
      // not valid JSON
    }
  }

  // 2. HTML
  if (/<(!DOCTYPE\s+html|html|body|main|article|head)[\s>]/i.test(trimmed)) {
    return 'html';
  }

  // 3. Test Output
  if (/(?:FAIL\s+|Tests:\s+\d+\s+(?:failed|passed)|=== RUN|FAIL:\s+|AssertionError:)/.test(trimmed)) {
    return 'test-output';
  }

  // 4. Stack Trace
  if (/(?:Traceback \(most recent call last\):|\bat\s+[\w$./<>]+:\d+:\d+|\.go:\d+\s+\+0x[0-9a-f]+|Exception in thread|Error:\s)/.test(trimmed)) {
    return 'stacktrace';
  }

  // 5. CSV / TSV
  const lines = trimmed.split(/\r?\n/);
  if (lines.length > 2) {
    const commaCounts = lines.slice(0, 5).map(l => (l.match(/,/g) || []).length);
    if (commaCounts[0] >= 2 && commaCounts.every(c => Math.abs(c - commaCounts[0]) <= 1)) {
      return 'csv';
    }
  }

  // 6. Log stream
  if (/(?:\[\d{2}:\d{2}:\d{2}\]|\d{4}-\d{2}-\d{2}[T\s]\d{2}:\d{2}:\d{2}|\b(?:INFO|DEBUG|WARN|ERROR)\b)/.test(trimmed)) {
    return 'log';
  }

  return 'text';
}

module.exports = {
  detectPayloadType,
};
