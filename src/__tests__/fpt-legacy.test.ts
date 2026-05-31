// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, it, expect } from 'vitest';
import { extractEmbeddedPayload, parseHeader, scanForPayloadStart } from '../fpt/legacy-container';
import { parseTableElement, extractTableCoordsFromCFB } from '../fpt/table-elements';

function makeBmpHeader(): Uint8Array {
  return new Uint8Array([
    0x42, 0x4d,             // "BM"
    0x64, 0x00, 0x00, 0x00, // fileSize = 100
    0x00, 0x00,             // reserved
    0x00, 0x00,             // reserved
    0x1a, 0x00, 0x00, 0x00, // dataOffset = 26
    0x28, 0x00, 0x00, 0x00, // dibSize = 40
    0x01, 0x00,             // width = 1
    0x01, 0x00,             // height = 1
  ]);
}

// Minimal LZO1X stream that decompresses to 20 bytes of BMP header.
// Byte layout: literal-run(37→20 literals) + BMP header(20 b) + end-marker(17,0,0)
function makeLzoBmpStream(): Uint8Array {
  const bmp = makeBmpHeader();
  const compressed = new Uint8Array(24);
  compressed[0] = 0x25;               // t = 37 → 20 literal bytes
  compressed.set(bmp, 1);             // BMP header as literals
  compressed[21] = 0x11;              // t = 17 → ml=1, hi0=0
  compressed[22] = 0x00;              // l4 = 0
  compressed[23] = 0x00;              // h4 = 0 → off=0 → break
  return compressed;
}

describe('extractEmbeddedPayload (FP v1.x legacy container)', () => {

  it('extracts OGG audio from offset 168 (Music/Sound stream)', () => {
    // Simulate: 168 bytes of TLV header + OGG marker + dummy payload
    const stream = new Uint8Array(200);
    stream[168] = 0x4f; stream[169] = 0x67; // "Og"
    stream[170] = 0x67; stream[171] = 0x53; // "gS" → "OggS"
    for (let i = 172; i < 200; i++) stream[i] = 0xaa; // dummy OGG data

    const result = extractEmbeddedPayload(stream);
    expect(result).not.toBeNull();
    expect(result!.kind).toBe('ogg');
    expect(result!.payload.length).toBe(32); // 200 - 168
    expect(result!.payload[0]).toBe(0x4f);
    expect(result!.payload[1]).toBe(0x67);
  });

  it('extracts zLZO-wrapped BMP image at offset 168 (Image stream)', () => {
    const lzoData = makeLzoBmpStream();
    const stream = new Uint8Array(168 + 4 + lzoData.length);
    // TLV header (168 bytes of padding)
    for (let i = 0; i < 168; i++) stream[i] = 0x00;
    // zLZO marker at offset 168
    stream[168] = 0x7a; stream[169] = 0x4c;
    stream[170] = 0x5a; stream[171] = 0x4f;
    // compressed data after marker
    stream.set(lzoData, 172);

    const result = extractEmbeddedPayload(stream);
    expect(result).not.toBeNull();
    expect(result!.kind).toBe('bmp');
    expect(result!.payload.length).toBe(20);
    expect(result!.payload[0]).toBe(0x42);
    expect(result!.payload[1]).toBe(0x4d);
  });

  it('returns null for random binary data (no magic found)', () => {
    const data = new Uint8Array(300);
    for (let i = 0; i < 300; i++) data[i] = (i * 7 + 13) & 0xff;

    const result = extractEmbeddedPayload(data);
    expect(result).toBeNull();
  });

  it('extracts BMP at offset 0 (direct format, FP v2.x compatible)', () => {
    const bmp = makeBmpHeader();
    const stream = new Uint8Array(bmp.length + 10);
    stream.set(bmp, 0);

    const result = extractEmbeddedPayload(stream);
    expect(result).not.toBeNull();
    expect(result!.kind).toBe('bmp');
    expect(result!.payload.length).toBe(bmp.length + 10);
  });

  it('extracts JPEG at offset 0 (direct format)', () => {
    const stream = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01]);
    const result = extractEmbeddedPayload(stream);
    expect(result).not.toBeNull();
    expect(result!.kind).toBe('jpeg');
    expect(result!.payload.length).toBe(stream.length);
  });

  it('extracts PNG at offset 0 (direct format)', () => {
    const stream = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d]);
    const result = extractEmbeddedPayload(stream);
    expect(result).not.toBeNull();
    expect(result!.kind).toBe('png');
  });

  it('extracts OGG at offset 0 (direct format)', () => {
    const stream = new Uint8Array([0x4f, 0x67, 0x67, 0x53, 0x00, 0x02, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]);
    const result = extractEmbeddedPayload(stream);
    expect(result).not.toBeNull();
    expect(result!.kind).toBe('ogg');
  });

  it('extracts WAV/RIFF at offset 0', () => {
    const stream = new Uint8Array([0x52, 0x49, 0x46, 0x46, 0x24, 0x00, 0x00, 0x00, 0x57, 0x41, 0x56, 0x45]);
    const result = extractEmbeddedPayload(stream);
    expect(result).not.toBeNull();
    expect(result!.kind).toBe('wav');
  });

  it('returns null for a short buffer (< 4 bytes)', () => {
    expect(extractEmbeddedPayload(new Uint8Array(2))).toBeNull();
  });

  it('returns null for empty buffer', () => {
    expect(extractEmbeddedPayload(new Uint8Array(0))).toBeNull();
  });

  it('returns unknown for zLZO that decompresses to non-image data', () => {
    // A valid LZO stream that decompresses to ASCII text, not an image
    const text = new TextEncoder().encode('Hello World! This is not an image.');
    const compressed = new Uint8Array(text.length + 3);
    const t = 17 + text.length;
    compressed[0] = t;
    compressed.set(text, 1);
    compressed[text.length + 1] = 0x11;
    compressed[text.length + 2] = 0x00;
    compressed[text.length + 3] = 0x00;

    const stream = new Uint8Array(4 + compressed.length);
    stream[0] = 0x7a; stream[1] = 0x4c; stream[2] = 0x5a; stream[3] = 0x4f;
    stream.set(compressed, 4);

    const result = extractEmbeddedPayload(stream);
    expect(result).toBeNull();
  });
});

