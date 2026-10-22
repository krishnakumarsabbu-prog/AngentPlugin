/**
 * Anvil Compression Engine
 * Production JavaScript implementation of Anvil token optimization heuristics.
 * Ported and adapted from upstream JuliusBrussee/caveman.
 */

'use strict';

const ANSI_REGEX = /\x1b\[[0-9;?]*[ -/]*[@-~]|\x1b\][^\x07\x1b]*(?:\x07|\x1b\\)|\x1b[@-Z\x5c-_]/g;
const IMPORTANT_LOG_REGEX = /(?:\b(?:ERROR|FATAL|PANIC|EXCEPTION|TRACEBACK|FAIL|FAILED|FAILURE|WARN|WARNING|CRIT|CRITICAL|ALERT|EMERG|EMERGENCY)\b|^\s+at\s|^\s+File "|\.go:\d+|^\s+--->|caused by)/i;
const TABULAR_IMPORTANT_REGEX = /\b(?:ERROR|FAIL|FAILED|FATAL|PANIC|EXCEPTION|WARNING|SECURITY|DENIED|REJECTED|TIMEOUT|CRITICAL)\b/i;
const HTML_NEGATIVE_TAGS = /<(script|style|svg|iframe|noscript|nav|footer|header|aside)[^>]*>[\s\S]*?<\/\1>/gi;

/**
 * Strip all ANSI/VT escape sequences from text.
 * @param {string} text
 * @returns {string}
 */
function stripAnsi(text) {
  if (!text) return '';
  return text.replace(ANSI_REGEX, '');
}

/**
 * Compress raw log text by retaining signal lines and collapsing uninformative runs.
 * @param {string} text
 * @returns {string}
 */
function compressLogs(text) {
  const clean = stripAnsi(text);
  const lines = clean.split(/\r?\n/);
  const result = [];
  let elidedCount = 0;

  for (const line of lines) {
    if (IMPORTANT_LOG_REGEX.test(line)) {
      if (elidedCount > 0) {
        result.push(`… ${elidedCount} lines elided (anvil) …`);
        elidedCount = 0;
      }
      result.push(line);
    } else {
      elidedCount++;
    }
  }

  if (elidedCount > 0) {
    result.push(`… ${elidedCount} lines elided (anvil) …`);
  }

  return result.join('\n');
}

/**
 * Compress stack traces by keeping error message, top 3 project frames, and causal chains.
 * @param {string} text
 * @returns {string}
 */
function compressStackTrace(text) {
  const clean = stripAnsi(text);
  const lines = clean.split(/\r?\n/);
  const result = [];
  let internalCount = 0;
  let projectFrames = 0;

  for (const line of lines) {
    const isStackFrame = /^\s+at\s|^\s+File\s/i.test(line);

    if (!isStackFrame) {
      if (internalCount > 0) {
        result.push(`    … ${internalCount} internal frames elided (anvil) …`);
        internalCount = 0;
      }
      result.push(line);
      continue;
    }

    const isInternal = /(?:node:internal|node_modules|site-packages|vendor\/bundle|\/usr\/local\/go)/.test(line);

    if (isInternal) {
      internalCount++;
    } else {
      if (projectFrames < 3) {
        if (internalCount > 0) {
          result.push(`    … ${internalCount} internal frames elided (anvil) …`);
          internalCount = 0;
        }
        result.push(line);
        projectFrames++;
      } else {
        internalCount++;
      }
    }
  }

  if (internalCount > 0) {
    result.push(`    … ${internalCount} internal frames elided (anvil) …`);
  }

  return result.join('\n');
}

/**
 * Compress JSON schemas / tool catalogs by dropping annotations and truncating descriptions.
 * @param {object|string} jsonInput
 * @returns {string}
 */
function compressToolSchema(jsonInput) {
  let obj = typeof jsonInput === 'string' ? JSON.parse(jsonInput) : JSON.parse(JSON.stringify(jsonInput));

  function cleanNode(node) {
    if (!node || typeof node !== 'object') return node;

    if (Array.isArray(node)) {
      return node.map(cleanNode);
    }

    const keysToDrop = ['examples', 'example', '$schema', '$comment', 'title'];
    for (const key of keysToDrop) {
      delete node[key];
    }

    if (typeof node.description === 'string') {
      const desc = node.description;
      const isConstraint = /(?:must|required|one of|regex|valid values|range|default)/i.test(desc);
      if (!isConstraint && desc.length > 80) {
        // truncate to lead sentence or 80 chars
        const firstPeriod = desc.indexOf('. ');
        if (firstPeriod > 0 && firstPeriod <= 80) {
          node.description = desc.slice(0, firstPeriod + 1);
        } else {
          node.description = desc.slice(0, 77).trim() + '...';
        }
      }
    }

    for (const prop in node) {
      if (Object.prototype.hasOwnProperty.call(node, prop)) {
        node[prop] = cleanNode(node[prop]);
      }
    }

    return node;
  }

  const cleaned = cleanNode(obj);
  return JSON.stringify(cleaned, null, 2);
}

/**
 * Compress CSV data by preserving header and rows matching alert keywords.
 * @param {string} csvText
 * @returns {string}
 */
function compressCsv(csvText) {
  const lines = csvText.trim().split(/\r?\n/);
  if (lines.length <= 2) return csvText;

  const header = lines[0];
  const result = [header];
  let elidedCount = 0;

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (TABULAR_IMPORTANT_REGEX.test(line)) {
      if (elidedCount > 0) {
        result.push(`… ${elidedCount} rows elided (anvil) …`);
        elidedCount = 0;
      }
      result.push(line);
    } else {
      elidedCount++;
    }
  }

  if (elidedCount > 0) {
    result.push(`… ${elidedCount} rows elided (anvil) …`);
  }

  return result.join('\n');
}

