import { describe, expect, it } from 'vitest';
import * as oracle from 'cfb';
import { read } from '../fpt/cfb-io';

describe('CFB reader FAT addressing', () => {
  it('preserves small streams across multiple mini sectors', () => {
    const container = oracle.utils.cfb_new();
    const payload = Uint8Array.from({ length: 233 }, (_, i) => (i * 17) % 251);
    oracle.utils.cfb_add(container, 'Table Element 1', payload);
    const bytes = new Uint8Array(oracle.write(container, { type: 'array' }));
    expect(read(bytes).FileIndex.find(entry => entry.name === 'Table Element 1')?.content).toEqual(payload);
  });

  it('reads every directory sector when the FAT is not physical sector zero', () => {
    const container = oracle.utils.cfb_new();
    for (let i = 0; i < 12; i++) {
      oracle.utils.cfb_add(container, `Table Element ${i + 1}`, new Uint8Array([i, 42]));
    }
    const original = new Uint8Array(oracle.write(container, { type: 'array' }));
    const header = new DataView(original.buffer);
    expect(header.getUint32(44, true)).toBe(1); // One FAT sector suffices for this fixture.
    const oldFatSector = header.getUint32(76, true);
    const relocatedSector = original.length / 512 - 1;
    const bytes = new Uint8Array(original.length + 512);
    bytes.set(original);
    bytes.set(original.subarray((oldFatSector + 1) * 512, (oldFatSector + 2) * 512), original.length);
    const view = new DataView(bytes.buffer);
    view.setUint32(76, relocatedSector, true);
    view.setUint32(original.length + oldFatSector * 4, 0xffffffff, true); // Old FAT sector is free.
    view.setUint32(original.length + relocatedSector * 4, 0xfffffffd, true); // New FAT sector.

    const expected = oracle.read(bytes, { type: 'array' }).FileIndex.filter(entry => entry.type === 2);
    const actual = read(bytes).FileIndex.filter(entry => entry.type === 2);
    expect(expected.length).toBeGreaterThan(12);
    expect(actual.map(entry => entry.name).sort()).toEqual(expected.map(entry => entry.name).sort());
    for (const entry of expected) {
      expect(actual.find(candidate => candidate.name === entry.name)?.content).toEqual(new Uint8Array(entry.content));
    }
  });
});
