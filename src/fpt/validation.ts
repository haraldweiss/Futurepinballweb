// SPDX-License-Identifier: AGPL-3.0-or-later

export function detectFPSignature(bytes: Uint8Array): string | null {
  if (bytes[0]===0x46&&bytes[1]===0x50&&bytes[2]===0x54) return 'FPT v1';
  if (bytes[0]===0x46&&bytes[1]===0x50)                   return 'FP/FPT';
  if (bytes[0]===0x46&&bytes[1]===0x55&&bytes[2]===0x54) return 'FUT';
  const head = String.fromCharCode(...(bytes.slice(0,512).filter(b=>b>=32&&b<127) as unknown as number[]));
  if (head.includes('FuturePinball')||head.includes('Future Pinball')) return 'FP (Text-Header)';
  if (head.includes('FPT')) return 'FPT (Partial)';
  return null;
}

export function calcConfidence(sig: string|null, stringCount: number, coordCount: number, fileSize: number): number {
  let s = 0;
  if (sig)              s += 30;
  if (stringCount > 10) s += 20;
  if (stringCount > 30) s += 10;
  if (coordCount  > 3)  s += 20;
  if (coordCount  > 10) s += 10;
  if (fileSize > 50000) s += 10;
  return Math.min(s, 100);
}
