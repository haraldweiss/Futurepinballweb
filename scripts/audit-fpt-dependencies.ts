// SPDX-License-Identifier: AGPL-3.0-or-later
// © 2026 Harald Weiss
// Trusted-user host CLI only. Never import into table scripts or the browser runtime.
import { lstat, readdir, readFile, realpath } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { dirname, isAbsolute, join, parse, relative, resolve } from 'node:path';
import { read } from '../src/fpt/cfb-io';
import { readExternalReferences } from '../src/fpt/external-references';
import { resolveLibraryFiles, type DependencyFile } from '../src/fpt/dependency-resolver';

function argumentsFor(argv: string[]) {
  const tables: string[] = []; const roots: string[] = [];
  for (let i = 0; i < argv.length; i += 2) {
    const flag = argv[i]; const value = argv[i + 1];
    if (!['--table', '--library-root'].includes(flag) || !value || !isAbsolute(value)
      || value.includes('\0') || value.split(/[\\/]/).includes('..')) {
      throw new Error('Expected --table <absolute-fpt> and optional repeatable --library-root <absolute-dir>; traversal is forbidden');
    }
    (flag === '--table' ? tables : roots).push(value);
  }
  if (!tables.length) throw new Error('At least one --table is required');
  return { tables, roots };
}
// Reject symlinks in every component before canonicalization/access to target contents.
async function canonical(path: string, directory: boolean): Promise<string> {
  let current = parse(path).root;
  for (const part of relative(current, resolve(path)).split('/').filter(Boolean)) {
    current = join(current, part);
    if ((await lstat(current)).isSymbolicLink()) throw new Error(`Symlink skipped: ${current}`);
  }
  const stat = await lstat(current);
  if (directory ? !stat.isDirectory() : !stat.isFile()) throw new Error(`Expected ${directory ? 'directory' : 'file'}: ${path}`);
  return realpath(current);
}
async function inventory(rootId: string): Promise<{ files: DependencyFile[]; partial: boolean }> {
  const files: DependencyFile[] = []; let partial = false;
  async function walk(directory: string) {
    try {
      const names = (await readdir(directory)).sort();
      for (const name of names) {
        const path = join(directory, name);
        try {
          const stat = await lstat(path);
          if (stat.isSymbolicLink()) { partial = true; continue; }
          if (stat.isDirectory()) await walk(path);
          else if (stat.isFile()) {
            const relativePath = relative(rootId, path).split('\\').join('/');
            // Inventory names must obey the pure resolver's contract too.
            if (/[\x00-\x1f\x7f-\x9f:]/.test(relativePath) || name.includes('\\')) { partial = true; continue; }
            files.push({ rootId, relativePath });
          } else partial = true;
        } catch { partial = true; }
      }
    } catch { partial = true; }
  }
  await walk(rootId); return { files, partial };
}
async function main() {
  let config: ReturnType<typeof argumentsFor>;
  try { config = argumentsFor(process.argv.slice(2)); }
  catch (error) { console.error(String(error)); process.exitCode = 2; return; }
  const tables = []; let incomplete = false;
  for (const suppliedTable of config.tables) {
    try {
      const path = await canonical(suppliedTable, false);
      const bytes = await readFile(path); const container = read(bytes);
      const report = readExternalReferences(container);
      const rootIds = [await canonical(dirname(path), true)];
      let partial = false;
      for (const suppliedRoot of config.roots) {
        try { const root = await canonical(suppliedRoot, true); if (!rootIds.includes(root)) rootIds.push(root); }
        catch (error) { partial = true; console.error(`partial inventory: ${String(error)}`); }
      }
      const files: DependencyFile[] = [];
      for (const root of rootIds) {
        const result = await inventory(root); files.push(...result.files);
        if (result.partial) { partial = true; console.error(`partial inventory: ${root} (symlinks, unsupported names or read failures skipped)`); }
      }
      // An omitted entry could conflict even with an otherwise unique match. Withhold
      // positive resolutions conservatively when any granted inventory is incomplete.
      const resolutions = resolveLibraryFiles(report.references, rootIds.map((id, priority) => ({ id, priority })), files)
        .map(result => partial && result.status !== 'invalid-path'
          ? { ...result, status: 'inventory-incomplete' as const } : result);
      if (partial || report.coverage !== 'complete-recognized-records' || resolutions.some(r => r.status !== 'resolved-file')) incomplete = true;
      tables.push({ path, sha256: createHash('sha256').update(bytes).digest('hex'), streamCount: container.FileIndex.filter(entry => entry.type === 2).length,
        inventoryCoverage: partial ? 'partial' : 'complete', referenceCoverage: report.coverage, issues: report.issues, resolutions, memberVerification: 'not-performed', gameplayVerification: 'not-performed' });
    } catch (error) { incomplete = true; console.error(`Table audit failed: ${suppliedTable}: ${String(error)}`); }
  }
  console.log(JSON.stringify({ schemaVersion: 1, tables }, null, 2));
  process.exitCode = incomplete ? 1 : 0;
}
await main();
