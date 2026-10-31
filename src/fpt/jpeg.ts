// SPDX-License-Identifier: AGPL-3.0-or-later

export function findJpegEoiOffset(bytes: Uint8Array): number {
  if (bytes.length < 4 || bytes[0] !== 0xFF || bytes[1] !== 0xD8) return -1;
  // Embedded EXIF thumbnails can contain their own EOI before the main image
  // ends, so use the last EOI rather than the first one after SOS.
  for (let i = bytes.length - 2; i >= 2; i--) {
    if (bytes[i] === 0xFF && bytes[i + 1] === 0xD9) return i + 2;
  }
  return -1;
}

export function trimJpegToEoi(bytes: Uint8Array): Uint8Array {
  const eoi = findJpegEoiOffset(bytes);
  return eoi > 0 ? bytes.subarray(0, eoi) : bytes;
}
