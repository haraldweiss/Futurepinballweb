// SPDX-License-Identifier: AGPL-3.0-or-later
/**
 * table-elements.ts — Future Pinball Table Elements Parser
 *
 * Parses FP v1.x/v2 "Table Element N" streams from CFB/OLE2 containers.
 * Each stream encodes a single game element with:
 *   - type (4-byte LE at offset 0) — maps to element kind
 *   - TLV blocks: NAME (UTF-16-LE) and COOR (Float32 x,y)
 *
 * Element kinds identified: bumper, target, ramp, wall, light, flipper,
 * rail, gate, spinner, slingshot, hole, trigger, kickback, magnet, etc.
 */

import * as CFB from 'cfb';
import type { CFB$Container } from 'cfb';

// ─── TLV Tags (LE u32 from byte sequences, verified against real FP files) ──
const NAME_TAG = 0xbab2beb2;
const COOR_TAG = 0xb1babcAA;

// ─── Element Type Constants (known FP values) ──────────────────────────────
export const ELEM_TYPE: Record<number, string> = {
  1:  'bumper',   2:  'target',   3:  'ramp',
  4:  'wall',     5:  'light',    6:  'flipper',
  7:  'rail',     8:  'gate',     9:  'spinner',
  10: 'slingshot', 11: 'hole',    12: 'trigger',
  13: 'kickback', 14: 'magnet',   15: 'plunger_lane',
  16: 'rollover', 17: 'standup_target', 18: 'drop_target',
  19: 'kickout',  20: 'vuk',      21: 'decorative',
};

// ─── Helpers ────────────────────────────────────────────────────────────────
function readU32(bytes: Uint8Array, off: number): number {
  return (bytes[off] | (bytes[off + 1] << 8) | (bytes[off + 2] << 16) | (bytes[off + 3] << 24)) >>> 0;
}
function readF32(bytes: Uint8Array, off: number): number {
  return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getFloat32(off, true);
}
function decodeUTF16LE(bytes: Uint8Array, off: number, maxLen: number): string {
  const chars: string[] = [];
  const end = Math.min(off + maxLen, bytes.length - 1);
  for (let i = off; i < end; i += 2) {
    const code = bytes[i] | (bytes[i + 1] << 8);
    if (code === 0) break;
    chars.push(String.fromCharCode(code));
  }
  return chars.join('');
}

const FP_X_MAX = 2100, FP_Y_MAX = 4200;
function toGameX(fpX: number): number { return Math.round(((fpX / FP_X_MAX) * 6 - 3) * 1000) / 1000; }
function toGameY(fpY: number): number { return Math.round(((fpY / FP_Y_MAX) * 12 - 6) * 1000) / 1000; }

// ─── Public Types ───────────────────────────────────────────────────────────
export interface ParsedTableElement {
  /** Raw numeric type from the stream header */
  type: number;
  /** Human-readable classification (bumper, target, ramp, wall, …) */
  kind: string;
  /** Short identifier from the NAME block */
  name: string;
  /** Game-space X coordinate */
  x: number;
  /** Game-space Y coordinate */
  y: number;
}

// ─── Parser ─────────────────────────────────────────────────────────────────
export function parseTableElement(bytes: Uint8Array): ParsedTableElement | null {
  if (bytes.length < 8) return null;
  const elemType = readU32(bytes, 0);
  const kind = ELEM_TYPE[elemType] || 'unknown';
  let name = '', x = NaN, y = NaN;
  let pos = 4;
  while (pos + 8 <= bytes.length) {
    const blockLen = readU32(bytes, pos);
    if (blockLen < 6 || blockLen > 65536 || pos + 4 + blockLen > bytes.length) break;
    const tag = readU32(bytes, pos + 4);
    if (tag === NAME_TAG) {
      const strLen = readU32(bytes, pos + 8);
      if (strLen >= 2 && strLen <= 512 && pos + 12 + strLen <= bytes.length)
        name = decodeUTF16LE(bytes, pos + 12, strLen);
    } else if (tag === COOR_TAG && blockLen >= 12) {
      x = readF32(bytes, pos + 8);
      y = readF32(bytes, pos + 12);
    }
    pos += 4 + blockLen;
  }
  if (!name || !isFinite(x) || !isFinite(y)) return null;
  // Return raw FP coordinates — game-space conversion is applied by callers
  return { type: elemType, kind, name, x, y };
}

// ─── Bulk Extraction ────────────────────────────────────────────────────────
export interface BulkExtractOptions {
  includeIncomplete?: boolean;
  kindFilter?: string[];
}

export function extractTableElementsFromCFB(
  arrayBuffer: ArrayBuffer, options: BulkExtractOptions = {},
): ParsedTableElement[] {
  let cfb: CFB$Container;
  try { cfb = CFB.read(new Uint8Array(arrayBuffer), { type: 'array' }); } catch { return []; }
  const entries = (cfb.FileIndex || []).filter(e => e.size > 0 && e.name && /table element/i.test(e.name));
  const results: ParsedTableElement[] = [];
  for (const entry of entries) {
    const raw = entry.content;
    const bytes: Uint8Array = raw instanceof Uint8Array ? raw : new Uint8Array(raw as ArrayLike<number>);
    const el = parseTableElement(bytes);
    if (!el) continue;
    if (!options.includeIncomplete && (!isFinite(el.x) || !isFinite(el.y))) continue;
    if (options.kindFilter && !options.kindFilter.includes(el.kind)) continue;
    results.push(el);
  }
  return results;
}

/** Legacy wrapper — backward-compatible {x,y} coords in game space */
export function extractTableCoordsFromCFB(arrayBuffer: ArrayBuffer): Array<{ x: number; y: number }> {
  return extractTableElementsFromCFB(arrayBuffer)
    .filter(el => isFinite(el.x) && isFinite(el.y))
    .map(el => ({ x: toGameX(el.x), y: toGameY(el.y) }));
}
