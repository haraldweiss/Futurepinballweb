/**
 * audio-source-pool.ts — Phase 6: Audio Buffer Source Pooling
 *
 * Implements a pool of reusable AudioBufferSource objects to reduce
 * garbage collection pressure and improve audio playback performance.
 *
 * Instead of creating new AudioBufferSource for each sound:
 * Before: allocate → play → disconnect → GC
 * After: acquire from pool → play → disconnect → return to pool
 */

import { logMsg } from './fpt-parser';

/**
 * AudioSourcePool — Reusable pool of BufferSource objects
 *
 * Benefits:
 * - Reduces GC pressure (fewer allocations)
 * - Faster sound playback (no allocation overhead)
 * - Predictable memory usage (fixed pool size)
 * - Better performance during heavy audio usage
 */
export class AudioSourcePool {
  private pool: AudioBufferSource[] = [];
  private poolSize: number;
  private ctx: AudioContext;
  private stats = {
    acquired: 0,
    released: 0,
    created: 0,
    reused: 0,
  };

  constructor(ctx: AudioContext, poolSize: number = 16) {
    this.ctx = ctx;
    this.poolSize = poolSize;

    // Pre-allocate pool
    for (let i = 0; i < poolSize; i++) {
      this.pool.push(this.ctx.createBufferSource());
    }

    logMsg(
      `🎵 AudioSourcePool initialized with ${poolSize} pre-allocated sources`,
      'ok'
    );
  }

  /**
   * Acquire a source from the pool
   * Returns a source from pool if available, or creates a new one
   */
  acquireSource(): AudioBufferSource {
    let source: AudioBufferSource;

    if (this.pool.length > 0) {
      source = this.pool.pop()!;
      this.stats.reused++;
    } else {
      source = this.ctx.createBufferSource();
      this.stats.created++;
    }

    this.stats.acquired++;
    return source;
  }

  /**
   * Release a source back to the pool
   * Clears connections and returns to pool if under poolSize
   */
  releaseSource(source: AudioBufferSource): void {
    try {
      // Disconnect from all nodes
      source.disconnect();

      // Reset buffer reference
      source.buffer = null;

      // Return to pool if under limit
      if (this.pool.length < this.poolSize) {
        this.pool.push(source);
      }
      // Otherwise let it be GC'd

      this.stats.released++;
    } catch (e) {
      // Source already disconnected or invalid, ignore
      logMsg(`⚠️ Error releasing audio source: ${(e as Error).message}`, 'warn');
    }
  }

  /**
   * Get pool statistics
   */
  getStats() {
    return {
      poolSize: this.poolSize,
      available: this.pool.length,
      inUse: this.stats.acquired - this.stats.released,
      acquired: this.stats.acquired,
      released: this.stats.released,
      created: this.stats.created,
      reused: this.stats.reused,
      reuseRate:
        this.stats.reused + this.stats.created > 0
          ? (
              (this.stats.reused /
                (this.stats.reused + this.stats.created)) *
              100
            ).toFixed(1) + '%'
          : 'N/A',
    };
  }

  /**
   * Log pool statistics
   */
  logStats(): void {
    const stats = this.getStats();
    logMsg(`🎵 AudioSourcePool Stats:`, 'info');
    logMsg(
      `  Pool Size: ${stats.poolSize} (${stats.available} available, ${stats.inUse} in use)`,
      'info'
    );
    logMsg(
      `  Acquired: ${stats.acquired} (${stats.reused} reused, ${stats.created} new)`,
      'info'
    );
    logMsg(`  Released: ${stats.released}`, 'info');
    logMsg(`  Reuse Rate: ${stats.reuseRate}`, 'info');
  }

  /**
   * Clear the pool
   */
  clear(): void {
    this.pool = [];
    logMsg(`🎵 AudioSourcePool cleared`, 'ok');
  }
}

/**
 * Global audio source pool instance
 */
let globalAudioSourcePool: AudioSourcePool | null = null;

/**
 * Initialize global audio source pool
 */
export function initializeAudioSourcePool(
  ctx: AudioContext,
  poolSize: number = 16
): AudioSourcePool {
  globalAudioSourcePool = new AudioSourcePool(ctx, poolSize);
  return globalAudioSourcePool;
}

/**
 * Get global audio source pool instance
 */
export function getAudioSourcePool(): AudioSourcePool {
  if (!globalAudioSourcePool) {
    // Lazy initialization with default context
    try {
      const ctx = new (window.AudioContext ||
        (window as any).webkitAudioContext)();
      globalAudioSourcePool = new AudioSourcePool(ctx, 16);
    } catch (e) {
      throw new Error(
        'AudioSourcePool initialization failed: AudioContext unavailable'
      );
    }
  }
  return globalAudioSourcePool;
}

/**
 * Reset global audio source pool
 */
export function resetAudioSourcePool(): void {
  if (globalAudioSourcePool) {
    globalAudioSourcePool.clear();
    globalAudioSourcePool = null;
  }
}

/**
 * Play audio buffer using pooled source
 * Convenience function for simple playback with pooling
 */
export function playAudioBufferPooled(
  buffer: AudioBuffer,
  volume: number = 1.0,
  onEnded?: () => void
): void {
  try {
    const pool = getAudioSourcePool();
    const ctx = pool['ctx'];

    // Acquire source from pool
    const source = pool.acquireSource();
    const gain = ctx.createGain();

    // Setup audio graph
    source.buffer = buffer;
    source.connect(gain);
    gain.connect(ctx.destination);
    gain.gain.value = Math.max(0, Math.min(1, volume));

    // Setup cleanup on end
    source.onended = () => {
      pool.releaseSource(source);
      onEnded?.();
    };

    // Start playback
    source.start();
  } catch (e) {
    logMsg(
      `❌ Error playing audio from pool: ${(e as Error).message}`,
      'error'
    );
  }
}