describe('parseHeader (FP v1.x TLV header)', () => {

  function makeTlvBlock(tagBytes: number[], value: Uint8Array): Uint8Array {
    const blockLen = 4 + value.length; // tag (4) + value
    const buf = new Uint8Array(4 + blockLen);
    buf[0] = blockLen; buf[1] = 0; buf[2] = 0; buf[3] = 0;
    for (let i = 0; i < 4; i++) buf[4 + i] = tagBytes[i];
    buf.set(value, 8);
    return buf;
  }

  function makeStrBlock(tagBytes: number[], str: string): Uint8Array {
    const encoded = new TextEncoder().encode(str);
    const strLen = encoded.length;
    const value = new Uint8Array(4 + strLen);
    value[0] = strLen; value[1] = 0; value[2] = 0; value[3] = 0;
    value.set(encoded, 4);
    return makeTlvBlock(tagBytes, value);
  }

  function makeHeader(opts: {
    subtype?: number;
    name: string;
    displayName?: string;
    sourcePath?: string;
    payloadStart?: number;
    extraBlocks?: number;
  }): Uint8Array {
    const parts: Uint8Array[] = [];

    // TYPE block
    const subtypeBytes = new Uint8Array(4);
    subtypeBytes[0] = opts.subtype ?? 1;
    parts.push(makeTlvBlock([0xac, 0xa6, 0xaf, 0xba], subtypeBytes));

    // NAME block
    parts.push(makeStrBlock([0xb2, 0xbe, 0xb2, 0xba], opts.name));

    // DISP block (optional, reuse name if not provided)
    parts.push(makeStrBlock([0xb7, 0xb1, 0xb2, 0xba], opts.displayName || opts.name));

    // PATH block (optional)
    if (opts.sourcePath) {
      parts.push(makeStrBlock([0xb0, 0xbe, 0xab, 0xb7], opts.sourcePath));
    }

    // Extra padding / unknown blocks
    if (opts.extraBlocks) {
      for (let i = 0; i < opts.extraBlocks; i++) {
        const pad = new Uint8Array(8);
        parts.push(pad);
      }
    }

    // Concatenate
    const totalLen = parts.reduce((s, p) => s + p.length, 0);
    const headerEnd = opts.payloadStart ?? totalLen;
    const result = new Uint8Array(headerEnd + 8);
    let off = 0;
    for (const p of parts) { result.set(p, off); off += p.length; }
    // Fill gap between header end and payload with zeros
    for (let i = totalLen; i < headerEnd; i++) result[i] = 0;
    // Put zLZO marker at payload start
    result[headerEnd] = 0x7a; result[headerEnd + 1] = 0x4c;
    result[headerEnd + 2] = 0x5a; result[headerEnd + 3] = 0x4f;
    return result;
  }

  it('parses a minimal header (TYPE + NAME + DISP + zLZO)', () => {
    const bytes = makeHeader({ name: 'test_image', payloadStart: 64 });
    const hdr = parseHeader(bytes);
    expect(hdr).not.toBeNull();
    expect(hdr!.name).toBe('test_image');
    expect(hdr!.displayName).toBe('test_image');
    expect(hdr!.sourcePath).toBe('');
    expect(hdr!.subtype).toBe(1);
    expect(hdr!.payloadOffset).toBe(64);
  });

  it('parses header with source path and display name', () => {
    const bytes = makeHeader({
      name: 'alien bumper',
      displayName: 'alien bumper display',
      sourcePath: 'D:\\Wait\\alien bumper.bmp',
      payloadStart: 128,
    });
    const hdr = parseHeader(bytes);
    expect(hdr).not.toBeNull();
    expect(hdr!.name).toBe('alien bumper');
    expect(hdr!.displayName).toBe('alien bumper display');
    expect(hdr!.sourcePath).toBe('D:\\Wait\\alien bumper.bmp');
    expect(hdr!.payloadOffset).toBe(128);
  });

  it('returns correct payloadOffset with extra unknown blocks', () => {
    const bytes = makeHeader({ name: 'img', extraBlocks: 5, payloadStart: 168 });
    const hdr = parseHeader(bytes);
    expect(hdr).not.toBeNull();
    expect(hdr!.payloadOffset).toBe(168);
  });

  it('returns null for a buffer with no TYPE block', () => {
    const bytes = makeStrBlock([0xb2, 0xbe, 0xb2, 0xba], 'orphan');
    expect(parseHeader(bytes)).toBeNull();
  });

  it('returns null for empty buffer', () => {
    expect(parseHeader(new Uint8Array(0))).toBeNull();
  });

  it('returns null when payload magic is missing after header', () => {
    const bytes = makeHeader({ name: 'no_payload' });
    // Calculate where the zLZO marker was placed (headerEnd = totalLen by default)
    // TYPE=12, each NAME/DISP=4(blockLen)+4(tag)+4(strLen)+strlen → for 10 chars each = 22
    const totalLen = 12 + 22 + 22;
    // Overwrite the zLZO marker at headerEnd with zeros
    for (let i = totalLen; i < totalLen + 4; i++) bytes[i] = 0;
    const hdr = parseHeader(bytes);
    expect(hdr).toBeNull();
  });

  it('parses subtype 9 (Music) correctly', () => {
    const bytes = makeHeader({ name: 'bgm', subtype: 9, payloadStart: 64 });
    const hdr = parseHeader(bytes);
    expect(hdr).not.toBeNull();
    expect(hdr!.subtype).toBe(9);
  });
});

