// SPDX-License-Identifier: AGPL-3.0-or-later
// © 2026 Harald Weiss

import * as THREE from 'three';
import type { SilentBuffer } from './asset-types';

let cachedTexture: THREE.Texture | null = null;
let cachedMesh: THREE.Mesh | null = null;
let cachedAudio: SilentBuffer | null = null;

export function createPlaceholderTexture(): THREE.Texture {
  if (cachedTexture) return cachedTexture;
  const data = new Uint8Array([128, 128, 128, 255]);
  const tex = new THREE.DataTexture(data, 1, 1, THREE.RGBAFormat);
  tex.needsUpdate = true;
  cachedTexture = tex;
  return tex;
}

export function createPlaceholderMesh(): THREE.Mesh {
  if (cachedMesh) return cachedMesh;
  const geom = new THREE.BoxGeometry(1, 1, 1);
  const mat = new THREE.MeshStandardMaterial({ color: 0x808080 });
  cachedMesh = new THREE.Mesh(geom, mat);
  return cachedMesh;
}

export function createPlaceholderAudio(): SilentBuffer {
  if (cachedAudio) return cachedAudio;
  const channel = new Float32Array(1);
  cachedAudio = {
    numberOfChannels: 1,
    sampleRate: 44100,
    length: 1,
    duration: 1 / 44100,
    getChannelData: () => channel,
  };
  return cachedAudio;
}

// Test-only reset
export function _resetPlaceholderCache(): void {
  cachedTexture = null;
  cachedMesh = null;
  cachedAudio = null;
}
