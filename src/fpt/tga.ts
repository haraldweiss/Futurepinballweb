// SPDX-License-Identifier: AGPL-3.0-or-later
import * as THREE from 'three';

/**
 * Decode uncompressed 24/32-bit TGA (TGA 2.0 footer optional). Some FP
 * decals carry a 1x1 placeholder header; when the pixel count is a perfect
 * square, infer the real square dimensions.
 */
export function tgaToTexture(bytes: Uint8Array): THREE.Texture | null {
  if (bytes.length < 18 || bytes[1] !== 0 || bytes[2] !== 2) return null;
  const idLength = bytes[0];
  const bpp = bytes[16];
  if (bpp !== 24 && bpp !== 32) return null;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let width = bytes[12] | (bytes[13] << 8);
  let height = bytes[14] | (bytes[15] << 8);
  const dataStart = 18 + idLength;
  let dataEnd = bytes.length;
  if (bytes.length >= 26 && new TextDecoder().decode(bytes.subarray(bytes.length - 18, bytes.length - 1)) === 'TRUEVISION-XFILE.') {
    const extension = view.getUint32(bytes.length - 26, true);
    if (extension > dataStart && extension <= bytes.length) dataEnd = extension;
  }
  const bytesPerPixel = bpp / 8;
  const pixels = Math.floor((dataEnd - dataStart) / bytesPerPixel);
  if (width <= 1 || height <= 1) {
    const side = Math.round(Math.sqrt(pixels));
    if (side > 1 && side * side === pixels) { width = side; height = side; }
  }
  if (width < 1 || height < 1 || width * height > pixels) return null;
  const rgba = new Uint8Array(width * height * 4);
  const topDown = (bytes[17] & 0x20) !== 0;
  for (let y = 0; y < height; y++) {
    const sourceRow = topDown ? y : height - 1 - y;
    for (let x = 0; x < width; x++) {
      const source = dataStart + (sourceRow * width + x) * bytesPerPixel;
      const target = (y * width + x) * 4;
      rgba[target] = bytes[source + 2];
      rgba[target + 1] = bytes[source + 1];
      rgba[target + 2] = bytes[source];
      rgba[target + 3] = bpp === 32 ? bytes[source + 3] : 255;
    }
  }
  const texture = new THREE.DataTexture(rgba, width, height, THREE.RGBAFormat, THREE.UnsignedByteType);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.flipY = false;
  texture.needsUpdate = true;
  return texture;
}
