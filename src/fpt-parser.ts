// SPDX-License-Identifier: AGPL-3.0-or-later
// © 2026 Harald Weiss
/**
 * fpt-parser.ts — CFB/OLE2 Ressourcen-Extraktion + FPT Heuristik-Parser
 */
import * as THREE from 'three';
import * as CFB from 'cfb';
import { fptResources, fptRawBytes, resetFPTRawBytes, globalAssetCatalog, setGlobalAssetCatalog } from './game';
import { AssetCatalog } from './assets/asset-catalog';
import { getAudioCtx, playFPTMusic } from './audio-system';
import { runFPScript } from './script-engine';
import { lzo1xDecompress, tryLZOExtract } from './fpt/lzo';
import {
  detectImageMime, detectAudioMime,
  bytesToTexture, scanForImageMagic, extractImageFromBytes,
  extractSoundFromBytes,
} from './fpt/media';
import { extractTableCoordsFromCFB } from './fpt/table-elements';
import { logMsg } from './fpt/log';
import type { ResourceLoadingCallbacks } from './fpt/log';
import { getBackglassArtwork } from './fpt/backglass';
import { suggestTableLights, extractDominantColors, extractElementColors, getLightConfigFromColor } from './fpt/lighting';

export { logMsg };
export type { ResourceLoadingCallbacks };
export { getBackglassArtwork };
export { suggestTableLights, extractDominantColors, extractElementColors };
import { getLibraryByName, detectLibraryDependencies, getMissingLibraries, formatLibraryDependencies, mergeLibraries, type LibraryDependency } from './fpt/library';
export { getLibraryByName, detectLibraryDependencies, getMissingLibraries, formatLibraryDependencies, mergeLibraries, type LibraryDependency };

// ─── Media extraction in fpt/media.ts ────────────────────────────────────────

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

  let cfb: any;
  try { cfb = (CFB as any).read(new Uint8Array(arrayBuffer), { type: 'array' }); }
  catch(e: any) { logMsg(`CFB Parse-Fehler: ${  e.message}`, 'warn'); return { textureCount: 0, soundCount: 0, streamCount: 0 }; }

  // The cfb library (v1.2.2) does not always populate `e.t` — for FPT files
  // every entry comes back with `t === undefined`. Previously we filtered for
  // `t === 2 && size > 0`, which silently dropped EVERY stream and left the
  // parser thinking the file was empty (textures, sounds, models all unloaded).
  // Trust `size > 0` and exclude the root storage by name instead — streams
  // have a payload, the root storage entry never carries one we want to read.
  const entries = ((cfb.FileIndex as any[]) || []).filter((e: any) => e.size > 0 && e.name && e.name !== 'Root Entry');
  logMsg(`📦 CFB-Streams gefunden: ${entries.length}`, entries.length > 0 ? 'ok' : 'warn');

  // Enhanced: Zeige Stream-Overview
  const streamTypes = new Map<string, number>();
  entries.forEach((e: any) => {
    const type = e.name?.includes('Image') || e.name?.includes('Texture') || e.name?.includes('Playfield') ? 'Image'
               : e.name?.includes('Sound') || e.name?.includes('Audio') || e.name?.includes('Music') ? 'Audio'
               : e.name?.includes('Script') || e.name?.includes('Code') ? 'Script'
               : 'Other';
    streamTypes.set(type, (streamTypes.get(type) ?? 0) + 1);
  });
  streamTypes.forEach((count, type) => {
    logMsg(`  • ${type}: ${count} stream${count>1?'s':''}`);
  });

  // ─── Phase 1A: Separate streams by type for parallel processing ───
  const textureEntries: Array<{ name: string; bytes: Uint8Array }> = [];
  const soundEntries: Array<{ name: string; bytes: Uint8Array }> = [];
  const scriptEntries: Array<{ name: string; bytes: Uint8Array }> = [];
  const otherEntries: Array<{ name: string; bytes: Uint8Array }> = [];

  for (const entry of entries) {
    const name: string = entry.name || '';
    // cfb library returns `entry.content` as plain Array<number> when
    // `type: 'array'` is used. Code below uses `bytes.buffer` for DataView /
    // LZO / typed-array ops which throws on plain arrays. Normalize to Uint8Array.
    const raw = entry.content;
    const bytes: Uint8Array = raw instanceof Uint8Array ? raw : new Uint8Array(raw as ArrayLike<number>);
    const nameL = name.toLowerCase();

    // Classify entry
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

  // ─── Phase 1B: Parallel decoding by type using Promise.all() ───
  const startTime = performance.now();

  // Phase 2: Notify phase start
  callbacks?.onPhaseStart?.('images');

  // Decode all textures in parallel
  const textureDecodes = Promise.all(
    textureEntries.map(async (entry, idx) => {
      const tex = await extractImageFromBytes(entry.bytes);
      // Phase 2: Notify resource loaded
      callbacks?.onResourceLoaded?.('image', entry.name, {
        current: idx + 1,
        total: textureEntries.length
      });
      return { name: entry.name, tex };
    })
  );

  // Notify audio phase start
  callbacks?.onPhaseStart?.('audio');

  // Decode all sounds in parallel
  // Phase 3: Pass options to enable streaming for large files
  const soundDecodes = Promise.all(
    soundEntries.map(async (entry, idx) => {
      // Phase 3: Allow streaming for files >1MB, cap decode at 5MB
      const buf = await extractSoundFromBytes(entry.bytes, {
        allowStreaming: true,
        maxUncompressedSize: 5 * 1024 * 1024  // 5MB
      });
      // Phase 2: Notify resource loaded
      callbacks?.onResourceLoaded?.('audio', entry.name, {
        current: idx + 1,
        total: soundEntries.length
      });
      return { name: entry.name, buf, bytes: entry.bytes };
    })
  );

  // Wait for both texture and sound decoding to complete
  const [textureResults, soundResults] = await Promise.all([textureDecodes, soundDecodes]);

  // Phase 2: Notify phases complete
  const imageTime = performance.now() - startTime;
  callbacks?.onPhaseComplete?.('images', imageTime);

  // Process decoded textures
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

  // Process decoded sounds
  // Phase 3: Handle both AudioBuffer and Blob URL (streaming)
  for (const { name, buf, bytes } of soundResults) {
    if (buf) {
      const isMusicTrack = buf instanceof AudioBuffer ? (buf.duration > 8) : name.toLowerCase().includes('music');
      const sizeKB = (bytes.length / 1024).toFixed(0);

      if (isMusicTrack) {
        if (!fptResources.musicTrack) fptResources.musicTrack = buf;
        fptRawBytes.sounds[name] = bytes;

        // Phase 3: Log streaming status
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

        // Phase 3: Log streaming status
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

  // ─── Phase 1C: Sequential non-critical resources (VBScript, models, animations) ───

  // Script extraction (usually only 1 script)
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
      } catch { /* ignore */ void 0; }
    }
  }

  // Script-Fallback 1: Search all streams for VBScript patterns
  if (!fptResources.script) {
    for (const entry of entries) {
      if (entry.size < 50 || entry.size > 2*1024*1024) continue;
      try {
        const text = new TextDecoder('utf-8', { fatal: false }).decode((entry.content as Uint8Array).slice(0, 8192));
        if (/\bSub\s+\w+.*?\bEnd\s+Sub\b/is.test(text)) {
          const fullText = new TextDecoder('utf-8', { fatal: false }).decode(entry.content);
          fptResources.script = fullText;
          fptRawBytes.scriptOriginal = fullText;
          logMsg(`  Script (heuristisch): "${entry.name || '?'}"`, 'ok');
          break;
        }
      } catch { /* ignore */ void 0; }
    }
  }

  // Script-Fallback 2: Search for LZO-compressed VBScript in large streams
  if (!fptResources.script) {
    for (const entry of entries) {
      if (entry.size < 1000 || entry.size > 10*1024*1024) continue;
      const bytes = entry.content as Uint8Array;

      // Look for zLZO markers and try to extract
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
          } catch { /* ignore */ void 0; }
        }
        if (fptResources.script) break;
      }
      if (fptResources.script) break;
    }
  }

  // Stash unknown streams for lossless write-back
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

