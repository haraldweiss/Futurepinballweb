// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as THREE from 'three';

vi.mock('../script-engine', () => ({ runFPScript: vi.fn(), resolveSoundForPlayback: vi.fn() }));
vi.mock('../audio-system', () => ({ getAudioCtx: vi.fn(), playFPTMusic: vi.fn() }));
vi.mock('cfb', () => ({}));

import { textureToDataURL, formatDuration, formatBytes } from '../editor/asset-thumbnail';

describe('AssetThumbnail utilities', () => {
  it('textureToDataURL produces a data URL for a real Three.js texture', () => {
    const data = new Uint8Array([255, 0, 0, 255]);
    const tex = new THREE.DataTexture(data, 1, 1, THREE.RGBAFormat);
    const url = textureToDataURL(tex);
    expect(url).toMatch(/^data:image/);
  });

  it('textureToDataURL returns a placeholder URL for null', () => {
    const url = textureToDataURL(null);
    expect(url).toMatch(/^data:image/);
  });

  it('formatDuration formats seconds correctly', () => {
    expect(formatDuration(0.5)).toBe('0.5s');
    expect(formatDuration(12)).toBe('12.0s');
    expect(formatDuration(125.4)).toBe('2:05');
    expect(formatDuration(3725)).toBe('62:05');
  });

  it('formatBytes formats byte counts in human units', () => {
    expect(formatBytes(0)).toBe('0 B');
    expect(formatBytes(512)).toBe('512 B');
    expect(formatBytes(2048)).toBe('2.0 KB');
    expect(formatBytes(1500000)).toBe('1.4 MB');
  });
});
