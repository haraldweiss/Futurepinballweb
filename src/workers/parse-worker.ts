// SPDX-License-Identifier: AGPL-3.0-or-later
// © 2026 Harald Weiss
/**
 * parse-worker.ts — Web Worker for CPU-heavy FPT/FPL file parsing.
 *
 * Handles: CFB container parsing, LZO decompression, MS3D model extraction,
 * FPM model parsing. Sends back structured results via Transferable Objects.
 * The main thread creates THREE objects from the received data.
 *
 * Communication:
 *   Main → Worker: { type: 'parse-file', buffer: ArrayBuffer, fileName, fileSize }
 *   Worker → Main: { type: 'progress' | 'log' | 'result' | 'error' }
 */

import * as CFB from 'cfb';
import type { CFB$Container } from 'cfb';
import { lzo1xDecompress } from '../fpt/lzo';

// ─── Types ──────────────────────────────────────────────────────────────────

interface WorkerFileRequest {
  type: 'parse-file';
  buffer: ArrayBuffer;
  fileName: string;
  fileSize: number;
}

interface WorkerProgress {
  type: 'progress';
  stage: string;
  message: string;
  percent: number; // 0..1
}

interface WorkerLog {
  type: 'log';
  level: 'info' | 'ok' | 'warn' | 'error';
  text: string;
}

export interface WorkerResult {
  type: 'result';
  data: ParseWorkerOutput;
}

export interface WorkerError {
  type: 'error';
  message: string;
}

export interface CachedTextureResult {
  name: string;
  data: Uint8Array; // raw decompressed bytes
}

export interface CachedSoundResult {
  name: string;
  data: Uint8Array; // raw decompressed bytes
}

export interface CachedModelResult {
  name: string;
  vertices: Float32Array;
  normals: Float32Array;
  uvs: Float32Array;
  indices: Uint32Array;
  hasTexture: boolean;
  textureName: string;
  textureData: Uint8Array | null;
}

