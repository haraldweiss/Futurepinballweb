// SPDX-License-Identifier: AGPL-3.0-or-later
import type { CFBContainer } from './cfb-io';
import { tryLZOExtract } from './lzo';

export interface NativeScript {
  text: string;
  streamPath: string;
  blockOffset: number;
}

/** High-confidence VBScript shape; avoids treating compressed bytes as text. */
export function looksLikeVBScript(text: string): boolean {
  if (!text || text.includes('\0')) return false;
  const option = /\bOption\s+Explicit\b/i.test(text);
  const sub = /\bSub\s+\w+/i.test(text) && /\bEnd\s+Sub\b/i.test(text);
  const fn = /\bFunction\s+\w+/i.test(text) && /\bEnd\s+Function\b/i.test(text);
  return option || sub || fn;
}

/**
 * Extract the largest high-confidence script from direct text streams or
 * native zLZO blocks (FP stores table scripts in the Table Data stream).
 */
export function extractNativeScript(container: CFBContainer): NativeScript | null {
  const candidates: NativeScript[] = [];
  container.FileIndex.forEach((entry, index) => {
    if (entry.type !== 2 || entry.size === 0) return;
    const bytes = entry.content;
    const streamPath = container.FullPaths[index] ?? entry.name;
    const direct = new TextDecoder('latin1').decode(bytes);
    if (looksLikeVBScript(direct)) candidates.push({ text: direct, streamPath, blockOffset: 0 });

    for (let offset = 0; offset < bytes.length - 4; offset++) {
      if (bytes[offset] !== 0x7a || bytes[offset + 1] !== 0x4c
          || bytes[offset + 2] !== 0x5a || bytes[offset + 3] !== 0x4f) continue;
      const decompressed = tryLZOExtract(bytes.subarray(offset));
      if (!decompressed) continue;
      const text = new TextDecoder('latin1').decode(decompressed);
      if (looksLikeVBScript(text)) candidates.push({ text, streamPath, blockOffset: offset });
      offset += 3;
    }
  });
  candidates.sort((a, b) => b.text.length - a.text.length);
  return candidates[0] ?? null;
}
