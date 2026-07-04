// SPDX-License-Identifier: AGPL-3.0-or-later
// © 2026 Harald Weiss
/**
 * fpt-cache.ts — IndexedDB cache for parsed FPT table data.
 *
 * Speichert die extrahierten Rohdaten eines FPT-Files (Texturen, Sounds,
 * Modelle, Config) nach dem ersten Parse. Beim zweiten Laden derselben
 * Table wird gecacht → kein LZO/CFB-Parsing mehr nötig.
 *
 * Cache-Key:  filename + filesize + (first 4KB hash)
 * Eviction:   LRU, max 100 MB
 * Version:    Bump CACHE_VERSION when format changes
 */

const DB_NAME = 'fpt-table-cache';
const STORE_NAME = 'parsed-tables';
const CACHE_VERSION = 1;
const MAX_CACHE_BYTES = 100 * 1024 * 1024; // 100 MB

interface CacheMeta {
  key: string;
  version: number;
  tableName: string;
  fileSize: number;
  /** Raw config object passed to buildTableFn */
  config: any;
  /** Extracted coords */
  coords: Array<{ x: number; y: number }>;
  /** Extracted table elements */
  elements: any[];
  /** VBScript extracted from the table */
  script: string | null;
  /** Name of the largest texture (playfield) */
  playfieldTextureName: string | null;
  /** Timestamps for LRU eviction */
  createdAt: number;
  lastAccessed: number;
  /** Approximate byte size for eviction */
  storageSize: number;
}

export interface CachedTexture {
  name: string;
  data: ArrayBuffer; // Raw image bytes
}

export interface CachedSound {
  name: string;
  data: ArrayBuffer; // Raw audio bytes
}

export interface CachedModel {
  name: string;
  data: ArrayBuffer; // Raw model bytes (FPM/MS3D)
}

export interface CachedFptEntry {
  meta: CacheMeta;
  textures: CachedTexture[];
  sounds: CachedSound[];
  /** Music track (single, stored as raw bytes) */
  musicTrack: ArrayBuffer | null;
  /** FPM/MS3D model entries */
  models: CachedModel[];
  /** Animation sequence data */
  animations: Array<{ name: string; data: any }>;
  /** Raw script bytes (for fptRawBytes) */
  scriptOriginal: string | null;
}

// ─── IndexedDB helpers ───────────────────────────────────────────────────

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, CACHE_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'meta.key' });
        store.createIndex('lastAccessed', 'meta.lastAccessed', { unique: false });
        store.createIndex('fileSize', 'meta.fileSize', { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// ─── Cache key generation ────────────────────────────────────────────────

function simpleHash(bytes: Uint8Array): string {
  let h = 0;
  for (let i = 0; i < bytes.length; i++) {
    h = ((h << 5) - h) + bytes[i];
    h |= 0;
  }
  return h.toString(36);
}

/**
 * Generate a stable cache key from a File object.
 * Uses: filename + fileSize + hash of first 4KB.
 */
export async function generateCacheKey(file: File): Promise<string> {
  const head = await file.slice(0, 4096).arrayBuffer();
  const hash = simpleHash(new Uint8Array(head));
  return `${file.name}|${file.size}|${hash}`;
}

/**
 * Generate a cache key from buffer + name + size (for non-File loads).
 */
export function generateCacheKeyFromBuffer(
  buffer: ArrayBuffer,
  name: string,
  size: number,
): string {
  const head = new Uint8Array(buffer.slice(0, Math.min(4096, buffer.byteLength)));
  const hash = simpleHash(head);
  return `${name}|${size}|${hash}`;
}

// ─── Public API ──────────────────────────────────────────────────────────

/**
 * Try to load a cached FPT entry.
 * Returns null if not found, expired, or version mismatch.
 */
export async function getCachedTable(key: string): Promise<CachedFptEntry | null> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);

    const entry: CachedFptEntry | undefined = await new Promise((resolve, reject) => {
      const req = store.get(key);
      req.onsuccess = () => resolve(req.result as CachedFptEntry | undefined);
      req.onerror = () => reject(req.error);
    });

    if (!entry) return null;
    if (entry.meta.version !== CACHE_VERSION) {
      await deleteCachedTable(key);
      return null;
    }

    // Update access time
    entry.meta.lastAccessed = Date.now();
    const txUpdate = db.transaction(STORE_NAME, 'readwrite');
    txUpdate.objectStore(STORE_NAME).put(entry);

    return entry;
  } catch (e) {
    console.debug('[fpt-cache] get failed:', (e as Error)?.message ?? e);
    return null;
  }
}