export function mapFPTSounds(sounds: Record<string, AudioBuffer>): void {
  const names = Object.keys(sounds);
  const find  = (p: RegExp) => names.find(n => p.test(n));
  const bk = find(/bump|pop|kick|hit|knock/i);
  const fk = find(/flip|solenoid|arm|coil/i);
  const dk = find(/drain|ball.?lost|out|gutter/i);
  if (bk) { fptResources.mapped.bumper  = sounds[bk]; logMsg(`  Bumper-Sound: "${bk}"`, 'ok'); }
  if (fk) { fptResources.mapped.flipper = sounds[fk]; logMsg(`  Flipper-Sound: "${fk}"`, 'ok'); }
  if (dk) { fptResources.mapped.drain   = sounds[dk]; logMsg(`  Drain-Sound: "${dk}"`, 'ok'); }
  if (!fptResources.mapped.bumper  && names[0]) fptResources.mapped.bumper  = sounds[names[0]];
  if (!fptResources.mapped.flipper && names[1]) fptResources.mapped.flipper = sounds[names[1]];

  // Phase 2: auto-classify long sounds as music tracks.
  // Threshold matches the primary classifier in parseCFBResources (8s)
  // to avoid promoting a long SFX to music.
  if (!fptResources.musicTrack) {
    for (const [, buf] of Object.entries(sounds)) {
      if (typeof buf === 'string') continue;
      const duration = (buf as AudioBuffer).duration;
      if (typeof duration === 'number' && duration > 8) {
        fptResources.musicTrack = buf;
        break;
      }
    }
  }
}

/**
 * Mirror current fptResources content into globalAssetCatalog.
 * Lazily creates a catalog if one does not yet exist.
 * Idempotent — safe to call multiple times.
 */
export function populateCatalogFromFPTResources(): void {
  let cat = globalAssetCatalog();
  if (!cat) {
    cat = new AssetCatalog();
    setGlobalAssetCatalog(cat);
  }

  // Reset catalog to match current fptResources state — each call replaces, not appends
  cat.clear();

  // Textures
  for (const [name, tex] of Object.entries(fptResources.textures)) {
    cat.registerTexture(name, tex);
  }
  if (fptResources.playfield) {
    cat.registerTexture('playfield', fptResources.playfield);
  }

  // Models
  if (fptResources.models) {
    for (const [name, mesh] of fptResources.models.entries()) {
      if (mesh) cat.registerModel(name, mesh);
    }
  }

  // Sounds — only AudioBuffer entries, skip Blob URL strings
  for (const [name, snd] of Object.entries(fptResources.sounds)) {
    if (typeof snd !== 'string') {
      cat.registerSound(name, snd);
    }
  }
}

// ─── Heuristischer Parser ─────────────────────────────────────────────────────
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
  const out  = new Set<string>();
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

// ─── Extract VBScript from decompressed data (with embedded extraction) ────────
function tryExtractVBScriptFromData(bytes: Uint8Array): string | null {
  // Try direct decode with multiple encodings
  for (const encoding of ['utf-8', 'utf-16le', 'iso-8859-1'] as const) {
    try {
      let text: string;
      if (encoding === 'utf-16le') {
        text = new TextDecoder('utf-16le', { fatal: false }).decode(bytes);
      } else {
        text = new TextDecoder(encoding, { fatal: false }).decode(bytes);
      }

      // Check for VBScript patterns
      const subMatches = text.match(/\bSub\s+\w+/gi) || [];
      const funcMatches = text.match(/\bFunction\s+\w+/gi) || [];
      const dimMatches = text.match(/\bDim\s+\w+/gi) || [];

      if (subMatches.length > 0 || funcMatches.length > 0 || dimMatches.length > 5) {
        return text;
      }
    } catch (e) { console.debug('[fpt-parser] Encoding retry:', (e || 'unknown')); /* try next encoding */ }
  }

  // Fallback: extract ASCII strings and concatenate to find VBScript
  try {
    let curStr = '';
    let allText = '';
    for (let i = 0; i < bytes.length; i++) {
      const c = bytes[i];
      if (c >= 32 && c < 127) {
        curStr += String.fromCharCode(c);
      } else if (c === 10 || c === 13) {
        if (curStr.length > 0) allText += `${curStr  }\n`;
        curStr = '';
      } else {
        if (curStr.length > 3) allText += `${curStr  } `;
        curStr = '';
      }
    }

    if ((allText.match(/\bSub\s+\w+/gi) || []).length > 0 ||
        (allText.match(/\bFunction\s+\w+/gi) || []).length > 0 ||
        (allText.match(/\bDim\s+\w+/gi) || []).length > 5) {
      return allText;
    }
  } catch { /* ignore */ void 0; }

  // Ultra-fallback: look for VBScript substrings in the raw bytes
  // This handles cases where encoding is mixed or text is embedded in binary data
  try {
    // Scan for common VBScript keywords in ASCII
    const keywords = ['Sub ', 'End Sub', 'Function ', 'Dim ', 'Private ', 'Public '];
    for (const keyword of keywords) {
      for (let i = 0; i < bytes.length - keyword.length; i++) {
        let match = true;
        for (let j = 0; j < keyword.length; j++) {
          if (bytes[i + j] !== keyword.charCodeAt(j)) { match = false; break; }
        }
        if (match) {
          // Found keyword! Try to extract context
          const start = Math.max(0, i - 200);
          const end = Math.min(bytes.length, i + 10000);
          const chunk = new TextDecoder('utf-8', { fatal: false }).decode(bytes.slice(start, end));
          const subCount = (chunk.match(/Sub\s+\w+/gi) || []).length;
          const dimCount = (chunk.match(/Dim\s+\w+/gi) || []).length;
          if (subCount > 0 || dimCount > 3) {
            logMsg(`  Script markers found at offset ${start}`, 'info');
            return chunk;
          }
        }
      }
    }
  } catch { /* ignore */ void 0; }

  return null;
}

