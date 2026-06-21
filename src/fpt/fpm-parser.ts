// SPDX-License-Identifier: AGPL-3.0-or-later
// © 2026 Harald Weiss

/**
 * FPM (Future Pinball Model) Format Parser
 *
 * Handles the full format pipeline:
 *   .fpm file → zLZO regions → LZO decompress → MS3D0 variant → THREE.js mesh
 *   .fpl library → FDAT → CFB → ModelData → TLV header → zLZO → LZO → MS3D0
 */

import * as THREE from 'three';
import * as CFB from 'cfb';
import type { CFB$Container } from 'cfb';
import { lzo1xDecompress } from './lzo';

export interface FPMModel {
  name: string;
  vertices: number[];
  normals: number[];
  uvs: number[];
  indices: number[];
  materials: Array<{
    name: string; ambient: number[]; diffuse: number[]; specular: number[];
    emissive: number[]; shininess: number; transparency: number; texture: string;
  }>;
  hasTexture: boolean;
  textureData: Uint8Array | null;
  textureName: string;
}

// ─── Vertex stride layouts ─────────────────────────────────────────────────
interface StrideLayout {
  stride: number;
  normalOff: number;
  normalType: 'packed' | 'float3';
  uvOff: number;
  uvType: 'float2' | 'byte2';
}

const STRIDE_LAYOUTS: Record<number, StrideLayout> = {
  12: { stride: 12, normalOff: -1,  normalType: 'packed', uvOff: -1,  uvType: 'float2' },
  15: { stride: 15, normalOff: 12,  normalType: 'packed', uvOff: -1,  uvType: 'float2' },
  16: { stride: 16, normalOff: 12,  normalType: 'packed', uvOff: -1,  uvType: 'float2' },
  24: { stride: 24, normalOff: 12,  normalType: 'float3', uvOff: -1,  uvType: 'float2' },
  28: { stride: 28, normalOff: 12,  normalType: 'float3', uvOff: 24,  uvType: 'float2' },
  32: { stride: 32, normalOff: 12,  normalType: 'float3', uvOff: 24,  uvType: 'float2' },
  36: { stride: 36, normalOff: 12,  normalType: 'float3', uvOff: 24,  uvType: 'float2' },
  40: { stride: 40, normalOff: 12,  normalType: 'float3', uvOff: 24,  uvType: 'float2' },
  48: { stride: 48, normalOff: 12,  normalType: 'float3', uvOff: 24,  uvType: 'float2' },
  60: { stride: 60, normalOff: 12,  normalType: 'float3', uvOff: 24,  uvType: 'float2' },
  64: { stride: 64, normalOff: 12,  normalType: 'float3', uvOff: 24,  uvType: 'float2' },
};

// ─── LZO helpers ──────────────────────────────────────────────────────────

function tryInnerDecompress(data: Uint8Array): Uint8Array | null {
  if (data[0] === 0x5a && data[1] === 0x4f && data[2] === 0x36 && data[3] === 0x6c) {
    try { const r = lzo1xDecompress(data); if (r && r.length > data.length) return r; } catch {}
  }
  if (data[0] === 0x4c && data[1] === 0x5a && data[2] === 0x4f) {
    try { const r = lzo1xDecompress(data); if (r && r.length > data.length) return r; } catch {}
  }
  return null;
}

function findZLZORegions(bytes: Uint8Array): Uint8Array[] {
  const regions: Uint8Array[] = [];
  let pos = 0;
  while (pos < bytes.length - 4) {
    if (bytes[pos] === 0x7a && bytes[pos+1] === 0x4c &&
        bytes[pos+2] === 0x5a && bytes[pos+3] === 0x4f) {
      try {
        const d = lzo1xDecompress(bytes.slice(pos));
        if (d && d.length > 4) regions.push(d);
      } catch { /* skip */ }
      pos += 4;
    } else { pos++; }
  }
  return regions;
}

// ─── MS3D variant parser ─────────────────────────────────────────────────

interface MS3DParsedResult {
  vertices: number[];
  normals: number[];
  uvs: number[];
  indices: number[];
}

/**
 * Parse MS3D-like vertex data from a decompressed region.
 * Extracts position, normal, and UV data based on detected stride.
 */
