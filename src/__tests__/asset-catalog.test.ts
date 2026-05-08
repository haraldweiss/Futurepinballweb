// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, it, expect, afterEach } from 'vitest';
import * as THREE from 'three';
import { createPlaceholderTexture, createPlaceholderMesh, createPlaceholderAudio, _resetPlaceholderCache } from '../assets/placeholders';

describe('Placeholders', () => {
  afterEach(() => _resetPlaceholderCache());

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

  it('returns a fresh Mesh instance each call (not a shared singleton)', () => {
    const a = createPlaceholderMesh();
    const b = createPlaceholderMesh();
    expect(a).not.toBe(b);
    // But the geometry and material can be shared (cheap)
    expect(a.geometry).toBe(b.geometry);
    expect(a.material).toBe(b.material);
  });
});

import { AssetCatalog } from '../assets/asset-catalog';

describe('AssetCatalog (in-memory)', () => {
  it('returns a placeholder texture when asset is missing', () => {
    const cat = new AssetCatalog();
    const tex = cat.getTexture('does-not-exist');
    expect(tex).toBeInstanceOf(THREE.Texture);
    expect(cat.isPlaceholder(tex)).toBe(true);
  });

  it('returns a registered texture by name', () => {
    const cat = new AssetCatalog();
    const real = new THREE.DataTexture(new Uint8Array([255,0,0,255]), 1, 1, THREE.RGBAFormat);
    cat.registerTexture('playfield', real);
    expect(cat.getTexture('playfield')).toBe(real);
    expect(cat.isPlaceholder(real)).toBe(false);
  });

  it('returns a registered mesh by name', () => {
    const cat = new AssetCatalog();
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(1));
    cat.registerModel('bumper', mesh);
    expect(cat.getModel('bumper')).toBe(mesh);
  });

  it('returns a placeholder model when asset is missing', () => {
    const cat = new AssetCatalog();
    const m = cat.getModel('missing');
    expect(m).toBeInstanceOf(THREE.Mesh);
    expect(cat.isPlaceholder(m)).toBe(true);
  });

  it('returns stats reflecting registered assets', () => {
    const cat = new AssetCatalog();
    cat.registerTexture('a', new THREE.DataTexture(new Uint8Array([0,0,0,255]), 1, 1, THREE.RGBAFormat));
    cat.registerTexture('b', new THREE.DataTexture(new Uint8Array([0,0,0,255]), 1, 1, THREE.RGBAFormat));
    cat.registerModel('m', new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1)));
    const stats = cat.stats();
    expect(stats.textureCount).toBe(2);
    expect(stats.modelCount).toBe(1);
    expect(stats.soundCount).toBe(0);
  });

  it('clear() empties the catalog', () => {
    const cat = new AssetCatalog();
    cat.registerTexture('a', new THREE.DataTexture(new Uint8Array([0,0,0,255]), 1, 1, THREE.RGBAFormat));
    cat.clear();
    expect(cat.stats().textureCount).toBe(0);
  });
});
