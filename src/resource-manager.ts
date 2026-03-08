/**
 * resource-manager.ts — Phase 4: Memory Budget Management
 *
 * Tracks memory usage across resource types and enforces budgets.
 * Implements LRU (Least Recently Used) eviction when budgets exceeded.
 */

import * as THREE from 'three';
import { logMsg } from './fpt-parser';

/**
 * Resource budget configuration per type
 */
export interface ResourceBudgets {
  textures: number;        // GPU memory for textures (50MB default)
  audioBuffers: number;    // CPU memory for decoded audio (20MB default)
  models: number;          // 3D model meshes (50MB default)
  total: number;           // Hard limit across all (150MB default)
}

/**
 * Resource memory tracking
 */
interface ResourceEntry {
  name: string;
  estimatedBytes: number;
  lastUsed: number;        // Timestamp of last access
  object: THREE.Texture | AudioBuffer | THREE.Mesh | any;
}

/**
 * ResourceManager — Enforces memory budgets and prevents unbounded growth
 *
 * Phase 4 Implementation:
 * - Per-resource-type budgets (textures, audio, models)
 * - LRU eviction when budget exceeded
 * - Hard cap: 150MB total across all resources
 * - Graceful degradation: removes oldest resources first
 */
export class ResourceManager {
  private budgets: ResourceBudgets;
  private tracking = {
    textures: new Map<string, ResourceEntry>(),
    audioBuffers: new Map<string, ResourceEntry>(),
    models: new Map<string, ResourceEntry>(),
  };

  constructor(budgets?: Partial<ResourceBudgets>) {
    // Default budgets
    this.budgets = {
      textures: 50 * 1024 * 1024,        // 50MB for GPU textures
      audioBuffers: 20 * 1024 * 1024,    // 20MB for decoded audio
      models: 50 * 1024 * 1024,          // 50MB for 3D models
      total: 150 * 1024 * 1024,          // 150MB hard cap
      ...budgets,                         // Override with user config
    };

    logMsg(`💾 ResourceManager initialized with ${this.formatBytes(this.budgets.total)} budget`, 'ok');
  }

  /**
   * Add texture resource with memory tracking
   */
  async addTexture(name: string, texture: THREE.Texture): Promise<boolean> {
    const estimatedSize = this.estimateTextureMemory(texture);

    // Check per-resource and total budgets
    if (!this.canAllocate('textures', estimatedSize)) {
      logMsg(
        `⚠️ Texture budget exceeded: ${this.formatBytes(this.getUsage('textures'))} / ${this.formatBytes(this.budgets.textures)}`,
        'warn'
      );

      // Try to free space via LRU eviction
      if (!this.evictLRU('textures', estimatedSize)) {
        return false;  // Cannot allocate even after eviction
      }
    }

    // Add to tracking
    this.tracking.textures.set(name, {
      name,
      estimatedBytes: estimatedSize,
      lastUsed: Date.now(),
      object: texture,
    });

    return true;
  }

  /**
   * Add audio buffer resource
   */
  async addAudioBuffer(name: string, buffer: AudioBuffer): Promise<boolean> {
    const estimatedSize = this.estimateAudioMemory(buffer);

    if (!this.canAllocate('audioBuffers', estimatedSize)) {
      logMsg(
        `⚠️ Audio budget exceeded: ${this.formatBytes(this.getUsage('audioBuffers'))} / ${this.formatBytes(this.budgets.audioBuffers)}`,
        'warn'
      );

      if (!this.evictLRU('audioBuffers', estimatedSize)) {
        return false;
      }
    }

    this.tracking.audioBuffers.set(name, {
      name,
      estimatedBytes: estimatedSize,
      lastUsed: Date.now(),
      object: buffer,
    });

    return true;
  }

