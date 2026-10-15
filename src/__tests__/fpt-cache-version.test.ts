import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { IDBFactory } from 'fake-indexeddb';
vi.mock('../library-cache', () => ({ getLibraryCache: () => ({ set: vi.fn() }) }));
import { getCachedTable, setCachedTable } from '../storage/fpt-cache';

beforeEach(() => vi.stubGlobal('indexedDB', new IDBFactory()));
afterEach(() => vi.unstubAllGlobals());
const content = () => ({
  meta: { tableName: 'Reference', fileSize: 10, config: { name: 'Reference', accentColor: 0xff8800 },
    coords: [], elements: [], script: null, playfieldTextureName: null },
  textures: [], sounds: [], models: [], musicTrack: null, animations: [], scriptOriginal: null,
});

it('rejects version-1 results parsed before the CFB and config fixes', async () => {
  const db = await new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open('fpt-table-cache', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('parsed-tables', { keyPath: 'meta.key' });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction('parsed-tables', 'readwrite');
    tx.objectStore('parsed-tables').put({ ...content(), meta: { ...content().meta, key: 'old', version: 1 } });
    tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error);
  });
  db.close();
  expect(await getCachedTable('old')).toBeNull();
});

it('stamps and reuses the current cache content version centrally', async () => {
  await setCachedTable('new', content());
  const entry = await getCachedTable('new');
  expect(entry?.meta.version).toBe(2);
  expect(entry?.meta.config.accentColor).toBe(0xff8800);
});