describe('scanForPayloadStart', () => {
  it('finds zLZO marker', () => {
    const buf = new Uint8Array(200);
    buf[168] = 0x7a; buf[169] = 0x4c; buf[170] = 0x5a; buf[171] = 0x4f;
    expect(scanForPayloadStart(buf, 0)).toBe(168);
  });

  it('finds OGG marker', () => {
    const buf = new Uint8Array(100);
    buf[42] = 0x4f; buf[43] = 0x67; buf[44] = 0x67; buf[45] = 0x53;
    expect(scanForPayloadStart(buf, 0)).toBe(42);
  });

  it('finds RIFF marker', () => {
    const buf = new Uint8Array(50);
    buf[12] = 0x52; buf[13] = 0x49; buf[14] = 0x46; buf[15] = 0x46;
    expect(scanForPayloadStart(buf, 0)).toBe(12);
  });

  it('finds BMP marker', () => {
    const buf = new Uint8Array(30);
    buf[8] = 0x42; buf[9] = 0x4d;
    expect(scanForPayloadStart(buf, 0)).toBe(8);
  });

  it('finds JPEG marker', () => {
    const buf = new Uint8Array(30);
    buf[3] = 0xff; buf[4] = 0xd8;
    expect(scanForPayloadStart(buf, 0)).toBe(3);
  });

  it('finds PNG marker', () => {
    const buf = new Uint8Array(30);
    buf[7] = 0x89; buf[8] = 0x50; buf[9] = 0x4e; buf[10] = 0x47;
    expect(scanForPayloadStart(buf, 0)).toBe(7);
  });

  it('respects startOff parameter (skips early match)', () => {
    const buf = new Uint8Array(50);
    buf[5] = 0x7a; buf[6] = 0x4c; buf[7] = 0x5a; buf[8] = 0x4f;
    buf[20] = 0x7a; buf[21] = 0x4c; buf[22] = 0x5a; buf[23] = 0x4f;
    expect(scanForPayloadStart(buf, 10)).toBe(20);
  });

  it('returns -1 when no marker is present', () => {
    const buf = new Uint8Array(100);
    for (let i = 0; i < 100; i++) buf[i] = 0xaa;
    expect(scanForPayloadStart(buf, 0)).toBe(-1);
  });
});

