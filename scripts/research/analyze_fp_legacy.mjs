// FPT-Datei-Analyse: was steckt wirklich in den CFB-Streams?
// Hintergrund: docs/fpt/HANDOFF_FP1X_LEGACY_FORMAT.md
// Usage:  node scripts/research/analyze_fp_legacy.mjs <pfad/zur/datei.fpt>
//
// Zeigt:
//   - Magic-Byte-Verteilung der Streams (was sie WIRKLICH sind)
//   - Klassifizierung wie unser aktueller Parser sie sieht
//   - Fehlklassifizierungen (Streams die als Bild/Sound markiert sind, aber kein Magic haben)
//   - Top-Streams nach Größe
//   - Stream-Namen gruppiert nach Magic

import CFB from '../../node_modules/cfb/cfb.js';
import { readFileSync } from 'node:fs';

const path = process.argv[2];
if (!path) { console.error('usage: node analyze_fp_legacy.mjs <file.fpt>'); process.exit(1); }
const buf = readFileSync(path);
const cfb = CFB.read(new Uint8Array(buf), { type: 'array' });

const entries = (cfb.FileIndex || []).filter(e => e.size > 0 && e.name && e.name !== 'Root Entry');

function detectMagic(bytes) {
  if (!bytes || bytes.length < 4) return 'EMPTY';
  const b = bytes;
  if (b[0]===0x89 && b[1]===0x50 && b[2]===0x4E && b[3]===0x47) return 'PNG';
  if (b[0]===0xFF && b[1]===0xD8 && b[2]===0xFF) return 'JPEG';
  if (b[0]===0x42 && b[1]===0x4D) return 'BMP';
  if (b[0]===0x47 && b[1]===0x49 && b[2]===0x46) return 'GIF';
  if (b[0]===0x52 && b[1]===0x49 && b[2]===0x46 && b[3]===0x46) return 'RIFF(WAV/etc.)';
  if (b[0]===0x4F && b[1]===0x67 && b[2]===0x67 && b[3]===0x53) return 'OGG';
  if (b[0]===0xFF && (b[1] & 0xE0)===0xE0) return 'MP3?';
  if (b[0]===0x49 && b[1]===0x44 && b[2]===0x33) return 'MP3(ID3)';
  if (b[0]===0x7A && b[1]===0x4C && b[2]===0x5A && b[3]===0x4F) return 'zLZO';
  if (b[0]===0x4D && b[1]===0x53 && b[2]===0x33 && b[3]===0x44) return 'MS3D';
  let asciiCount = 0;
  for (let i=0;i<Math.min(64,b.length);i++) if (b[i]>=32 && b[i]<127 || b[i]===9 || b[i]===10 || b[i]===13) asciiCount++;
  if (asciiCount/Math.min(64,b.length) > 0.85) return 'TEXT?';
  return 'binary';
}

// Klassifizierung wie unser Parser (Regex aus src/fpt-parser.ts Zeile ~96)
function classify(name) {
  const n = name.toLowerCase();
  if (/script|code|vbs/i.test(n) || name==='TableScript' || name==='Script') return 'script';
  if (/image|texture|playfield|table|backdrop|translite/i.test(n)) return 'TEXTURE';
  if (/sound|music|sfx|wav|ogg|audio/i.test(n)) return 'SOUND';
  return 'other';
}

const byMagic = new Map();
const byClass = new Map();
const misclassified = [];
const top = [];

for (const e of entries) {
  const bytes = e.content instanceof Uint8Array ? e.content : new Uint8Array(e.content);
  const magic = detectMagic(bytes);
  const klass = classify(e.name);
  byMagic.set(magic, (byMagic.get(magic)||0)+1);
  byClass.set(klass, (byClass.get(klass)||0)+1);

  if (klass==='TEXTURE' && !['PNG','JPEG','BMP','GIF'].includes(magic)) {
    misclassified.push({ name: e.name, size: e.size, magic });
  }
  if (klass==='SOUND' && !['RIFF(WAV/etc.)','OGG','MP3?','MP3(ID3)'].includes(magic)) {
    misclassified.push({ name: e.name, size: e.size, magic });
  }
  top.push({ name: e.name, size: e.size, magic, klass });
}

console.log('═══ CFB-Analyse: ' + path.split('/').pop() + ' ═══');
console.log('Streams gesamt: ' + entries.length);
console.log();
console.log('━━ Magic-Bytes-Verteilung (was Streams WIRKLICH sind):');
[...byMagic.entries()].sort((a,b)=>b[1]-a[1]).forEach(([m,c]) => console.log(`  ${String(c).padStart(5)}  ${m}`));
console.log();
console.log('━━ Parser-Klassifizierung (was unser Code DENKT):');
[...byClass.entries()].sort((a,b)=>b[1]-a[1]).forEach(([k,c]) => console.log(`  ${String(c).padStart(5)}  ${k}`));
console.log();
console.log('━━ Fehlklassifizierungen (als Bild/Sound markiert, aber kein passendes Magic):');
console.log('  Anzahl: ' + misclassified.length);
misclassified.slice(0,15).forEach(x => console.log(`  ${x.name.padEnd(40)}  ${String(x.size).padStart(8)}b  magic=${x.magic}`));
if (misclassified.length > 15) console.log(`  ...und ${misclassified.length-15} weitere`);
console.log();
console.log('━━ Top-20-Streams nach Größe:');
top.sort((a,b)=>b.size-a.size).slice(0,20).forEach(x =>
  console.log(`  ${String(x.size).padStart(8)}b  [${x.klass.padEnd(7)}/${x.magic.padEnd(15)}]  ${x.name}`)
);
