import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import * as oracle from 'cfb';
import { read } from '../fpt/cfb-io';

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
