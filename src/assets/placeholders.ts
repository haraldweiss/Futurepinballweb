// SPDX-License-Identifier: AGPL-3.0-or-later
// © 2026 Harald Weiss

import * as THREE from 'three';
import type { SilentBuffer } from './asset-types';

let cachedTexture: THREE.Texture | null = null;
let cachedMeshGeom: THREE.BoxGeometry | null = null;
let cachedMeshMat: THREE.MeshStandardMaterial | null = null;
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
  if (!cachedMeshGeom) cachedMeshGeom = new THREE.BoxGeometry(1, 1, 1);
  if (!cachedMeshMat) cachedMeshMat = new THREE.MeshStandardMaterial({ color: 0x808080 });
  return new THREE.Mesh(cachedMeshGeom, cachedMeshMat);
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
  cachedMeshGeom = null;
  cachedMeshMat = null;
  cachedAudio = null;
}