  /**
   * Add 3D model resource
   */
  async addModel(name: string, mesh: THREE.Mesh): Promise<boolean> {
    const estimatedSize = this.estimateModelMemory(mesh);

    if (!this.canAllocate('models', estimatedSize)) {
      logMsg(
        `⚠️ Model budget exceeded: ${this.formatBytes(this.getUsage('models'))} / ${this.formatBytes(this.budgets.models)}`,
        'warn'
      );

      if (!this.evictLRU('models', estimatedSize)) {
        return false;
      }
    }

    this.tracking.models.set(name, {
      name,
      estimatedBytes: estimatedSize,
      lastUsed: Date.now(),
      object: mesh,
    });

    return true;
  }

  /**
   * Check if we can allocate more memory
   */
  private canAllocate(type: 'textures' | 'audioBuffers' | 'models', bytes: number): boolean {
    const typeUsage = this.getUsage(type);
    const totalUsage = this.getTotalMemory();

    return (
      typeUsage + bytes <= this.budgets[type] &&
      totalUsage + bytes <= this.budgets.total
    );
  }

  /**
   * LRU eviction: remove least recently used resource to free space
   */
  private evictLRU(type: 'textures' | 'audioBuffers' | 'models', neededBytes: number): boolean {
    const entries = Array.from(this.tracking[type].values());
    if (entries.length === 0) return false;

    // Sort by last used time (oldest first)
    entries.sort((a, b) => a.lastUsed - b.lastUsed);

    let freedBytes = 0;

    for (const entry of entries) {
      // Dispose the resource
      this.disposeResource(entry.object);

      // Remove from tracking
      this.tracking[type].delete(entry.name);
      freedBytes += entry.estimatedBytes;

      logMsg(
        `🗑️ Evicted ${type}: "${entry.name}" (${this.formatBytes(entry.estimatedBytes)}) → freed ${this.formatBytes(freedBytes)}`,
        'warn'
      );

      if (freedBytes >= neededBytes) {
        return true;  // Freed enough space
      }
    }

    return freedBytes >= neededBytes;
  }