function extractFPCoords(bytes: Uint8Array): Array<{x:number;y:number}> {
  const view = new DataView(bytes.buffer);
  const FP_SCALES = [
    { xMax:2100, yMax:4200, scale:1/350 },
    { xMax:800,  yMax:1600, scale:1/133 },
    { xMax:400,  yMax:800,  scale:1/66.7 },
  ];
  const clusters: Array<Array<{x:number;y:number}>> = [];

  for (const sc of FP_SCALES) {
    const found: Array<{fpX:number;fpY:number;i:number}> = [];
    for (let i = 0; i < bytes.length - 8; i += 4) {
      let x: number, y: number;
      try { x = view.getFloat32(i, true); y = view.getFloat32(i+4, true); } catch (e) { console.debug('[fpt-parser] Coord read failed:', (e || 'unknown')); continue; }

      // Improved: stricter range check to reduce noise
      if (isFinite(x) && isFinite(y) &&
          x > sc.xMax*0.05 && x < sc.xMax*0.95 &&
          y > sc.yMax*0.05 && y < sc.yMax*0.95)
        found.push({ fpX: x, fpY: y, i });
    }

    if (found.length >= 3 && found.length <= 250) {
      // Convert FP coordinates to game space
      const converted = found.map(p => ({
        x: (p.fpX/sc.xMax)*6-3,    // [-3, 3]
        y: (p.fpY/sc.yMax)*12-6    // [-6, 6]
      }));

      // Cluster nearby points (remove duplicates within 0.3 units)
      const clustered: Array<{x:number;y:number}> = [];
      for (const p of converted) {
        const existing = clustered.find(c => Math.hypot(c.x-p.x, c.y-p.y) < 0.3);
        if (!existing) clustered.push(p);
      }

      clusters.push(clustered);
    }
  }

  // Choose cluster with highest confidence (most realistic distribution)
  if (clusters.length > 0) {
    const best = clusters.reduce((a, b) => {
      const scoreA = a.filter(p => p.y > -4 && p.y < 5 && Math.abs(p.x) < 2.8).length;
      const scoreB = b.filter(p => p.y > -4 && p.y < 5 && Math.abs(p.x) < 2.8).length;
      return scoreA > scoreB ? a : b;
    });
    return best;
  }
  return [];
}

// Export für Verwendung in parseFPTFile
export { extractFPCoords };

// ─── Cluster-basierte Bumper-Größen-Variation ──────────────────────────────────
export function assignBumperSizes(bumpers: Array<{x:number;y:number}>): number[] {
  const sizes: number[] = new Array(bumpers.length).fill(1.0);
  if (bumpers.length <= 1) return sizes;

  // Cluster-Analyse mit 0.8-Einheiten Radius
  const clusters: Array<number[]> = [];
  const used = new Set<number>();

  for (let i = 0; i < bumpers.length; i++) {
    if (used.has(i)) continue;
    const cluster: number[] = [i];
    used.add(i);

    for (let j = i + 1; j < bumpers.length; j++) {
      if (used.has(j)) continue;
      const dist = Math.hypot(bumpers[i].x - bumpers[j].x, bumpers[i].y - bumpers[j].y);
      if (dist < 0.8) {
        cluster.push(j);
        used.add(j);
      }
    }
    clusters.push(cluster);
  }

  // Größen basierend auf Cluster-Dichte zuweisen
  clusters.forEach(cluster => {
    const density = cluster.length;
    let size: number;
    if (density >= 4) size = 0.85;        // Dicht → kleiner
    else if (density === 3) size = 0.92;  // Mittel-dicht
    else if (density === 2) size = 1.00;  // Standard
    else size = 1.12;                     // Isoliert → größer

    // Weitere Anpassung basierend auf Y-Position (top bumpers sichtbarer)
    cluster.forEach(idx => {
      const yBoost = Math.max(0, bumpers[idx].y / 5) * 0.08;
      sizes[idx] = size + yBoost;
    });
  });

  return sizes;
}

// ─── Physics-Parameter Extraktion aus FPT Binary ──────────────────────────────
export function extractFPTPhysics(bytes: Uint8Array, coords: Array<{x:number;y:number}>): Map<string, {restitution:number;friction:number;maxVelocity?:number;gravityScale?:number}> {
  const view = new DataView(bytes.buffer);
  const physicsMap = new Map<string, {restitution:number;friction:number;maxVelocity?:number;gravityScale?:number}>();

  // ─── Phase 6: Enhanced Physics Parameter Extraction ───
  // Search for physics tuples with better scoring and parameter diversity
  // Restitution: 0.0-1.5, Friction: 0.0-0.8, MaxVelocity: 5-30, GravityScale: 0.8-1.2

  interface PhysicsCandidate {
    i: number;
    rest: number;
    fric: number;
    maxVel?: number;
    gravity?: number;
    score: number;
  }

  const candidates: PhysicsCandidate[] = [];

  for (let i = 0; i < bytes.length - 12; i += 4) {
    try {
      const rest = view.getFloat32(i, true);
      const fric = view.getFloat32(i + 4, true);
      const maxVel = view.getFloat32(i + 8, true);
      const gravity = view.getFloat32(i + 12, true);

      // Validate restitution and friction (core parameters)
      if (!isFinite(rest) || !isFinite(fric) ||
          rest < 0.3 || rest > 1.6 || fric < -0.1 || fric > 0.9) {
        continue;
      }

      const candidate: PhysicsCandidate = { i, rest, fric, score: 15 };

      // Bonus points for realistic physics ranges
      if (rest >= 0.6 && rest <= 1.2) candidate.score += 10;
      if (fric >= 0.1 && fric <= 0.5) candidate.score += 10;

      // Check for additional parameters (velocity limit, gravity)
      if (isFinite(maxVel) && maxVel >= 5 && maxVel <= 30) {
        candidate.maxVel = maxVel;
        candidate.score += 5;
      }

      if (isFinite(gravity) && gravity >= 0.7 && gravity <= 1.3) {
        candidate.gravity = gravity;
        candidate.score += 5;
      }

      // Proximity scoring: higher score if near element coordinates
      for (const coord of coords) {
        const distX = Math.abs(rest - (0.7 + coord.x * 0.02));
        const distY = Math.abs(fric - (0.3 + coord.y * 0.02));
        const totalDist = Math.sqrt(distX * distX + distY * distY);
        if (totalDist < 0.25) {
          candidate.score += 20;
        } else if (totalDist < 0.5) {
          candidate.score += 10;
        }
      }

      // Avoid duplicates (if we already have a very similar physics config)
      const isDuplicate = candidates.some(
        c => Math.abs(c.rest - rest) < 0.02 && Math.abs(c.fric - fric) < 0.02
      );
      if (!isDuplicate) {
        candidates.push(candidate);
      }
    } catch { /* ignore */ void 0; }
  }

  // Select top candidates
  candidates.sort((a, b) => b.score - a.score);
  const selected = candidates.slice(0, Math.min(15, candidates.length));

  selected.forEach((c, idx) => {
    const entry = {
      restitution: Math.max(0.5, Math.min(1.2, c.rest)),
      friction: Math.max(0.0, Math.min(0.6, c.fric)),
      ...(c.maxVel && { maxVelocity: c.maxVel }),
      ...(c.gravity && { gravityScale: c.gravity })
    };

    physicsMap.set(`element_${idx}`, entry);

    let paramStr = `rest=${c.rest.toFixed(2)}, fric=${c.fric.toFixed(2)}`;
    if (c.maxVel) paramStr += `, maxVel=${c.maxVel.toFixed(1)}`;
    if (c.gravity) paramStr += `, gravity=${c.gravity.toFixed(2)}`;

    logMsg(`  🔧 Physics (score ${c.score}): ${paramStr}`, 'ok');
  });

  return physicsMap;
}

