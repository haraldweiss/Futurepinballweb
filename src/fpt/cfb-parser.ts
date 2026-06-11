// SPDX-License-Identifier: AGPL-3.0-or-later
import * as CFB from 'cfb';
import type { CFB$Container } from 'cfb';
import { fptResources, fptRawBytes, resetFPTRawBytes } from '../game';
import { lzo1xDecompress } from './lzo';
import { extractImageFromBytes, extractSoundFromBytes } from './media';
import { logMsg } from './log';
import type { ResourceLoadingCallbacks } from './log';
import { tryExtractVBScriptFromData } from './strings';

function extractNullStrings(bytes: Uint8Array, minLen = 4): string[] {
  const out: string[] = []; let cur = '';
  for (let i = 0; i < bytes.length; i++) {
    const c = bytes[i];
    if (c >= 32 && c < 127) cur += String.fromCharCode(c);
    else { if (cur.length >= minLen) out.push(cur); cur = ''; }
  }
  return out;
}

function extractPascalStrings(bytes: Uint8Array): string[] {
  const view = new DataView(bytes.buffer);
  const out = new Set<string>();
  for (let i = 0; i < bytes.length - 3; i++) {
    for (const [prefix, len] of [[1, bytes[i]], [2, view.getUint16(i, true)]]) {
      const l = len as number;
      if (l < 3 || l > 80 || i + prefix + l >= bytes.length) continue;
      let s = '', ok = true;
      for (let j = 0; j < l; j++) {
        const c = bytes[i + (prefix as number) + j];
        if (c >= 32 && c < 127) s += String.fromCharCode(c); else { ok = false; break; }
      }
      if (ok && /^[A-Za-z0-9\s\-_'!.,:]+$/.test(s)) out.add(s.trim());
    }
  }
  return [...out];
}

export { extractNullStrings, extractPascalStrings };

function detectFPSignature(bytes: Uint8Array): string | null {
  if (bytes[0]===0x46&&bytes[1]===0x50&&bytes[2]===0x54) return 'FPT v1';
  if (bytes[0]===0x46&&bytes[1]===0x50)                   return 'FP/FPT';
  if (bytes[0]===0x46&&bytes[1]===0x55&&bytes[2]===0x54) return 'FUT';
  const head = String.fromCharCode(...(bytes.slice(0,512).filter(b=>b>=32&&b<127) as unknown as number[]));
  if (head.includes('FuturePinball')||head.includes('Future Pinball')) return 'FP (Text-Header)';
  if (head.includes('FPT')) return 'FPT (Partial)';
  return null;
}

function calcConfidence(sig: string|null, stringCount: number, coordCount: number, fileSize: number): number {
  let s = 0;
  if (sig)              s += 30;
  if (stringCount > 10) s += 20;
  if (stringCount > 30) s += 10;
  if (coordCount  > 3)  s += 20;
  if (coordCount  > 10) s += 10;
  if (fileSize > 50000) s += 10;
  return Math.min(s, 100);
}

export { detectFPSignature, calcConfidence };

export async function parseCFBResources(
  arrayBuffer: ArrayBuffer,
  callbacks?: ResourceLoadingCallbacks
): Promise<{ textureCount: number; soundCount: number; streamCount: number }> {
  fptResources.textures  = {};
  fptResources.sounds    = {};
  fptResources.playfield = null;
  fptResources.script    = null;
  fptResources.mapped    = { bumper: null, flipper: null, drain: null };
  delete fptResources.musicTrack;
  resetFPTRawBytes();

  let cfb: CFB$Container;
  try { cfb = CFB.read(new Uint8Array(arrayBuffer), { type: 'array' }); }
  catch(e: any) { logMsg(`CFB Parse-Fehler: ${  e.message}`, 'warn'); return { textureCount: 0, soundCount: 0, streamCount: 0 }; }

  const entries = (cfb.FileIndex || []).filter((e) => e.size > 0 && e.name && e.name !== 'Root Entry');
  logMsg(`📦 CFB-Streams gefunden: ${entries.length}`, entries.length > 0 ? 'ok' : 'warn');

  const streamTypes = new Map<string, number>();
  entries.forEach((e) => {
    const type = e.name?.includes('Image') || e.name?.includes('Texture') || e.name?.includes('Playfield') ? 'Image'
               : e.name?.includes('Sound') || e.name?.includes('Audio') || e.name?.includes('Music') ? 'Audio'
               : e.name?.includes('Script') || e.name?.includes('Code') ? 'Script'
               : 'Other';
    streamTypes.set(type, (streamTypes.get(type) ?? 0) + 1);
  });
  streamTypes.forEach((count, type) => {
    logMsg(`  • ${type}: ${count} stream${count>1?'s':''}`);
  });

  const textureEntries: Array<{ name: string; bytes: Uint8Array }> = [];
  const soundEntries: Array<{ name: string; bytes: Uint8Array }> = [];
  const scriptEntries: Array<{ name: string; bytes: Uint8Array }> = [];
  const otherEntries: Array<{ name: string; bytes: Uint8Array }> = [];

  for (const entry of entries) {
    const name: string = entry.name || '';
    const raw = entry.content;
    const bytes: Uint8Array = raw instanceof Uint8Array ? raw : new Uint8Array(raw as ArrayLike<number>);
    const nameL = name.toLowerCase();

    if (/script|code|vbs/i.test(nameL) || name === 'TableScript' || name === 'Script') {
      scriptEntries.push({ name, bytes });
    } else if (/image|texture|playfield|backdrop|translite/i.test(nameL)) {
      textureEntries.push({ name, bytes });
    } else if (/sound|music|sfx|wav|ogg|audio/i.test(nameL)) {
      soundEntries.push({ name, bytes });
    } else {
      otherEntries.push({ name, bytes });
    }
  }

  const startTime = performance.now();

  callbacks?.onPhaseStart?.('images');

  const textureDecodes = Promise.all(
    textureEntries.map(async (entry, idx) => {
      const tex = await extractImageFromBytes(entry.bytes);
      callbacks?.onResourceLoaded?.('image', entry.name, {
        current: idx + 1,
        total: textureEntries.length
      });
      return { name: entry.name, tex };
    })
  );

  callbacks?.onPhaseStart?.('audio');

  const soundDecodes = Promise.all(
    soundEntries.map(async (entry, idx) => {
      const buf = await extractSoundFromBytes(entry.bytes, {
        allowStreaming: true,
        maxUncompressedSize: 5 * 1024 * 1024
      });
      callbacks?.onResourceLoaded?.('audio', entry.name, {
        current: idx + 1,
        total: soundEntries.length
      });
      return { name: entry.name, buf, bytes: entry.bytes };
    })
  );

  const [textureResults, soundResults] = await Promise.all([textureDecodes, soundDecodes]);

  const imageTime = performance.now() - startTime;
  callbacks?.onPhaseComplete?.('images', imageTime);

  let largestTexSize = 0;
  for (const { name, tex } of textureResults) {
    if (tex) {
      fptResources.textures[name] = tex;
      const bytes = textureEntries.find(e => e.name === name)?.bytes;
      if (bytes) {
        fptRawBytes.textures[name] = bytes;
        logMsg(`  Textur: "${name}" (${(bytes.length/1024).toFixed(0)} KB)`, 'ok');
        if (bytes.length > largestTexSize) {
          largestTexSize = bytes.length;
          fptResources.playfield = tex;
        }
      }
    }
  }

  for (const { name, buf, bytes } of soundResults) {
    if (buf) {
      const isMusicTrack = buf instanceof AudioBuffer ? (buf.duration > 8) : name.toLowerCase().includes('music');
      const sizeKB = (bytes.length / 1024).toFixed(0);

      if (isMusicTrack) {
        if (!fptResources.musicTrack) fptResources.musicTrack = buf;
        fptRawBytes.sounds[name] = bytes;

        if (typeof buf === 'string') {
          logMsg(`  🎵 Musik (Streaming): "${name}" (${sizeKB} KB komprimiert)`, 'ok');
        } else {
          const durationSecs = buf.duration.toFixed(1);
          const uncompressedMB = ((buf.length * buf.numberOfChannels * 2) / (1024 * 1024)).toFixed(1);
          logMsg(`  🎵 Musik (PCM): "${name}" (${durationSecs}s, ${uncompressedMB}MB dekodiert)`, 'ok');
        }
      } else {
        fptResources.sounds[name] = buf;
        fptRawBytes.sounds[name] = bytes;

        if (typeof buf === 'string') {
          logMsg(`  🔊 Sound (Streaming): "${name}" (${sizeKB} KB komprimiert)`, 'ok');
        } else {
          const durationSecs = buf.duration.toFixed(2);
          logMsg(`  🔊 Sound (PCM): "${name}" (${durationSecs}s)`, 'ok');
        }
      }
    }
  }

  const audioTime = performance.now() - imageTime - startTime;
  callbacks?.onPhaseComplete?.('audio', audioTime);

  if (!fptResources.script) {
    for (const { name, bytes } of scriptEntries) {
      try {
        const text = new TextDecoder('utf-8', { fatal: false }).decode(bytes);
        if (/\bSub\s+\w+/i.test(text) && /\bEnd\s+Sub\b/i.test(text)) {
          fptResources.script = text;
          fptRawBytes.scriptOriginal = text;
          logMsg(`  Script: "${name}" (${text.split('\n').length} Zeilen VBScript)`, 'ok');
          break;
        }
      } catch { void 0; }
    }
  }

  if (!fptResources.script) {
    for (const entry of entries) {
      if (entry.size < 50 || entry.size > 2*1024*1024) continue;
      try {
        const rawContent = entry.content;
        const content = rawContent instanceof Uint8Array ? rawContent : new Uint8Array(rawContent);
        const text = new TextDecoder('utf-8', { fatal: false }).decode(content.slice(0, 8192));
        if (/\bSub\s+\w+.*?\bEnd\s+Sub\b/is.test(text)) {
          const fullText = new TextDecoder('utf-8', { fatal: false }).decode(content);
          fptResources.script = fullText;
          fptRawBytes.scriptOriginal = fullText;
          logMsg(`  Script (heuristisch): "${entry.name || '?'}"`, 'ok');
          break;
        }
      } catch { void 0; }
    }
  }

  if (!fptResources.script) {
    for (const entry of entries) {
      if (entry.size < 1000 || entry.size > 10*1024*1024) continue;
      const bytes = entry.content as Uint8Array;

      for (let i = 0; i < bytes.length - 4; i++) {
        if (bytes[i] === 0x7A && bytes[i+1] === 0x4C && bytes[i+2] === 0x5A && bytes[i+3] === 0x4F) {
          try {
            const decompressed = lzo1xDecompress(bytes.slice(i + 4));
            if (decompressed && decompressed.length > 100) {
              const text = tryExtractVBScriptFromData(decompressed);
              if (text) {
                fptResources.script = text;
                fptRawBytes.scriptOriginal = text;
                logMsg(`  Script (LZO): "${entry.name}" @ offset ${i} (${text.length} chars)`, 'ok');
                break;
              }
            }
          } catch { void 0; }
        }
        if (fptResources.script) break;
      }
      if (fptResources.script) break;
    }
  }

  for (const { name, bytes } of otherEntries) {
    fptRawBytes.otherStreams.push({ name, data: bytes });
  }

  const elapsedMs = performance.now() - startTime;
  logMsg(`⏱️ Phase 1 Parallel Loading: ${elapsedMs.toFixed(0)}ms (Textures: ${textureResults.length}, Sounds: ${soundResults.length})`, 'ok');

  return {
    textureCount: Object.keys(fptResources.textures).length,
    soundCount:   Object.keys(fptResources.sounds).length,
    streamCount: entries.length,
  };
}
