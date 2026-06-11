// SPDX-License-Identifier: AGPL-3.0-or-later
import * as THREE from 'three';
import { getAudioCtx } from '../audio-system';
import { tryLZOExtract } from './lzo';
import { extractEmbeddedPayload } from './legacy-container';

export function detectImageMime(buf: Uint8Array, off = 0): string | null {
  if (buf.length < off + 4) return null;
  const [a,b,c,d] = [buf[off],buf[off+1],buf[off+2],buf[off+3]];
  if (a===0x89&&b===0x50&&c===0x4E&&d===0x47) return 'image/png';
  if (a===0xFF&&b===0xD8)                      return 'image/jpeg';
  if (a===0x42&&b===0x4D)                      return 'image/bmp';
  if (a===0x47&&b===0x49&&c===0x46)            return 'image/gif';
  if (a===0x52&&b===0x49&&c===0x46&&d===0x46&&buf[off+8]===0x57&&buf[off+9]===0x45) return 'image/webp';
  return null;
}

export function detectAudioMime(buf: Uint8Array, off = 0): string | null {
  if (buf.length < off + 4) return null;
  const [a,b,c,d] = [buf[off],buf[off+1],buf[off+2],buf[off+3]];
  if (a===0x52&&b===0x49&&c===0x46&&d===0x46) return 'audio/wav';
  if (a===0x4F&&b===0x67&&c===0x67&&d===0x53) return 'audio/ogg';
  if (a===0x49&&b===0x44&&c===0x33)           return 'audio/mpeg';
  if ((a===0xFF)&&(b&0xE0)===0xE0)            return 'audio/mpeg';
  return null;
}

export function findJpegEoiOffset(bytes: Uint8Array): number {
  if (bytes.length < 4 || bytes[0] !== 0xFF || bytes[1] !== 0xD8) return -1;
  let sosPos = -1;
  for (let i = 2; i < bytes.length - 1; i++) {
    if (bytes[i] === 0xFF && bytes[i + 1] === 0xDA) { sosPos = i; break; }
  }
  if (sosPos < 0) return -1;
  if (sosPos + 4 > bytes.length) return -1;
  const sosLen = (bytes[sosPos + 2] << 8) | bytes[sosPos + 3];
  if (sosLen < 2) return -1;
  let pos = sosPos + 2 + sosLen;
  while (pos < bytes.length - 1) {
    if (bytes[pos] === 0xFF && bytes[pos + 1] === 0xD9) return pos + 2;
    pos++;
  }
  return -1;
}

export function trimJpegToEoi(bytes: Uint8Array): Uint8Array {
  const eoi = findJpegEoiOffset(bytes);
  return eoi > 0 ? bytes.subarray(0, eoi) : bytes;
}

export async function bytesToTexture(slice: Uint8Array, mime: string): Promise<THREE.Texture> {
  const payload = mime === 'image/jpeg' ? trimJpegToEoi(slice) : slice;
  const blob = new Blob([payload as BlobPart], { type: mime });
  try {
    const bitmap = await createImageBitmap(blob);
    const tex = new THREE.Texture(bitmap);
    tex.flipY = false;
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
    tex.needsUpdate = true;
    return tex;
  } catch (bitmapErr) {
    const url = URL.createObjectURL(blob);
    try {
      const tex = await new THREE.TextureLoader().loadAsync(url);
      tex.flipY = false;
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
      return tex;
    } catch { throw bitmapErr; }
    finally { URL.revokeObjectURL(url); }
  }
}

function isBmpAt(bytes: Uint8Array, off: number): boolean {
  if (off + 14 > bytes.length) return false;
  if (bytes[off] !== 0x42 || bytes[off + 1] !== 0x4D) return false;
  if (bytes[off + 6] !== 0 || bytes[off + 7] !== 0 ||
      bytes[off + 8] !== 0 || bytes[off + 9] !== 0) return false;
  const dataOff = bytes[off + 10] | (bytes[off + 11] << 8) |
                  (bytes[off + 12] << 16) | (bytes[off + 13] << 24);
  if (dataOff < 26 || dataOff > 8192) return false;
  const fileSize = bytes[off + 2] | (bytes[off + 3] << 8) |
                   (bytes[off + 4] << 16) | (bytes[off + 5] << 24);
  if (fileSize < dataOff || fileSize > bytes.length - off + 4096) return false;
  return true;
}