// ─── Ramp-Erkennung mit Intermediate-Punkte-Extraktion ──────────────────────
export function extractRampCoords(coords: Array<{x:number;y:number}>): Array<{x1:number;y1:number;x2:number;y2:number;intermediate?:Array<{x:number;y:number}>}> {
  if (coords.length < 4) return [];

  const ramps: Array<{x1:number;y1:number;x2:number;y2:number;intermediate?:Array<{x:number;y:number}>}> = [];

  for (let i = 0; i < coords.length - 1; i++) {
    for (let j = i + 1; j < coords.length; j++) {
      const p1 = coords[i];
      const p2 = coords[j];

      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const dist = Math.sqrt(dx*dx + dy*dy);

      const minDist = 1.5;
      const angleFromHorizontal = Math.abs(Math.atan2(dy, dx));
      const isDiagonal = angleFromHorizontal > 0.2 && angleFromHorizontal < Math.PI - 0.2;

      if (dist >= minDist && isDiagonal) {
        const isDuplicate = ramps.some(r => {
          const d1 = Math.hypot(r.x1-p1.x, r.y1-p1.y);
          const d2 = Math.hypot(r.x2-p2.x, r.y2-p2.y);
          return (d1 < 0.4 && d2 < 0.4) || (d1 + d2 < 0.4);
        });

        if (!isDuplicate) {
          // Finde intermediate Punkte entlang der Ramp-Linie
          const intermediate: Array<{x:number;y:number}> = [];
          for (const pt of coords) {
            if (pt === p1 || pt === p2) continue;
            // Check if point is near the ramp line (tolerance 0.3 units)
            const distToLine = Math.abs((dy*pt.x - dx*pt.y - dy*p1.x + dx*p1.y) / Math.sqrt(dx*dx + dy*dy));
            const t = ((pt.x - p1.x)*dx + (pt.y - p1.y)*dy) / (dx*dx + dy*dy);
            if (distToLine < 0.3 && t >= 0.1 && t <= 0.9) {
              intermediate.push(pt);
            }
          }

          ramps.push({
            x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y,
            intermediate: intermediate.length > 0 ? intermediate : undefined
          });
        }
      }
    }
  }

  ramps.sort((a, b) => {
    const lenA = Math.hypot(a.x2-a.x1, a.y2-a.y1);
    const lenB = Math.hypot(b.x2-b.x1, b.y2-b.y1);
    return lenB - lenA;
  });

  return ramps.slice(0, 3);
}

// ─── Wall-Pfad-Extraktion ──────────────────────────────────────────────────────
export function extractWallPaths(coords: Array<{x:number;y:number}>): Array<{type:'horizontal'|'vertical';points:Array<{x:number;y:number}>}> {
  const paths: Array<{type:'horizontal'|'vertical';points:Array<{x:number;y:number}>}> = [];
  if (coords.length < 2) return paths;

  // Finde horizontale und vertikale Alignments (Toleranz ±0.1)
  const horizontal = coords.filter(c => Math.abs(c.x) > 2.2).sort((a,b) => a.y-b.y);
  const vertical = coords.filter(c => Math.abs(c.y) > 3.5).sort((a,b) => a.x-b.x);

  if (horizontal.length >= 2) {
    paths.push({ type: 'horizontal', points: horizontal });
  }
  if (vertical.length >= 2) {
    paths.push({ type: 'vertical', points: vertical });
  }

  return paths;
}



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

