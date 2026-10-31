import { expect, it } from 'vitest';
import * as CFB from '../fpt/cfb-io';
import { extractNativeScript } from '../fpt/script-extract';

const u32 = (value: number) => { const b = new Uint8Array(4); new DataView(b.buffer).setUint32(0, value, true); return b; };

function literalZLZO(text: string) {
  const bytes = new TextEncoder().encode(text);
  if (bytes.length <= 17 || bytes.length > 238) throw new Error('test helper limit');
  return new Uint8Array([0x7a, 0x4c, 0x5a, 0x4f, ...u32(bytes.length), 17 + bytes.length, ...bytes, 0x11, 0, 0]);
}

function container(streams: Array<{ path: string; bytes: Uint8Array }>) {
  const c = CFB.utils.cfb_new();
  for (const stream of streams) CFB.utils.cfb_add(c, stream.path, stream.bytes);
  return CFB.read(CFB.write(c, { type: 'array' }), { type: 'array' });
}

const script = "' header\nOption Explicit\nSub Main()\n  AddScore 100\nEnd Sub\n";
const other = "' second\nSub Other()\n  End Sub\n";

it('extracts the largest script from a native zLZO Table Data block', () => {
  const c = container([
    { path: 'Table Data', bytes: new Uint8Array([1, 2, 3, 4, ...literalZLZO(script)]) },
    { path: 'Other', bytes: literalZLZO(other) },
  ]);
  const result = extractNativeScript(c)!;
  expect(result.text).toBe(script);
  expect(result.blockOffset).toBe(4);
});

it('accepts direct text streams and ignores compressed-looking bytes', () => {
  const direct = container([{ path: 'Script', bytes: new TextEncoder().encode(script) }]);
  expect(extractNativeScript(direct)?.text).toBe(script);
  const noise = container([{ path: 'Table Data', bytes: new Uint8Array([0x53, 0x75, 0x62, 0x20, 1, 2, 3]) }]);
  expect(extractNativeScript(noise)).toBeNull();
});