export interface ParseWorkerOutput {
  tableName: string;
  textures: CachedTextureResult[];
  sounds: CachedSoundResult[];
  musicTrack: Uint8Array | null;
  script: string | null;
  scriptBytes: Uint8Array | null;
  models: CachedModelResult[];
  coords: Array<{ x: number; y: number }>;
  coordBytes: Uint8Array | null;
  elements: any[];
  confidence: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function sendProgress(stage: string, message: string, percent: number) {
  self.postMessage({ type: 'progress', stage, message, percent });
}

function sendLog(level: WorkerLog['level'], text: string) {
  self.postMessage({ type: 'log', level, text });
}

function toOwnedBytes(bytes: Uint8Array): Uint8Array {
  return bytes.slice();
}

function tryLZOExtract(bytes: Uint8Array): Uint8Array | null {
  for (const [dataOff] of [[12, 8], [8, 0], [16, 12]]) {
    if (bytes.length <= dataOff) continue;
    const view = new DataView(bytes.buffer, bytes.byteOffset);
    let hint = 0;
    try { hint = view.getUint32(dataOff - 4, true); } catch { /* ignore */ }
    if (hint > 64 * 1024 * 1024 || hint < 0) hint = 0;
    const result = lzo1xDecompress(bytes.slice(dataOff), hint || undefined);
    if (result && result.length > 4) return result;
  }
  return null;
}

// ─── CFB resource extraction (worker-safe, no DOM) ──────────────────────────

function extractTexturesFromCFB(cfb: CFB$Container): CachedTextureResult[] {
  const textures: CachedTextureResult[] = [];
  const entries = (cfb.FileIndex || []).filter(
    (e) => e.size > 0 && e.name && e.name !== 'Root Entry',
  );

  for (const entry of entries) {
    const name = entry.name || '';
    const nameL = name.toLowerCase();
    // Skip non-texture streams
    if (nameL.includes('_3d') || nameL.includes('mesh') ||
        nameL.includes('model') || nameL.endsWith('.ms3d') ||
        nameL.includes('anim') || nameL.endsWith('.fpm') ||
        nameL === 'global script' || nameL === 'playfield' ||
        nameL === 'music' || nameL.endsWith('.seq') ||
        nameL.includes('fdat') || nameL.includes('bam')) {
      continue;
    }
    const raw = entry.content;
    const bytes: Uint8Array = raw instanceof Uint8Array
      ? raw : new Uint8Array(raw as ArrayLike<number>);
    if (bytes.length < 32) continue;

    // Skip if it's sound (WAV/OGG/MP3 header)
    const a = bytes[0], b = bytes[1];
    if ((a === 0x52 && b === 0x49) || (a === 0x4F && b === 0x67) ||
        (a === 0xFF && (b & 0xE0) === 0xE0) || (a === 0x49 && b === 0x44)) {
      continue;
    }
    // Skip if it's pure LZO wrapper (compressed model data)
    if (bytes[0] === 0x5a && bytes[1] === 0x4f) continue;

    textures.push({ name, data: toOwnedBytes(bytes) });
  }

  return textures;
}

function extractSoundsFromCFB(cfb: CFB$Container): CachedSoundResult[] {
  const sounds: CachedSoundResult[] = [];
  const entries = (cfb.FileIndex || []).filter(
    (e) => e.size > 0 && e.name && e.name !== 'Root Entry',
  );

  for (const entry of entries) {
    const name = entry.name || '';
    const raw = entry.content;
    const bytes: Uint8Array = raw instanceof Uint8Array
      ? raw : new Uint8Array(raw as ArrayLike<number>);
    if (bytes.length < 44) continue;

    // Detect audio formats by magic bytes
    const a = bytes[0], b = bytes[1];
    const isAudio = (a === 0x52 && b === 0x49) || // WAV (RIFF)
                    (a === 0x4F && b === 0x67) || // OGG
                    (a === 0xFF && (b & 0xE0) === 0xE0) || // MPEG
                    (a === 0x49 && b === 0x44); // ID3
    if (!isAudio) continue;

    // Try LZO decompress first
    const decompressed = tryLZOExtract(bytes);
    if (decompressed && decompressed.length > 44) {
      sounds.push({ name, data: toOwnedBytes(decompressed) });
    } else {
      sounds.push({ name, data: toOwnedBytes(bytes) });
    }
  }

  return sounds;
}

function extractScriptFromCFB(cfb: CFB$Container): { script: string | null; scriptBytes: Uint8Array | null } {
  const entries = (cfb.FileIndex || []).filter(
    (e) => e.size > 0 && e.name && e.name !== 'Root Entry',
  );

  for (const entry of entries) {
    const name = (entry.name || '').toLowerCase();
    if (name === 'global script') {
      const raw = entry.content;
      const bytes: Uint8Array = raw instanceof Uint8Array
        ? raw : new Uint8Array(raw as ArrayLike<number>);
      const decompressed = tryLZOExtract(bytes) || bytes;
      const text = new TextDecoder('utf-8', { fatal: false }).decode(decompressed);
      return { script: text, scriptBytes: toOwnedBytes(bytes) };
    }
  }

  return { script: null, scriptBytes: null };
}

function extractMusicFromCFB(cfb: CFB$Container): Uint8Array | null {
  const entries = (cfb.FileIndex || []).filter(
    (e) => e.size > 0 && e.name && e.name !== 'Root Entry',
  );

  for (const entry of entries) {
    const name = (entry.name || '').toLowerCase();
    if (name === 'music' || name === 'bgm' || name === 'background') {
      const raw = entry.content;
      const bytes: Uint8Array = raw instanceof Uint8Array
        ? raw : new Uint8Array(raw as ArrayLike<number>);
      const decompressed = tryLZOExtract(bytes);
      if (decompressed && decompressed.length > 44) return toOwnedBytes(decompressed);
      return bytes.length > 44 ? toOwnedBytes(bytes) : null;
    }
  }

  return null;
}

// ─── Model extraction (worker-safe, no THREE) ───────────────────────────────

// Vertex stride layouts (copied from fpm-parser.ts, no THREE dependency)
interface StrideLayout {
  stride: number;
  normalOff: number;
  normalType: 'packed' | 'float3';
  uvOff: number;
  uvType: 'float2' | 'byte2';
}

const STRIDE_LAYOUTS: Record<number, StrideLayout> = {
  12: { stride: 12, normalOff: -1, normalType: 'packed', uvOff: -1, uvType: 'float2' },
  15: { stride: 15, normalOff: 12, normalType: 'packed', uvOff: -1, uvType: 'float2' },
  16: { stride: 16, normalOff: 12, normalType: 'packed', uvOff: -1, uvType: 'float2' },
  24: { stride: 24, normalOff: 12, normalType: 'float3', uvOff: -1, uvType: 'float2' },
  28: { stride: 28, normalOff: 12, normalType: 'float3', uvOff: 24, uvType: 'float2' },
  32: { stride: 32, normalOff: 12, normalType: 'float3', uvOff: 24, uvType: 'float2' },
  48: { stride: 48, normalOff: 12, normalType: 'float3', uvOff: 24, uvType: 'float2' },
  60: { stride: 60, normalOff: 12, normalType: 'float3', uvOff: 24, uvType: 'float2' },
  64: { stride: 64, normalOff: 12, normalType: 'float3', uvOff: 24, uvType: 'float2' },
};

function innerDecompress(data: Uint8Array): Uint8Array | null {
  if (data[0] === 0x5a && data[1] === 0x4f && data[2] === 0x36 && data[3] === 0x6c) {
    try { const r = lzo1xDecompress(data); if (r && r.length > data.length) return r; } catch {}
  }
  if (data[0] === 0x4c && data[1] === 0x5a && data[2] === 0x4f) {
    try { const r = lzo1xDecompress(data); if (r && r.length > data.length) return r; } catch {}
  }
  return null;
}

function parseMS3DVariant(data: Uint8Array): CachedModelResult | null {
  if (data.length < 24) return null;
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);

