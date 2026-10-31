// SPDX-License-Identifier: AGPL-3.0-or-later
/**
 * LZO1X/LZO1Y decoder matching Future Pinball's FUN_0046f5f0:
 * zLZO header + size, token <16 literal runs or M1, M2/M3/M4 matches, and
 * the low two token bits carry trailing literal counts.
 */
export function lzo1xDecompress(src: Uint8Array, sizeHint?: number): Uint8Array | null {
  try {
    const out = new Uint8Array(sizeHint || Math.min(src.length * 10 + 65536, 48 << 20));
    let ip = 0, op = 0;

    const literals = (count: number) => {
      if (count < 0 || ip + count > src.length || op + count > out.length) throw new Error('lzo literal bounds');
      for (let i = 0; i < count; i++) out[op++] = src[ip++];
    };
    const match = (from: number, count: number) => {
      if (from < 0 || count < 0 || op + count > out.length) throw new Error('lzo match bounds');
      for (let i = 0; i < count; i++) out[op++] = out[from++];
    };

    let t = src[ip++];
    let mode: 'literal' | 'match' = 'literal';
    if (t > 17) {
      literals(t - 17);
      t = src[ip++];
      mode = 'match';
    }

    for (;;) {
      if (mode === 'literal' && t < 16) {
        let count = t;
        if (count === 0) {
          count = 15;
          while (src[ip] === 0) { count += 255; ip++; }
          count += src[ip++];
        }
        literals(count + 3);
        t = src[ip++];
        mode = 'match';
        continue;
      }

      if (t < 16) {
        // M1: two-byte match at a short backward offset.
        const offset = src[ip++];
        match(op - 1 - (t >> 2) - (offset << 2) - 0x801, 2);
      } else {
        let length: number;
        let from: number;
        if (t >= 0x40) {
          // M2
          from = op - 1 - ((t >> 2) & 7) - (src[ip++] << 3);
          length = (t >> 5) + 1;
        } else if (t >= 0x20) {
          // M3
          length = t & 0x1f;
          if (length === 0) {
            length = 31;
            while (src[ip] === 0) { length += 255; ip++; }
            length += src[ip++];
          }
          length += 2;
          const lo = src[ip++], hi = src[ip++];
          from = op - 1 - (lo >> 2) - (hi << 6);
        } else {
          // M4 (16..31)
          length = t & 7;
          if (length === 0) {
            length = 7;
            while (src[ip] === 0) { length += 255; ip++; }
            length += src[ip++];
          }
          length += 2;
          const lo = src[ip++], hi = src[ip++];
          from = op - ((t & 8) << 11) - ((lo >> 2) + (hi << 6));
          if (from === op) return length === 3 ? out.subarray(0, op) : null;
          from -= 0x4000;
        }
        match(from, length);
      }

      const trailing = src[ip - 2] & 3;
      if (trailing === 0) {
        t = src[ip++];
        mode = 'literal';
      } else {
        literals(trailing);
        t = src[ip++];
        mode = 'match';
      }
    }
  } catch { return null; }
}

export function tryLZOExtract(bytes: Uint8Array): Uint8Array | null {
  // Future Pinball zLZO container: magic, LE uncompressed size, LZO1X data.
  if (bytes.length >= 9 && bytes[0] === 0x7a && bytes[1] === 0x4c
      && bytes[2] === 0x5a && bytes[3] === 0x4f) {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const size = view.getUint32(4, true);
    if (size > 0 && size <= 64 * 1024 * 1024) {
      const result = lzo1xDecompress(bytes.subarray(8), size);
      if (result && result.length >= 4) return result;
    }
  }
  // Legacy offsets retained for non-zLZO payloads and older fixtures.
  for (const [dataOff, sizeOff] of [[12,8],[8,0],[16,12]]) {
    if (bytes.length <= dataOff) continue;
    const view = new DataView(bytes.buffer, bytes.byteOffset);
    let hint = 0;
    try { hint = view.getUint32(sizeOff, true); } catch { /* ignore */ }
    if (hint > 64*1024*1024 || hint < 0) hint = 0;
    const result = lzo1xDecompress(bytes.slice(dataOff), hint || undefined);
    if (result && result.length > 4) return result;
  }
  return null;
}
