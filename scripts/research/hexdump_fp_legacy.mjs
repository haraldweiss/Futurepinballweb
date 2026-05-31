// Hex-Dump ausgewählter Streams aus einer FPT-Datei + Suche nach eingebetteten Magics.
// Hintergrund: docs/fpt/HANDOFF_FP1X_LEGACY_FORMAT.md
// Usage:  node scripts/research/hexdump_fp_legacy.mjs <file.fpt> [stream1] [stream2] ...
//         (ohne Stream-Namen: Default-Auswahl wird gedumpt)

import CFB from '../../node_modules/cfb/cfb.js';
import { readFileSync } from 'node:fs';

const path = process.argv[2];
if (!path) { console.error('usage: node hexdump_fp_legacy.mjs <file.fpt> [streamNames...]'); process.exit(1); }
const customStreams = process.argv.slice(3);

const buf = readFileSync(path);
const cfb = CFB.read(new Uint8Array(buf), { type: 'array' });
const entries = (cfb.FileIndex || []).filter(e => e.size > 0 && e.name && e.name !== 'Root Entry');

function findEntry(name) { return entries.find(e => e.name === name); }
function hex(bytes, n=96) {
  const out = [];
  for (let i=0; i<Math.min(n,bytes.length); i+=16) {
    const row = [];
    const ascii = [];
    for (let j=0; j<16 && i+j<bytes.length; j++) {
      const b = bytes[i+j];
      row.push(b.toString(16).padStart(2,'0'));
      ascii.push(b>=32 && b<127 ? String.fromCharCode(b) : '.');
    }
    out.push(`  ${row.join(' ').padEnd(48)}  ${ascii.join('')}`);
  }
  return out.join('\n');
}

const samples = customStreams.length > 0
  ? customStreams
  : ['Image 1', 'Image 17', 'Music 1', 'Sound 1', 'Table Data', 'Table Element 1', 'Table Element 4'];

for (const name of samples) {
  const e = findEntry(name);
  if (!e) { console.log(`(nicht gefunden: ${name})`); continue; }
  const bytes = e.content instanceof Uint8Array ? e.content : new Uint8Array(e.content);
  console.log(`\n━━ ${name}  (${e.size} bytes) ━━`);
  console.log(hex(bytes, 96));
  // Suche nach bekannten Magic-Bytes irgendwo in den ersten 1024
  const head = bytes.slice(0, 1024);
  const sigs = [
    { tag: 'PNG', sig: [0x89,0x50,0x4E,0x47] },
    { tag: 'JPEG', sig: [0xFF,0xD8,0xFF] },
    { tag: 'BMP', sig: [0x42,0x4D] },
    { tag: 'RIFF', sig: [0x52,0x49,0x46,0x46] },
    { tag: 'OGG', sig: [0x4F,0x67,0x67,0x53] },
    { tag: 'ID3', sig: [0x49,0x44,0x33] },
    { tag: 'zLZO', sig: [0x7A,0x4C,0x5A,0x4F] },
  ];
  const found = [];
  for (let i=0; i<head.length-4; i++) {
    for (const s of sigs) {
      if (s.sig.every((b,k) => head[i+k] === b)) found.push(`${s.tag}@${i}`);
    }
  }
  if (found.length) console.log(`  → eingebettete Signaturen: ${found.join(', ')}`);
}