function parseMS3DVariant(data: Uint8Array): MS3DParsedResult | null {
  if (data.length < 24) return null;
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);

  let ms3dOff = -1;
  const maxScan = Math.min(data.length - 10, 256);
  for (let i = 0; i < maxScan; i++) {
    if (data[i]===0x4d && data[i+1]===0x53 &&
        data[i+2]===0x33 && data[i+3]===0x44 &&
        data[i+4]===0x30) { ms3dOff = i; break; }
  }
  if (ms3dOff < 0) return null;

  const nPosCandidates = [ms3dOff+5, ms3dOff+7, ms3dOff+8, ms3dOff+10,
                          ms3dOff+12, ms3dOff+14, ms3dOff+16, ms3dOff+18];
  const strides = [12, 15, 16, 24, 28, 32, 36, 40, 48, 60, 64];

  for (const nPos of nPosCandidates) {
    if (nPos + 2 > data.length) break;
    const cnt = view.getUint16(nPos, true);
    if (cnt < 1 || cnt > 50000) continue;

    for (const stride of strides) {
      const layout = STRIDE_LAYOUTS[stride];
      if (!layout) continue;

      const dataStart = nPos + 4;
      const dataEnd = dataStart + cnt * stride;
      if (dataEnd > data.length) continue;

      let valid = true;
      const samples = [0, Math.floor(cnt*0.25), Math.floor(cnt*0.5), cnt-1];
      for (const s of samples) {
        const off = dataStart + s * stride;
        if (off + 12 > data.length) { valid = false; break; }
        const x = view.getFloat32(off, true);
        const y = view.getFloat32(off+4, true);
        const z = view.getFloat32(off+8, true);
        if (isNaN(x) || isNaN(y) || isNaN(z) ||
            Math.abs(x) > 500 || Math.abs(y) > 500 || Math.abs(z) > 500) {
          valid = false; break;
        }
      }
      if (!valid) continue;

      const vertices: number[] = [];
      const normals: number[] = [];
      const uvs: number[] = [];

      for (let i = 0; i < cnt; i++) {
        const off = dataStart + i * stride;

        // Position (float32 x 3)
        vertices.push(
          view.getFloat32(off, true),
          view.getFloat32(off + 4, true),
          view.getFloat32(off + 8, true)
        );

        // Normal
        if (layout.normalOff >= 0) {
          if (layout.normalType === 'float3') {
            normals.push(
              view.getFloat32(off + layout.normalOff, true),
              view.getFloat32(off + layout.normalOff + 4, true),
              view.getFloat32(off + layout.normalOff + 8, true)
            );
          } else {
            const nx = view.getInt8(off + layout.normalOff);
            const ny = view.getInt8(off + layout.normalOff + 1);
            const nz = view.getInt8(off + layout.normalOff + 2);
            const len = Math.sqrt(nx*nx + ny*ny + nz*nz) || 1;
            normals.push(nx/len, ny/len, nz/len);
          }
        }

        // UV
        if (layout.uvOff >= 0) {
          if (layout.uvType === 'float2') {
            uvs.push(
              view.getFloat32(off + layout.uvOff, true),
              view.getFloat32(off + layout.uvOff + 4, true)
            );
          } else {
            uvs.push(view.getUint8(off + layout.uvOff) / 255,
                     view.getUint8(off + layout.uvOff + 1) / 255);
          }
        }
      }

      // Parse triangle data
      const triOff = dataEnd;
      let indices: number[] = [];
      if (triOff + 4 <= data.length) {
        const triCount = view.getUint16(triOff, true);
        if (triCount > 0 && triCount < 100000) {
          for (const ts of [70, 21, 10, 32]) {
            if (triOff + 4 + triCount * ts > data.length) continue;
            const tmp: number[] = [];
            for (let i = 0; i < triCount; i++) {
              const tOff = triOff + 4 + i * ts;
              const i1 = view.getUint16(tOff + 1, true);
              const i2 = view.getUint16(tOff + 3, true);
              const i3 = view.getUint16(tOff + 5, true);
              if (i1 < cnt && i2 < cnt && i3 < cnt) tmp.push(i1, i2, i3);
            }
            if (tmp.length > 0) { indices = tmp; break; }
          }
        }
      }

      return { vertices, normals, uvs, indices };
    }
  }

  return null;
}

// ─── FPL embedded model extraction ───────────────────────────────────────