// ─── Haupt-Parser ─────────────────────────────────────────────────────────────
export async function parseFPTFile(
  file: File,
  buildTableFn?: (cfg: any) => void,
  closeLoaderFn?: () => void,
  switchTabFn?: (t: string) => void,
  callbacks?: ResourceLoadingCallbacks,
): Promise<void> {
  const parseLog = document.getElementById('parse-log');
  if (parseLog) parseLog.innerHTML = '';
  logMsg(`Datei: ${  file.name}`, 'info');
  logMsg(`Größe: ${  (file.size/1024).toFixed(1)  } KB`, 'info');

  // JSON
  if (file.name.toLowerCase().endsWith('.json')) {
    try {
      const cfg = JSON.parse(await file.text());
      logMsg('✓ JSON geparst', 'ok');
      if (cfg.name && cfg.bumpers && cfg.tableColor !== null) {
        buildTableFn?.(cfg); closeLoaderFn?.();
      } else { logMsg('⚠ Kein gültiges Tisch-Format', 'warn'); }
    } catch(e: any) { logMsg(`✗ JSON Fehler: ${  e.message}`, 'error'); }
    return;
  }

  const buffer = await file.arrayBuffer();
  const bytes  = new Uint8Array(buffer);
  logMsg('Analysiere Binärformat...', 'info');

  // CFB/OLE2
  if (typeof CFB !== 'undefined') {
    logMsg('🔍 Analysiere CFB/OLE2-Struktur...', 'info');
    const { textureCount, soundCount, streamCount } = await parseCFBResources(buffer, callbacks);

    if (textureCount > 0 || soundCount > 0) {
      logMsg(`✓ CFB erfolgreich: ${textureCount} Textur(en), ${soundCount} Sound(s), ${streamCount} Stream(s) total`, 'ok');
      if (soundCount > 0) { logMsg('Mappe Sounds...', 'info'); mapFPTSounds(fptResources.sounds as Record<string, AudioBuffer>); }
      // Mirror extracted resources into AssetCatalog for renderer use
      populateCatalogFromFPTResources();
      if (fptResources.playfield) logMsg('✓ Spielfeld-Textur geladen', 'ok');

      if (fptResources.script) {
        logMsg(`📝 VBScript gefunden (${fptResources.script.split('\n').length} Zeilen)`, 'ok');
        runFPScript(fptResources.script);
        if (switchTabFn) switchTabFn('script');
      }

      // Phase 7: Extract MS3D models from FPT
      const ms3dModels = extractMS3DModelsFromCFB(buffer);
      if (ms3dModels.size > 0) {
        logMsg(`🎲 ${ms3dModels.size} MS3D-Modell(e) gefunden`, 'ok');

        // Parse and cache models
        try {
          const { parseAndCacheModels } = await import('./models/model-loader');
          const extractedModels = Array.from(ms3dModels.entries()).map(([name, bytes]) => ({ name, bytes }));
          const modelMap = parseAndCacheModels(extractedModels);
          logMsg(`📦 Modelle gecacht: ${modelMap.size} / ${ms3dModels.size}`, modelMap.size > 0 ? 'ok' : 'warn');
          // Store model map in fptResources for table builder to access
          (fptResources as any).models = modelMap;
        } catch (e: any) {
          logMsg(`⚠ Fehler beim Model-Caching: ${e.message}`, 'warn');
        }
      }

      // Phase 13: Extract BAM animations from FPT
      const animationSequences = extractAnimationSequencesFromCFB(buffer);
      if (animationSequences.size > 0) {
        logMsg(`🎬 ${animationSequences.size} Animation(s) gefunden`, 'ok');
        // Store animations in fptResources for BAM engine to access
        fptResources.animations = animationSequences;
      }

      const tableName = file.name.replace(/\.(fpt|fp)$/i, '');

      // Extrahiere Koordinaten für Bumper/Targets/Rampen
      // Try Table Element parser first (FP v1.x legacy), fall back to heuristic
      let coords: Array<{x:number;y:number}>;
      const tableCoords = extractTableCoordsFromCFB(buffer);
      if (tableCoords.length > 0) {
        coords = tableCoords;
        logMsg(`📍 Koordinaten aus Table Elements: ${coords.length} Punkte`, 'ok');
      } else {
        const bytes = new Uint8Array(buffer);
        coords = extractFPCoords(bytes);
        logMsg(`📍 Koordinaten (Heuristik): ${coords.length} Punkte`, coords.length > 5 ? 'ok' : 'warn');
      }

      // Analysiere Texture-Farben für bessere Ästhetik
      let bumperColors = [0xff2200,0xff9900,0x00aaff,0xff00cc,0x00ff88];  // Fallback
      let elementColorMap = new Map<number, number>();
      if (fptResources.playfield) {
        const colors = extractDominantColors(fptResources.playfield);
        if (colors) {
          bumperColors = [
            colors.primary,
            ((colors.primary >> 8) & 0xff) > 128 ? 0xff2200 : 0x00aaff,
            colors.accent,
            ((colors.accent >> 8) & 0xff) > 128 ? 0xff9900 : 0x00ffcc,
            ((colors.primary ^ 0xffffff) & 0xffffff),
          ];
          logMsg(`🎨 Material-Farben aus Textur analysiert`, 'ok');
        }
        // Per-Element Farb-Analyse
        elementColorMap = extractElementColors(fptResources.playfield, coords);
        if (elementColorMap.size > 0) {
          logMsg(`🎨 Per-Element Farben extrahiert: ${elementColorMap.size} Elemente`, 'ok');
        }
      }

      // Extrahiere Physics-Parameter aus Binary
      const physicsMap = extractFPTPhysics(bytes, coords);
      const elementPhysics: any = { bumpers: {}, targets: {}, ramps: {} };
      physicsMap.forEach((phys, key, idx) => {
        // Verteile auf bumper/target/ramp basierend auf Index
        const elemIdx = parseInt(key.split('_')[1]);
        if (elemIdx < 3) elementPhysics.bumpers[elemIdx] = phys;
        else if (elemIdx < 6) elementPhysics.targets[elemIdx-3] = phys;
        else elementPhysics.ramps[elemIdx-6] = phys;
      });
      if (Object.keys(elementPhysics.bumpers).length > 0) {
        logMsg(`⚙️ ${physicsMap.size} Physics-Parameter extrahiert`, 'ok');
      }

      // Nutze echte Koordinaten, falls vorhanden
      let bumpers = [
        { x:-1.1, y:2.2, color:bumperColors[0], size: 1.0 },
        { x: 1.1, y:2.2, color:bumperColors[1], size: 1.0 },
        { x: 0.0, y:3.6, color:bumperColors[2], size: 1.1 },
      ];
      let targets: any[] = [];
      let ramps: any[] = [];

      if (coords.length >= 3) {
        const upperCoords = coords.filter(c => c.y>0 && c.y<5 && Math.abs(c.x)<2.5);
        if (upperCoords.length >= 3) {
          const sortedCoords = upperCoords.slice(0, Math.min(6, upperCoords.length))
            .sort((a,b) => b.y-a.y);
          // Cluster-basierte Größen-Variation
          const clusterSizes = assignBumperSizes(sortedCoords);
          bumpers = sortedCoords
            .map((c,i) => {
              const size = clusterSizes[i];
              // Per-Element Farbe, sonst Fallback
              const coordIdx = coords.indexOf(c);
              const color = elementColorMap.has(coordIdx)
                ? elementColorMap.get(coordIdx)!
                : bumperColors[i%bumperColors.length];
              const light = getLightConfigFromColor(color);
              return {...c, color, size, light};
            });
          logMsg(`  ✓ ${bumpers.length} Bumper mit Cluster-Größen-Variation und Element-Farben`, 'ok');
        }

        const rightCoords = coords.filter(c => c.x>1.5 && c.x<2.8 && c.y>-1.5 && c.y<1.5);
        if (rightCoords.length >= 3) {
          targets = rightCoords.sort((a,b) => b.y-a.y).slice(0,3)
            .map((c,i) => {
              const coordIdx = coords.indexOf(c);
              const color = elementColorMap.has(coordIdx)
                ? elementColorMap.get(coordIdx)!
                : bumperColors[(i+1)%bumperColors.length];
              const light = getLightConfigFromColor(color);
              return {...c, color, light};
            });
          logMsg(`  ✓ ${targets.length} Targets aus FPT-Koordinaten mit Element-Farben`, 'ok');
        }

        // Extrahiere Rampen aus Koordinaten
        const rampCoords = extractRampCoords(coords);
        if (rampCoords.length > 0) {
          ramps = rampCoords.map((r, i) => {
            // Versuche Farbe von Ramp-Startpunkt zu verwenden
            const startPt = coords.find(c => Math.hypot(c.x-r.x1, c.y-r.y1) < 0.15);
            const startIdx = startPt ? coords.indexOf(startPt) : -1;
            const color = startIdx >= 0 && elementColorMap.has(startIdx)
              ? elementColorMap.get(startIdx)!
              : bumperColors[(i+3) % bumperColors.length];
            const light = getLightConfigFromColor(color);
            return { x1: r.x1, y1: r.y1, x2: r.x2, y2: r.y2, color, light, intermediate: r.intermediate };
          });
          logMsg(`  ✓ ${ramps.length} Rampen aus Koordinaten mit Element-Farben`, 'ok');
        }
      }

      // Generiere Lichter aus Spielfeld-Textur wenn vorhanden
      let suggestedLights: Array<{ color: number; intensity: number; dist: number; x: number; y: number; z: number }> = [];
      if (fptResources.playfield) {
        suggestedLights = suggestTableLights(fptResources.playfield);
        if (suggestedLights.length > 0) {
          logMsg(`💡 ${suggestedLights.length} Lichter aus Textur generiert`, 'ok');
        }
      }

      const config = {
        name: tableName, tableColor: 0x111111, accentColor: 0xff8800,
        bumpers,
        targets,
        ramps,
        lights: suggestedLights.length > 0 ? suggestedLights : [
          { color:0xff8800, intensity:0.6, dist:8, x:0, y:3, z:3 },
          { color:0x442200, intensity:0.5, dist:8, x:-2, y:-2, z:3 },
        ],
        elementPhysics: Object.keys(elementPhysics.bumpers).length > 0 ? elementPhysics : undefined
      };

      // Phase 2: Call callbacks if provided
      if (buildTableFn) buildTableFn(config);
      if (closeLoaderFn) closeLoaderFn();

      if (fptResources.playfield) logMsg('🖼️ Spielfeld-Textur angewendet', 'ok');
      if (fptResources.musicTrack) {
        const musicTrack = fptResources.musicTrack;
        const duration = typeof musicTrack === 'object' && 'duration' in musicTrack ? (musicTrack as AudioBuffer).duration.toFixed(1) : '?';
        logMsg(`🎵 FPT-Musik ${duration}s`, 'ok');
        playFPTMusic(musicTrack);
      }

      // Detect library dependencies
      const dependencies = detectLibraryDependencies(tableName, fptResources.script, coords.length);
      const missing = getMissingLibraries(dependencies);

      if (dependencies.length > 0) {
        logMsg(`📚 Library-Abhängigkeiten erkannt: ${dependencies.length}`, 'info');
        const depSummary = formatLibraryDependencies(dependencies);
        depSummary.split('\n').filter(l => l).forEach(line => logMsg(`  ${line}`, 'info'));
      }

      if (missing.length > 0) {
        logMsg(`⚠️ ${missing.length} fehlende Bibliotheken:`, 'warn');
        missing.forEach(lib => {
          logMsg(`  📦 ${lib.name} (${lib.type})`, 'warn');
        });
        logMsg(`💡 Tipp: Laden Sie die fehlenden Dateien über "FP IMPORT"`, 'info');
      }

      logMsg(`✨ "${tableName}" vollständig geladen!`, 'ok');
      return;
    } else {
      logMsg('CFB: keine Assets — Fallback', 'warn');
    }
  }

  // Heuristik
  logMsg('Starte Heuristik-Parser...', 'info');
  const sig = detectFPSignature(bytes);
  logMsg(sig ? `✓ Signatur: ${sig}` : '⚠ Unbekannte Signatur', sig ? 'ok' : 'warn');

  const nullStrings   = extractNullStrings(bytes);
  const pascalStrings = extractPascalStrings(bytes);
  const allStrings = [...new Set([...nullStrings, ...pascalStrings])]
    .filter(s => s.length >= 3 && s.length <= 80 && /^[A-Za-z0-9\s\-_'!.,:]+$/.test(s));
  logMsg(`Strings: ${allStrings.length}`, 'info');

  const tableName = allStrings
    .filter(s => s.length >= 4 && s.length <= 50 && /[A-Za-z]/.test(s))
    .sort((a,b) => b.length-a.length)
    .find(s => !/^(the|and|for|with|from|this|that|version|copyright)/i.test(s))
    ?? file.name.replace(/\.(fpt|fp)$/i, '');
  logMsg(`Tisch-Name: "${tableName}"`, 'ok');

  const coords = extractFPCoords(bytes);
  logMsg(`Koordinaten: ${coords.length}`, coords.length > 0 ? 'ok' : 'info');

  const sample = bytes.slice(Math.min(200,bytes.length), Math.min(4000,bytes.length));
  let rScore=0, gScore=0, bScore=0;
  for (let i=0;i+2<sample.length;i+=3){rScore+=sample[i];gScore+=sample[i+1];bScore+=sample[i+2];}
  const dom = rScore>gScore&&rScore>bScore?'rot':bScore>rScore&&bScore>gScore?'blau':'grün';

  const tableColor = dom==='rot'?0x1a0500:dom==='blau'?0x00050f:0x0a100a;
  const accent     = dom==='rot'?0xff4400:dom==='blau'?0x0088ff:0x00cc66;

  const bumperColors = [0xff2200,0xff9900,0x00aaff,0xff00cc,0x00ff88];
  const fallbackPos  = [[-1.0,2.0],[1.0,2.0],[0.0,3.3],[-1.4,3.8],[1.4,3.8]];
  const bumperCount  = Math.min(2 + Math.floor(bytes[Math.min(512,bytes.length-1)] % 4), 5);

  // ─── Intelligente Bumper-Platzierung ───────────────────────────────────
  const upperCoords = coords.filter(c => c.y>0 && c.y<5 && Math.abs(c.x)<2.5);
  let bumpCfg: Array<{x:number; y:number; color:number}> = [];

  if (upperCoords.length >= 3) {
    // Sortiere nach Y (oben zuerst) für bessere Visualisierung
    const sorted = [...upperCoords].sort((a,b) => b.y-a.y);
    bumpCfg = sorted.slice(0, Math.min(6, sorted.length)).map((c,i) => ({
      ...c,
      color: bumperColors[i%5],
      y: Math.max(-3, Math.min(4, c.y))  // Clamp zu spielbaren Bereich
    }));
    logMsg(`📍 ${bumpCfg.length} Bumper aus Koordinaten extrahiert`, 'ok');
  } else {
    bumpCfg = Array.from({ length: bumperCount }, (_,i) => ({
      x:fallbackPos[i][0], y:fallbackPos[i][1], color:bumperColors[i]
    }));
    logMsg(`⚠ Verwende Standard-Bumper (${bumperCount} Stück)`, 'warn');
  }

  // ─── Intelligente Target-Platzierung ───────────────────────────────────
  const midCoords = coords.filter(c => c.y>=-1&&c.y<2&&Math.abs(c.x)>1.2&&Math.abs(c.x)<2.8);
  const rightCoords = coords.filter(c => c.x>1.5 && c.x<2.8 && c.y>-1.5 && c.y<1.5);

  let targetCfg: Array<{x:number; y:number; color:number}> = [];
  if (rightCoords.length >= 3) {
    // Sortiere rechte Targets von oben nach unten
    const sorted = [...rightCoords].sort((a,b) => b.y-a.y);
    targetCfg = sorted.slice(0,3).map((c,i) => ({ ...c, color:bumperColors[i] }));
    logMsg(`🎯 ${targetCfg.length} Targets gefunden`, 'ok');
  } else if (midCoords.length > 0) {
    targetCfg = midCoords.slice(0,3).map((c,i) => ({ ...c, color:bumperColors[i] }));
    logMsg(`🎯 ${targetCfg.length} Mid-Targets gefunden`, 'ok');
  } else {
    logMsg('⚠ Keine Targets gefunden', 'warn');
  }

  const confidence = calcConfidence(sig, allStrings.length, coords.length, file.size);
  logMsg(`Konfidenz: ${confidence}%`, confidence>60?'ok':confidence>30?'warn':'error');

  // Optional callbacks — guard so callers like Phase B0's loadFPTFromPath
  // can invoke parseFPTFile() purely for asset extraction (no rendering hookup).
  buildTableFn?.({ name: tableName, tableColor, accentColor: accent, bumpers: bumpCfg, targets: targetCfg,
    lights: [{ color:accent,intensity:0.8,dist:10,x:0,y:2,z:4 }, { color:accent,intensity:0.4,dist:8,x:-2,y:-2,z:3 }]
  });
  closeLoaderFn?.();

  // Detect library dependencies (heuristic path)
  const dependencies = detectLibraryDependencies(tableName, null, coords.length);
  if (dependencies.length > 0) {
    logMsg(`📚 Library-Abhängigkeiten basierend auf Tabellen-Name erkannt: ${dependencies.length}`, 'info');
    const missing = getMissingLibraries(dependencies);
    if (missing.length > 0) {
      logMsg(`⚠️ ${missing.length} möglicherweise benötigte Bibliotheken:`, 'warn');
      missing.forEach(lib => {
        logMsg(`  📦 ${lib.name} (${lib.type})`, 'warn');
      });
    }
  }

  logMsg(`✓ "${tableName}" geladen!`, 'ok');
}

// ─── FPL Library Parser (Enhanced) ───────────────────────────────────────────
export type { FPLLibrary } from './types';

// Phase 5: Import library cache with TTL support
import { getLibraryCache } from './library-cache';

export async function parseFPLFile(
  file: File,
  onLoaded: (lib: any) => void,
  onError?: (msg: string) => void
): Promise<void> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const cfb = (CFB as any).read(new Uint8Array(arrayBuffer), { type: 'array' });

    const libName = file.name.replace(/\.fpl$/i, '');
    const library: any = {
      name: libName,
      tableTemplates: {},
      physicsPresets: {},
      soundLibrary: {},
      textureLibrary: {},
      modelLibrary: {},
      fontLibrary: {},
      scriptLibrary: {},
      voiceLibrary: {},
    };

    const entries = ((cfb.FileIndex as any[]) || [])
      .filter((e: any) => e.size > 0 && e.name && e.name !== 'Root Entry');

    logMsg(`📚 FPL Parser: Found ${entries.length} streams in "${libName}"`);

    // Categorize streams
    const categories = {
      textures: 0, sounds: 0, music: 0, models: 0, fonts: 0, scripts: 0, voices: 0, other: 0
    };

    for (const entry of entries) {
      const name: string = entry.name || '';
      const bytes: Uint8Array = entry.content;
      const nameL = name.toLowerCase();

      // Textures / Images (GFX, TEX, TEXTURE, BACKDROP, etc.)
      if (/image|texture|gfx|playfield|backdrop|translite|sprite/i.test(nameL)) {
        const texture = await extractImageFromBytes(bytes);
        if (texture) {
          library.textureLibrary[name] = texture;
          categories.textures++;
          logMsg(`  🖼️ Texture: "${name}" (${(bytes.length/1024).toFixed(0)} KB)`, 'ok');
        }
      }
      // Music (MUS, MSC, MUSIC)
      else if (/music|musica|mus|msc(?!.*sound)/i.test(nameL)) {
        const sound = await extractSoundFromBytes(bytes);
        if (sound) {
          library.soundLibrary[name] = sound;
          categories.music++;
          logMsg(`  🎵 Music: "${name}" (${(sound as AudioBuffer).duration.toFixed(1)}s)`, 'ok');
        }
      }
      // Sound Effects (SND, SFX, SOUND, AUDIO)
      else if (/sound|snd|sfx|audio|effect|fx(?!.*music)/i.test(nameL)) {
        const sound = await extractSoundFromBytes(bytes);
        if (sound) {
          library.soundLibrary[name] = sound;
          categories.sounds++;
          logMsg(`  🔊 Sound: "${name}" (${(sound as AudioBuffer).duration.toFixed(2)}s)`, 'ok');
        }
      }
      // Voices (VOC, VO, VOICE, SPEECH, NARRATOR)
      else if (/voice|voc|vo|speech|narrator|quotes/i.test(nameL)) {
        const sound = await extractSoundFromBytes(bytes);
        if (sound) {
          library.voiceLibrary[name] = sound;
          categories.voices++;
          logMsg(`  🗣️ Voice: "${name}" (${(sound as AudioBuffer).duration.toFixed(2)}s)`, 'ok');
        }
      }
      // Models (MOD, MODEL, OBJ, 3D)
      else if (/model|mod|obj|3d|mesh|geometry/i.test(nameL)) {
        library.modelLibrary[name] = bytes;
        categories.models++;
        logMsg(`  🎲 Model: "${name}" (${(bytes.length/1024).toFixed(0)} KB)`, 'ok');
      }
      // Fonts (DMD, FONT, TTF, CHAR)
      else if (/font|dmd|ttf|char|character/i.test(nameL)) {
        library.fontLibrary[name] = bytes;
        categories.fonts++;
        logMsg(`  🔤 Font: "${name}" (${(bytes.length/1024).toFixed(0)} KB)`, 'ok');
      }
      // Scripts (SCRIPT, VBS, CODE)
      else if (/script|vbs|code/i.test(nameL)) {
        try {
          const text = new TextDecoder('utf-8', { fatal: false }).decode(bytes);
          if (/\bSub\s+\w+/i.test(text)) {
            library.scriptLibrary[name] = text;
            categories.scripts++;
            logMsg(`  📝 Script: "${name}" (${text.split('\n').length} lines)`, 'ok');
          }
        } catch { /* ignore */ void 0; }
      }
      // Physics presets (JSON)
      else if (/physics|preset|config/i.test(nameL) && nameL.endsWith('.json')) {
        try {
          const text = new TextDecoder('utf-8', { fatal: false }).decode(bytes);
          const preset = JSON.parse(text);
          const presetName = name.replace(/\.json$/i, '');
          library.physicsPresets[presetName] = preset;
          logMsg(`  ⚙️ Physics: "${presetName}"`, 'ok');
        } catch { /* ignore invalid JSON */ void 0; }
      }
      else {
        categories.other++;
      }
    }

    // Create default table template
    if (Object.keys(library.textureLibrary).length > 0) {
      library.tableTemplates['default'] = {
        name: libName,
        tableColor: 0x1a4a15,
        accentColor: 0x00ff66,
        bumpers: [],
        targets: [],
        ramps: [],
      };
    }

    // Summary
    const summary = Object.entries(categories)
      .filter(([, count]) => count > 0)
      .map(([type, count]) => `${count} ${type}`)
      .join(', ');

    logMsg(`✅ Library loaded: ${summary}`, 'ok');

    // Phase 5: Cache globally with TTL support
    getLibraryCache().set(libName, library);
    onLoaded(library);
  } catch (err: any) {
    logMsg(`❌ FPL Parse Error: ${err.message}`, 'error');
    onError?.(err.message || 'Failed to parse FPL file');
  }
}

