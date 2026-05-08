// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as THREE from 'three';

// Mock modules that rely on browser APIs (localStorage, AudioContext) at module level
vi.mock('../script-engine', () => ({ runFPScript: vi.fn() }));
vi.mock('../audio-system', () => ({ getAudioCtx: vi.fn(), playFPTMusic: vi.fn() }));
vi.mock('cfb', () => ({}));

import { AssetCatalog } from '../assets/asset-catalog';
import { setGlobalAssetCatalog, globalAssetCatalog, fptResources } from '../game';
import { populateCatalogFromFPTResources } from '../fpt-parser';
import { resolvePlayfieldTexture, resolveModel } from '../table';

describe('FPT parser → AssetCatalog integration', () => {
  beforeEach(() => {
    // Reset state between tests
    Object.keys(fptResources.textures).forEach(k => delete fptResources.textures[k]);
    fptResources.playfield = null;
    if (fptResources.models) fptResources.models.clear();
    setGlobalAssetCatalog(new AssetCatalog());
  });

  it('copies textures from fptResources into globalAssetCatalog', () => {
    const tex = new THREE.DataTexture(new Uint8Array([0,0,255,255]), 1, 1, THREE.RGBAFormat);
    fptResources.textures['blue.png'] = tex;
    populateCatalogFromFPTResources();
    expect(globalAssetCatalog()!.getTexture('blue.png')).toBe(tex);
  });

  it('copies playfield texture under the name "playfield"', () => {
    const tex = new THREE.DataTexture(new Uint8Array([0,255,0,255]), 1, 1, THREE.RGBAFormat);
    fptResources.playfield = tex;
    populateCatalogFromFPTResources();
    expect(globalAssetCatalog()!.getTexture('playfield')).toBe(tex);
  });

  it('copies models from fptResources.models into globalAssetCatalog', () => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(1,1,1));
    fptResources.models!.set('bumper.ms3d', mesh);
    populateCatalogFromFPTResources();
    expect(globalAssetCatalog()!.getModel('bumper.ms3d')).toBe(mesh);
  });

  it('returns placeholder for unknown texture name', () => {
    populateCatalogFromFPTResources();
    const tex = globalAssetCatalog()!.getTexture('nope');
    expect(globalAssetCatalog()!.isPlaceholder(tex)).toBe(true);
  });
});

describe('Renderer texture resolution via catalog', () => {
  beforeEach(() => {
    Object.keys(fptResources.textures).forEach(k => delete fptResources.textures[k]);
    fptResources.playfield = null;
    setGlobalAssetCatalog(new AssetCatalog());
  });

  it('resolvePlayfieldTexture returns catalog texture when registered', () => {
    const tex = new THREE.DataTexture(new Uint8Array([255,255,255,255]), 1, 1, THREE.RGBAFormat);
    fptResources.playfield = tex;
    populateCatalogFromFPTResources();
    expect(resolvePlayfieldTexture()).toBe(tex);
  });

  it('resolvePlayfieldTexture returns null when no playfield is registered', () => {
    populateCatalogFromFPTResources();
    expect(resolvePlayfieldTexture()).toBeNull();
  });
});

describe('Renderer model resolution via catalog', () => {
  beforeEach(() => {
    if (fptResources.models) fptResources.models.clear();
    setGlobalAssetCatalog(new AssetCatalog());
  });

  it('resolveModel returns registered mesh when present in catalog', () => {
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.5));
    fptResources.models!.set('bumper.ms3d', mesh);
    populateCatalogFromFPTResources();
    const resolved = resolveModel('bumper.ms3d');
    expect(resolved).toBe(mesh);
  });

  it('resolveModel returns null when model is not in catalog', () => {
    populateCatalogFromFPTResources();
    expect(resolveModel('nonexistent.ms3d')).toBeNull();
  });

  it('resolveModel returns null when catalog returns placeholder', () => {
    populateCatalogFromFPTResources();
    // missing model returns placeholder; resolver treats as "no model available"
    expect(resolveModel('also-missing')).toBeNull();
  });
});