describe('parseTableElement (FP v1.x geometry stream)', () => {

  function makeTlvBlock(tagBytes: number[], value: Uint8Array): Uint8Array {
    const blockLen = 4 + value.length;
    const buf = new Uint8Array(4 + blockLen);
    buf[0] = blockLen; buf[1] = 0; buf[2] = 0; buf[3] = 0;
    for (let i = 0; i < 4; i++) buf[4 + i] = tagBytes[i];
    buf.set(value, 8);
    return buf;
  }

  function makeUtf16Block(tagBytes: number[], str: string): Uint8Array {
    const encoded = new Uint8Array(str.length * 2);
    for (let i = 0; i < str.length; i++) {
      encoded[i * 2] = str.charCodeAt(i) & 0xff;
      encoded[i * 2 + 1] = (str.charCodeAt(i) >> 8) & 0xff;
    }
    const strLen = encoded.length;
    const value = new Uint8Array(4 + strLen);
    value[0] = strLen; value[1] = 0; value[2] = 0; value[3] = 0;
    value.set(encoded, 4);
    return makeTlvBlock(tagBytes, value);
  }

  function makeCoordBlock(x: number, y: number): Uint8Array {
    const value = new Uint8Array(8);
    const view = new DataView(value.buffer);
    view.setFloat32(0, x, true);
    view.setFloat32(4, y, true);
    return makeTlvBlock([0xaa, 0xbc, 0xba, 0xb1], value);
  }

  function makeTableElementStream(opts: {
    type: number;
    name: string;
    x?: number;
    y?: number;
    extraBlocks?: number;
  }): Uint8Array {
    const parts: Uint8Array[] = [];
    // Element type at offset 0
    const typeBytes = new Uint8Array(4);
    typeBytes[0] = opts.type;
    parts.push(typeBytes);
    // NAME block (UTF-16-LE)
    parts.push(makeUtf16Block([0xb2, 0xbe, 0xb2, 0xba], opts.name));
    // Optional coordinate block
    if (opts.x !== undefined && opts.y !== undefined) {
      parts.push(makeCoordBlock(opts.x, opts.y));
    }
    // Extra unknown blocks
    for (let i = 0; i < (opts.extraBlocks ?? 0); i++) {
      parts.push(new Uint8Array([8, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]));
    }
    const totalLen = parts.reduce((s, p) => s + p.length, 0);
    const result = new Uint8Array(totalLen);
    let off = 0;
    for (const p of parts) { result.set(p, off); off += p.length; }
    return result;
  }

  it('parses a Bumper element with coordinates', () => {
    const stream = makeTableElementStream({ type: 8, name: 'Bumper1', x: 288.83, y: 364.67 });
    const el = parseTableElement(stream);
    expect(el).not.toBeNull();
    expect(el!.type).toBe(8);
    expect(el!.name).toBe('Bumper1');
    expect(el!.x).toBeCloseTo(288.83, 2);
    expect(el!.y).toBeCloseTo(364.67, 2);
  });

  it('parses a Light element', () => {
    const stream = makeTableElementStream({ type: 3, name: 'LightJackpot', x: 170.67, y: 536.67 });
    const el = parseTableElement(stream);
    expect(el).not.toBeNull();
    expect(el!.type).toBe(3);
    expect(el!.name).toBe('LightJackpot');
    expect(el!.x).toBeCloseTo(170.67, 1);
  });

  it('parses a Target element', () => {
    const stream = makeTableElementStream({ type: 10, name: 'TargetSciFi_I1', x: 219.23, y: 280.72 });
    const el = parseTableElement(stream);
    expect(el).not.toBeNull();
    expect(el!.name).toBe('TargetSciFi_I1');
  });

  it('returns null for a stream with no NAME block', () => {
    const stream = new Uint8Array(8);
    expect(parseTableElement(stream)).toBeNull();
  });

  it('returns null for empty buffer', () => {
    expect(parseTableElement(new Uint8Array(0))).toBeNull();
  });

  it('returns null for a stream with NAME but no coordinates', () => {
    const stream = makeTableElementStream({ type: 2, name: 'Surface2' });
    expect(parseTableElement(stream)).toBeNull();
  });

  it('handles extra unknown blocks after NAME and COORD', () => {
    const stream = makeTableElementStream({ type: 8, name: 'Bumper2', x: 359.08, y: 242.08, extraBlocks: 3 });
    const el = parseTableElement(stream);
    expect(el).not.toBeNull();
    expect(el!.name).toBe('Bumper2');
    expect(el!.x).toBeCloseTo(359.08, 1);
  });

  it('parses UTF-16-LE name correctly', () => {
    const stream = makeTableElementStream({ type: 6, name: 'Peg24', x: 35, y: 649.25 });
    const el = parseTableElement(stream);
    expect(el).not.toBeNull();
    expect(el!.name).toBe('Peg24');
  });
});
