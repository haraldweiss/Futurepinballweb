/**
 * library-cache.ts — Phase 5: Library Caching with TTL & Validation
 *
 * Implements a global library cache with:
 * - Time-to-live (TTL) based expiration (1 hour default)
 * - Automatic cleanup of idle entries (5 minute intervals)
 * - Hash-based validation for cache invalidation
 * - Memory tracking integration with ResourceManager
 */

import { logMsg } from './fpt-parser';

/**
 * Cached library entry with metadata
 */
interface CachedLibraryEntry {
  data: any;           // Actual library object
  hash: string;        // Content hash for validation
  lastUsed: number;    // Timestamp of last access (for LRU)
  created: number;     // Timestamp when cached
  accessCount: number; // Number of times accessed
}

/**
 * LibraryCache — Global cache with TTL and cleanup
 *
 * Features:
 * - Automatic expiration after 1 hour of idle time
 * - Periodic cleanup every 5 minutes
 * - Hash validation to detect stale entries
 * - Statistics tracking (hits, misses, evictions)
 */
export class LibraryCache {
  private cache = new Map<string, CachedLibraryEntry>();
  private ttl = 60 * 60 * 1000;              // 1 hour in milliseconds
  private cleanupInterval = 5 * 60 * 1000;   // 5 minute cleanup interval
  private cleanupTimer: NodeJS.Timeout | null = null;
  private stats = {
    hits: 0,
    misses: 0,
    evictions: 0,
    createdAt: Date.now(),
  };

  constructor(ttlMs: number = 60 * 60 * 1000, cleanupIntervalMs: number = 5 * 60 * 1000) {
    this.ttl = ttlMs;
    this.cleanupInterval = cleanupIntervalMs;
    logMsg(`📚 LibraryCache initialized with ${this.formatTime(this.ttl)} TTL`, 'ok');
  }

  /**
   * Get library from cache
   * Returns null if not found or expired
   * Updates lastUsed timestamp on hit
   */
  get(name: string): any | null {
    const entry = this.cache.get(name);
    if (!entry) {
      this.stats.misses++;
      return null;
    }

    const now = Date.now();
    const age = now - entry.lastUsed;

    // Check if entry has expired
    if (age > this.ttl) {
      this.cache.delete(name);
      this.stats.evictions++;
      logMsg(`🗑️ Cache evicted (TTL): "${name}" (idle ${this.formatTime(age)})`, 'warn');
      return null;
    }

    // Update last used timestamp
    entry.lastUsed = now;
    entry.accessCount++;
    this.stats.hits++;

    return entry.data;
  }

  /**
   * Store library in cache with optional hash validation
   */
  set(name: string, data: any, hash?: string): void {
    const now = Date.now();

    // Generate hash if not provided
    const contentHash = hash || this.hashObject(data);

    this.cache.set(name, {
      data,
      hash: contentHash,
      lastUsed: now,
      created: now,
      accessCount: 1,
    });

    const sizeEstimate = this.estimateSize(data);
    logMsg(
      `💾 Cache stored: "${name}" (${this.formatBytes(sizeEstimate)}, hash: ${contentHash.substring(0, 8)}...)`,
      'info'
    );
  }

  /**
   * Validate cached entry against provided hash
   * Returns true if entry exists and hash matches
   * Returns false if entry doesn't exist or hash differs (stale)
   */
  validate(name: string, expectedHash: string): boolean {
    const entry = this.cache.get(name);
    if (!entry) return false;

    const matches = entry.hash === expectedHash;
    if (!matches) {
      this.cache.delete(name);
      this.stats.evictions++;
      logMsg(`⚠️ Cache invalidated (hash mismatch): "${name}"`, 'warn');
      return false;
    }

    return true;
  }

  /**
   * Check if library is cached (without updating lastUsed)
   */
  has(name: string): boolean {
    const entry = this.cache.get(name);
    if (!entry) return false;

    const age = Date.now() - entry.lastUsed;
    return age <= this.ttl;  // Not expired
  }

  /**
   * Manually evict a library from cache
   */
  evict(name: string): boolean {
    if (this.cache.has(name)) {
      this.cache.delete(name);
      this.stats.evictions++;
      logMsg(`🗑️ Cache evicted (manual): "${name}"`, 'warn');
      return true;
    }
    return false;
  }

  /**
   * Clear all cached libraries
   */
  clear(): void {
    const count = this.cache.size;
    this.cache.clear();
    logMsg(`🗑️ Cache cleared (${count} entries removed)`, 'ok');
  }

  /**
   * Start automatic cleanup timer
   * Runs every 5 minutes to remove expired entries
   */
  startCleanupTimer(): void {
    if (this.cleanupTimer) return;  // Already running

    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.cleanupInterval);