  let ms3dOff = -1;
  const maxScan = Math.min(data.length - 10, 256);
  for (let i = 0; i < maxScan; i++) {
    if (data[i] === 0x4d && data[i + 1] === 0x53 &&
        data[i + 2] === 0x33 && data[i + 3] === 0x44 &&
        data[i + 4] === 0x30) { ms3dOff = i; break; }
  }
  if (ms3dOff < 0) return null;

  const nPositions = [ms3dOff + 5, ms3dOff + 7, ms3dOff + 8, ms3dOff + 10,
                      ms3dOff + 12, ms3dOff + 14, ms3dOff + 16, ms3dOff + 18];
  const strides = [12, 15, 16, 24, 28, 32, 48, 60, 64];

  for (const nPos of nPositions) {
    if (nPos + 2 > data.length) break;
    const cnt = view.getUint16(nPos, true);
    if (cnt < 1 || cnt > 50000) continue;

    for (const stride of strides) {
      const layout = STRIDE_LAYOUTS[stride];
      if (!layout) continue;
      const dataStart = nPos + 4;
      const dataEnd = dataStart + cnt * stride;
      if (dataEnd > data.length) continue;

      // Validate vertex data
      let valid = true;
      const samples = [0, Math.floor(cnt * 0.25), Math.floor(cnt * 0.5), cnt - 1];
      for (const s of samples) {
        const off = dataStart + s * stride;
        if (off + 12 > data.length) { valid = false; break; }
        const x = view.getFloat32(off, true);
        const y = view.getFloat32(off + 4, true);
        const z = view.getFloat32(off + 8, true);
        if (isNaN(x) || isNaN(y) || isNaN(z) ||
            Math.abs(x) > 500 || Math.abs(y) > 500 || Math.abs(z) > 500) {
          valid = false; break;
        }
      }
      if (!valid) continue;

      // Build vertex/normal/uv arrays
      const positions: number[] = [];
      const normals: number[] = [];
      const uvs: number[] = [];

      for (let i = 0; i < cnt; i++) {
        const off = dataStart + i * stride;
        positions.push(
          view.getFloat32(off, true),
          view.getFloat32(off + 4, true),
          view.getFloat32(off + 8, true),
        );
        if (layout.normalOff >= 0) {
          if (layout.normalType === 'float3') {
            normals.push(
              view.getFloat32(off + layout.normalOff, true),
              view.getFloat32(off + layout.normalOff + 4, true),
              view.getFloat32(off + layout.normalOff + 8, true),
            );
          } else {
            const nx = view.getInt8(off + layout.normalOff);
            const ny = view.getInt8(off + layout.normalOff + 1);
            const nz = view.getInt8(off + layout.normalOff + 2);
            const len = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
            normals.push(nx / len, ny / len, nz / len);
          }
        }
        if (layout.uvOff >= 0 && layout.uvType === 'float2') {
          uvs.push(
            view.getFloat32(off + layout.uvOff, true),
            view.getFloat32(off + layout.uvOff + 4, true),
          );
        }
      }

      // Parse triangle indices
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

      // Extract texture data from LZO regions
      let textureData: Uint8Array | null = null;
      let textureName = '';
      let hasTexture = false;

      return {
        name: `model_${cnt}v`,
        vertices: new Float32Array(positions),
        normals: new Float32Array(normals),
        uvs: new Float32Array(uvs),
        indices: new Uint32Array(indices),
        hasTexture,
        textureName,
        textureData,
      };
    }
  }