/**
 * Store a parsed FPT entry in the cache.
 * Automatically evicts old entries if over the size limit.
 */
export async function setCachedTable(
  key: string,
  data: Omit<CachedFptEntry, 'meta'> & { meta: Omit<CacheMeta, 'key' | 'createdAt' | 'lastAccessed' | 'storageSize'> },
): Promise<void> {
  try {
    const db = await openDB();
    const now = Date.now();

    // Calculate approximate storage size (sum of all ArrayBuffers + JSON overhead)
    let totalBytes = JSON.stringify(data.meta).length * 2;
    for (const t of data.textures) totalBytes += t.data.byteLength;
    for (const s of data.sounds) totalBytes += s.data.byteLength;
    if (data.musicTrack) totalBytes += data.musicTrack.byteLength;
    for (const m of data.models) totalBytes += m.data.byteLength;

    const entry: CachedFptEntry = {
      meta: {
        ...data.meta as any,
        key,
        createdAt: now,
        lastAccessed: now,
        storageSize: totalBytes,
      },
      textures: data.textures,
      sounds: data.sounds,
      musicTrack: data.musicTrack,
      models: data.models,
      animations: data.animations ?? [],
      scriptOriginal: data.scriptOriginal ?? null,
    };

    // Evict old entries if needed
    await ensureCapacity(db, MAX_CACHE_BYTES - totalBytes);

    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(entry);

    // Also update LibraryCache for in-memory access
    const { getLibraryCache } = await import('../library-cache');
    const libCache = getLibraryCache();
    libCache.set(`fpt:${key}`, { config: data.meta.config }, simpleHash(new TextEncoder().encode(key)));
  } catch (e) {
    console.debug('[fpt-cache] set failed:', (e as Error)?.message ?? e);
  }
}

/**
 * Delete a cached entry.
 */
export async function deleteCachedTable(key: string): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete(key);
  } catch {
    // silently ignore
  }
}

/**
 * Clear all cached tables.
 */
export async function clearCache(): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).clear();
  } catch {
    // silently ignore
  }
}

/**
 * Ensure the cache is under `maxBytes` by evicting least-recently-used entries.
 */
async function ensureCapacity(db: IDBDatabase, maxBytes: number): Promise<void> {
  const tx = db.transaction(STORE_NAME, 'readonly');
  const store = tx.objectStore(STORE_NAME);
  const index = store.index('lastAccessed');

  const all: Array<{ key: string; size: number }> = await new Promise((resolve, reject) => {
    const req = index.openCursor(null, 'next'); // oldest first
    const entries: Array<{ key: string; size: number }> = [];
    req.onsuccess = () => {
      const cursor = req.result;
      if (cursor) {
        const entry = cursor.value as CachedFptEntry;
        entries.push({ key: entry.meta.key, size: entry.meta.storageSize });
        cursor.continue();
      } else {
        resolve(entries);
      }
    };
    req.onerror = () => reject(req.error);
  });

  let total = all.reduce((s, e) => s + e.size, 0);
  if (total <= maxBytes) return;

  // Evict oldest entries until under limit
  const txWrite = db.transaction(STORE_NAME, 'readwrite');
  const writeStore = txWrite.objectStore(STORE_NAME);
  for (const entry of all) {
    if (total <= maxBytes) break;
    writeStore.delete(entry.key);
    total -= entry.size;
  }
}

/**
 * Get cache statistics.
 */
export async function getCacheStats(): Promise<{
  entries: number;
  totalSize: number;
  maxSize: number;
}> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);

    const all: CachedFptEntry[] = await new Promise((resolve, reject) => {
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result as CachedFptEntry[]);
      req.onerror = () => reject(req.error);
    });

    return {
      entries: all.length,
      totalSize: all.reduce((s, e) => s + e.meta.storageSize, 0),
      maxSize: MAX_CACHE_BYTES,
    };
  } catch {
    return { entries: 0, totalSize: 0, maxSize: MAX_CACHE_BYTES };
  }
}
