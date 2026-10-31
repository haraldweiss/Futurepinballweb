import { describe, expect, it } from 'vitest';
import * as CFB from '../fpt/cfb-io';
import { readLibraryMembers, resolveLibraryMembers, type LibraryMemberInventory } from '../fpt/library-members';
import type { ExternalReference } from '../fpt/external-references';

const u32 = (value: number) => {
  const bytes = new Uint8Array(4);
  new DataView(bytes.buffer).setUint32(0, value, true);
  return bytes;
};

interface MemberSpec {
  name: string;
  type?: number;
  ftyp?: Uint8Array;
  data?: Uint8Array;
  sourcePath?: string;
  omitFtyp?: boolean;
  omitFdat?: boolean;
  duplicateStream?: boolean;
}

function containerWith(specs: MemberSpec[]) {
  const FileIndex: CFB.CFBEntry[] = [{ name: 'Root Entry', size: 0, type: 5, content: new Uint8Array(), sid: 0 }];
  const FullPaths = ['Root Entry'];
  const add = (owner: MemberSpec, name: string, type: number, content: Uint8Array) => {
    FileIndex.push({ name, size: content.length, type, content, sid: FileIndex.length });
    FullPaths.push(`Root Entry/${owner.name}/${name}`);
  };
  for (const spec of specs) {
    FileIndex.push({ name: spec.name, size: 0, type: 1, content: new Uint8Array(), sid: FileIndex.length });
    FullPaths.push(`Root Entry/${spec.name}`);
    if (!spec.omitFtyp) add(spec, 'FTYP', 2, spec.ftyp ?? u32(spec.type ?? 1));
    if (spec.duplicateStream) add(spec, 'FTYP', 2, spec.ftyp ?? u32(spec.type ?? 1));
    add(spec, 'FLAD', 2, new Uint8Array(8));
    if (spec.sourcePath !== undefined) add(spec, 'FPAT', 2, new TextEncoder().encode(spec.sourcePath));
    if (!spec.omitFdat) add(spec, 'FDAT', 2, spec.data ?? new Uint8Array([1, 2, 3]));
  }
  return { FileIndex, FullPaths };
}

function inventoryOf(specs: MemberSpec[]): LibraryMemberInventory {
  return readLibraryMembers(containerWith(specs));
}

function reference(memberPath: string, kind: ExternalReference['kind'] = 'image', libraryPath = 'Libraries/Native.fpl'): ExternalReference {
  return { streamPath: 'Resources/Image 1', recordOffset: 0, resourceName: 'Image',
    sourcePath: `D:\\lib\\${memberPath}`, libraryPath, memberPath, kind };
}

describe('readLibraryMembers', () => {
  it('reads all observed FTYP kinds with source paths and opaque payloads', () => {
    const tex = new Uint8Array([0x7a, 0x4c, 0x5a, 0x4f]);
    const sound = new Uint8Array([0x4f, 0x67, 0x67, 0x53]);
    const model = new Uint8Array([0xd0, 0xcf, 0x11, 0xe0]);
    const font = new Uint8Array([0x46, 0x50, 0x44, 0x4d]);
    const script = new Uint8Array([0x4f, 0x70, 0x74]);
    const report = inventoryOf([
      { name: 'tex', type: 1, data: tex, sourcePath: 'D:\\Future Pinball\\Textures\\tex.bmp' },
      { name: 'sound', type: 2, data: sound, sourcePath: 'D:\\Future Pinball\\Sounds\\sound.ogg' },
      { name: 'model', type: 4, data: model, sourcePath: 'C:\\Models\\model.fpm' },
      { name: 'font', type: 5, data: font, sourcePath: 'D:\\Fonts\\font.dmdf' },
      { name: 'script', type: 6, data: script, sourcePath: 'D:\\Scripts\\script.vbs' },
    ]);
    expect(report.coverage).toBe('complete-recognized-members');
    expect(report.issues).toEqual([]);
    expect(report.members.map(member => [member.name, member.kind, member.type])).toEqual([
      ['font', 'font', 5],
      ['model', 'model', 4],
      ['script', 'script', 6],
      ['sound', 'sound', 2],
      ['tex', 'image', 1],
    ]);
    expect(report.members.map(member => member.sourcePath)).toEqual([
      'D:\\Fonts\\font.dmdf', 'C:\\Models\\model.fpm', 'D:\\Scripts\\script.vbs',
      'D:\\Future Pinball\\Sounds\\sound.ogg', 'D:\\Future Pinball\\Textures\\tex.bmp',
    ]);
    expect(report.members.map(member => member.data)).toEqual([font, model, script, sound, tex]);
  });

  it('reads a real nested CFB round-trip without touching payload bytes', () => {
    const container = CFB.utils.cfb_new();
    CFB.utils.cfb_add(container, 'Bumper/FTYP', u32(4));
    CFB.utils.cfb_add(container, 'Bumper/FLAD', new Uint8Array(8));
    CFB.utils.cfb_add(container, 'Bumper/FPAT', new TextEncoder().encode('D:\\Models\\Bumper.fpm'));
    CFB.utils.cfb_add(container, 'Bumper/FDAT', new Uint8Array([0xd0, 0xcf, 0x11, 0xe0, 0x42]));
    const bytes = CFB.write(container, { type: 'array' });
    const before = bytes.slice();
    const report = readLibraryMembers(CFB.read(bytes, { type: 'array' }));
    expect(report.members).toHaveLength(1);
    expect(report.members[0].name).toBe('Bumper');
    expect(report.members[0].kind).toBe('model');
    expect([...report.members[0].data]).toEqual([0xd0, 0xcf, 0x11, 0xe0, 0x42]);
    expect(bytes).toEqual(before);
  });

  it('flags unsupported types but keeps the member for diagnostics', () => {
    const report = inventoryOf([{ name: 'odd', type: 99, data: new Uint8Array([9]) }]);
    expect(report.coverage).toBe('partial');
    expect(report.issues).toEqual([{ memberPath: 'Root Entry/odd', code: 'unsupported-type' }]);
    expect(report.members).toHaveLength(1);
    expect(report.members[0].kind).toBe('unknown');
    expect(report.members[0].type).toBe(99);
  });

  it('flags malformed members instead of silently skipping them', () => {
    const report = inventoryOf([
      { name: 'noftyp', omitFtyp: true, data: new Uint8Array([1]) },
      { name: 'nodata', type: 1, omitFdat: true },
      { name: 'short', ftyp: new Uint8Array([1, 0]), data: new Uint8Array([2]) },
      { name: 'valid', type: 1, data: new Uint8Array([3]) },
    ]);
    expect(report.coverage).toBe('partial');
    expect(report.issues).toEqual([
      { memberPath: 'Root Entry/nodata', code: 'missing-fdat' },
      { memberPath: 'Root Entry/noftyp', code: 'missing-ftyp' },
      { memberPath: 'Root Entry/short', code: 'malformed-member' },
    ]);
    expect(report.members.map(member => member.name)).toEqual(['valid']);
  });

  it('flags duplicate member names and duplicate child streams', () => {
    const report = inventoryOf([
      { name: 'Dup', type: 1 },
      { name: 'dup', type: 1 },
      { name: 'twice', type: 1, duplicateStream: true },
    ]);
    expect(report.coverage).toBe('partial');
    expect(report.issues).toEqual([
      { memberPath: 'Root Entry/Dup', code: 'duplicate-member' },
      { memberPath: 'Root Entry/dup', code: 'duplicate-member' },
      { memberPath: 'Root Entry/twice', code: 'malformed-member' },
    ]);
    expect(report.members).toHaveLength(3);
  });

  it('preserves an empty source path as null', () => {
    const report = inventoryOf([{ name: 'empty', type: 1, sourcePath: '' }]);
    expect(report.members[0].sourcePath).toBeNull();
  });
});

