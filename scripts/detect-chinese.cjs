const fs = require('fs');
const path = require('path');

function checkDir(dir) {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (['node_modules', '.git', 'dist', 'out'].includes(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      checkDir(full);
    } else if (entry.name.endsWith('.md') || entry.name.endsWith('.py') || entry.name.endsWith('.cjs') || entry.name.endsWith('.ts') || entry.name.endsWith('.json')) {
      const content = fs.readFileSync(full, 'utf8');
      const chineseMatches = content.match(/[\u4e00-\u9fa5]/g);
      if (chineseMatches && chineseMatches.length > 0) {
        console.log(`${path.relative('.', full)}: ${chineseMatches.length} characters`);
      }
    }
  }
}

console.log("--- Scanning skills/ ---");
checkDir('skills');

console.log("--- Scanning .agents/ ---");
checkDir('.agents');

console.log("--- Scanning .github/ ---");
checkDir('.github');

console.log("--- Scanning .claude/ ---");
checkDir('.claude');
