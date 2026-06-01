import { readFileSync, writeFileSync, existsSync } from 'fs';
import { execSync } from 'child_process';

const tsconfigPath = 'tsconfig.json';

function enableChecks() {
  const tc = JSON.parse(readFileSync(tsconfigPath));
  tc.compilerOptions.noUnusedLocals = true;
  tc.compilerOptions.noUnusedParameters = true;
  writeFileSync(tsconfigPath, JSON.stringify(tc, null, 2) + '\n');
}

function disableChecks() {
  const tc = JSON.parse(readFileSync(tsconfigPath));
  delete tc.compilerOptions.noUnusedLocals;
  delete tc.compilerOptions.noUnusedParameters;
  writeFileSync(tsconfigPath, JSON.stringify(tc, null, 2) + '\n');
}

function parseErrors(output) {
  const errors = [];
  for (const line of output.split('\n')) {
    // TS6133: 'X' is declared but its value is never read.
    let m = line.match(/^(src\/[^:]+)\((\d+),(\d+)\): error TS6133: '(\w+)' is declared but (its value is never read)/);
    if (m) {
      const [, file, lineStr, , name] = m;
      if (file.includes('__tests__') || file.includes('/test-')) continue;
      // Skip TypeScript properties with initializer issues (TS2564 is separate)
      errors.push({ file, line: parseInt(lineStr), name, type: 'unused' });
      continue;
    }
    // TS6192: All imports in import declaration are unused.
    m = line.match(/^(src\/[^:]+)\((\d+),(\d+)\): error TS6192: All imports in import declaration are unused\./);
    if (m) {
      const [, file, lineStr] = m;
      if (file.includes('__tests__') || file.includes('/test-')) continue;
      errors.push({ file, line: parseInt(lineStr), name: null, type: 'all-unused' });
      continue;
    }
    // TS6196: 'X' is declared but never used.
    m = line.match(/^(src\/[^:]+)\((\d+),(\d+)\): error TS6196: '(\w+)' is declared but never used\./);
    if (m) {
      const [, file, lineStr, , name] = m;
      if (file.includes('__tests__') || file.includes('/test-')) continue;
      errors.push({ file, line: parseInt(lineStr), name, type: 'never-used' });
      continue;
    }
  }
  return errors;
}

enableChecks();
let output;
try { execSync('npx tsc --noEmit 2>&1', { stdio: 'pipe' }); output = ''; }
catch (e) { output = e.stdout?.toString() || e.stderr?.toString() || ''; }

const allErrors = parseErrors(output);
console.log(`Total: ${allErrors.length} production errors`);

// Group by type
const byType = {};
for (const err of allErrors) {
  if (!byType[err.type]) byType[err.type] = [];
  byType[err.type].push(err);
}
for (const [type, list] of Object.entries(byType)) {
  console.log(`  ${type}: ${list.length}`);
}

// Fix: safe pattern — unused named imports (remove the name from import { ... })
let fixed = 0;
for (const err of allErrors) {
  if (err.type === 'all-unused') continue; // handled below
  if (!existsSync(err.file)) continue;
  let content = readFileSync(err.file, 'utf-8');
  const lines = content.split('\n');
  const target = lines[err.line - 1];
  if (!target) continue;

  // SAFETY CHECK #1: NEVER touch import * as X lines
  if (/import \* as \w+/.test(target)) continue;

  // SAFETY CHECK #2: Only handle named imports in import { ... } statements
  if (!target.includes('import {') && !target.includes('import type {')) {
    // For non-import statements, skip — too risky
    continue;
  }

  const newLine = target
    .replace(new RegExp(`\\b${err.name},\\s*`), '')
    .replace(new RegExp(`,\\s*${err.name}\\b`), '')
    .replace(new RegExp(`\\{\\s*${err.name}\\s*\\}`), '{}');

  if (newLine === target) continue;
  if (newLine.trim() === 'import {}' || newLine.trim() === 'import type {}') {
    // Remove entire line — it's an empty import
    lines[err.line - 1] = '// ' + newLine.trim();
  } else {
    lines[err.line - 1] = newLine;
  }
  writeFileSync(err.file, lines.join('\n'));
  fixed++;
}

console.log(`Fixed ${fixed} unused named imports`);
disableChecks();
