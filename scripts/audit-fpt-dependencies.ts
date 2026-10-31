// SPDX-License-Identifier: AGPL-3.0-or-later
// © 2026 Harald Weiss
// Trusted-user host CLI only. Never import into table scripts or the browser runtime.
import { lstat, readdir, readFile, realpath } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { dirname, isAbsolute, join, parse, relative, resolve, sep } from 'node:path';
import { read } from '../src/fpt/cfb-io';
import { readExternalReferences, type ExternalReference } from '../src/fpt/external-references';
import { resolveLibraryFiles, type DependencyFile } from '../src/fpt/dependency-resolver';
import { readLibraryMembers, resolveLibraryMembers, type LibraryInventory, type LibraryMemberInventory, type MemberResolution } from '../src/fpt/library-members';

interface LibraryRead { path: string; sha256: string; inventory: LibraryMemberInventory }
interface LibraryReadError { path: string; error: string }
type MemberOutput = {
  reference: ExternalReference;
  status: MemberResolution['status'] | 'library-unreadable';
  candidates: Array<{ name: string; kind: string; type: number; sourcePath: string | null }>;
};
const libraryCache = new Map<string, LibraryRead | LibraryReadError>();

function candidatePath(rootId: string, relativePath: string): string | undefined {
  const path = join(rootId, ...relativePath.split('/'));
  const within = relative(rootId, path);
  return within.startsWith('..') || isAbsolute(within) ? undefined : path;
}

async function loadLibrary(path: string): Promise<LibraryRead | LibraryReadError> {
  const cached = libraryCache.get(path);
  if (cached) return cached;
  try {
    const bytes = await readFile(path);
    const result: LibraryRead = {
      path,
      sha256: createHash('sha256').update(bytes).digest('hex'),
      inventory: readLibraryMembers(read(bytes)),
    };
    libraryCache.set(path, result);
    return result;
  } catch (error) {
    const result: LibraryReadError = { path, error: String(error) };
    libraryCache.set(path, result);
    return result;
  }
}

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
        // Validate every entry before recursion: literal POSIX backslashes must
        // never become invented path separators in descendant candidates.
        if (/[\x00-\x1f\x7f-\x9f:]/.test(name) || name.includes('\\')) { partial = true; continue; }
        const path = join(directory, name);
        try {
          const stat = await lstat(path);
          if (stat.isSymbolicLink()) { partial = true; continue; }
          if (stat.isDirectory()) await walk(path);
          else if (stat.isFile()) {
            const relativePath = relative(rootId, path).split(sep).join('/');
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

      // Member verification only for files that resolved against a complete inventory.
      const unreadable = new Set<ExternalReference>();
      const inventoryByLibrary = new Map<string, LibraryInventory>();
      const libraryReads = new Map<string, LibraryRead>();
      for (const resolution of resolutions) {
        if (resolution.status !== 'resolved-file') continue;
        const candidate = resolution.candidates[0];
        const absolute = candidate && candidatePath(candidate.rootId, candidate.relativePath);
        if (!absolute) { unreadable.add(resolution.reference); continue; }
        const loaded = await loadLibrary(absolute);
        if ('error' in loaded) {
          unreadable.add(resolution.reference);
          console.error(`member verification skipped: ${loaded.error}`);
          continue;
        }
        libraryReads.set(absolute, loaded);
        const key = resolution.reference.libraryPath.replace(/\\/g, '/').replace(/[A-Z]/g, char => char.toLowerCase());
        const existing = inventoryByLibrary.get(key);
        if (existing && existing.inventory !== loaded.inventory) throw new Error(`Conflicting library inventory: ${resolution.reference.libraryPath}`);
        if (!existing) inventoryByLibrary.set(key, { libraryPath: resolution.reference.libraryPath, inventory: loaded.inventory });
      }
      const inspectable = resolutions.filter(result => result.status === 'resolved-file'
        && !unreadable.has(result.reference)).map(result => result.reference);
      const memberByReference = new Map(resolveLibraryMembers(inspectable, [...inventoryByLibrary.values()])
        .map(result => [result.reference, result]));
      const memberResolutions: MemberOutput[] = resolutions
        .filter(result => result.status === 'resolved-file')
        .map(result => {
          const member = memberByReference.get(result.reference);
          return member
            ? { reference: member.reference, status: member.status,
              candidates: member.candidates.map(({ name, kind, type, sourcePath }) => ({ name, kind, type, sourcePath })) }
            : { reference: result.reference, status: 'library-unreadable' as const, candidates: [] };
        });
      const unresolvedFiles = resolutions.some(result => result.status !== 'resolved-file');
      const memberPartial = unreadable.size > 0
        || [...libraryReads.values()].some(read => read.inventory.coverage !== 'complete-recognized-members')
        || memberResolutions.some(result => result.status !== 'resolved-member');
      const memberVerification = report.references.length === 0 ? 'not-performed'
        : unresolvedFiles || memberPartial ? 'partial' : 'performed';
      if (partial || report.coverage !== 'complete-recognized-records' || unresolvedFiles || memberVerification === 'partial') incomplete = true;
      const libraryMembers = [...libraryReads.values()].map(read => ({
        path: read.path, sha256: read.sha256, memberCount: read.inventory.members.length,
        coverage: read.inventory.coverage, issues: read.inventory.issues,
      }));
      tables.push({ path, sha256: createHash('sha256').update(bytes).digest('hex'), streamCount: container.FileIndex.filter(entry => entry.type === 2).length,
        inventoryCoverage: partial ? 'partial' : 'complete', referenceCoverage: report.coverage, issues: report.issues, resolutions,
        memberVerification, memberResolutions, libraryMembers, gameplayVerification: 'not-performed' });
    } catch (error) { incomplete = true; console.error(`Table audit failed: ${suppliedTable}: ${String(error)}`); }
  }
  console.log(JSON.stringify({ schemaVersion: 2, tables }, null, 2));
  process.exitCode = incomplete ? 1 : 0;
}
await main();
