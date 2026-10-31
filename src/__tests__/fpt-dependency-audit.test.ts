import { afterEach, expect, it, vi } from 'vitest';
import { realpathSync, mkdtempSync, mkdirSync, writeFileSync, readFileSync, readdirSync, rmSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { utils, write } from '../fpt/cfb-io';
vi.setConfig({ testTimeout: 20_000 });
const dirs: string[] = [];
afterEach(() => { for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true }); });
const u32 = (n: number) => { const b = Buffer.alloc(4); b.writeUInt32LE(n); return b; };
function fpl(members: Array<{ name: string; type?: number }> = [{ name: 'Member', type: 1 }]) {
  const c = utils.cfb_new();
  for (const member of members) {
    utils.cfb_add(c, `${member.name}/FTYP`, u32(member.type ?? 1));
    utils.cfb_add(c, `${member.name}/FLAD`, new Uint8Array(8));
    utils.cfb_add(c, `${member.name}/FPAT`, Buffer.from(`D:\\lib\\${member.name}.bin`));
    utils.cfb_add(c, `${member.name}/FDAT`, new Uint8Array([1, 2, 3]));
  }
  return write(c, { type: 'buffer' });
}
/** Write the FPL named by a reference path; the final path component is the member. */
function writeReferenceLibrary(base: string, referencePath: string, members?: Array<{ name: string; type?: number }>) {
  const parts = referencePath.split('/');
  const member = parts.pop()!;
  const path = join(base, ...parts);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, fpl(members ?? [{ name: member, type: 1 }]));
}
function fixture(path = 'nested/Mixed.fpl/Member', malformed = false) {
  const dir = mkdtempSync(join(realpathSync(tmpdir()), 'fpt-audit-')); dirs.push(dir);
  const table = join(dir, 'table.fpt'); const root = join(dir, 'shared'); mkdirSync(root);
  const tlv = (tag: number, s?: string) => { const v = s === undefined ? Buffer.alloc(0) : Buffer.concat([u32(s.length), Buffer.from(s)]); return Buffer.concat([u32(v.length + 4), u32(tag), v]); };
  const c = utils.cfb_new(); utils.cfb_add(c, 'Image1', malformed ? new Uint8Array([1]) : Buffer.concat([tlv(0xa4f4d1d7, 'Ball'), tlv(0xa1edd1d5, path), tlv(0xa7fdc4e0)]));
  writeFileSync(table, write(c, { type: 'buffer' })); return { dir, table, root };
}
function run(args: string[]) { return spawnSync(process.execPath, ['--import', 'tsx', resolve('scripts/audit-fpt-dependencies.ts'), ...args], { encoding: 'utf8' }); }
it('audits read-only, hashes original bytes, and gives table parent precedence', () => {
  const { dir, table, root } = fixture();
  for (const r of [dir, root]) writeReferenceLibrary(r, 'nested/Mixed.fpl/Member');
  const before = readFileSync(table); const listing = readdirSync(dir, { recursive: true });
  const result = run(['--table', table, '--library-root', root]); expect(result.status).toBe(0);
  const report = JSON.parse(result.stdout); expect(report.schemaVersion).toBe(2);
  expect(report.tables[0]).toMatchObject({ path: table, sha256: createHash('sha256').update(before).digest('hex'), referenceCoverage: 'complete-recognized-records', memberVerification: 'performed', gameplayVerification: 'not-performed' });
  expect(report.tables[0].resolutions[0]).toMatchObject({ status: 'resolved-file', candidates: [{ rootId: dir, relativePath: 'nested/Mixed.fpl' }] });
  expect(report.tables[0].memberResolutions[0]).toMatchObject({ status: 'resolved-member', candidates: [{ name: 'Member', kind: 'image', type: 1 }] });
  expect(report.tables[0].libraryMembers).toHaveLength(1);
  expect(report.tables[0].libraryMembers[0]).toMatchObject({ memberCount: 1, coverage: 'complete-recognized-members', issues: [] });
  expect(readFileSync(table)).toEqual(before); expect(readdirSync(dir, { recursive: true })).toEqual(listing);
});
it('respects explicit root order and produces deterministic nested inventory', () => {
  const { dir, table, root } = fixture(); const second = join(dir, 'second'); mkdirSync(second);
  for (const r of [root, second]) writeReferenceLibrary(r, 'nested/Mixed.fpl/Member');
  const args = ['--table', table, '--library-root', second, '--library-root', root];
  const first = run(args); expect(first.status).toBe(0); expect(run(args).stdout).toBe(first.stdout);
  // Both are nested within the table root; exact relative paths still select the explicit root.
  expect(JSON.parse(first.stdout).tables[0].resolutions[0].candidates[0].rootId).toBe(second);
});
it('reports missing, ambiguous, malformed and unsafe references as incomplete', () => {
  const f = fixture(); expect(run(['--table', f.table]).status).toBe(1);
  writeReferenceLibrary(f.dir, 'nested/Mixed.fpl/Member'); writeReferenceLibrary(f.dir, 'nested/mixed.FPL/Member');
  expect(JSON.parse(run(['--table', f.table]).stdout).tables[0].resolutions[0].status).toBe(readdirSync(join(f.dir, 'nested')).length === 2 ? 'ambiguous-file' : 'resolved-file');
  expect(run(['--table', fixture('a.fpl/x', true).table]).status).toBe(1);
  const unsafe = fixture('../outside.fpl/member'); expect(JSON.parse(run(['--table', unsafe.table]).stdout).tables[0].resolutions[0].status).toBe('invalid-path');
}, 20_000);
it('skips symlink files and directories conservatively', () => {
  const f = fixture(); const outside = mkdtempSync(join(realpathSync(tmpdir()), 'fpt-outside-')); dirs.push(outside);
  writeReferenceLibrary(outside, 'nested/Mixed.fpl/Member');
  symlinkSync(join(outside, 'nested'), join(f.dir, 'nested')); symlinkSync(join(outside, 'nested/Mixed.fpl'), join(f.dir, 'link.fpl'));
  const result = run(['--table', f.table, '--library-root', outside]); expect(result.status).toBe(1); expect(result.stderr).toMatch(/partial inventory/);
  expect(JSON.parse(result.stdout).tables[0]).toMatchObject({ inventoryCoverage: 'partial', resolutions: [{ status: 'inventory-incomplete' }] });
});
it.each([[], ['--unknown'], ['--table'], ['--table', 'relative.fpt'], ['--library-root', '/tmp']].map(args => ({ args })))('rejects malformed configuration %j', ({ args }) => {
  const result = run(args); expect(result.status).toBe(2); expect(result.stdout).toBe('');
});
it('reports unavailable roots and rejects explicit symlink roots and tables without following them', () => {
  const f = fixture('a.fpl/member'); writeReferenceLibrary(f.dir, 'a.fpl/member');
  const rootAlias = join(f.dir, 'root-alias'); symlinkSync(f.root, rootAlias);
  for (const root of [join(f.dir, 'absent'), rootAlias]) {
    const result = run(['--table', f.table, '--library-root', root]);
    expect(result.status).toBe(1); expect(result.stderr).toMatch(/partial inventory/);
    expect(JSON.parse(result.stdout).tables[0].resolutions[0].status).toBe('inventory-incomplete');
  }
  const tableAlias = join(f.dir, 'table-alias.fpt'); symlinkSync(f.table, tableAlias);
  const result = run(['--table', tableAlias]); expect(result.status).toBe(1); expect(JSON.parse(result.stdout).tables).toEqual([]);
  expect(run(['--table', `${f.dir}/../forbidden.fpt`]).status).toBe(2);
});
it.skipIf(process.platform === 'win32')('rejects unsupported ancestor names without inventing candidate paths', () => {
  const f = fixture('nested/foo/Mixed.fpl/Member');
  mkdirSync(join(f.dir, 'nested\\foo'));
  writeFileSync(join(f.dir, 'nested\\foo/Mixed.fpl'), 'x');
  const result = run(['--table', f.table]);
  expect(result.status).toBe(1);
  expect(result.stderr).toMatch(/partial inventory/);
  expect(JSON.parse(result.stdout).tables[0]).toMatchObject({
    inventoryCoverage: 'partial', resolutions: [{ status: 'inventory-incomplete', candidates: [] }],
  });
});

