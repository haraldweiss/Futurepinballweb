// SPDX-License-Identifier: AGPL-3.0-or-later
import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import { AssetCache } from '../assets/asset-cache';

describe('AssetCache (IndexedDB)', () => {
  let cache: AssetCache;
  beforeEach(async () => {
    cache = new AssetCache('test-db');
    await cache.open();
    await cache.clear();
  });

  it('stores and retrieves a binary blob by key', async () => {
    const data = new Uint8Array([1, 2, 3, 4]);
    await cache.put('table-abc:bumper.png', data);
    const out = await cache.get('table-abc:bumper.png');
    expect(out).toBeInstanceOf(Uint8Array);
    expect(Array.from(out!)).toEqual([1, 2, 3, 4]);
  });

  it('returns null for missing keys', async () => {
    expect(await cache.get('missing-key')).toBeNull();
  });

  it('hasKey returns true after put, false after delete', async () => {
    await cache.put('k', new Uint8Array([0]));
    expect(await cache.hasKey('k')).toBe(true);
    await cache.delete('k');
    expect(await cache.hasKey('k')).toBe(false);
  });

  it('clear empties the cache', async () => {
    await cache.put('a', new Uint8Array([1]));
    await cache.put('b', new Uint8Array([2]));
    await cache.clear();
    expect(await cache.hasKey('a')).toBe(false);
    expect(await cache.hasKey('b')).toBe(false);
  });
});