describe('resolveLibraryMembers', () => {
  const inventory = inventoryOf([
    { name: 'autoplunger', type: 1 },
    { name: 'ballrelease', type: 2 },
    { name: 'Foo', type: 1 },
    { name: 'Foo.bmp', type: 1 },
    { name: 'sound', type: 2 },
    { name: 'Ä', type: 1 },
  ]);

  it('matches extension-stripped names case-insensitively', () => {
    const references = [
      reference('AUTOPLUNGER.BMP', 'image'),
      reference('BallRelease.Ogg', 'sound'),
      reference('Ä', 'image'),
    ];
    const results = resolveLibraryMembers(references, [{ libraryPath: 'Libraries/Native.fpl', inventory }]);
    expect(results.map(result => result.status)).toEqual(['resolved-member', 'resolved-member', 'resolved-member']);
    expect(results[0].candidates[0].name).toBe('autoplunger');
  });

  it('does not fold non-ASCII names', () => {
    const results = resolveLibraryMembers([reference('ä.bmp', 'image')], [{ libraryPath: 'Libraries/Native.fpl', inventory }]);
    expect(results[0].status).toBe('missing-member');
  });

  it('reports exact/stem collisions as ambiguous with deterministic candidates', () => {
    const results = resolveLibraryMembers([reference('foo.BMP', 'image')], [{ libraryPath: 'Libraries/Native.fpl', inventory }]);
    expect(results[0].status).toBe('ambiguous-member');
    expect(results[0].candidates.map(member => member.name)).toEqual(['Foo', 'Foo.bmp']);
  });

  it('reports missing members, libraries and non-flat paths', () => {
    const results = resolveLibraryMembers([
      reference('absent.bmp'),
      reference('autoplunger.bmp', 'image', 'Libraries/Other.fpl'),
      reference('sub/autoplunger.bmp'),
      reference(''),
    ], [{ libraryPath: 'Libraries/Native.fpl', inventory }]);
    expect(results.map(result => result.status)).toEqual([
      'missing-member', 'missing-member', 'missing-member', 'missing-member',
    ]);
  });

  it('reports kind mismatches and unverified unknown members', () => {
    const odd = inventoryOf([{ name: 'odd', type: 99 }]);
    const results = resolveLibraryMembers([
      reference('sound.ogg', 'image'),
      reference('odd.bmp', 'image', 'Libraries/Odd.fpl'),
    ], [
      { libraryPath: 'Libraries/Native.fpl', inventory },
      { libraryPath: 'Libraries/Odd.fpl', inventory: odd },
    ]);
    expect(results[0].status).toBe('member-type-mismatch');
    expect(results[0].candidates[0].kind).toBe('sound');
    expect(results[1].status).toBe('member-type-mismatch');
    expect(results[1].candidates[0].kind).toBe('unknown');
  });

  it('preserves input order and rejects duplicate normalized library paths', () => {
    const refs = [reference('ballrelease.ogg', 'sound'), reference('autoplunger.bmp', 'image')];
    const results = resolveLibraryMembers(refs, [{ libraryPath: 'Libraries/Native.fpl', inventory }]);
    expect(results.map(result => result.reference)).toEqual(refs);
    expect(() => resolveLibraryMembers([], [
      { libraryPath: 'Libraries/Native.fpl', inventory },
      { libraryPath: 'libraries\\native.FPL', inventory },
    ])).toThrow(/Duplicate library inventory path/);
  });
});