it('reports missing, ambiguous and mismatched members without claiming verification', () => {
  const missing = fixture();
  writeReferenceLibrary(missing.dir, 'nested/Mixed.fpl/Other');
  const missingResult = run(['--table', missing.table]);
  expect(missingResult.status).toBe(1);
  expect(JSON.parse(missingResult.stdout).tables[0]).toMatchObject({
    memberVerification: 'partial', memberResolutions: [{ status: 'missing-member', candidates: [] }],
  });

  const ambiguous = fixture('nested/Mixed.fpl/Member.bmp');
  writeReferenceLibrary(ambiguous.dir, 'nested/Mixed.fpl/Member.bmp', [{ name: 'Member', type: 1 }, { name: 'Member.bmp', type: 1 }]);
  const ambiguousResult = run(['--table', ambiguous.table]);
  expect(ambiguousResult.status).toBe(1);
  expect(JSON.parse(ambiguousResult.stdout).tables[0]).toMatchObject({
    memberResolutions: [{ status: 'ambiguous-member', candidates: [{ name: 'Member' }, { name: 'Member.bmp' }] }],
  });

  const mismatch = fixture();
  writeReferenceLibrary(mismatch.dir, 'nested/Mixed.fpl/Member', [{ name: 'Member', type: 2 }]);
  const mismatchResult = run(['--table', mismatch.table]);
  expect(mismatchResult.status).toBe(1);
  expect(JSON.parse(mismatchResult.stdout).tables[0]).toMatchObject({
    memberResolutions: [{ status: 'member-type-mismatch', candidates: [{ kind: 'sound' }] }],
  });

  const unknown = fixture();
  writeReferenceLibrary(unknown.dir, 'nested/Mixed.fpl/Member', [{ name: 'Member', type: 99 }]);
  const unknownResult = run(['--table', unknown.table]);
  expect(unknownResult.status).toBe(1);
  expect(JSON.parse(unknownResult.stdout).tables[0]).toMatchObject({
    memberVerification: 'partial', libraryMembers: [{ coverage: 'partial', issues: [{ code: 'unsupported-type' }] }],
    memberResolutions: [{ status: 'member-type-mismatch', candidates: [{ kind: 'unknown' }] }],
  });
});