/**
 * Compress test runner output by removing passing test lines and retaining failure diffs.
 * @param {string} outputText
 * @returns {string}
 */
function compressTestOutput(outputText) {
  const clean = stripAnsi(outputText);
  const lines = clean.split(/\r?\n/);
  const result = [];
  let inFailureBlock = false;

  for (const line of lines) {
    // Check for failure markers
    if (/[✕✗×]|FAIL|FAILED|AssertionError|Expected:|Received:|●/i.test(line)) {
      inFailureBlock = true;
      result.push(line);
      continue;
    }

    // Check for summary counts
    if (/Tests:|Test Files:|Duration:|Time:|Ran \d+ tests/i.test(line)) {
      inFailureBlock = false;
      result.push(line);
      continue;
    }

    // Pass lines during active failure diff
    if (inFailureBlock) {
      if (/^\s*at\s|^\s*[-+]|\s{2,}/.test(line)) {
        result.push(line);
      } else {
        inFailureBlock = false;
      }
    }
  }

  return result.join('\n');
}

/**
 * Compress HTML DOM to clean markdown article text.
 * @param {string} htmlText
 * @returns {string}
 */
function compressHtmlDom(htmlText) {
  let clean = htmlText.replace(HTML_NEGATIVE_TAGS, '');
  // Strip comments
  clean = clean.replace(/<!--[\s\S]*?-->/g, '');
  // Extract pre code blocks
  const codeBlocks = [];
  clean = clean.replace(/<pre[^>]*><code[^>]*>([\s\S]*?)<\/code><\/pre>/gi, (_, code) => {
    const idx = codeBlocks.length;
    codeBlocks.push(code.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&'));
    return `\n\n__ANVIL_CODE_BLOCK_${idx}__\n\n`;
  });

  // Convert headings
  clean = clean.replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, '\n# $1\n');
  clean = clean.replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, '\n## $1\n');
  clean = clean.replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, '\n### $1\n');

  // Strip remaining tags
  clean = clean.replace(/<[^>]+>/g, ' ');
  clean = clean.replace(/&nbsp;/g, ' ');
  clean = clean.replace(/[ \t]+/g, ' ').replace(/\n\s*\n/g, '\n\n').trim();

  // Restore code blocks
  codeBlocks.forEach((code, i) => {
    clean = clean.replace(`__ANVIL_CODE_BLOCK_${i}__`, `\`\`\`\n${code}\n\`\`\``);
  });

  return clean;
}

module.exports = {
  stripAnsi,
  compressLogs,
  compressStackTrace,
  compressToolSchema,
  compressCsv,
  compressTestOutput,
  compressHtmlDom,
};
