import { expect, it } from 'vitest';
import { parseMS3DBinary } from '../fpt/fpm-parser';

function u16(value: number) { return [value & 255, value >> 8]; }
function f32(value: number) { const b = new Uint8Array(4); new DataView(b.buffer).setFloat32(0, value, true); return [...b]; }
function u32(value: number) { const b = new Uint8Array(4); new DataView(b.buffer).setUint32(0, value, true); return [...b]; }

function model() {
  const bytes: number[] = [];
  bytes.push(...new TextEncoder().encode('MS3D000000'), ...u32(4), ...u16(3));
  for (const [x, y, z] of [[0, 0, 0], [1, 0, 0], [0, 1, 0]]) {
    bytes.push(0, ...f32(x), ...f32(y), ...f32(z), 0, 0);
  }
  bytes.push(...u16(1), ...u16(0), ...u16(0), ...u16(1), ...u16(2));
  for (let i = 0; i < 3; i++) bytes.push(...f32(0), ...f32(0), ...f32(1));
  for (let i = 0; i < 3; i++) bytes.push(...f32(i === 1 ? 1 : 0));
  for (let i = 0; i < 3; i++) bytes.push(...f32(i === 2 ? 1 : 0));
  bytes.push(0, 0);
  return new Uint8Array(bytes);
}

it('parses the observed 15-byte vertex and 70-byte triangle layout', () => {
  const parsed = parseMS3DBinary(model())!;
  expect(parsed.vertices).toEqual([0, 0, 0, 1, 0, 0, 0, 1, 0]);
  expect(parsed.normals).toEqual([0, 0, 1, 0, 0, 1, 0, 0, 1]);
  expect(parsed.uvs).toEqual([0, 0, 1, 0, 0, 1]);
  expect(parsed.indices).toEqual([0, 1, 2]);
});

it('rejects truncated or out-of-range models', () => {
  const valid = model();
  expect(parseMS3DBinary(valid.slice(0, valid.length - 1))).toBeNull();
  expect(parseMS3DBinary(new Uint8Array([1, 2, 3]))).toBeNull();
});
