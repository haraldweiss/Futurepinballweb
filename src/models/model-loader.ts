/**
 * Model Loader — Extraction and Caching System
 *
 * Responsible for:
 * - Extracting MS3D models from FPT file streams
 * - Caching parsed models globally for reuse
 * - Lazy loading and memory management
 * - Fallback to procedural geometry
 */

import * as THREE from 'three';
import { parseMS3D, ms3dToThreeJS, MS3DModel } from './ms3d-parser';

/**
 * Global model cache — shared across all tables
 */
interface ModelCacheEntry {
  name: string;
  model: MS3DModel;
  mesh: THREE.Mesh | null;
  lastUsed: number;
}

export class ModelLibrary {
  private cache: Map<string, ModelCacheEntry> = new Map();
  private maxCacheSize: number = 50 * 1024 * 1024; // 50MB
  private currentCacheSize: number = 0;
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;

  constructor() {
    // Periodically clean up unused models (every 5 minutes)
    this.cleanupInterval = setInterval(() => this.cleanupUnused(), 5 * 60 * 1000);
  }

  /**
   * Get a cached model
   */
  getModel(name: string): THREE.Mesh | null {
    const entry = this.cache.get(name);
    if (entry) {
      entry.lastUsed = Date.now();
      return entry.mesh;
    }
    return null;
  }

  /**
   * Cache a parsed model
   */
  cacheModel(name: string, model: MS3DModel, mesh: THREE.Mesh | null): void {
    // Remove if already exists
    if (this.cache.has(name)) {
      this.cache.delete(name);
    }

    // Estimate size (rough approximation)
    const estimatedSize = (model.vertices.length * 48) + (model.triangles.length * 96) + (model.materials.length * 512);

    // Check if we need to clean up
    while (this.currentCacheSize + estimatedSize > this.maxCacheSize && this.cache.size > 0) {
      this.evictLRU();
    }

    this.cache.set(name, {
      name,
      model,
      mesh,
      lastUsed: Date.now(),
    });

    this.currentCacheSize += estimatedSize;
  }

  /**
   * Clear entire cache
   */
  clear(): void {
    this.cache.forEach(entry => {
      if (entry.mesh) {
        entry.mesh.geometry.dispose();
        if (Array.isArray(entry.mesh.material)) {
          entry.mesh.material.forEach(m => m.dispose());
        } else {
          entry.mesh.material.dispose();
        }
      }
    });

    this.cache.clear();
    this.currentCacheSize = 0;
  }

  /**
   * Cleanup: Remove models not used in the last 10 minutes
   */
  private cleanupUnused(): void {
    const now = Date.now();
    const timeout = 10 * 60 * 1000; // 10 minutes

    const toDelete: string[] = [];
    this.cache.forEach((entry, key) => {
      if (now - entry.lastUsed > timeout) {
        toDelete.push(key);
      }
    });

    toDelete.forEach(key => {
      const entry = this.cache.get(key)!;
      if (entry.mesh) {
        entry.mesh.geometry.dispose();
        if (Array.isArray(entry.mesh.material)) {
          entry.mesh.material.forEach(m => m.dispose());
        } else {
          entry.mesh.material.dispose();
        }
      }

      const size = (entry.model.vertices.length * 48) + (entry.model.triangles.length * 96);
      this.currentCacheSize -= size;
      this.cache.delete(key);
    });

    if (toDelete.length > 0) {
      console.log(`🧹 ModelLibrary cleaned up ${toDelete.length} unused models`);
    }
  }

  /**
   * Evict Least Recently Used model
   */
  private evictLRU(): void {
    let lruKey: string | null = null;
    let lruTime = Infinity;

    this.cache.forEach((entry, key) => {
      if (entry.lastUsed < lruTime) {
        lruTime = entry.lastUsed;
        lruKey = key;
      }
    });

    if (lruKey) {
      const entry = this.cache.get(lruKey)!;
      if (entry.mesh) {
        entry.mesh.geometry.dispose();
        if (Array.isArray(entry.mesh.material)) {
          entry.mesh.material.forEach(m => m.dispose());
        } else {
          entry.mesh.material.dispose();
        }
      }

      const size = (entry.model.vertices.length * 48) + (entry.model.triangles.length * 96);
      this.currentCacheSize -= size;
      this.cache.delete(lruKey);
    }
  }

  /**
   * Get cache statistics
   */
  getStats() {
    return {
      modelCount: this.cache.size,
      cacheSizeKB: Math.round(this.currentCacheSize / 1024),
      maxSizeKB: Math.round(this.maxCacheSize / 1024),
    };
  }

