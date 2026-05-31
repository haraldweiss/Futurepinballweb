// SPDX-License-Identifier: AGPL-3.0-or-later
import * as CFB from 'cfb';

const NAME_TAG_LE = (() => {
  const b = new Uint8Array([0xb2, 0xbe, 0xb2, 0xba]);
  return (b[0] | (b[1] << 8) | (b[2] << 16) | (b[3] << 24)) >>> 0;
})();

const COOR_TAG_LE = (() => {
  const b = new Uint8Array([0xaa, 0xbc, 0xba, 0xb1]);
  return (b[0] | (b[1] << 8) | (b[2] << 16) | (b[3] << 24)) >>> 0;
})();

function readU32(bytes: Uint8Array, off: number): number {
  return (bytes[off] | (bytes[off + 1] << 8) | (bytes[off + 2] << 16) | (bytes[off + 3] << 24)) >>> 0;
}

function decodeUTF16LE(bytes: Uint8Array, off: number, len: number): string {
  const chars: string[] = [];
  for (let i = 0; i < len && off + i + 1 < bytes.length; i += 2) {
    const code = bytes[off + i] | (bytes[off + i + 1] << 8);
    if (code === 0) break;
    chars.push(String.fromCharCode(code));
  }
  return chars.join('');
}

export interface ParsedTableElement {
  type: number;
  name: string;
  x: number;
  y: number;
}

/**
 * Parse a single Table Element N stream from the FP v1.x legacy format.
 * Returns null if the stream has no valid NAME block or coordinates.
 */
export function parseTableElement(bytes: Uint8Array): ParsedTableElement | null {
  if (bytes.length < 8) return null;

  const elemType = readU32(bytes, 0);
  let name = '';
  let x = NaN;
  let y = NaN;

  let pos = 4;
  while (pos + 8 <= bytes.length) {
    const blockLen = readU32(bytes, pos);
    if (blockLen < 6 || blockLen > 4096 || pos + 4 + blockLen > bytes.length) break;

    const tag = readU32(bytes, pos + 4);

    if (tag === NAME_TAG_LE) {
      const strLen = readU32(bytes, pos + 8);
      if (strLen >= 2 && strLen <= 256 && pos + 12 + strLen <= bytes.length) {
        name = decodeUTF16LE(bytes, pos + 12, strLen);
      }
    }

    if (tag === COOR_TAG_LE && blockLen >= 12) {
      const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
      x = view.getFloat32(pos + 8, true);
      y = view.getFloat32(pos + 12, true);
    }

    pos += 4 + blockLen;
  }

  if (!name || !isFinite(x) || !isFinite(y)) return null;
  return { type: elemType, name, x, y };
}

const FP_X_MAX = 2100;
const FP_Y_MAX = 4200;

function toGameX(fpX: number): number {
  return (fpX / FP_X_MAX) * 6 - 3;
}

function toGameY(fpY: number): number {
  return (fpY / FP_Y_MAX) * 12 - 6;
}

/**
 * Extract all game-element coordinates from a CFB container by parsing
 * every Table Element N stream.
 *
 * Each Table Element stream encodes a single game element (bumper, target,
 * light, wall, etc.) with a Name (UTF-16-LE) and an optional XY coordinate
 * pair (Float32 LE). This function returns all elements that have valid
 * coordinates, converted to game space.
 */
export function extractTableCoordsFromCFB(arrayBuffer: ArrayBuffer): Array<{ x: number; y: number }> {
  let cfb: any;
  try {
    cfb = (CFB as any).read(new Uint8Array(arrayBuffer), { type: 'array' });
  } catch {
    return [];
  }

  const entries = ((cfb.FileIndex as any[]) || []).filter(
    (e: any) => e.size > 0 && e.name && /table element/i.test(e.name)
  );

  const coords: Array<{ x: number; y: number }> = [];

  for (const entry of entries) {
    const raw = entry.content;
    const bytes: Uint8Array = raw instanceof Uint8Array ? raw : new Uint8Array(raw as ArrayLike<number>);
    const el = parseTableElement(bytes);
    if (el && isFinite(el.x) && isFinite(el.y)) {
      const gx = toGameX(el.x);
      const gy = toGameY(el.y);
      const roundedX = Math.round(gx * 1000) / 1000;
      const roundedY = Math.round(gy * 1000) / 1000;
      coords.push({ x: roundedX, y: roundedY });
    }
  }

  return coords;
}
