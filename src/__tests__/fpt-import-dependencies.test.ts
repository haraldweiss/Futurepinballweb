import { beforeEach, expect, it, vi } from 'vitest';
import * as CFB from '../fpt/cfb-io';
const mocks = vi.hoisted(() => ({ log: vi.fn(), cached: vi.fn(), worker: vi.fn() }));
vi.mock('../fpt/log', () => ({ logMsg: mocks.log }));
vi.mock('../game', () => ({ fptResources: {}, fptRawBytes: {}, globalAssetCatalog: () => null }));
vi.mock('../script-engine', () => ({ runFPScript: vi.fn() }));
vi.mock('../audio-system', () => ({ playFPTMusic: vi.fn() }));
vi.mock('../library-cache', () => ({ getLibraryCache: vi.fn() }));
vi.mock('../storage/fpt-cache', () => ({ generateCacheKeyFromBuffer: () => 'key', getCachedTable: mocks.cached, setCachedTable: vi.fn() }));
vi.mock('../workers/parse-worker-bridge', () => ({ parseFileInWorker: mocks.worker }));
import { parseFPTFile } from '../fpt/file-parser';
const join = (...parts: Uint8Array[]) => new Uint8Array(parts.flatMap(p => [...p]));
function u32(n: number) { const b = new Uint8Array(4); new DataView(b.buffer).setUint32(0, n, true); return b; }
const str = (s: string) => join(u32(s.length), new TextEncoder().encode(s));
const tlv = (tag: number, value = new Uint8Array()) => join(u32(4 + value.length), u32(tag), value);
const record = (path = 'Libraries\\Native.FPL\\Playfield') => join(tlv(0xbab2beb2, str('Image')), tlv(0xb7abbeb0, str(path)), tlv(0xbdbbb1bb));
function file(bytes = record(), streamPath = 'Resources/Image 1') {
  const container = CFB.utils.cfb_new();
  CFB.utils.cfb_add(container, streamPath, bytes);
  const data = CFB.write(container, { type: 'array' });
  return { name: 'native.fpt', size: data.length, arrayBuffer: async () => data.slice().buffer } as File;
}
const logs = () => mocks.log.mock.calls.map(c => c[0]).join('\n');
beforeEach(() => {
  vi.clearAllMocks();
  mocks.cached.mockResolvedValue(null);
  mocks.worker.mockResolvedValue({ textures: [], sounds: [], models: [], coords: [], elements: [], script: null, tableName: 'Native', confidence: 0 });
});
it.each(['worker', 'cache'])('logs native dependencies before %s parsing/build', async route => {
  const verify = () => {
    expect(logs()).toContain('Libraries\\Native.FPL');
    expect(logs()).toContain('Playfield');
    expect(logs()).toContain('nicht verifiziert');
  };
  if (route === 'cache') mocks.cached.mockImplementation(async () => {
    verify();
    return { meta: { tableName: 'Native', storageSize: 0, script: null, config: {} }, textures: [], sounds: [], models: [] };
  });
  else mocks.worker.mockImplementation(async (buffer: ArrayBuffer) => {
    verify();
    structuredClone(buffer, { transfer: [buffer] });
    return { textures: [], sounds: [], models: [], coords: [], elements: [], script: null, tableName: 'Native', confidence: 0 };
  });
  const build = vi.fn(verify);
  await parseFPTFile(file(), build);
  expect(build).toHaveBeenCalledOnce();
});
it('warns about malformed recognized records without claiming verified support', async () => {
  await parseFPTFile(file(join(u32(100), u32(0xbab2beb2))));
  expect(logs()).toContain('malformed-record');
  expect(logs()).toContain('nicht verifiziert');
  expect(mocks.log.mock.calls.filter(c => c[1] === 'ok').map(c => c[0]).join('\n')).not.toMatch(/verifiziert|vollständig/i);
});
it('leaves JSON import callbacks and diagnostics unchanged', async () => {
  const cfg = { name: 'JSON', bumpers: [], tableColor: 0 };
  const build = vi.fn(); const close = vi.fn();
  await parseFPTFile({ name: 'table.json', size: 40, text: async () => JSON.stringify(cfg) } as File, build, close);
  expect(build).toHaveBeenCalledWith(cfg); expect(close).toHaveBeenCalledOnce();
  expect(mocks.cached).not.toHaveBeenCalled(); expect(mocks.worker).not.toHaveBeenCalled();
  expect(logs()).not.toMatch(/Native|verifiziert/);
});
it('bounds diagnostics for tables with hundreds of native references', async () => {
  await parseFPTFile(file(join(...Array.from({ length: 300 }, (_, i) => record(`Lib${i % 8}.fpl/Member${i}`)))));
  const nativeLines = mocks.log.mock.calls.filter(c => c[1] === 'warn');
  expect(logs()).toContain('300 in 8');
  expect(logs()).toContain('3 weitere Bibliothek(en)');
  expect(nativeLines).toHaveLength(7);
  expect(logs()).toContain('Member0');
  expect(logs()).not.toContain('Member299');
});
it('does not equate absent recognized references with verified support', async () => {
  await parseFPTFile(file(tlv(123)));
  expect(logs()).not.toMatch(/verifiziert|vollständig/i);
});
it('keeps worker import available when native preflight cannot decode the container', async () => {
  const build = vi.fn();
  await parseFPTFile({ name: 'unknown.fpt', size: 8, arrayBuffer: async () => new ArrayBuffer(8) } as File, build);
  expect(logs()).toContain('Referenzprüfung nicht möglich');
  expect(build).toHaveBeenCalledOnce();
});

it('bounds long native library/member fields and the total diagnostic text', async () => {
  // 6 libraries x 3 long members exhaust the 2,400-unit budget; the trailing
  // malformed record adds a partial-coverage warning that must survive. The
  // fifth library line is cut and the "weitere" line is suppressed, so removing
  // the budget guard would push the total past the ceiling.
  const refs = Array.from({ length: 6 }, (_library, i) =>
    join(...Array.from({ length: 3 }, (_member, j) => record(`Lib${i}.fpl/${'M'.repeat(4000)}${j}`))));
  await parseFPTFile(file(join(...refs, u32(100), u32(0xbab2beb2))));
  const text = mocks.log.mock.calls.filter(c => c[1] === 'warn').map(c => c[0] as string).join('');
  expect(text.length).toBeLessThanOrEqual(2400);
  expect(text).toContain('18 in 6');
  expect(text).toContain('…');
  expect(text).toContain('Referenzprüfung unvollständig');
  expect(text).toContain('nicht verifiziert');
  expect(text).not.toContain('M'.repeat(160));
});
it('bounds the displayed stream path of a malformed recognized record', async () => {
  await parseFPTFile(file(join(u32(100), u32(0xbab2beb2)), `${'Folder/'.repeat(80)}Image 1`));
  const warning = mocks.log.mock.calls.find(c => (c[0] as string).includes('malformed-record'))?.[0] as string;
  expect(warning).toContain('…');
  expect(warning.length).toBeLessThan(400);
});
