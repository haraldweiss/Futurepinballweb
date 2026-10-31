import { expect, it } from 'vitest';
import { lzo1xDecompress, tryLZOExtract } from '../fpt/lzo';

const bytes = (...parts: Array<number | number[] | Uint8Array>) => {
  const flat = parts.flatMap(part => part instanceof Uint8Array ? [...part] : Array.isArray(part) ? part : [part]);
  return new Uint8Array(flat);
};
const u32 = (value: number) => { const out = new Uint8Array(4); new DataView(out.buffer).setUint32(0, value, true); return out; };
const END = [0x11, 0x00, 0x00];

it('decodes an initial literal run and the end marker', () => {
  const stream = bytes([17 + 4], [0x41, 0x42, 0x43, 0x44], END);
  expect(new TextDecoder().decode(lzo1xDecompress(stream, 4)!)).toBe('ABCD');
});

it('decodes an M2 back-reference', () => {
  const stream = bytes([17 + 4], [0x41, 0x42, 0x43, 0x44], [0x6c, 0x00], END);
  expect(new TextDecoder().decode(lzo1xDecompress(stream, 8)!)).toBe('ABCDABCD');
});

it('decodes an M3 back-reference', () => {
  const stream = bytes([17 + 4], [0x41, 0x42, 0x43, 0x44], [0x22, 0x0c, 0x00], END);
  expect(new TextDecoder().decode(lzo1xDecompress(stream, 8)!)).toBe('ABCDABCD');
});

it('reads the zLZO uncompressed size and payload offset', () => {
  const payload = bytes([17 + 4], [0x41, 0x42, 0x43, 0x44], END);
  const container = bytes([0x7a, 0x4c, 0x5a, 0x4f], u32(4), payload);
  expect(new TextDecoder().decode(tryLZOExtract(container)!)).toBe('ABCD');
});

it('rejects truncated or mismatched zLZO payloads', () => {
  expect(tryLZOExtract(bytes([0x7a, 0x4c, 0x5a, 0x4f], u32(100), [0x11]))).toBeNull();
  expect(lzo1xDecompress(bytes([0x15, 0x41]), 4)).toBeNull();
});
