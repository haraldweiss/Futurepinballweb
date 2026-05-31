// SPDX-License-Identifier: AGPL-3.0-or-later
export function lzo1xDecompress(src: Uint8Array, sizeHint?: number): Uint8Array | null {
  try {
    const out = new Uint8Array(sizeHint || Math.min(src.length * 10 + 65536, 48 << 20));
    let ip = 0, op = 0;

    const m1 = (t: number) => {
      const mp = op - 0x801 - (t >> 2) - (src[ip++] << 2);
      out[op++] = out[mp]; out[op++] = out[mp+1]; out[op++] = out[mp+2];
      return src[ip++];
    };

    let t = src[ip++];
    if (t > 17) {
      t -= 17;
      while (t-- > 0) out[op++] = src[ip++];
      t = src[ip++];
      if (t < 16) t = m1(t);
    }

    outer: for (;;) {
      if (t < 16) {
        let n = t;
        if (n === 0) { n = 15; while (src[ip]===0){n+=255;ip++;} n+=src[ip++]; }
        n += 3;
        while (n-- > 0) out[op++] = src[ip++];
        t = src[ip++];
        if (t < 16) { t = m1(t); continue outer; }
      }
      let ml: number, mp: number;
      if (t >= 64) {
        mp = op - 1 - ((t>>2)&7) - (src[ip++]<<3); ml = (t>>5)+1;
      } else if (t >= 32) {
        ml = t & 31;
        if (ml===0){ml=31;while(src[ip]===0){ml+=255;ip++;}ml+=src[ip++];}
        ml+=2;
        const l3=src[ip++],h3=src[ip++]; mp=op-1-(l3>>2)-(h3<<6)-0x4000;
      } else {
        ml = t & 7;
        if (ml===0){ml=7;while(src[ip]===0){ml+=255;ip++;}ml+=src[ip++];}
        ml+=2;
        const hi0=(t&8)<<11, l4=src[ip++], h4=src[ip++], off=(l4>>2)|(h4<<6);
        if (hi0===0 && off===0) break outer;
        mp=op-hi0-off-0x4001;
      }
      let m=mp; for(let i=0;i<ml;i++) out[op++]=out[m++];
      t=src[ip++]; if(t<16) t=m1(t);
    }
    return out.subarray(0, op);
  } catch (e) { console.debug('[fpt] Decompression failed:', (e || 'unknown')); return null; }
}

export function tryLZOExtract(bytes: Uint8Array): Uint8Array | null {
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
