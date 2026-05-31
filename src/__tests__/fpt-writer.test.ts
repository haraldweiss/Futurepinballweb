// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, it, expect, vi } from 'vitest';
vi.mock('../script-engine', () => ({ runFPScript: vi.fn(), resolveSoundForPlayback: vi.fn() }));
vi.mock('../audio-system', () => ({ getAudioCtx: vi.fn(), playFPTMusic: vi.fn() }));

import * as CFB from 'cfb';
import { serializeFPT } from '../fpt-writer';

describe('serializeFPT', () => {
  it('produces a valid CFB container that parses back', () => {
    const bytes = serializeFPT({
      script: 'Sub Test\nEnd Sub\n',
      textures: {}, sounds: {}, models: {}, otherStreams: [],
    });
    expect(bytes).toBeInstanceOf(Uint8Array);
    expect(bytes.length).toBeGreaterThan(512);
    const cfb = CFB.read(bytes, { type: 'array' });
    expect(cfb).toBeDefined();
    expect(cfb.FullPaths.length).toBeGreaterThan(0);
  });

  it('writes the script stream', () => {
    const script = 'Sub Bumper1_Hit\n  AddScore 100\nEnd Sub\n';
    const bytes = serializeFPT({
      script, textures: {}, sounds: {}, models: {}, otherStreams: [],
    });
    const cfb = CFB.read(bytes, { type: 'array' });
    const scriptStream = cfb.FullPaths.find((p: string) => /script|vbs/i.test(p));
    expect(scriptStream).toBeDefined();
  });

  it('preserves arbitrary other streams', () => {
    const customData = new Uint8Array([0xAB, 0xCD, 0xEF]);
    const bytes = serializeFPT({
      script: '',
      textures: {}, sounds: {}, models: {},
      otherStreams: [{ name: 'CustomMeta', data: customData }],
    });
    const cfb = CFB.read(bytes, { type: 'array' });
    const found = cfb.FullPaths.find((p: string) => p.includes('CustomMeta'));
    expect(found).toBeDefined();
  });

  it('writes texture streams under predictable paths', () => {
    const png = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
    const bytes = serializeFPT({
      script: '',
      textures: { 'playfield.png': png },
      sounds: {}, models: {}, otherStreams: [],
    });
    const cfb = CFB.read(bytes, { type: 'array' });
    const found = cfb.FullPaths.find((p: string) => p.includes('playfield.png'));
    expect(found).toBeDefined();
  });

  it('preserves legacy-style streams (Table Element N, Table Data)', () => {
    const tableElementData = new Uint8Array([
      0x08, 0x00, 0x00, 0x00, 0xac, 0xa6, 0xaf, 0xba,
      0x01, 0x00, 0x00, 0x00,
    ]);
    const tableData = new Uint8Array([0x01, 0x02, 0x03, 0x04]);

    const bytes = serializeFPT({
      script: '',
      textures: {}, sounds: {}, models: {},
      otherStreams: [
        { name: 'Table Element 1', data: tableElementData },
        { name: 'Table Data', data: tableData },
      ],
    });

    const cfb = CFB.read(bytes, { type: 'array' });
    const entryNames = (cfb.FileIndex as any[])
      .filter((e: any) => e.size > 0 && e.name)
      .map((e: any) => e.name);

    expect(entryNames).toContain('Table Element 1');
    expect(entryNames).toContain('Table Data');

    const el = (cfb.FileIndex as any[]).find((e: any) => e.name === 'Table Element 1');
    expect(el).toBeDefined();
    const raw = el.content instanceof Uint8Array ? el.content : new Uint8Array(el.content as ArrayLike<number>);
    expect(Array.from(raw)).toEqual([0x08, 0x00, 0x00, 0x00, 0xac, 0xa6, 0xaf, 0xba, 0x01, 0x00, 0x00, 0x00]);
  });

  it('preserves TLV-wrapped legacy texture (header + zLZO payload)', () => {
    // Simulate a legacy Image stream with TLV header + zLZO marker
    const tlvHeader = new Uint8Array(168).fill(0xaa);
    const zlzo = new Uint8Array([0x7a, 0x4c, 0x5a, 0x4f, 0x01, 0x02, 0x03]);
    const combined = new Uint8Array(tlvHeader.length + zlzo.length);
    combined.set(tlvHeader, 0);
    combined.set(zlzo, tlvHeader.length);

    const bytes = serializeFPT({
      script: '',
      textures: { 'Image 31': combined },
      sounds: {}, models: {}, otherStreams: [],
    });

    const cfb = CFB.read(bytes, { type: 'array' });
    const found = cfb.FullPaths.find((p: string) => p.includes('Image 31'));
    expect(found).toBeDefined();

    // Verify raw bytes survive unchanged
    const entry = (cfb.FileIndex as any[]).find((e: any) => e.name === 'Image 31');
    const raw = entry.content instanceof Uint8Array ? entry.content : new Uint8Array(entry.content as ArrayLike<number>);
    expect(raw[168]).toBe(0x7a);
    expect(raw[169]).toBe(0x4c);
  });

  it('full round-trip: parse → serialize → verify all stream categories preserved', async () => {
    // Simulate the fptRawBytes state after parsing a legacy FPT file
    const game = await import('../game');
    game.fptRawBytes.textures['Image 1'] = new Uint8Array([0x89, 0x50, 0x4e, 0x47]);
    game.fptRawBytes.sounds['Music 1'] = new Uint8Array([0x4f, 0x67, 0x67, 0x53]);
    game.fptRawBytes.models['model.ms3d'] = new Uint8Array([0x4d, 0x53, 0x33, 0x44]);
    game.fptRawBytes.otherStreams = [
      { name: 'Table Element 1', data: new Uint8Array([0x03, 0x00, 0x00, 0x00]) },
      { name: 'Table Data', data: new Uint8Array([0xde, 0xad, 0xbe, 0xef]) },
    ];

    const bytes = serializeFPT({
      script: 'Sub Test\nEnd Sub\n',
      textures: game.fptRawBytes.textures,
      sounds:   game.fptRawBytes.sounds,
      models:   game.fptRawBytes.models,
      otherStreams: game.fptRawBytes.otherStreams,
    });

    // Verify in the output
    const cfb = CFB.read(bytes, { type: 'array' });
    const names = (cfb.FileIndex as any[])
      .filter((e: any) => e.size > 0 && e.name && e.name !== 'Root Entry')
      .map((e: any) => e.name);

    expect(names).toContain('Script');
    expect(names).toContain('Image 1');
    expect(names).toContain('Music 1');
    expect(names).toContain('model.ms3d');
    expect(names).toContain('Table Element 1');
    expect(names).toContain('Table Data');

    // Cleanup
    game.resetFPTRawBytes();
  });

  it('script content survives round-trip via CFB', () => {
    const modified = 'Sub Modified\n  AddScore 999\nEnd Sub';

    const bytes = serializeFPT({
      script: modified, textures: {}, sounds: {}, models: {}, otherStreams: [],
    });
    const cfb = CFB.read(bytes, { type: 'array' });
    const scriptStream = cfb.FileIndex.find((s: any) => s.name && /Script/i.test(s.name));
    expect(scriptStream).toBeDefined();
    if (scriptStream) {
      const scriptText = new TextDecoder().decode(scriptStream.content as Uint8Array);
      expect(scriptText).toContain('AddScore 999');
    }
  });
});

describe('fptRawBytes registry', () => {
  it('has the expected shape', async () => {
    const game = await import('../game');
    expect(game.fptRawBytes).toBeDefined();
    expect(game.fptRawBytes.textures).toBeDefined();
    expect(game.fptRawBytes.sounds).toBeDefined();
    expect(game.fptRawBytes.models).toBeDefined();
    expect(Array.isArray(game.fptRawBytes.otherStreams)).toBe(true);
  });

  it('resetFPTRawBytes clears state', async () => {
    const game = await import('../game');
    game.fptRawBytes.textures['x.png'] = new Uint8Array([1,2,3]);
    game.fptRawBytes.otherStreams.push({ name: 'a', data: new Uint8Array([0]) });
    game.resetFPTRawBytes();
    expect(Object.keys(game.fptRawBytes.textures).length).toBe(0);
    expect(game.fptRawBytes.otherStreams.length).toBe(0);
  });
});
