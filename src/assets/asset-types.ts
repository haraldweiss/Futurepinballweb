// SPDX-License-Identifier: AGPL-3.0-or-later
// © 2026 Harald Weiss

import * as THREE from 'three';

export type AssetKind = 'texture' | 'model' | 'sound';

export interface CatalogStats {
  textureCount: number;
  modelCount: number;
  soundCount: number;
  estimatedBytes: number;
  memoryBudgetBytes: number;
  usingOnDemand: boolean;
}

export interface SilentBuffer {
  numberOfChannels: number;
  sampleRate: number;
  length: number;
  duration: number;
  getChannelData(channel: number): Float32Array;
}

export type AnyAsset = THREE.Texture | THREE.Mesh | AudioBuffer | SilentBuffer;
