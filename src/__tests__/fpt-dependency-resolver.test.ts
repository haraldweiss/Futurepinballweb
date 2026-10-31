import { describe, expect, it } from 'vitest';
import { resolveLibraryFiles, type DependencyFile } from '../fpt/dependency-resolver';
import type { ExternalReference } from '../fpt/external-references';

function reference(libraryPath = 'Libraries\\Mixed.FPL', memberPath = 'Models\\Ball'): ExternalReference {
  return { streamPath: 'Root/PinModel1', recordOffset: 12, resourceName: 'Ball',
    sourcePath: `${libraryPath}\\${memberPath}`, libraryPath, memberPath, kind: 'model' };
}
const roots = [{ id: 'local', priority: 0 }, { id: 'shared', priority: 1 }];
const file = (rootId: string, relativePath: string): DependencyFile => ({ rootId, relativePath });

describe('library file resolution', () => {
  it('matches nested paths with Windows separators and ASCII case folding, preserving diagnostics', () => {
    const ref = reference();
    const candidate = file('local', 'libraries/mIXED.fpl');
    expect(resolveLibraryFiles([ref], roots, [candidate])).toEqual([
      { reference: ref, status: 'resolved-file', candidates: [candidate] },
    ]);
  });
  it('uses the earliest matching root priority, regardless of inventory order', () => {
    const winner = file('local', 'Libraries/Mixed.FPL');
    expect(resolveLibraryFiles([reference()], roots.slice().reverse(), [
      file('shared', 'Libraries/Mixed.FPL'), file('shared', 'libraries/mixed.fpl'), winner,
    ])[0]).toMatchObject({ status: 'resolved-file', candidates: [winner] });
  });
  it('falls back to later roots and reports missing files without guessing basenames', () => {
    const candidate = file('shared', 'libraries/mixed.fpl');
    expect(resolveLibraryFiles([reference()], roots, [candidate])[0]?.candidates).toEqual([candidate]);
    expect(resolveLibraryFiles([reference()], roots, [file('local', 'Mixed.FPL')])[0])
      .toMatchObject({ status: 'missing-file', candidates: [] });
  });
  it('reports case collisions and equal-priority roots as ambiguous in stable spelling order', () => {
    const equalRoots = [{ id: 'z', priority: 2 }, { id: 'a', priority: 2 }];
    const candidates = [file('a', 'Libraries/Mixed.FPL'), file('a', 'libraries/mixed.fpl'), file('z', 'libraries/mixed.fpl')];
    const expected = [{ reference: reference(), status: 'ambiguous-file', candidates }];
    expect(resolveLibraryFiles([reference()], equalRoots, candidates)).toEqual(expected);
    expect(resolveLibraryFiles([reference()], equalRoots.slice().reverse(), candidates.slice().reverse())).toEqual(expected);
  });
  it('preserves reference order, supports multiple members, and never mutates input', () => {
    const refs = [reference('missing.fpl'), reference(), reference('libraries/mixed.fpl', 'Other')];
    const files = [file('local', 'libraries/mixed.fpl')];
    const before = JSON.stringify({ refs, roots, files });
    const result = resolveLibraryFiles(refs, roots, files);
    expect(result.map(r => r.status)).toEqual(['missing-file', 'resolved-file', 'resolved-file']);
    expect(result.map(r => r.reference)).toEqual(refs);
    expect(JSON.stringify({ refs, roots, files })).toBe(before);
  });
  it.each(['', '/a.fpl', '\\a.fpl', 'C:\\a.fpl', 'C:a.fpl', '\\\\host\\a.fpl',
    '../a.fpl', 'a/../b.fpl', 'a//b.fpl', 'a.fpl/', 'a\0.fpl', 'a\n.fpl', 'a\u007f.fpl'])
  ('rejects unsafe library path %j', libraryPath => {
    expect(resolveLibraryFiles([reference(libraryPath)], roots, [])[0])
      .toMatchObject({ status: 'invalid-path', candidates: [] });
  });
  it.each(['', '/member', 'C:member', '\\\\host\\member', '..', 'a/../b', 'a//b', 'a/', 'a\0', 'a\t', 'a\u007f'])
  ('rejects unsafe member path %j even when the library exists', memberPath => {
    expect(resolveLibraryFiles([reference('a.fpl', memberPath)], roots, [file('local', 'a.fpl')])[0])
      .toMatchObject({ status: 'invalid-path', candidates: [] });
  });
  it('rejects unsafe inventory paths as configuration errors', () => {
    for (const path of ['/a.fpl', '../a.fpl', 'a/./b.fpl', 'a\0.fpl', 'C:a.fpl', 'a.fpl:stream']) {
      expect(() => resolveLibraryFiles([], roots, [file('local', path)])).toThrow(/path/i);
    }
  });
  it('does not apply Unicode case folding', () => {
    expect(resolveLibraryFiles([reference('Ä.fpl')], roots, [file('local', 'ä.fpl')])[0]?.status).toBe('missing-file');
  });
  it('deduplicates identical descriptors without hiding case-colliding files', () => {
    const candidate = file('local', 'Libraries/Mixed.FPL');
    expect(resolveLibraryFiles([reference()], roots, [candidate, { ...candidate }])[0])
      .toMatchObject({ status: 'resolved-file', candidates: [candidate] });
  });
  it.each([NaN, Infinity, -Infinity])('rejects non-finite root priority %s', priority => {
    expect(() => resolveLibraryFiles([], [{ id: 'a', priority }], [])).toThrow(/priority/i);
  });
  it('rejects unknown root IDs and duplicate IDs as caller configuration errors', () => {
    expect(() => resolveLibraryFiles([], roots, [file('unknown', 'a.fpl')])).toThrow(/root/i);
    expect(() => resolveLibraryFiles([], [roots[0], roots[0]], [])).toThrow(/duplicate/i);
  });
});
