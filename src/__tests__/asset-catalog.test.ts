// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { createPlaceholderTexture, createPlaceholderMesh, createPlaceholderAudio } from '../assets/placeholders';

describe('Placeholders', () => {
  it('creates a 1x1 grey placeholder texture', () => {
    const tex = createPlaceholderTexture();
    expect(tex).toBeInstanceOf(THREE.Texture);
    expect(tex.image.width).toBe(1);
    expect(tex.image.height).toBe(1);
  });

  it('creates a 1x1x1 grey placeholder mesh', () => {
    const mesh = createPlaceholderMesh();
    expect(mesh).toBeInstanceOf(THREE.Mesh);
    expect(mesh.geometry.type).toBe('BoxGeometry');
  });

  it('creates a silent placeholder audio buffer (sample rate 44100, 1 sample)', () => {
    const buf = createPlaceholderAudio();
    // SilentBuffer is a typed shape — just an object with channels
    expect(buf.numberOfChannels).toBe(1);
    expect(buf.sampleRate).toBe(44100);
    expect(buf.length).toBe(1);
  });
});
