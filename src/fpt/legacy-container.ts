// SPDX-License-Identifier: AGPL-3.0-or-later
import { lzo1xDecompress } from './lzo';

export interface LegacyHeader {
  name: string;
  displayName: string;
  sourcePath: string;
  subtype: number;
  payloadOffset: number;
}

function readU32(bytes: Uint8Array, off: number): number {
  return (bytes[off] | (bytes[off + 1] << 8) | (bytes[off + 2] << 16) | (bytes[off + 3] << 24)) >>> 0;
}

function hasBmpAt(bytes: Uint8Array, off: number): boolean {
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

type MagicKind = 'bmp' | 'jpeg' | 'png' | 'gif' | 'ogg' | 'wav' | 'zlzo';

function scanForMagic(bytes: Uint8Array, maxScan = 1024): { kind: MagicKind; off: number } | null {
  const max = Math.min(bytes.length - 4, maxScan);
  for (let off = 0; off < max; off++) {
    const a = bytes[off], b = bytes[off + 1], c = bytes[off + 2], d = bytes[off + 3];
    if (a === 0x7a && b === 0x4c && c === 0x5a && d === 0x4f) return { kind: 'zlzo', off };
    if (a === 0x89 && b === 0x50 && c === 0x4e && d === 0x47) return { kind: 'png', off };
    if (a === 0xff && b === 0xd8) return { kind: 'jpeg', off };
    if (a === 0x4f && b === 0x67 && c === 0x67 && d === 0x53) return { kind: 'ogg', off };
    if (a === 0x52 && b === 0x49 && c === 0x46 && d === 0x46) return { kind: 'wav', off };
    if (a === 0x47 && b === 0x49 && c === 0x46) return { kind: 'gif', off };
    if (a === 0x42 && b === 0x4d && hasBmpAt(bytes, off)) return { kind: 'bmp', off };
  }
  return null;
}

/**
 * Extract an embedded media payload from a Future Pinball v1.x (BAM-era)
 * legacy container stream.
 *
 * These streams wrap the real asset (image or audio) inside a TLV header
 * (~168 bytes) with name + source path, followed by either a raw payload
 * (OGG) or a zLZO-compressed image (BMP/JPEG).
 *
 * Scans the first 1024 bytes for known magic markers — if zLZO is found
 * it decompresses and re-scans the result.
 *
 * Returns the payload slice starting at the magic offset, or null if no
 * recognised container format is detected.
 */
export function extractEmbeddedPayload(bytes: Uint8Array): {
  kind: 'bmp' | 'jpeg' | 'png' | 'gif' | 'ogg' | 'wav' | 'unknown';
  payload: Uint8Array;
} | null {
  const found = scanForMagic(bytes);
  if (!found) return null;

  if (found.kind === 'zlzo') {
    const decompressed = lzo1xDecompress(bytes.slice(found.off + 4));
    if (!decompressed || decompressed.length < 8) return null;
    const inner = scanForMagic(decompressed);
    if (!inner || inner.kind === 'zlzo') return null;
    return { kind: inner.kind, payload: decompressed.slice(inner.off) };
  }

  // kind is guaranteed non-'zlzo' here
  return { kind: found.kind as 'bmp' | 'jpeg' | 'png' | 'gif' | 'ogg' | 'wav', payload: bytes.slice(found.off) };
}

// Tags are stored in-memory as LE byte sequences in the legacy container.
// readU32 reads LE, so the constant must match the LE interpretation:
//   bytes [ac, a6, af, ba] → LE uint = 0xbaafa6ac
// Verified against 10_ALIEN, Alien.fpt, and Scheherazade (req. FP1.2).
const TYPE_TAG = 0xbaafa6ac;
const NAME_TAG = 0xbab2beb2;
const DISP_TAG = 0xbab2b1b7;
const PATH_TAG = 0xb7abbeb0;

/**
 * Scan forward from a given offset to find the first known payload magic
 * marker (zLZO, OGG, RIFF, BMP, JPEG, or PNG). Returns the offset of the
 * marker, or -1 if none is found within the next 4096 bytes.
 */
export function scanForPayloadStart(bytes: Uint8Array, startOff: number): number {
  const end = Math.min(bytes.length - 3, startOff + 4096);
  for (let i = startOff; i < end; i++) {
    const a = bytes[i], b = bytes[i + 1], c = bytes[i + 2], d = bytes[i + 3];
    if (a === 0x7a && b === 0x4c && c === 0x5a && d === 0x4f) return i;
    if (a === 0x4f && b === 0x67 && c === 0x67 && d === 0x53) return i;
    if (a === 0x52 && b === 0x49 && c === 0x46 && d === 0x46) return i;
    if (a === 0x42 && b === 0x4d) return i;
    if (a === 0xff && b === 0xd8) return i;
    if (a === 0x89 && b === 0x50 && c === 0x4e && d === 0x47) return i;
  }
  return -1;
}

/**
 * Parse the TLV header of a Future Pinball v1.x (BAM-era) legacy container
 * stream.
 *
 * The header consists of consecutive TLV blocks:
 *   - TYPE:   tag = 0xaca6afba, value = subtype (4 bytes LE)
 *   - NAME:   tag = 0xb2beb2ba, value = str-len + string
 *   - DISP:   tag = 0xb7b1b2ba, value = str-len + string
 *   - PATH:   tag = 0xb0beabb7, value = str-len + string
 *   - other:  unknown blocks (skipped by length)
 *
 * After the last TLV block, the payload starts at the first magic marker
 * (zLZO, OGG, RIFF, BMP, JPEG, or PNG).
 *
 * Returns null if no valid TYPE+NAME block pair is found.
 */
export function parseHeader(bytes: Uint8Array): LegacyHeader | null {
  if (bytes.length < 12) return null;

  let pos = 0;
  let subtype = 0;
  let name = '';
  let displayName = '';
  let sourcePath = '';
  let hasType = false;
  let hasName = false;

  while (pos + 8 <= bytes.length) {
    const blockLen = readU32(bytes, pos);
    if (blockLen < 8 || blockLen > 1024 || pos + 4 + blockLen > bytes.length) break;

    const tag = readU32(bytes, pos + 4);
    const valueOff = pos + 8;

    if (tag === TYPE_TAG) {
      if (blockLen < 8) break;
      subtype = readU32(bytes, valueOff);
      hasType = true;
    } else if (tag === NAME_TAG || tag === DISP_TAG || tag === PATH_TAG) {
      const strLen = readU32(bytes, valueOff);
      if (strLen < 1 || strLen > 512 || valueOff + 4 + strLen > bytes.length) break;
      const str = new TextDecoder().decode(bytes.slice(valueOff + 4, valueOff + 4 + strLen));
      if (tag === NAME_TAG) { name = str; hasName = true; }
      else if (tag === DISP_TAG) displayName = str;
      else if (tag === PATH_TAG) sourcePath = str;
    }

    pos += 4 + blockLen;
  }

  if (!hasType || !hasName) return null;

  const payloadOffset = scanForPayloadStart(bytes, pos);
  if (payloadOffset < 0) return null;

  return { name, displayName, sourcePath, subtype, payloadOffset };
}
