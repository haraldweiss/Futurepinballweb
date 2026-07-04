// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, expect, it } from 'vitest';
import type { ParseWorkerOutput } from '../workers/parse-worker';

describe('parse worker result contract', () => {
  it('exposes raw coordinate bytes for main-thread classification', () => {
    const result = {
      tableName: 'Contract test',
      textures: [],
      sounds: [],
      musicTrack: null,
      script: null,
      scriptBytes: null,
      models: [],
      coords: [],
      coordBytes: new Uint8Array([1, 2, 3, 4]),
      elements: [],
      confidence: 0,
    } satisfies ParseWorkerOutput;

    expect(result.coordBytes).toBeInstanceOf(Uint8Array);
  });
});
