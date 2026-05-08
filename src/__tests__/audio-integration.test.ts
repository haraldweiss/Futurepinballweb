// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock browser-only modules
vi.mock('../script-engine', () => ({ runFPScript: vi.fn() }));
vi.mock('../audio-system', () => ({
  getAudioCtx: vi.fn(),
  playFPTMusic: vi.fn(),
  playSound: vi.fn(),
  startBGMusic: vi.fn(),
  stopBGMusic: vi.fn(),
}));
vi.mock('cfb', () => ({}));

import { mapFPTSounds } from '../fpt-parser';
import { fptResources } from '../game';

function makeBuffer(durationSec: number): AudioBuffer {
  const sampleRate = 44100;
  const length = Math.max(1, Math.floor(durationSec * sampleRate));
  const channel = new Float32Array(length);
  return {
    numberOfChannels: 1,
    sampleRate,
    length,
    duration: durationSec,
    getChannelData: () => channel,
    copyFromChannel: () => {},
    copyToChannel: () => {},
  } as unknown as AudioBuffer;
}

describe('mapFPTSounds: name-based mapping', () => {
  beforeEach(() => {
    fptResources.mapped = { bumper: null, flipper: null, drain: null };
  });

  it('maps a sound named "bumper_hit" to mapped.bumper', () => {
    const sounds: Record<string, AudioBuffer> = {
      'bumper_hit.wav': makeBuffer(0.3),
    };
    mapFPTSounds(sounds);
    expect(fptResources.mapped.bumper).toBe(sounds['bumper_hit.wav']);
  });

  it('maps a sound named "flipper_swing" to mapped.flipper', () => {
    const sounds: Record<string, AudioBuffer> = {
      'flipper_swing.wav': makeBuffer(0.2),
    };
    mapFPTSounds(sounds);
    expect(fptResources.mapped.flipper).toBe(sounds['flipper_swing.wav']);
  });

  it('maps a sound named "drain_event" to mapped.drain', () => {
    const sounds: Record<string, AudioBuffer> = {
      'drain_event.wav': makeBuffer(0.5),
    };
    mapFPTSounds(sounds);
    expect(fptResources.mapped.drain).toBe(sounds['drain_event.wav']);
  });

  it('falls back to first/second sounds when no name match', () => {
    const sounds: Record<string, AudioBuffer> = {
      'mystery_a.wav': makeBuffer(0.4),
      'mystery_b.wav': makeBuffer(0.4),
    };
    mapFPTSounds(sounds);
    expect(fptResources.mapped.bumper).toBe(sounds['mystery_a.wav']);
    expect(fptResources.mapped.flipper).toBe(sounds['mystery_b.wav']);
  });
});