  return null;
}

function extractModelsFromCFB(cfb: CFB$Container): CachedModelResult[] {
  const models: CachedModelResult[] = [];
  const entries = (cfb.FileIndex || []).filter(
    (e) => e.size > 0 && e.name && e.name !== 'Root Entry',
  );

  for (const entry of entries) {
    const name = entry.name || '';
    const nameL = name.toLowerCase();
    const isModel = nameL.includes('mesh') || nameL.includes('model') ||
                    nameL.endsWith('.ms3d') || nameL.startsWith('_3d') ||
                    nameL.includes('fdat') || nameL.endsWith('.fpm');
    if (!isModel) continue;

    const raw = entry.content;
    const bytes: Uint8Array = raw instanceof Uint8Array
      ? raw : new Uint8Array(raw as ArrayLike<number>);
    if (bytes.length < 64) continue;

    // Try MS3D header first
    if (bytes.length >= 4) {
      const header = new TextDecoder().decode(bytes.slice(0, 4));
      if (header === 'MS3D') {
        const parsed = parseMS3DVariant(bytes);
        if (parsed) { parsed.name = name; models.push(parsed); }
        continue;
      }
    }

    // Try LZO decompress → MS3D variant
    const decompressed = tryLZOExtract(bytes);
    if (decompressed && decompressed.length > 100) {
      const parsed = parseMS3DVariant(decompressed);
      if (parsed) { parsed.name = name; models.push(parsed); }
      continue;
    }

    // Try FPM-style nested CFB → LZO → MS3D
    if (bytes[0] === 0xd0 && bytes[1] === 0xcf) {
      try {
        const innerCFB = CFB.read(bytes, { type: 'array' });
        const innerEntries = (innerCFB.FileIndex || []).filter(
          (e) => e.size > 0 && e.name && e.name !== 'Root Entry',
        );
        for (const ie of innerEntries) {
          const iRaw = ie.content;
          const iBytes: Uint8Array = iRaw instanceof Uint8Array
            ? iRaw : new Uint8Array(iRaw as ArrayLike<number>);
          const iDecompressed = tryLZOExtract(iBytes);
          if (iDecompressed && iDecompressed.length > 100) {
            const parsed = parseMS3DVariant(iDecompressed);
            if (parsed) {
              parsed.name = entry.name || name;
              models.push(parsed);
            }
          }
        }
      } catch { /* unparseable nested CFB */ }
    }
  }

  return models;
}

// ─── Coordinate extraction (worker-safe) ────────────────────────────────────

function extractCoordsFromCFB(cfb: CFB$Container): {
  coords: Array<{ x: number; y: number }>;
  coordBytes: Uint8Array | null;
} {
  const coords: Array<{ x: number; y: number }> = [];
  const entries = (cfb.FileIndex || []).filter(
    (e) => e.size > 0 && e.name && e.name !== 'Root Entry',
  );

  for (const entry of entries) {
    const name = (entry.name || '').toLowerCase();
    if (name.includes('coords') || name.includes('coor') ||
        name.includes('coord')) {
      const raw = entry.content;
      const bytes: Uint8Array = raw instanceof Uint8Array
        ? raw : new Uint8Array(raw as ArrayLike<number>);

      const decompressed = tryLZOExtract(bytes) || bytes;
      const coordBytes = decompressed.slice();
      const view = new DataView(coordBytes.buffer, coordBytes.byteOffset, coordBytes.byteLength);

      // Try to extract coordinate pairs: float32 x 2 per coord
      for (let off = 0; off + 8 < coordBytes.length; off += 8) {
        const x = view.getFloat32(off, true);
        const y = view.getFloat32(off + 4, true);
        if (isFinite(x) && isFinite(y) &&
            Math.abs(x) < 100 && Math.abs(y) < 100 &&
            !(Math.abs(x) < 0.001 && Math.abs(y) < 0.001)) {
          coords.push({ x: Math.round(x * 1000) / 1000, y: Math.round(y * 1000) / 1000 });
        }
      }
      return { coords, coordBytes };
    }
  }

  return { coords, coordBytes: null };
}