// ─── Phase 3: MS3D Model Extraction ───────────────────────────────────────────
/**
 * Extract MS3D models from CFB streams
 * Returns a map of model names to their binary data
 */
export function extractMS3DModelsFromCFB(arrayBuffer: ArrayBuffer): Map<string, Uint8Array> {
  const models = new Map<string, Uint8Array>();

  let cfb: any;
  try { cfb = (CFB as any).read(new Uint8Array(arrayBuffer), { type: 'array' }); }
  catch(e: any) { logMsg(`CFB Parse-Fehler beim Model-Extract: ${  e.message}`, 'warn'); return models; }

  const entries = ((cfb.FileIndex as any[]) || []).filter((e: any) => e.size > 0 && e.name && e.name !== 'Root Entry');

  for (const entry of entries) {
    const name: string = entry.name || '';
    // cfb library returns `entry.content` as plain Array<number> when
    // `type: 'array'` is used. Code below uses `bytes.buffer` for DataView /
    // LZO / typed-array ops which throws on plain arrays. Normalize to Uint8Array.
    const raw = entry.content;
    const bytes: Uint8Array = raw instanceof Uint8Array ? raw : new Uint8Array(raw as ArrayLike<number>);
    const nameL = name.toLowerCase();

    // Look for MS3D models (by stream name or magic header)
    const isModelStream = nameL.includes('mesh') ||
                         nameL.includes('model') ||
                         nameL.endsWith('.ms3d') ||
                         nameL.startsWith('_3d');

    if (!isModelStream) continue;

    // Check for MS3D magic header
    if (bytes.length >= 4) {
      const header = new TextDecoder().decode(bytes.slice(0, 4));
      if (header === 'MS3D') {
        models.set(name, bytes);
        logMsg(`  MS3D Model: "${name}" (${(bytes.length/1024).toFixed(0)} KB)`, 'ok');
      }
    }
  }

  return models;
}