export function scanForImageMagic(bytes: Uint8Array, maxScan = 4096): { mime: string; off: number } | null {
  const max = Math.min(bytes.length - 4, maxScan);
  for (let off = 0; off < max; off++) {
    const a = bytes[off], b = bytes[off + 1], c = bytes[off + 2], d = bytes[off + 3];
    if (a === 0x89 && b === 0x50 && c === 0x4E && d === 0x47) return { mime: 'image/png', off };
    if (a === 0xFF && b === 0xD8 && c === 0xFF &&
        (d === 0xE0 || d === 0xE1 || d === 0xDB || d === 0xEE)) {
      return { mime: 'image/jpeg', off };
    }
    if (a === 0x47 && b === 0x49 && c === 0x46 && d === 0x38) return { mime: 'image/gif', off };
    if (a === 0x42 && b === 0x4D && isBmpAt(bytes, off)) return { mime: 'image/bmp', off };
    if (a === 0x52 && b === 0x49 && c === 0x46 && d === 0x46 &&
        off + 9 < bytes.length && bytes[off + 8] === 0x57 && bytes[off + 9] === 0x45) {
      return { mime: 'image/webp', off };
    }
  }
  return null;
}

export async function extractImageFromBytes(bytes: Uint8Array): Promise<THREE.Texture | null> {
  const embedded = extractEmbeddedPayload(bytes);
  if (embedded && embedded.kind !== 'unknown') {
    const mime = embedded.kind === 'bmp' ? 'image/bmp'
               : embedded.kind === 'jpeg' ? 'image/jpeg'
               : embedded.kind === 'png' ? 'image/png'
               : embedded.kind === 'gif' ? 'image/gif'
               : null;
    if (mime) {
      try { return await bytesToTexture(embedded.payload, mime); } catch (e) { console.debug('[fpt] Legacy image decode retry:', (e || 'unknown')); }
    }
  }
  const found = scanForImageMagic(bytes);
  if (found) {
    try { return await bytesToTexture(bytes.slice(found.off), found.mime); } catch (e) { console.debug('[fpt] Image decode retry:', (e || 'unknown')); }
  }
  const decompressed = tryLZOExtract(bytes);
  if (decompressed) {
    const found2 = scanForImageMagic(decompressed);
    if (found2) {
      try { return await bytesToTexture(decompressed.slice(found2.off), found2.mime); } catch (e) { console.debug('[fpt] Image decode retry:', (e || 'unknown')); }
    }
  }
  return null;
}

function estimateAudioSize(compressedBytes: Uint8Array): number {
  const header = compressedBytes.slice(0, 12);
  if (header[0] === 0x52 && header[1] === 0x49 && header[2] === 0x46 && header[3] === 0x46) {
    const view = new DataView(header.buffer, header.byteOffset);
    try { const size = view.getUint32(4, true); return Math.min(size + 8, 50 * 1024 * 1024); } catch { /* ignore */ }
  }
  if (header[0] === 0x4F && header[1] === 0x67 && header[2] === 0x67 && header[3] === 0x53) {
    return Math.min(compressedBytes.length * 15, 50 * 1024 * 1024);
  }
  if ((header[0] === 0xFF) && (header[1] & 0xE0) === 0xE0) {
    return Math.min(compressedBytes.length * 12, 50 * 1024 * 1024);
  }
  return Math.min(compressedBytes.length * 8, 50 * 1024 * 1024);
}

export async function extractSoundFromBytes(
  bytes: Uint8Array,
  options?: { maxUncompressedSize?: number; allowStreaming?: boolean }
): Promise<AudioBuffer | string | null> {
  const maxUncompressedSize = options?.maxUncompressedSize ?? 5 * 1024 * 1024;
  const allowStreaming = options?.allowStreaming !== false;

  const tryDecode = async (slice: Uint8Array): Promise<AudioBuffer> => {
    const ctx = getAudioCtx();
    const ab = slice.buffer.slice(slice.byteOffset, slice.byteOffset + slice.byteLength);
    return ctx.decodeAudioData(ab as ArrayBuffer);
  };

  const embedded = extractEmbeddedPayload(bytes);
  if (embedded && (embedded.kind === 'ogg' || embedded.kind === 'wav')) {
    try { return await tryDecode(embedded.payload); } catch (e) { console.debug('[fpt] Legacy audio decode retry:', (e || 'unknown')); }
  }

  const estimatedSize = estimateAudioSize(bytes);
  const shouldStream = allowStreaming && estimatedSize > maxUncompressedSize;

  if (!shouldStream) {
    for (const off of [8,0,4,12,16,32]) {
      if (!detectAudioMime(bytes, off)) continue;
      try { return await tryDecode(bytes.slice(off)); } catch (e) { console.debug('[fpt] Audio decode retry:', (e || 'unknown')); }
    }
    const decompressed = tryLZOExtract(bytes);
    if (decompressed) {
      for (const off of [0,8,4]) {
        if (!detectAudioMime(decompressed, off)) continue;
        try { return await tryDecode(decompressed.slice(off)); } catch (e) { console.debug('[fpt] Audio decode retry:', (e || 'unknown')); }
      }
    }
  }
  return null;
}
