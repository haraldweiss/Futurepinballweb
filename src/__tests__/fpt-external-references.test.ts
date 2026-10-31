import { describe, expect, it } from 'vitest';
import { readExternalReferences } from '../fpt/external-references';
import type { CFBContainer } from '../fpt/cfb-io';
const old = [0xbab2beb2, 0xb7abbeb0, 0xbdbbb1bb];
const newer = [0xa4f4d1d7, 0xa1edd1d5, 0xa7fdc4e0];
const join = (...parts: Uint8Array[]) => new Uint8Array(parts.flatMap(p => [...p]));
function u32(n: number) { const b = new Uint8Array(4); new DataView(b.buffer).setUint32(0,n,true); return b; }
const str = (s: string) => join(u32(s.length), Uint8Array.from([...s].map(c=>c.charCodeAt(0))));
const tlv = (tag: number, value = new Uint8Array()) => join(u32(4+value.length), u32(tag), value);
const record = (tags = newer, path = 'Libraries\\Mixed.FPL\\Member', name = 'Ball') => join(tlv(tags[0],str(name)),tlv(tags[1],str(path)),tlv(tags[2]));
function container(bytes: Uint8Array, leaf='PinModel 12'): CFBContainer { return { FullPaths: [`Root/Resources/${leaf}`], FileIndex: [{ name: leaf, type:2, size:bytes.length, content:bytes, sid:0 }] }; }
describe('native external references', () => {
  it.each([
    ['Image 1', 'image'], ['Sound2', 'sound'], ['PinModel 3', 'model'],
    ['DmdFont4', 'font'], ['Script 5', 'script'],
  ])('classifies recognized stream %s', (leaf, kind) => {
    expect(readExternalReferences(container(record(), leaf)).references[0]?.kind).toBe(kind);
  });
  it.each([old,newer])('decodes observed tags without TYPE, payload or script (%j)', (...tags) => {
    const bytes = join(tlv(123,str('ignored.fpl/x')),record(tags));
    const before=bytes.slice(); const report=readExternalReferences(container(bytes));
    expect(report).toEqual({references:[{streamPath:'Root/Resources/PinModel 12',recordOffset:tlv(123,str('ignored.fpl/x')).length,resourceName:'Ball',sourcePath:'Libraries\\Mixed.FPL\\Member',libraryPath:'Libraries\\Mixed.FPL',memberPath:'Member',kind:'model'}],issues:[],coverage:'complete-recognized-records'});
    expect(bytes).toEqual(before);
  });
  it('walks multiple records and respects subarray offsets and exact ends',()=>{
    const raw=join(new Uint8Array(7),record(),record(old,'fp.fpl/a','Other'),new Uint8Array(5));
    expect(readExternalReferences(container(raw.subarray(7,raw.length-5))).references.map(r=>r.resourceName)).toEqual(['Ball','Other']);
  });
  it('ignores unknown stream families and non-path strings',()=>{
    expect(readExternalReferences(container(record(),'Unknown1')).references).toEqual([]);
    expect(readExternalReferences(container(join(tlv(newer[0],str('fake.fpl/a')),tlv(newer[2])))).references).toEqual([]);
  });
  it.each([join(u32(20),u32(123)),new Uint8Array([4,0]),join(tlv(newer[0],str('X')),tlv(newer[1],join(u32(100),new Uint8Array([65]))),tlv(newer[2]))])('bounds malformed TLVs and strings',bytes=>{
    const report=readExternalReferences(container(bytes)); expect(report.coverage).toBe('partial'); expect(report.issues.some(i=>i.code==='malformed-record')).toBe(true); expect(report.references).toEqual([]);
  });
  it('flags unsupported bytes without replacing them',()=>{
    const report=readExternalReferences(container(record(newer,'fp.fpl/é'))); expect(report.references).toEqual([]); expect(report.issues.some(i=>i.code==='unsupported-encoding')).toBe(true);
  });
  it.each([join(tlv(newer[0],str('A')),record()),join(tlv(newer[0],str('A')),tlv(newer[1],str('a.fpl/b')),tlv(newer[1],str('a.fpl/c')),tlv(newer[2])),join(tlv(newer[0],str('A')),tlv(newer[1],str('a.fpl/b')))])('rejects duplicate or unterminated records',bytes=>{
    const report=readExternalReferences(container(bytes)); expect(report.coverage).toBe('partial'); expect(report.references).toEqual([]);
  });
  it.each(['.fpl/member','a.fpl/','prefix.fpl.txt/member','words a.fpl member'])('requires library and member boundaries: %s',path=>{ expect(readExternalReferences(container(record(newer,path))).references).toEqual([]); });
});

it('reports an empty external library stem as incomplete', () => {
  expect(readExternalReferences(container(record(newer, '.fpl/member')))).toEqual({
    references: [], coverage: 'partial',
    issues: [{ streamPath: 'Root/Resources/PinModel 12', offset: 0, code: 'incomplete-reference' }],
  });
});
it('keeps legitimate embedded source paths complete', () => {
  expect(readExternalReferences(container(record(newer, 'embedded.bmp')))).toEqual({
    references: [], issues: [], coverage: 'complete-recognized-records',
  });
});
