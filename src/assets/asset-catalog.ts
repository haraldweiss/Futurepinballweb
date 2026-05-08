// SPDX-License-Identifier: AGPL-3.0-or-later
// © 2026 Harald Weiss

import * as THREE from 'three';
import type { CatalogStats, SilentBuffer } from './asset-types';
import { createPlaceholderTexture, createPlaceholderMesh, createPlaceholderAudio } from './placeholders';

export interface AssetCatalogOptions {
  memoryBudgetBytes?: number;
}

const DEFAULT_BUDGET = 200 * 1024 * 1024; // 200 MB

export class AssetCatalog {
  private textures = new Map<string, THREE.Texture>();
  private models   = new Map<string, THREE.Mesh>();
  private sounds   = new Map<string, AudioBuffer | SilentBuffer>();
  private estimatedBytes = 0;
  private readonly memoryBudgetBytes: number;
  private usingOnDemand = false;
  private placeholders = new WeakSet<object>();

  constructor(options: AssetCatalogOptions = {}) {
    this.memoryBudgetBytes = options.memoryBudgetBytes ?? DEFAULT_BUDGET;
  }

  registerTexture(name: string, tex: THREE.Texture, sizeBytes = 0): void {
    this.textures.set(name, tex);
    this.estimatedBytes += sizeBytes;
    this.checkBudget();
  }

  registerModel(name: string, mesh: THREE.Mesh, sizeBytes = 0): void {
    this.models.set(name, mesh);
    this.estimatedBytes += sizeBytes;
    this.checkBudget();
  }

  registerSound(name: string, buf: AudioBuffer | SilentBuffer, sizeBytes = 0): void {
    this.sounds.set(name, buf);
    this.estimatedBytes += sizeBytes;
    this.checkBudget();
  }

  getTexture(name: string): THREE.Texture {
    const tex = this.textures.get(name);
    if (tex) return tex;
    const placeholder = createPlaceholderTexture();
    this.placeholders.add(placeholder);
    return placeholder;
  }

  getModel(name: string): THREE.Mesh {
    const mesh = this.models.get(name);
    if (mesh) return mesh;
    const placeholder = createPlaceholderMesh();
    this.placeholders.add(placeholder);
    return placeholder;
  }

  getSound(name: string): AudioBuffer | SilentBuffer {
    const snd = this.sounds.get(name);
    if (snd) return snd;
    const placeholder = createPlaceholderAudio();
    this.placeholders.add(placeholder);
    return placeholder;
  }

  hasTexture(name: string): boolean { return this.textures.has(name); }
  hasModel(name: string):   boolean { return this.models.has(name); }
  hasSound(name: string):   boolean { return this.sounds.has(name); }

  isPlaceholder(asset: object): boolean {
    return this.placeholders.has(asset);
  }

  stats(): CatalogStats {
    return {
      textureCount: this.textures.size,
      modelCount:   this.models.size,
      soundCount:   this.sounds.size,
      estimatedBytes: this.estimatedBytes,
      memoryBudgetBytes: this.memoryBudgetBytes,
      usingOnDemand: this.usingOnDemand,
    };
  }

  clear(): void {
    this.textures.clear();
    this.models.clear();
    this.sounds.clear();
    this.estimatedBytes = 0;
    this.usingOnDemand = false;
  }

  private checkBudget(): void {
    if (this.estimatedBytes > this.memoryBudgetBytes) {
      this.usingOnDemand = true;
    }
  }
}