// ─── Element extraction (simplified, worker-safe) ───────────────────────────

function extractElementsFromCFB(cfb: CFB$Container): any[] {
  const elements: any[] = [];
  const entries = (cfb.FileIndex || []).filter(
    (e) => e.size > 0 && e.name && e.name !== 'Root Entry',
  );

  for (const entry of entries) {
    const name = (entry.name || '').toLowerCase();
    if (name.includes('element') || name.includes('elem') ||
        name.includes('tableelement') || name.includes('tabelement')) {
      const raw = entry.content;
      const bytes: Uint8Array = raw instanceof Uint8Array
        ? raw : new Uint8Array(raw as ArrayLike<number>);
      const decompressed = tryLZOExtract(bytes) || bytes;
      elements.push({ name, size: decompressed.length, data: toOwnedBytes(decompressed) });
    }
  }

  return elements;
}

// ─── Table name extraction ───────────────────────────────────────────────────

function extractTableName(cfb: CFB$Container): string {
  // Try to find a table name in the FileIndex
  const entries = (cfb.FileIndex || []).filter(
    (e) => e.name && e.name !== 'Root Entry',
  );
  if (entries.length > 0) {
    // Use the first non-Root entry's parent directory as table name
    const first = entries[0];
    const parts = (first.name || '').split('/');
    if (parts.length >= 2) return parts[0];
  }
  return 'Unknown Table';
}

// ─── Confidence calculation ──────────────────────────────────────────────────

function calcConfidenceFromCFB(cfb: CFB$Container): number {
  const entries = (cfb.FileIndex || []).filter(
    (e) => e.size > 0 && e.name && e.name !== 'Root Entry',
  );
  if (entries.length === 0) return 0;

  // Higher confidence = more diverse stream types, reasonable sizes
  const names = new Set(entries.map((e) => {
    const parts = (e.name || '').split('/');
    return parts[parts.length - 1];
  }));

  const hasTextures = [...names].some((n) => {
    const l = n.toLowerCase();
    return !l.includes('mesh') && !l.includes('model') &&
           !l.includes('_3d') && !l.includes('coord') &&
           !l.includes('element') && l !== 'global script' &&
           l !== 'music' && !l.endsWith('.ms3d') && !l.endsWith('.fpm');
  });

  const hasScript = [...names].some((n) => n.toLowerCase() === 'global script');
  let score = Math.min(names.size / 20, 0.6);
  if (hasTextures) score += 0.2;
  if (hasScript) score += 0.2;
  return Math.min(score, 1.0);
}

// ─── Main handler ────────────────────────────────────────────────────────────