// ─── Phase 13: Animation Sequence Extraction ────────────────────────────────────
/**
 * Extract BAM animation sequences from FPT/CFB files
 * Looks for .seq files, animation streams, or embedded animation data
 */
export function extractAnimationSequencesFromCFB(arrayBuffer: ArrayBuffer): Map<string, any> {
  const animations = new Map<string, any>();

  let cfb: any;
  try { cfb = (CFB as any).read(new Uint8Array(arrayBuffer), { type: 'array' }); }
  catch(e: any) { logMsg(`CFB Parse-Fehler beim Animation-Extract: ${  e.message}`, 'warn'); return animations; }

  const entries = ((cfb.FileIndex as any[]) || []).filter((e: any) => e.size > 0 && e.name && e.name !== 'Root Entry');

  for (const entry of entries) {
    const name: string = entry.name || '';
    // cfb library returns `entry.content` as plain Array<number> when
    // `type: 'array'` is used. Code below uses `bytes.buffer` for DataView /
    // LZO / typed-array ops which throws on plain arrays. Normalize to Uint8Array.
    const raw = entry.content;
    const bytes: Uint8Array = raw instanceof Uint8Array ? raw : new Uint8Array(raw as ArrayLike<number>);
    const nameL = name.toLowerCase();

    // Look for animation streams (by name pattern)
    const isAnimationStream = /animation|sequence|anim|frame|motion|action|keyframe|\.seq/i.test(nameL);

    if (!isAnimationStream) continue;

    try {
      // Try to decode as text (.seq format)
      const text = new TextDecoder('utf-8', { fatal: false }).decode(bytes);

      // Check for .seq text format markers
      if (/FRAME|FRAMERATE|POS|ROT|SCALE|DURATION/i.test(text)) {
        // Parse .seq format
        const sequence = parseSequenceFormat(text, name);
        if (sequence && sequence.frames && sequence.frames.length > 0) {
          animations.set(name, sequence);
          logMsg(`  Animation: "${name}" (${sequence.frames.length} Frames, ${sequence.duration}ms)`, 'ok');
        }
      } else if (text.includes('{') && text.includes('}')) {
        // Try JSON format
        try {
          const json = JSON.parse(text);
          if (json.frames && Array.isArray(json.frames)) {
            animations.set(name, json);
            logMsg(`  Animation (JSON): "${name}" (${json.frames.length} Frames)`, 'ok');
          }
        } catch { /* not JSON */ void 0; }
      }
    } catch (e: any) {
      // Might be binary format - log and skip for now
      if (nameL.includes('anim')) {
        logMsg(`  ⚠ Animation-Stream "${name}" konnte nicht dekodiert werden`, 'warn');
      }
    }
  }

  return animations;
}