function extractModelFromFDAT(fdatBytes: Uint8Array): { name: string; compressedData: Uint8Array } | null {
  if (fdatBytes[0] === 0xd0 && fdatBytes[1] === 0xcf) {
    try {
      const cfb = CFB.read(fdatBytes, { type: 'array' });
      const entries = (cfb.FileIndex || []).filter(
        (e: any) => e.size > 0 && e.name && e.name !== 'Root Entry');
      if (entries.length === 0) return null;

      const entry = entries[0];
      const modelBytes = entry.content instanceof Uint8Array
        ? entry.content as Uint8Array
        : new Uint8Array(entry.content as ArrayLike<number>);

      let zlzoPos = -1;
      for (let i = 1; i < Math.min(modelBytes.length, 1024); i++) {
        if (modelBytes[i]===0x7a && modelBytes[i+1]===0x4c &&
            modelBytes[i+2]===0x5a && modelBytes[i+3]===0x4f) {
          zlzoPos = i; break;
        }
      }
      if (zlzoPos < 0) return null;

      let name = entry.name || 'Model';
      const mview = new DataView(modelBytes.buffer, modelBytes.byteOffset, modelBytes.byteLength);
      let pos = 1;
      while (pos + 8 < zlzoPos) {
        const sLen = mview.getUint32(pos + 4, true);
        if (sLen > 0 && sLen < 128 && pos + 8 + sLen <= zlzoPos) {
          const str = new TextDecoder('utf-8').decode(
            modelBytes.slice(pos + 8, pos + 8 + sLen));
          if (str.length >= 3 && str.length < 64) { name = str; break; }
        }
        const step = sLen > 0 && sLen < 128 ? sLen : 0;
        pos += 8 + step;
      }

      return { name, compressedData: modelBytes.slice(zlzoPos) };
    } catch {
      return null;
    }
  }
  return { name: 'FPM Model', compressedData: fdatBytes };
}

// ─── Public API ───────────────────────────────────────────────────────────

export function parseFPM(bytes: Uint8Array): FPMModel | null {
  if (bytes.length < 64) return null;

  const extracted = extractModelFromFDAT(bytes);
  if (!extracted) return null;
  const { name, compressedData } = extracted;

  const lzoRegions = findZLZORegions(compressedData);
  if (lzoRegions.length === 0) return null;

  let textureData: Uint8Array | null = null;
  let meshData: Uint8Array | null = null;

  for (const region of lzoRegions) {
    const inner = tryInnerDecompress(region);
    const effective = inner || region;
    if (effective[0] === 0x42 && effective[1] === 0x4d) {
      textureData = effective;
    } else if (effective.length > 500) {
      meshData = effective;
    }
  }

  if (!meshData) return null;
  const parsed = parseMS3DVariant(meshData);
  if (!parsed || parsed.vertices.length === 0) return null;

  return {
    name,
    vertices: parsed.vertices,
    normals: parsed.normals,
    uvs: parsed.uvs,
    indices: parsed.indices,
    materials: [],
    hasTexture: textureData !== null,
    textureData,
    textureName: '',
  };
}

/**
 * Convert parsed FPM model to THREE.js Mesh.
 */
export function fpmToTHREE(fpm: FPMModel): THREE.Mesh {
  const geometry = new THREE.BufferGeometry();

  geometry.setAttribute('position', new THREE.Float32BufferAttribute(fpm.vertices, 3));

  if (fpm.normals.length === fpm.vertices.length) {
    geometry.setAttribute('normal', new THREE.Float32BufferAttribute(fpm.normals, 3));
  }

  if (fpm.uvs.length > 0) {
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(fpm.uvs, 2));
  }

  if (fpm.indices.length > 0) {
    geometry.setIndex(new THREE.Uint16BufferAttribute(fpm.indices, 1));
  }

  if (fpm.normals.length === 0) {
    geometry.computeVertexNormals();
  }
  geometry.computeBoundingSphere();

  let map: THREE.Texture | null = null;
  if (fpm.hasTexture && fpm.textureData) {
    try {
      const blob = new Blob([fpm.textureData as BlobPart], { type: 'image/bmp' });
      const url = URL.createObjectURL(blob);
      map = new THREE.TextureLoader().load(url);
      map.colorSpace = THREE.SRGBColorSpace;
    } catch { /* texture load failed */ }
  }

  const material = new THREE.MeshStandardMaterial({
    color: map ? 0xffffff : 0xcccccc,
    map,
    metalness: 0.5,
    roughness: 0.5,
    side: THREE.DoubleSide,
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = fpm.name;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}