it('reports unreadable libraries and leaves zero-reference tables unverified', () => {
  const broken = fixture();
  mkdirSync(join(broken.dir, 'nested'));
  writeFileSync(join(broken.dir, 'nested/Mixed.fpl'), 'not a cfb');
  const brokenResult = run(['--table', broken.table]);
  expect(brokenResult.status).toBe(1);
  expect(brokenResult.stderr).toMatch(/member verification skipped/);
  expect(JSON.parse(brokenResult.stdout).tables[0]).toMatchObject({
    memberVerification: 'partial', memberResolutions: [{ status: 'library-unreadable', candidates: [] }],
  });

  const dir = mkdtempSync(join(realpathSync(tmpdir()), 'fpt-audit-')); dirs.push(dir);
  const c = utils.cfb_new(); utils.cfb_add(c, 'Script', new TextEncoder().encode('Option Explicit'));
  const table = join(dir, 'empty.fpt'); writeFileSync(table, write(c, { type: 'buffer' }));
  const emptyResult = run(['--table', table]); expect(emptyResult.status).toBe(0);
  expect(JSON.parse(emptyResult.stdout).tables[0]).toMatchObject({
    referenceCoverage: 'complete-recognized-records', memberVerification: 'not-performed',
    memberResolutions: [], libraryMembers: [],
  });
});