/**
 * Parse .seq text format animation data
 * Format:
 *   NAME <name>
 *   FRAMERATE <fps>
 *   FRAME <n>
 *     POS <x> <y> <z>
 *     ROT <x> <y> <z>
 *     SCALE <x> <y> <z>
 *     DURATION <ms>
 */
function parseSequenceFormat(text: string, sequenceName: string): any {
  try {
    const lines = text.split('\n')
      .map(l => l.trim())
      .filter(l => l && !l.startsWith('#'));

    let name = sequenceName.replace(/\.seq$/i, '');
    let frameRate = 60;
    const frames: any[] = [];

    let currentFrame: any = null;
    let frameIndex = 0;

    for (const line of lines) {
      const tokens = line.split(/\s+/);
      const cmd = tokens[0].toUpperCase();

      if (cmd === 'NAME') {
        name = tokens.slice(1).join(' ') || name;
      } else if (cmd === 'FRAMERATE') {
        frameRate = parseInt(tokens[1]) || 60;
      } else if (cmd === 'FRAME') {
        // Save previous frame
        if (currentFrame) {
          currentFrame.duration = currentFrame.duration || 0;
          frames.push(currentFrame);
        }
        // Start new frame
        frameIndex = parseInt(tokens[1]) || frames.length;
        currentFrame = {
          time: (frameIndex / frameRate) * 1000,
          position: { x: 0, y: 0, z: 0 },
          rotation: { x: 0, y: 0, z: 0 },
          scale: { x: 1, y: 1, z: 1 },
          duration: 0,
        };
      } else if (currentFrame) {
        if (cmd === 'POS' && tokens.length >= 4) {
          currentFrame.position = {
            x: parseFloat(tokens[1]) || 0,
            y: parseFloat(tokens[2]) || 0,
            z: parseFloat(tokens[3]) || 0,
          };
        } else if (cmd === 'ROT' && tokens.length >= 4) {
          currentFrame.rotation = {
            x: parseFloat(tokens[1]) || 0,
            y: parseFloat(tokens[2]) || 0,
            z: parseFloat(tokens[3]) || 0,
          };
        } else if (cmd === 'SCALE' && tokens.length >= 4) {
          currentFrame.scale = {
            x: parseFloat(tokens[1]) || 1,
            y: parseFloat(tokens[2]) || 1,
            z: parseFloat(tokens[3]) || 1,
          };
        } else if (cmd === 'DURATION' && tokens.length >= 2) {
          currentFrame.duration = parseInt(tokens[1]) || 0;
        }
      }
    }

    // Save last frame
    if (currentFrame) {
      frames.push(currentFrame);
    }

    if (frames.length === 0) return null;

    const duration = frames.reduce((sum, f) => sum + f.duration, 0);

    return {
      name,
      frameRate,
      frames,
      looping: false,
      duration,
    };
  } catch (e: any) {
    logMsg(`  ⚠ Fehler beim Parsen von ${sequenceName}: ${e.message}`, 'warn');
    return null;
  }
}

