#!/usr/bin/env node

/**
 * Enterprise NFR Engineer — Specialized Gap Analysis Suite (Node.js Runner)
 * Cross-platform CLI runner with zero external npm dependencies.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const TOOLS_DIR = __dirname;

function findPythonCmd() {
  for (const cmd of ['py -3', 'python3', 'python']) {
    try {
      execSync(`${cmd} --version`, { stdio: 'ignore' });
      return cmd;
    } catch {
      // try next
    }
  }
  return null;
}

function runTools(targetDir = '.') {
  const absTarget = path.resolve(targetDir);
  const pyCmd = findPythonCmd();

  if (!pyCmd) {
    console.error('Error: Python runtime (py -3, python3, or python) is required to run the specialized gap analysis tools.');
    process.exit(1);
  }

  const runnerScript = path.join(TOOLS_DIR, 'run_nfr_tools.py');
  const isJson = process.argv.includes('--json') || process.argv.includes('-j');
  const flags = isJson ? '--json' : '';

  try {
    const output = execSync(`${pyCmd} "${runnerScript}" "${absTarget}" ${flags}`, {
      encoding: 'utf8',
      timeout: 30000
    });
    console.log(output);
  } catch (err) {
    if (err.stdout) console.log(err.stdout);
    if (err.stderr) console.error(err.stderr);
    process.exit(err.status || 1);
  }
}

const target = process.argv[2] && !process.argv[2].startsWith('-') ? process.argv[2] : '.';
runTools(target);
