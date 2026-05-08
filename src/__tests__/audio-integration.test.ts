// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock browser-only modules
vi.mock('../dmd', () => ({ dmdEvent: vi.fn() }));
vi.mock('../bam-bridge', () => ({ getBamBridge: vi.fn(() => null) }));
vi.mock('../mechanics/magnet-system', () => ({ magnetSystem: { update: vi.fn() } }));
vi.mock('../utils/script-sandbox', () => ({ runSandboxed: vi.fn(), ScriptSandboxError: class {} }));
vi.mock('../script-engine', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../script-engine')>();
  return { ...actual, runFPScript: vi.fn() };
});
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

import { resolveSoundForPlayback } from '../script-engine';
import { AssetCatalog } from '../assets/asset-catalog';
import { setGlobalAssetCatalog, globalAssetCatalog } from '../game';

describe('resolveSoundForPlayback (catalog-first lookup)', () => {
  beforeEach(() => {
    Object.keys(fptResources.sounds).forEach(k => delete fptResources.sounds[k]);
    setGlobalAssetCatalog(new AssetCatalog());
  });

  it('returns the catalog sound when registered', () => {
    const buf = makeBuffer(0.3);
    globalAssetCatalog()!.registerSound('bumper_hit.wav', buf);
    const result = resolveSoundForPlayback('bumper_hit.wav');
    expect(result).toBe(buf);
  });

  it('returns the catalog sound by partial name match (case-insensitive)', () => {
    const buf = makeBuffer(0.3);
    globalAssetCatalog()!.registerSound('Bumper_Hit.WAV', buf);
    const result = resolveSoundForPlayback('bumper');
    expect(result).toBe(buf);
  });

  it('returns null when sound is not in catalog', () => {
    expect(resolveSoundForPlayback('nonexistent')).toBeNull();
  });

  it('returns null when only placeholders are available', () => {
    expect(resolveSoundForPlayback('anything')).toBeNull();
  });
});

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
