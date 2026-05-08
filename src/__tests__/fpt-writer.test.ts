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
