import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import * as oracle from 'cfb';
import { read } from '../fpt/cfb-io';
import { readExternalReferences } from '../fpt/external-references';

const files: string[] = JSON.parse(process.env.FPT_TEST_FILES || '[]');

describe('private real FPT corpus', () => {
  it.skipIf(files.length === 0)('preserves all stream paths and bytes against the independent reader', () => {
    for (const file of files) {
      const bytes = readFileSync(file);
      const expected = oracle.read(bytes, { type: 'buffer' });
      const actual = read(bytes);
      const expectedStreams = expected.FileIndex.flatMap((entry, i) => entry.type === 2
        ? [{ path: expected.FullPaths[i], content: new Uint8Array(entry.content) }] : []);
      const actualStreams = actual.FileIndex.flatMap((entry, i) => entry.type === 2
        ? [{ path: actual.FullPaths[i], content: entry.content }] : []);
      // Storage/root paths may use trailing slashes; stream paths should agree.
      expect(actualStreams.map(entry => entry.path).sort(), file)
        .toEqual(expectedStreams.map(entry => entry.path).sort());
      for (const entry of expectedStreams) {
        expect(actualStreams.find(candidate => candidate.path === entry.path)?.content,
          `${file}: ${entry.path}`).toEqual(entry.content);
      }
    }
  });
});

for (const fixture of [
  { suffix: 'NewTable.fpt', name: 'autoplunger', source: 'fpTextures.fpl\\autoplunger.bmp', count: 472 },
  { suffix: 'DmdDisplayDemo.fpt', name: 'einstein poster', source: 'fpPlayfields.fpl\\einstein poster.jpg', count: 9 },
]) {
  const file = files.find(candidate => candidate.endsWith(fixture.suffix));
  it.skipIf(!file)(`decodes native references in ${fixture.suffix} without modifying input`, () => {
    const bytes = readFileSync(file!);
    const before = Buffer.from(bytes);
    const container = read(bytes);
    const streamsBefore = container.FileIndex.map(entry => entry.content.slice());
    const report = readExternalReferences(container);
    expect(report.issues).toEqual([]);
    expect(report.coverage).toBe('complete-recognized-records');
    expect(report.references).toHaveLength(fixture.count);
    expect(report.references).toContainEqual(expect.objectContaining({
      resourceName: fixture.name, sourcePath: fixture.source,
      streamPath: 'Root Entry/Future Pinball/Image 1', recordOffset: 12, kind: 'image',
    }));
    expect(report.references).toContainEqual(expect.objectContaining({
      resourceName: 'dmd05x05p', libraryPath: 'fpDmdFonts.fpl', memberPath: 'dmd05x05p.dmdf', kind: 'font',
    }));
    expect(bytes).toEqual(before);
    container.FileIndex.forEach((entry, index) => expect(entry.content).toEqual(streamsBefore[index]));
  });
}