    logMsg(`⏱️ Cache cleanup timer started (${this.formatTime(this.cleanupInterval)} interval)`, 'ok');
  }

  /**
   * Stop automatic cleanup timer
   */
  stopCleanupTimer(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
      logMsg(`⏹️ Cache cleanup timer stopped`, 'ok');
    }
  }

  /**
   * Run cleanup: remove expired entries
   * Returns count of entries removed
   */
  cleanup(): number {
    const now = Date.now();
    let removed = 0;

    for (const [name, entry] of this.cache.entries()) {
      const age = now - entry.lastUsed;
      if (age > this.ttl) {
        this.cache.delete(name);
        this.stats.evictions++;
        removed++;
        logMsg(
          `🗑️ Cache evicted (cleanup): "${name}" (idle ${this.formatTime(age)})`,
          'warn'
        );
      }
    }

    if (removed > 0) {
      logMsg(
        `🧹 Cache cleanup: removed ${removed} expired entries (${this.cache.size} remaining)`,
        'info'
      );
    }

    return removed;
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const totalSize = Array.from(this.cache.values())
      .reduce((sum, entry) => sum + this.estimateSize(entry.data), 0);

    return {
      entries: this.cache.size,
      totalSize,
      hits: this.stats.hits,
      misses: this.stats.misses,
      evictions: this.stats.evictions,
      hitRate: this.stats.hits + this.stats.misses > 0
        ? (this.stats.hits / (this.stats.hits + this.stats.misses) * 100).toFixed(1) + '%'
        : 'N/A',
      uptime: this.formatTime(Date.now() - this.stats.createdAt),
      entryList: Array.from(this.cache.entries()).map(([name, entry]) => ({
        name,
        size: this.estimateSize(entry.data),
        age: this.formatTime(Date.now() - entry.created),
        lastUsed: this.formatTime(Date.now() - entry.lastUsed),
        accessCount: entry.accessCount,
      })),
    };
  }

  /**
   * Log cache statistics
   */
  logStats(): void {
    const stats = this.getStats();
    logMsg(`📚 Library Cache Stats:`, 'info');
    logMsg(`  Entries: ${stats.entries} (${this.formatBytes(stats.totalSize)} total)`, 'info');
    logMsg(`  Hit Rate: ${stats.hitRate} (${stats.hits} hits, ${stats.misses} misses)`, 'info');
    logMsg(`  Evictions: ${stats.evictions}`, 'info');
    logMsg(`  Uptime: ${stats.uptime}`, 'info');
    logMsg(`  TTL: ${this.formatTime(this.ttl)}`, 'info');

    // List each cached library
    for (const entry of stats.entryList) {
      logMsg(
        `    • ${entry.name}: ${this.formatBytes(entry.size)} (age: ${entry.age}, used ${entry.accessCount}×)`,
        'debug'
      );
    }
  }

  /**
   * Estimate memory size of library object (rough estimate)
   */
  private estimateSize(obj: any): number {
    if (!obj) return 0;

    // Rough estimation: multiply JSON serialization size by 2 for object overhead
    try {
      const jsonSize = JSON.stringify(obj).length;
      return jsonSize * 2;  // 2x for object structure overhead
    } catch {
      return 1024 * 1024;  // Fallback: estimate 1MB if JSON fails
    }
  }

  /**
   * Generate hash of library object for validation
   * Simple hash: first 50 chars of JSON + entry count
   */
  private hashObject(obj: any): string {
    try {
      const json = JSON.stringify(obj);
      // Create simple hash: first 32 chars + entry count + length
      const count = Object.keys(obj).length;
      return `${json.substring(0, 32)}_${count}_${json.length}`;
    } catch {
      return `error_${Date.now()}`;
    }
  }

  /**
   * Format milliseconds as human-readable time
   */
  private formatTime(ms: number): string {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    if (ms < 3600000) return `${(ms / 60000).toFixed(1)}m`;
    return `${(ms / 3600000).toFixed(1)}h`;
  }

  /**
   * Format bytes as human-readable size
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return (bytes / Math.pow(k, i)).toFixed(1) + ' ' + sizes[i];
  }
}

/**
 * Global library cache instance
 */
let globalLibraryCache: LibraryCache | null = null;

/**
 * Initialize global library cache
 */
export function initializeLibraryCache(ttlMs?: number, cleanupIntervalMs?: number): LibraryCache {
  globalLibraryCache = new LibraryCache(ttlMs, cleanupIntervalMs);
  globalLibraryCache.startCleanupTimer();
  return globalLibraryCache;
}

/**
 * Get global library cache instance
 */
export function getLibraryCache(): LibraryCache {
  if (!globalLibraryCache) {
    globalLibraryCache = new LibraryCache();
    globalLibraryCache.startCleanupTimer();
  }
  return globalLibraryCache;
}

/**
 * Reset global library cache
 */
export function resetLibraryCache(): void {
  if (globalLibraryCache) {
    globalLibraryCache.stopCleanupTimer();
    globalLibraryCache.clear();
    globalLibraryCache = null;
  }
}

/**
 * Get cached library by name
 * Wrapper for fpt-parser.ts compatibility
 */
export function getLibraryByName(name: string): any | null {
  return getLibraryCache().get(name);
}

/**
 * Get library or fetch/parse if not cached
 * Used for lazy loading with validation
 */
export async function getOrFetchLibrary(
  name: string,
  fetchFn: () => Promise<any>,
  hash?: string
): Promise<any> {
  const cache = getLibraryCache();

  // Try to get from cache
  const cached = cache.get(name);
  if (cached) {
    // Validate if hash provided
    if (hash && !cache.validate(name, hash)) {
      logMsg(`⚠️ Cache validation failed for "${name}", fetching fresh copy`, 'warn');
    } else {
      return cached;
    }
  }

  // Fetch and cache
  logMsg(`📥 Fetching library "${name}"...`, 'info');
  const data = await fetchFn();
  cache.set(name, data, hash);

  return data;
}
