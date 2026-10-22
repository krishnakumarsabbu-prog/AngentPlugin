const fs = require('fs');
const path = require('path');

const IGNORE_DIRS = new Set([
  'node_modules',
  '.git',
  'dist',
  'out',
  'build',
  '.gemini'
]);

const TEXT_EXTS = new Set([
  '.md', '.ts', '.js', '.cjs', '.mjs', '.json', '.html', '.css', '.scss', 
  '.py', '.sh', '.yaml', '.yml', '.txt', '.toml', '.xml', '.svg'
]);

// CJK Unified Ideographs, Extension A, Compatibility Ideographs
const cjkRegex = /[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/g;
let foundFiles = 0;
let totalMatches = 0;
const results = [];

function scanDir(dir) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch (e) {
    return;
  }
  for (const entry of entries) {
    if (IGNORE_DIRS.has(entry.name)) continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      scanDir(fullPath);
    } else {
      const ext = path.extname(entry.name).toLowerCase();
      if (TEXT_EXTS.has(ext) || entry.name.startsWith('.')) {
        try {
          const content = fs.readFileSync(fullPath, 'utf8');
          const lines = content.split('\n');
          let fileMatches = 0;
          const matchedLines = [];
          lines.forEach((line, idx) => {
            const matches = line.match(cjkRegex);
            if (matches && matches.length > 0) {
              fileMatches += matches.length;
              matchedLines.push({
                lineNum: idx + 1,
                count: matches.length,
                text: line.trim()
              });
            }
          });
          if (fileMatches > 0) {
            foundFiles++;
            totalMatches += fileMatches;
            results.push({
              file: path.relative('.', fullPath),
              matches: fileMatches,
              lines: matchedLines
            });
          }
        } catch (e) {}
      }
    }
  }
}

console.log('=== Scanning entire repository for Chinese/CJK characters ===');
scanDir('.');
console.log('=== Scan Complete ===\n');

if (results.length === 0) {
  console.log('No Chinese/CJK characters found in the entire repository!');
} else {
  results.forEach(r => {
    console.log(`FILE: ${r.file} (${r.matches} characters across ${r.lines.length} lines)`);
    r.lines.forEach(l => {
      console.log(`  Line ${l.lineNum}: ${l.text}`);
    });
    console.log('');
  });
  console.log(`Total files with Chinese/CJK characters: ${foundFiles}`);
  console.log(`Total Chinese/CJK characters found: ${totalMatches}`);
}
