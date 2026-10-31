import { expect, it } from 'vitest';
import { findJpegEoiOffset, trimJpegToEoi } from '../fpt/jpeg';

it('uses the final EOI rather than an embedded thumbnail EOI', () => {
  const bytes = new Uint8Array([0xFF, 0xD8, 0xFF, 0xDA, 0x00, 0x02,
    0x01, 0x02, 0xFF, 0xD9, 0x03, 0x04, 0xFF, 0xD9]);
  expect(findJpegEoiOffset(bytes)).toBe(bytes.length);
  expect(trimJpegToEoi(bytes)).toEqual(bytes);
});

it('returns -1 for non-JPEG data', () => {
  expect(findJpegEoiOffset(new Uint8Array([0, 1, 2, 3]))).toBe(-1);
});
