// SPDX-License-Identifier: AGPL-3.0-or-later
// © 2026 Harald Weiss

/**
 * FPM texture helpers — pure byte-level extraction (no THREE dependency).
 *
 * FPM models embed their texture as a BMP inside one of the zLZO-compressed
 * regions of the FDAT payload. These helpers locate and identify that BMP so
 * both the main-thread parser (fpm-parser.ts) and the parse worker can share
 * the exact same detection logic.
 */

import { lzo1xDecompress } from './lzo';

/** Check for BMP magic ('BM') plus a plausible header size. */
export function isBMP(bytes: Uint8Array): boolean {
  if (bytes.length < 54) return false;
  if (bytes[0] !== 0x42 || bytes[1] !== 0x4d) return false; // 'BM'
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const fileSize = view.getUint32(2, true);
  const dataOff = view.getUint32(10, true);
  return fileSize >= 54 && fileSize <= bytes.length + 4096 && dataOff >= 54 && dataOff < bytes.length;
}

/**
 * Scan a byte range (typically the TLV header before the zLZO payload) for an
 * ASCII texture file name like "Long-Preview.bmp". Returns '' if none found.
 */
export function extractTextureName(bytes: Uint8Array): string {
  const scan = bytes.length > 8192 ? bytes.subarray(0, 8192) : bytes;
  const text = new TextDecoder('utf-8', { fatal: false }).decode(scan);
  const m = text.match(/[\w][\w\-+. ]{1,60}?\.bmp/i);
  return m ? m[0].trim() : '';
}

/** Decompress one zLZO region, trying the known header offsets. */
function decompressRegion(region: Uint8Array): Uint8Array | null {
  // Offsets relative to the 'zLZO' marker: 0 = marker is part of the stream
  // (legacy behaviour), 4 = right after marker, 8/12 = after size fields.
  for (const off of [8, 4, 12, 0]) {
    if (region.length <= off + 8) continue;
    try {
      const d = lzo1xDecompress(region.slice(off));
      if (d && d.length > 4) return d;
    } catch { /* try next offset */ }
  }
  return null;
}

/** Some regions are double-wrapped (ZO6l / LZO inner container). */
function tryInnerDecompress(data: Uint8Array): Uint8Array | null {
  if (data.length < 8) return null;
  const isZO6l = data[0] === 0x5a && data[1] === 0x4f && data[2] === 0x36 && data[3] === 0x6c;
  const isLZO = data[0] === 0x4c && data[1] === 0x5a && data[2] === 0x4f;
  if (!isZO6l && !isLZO) return null;
  try {
    const r = lzo1xDecompress(data);
    if (r && r.length > data.length) return r;
  } catch { /* not compressed */ }
  return null;
}

/**
 * Find the embedded BMP texture inside an FPM/FDAT payload.
 * Scans for zLZO markers, decompresses each region, and returns the first
 * region that holds a valid BMP. Also returns the texture name recovered from
 * the header preceding the marker, when present.
 */
export function findBMPInLZORegions(bytes: Uint8Array): { data: Uint8Array; name: string } | null {
  let pos = 0;
  while (pos < bytes.length - 4) {
    if (bytes[pos] === 0x7a && bytes[pos + 1] === 0x4c &&
        bytes[pos + 2] === 0x5a && bytes[pos + 3] === 0x4f) {
      const region = decompressRegion(bytes.slice(pos));
      if (region) {
        const inner = tryInnerDecompress(region);
        const effective = inner || region;
        if (isBMP(effective)) {
          return { data: effective, name: extractTextureName(bytes.subarray(0, pos)) };
        }
      }
      pos += 4;
    } else {
      pos++;
    }
  }
  return null;
}