  /**
   * Dispose resources on cleanup
   */
  dispose(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.clear();
  }
}

/**
 * Global model library instance
 */
export const modelLibrary = new ModelLibrary();

/**
 * Extract models from FPT file streams
 */
export interface ExtractedModel {
  name: string;
  bytes: Uint8Array;
}

export function extractMS3DModels(cfbStreams: Map<string, Uint8Array>): ExtractedModel[] {
  const models: ExtractedModel[] = [];

  // Look for streams containing .ms3d files
  // Common patterns: "PlungerCase.ms3d", "[Model]", "Mesh", etc.
  cfbStreams.forEach((bytes, streamName) => {
    // Check if stream name suggests it's a model
    const isModelStream = streamName.toLowerCase().includes('mesh') ||
                         streamName.toLowerCase().includes('model') ||
                         streamName.toLowerCase().endsWith('.ms3d') ||
                         streamName.toLowerCase().startsWith('_3d');

    if (!isModelStream) return;

    // Check for MS3D magic header in the bytes
    const header = new TextDecoder().decode(bytes.slice(0, 4));
    if (header === 'MS3D') {
      models.push({
        name: streamName,
        bytes: bytes,
      });
    }
  });

  if (models.length > 0) {
    console.log(`📦 Found ${models.length} MS3D models in FPT file`);
  }

  return models;
}

/**
 * Parse and cache MS3D models
 */
export function parseAndCacheModels(extractedModels: ExtractedModel[]): Map<string, THREE.Mesh | null> {
  const modelMap = new Map<string, THREE.Mesh | null>();

  extractedModels.forEach(extracted => {
    const modelName = extracted.name;

    // Check if already cached
    const cached = modelLibrary.getModel(modelName);
    if (cached) {
      modelMap.set(modelName, cached);
      return;
    }

    // Parse MS3D binary format
    const model = parseMS3D(extracted.bytes);
    if (!model) {
      console.warn(`⚠️  Failed to parse model: ${modelName}`);
      modelMap.set(modelName, null);
      return;
    }

    // Convert to Three.js
    const mesh = ms3dToThreeJS(model);
    if (!mesh) {
      console.warn(`⚠️  Failed to convert model to Three.js: ${modelName}`);
      modelMap.set(modelName, null);
      return;
    }

    // Cache globally
    modelLibrary.cacheModel(modelName, model, mesh);
    modelMap.set(modelName, mesh);

    console.log(`✅ Loaded model: ${modelName} (${model.vertices.length} vertices, ${model.triangles.length} triangles)`);
  });

  return modelMap;
}

/**
 * Get or create Three.js mesh from cached model (clones for reuse)
 */
export function getModelMesh(modelName: string, cloneGeometry: boolean = true): THREE.Mesh | null {
  const cached = modelLibrary.getModel(modelName);
  if (!cached) {
    return null;
  }

  if (!cloneGeometry) {
    return cached;
  }

  // Clone geometry and material for independent instances
  const clonedGeo = cached.geometry.clone();
  const clonedMat = Array.isArray(cached.material)
    ? cached.material.map(m => m.clone())
    : cached.material.clone();

  const cloned = new THREE.Mesh(clonedGeo, clonedMat);
  cloned.castShadow = cached.castShadow;
  cloned.receiveShadow = cached.receiveShadow;

  return cloned;
}

/**
 * Find model by type (bumper, target, flipper, ramp, etc.)
 */
export function findModelByType(type: 'bumper' | 'target' | 'flipper' | 'ramp' | 'plunger'): THREE.Mesh | null {
  // Search cache for models matching type
  const typePatterns: Record<string, RegExp> = {
    bumper: /bumper|pop-?bump/i,
    target: /target|drop/i,
    flipper: /flipper|flip/i,
    ramp: /ramp|ramp/i,
    plunger: /plunger|plunger/i,
  };

  const pattern = typePatterns[type];
  if (!pattern) return null;

  // Note: This would require access to cache keys — for now return null
  // Would need to refactor ModelLibrary to expose keys or search method
  return null;
}

/**
 * Estimate total memory used by models
 */
export function getModelMemoryUsage(): {
  usedKB: number;
  maxKB: number;
  percentage: number;
} {
  const stats = modelLibrary.getStats();
  const usedKB = stats.cacheSizeKB;
  const maxKB = stats.maxSizeKB;
  const percentage = (usedKB / maxKB) * 100;

  return { usedKB, maxKB, percentage };
}