function handleParseFile(request: WorkerFileRequest): void {
  const { buffer } = request;
  const bytes = new Uint8Array(buffer);

  sendProgress('parsing-cfb', 'Analysiere CFB/OLE2-Struktur...', 0.05);

  let cfb: CFB$Container;
  try {
    cfb = CFB.read(bytes, { type: 'array' });
  } catch (e: any) {
    self.postMessage({ type: 'error', message: `CFB Parse-Fehler: ${e.message}` });
    return;
  }

  const entryCount = (cfb.FileIndex || []).filter(
    (e) => e.size > 0 && e.name && e.name !== 'Root Entry',
  ).length;

  if (entryCount === 0) {
    self.postMessage({ type: 'error', message: 'Keine CFB-Einträge gefunden' });
    return;
  }

  sendLog('ok', `CFB: ${entryCount} Einträge gefunden`);
  sendProgress('extracting-textures', 'Extrahiere Texturen...', 0.15);

  // Extract all resources in parallel within the worker (synchronous but fast)
  const textures = extractTexturesFromCFB(cfb);
  const rawTextures = textures.filter((t) => {
    // Basic image detection
    const d = t.data;
    return (d[0] === 0x89 && d[1] === 0x50) || // PNG
           (d[0] === 0xFF && d[1] === 0xD8) || // JPEG
           (d[0] === 0x42 && d[1] === 0x4D) || // BMP
           (d[0] === 0x47 && d[1] === 0x49);   // GIF
  });
  const skippedTextures = textures.filter((t) => !rawTextures.includes(t));

  sendLog('ok', `${rawTextures.length} Texturen extrahiert`);

  sendProgress('extracting-sounds', 'Extrahiere Sounds...', 0.30);
  const sounds = extractSoundsFromCFB(cfb);
  sendLog('ok', `${sounds.length} Sounds extrahiert`);

  sendProgress('extracting-music-script', 'Extrahiere Script/Musik...', 0.40);
  const { script, scriptBytes } = extractScriptFromCFB(cfb);
  const musicTrack = extractMusicFromCFB(cfb);
  if (script) sendLog('ok', `Script (${script.split('\n').length} Zeilen)`);
  if (musicTrack) sendLog('ok', `Musik (${(musicTrack.length / 1024).toFixed(0)} KB)`);

  // Try to decompress textures that are still compressed
  sendProgress('decompressing', 'Dekomprimiere Texturen...', 0.50);
  const decompressedTextures: CachedTextureResult[] = [];
  for (const t of skippedTextures) {
    const d = tryLZOExtract(t.data);
    if (d && d.length > 32) {
      // Check if decompressed data looks like an image
      if ((d[0] === 0x89 && d[1] === 0x50) || (d[0] === 0xFF && d[1] === 0xD8) ||
          (d[0] === 0x42 && d[1] === 0x4D) || (d[0] === 0x47 && d[1] === 0x49)) {
        decompressedTextures.push({ name: t.name, data: d });
      }
    }
  }
  if (decompressedTextures.length > 0) {
    sendLog('ok', `+${decompressedTextures.length} Texturen dekomprimiert`);
  }

  // Find the playfield (largest texture)
  const allTextures = [...rawTextures, ...decompressedTextures];
  allTextures.sort((a, b) => b.data.length - a.data.length);

  sendProgress('extracting-models', 'Extrahiere Modelle...', 0.60);
  const models = extractModelsFromCFB(cfb);
  sendLog('ok', `${models.length} Modelle extrahiert`);

  sendProgress('extracting-coords', 'Extrahiere Koordinaten...', 0.75);
  const { coords, coordBytes } = extractCoordsFromCFB(cfb);
  const elements = extractElementsFromCFB(cfb);
  sendLog('ok', `${coords.length} Koordinaten, ${elements.length} Elemente`);

  sendProgress('finalizing', 'Finalisiere...', 0.90);

  const tableName = extractTableName(cfb);
  const confidence = calcConfidenceFromCFB(cfb);

  // Build result — transfer all ArrayBuffers for zero-copy
  const result: WorkerResult = {
    type: 'result',
    data: {
      tableName,
      textures: allTextures,
      sounds,
      musicTrack: musicTrack || null,
      script,
      scriptBytes: scriptBytes || null,
      models,
      coords,
      coordBytes,
      elements,
      confidence,
    },
  };

  // Transferable objects list
  const transferables: Transferable[] = [];
  const transferredBuffers = new Set<ArrayBuffer>();

  function collectBuffer(arr: ArrayBufferView | null) {
    if (!arr || !(arr.buffer instanceof ArrayBuffer)) return;
    if (transferredBuffers.has(arr.buffer)) return;
    transferredBuffers.add(arr.buffer);
    transferables.push(arr.buffer);
  }
  for (const t of result.data.textures) collectBuffer(t.data);
  for (const s of result.data.sounds) collectBuffer(s.data);
  collectBuffer(result.data.musicTrack);
  collectBuffer(result.data.scriptBytes);
  collectBuffer(result.data.coordBytes);
  for (const m of result.data.models) {
    collectBuffer(m.vertices);
    collectBuffer(m.normals);
    collectBuffer(m.uvs);
    collectBuffer(m.indices);
    collectBuffer(m.textureData);
  }

  sendProgress('done', `${tableName} verarbeitet`, 1.0);

  (self as { postMessage(message: unknown, transfer: Transferable[]): void }).postMessage(result, transferables);
}

// ─── Message handler ────────────────────────────────────────────────────────

self.onmessage = (event: MessageEvent<WorkerFileRequest>) => {
  const request = event.data;
  try {
    if (request && request.type === 'parse-file') {
      handleParseFile(request);
    }
  } catch (e: any) {
    self.postMessage({ type: 'error', message: `Worker Crash: ${e.message}` });
  }
};
