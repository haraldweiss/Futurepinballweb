// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as THREE from 'three';

// Mock modules that rely on browser APIs (localStorage, AudioContext) at module level
vi.mock('../script-engine', () => ({ runFPScript: vi.fn() }));
vi.mock('../audio-system', () => ({ getAudioCtx: vi.fn(), playFPTMusic: vi.fn() }));
vi.mock('cfb', () => ({}));
vi.mock('../graphics/graphics-pipeline', () => ({
  getGraphicsPipeline: vi.fn(() => null),
  initializeGraphicsPipeline: vi.fn(),
}));

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

describe('populateCatalogFromFPTResources — idempotency and clearing', () => {
  beforeEach(() => {
    Object.keys(fptResources.textures).forEach(k => delete fptResources.textures[k]);
    fptResources.playfield = null;
    if (fptResources.models) fptResources.models.clear();
    setGlobalAssetCatalog(new AssetCatalog());
  });

  it('second populate call replaces first (clears stale state)', () => {
    // First populate with one texture
    const tex1 = new THREE.DataTexture(new Uint8Array([255,0,0,255]), 1, 1, THREE.RGBAFormat);
    fptResources.textures['old.png'] = tex1;
    populateCatalogFromFPTResources();
    expect(globalAssetCatalog()!.hasTexture('old.png')).toBe(true);

    // Replace fptResources with new state
    delete fptResources.textures['old.png'];
    const tex2 = new THREE.DataTexture(new Uint8Array([0,0,255,255]), 1, 1, THREE.RGBAFormat);
    fptResources.textures['new.png'] = tex2;
    populateCatalogFromFPTResources();

    // After second populate, old texture must be gone
    expect(globalAssetCatalog()!.hasTexture('old.png')).toBe(false);
    expect(globalAssetCatalog()!.hasTexture('new.png')).toBe(true);
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

import { buildBumper, buildTarget } from '../table';

describe('buildBumper uses AssetCatalog for MS3D models', () => {
  let origCreateElement: typeof document.createElement;

  beforeEach(() => {
    if (fptResources.models) fptResources.models.clear();
    setGlobalAssetCatalog(new AssetCatalog());

    // Stub canvas so createProceduralNormalMap doesn't crash in happy-dom
    origCreateElement = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation((tag: string, ...rest: any[]) => {
      if (tag === 'canvas') {
        const stub = {
          width: 0, height: 0,
          getContext: () => ({
            fillStyle: '',
            fillRect: () => {},
            getImageData: (x: number, y: number, w: number, h: number) => ({
              data: new Uint8ClampedArray(w * h * 4),
            }),
            putImageData: () => {},
            createLinearGradient: () => ({ addColorStop: () => {} }),
          }),
          toDataURL: () => 'data:image/png;base64,',
        };
        return stub as unknown as HTMLCanvasElement;
      }
      return origCreateElement(tag, ...rest);
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('uses extracted MS3D model from catalog when "bumper" is registered', () => {
    const customGeom = new THREE.SphereGeometry(0.5);
    const customMat = new THREE.MeshStandardMaterial({ color: 0xff00ff });
    const customMesh = new THREE.Mesh(customGeom, customMat);
    globalAssetCatalog()!.registerModel('bumper.ms3d', customMesh);

    const result = buildBumper(0, 0, 0xffffff, 'high', 1.0);
    expect(result).toBeInstanceOf(THREE.Group);
    const meshes: THREE.Mesh[] = [];
    result.traverse((o: THREE.Object3D) => { if ((o as THREE.Mesh).isMesh) meshes.push(o as THREE.Mesh); });
    const fromCatalog = meshes.find(m => m.geometry === customGeom);
    expect(fromCatalog).toBeDefined();
  });

  it('falls back to procedural geometry when no bumper model is in catalog', () => {
    const result = buildBumper(0, 0, 0xff0000, 'high', 1.0);
    expect(result).toBeInstanceOf(THREE.Group);
    const meshes: THREE.Mesh[] = [];
    result.traverse((o: THREE.Object3D) => { if ((o as THREE.Mesh).isMesh) meshes.push(o as THREE.Mesh); });
    expect(meshes.length).toBeGreaterThanOrEqual(2);
  });
});

describe('buildTarget uses AssetCatalog for MS3D models', () => {
  let origCreateElementTarget: typeof document.createElement;

  beforeEach(() => {
    if (fptResources.models) fptResources.models.clear();
    setGlobalAssetCatalog(new AssetCatalog());

    // Stub canvas so createProceduralNormalMap doesn't crash in happy-dom
    origCreateElementTarget = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation((tag: string, ...rest: any[]) => {
      if (tag === 'canvas') {
        const stub = {
          width: 0, height: 0,
          getContext: () => ({
            fillStyle: '',
            fillRect: () => {},
            getImageData: (x: number, y: number, w: number, h: number) => ({
              data: new Uint8ClampedArray(w * h * 4),
            }),
            putImageData: () => {},
            createLinearGradient: () => ({ addColorStop: () => {} }),
          }),
          toDataURL: () => 'data:image/png;base64,',
        };
        return stub as unknown as HTMLCanvasElement;
      }
      return origCreateElementTarget(tag, ...rest);
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('uses extracted MS3D model from catalog when "target" is registered', () => {
    const customGeom = new THREE.BoxGeometry(0.6, 0.4, 0.2);
    const customMesh = new THREE.Mesh(customGeom, new THREE.MeshStandardMaterial({ color: 0x00ff00 }));
    globalAssetCatalog()!.registerModel('target.ms3d', customMesh);

    const result = buildTarget(0, 0, 0xffffff);
    expect(result).toBeInstanceOf(THREE.Group);
    const meshes: THREE.Mesh[] = [];
    result.traverse((o: THREE.Object3D) => { if ((o as THREE.Mesh).isMesh) meshes.push(o as THREE.Mesh); });
    const fromCatalog = meshes.find(m => m.geometry === customGeom);
    expect(fromCatalog).toBeDefined();
  });

  it('falls back to procedural geometry when no target model is in catalog', () => {
    const result = buildTarget(0, 0, 0xff0000);
    expect(result).toBeInstanceOf(THREE.Group);
    const meshes: THREE.Mesh[] = [];
    result.traverse((o: THREE.Object3D) => { if ((o as THREE.Mesh).isMesh) meshes.push(o as THREE.Mesh); });
    expect(meshes.length).toBeGreaterThanOrEqual(1);
  });
});