  /**
   * Dispose resource and free memory
   */
  private disposeResource(obj: any): void {
    try {
      if (obj instanceof AudioBuffer) {
        // AudioBuffer: typically not disposable, just forget
      } else if (obj instanceof THREE.Texture) {
        obj.dispose();
      } else if (obj instanceof THREE.Mesh) {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
          if (Array.isArray(obj.material)) {
            obj.material.forEach((m: any) => m.dispose?.());
          } else {
            obj.material.dispose();
          }
        }
      }
    } catch (e) {
      // Ignore dispose errors
    }
  }

  /**
   * Get memory usage for a resource type
   */
  getUsage(type: 'textures' | 'audioBuffers' | 'models'): number {
    return Array.from(this.tracking[type].values()).reduce((sum, entry) => sum + entry.estimatedBytes, 0);
  }

  /**
   * Get total memory usage across all types
   */
  getTotalMemory(): number {
    return this.getUsage('textures') + this.getUsage('audioBuffers') + this.getUsage('models');
  }

  /**
   * Get memory statistics
   */
  getStats() {
    return {
      textures: {
        usage: this.getUsage('textures'),
        budget: this.budgets.textures,
        items: this.tracking.textures.size,
      },
      audioBuffers: {
        usage: this.getUsage('audioBuffers'),
        budget: this.budgets.audioBuffers,
        items: this.tracking.audioBuffers.size,
      },
      models: {
        usage: this.getUsage('models'),
        budget: this.budgets.models,
        items: this.tracking.models.size,
      },
      total: {
        usage: this.getTotalMemory(),
        budget: this.budgets.total,
        percentUsed: (this.getTotalMemory() / this.budgets.total) * 100,
      },
    };
  }

  /**
   * Log memory statistics to parse-log
   */
  logStats(): void {
    const stats = this.getStats();
    logMsg(`💾 Memory Usage:`, 'info');
    logMsg(`  Textures:  ${this.formatBytes(stats.textures.usage)} / ${this.formatBytes(stats.textures.budget)} (${stats.textures.items} items)`, 'info');
    logMsg(`  Audio:     ${this.formatBytes(stats.audioBuffers.usage)} / ${this.formatBytes(stats.audioBuffers.budget)} (${stats.audioBuffers.items} items)`, 'info');
    logMsg(`  Models:    ${this.formatBytes(stats.models.usage)} / ${this.formatBytes(stats.models.budget)} (${stats.models.items} items)`, 'info');
    logMsg(`  Total:     ${this.formatBytes(stats.total.usage)} / ${this.formatBytes(stats.total.budget)} (${stats.total.percentUsed.toFixed(1)}%)`, 'info');

    // Warn if usage is high
    if (stats.total.percentUsed > 80) {
      logMsg(`⚠️ Memory usage at ${stats.total.percentUsed.toFixed(0)}%! Consider freeing resources.`, 'warn');
    }
  }

  /**
   * Clear all tracked resources
   */
  clear(): void {
    // Dispose all resources
    for (const entry of this.tracking.textures.values()) {
      this.disposeResource(entry.object);
    }
    for (const entry of this.tracking.audioBuffers.values()) {
      this.disposeResource(entry.object);
    }
    for (const entry of this.tracking.models.values()) {
      this.disposeResource(entry.object);
    }

    // Clear tracking maps
    this.tracking.textures.clear();
    this.tracking.audioBuffers.clear();
    this.tracking.models.clear();

    logMsg(`💾 ResourceManager cleared`, 'ok');
  }

  /**
   * Estimate texture memory usage
   */
  private estimateTextureMemory(texture: THREE.Texture): number {
    if (!texture.image) return 0;

    const width = texture.image.width || 512;
    const height = texture.image.height || 512;

    // Assume RGBA (4 bytes per pixel)
    // Plus mipmap chain (~33% overhead)
    return width * height * 4 * 1.33;
  }

  /**
   * Estimate audio buffer memory
   */
  private estimateAudioMemory(buffer: AudioBuffer): number {
    // PCM: (samples * channels * bytes_per_sample)
    // 16-bit stereo: samples * 2 * 2
    return buffer.length * buffer.numberOfChannels * 2;
  }

  /**
   * Estimate 3D model memory
   */
  private estimateModelMemory(mesh: THREE.Mesh): number {
    let bytes = 0;

    if (mesh.geometry) {
      const geo = mesh.geometry as THREE.BufferGeometry;
      if (geo.attributes) {
        // Sum all buffer attributes (position, normal, uv, etc.)
        for (const attr of Object.values(geo.attributes) as THREE.BufferAttribute[]) {
          bytes += attr.array.byteLength;
        }
      }
      if (geo.index) {
        bytes += geo.index.array.byteLength;
      }
    }

    // Add material textures if present
    const mat = mesh.material as THREE.MeshPhysicalMaterial;
    if (mat) {
      if (mat.map) bytes += this.estimateTextureMemory(mat.map);
      if (mat.normalMap) bytes += this.estimateTextureMemory(mat.normalMap);
      if (mat.metalnessMap) bytes += this.estimateTextureMemory(mat.metalnessMap);
    }

    return bytes;
  }

  /**
   * Format bytes as human-readable string
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
 * Global ResourceManager instance
 */
let globalResourceManager: ResourceManager | null = null;

export function initializeResourceManager(budgets?: Partial<ResourceBudgets>): ResourceManager {
  globalResourceManager = new ResourceManager(budgets);
  return globalResourceManager;
}

export function getResourceManager(): ResourceManager {
  if (!globalResourceManager) {
    globalResourceManager = new ResourceManager();
  }
  return globalResourceManager;
}

export function resetResourceManager(): void {
  if (globalResourceManager) {
    globalResourceManager.clear();
    globalResourceManager = null;
  }
}
