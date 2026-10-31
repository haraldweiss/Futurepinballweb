import { expect, it } from 'vitest';
import { tgaToTexture } from '../fpt/tga';

function tga(width: number, height: number, bpp: 24 | 32, pixels: number[], descriptor = 0) {
  return new Uint8Array([0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    width & 255, width >> 8, height & 255, height >> 8, bpp, descriptor, ...pixels]);
}

it('decodes 32-bit BGRA and flips bottom-up rows', () => {
  const texture = tgaToTexture(tga(2, 2, 32, [
    0, 0, 255, 255, 0, 255, 0, 255, // bottom: red, green
    255, 0, 0, 255, 255, 255, 255, 255, // top: blue, white
  ]))!;
  expect(texture.image.width).toBe(2);
  expect(texture.image.height).toBe(2);
  const data = texture.image.data as Uint8Array;
  expect([...data.slice(0, 4)]).toEqual([0, 0, 255, 255]); // top-left blue
  expect([...data.slice(8, 12)]).toEqual([255, 0, 0, 255]); // bottom-left red
});

it('infers square dimensions from a 1x1 placeholder header', () => {
  const pixels = Array.from({ length: 4 * 4 * 4 }, (_, index) => index % 256);
  const texture = tgaToTexture(tga(1, 1, 32, pixels))!;
  expect(texture.image.width).toBe(4);
  expect(texture.image.height).toBe(4);
});

it('returns null for malformed or unsupported images', () => {
  expect(tgaToTexture(new Uint8Array(10))).toBeNull();
  expect(tgaToTexture(tga(2, 2, 24, [1, 2, 3]))).toBeNull();
  expect(tgaToTexture(tga(2, 2, 32, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16], 0x20))).not.toBeNull();
});
