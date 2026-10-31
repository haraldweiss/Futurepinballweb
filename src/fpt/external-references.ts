// SPDX-License-Identifier: AGPL-3.0-or-later
// © 2026 Harald Weiss
import type { CFBContainer } from './cfb-io';

export interface ExternalReference {
  streamPath: string;
  recordOffset: number;
  resourceName: string;
  sourcePath: string;
  libraryPath: string;
  memberPath: string;
  kind: 'image' | 'sound' | 'model' | 'font' | 'script' | 'unknown';
}
export interface ExternalReferenceReport {
  references: ExternalReference[];
  issues: Array<{ streamPath: string; offset: number; code: 'malformed-record' | 'unsupported-encoding' | 'incomplete-reference' }>;
  coverage: 'complete-recognized-records' | 'partial';
}
const families = [
  { name: 0xbab2beb2, path: 0xb7abbeb0, end: 0xbdbbb1bb },
  { name: 0xa4f4d1d7, path: 0xa1edd1d5, end: 0xa7fdc4e0 },
];
const kinds: Record<string, ExternalReference['kind']> = {
  Image: 'image', Sound: 'sound', PinModel: 'model', DmdFont: 'font', Script: 'script',
};

/** Decode recognized native resource records only; unknown stream families are outside coverage. */
export function readExternalReferences(container: CFBContainer): ExternalReferenceReport {
  const report: ExternalReferenceReport = { references: [], issues: [], coverage: 'complete-recognized-records' };
  container.FileIndex.forEach((entry, index) => {
    if (entry.type !== 2) return;
    const streamPath = container.FullPaths[index];
    const leaf = streamPath?.split('/').pop() ?? entry.name;
    const match = /^(Image|Sound|PinModel|DmdFont|Script) ?[0-9]+$/.exec(leaf);
    if (!match) return;
    const bytes = entry.content;
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    let start = 0;
    let name: string | undefined;
    let path: string | undefined;
    let seenName = false;
    let seenPath = false;
    let invalid = false;
    let active = false;
    let family: typeof families[number] | undefined;
    const issue = (offset: number, code: ExternalReferenceReport['issues'][number]['code']) => {
      report.issues.push({ streamPath, offset, code });
      report.coverage = 'partial';
      invalid = true;
    };
    for (let offset = 0; offset < bytes.length;) {
      if (bytes.length - offset < 8) { issue(offset, 'malformed-record'); break; }
      const length = view.getUint32(offset, true);
      if (length < 4 || length > bytes.length - offset - 4) { issue(offset, 'malformed-record'); break; }
      const end = offset + 4 + length;
      const tag = view.getUint32(offset + 4, true);
      const recognized = families.find(candidate => candidate.name === tag || candidate.path === tag || candidate.end === tag);
      if (recognized) {
        if (!active) { start = offset; active = true; family = recognized; }
        if (family !== recognized) issue(offset, 'malformed-record');
        if (tag === recognized.end) {
          if (length !== 4) issue(offset, 'malformed-record');
          if (seenPath && (!name || !path)) issue(start, 'incomplete-reference');
          if (!invalid && name && path) {
            // Split only at a complete .fpl path component. Preserve source spelling.
            const components = path.split(/[\\/]/);
            const libraryIndex = components.findIndex(component => component.length > 4 && component.toLowerCase().endsWith('.fpl'));
            if (libraryIndex >= 0) {
              const boundary = components.slice(0, libraryIndex + 1).reduce((sum, component) => sum + component.length + 1, -1);
              const memberPath = path.slice(boundary + 1);
              if (memberPath && components.slice(libraryIndex + 1).every(Boolean)) {
                report.references.push({ streamPath, recordOffset: start, resourceName: name, sourcePath: path,
                  libraryPath: path.slice(0, boundary), memberPath, kind: kinds[match[1]] });
              } else issue(start, 'incomplete-reference');
            }
          }
          name = path = undefined; seenName = seenPath = active = invalid = false; family = undefined;
        } else {
          const isName = tag === recognized.name;
          if (isName ? seenName : seenPath) issue(offset, 'malformed-record');
          if (isName) seenName = true; else seenPath = true;
          const valueOffset = offset + 8;
          if (end - valueOffset < 4 || view.getUint32(valueOffset, true) !== end - valueOffset - 4) issue(offset, 'malformed-record');
          else {
            const value = bytes.subarray(valueOffset + 4, end);
            if (value.some(byte => byte > 0x7f || byte === 0)) issue(offset, 'unsupported-encoding');
            else {
              let text = '';
              for (const byte of value) text += String.fromCharCode(byte);
              if (isName) name = text; else path = text;
            }
          }
        }
      }
      offset = end;
    }
    if (active) issue(start, 'incomplete-reference');
  });
  return report;
}
