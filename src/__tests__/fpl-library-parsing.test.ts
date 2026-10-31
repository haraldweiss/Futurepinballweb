import { beforeEach, expect, it, vi } from 'vitest';
import * as CFB from '../fpt/cfb-io';

const mocks = vi.hoisted(() => ({
  log: vi.fn(), image: vi.fn(), sound: vi.fn(), parseFPM: vi.fn(),
  registerModel: vi.fn(), cacheSet: vi.fn(),
}));
vi.mock('../fpt/log', () => ({ logMsg: mocks.log }));
vi.mock('../game', () => ({
  fptResources: {}, fptRawBytes: {},
  globalAssetCatalog: () => ({ registerModel: mocks.registerModel }),
}));
vi.mock('../script-engine', () => ({ runFPScript: vi.fn() }));
vi.mock('../audio-system', () => ({ playFPTMusic: vi.fn() }));
vi.mock('../library-cache', () => ({ getLibraryCache: () => ({ set: mocks.cacheSet, has: () => false, get: () => null }) }));
vi.mock('../storage/fpt-cache', () => ({ generateCacheKeyFromBuffer: () => 'key', getCachedTable: vi.fn(), setCachedTable: vi.fn() }));
vi.mock('../workers/parse-worker-bridge', () => ({ parseFileInWorker: vi.fn() }));
vi.mock('../fpt/media', () => ({ extractImageFromBytes: mocks.image, extractSoundFromBytes: mocks.sound }));
vi.mock('../fpt/fpm-parser', () => ({ parseFPM: mocks.parseFPM, fpmToTHREE: () => ({ mesh: true }) }));

import { parseFPLFile } from '../fpt/file-parser';

const u32 = (value: number) => {
  const bytes = new Uint8Array(4);
  new DataView(bytes.buffer).setUint32(0, value, true);
  return bytes;
};
type WriteContainer = ReturnType<typeof CFB.utils.cfb_new>;
const member = (c: WriteContainer, name: string, type: number, data: Uint8Array) => {
  CFB.utils.cfb_add(c, `${name}/FTYP`, u32(type));
  CFB.utils.cfb_add(c, `${name}/FLAD`, new Uint8Array(8));
  CFB.utils.cfb_add(c, `${name}/FPAT`, new TextEncoder().encode(`D:\\lib\\${name}`));
  CFB.utils.cfb_add(c, `${name}/FDAT`, data);
};
function library(build: (c: WriteContainer) => void): File {
  const c = CFB.utils.cfb_new(); build(c);
  const data = CFB.write(c, { type: 'array' });
  return { name: 'Native.fpl', size: data.length, arrayBuffer: async () => data.slice().buffer } as File;
}
const logs = () => mocks.log.mock.calls.map(call => call[0]).join('\n');

beforeEach(() => {
  vi.clearAllMocks();
  mocks.image.mockResolvedValue({ texture: true });
  mocks.sound.mockResolvedValue({ duration: 1.25 });
  mocks.parseFPM.mockReturnValue({ name: 'MeshFromData', vertices: [0, 0, 0], indices: [0, 0, 0] });
});

it('dispatches FTYP members and passes FDAT payloads to decoders', async () => {
  const onLoaded = vi.fn();
  await parseFPLFile(library(c => {
    member(c, 'Tex', 1, new Uint8Array([1, 1]));
    member(c, 'Snd', 2, new Uint8Array([2, 2]));
    member(c, 'Mdl', 4, new Uint8Array([3, 3]));
    member(c, 'Fnt', 5, new Uint8Array([4, 4]));
    member(c, 'Scr', 6, new TextEncoder().encode('Sub Main\nEnd Sub'));
  }), onLoaded);

  expect(onLoaded).toHaveBeenCalledOnce();
  const lib = onLoaded.mock.calls[0][0];
  expect(Object.keys(lib.textureLibrary)).toEqual(['Tex']);
  expect(Object.keys(lib.soundLibrary)).toEqual(['Snd']);
  expect(Object.keys(lib.modelLibrary)).toEqual(['Mdl']);
  expect(Object.keys(lib.fontLibrary)).toEqual(['Fnt']);
  expect(Object.keys(lib.scriptLibrary)).toEqual(['Scr']);
  expect(lib.scriptLibrary.Scr).toContain('Sub Main');
  expect([...mocks.image.mock.calls[0][0]]).toEqual([1, 1]);
  expect([...mocks.sound.mock.calls[0][0]]).toEqual([2, 2]);
  expect([...mocks.parseFPM.mock.calls[0][0]]).toEqual([3, 3]);
  expect(mocks.registerModel).toHaveBeenCalledWith('MeshFromData', { mesh: true });
  expect(logs()).toContain('5 Member');
  expect(logs()).toContain('Textur-Member');
  expect(logs()).toContain('Sound-Member');
  expect(logs()).toContain('Script-Member');
});

it('keeps raw fonts and reports undecoded/unknown members without failing the load', async () => {
  const onLoaded = vi.fn();
  mocks.image.mockResolvedValue(null);
  mocks.sound.mockResolvedValue(null);
  await parseFPLFile(library(c => {
    member(c, 'Tex', 1, new Uint8Array([1]));
    member(c, 'Snd', 2, new Uint8Array([2]));
    member(c, 'Odd', 99, new Uint8Array([3]));
  }), onLoaded);
  const lib = onLoaded.mock.calls[0][0];
  expect(lib.textureLibrary).toEqual({});
  expect(lib.soundLibrary).toEqual({});
  expect(logs()).toContain('Inventar unvollständig');
  expect(logs()).toContain('3 FPL-Member nicht dekodiert');
});

it('warns when a member storage is malformed but still loads the rest', async () => {
  const onLoaded = vi.fn();
  await parseFPLFile(library(c => {
    CFB.utils.cfb_add(c, 'Broken/FTYP', u32(1));
    member(c, 'Snd', 2, new Uint8Array([9]));
  }), onLoaded);
  const lib = onLoaded.mock.calls[0][0];
  expect(Object.keys(lib.soundLibrary)).toEqual(['Snd']);
  expect(logs()).toContain('Inventar unvollständig');
  expect(logs()).toContain('missing-fdat');
});

it('keeps the filename-regex fallback for FPLs without member storages', async () => {
  const onLoaded = vi.fn();
  await parseFPLFile(library(c => {
    CFB.utils.cfb_add(c, 'Sound1', new Uint8Array([0x4f, 0x67, 0x67, 0x53]));
  }), onLoaded);
  const lib = onLoaded.mock.calls[0][0];
  expect(Object.keys(lib.soundLibrary)).toEqual(['Sound1']);
  expect(mocks.sound).toHaveBeenCalledOnce();
  expect(logs()).toContain('0 Member, 1 Root-Streams');
});
