import { afterEach, expect, it } from 'vitest';
import { realpathSync, mkdtempSync, mkdirSync, writeFileSync, readFileSync, readdirSync, rmSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { utils, write } from '../fpt/cfb-io';
const dirs: string[] = [];
afterEach(() => { for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true }); });
function fixture(path = 'nested/Mixed.fpl/Member', malformed = false) {
  const dir = mkdtempSync(join(realpathSync(tmpdir()), 'fpt-audit-')); dirs.push(dir);
  const table = join(dir, 'table.fpt'); const root = join(dir, 'shared'); mkdirSync(root);
  const u32 = (n: number) => { const b = Buffer.alloc(4); b.writeUInt32LE(n); return b; };
  const tlv = (tag: number, s?: string) => { const v = s === undefined ? Buffer.alloc(0) : Buffer.concat([u32(s.length), Buffer.from(s)]); return Buffer.concat([u32(v.length + 4), u32(tag), v]); };
  const c = utils.cfb_new(); utils.cfb_add(c, 'Image1', malformed ? new Uint8Array([1]) : Buffer.concat([tlv(0xa4f4d1d7, 'Ball'), tlv(0xa1edd1d5, path), tlv(0xa7fdc4e0)]));
  writeFileSync(table, write(c, { type: 'buffer' })); return { dir, table, root };
}
function run(args: string[]) { return spawnSync(process.execPath, ['--import', 'tsx', resolve('scripts/audit-fpt-dependencies.ts'), ...args], { encoding: 'utf8' }); }
it('audits read-only, hashes original bytes, and gives table parent precedence', () => {
  const { dir, table, root } = fixture();
  for (const r of [dir, root]) { mkdirSync(join(r, 'nested')); writeFileSync(join(r, 'nested/Mixed.fpl'), 'fixture'); }
  const before = readFileSync(table); const listing = readdirSync(dir, { recursive: true });
  const result = run(['--table', table, '--library-root', root]); expect(result.status).toBe(0);
  const report = JSON.parse(result.stdout); expect(report.schemaVersion).toBe(1);
  expect(report.tables[0]).toMatchObject({ path: table, sha256: createHash('sha256').update(before).digest('hex'), referenceCoverage: 'complete-recognized-records', memberVerification: 'not-performed', gameplayVerification: 'not-performed' });
  expect(report.tables[0].resolutions[0]).toMatchObject({ status: 'resolved-file', candidates: [{ rootId: dir, relativePath: 'nested/Mixed.fpl' }] });
  expect(readFileSync(table)).toEqual(before); expect(readdirSync(dir, { recursive: true })).toEqual(listing);
});
it('respects explicit root order and produces deterministic nested inventory', () => {
  const { dir, table, root } = fixture(); const second = join(dir, 'second'); mkdirSync(second);
  for (const r of [root, second]) { mkdirSync(join(r, 'nested')); writeFileSync(join(r, 'nested/Mixed.fpl'), 'x'); }
  const args = ['--table', table, '--library-root', second, '--library-root', root];
  const first = run(args); expect(first.status).toBe(0); expect(run(args).stdout).toBe(first.stdout);
  // Both are nested within the table root; exact relative paths still select the explicit root.
  expect(JSON.parse(first.stdout).tables[0].resolutions[0].candidates[0].rootId).toBe(second);
});
it('reports missing, ambiguous, malformed and unsafe references as incomplete', () => {
  const f = fixture(); expect(run(['--table', f.table]).status).toBe(1);
  mkdirSync(join(f.dir, 'nested')); writeFileSync(join(f.dir, 'nested/Mixed.fpl'), 'x'); writeFileSync(join(f.dir, 'nested/mixed.FPL'), 'x');
  expect(JSON.parse(run(['--table', f.table]).stdout).tables[0].resolutions[0].status).toBe(readdirSync(join(f.dir, 'nested')).length === 2 ? 'ambiguous-file' : 'resolved-file');
  expect(run(['--table', fixture('a.fpl/x', true).table]).status).toBe(1);
  const unsafe = fixture('../outside.fpl/member'); expect(JSON.parse(run(['--table', unsafe.table]).stdout).tables[0].resolutions[0].status).toBe('invalid-path');
});
it('skips symlink files and directories conservatively', () => {
  const f = fixture(); const outside = mkdtempSync(join(realpathSync(tmpdir()), 'fpt-outside-')); dirs.push(outside);
  mkdirSync(join(outside, 'nested')); writeFileSync(join(outside, 'nested/Mixed.fpl'), 'x');
  symlinkSync(join(outside, 'nested'), join(f.dir, 'nested')); symlinkSync(join(outside, 'nested/Mixed.fpl'), join(f.dir, 'link.fpl'));
  const result = run(['--table', f.table, '--library-root', outside]); expect(result.status).toBe(1); expect(result.stderr).toMatch(/partial inventory/);
  expect(JSON.parse(result.stdout).tables[0]).toMatchObject({ inventoryCoverage: 'partial', resolutions: [{ status: 'inventory-incomplete' }] });
});
it.each([[], ['--unknown'], ['--table'], ['--table', 'relative.fpt'], ['--library-root', '/tmp']].map(args => ({ args })))('rejects malformed configuration %j', ({ args }) => {
  const result = run(args); expect(result.status).toBe(2); expect(result.stdout).toBe('');
});
it('reports unavailable roots and rejects explicit symlink roots and tables without following them', () => {
  const f = fixture('a.fpl/member'); writeFileSync(join(f.dir, 'a.fpl'), 'x');
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
