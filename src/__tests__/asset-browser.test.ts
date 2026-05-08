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

import { AssetCatalog } from '../assets/asset-catalog';
import { setGlobalAssetCatalog } from '../game';
import { AssetBrowser } from '../editor/asset-browser';

describe('AssetBrowser', () => {
  beforeEach(() => {
    setGlobalAssetCatalog(new AssetCatalog());
  });

  it('renders empty state when catalog has no assets', () => {
    const container = document.createElement('div');
    const browser = new AssetBrowser();
    browser.attachTo(container);
    browser.refresh();
    expect(container.querySelector('.asset-browser-empty')).not.toBeNull();
  });

  it('lists registered textures with their names', () => {
    const cat = new AssetCatalog();
    setGlobalAssetCatalog(cat);
    cat.registerTexture('playfield', new THREE.DataTexture(new Uint8Array([0,0,0,255]), 1, 1, THREE.RGBAFormat));
    cat.registerTexture('bumper.png', new THREE.DataTexture(new Uint8Array([0,0,0,255]), 1, 1, THREE.RGBAFormat));

    const container = document.createElement('div');
    const browser = new AssetBrowser();
    browser.attachTo(container);
    browser.refresh();

    const items = container.querySelectorAll('.asset-item-texture');
    expect(items.length).toBe(2);
    const names = [...items].map(el => el.querySelector('.asset-name')?.textContent);
    expect(names).toContain('playfield');
    expect(names).toContain('bumper.png');
  });

  it('lists registered models with their names', () => {
    const cat = new AssetCatalog();
    setGlobalAssetCatalog(cat);
    cat.registerModel('bumper.ms3d', new THREE.Mesh(new THREE.BoxGeometry(1,1,1)));

    const container = document.createElement('div');
    const browser = new AssetBrowser();
    browser.attachTo(container);
    browser.refresh();

    const items = container.querySelectorAll('.asset-item-model');
    expect(items.length).toBe(1);
    expect(items[0].querySelector('.asset-name')?.textContent).toBe('bumper.ms3d');
  });

  it('lists registered sounds with their names and durations', () => {
    const cat = new AssetCatalog();
    setGlobalAssetCatalog(cat);
    const buf = {
      numberOfChannels: 1, sampleRate: 44100, length: 44100, duration: 1.0,
      getChannelData: () => new Float32Array(1),
      copyFromChannel: () => {}, copyToChannel: () => {},
    } as unknown as AudioBuffer;
    cat.registerSound('hit.wav', buf);

    const container = document.createElement('div');
    const browser = new AssetBrowser();
    browser.attachTo(container);
    browser.refresh();

    const items = container.querySelectorAll('.asset-item-sound');
    expect(items.length).toBe(1);
    expect(items[0].querySelector('.asset-name')?.textContent).toBe('hit.wav');
    expect(items[0].querySelector('.asset-duration')?.textContent).toBe('1.0s');
  });

  it('shows section counts in headers', () => {
    const cat = new AssetCatalog();
    setGlobalAssetCatalog(cat);
    cat.registerTexture('a', new THREE.DataTexture(new Uint8Array([0,0,0,255]), 1, 1, THREE.RGBAFormat));
    cat.registerTexture('b', new THREE.DataTexture(new Uint8Array([0,0,0,255]), 1, 1, THREE.RGBAFormat));
    cat.registerModel('m', new THREE.Mesh(new THREE.BoxGeometry(1,1,1)));

    const container = document.createElement('div');
    const browser = new AssetBrowser();
    browser.attachTo(container);
    browser.refresh();

    expect(container.querySelector('.asset-section-textures .asset-section-count')?.textContent).toBe('2');
    expect(container.querySelector('.asset-section-models   .asset-section-count')?.textContent).toBe('1');
    expect(container.querySelector('.asset-section-sounds   .asset-section-count')?.textContent).toBe('0');
  });

  it('does not interpret asset names as HTML (XSS safety)', () => {
    const cat = new AssetCatalog();
    setGlobalAssetCatalog(cat);
    cat.registerTexture('<script>alert(1)</script>', new THREE.DataTexture(new Uint8Array([0,0,0,255]), 1, 1, THREE.RGBAFormat));

    const container = document.createElement('div');
    const browser = new AssetBrowser();
    browser.attachTo(container);
    browser.refresh();

    expect(container.querySelectorAll('script').length).toBe(0);
    expect(container.querySelector('.asset-name')?.textContent).toBe('<script>alert(1)</script>');
  });
});
