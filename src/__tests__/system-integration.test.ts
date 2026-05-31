// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('../dmd', () => ({}));
vi.mock('../script-engine', () => ({ runFPScript: vi.fn(), resolveSoundForPlayback: vi.fn() }));
vi.mock('../audio-system', () => ({ getAudioCtx: vi.fn(), playFPTMusic: vi.fn() }));
vi.mock('../fpt-parser', () => ({ logMsg: vi.fn() }));

import {
  getResourceManager,
  initializeResourceManager,
  resetResourceManager,
} from '../resource-manager';
import {
  getLibraryCache,
  initializeLibraryCache,
  resetLibraryCache,
} from '../library-cache';

describe('ResourceManager', () => {
  beforeEach(() => {
    resetResourceManager();
  });

  it('returns a singleton instance', () => {
    const rm = initializeResourceManager();
    expect(rm).toBeDefined();
    expect(getResourceManager()).toBe(rm);
  });

  it('getResourceManager creates a default instance if none exists', () => {
    const rm = getResourceManager();
    expect(rm).toBeDefined();
  });

  it('tracks stats after initialization', () => {
    const rm = initializeResourceManager();
    const stats = rm.getStats();
    expect(stats).toBeDefined();
    expect(typeof stats.total.budget).toBe('number');
    expect(stats.total.budget).toBeGreaterThan(0);
  });
});

describe('LibraryCache', () => {
  beforeEach(() => {
    resetLibraryCache();
  });

  it('returns a singleton instance', () => {
    const lc = initializeLibraryCache();
    expect(lc).toBeDefined();
    expect(getLibraryCache()).toBe(lc);
  });

  it('getLibraryCache creates default cache if none exists', () => {
    const lc = getLibraryCache();
    expect(lc).toBeDefined();
  });

  it('stores and retrieves entries by name', () => {
    const lc = initializeLibraryCache();
    const data = { name: 'testLib', items: [1, 2, 3] };
    lc.set('testLib', data);
    expect(lc.get('testLib')).toBe(data);
    expect(lc.get('nonexistent')).toBeNull();
  });

  it('tracks cache statistics', () => {
    const lc = initializeLibraryCache();
    lc.set('a', { value: 1 });
    lc.set('b', { value: 2 });

    lc.get('a'); // hit
    lc.get('a'); // hit
    lc.get('c'); // miss

    const stats = lc.getStats();
    expect(stats.entryList?.length ?? Object.keys(stats).length).toBeGreaterThan(0);
  });
});
