// SPDX-License-Identifier: AGPL-3.0-or-later
import * as CFB from 'cfb';
import type { CFB$Container } from 'cfb';
import { fptResources, globalAssetCatalog } from '../game';
import { runFPScript } from '../script-engine';
import { extractImageFromBytes, extractSoundFromBytes } from './media';
import { extractTableCoordsFromCFB, extractTableElementsFromCFB, ELEM_TYPE } from './table-elements';
import type { ParsedTableElement } from './table-elements';
import { logMsg } from './log';
import type { ResourceLoadingCallbacks } from './log';
import { extractFPCoords, assignBumperSizes, extractRampCoords, extractFPTPhysics } from './coords';
import { detectFPSignature, calcConfidence } from './validation';
import { extractNullStrings, extractPascalStrings } from './strings';
import { parseCFBResources } from './cfb-parser';
import { mapFPTSounds, populateCatalogFromFPTResources } from './io';
import { extractMS3DModelsFromCFB, extractAnimationSequencesFromCFB } from './models';
import { parseFPM, fpmToTHREE } from './fpm-parser';
import {
  suggestTableLights, extractDominantColors, extractElementColors, getLightConfigFromColor
} from './lighting';
import { detectLibraryDependencies, getMissingLibraries, formatLibraryDependencies } from './library';
import { playFPTMusic } from '../audio-system';

export type { FPLLibrary } from '../types';

import { getLibraryCache } from '../library-cache';

export async function parseFPTFile(
  file: File,
  buildTableFn?: (cfg: any) => void,
  closeLoaderFn?: () => void,
  switchTabFn?: (t: string) => void,
  callbacks?: ResourceLoadingCallbacks,
): Promise<void> {
  const parseLog = document.getElementById('parse-log');
  if (parseLog) parseLog.innerHTML = '';
  logMsg(`Datei: ${file.name}`, 'info');
  logMsg(`Größe: ${(file.size/1024).toFixed(1)} KB`, 'info');

  if (file.name.toLowerCase().endsWith('.json')) {
    try {
      const cfg = JSON.parse(await file.text());
      logMsg('✓ JSON geparst', 'ok');
      if (cfg.name && cfg.bumpers && cfg.tableColor !== null) {
        buildTableFn?.(cfg); closeLoaderFn?.();
      } else { logMsg('⚠ Kein gültiges Tisch-Format', 'warn'); }
    } catch(e: any) { logMsg(`✗ JSON Fehler: ${e.message}`, 'error'); }
    return;
  }

  const buffer = await file.arrayBuffer();
  const bytes  = new Uint8Array(buffer);
  logMsg('Analysiere Binärformat...', 'info');

  if (typeof CFB !== 'undefined') {
    logMsg('🔍 Analysiere CFB/OLE2-Struktur...', 'info');
    const { textureCount, soundCount, streamCount } = await parseCFBResources(buffer, callbacks);

    if (textureCount > 0 || soundCount > 0) {
      logMsg(`✓ CFB erfolgreich: ${textureCount} Textur(en), ${soundCount} Sound(s), ${streamCount} Stream(s) total`, 'ok');
      if (soundCount > 0) { logMsg('Mappe Sounds...', 'info'); mapFPTSounds(fptResources.sounds as Record<string, AudioBuffer>); }
      populateCatalogFromFPTResources();
      if (fptResources.playfield) logMsg('✓ Spielfeld-Textur geladen', 'ok');

      if (fptResources.script) {
        logMsg(`📝 VBScript gefunden (${fptResources.script.split('\n').length} Zeilen)`, 'ok');
        runFPScript(fptResources.script);
        if (switchTabFn) switchTabFn('script');
      }

      const ms3dModels = extractMS3DModelsFromCFB(buffer);
      if (ms3dModels.size > 0) {
        logMsg(`🎲 ${ms3dModels.size} MS3D-Modell(e) gefunden`, 'ok');

        try {
          const { parseAndCacheModels } = await import('../models/model-loader');
          const extractedModels = Array.from(ms3dModels.entries()).map(([name, bytes]) => ({ name, bytes }));
          const modelMap = parseAndCacheModels(extractedModels);
          logMsg(`📦 Modelle gecacht: ${modelMap.size} / ${ms3dModels.size}`, modelMap.size > 0 ? 'ok' : 'warn');
          fptResources.models = modelMap;

          // Also register in AssetCatalog so resolveModel() and ModelViewer can find them
          const cat = globalAssetCatalog();
          if (cat) {
            let registered = 0;
            modelMap.forEach((mesh, name) => {
              if (mesh) {
                cat.registerModel(name, mesh);
                registered++;
              }
            });
            if (registered > 0) {
              logMsg(`    → ${registered} MS3D-Modelle in AssetCatalog registriert`, 'ok');
            }
          }
        } catch (e: any) {
          logMsg(`⚠ Fehler beim Model-Caching: ${e.message}`, 'warn');
        }
      }

      const animationSequences = extractAnimationSequencesFromCFB(buffer);
      if (animationSequences.size > 0) {
        logMsg(`🎬 ${animationSequences.size} Animation(s) gefunden`, 'ok');
        fptResources.animations = animationSequences;
      }

      const tableName = file.name.replace(/\.(fpt|fp)$/i, '');

      // Phase 1+2+3: Enhanced Table Elements parsing with type classification
      const elements = extractTableElementsFromCFB(buffer, { includeIncomplete: false });
      const tableCoords = extractTableCoordsFromCFB(buffer);

      if (elements.length > 0) {
        // Count by type for the log
        const kindCounts = new Map<string, number>();
        for (const el of elements) {
          kindCounts.set(el.kind, (kindCounts.get(el.kind) ?? 0) + 1);
        }
        const summary = Array.from(kindCounts.entries())
          .map(([k, c]) => `${c}×${k}`).join(', ');
        logMsg(`📍 Table Elements: ${elements.length} Elemente (${summary})`, 'ok');

        // Detect BAM animation config streams (stored as named streams)
        tryParseBAMConfigFromCFB(buffer, tableName);

        // Use elements for smarter bumper/target/ramp classification
        {const kindMap = new Map<string, ParsedTableElement[]>();
        for (const el of elements) {
          const arr = kindMap.get(el.kind) ?? [];
          arr.push(el);
          kindMap.set(el.kind, arr);
        }

        // Build bumped config from classified bumper elements
        const bumperElements = kindMap.get('bumper') ?? [];
        if (bumperElements.length > 0) {
          logMsg(`  🎯 ${bumperElements.length} Bumper erkannt`, 'ok');
        }

        // Target elements
        const targetElements = kindMap.get('target') ?? [];
        if (targetElements.length > 0) {
          logMsg(`  🎯 ${targetElements.length} Targets erkannt`, 'ok');
        }

        // Ramps
        const rampElements = kindMap.get('ramp') ?? [];
        if (rampElements.length > 0) {
          logMsg(`  🛤️ ${rampElements.length} Rampen erkannt`, 'ok');
        }

        // Flipper elements
        const flipperElements = kindMap.get('flipper') ?? [];
        if (flipperElements.length > 0) {
          logMsg(`  🦾 ${flipperElements.length} Flipper erkannt`, 'ok');
        }

        // Lights
        const lightElements = kindMap.get('light') ?? [];
        if (lightElements.length > 0) {
          logMsg(`  💡 ${lightElements.length} Lichter erkannt`, 'ok');
        }

        void (kindMap);} // silence unused
      }

      let coords: Array<{x:number;y:number}>;
      if (tableCoords.length > 0) {
        coords = tableCoords;
        if (elements.length === 0) {
          logMsg(`📍 Koordinaten aus Table Elements: ${coords.length} Punkte`, 'ok');
        }
      } else {
        const bytes = new Uint8Array(buffer);
        coords = extractFPCoords(bytes);
        logMsg(`📍 Koordinaten (Heuristik): ${coords.length} Punkte`, coords.length > 5 ? 'ok' : 'warn');
      }

      let bumperColors = [0xff2200,0xff9900,0x00aaff,0xff00cc,0x00ff88];
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
        elementColorMap = extractElementColors(fptResources.playfield, coords);
        if (elementColorMap.size > 0) {
          logMsg(`🎨 Per-Element Farben extrahiert: ${elementColorMap.size} Elemente`, 'ok');
        }
      }

      const physicsMap = extractFPTPhysics(bytes, coords);
      const elementPhysics: any = { bumpers: {}, targets: {}, ramps: {} };
      physicsMap.forEach((phys, key) => {
        const elemIdx = parseInt(key.split('_')[1]);
        if (elemIdx < 3) elementPhysics.bumpers[elemIdx] = phys;
        else if (elemIdx < 6) elementPhysics.targets[elemIdx-3] = phys;
        else elementPhysics.ramps[elemIdx-6] = phys;
      });
      if (Object.keys(elementPhysics.bumpers).length > 0) {
        logMsg(`⚙️ ${physicsMap.size} Physics-Parameter extrahiert`, 'ok');
      }

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
          const clusterSizes = assignBumperSizes(sortedCoords);
          bumpers = sortedCoords
            .map((c,i) => {
              const size = clusterSizes[i];
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

        const rampCoords = extractRampCoords(coords);
        if (rampCoords.length > 0) {
          ramps = rampCoords.map((r, i) => {
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

      if (buildTableFn) buildTableFn(config);
      if (closeLoaderFn) closeLoaderFn();

      if (fptResources.playfield) logMsg('🖼️ Spielfeld-Textur angewendet', 'ok');
      if (fptResources.musicTrack) {
        const musicTrack = fptResources.musicTrack;
        const duration = typeof musicTrack === 'object' && 'duration' in musicTrack ? (musicTrack as AudioBuffer).duration.toFixed(1) : '?';
        logMsg(`🎵 FPT-Musik ${duration}s`, 'ok');
        playFPTMusic(musicTrack);
      }

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

  const upperCoords = coords.filter(c => c.y>0 && c.y<5 && Math.abs(c.x)<2.5);
  let bumpCfg: Array<{x:number; y:number; color:number}> = [];

  if (upperCoords.length >= 3) {
    const sorted = [...upperCoords].sort((a,b) => b.y-a.y);
    bumpCfg = sorted.slice(0, Math.min(6, sorted.length)).map((c,i) => ({
      ...c,
      color: bumperColors[i%5],
      y: Math.max(-3, Math.min(4, c.y))
    }));
    logMsg(`📍 ${bumpCfg.length} Bumper aus Koordinaten extrahiert`, 'ok');
  } else {
    bumpCfg = Array.from({ length: bumperCount }, (_,i) => ({
      x:fallbackPos[i][0], y:fallbackPos[i][1], color:bumperColors[i]
    }));
    logMsg(`⚠ Verwende Standard-Bumper (${bumperCount} Stück)`, 'warn');
  }

  const rightCoords = coords.filter(c => c.x>1.5 && c.x<2.8 && c.y>-1.5 && c.y<1.5);

  let targetCfg: Array<{x:number; y:number; color:number}> = [];
  if (rightCoords.length >= 3) {
    const sorted = [...rightCoords].sort((a,b) => b.y-a.y);
    targetCfg = sorted.slice(0,3).map((c,i) => ({ ...c, color:bumperColors[i] }));
    logMsg(`🎯 ${targetCfg.length} Targets gefunden`, 'ok');
  } else {
    logMsg('⚠ Keine Targets gefunden', 'warn');
  }

  const confidence = calcConfidence(sig, allStrings.length, coords.length, file.size);
  logMsg(`Konfidenz: ${confidence}%`, confidence>60?'ok':confidence>30?'warn':'error');

  buildTableFn?.({ name: tableName, tableColor, accentColor: accent, bumpers: bumpCfg, targets: targetCfg,
    lights: [{ color:accent,intensity:0.8,dist:10,x:0,y:2,z:4 }, { color:accent,intensity:0.4,dist:8,x:-2,y:-2,z:3 }]
  });
  closeLoaderFn?.();

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

// ─── BAM Config Extractor ──────────────────────────────────────────────────
/**
 * Try to extract BAM (Better Arcade Mode) configuration data from a CFB container.
 * BAM extensions add named streams to FPT files with animation definitions,
 * advanced lighting configs, and physics overrides.
 *
 * This is best-effort — most tables don't carry BAM data, and those that do
 * use an ad-hoc format. We parse what we can and log the results.
 */
function tryParseBAMConfigFromCFB(arrayBuffer: ArrayBuffer, tableName: string): void {
  let cfb: CFB$Container;
  try {
    cfb = CFB.read(new Uint8Array(arrayBuffer), { type: 'array' });
  } catch { return; }

  const entries = (cfb.FileIndex || []).filter(e => e.size > 0 && e.name);
  let bamCount = 0;

  for (const entry of entries) {
    const raw = entry.content;
    const bytes = raw instanceof Uint8Array ? raw : new Uint8Array(raw as ArrayLike<number>);
    const name: string = entry.name || '';
    const nameL = name.toLowerCase();

    // BAM animation data: "BAM_Anim", "BAM_Sequence", "AnimationData"
    if (/bam.*(anim|seq|motion|pose|action)/i.test(nameL)) {
      bamCount++;
      if (import.meta.env.DEV) logMsg(`  🎬 BAM Animation: "${name}" (${bytes.length} bytes)`, 'info');
    }

    // BAM lighting: "BAM_Light", "BAM_Lighting"
    if (/bam.*(light|illum|glow|color)/i.test(nameL)) {
      bamCount++;
      if (import.meta.env.DEV) logMsg(`  💡 BAM Lighting: "${name}" (${bytes.length} bytes)`, 'info');
    }

    // BAM physics: "BAM_Physics", "BAM_Config"  
    if (/bam.*(phys|conf|config|preset)/i.test(nameL)) {
      bamCount++;
      if (import.meta.env.DEV) logMsg(`  ⚙️ BAM Physics: "${name}" (${bytes.length} bytes)`, 'info');
    }

    // BAM camera definition
    if (/bam.*(camera|view|fov)/i.test(nameL)) {
      bamCount++;
      if (import.meta.env.DEV) logMsg(`  📷 BAM Camera: "${name}" (${bytes.length} bytes)`, 'info');
    }
  }

  if (bamCount > 0) {
    logMsg(`  📦 BAM-Erweiterungen: ${bamCount} Stream(s) in "${tableName}"`, 'ok');
  }
}

export async function parseFPLFile(
  file: File,
  onLoaded: (lib: any) => void,
  onError?: (msg: string) => void
): Promise<void> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const cfb = CFB.read(new Uint8Array(arrayBuffer), { type: 'array' });

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

    const entries = (cfb.FileIndex || [])
      .filter((e) => e.size > 0 && e.name && e.name !== 'Root Entry');

    logMsg(`📚 FPL Parser: Found ${entries.length} streams in "${libName}"`);

    const categories = {
      textures: 0, sounds: 0, music: 0, models: 0, fonts: 0, scripts: 0,
      voices: 0, bamAnim: 0, bamLight: 0, bamPhysics: 0, physics: 0, other: 0
    };

    for (const entry of entries) {
      const name: string = entry.name || '';
      const rawContent = entry.content;
      const bytes: Uint8Array = rawContent instanceof Uint8Array ? rawContent : new Uint8Array(rawContent);
      const nameL = name.toLowerCase();

      // ─── BAM extension streams ───
      if (/bam.*(anim|seq|motion|pose|action)/i.test(nameL)) {
        library.bamAnimations = library.bamAnimations || {};
        library.bamAnimations[name] = bytes;
        categories.bamAnim++;
        logMsg(`  🎬 BAM Animation: "${name}"`, 'ok');
      }
      else if (/bam.*(light|illum|glow|color|lighting)/i.test(nameL)) {
        library.bamLighting = library.bamLighting || [];
        try {
          library.bamLighting.push(JSON.parse(new TextDecoder().decode(bytes)));
        } catch {
          library.bamLighting.push(bytes);
        }
        categories.bamLight++;
        logMsg(`  💡 BAM Lighting: "${name}"`, 'ok');
      }
      else if (/bam.*(phys|config|conf|preset)/i.test(nameL)) {
        library.bamPhysics = library.bamPhysics || {};
        try {
          library.bamPhysics[name] = JSON.parse(new TextDecoder().decode(bytes));
        } catch {
          library.bamPhysics[name] = bytes;
        }
        categories.bamPhysics++;
        logMsg(`  ⚙️ BAM Config: "${name}"`, 'ok');
      }
      else if (/physics|preset|config/i.test(nameL) && nameL.endsWith('.json')) {
        try {
          const text = new TextDecoder('utf-8', { fatal: false }).decode(bytes);
          const preset = JSON.parse(text);
          const presetName = name.replace(/\.json$/i, '');
          library.physicsPresets[presetName] = preset;
          categories.physics++;
          logMsg(`  ⚙️ Physics: "${presetName}"`, 'ok');
        } catch { void 0; }
      }
      else if (/image|texture|gfx|playfield|backdrop|translite|sprite/i.test(nameL)) {
        const texture = await extractImageFromBytes(bytes);
        if (texture) {
          library.textureLibrary[name] = texture;
          categories.textures++;
          logMsg(`  🖼️ Texture: "${name}" (${(bytes.length/1024).toFixed(0)} KB)`, 'ok');
        }
      }
      else if (/music|musica|mus|msc(?!.*sound)/i.test(nameL)) {
        const sound = await extractSoundFromBytes(bytes);
        if (sound) {
          library.soundLibrary[name] = sound;
          categories.music++;
          logMsg(`  🎵 Music: "${name}" (${(sound as AudioBuffer).duration.toFixed(1)}s)`, 'ok');
        }
      }
      else if (/sound|snd|sfx|audio|effect|fx(?!.*music)/i.test(nameL)) {
        const sound = await extractSoundFromBytes(bytes);
        if (sound) {
          library.soundLibrary[name] = sound;
          categories.sounds++;
          logMsg(`  🔊 Sound: "${name}" (${(sound as AudioBuffer).duration.toFixed(2)}s)`, 'ok');
        }
      }
      else if (/voice|voc|vo|speech|narrator|quotes/i.test(nameL)) {
        const sound = await extractSoundFromBytes(bytes);
        if (sound) {
          library.voiceLibrary[name] = sound;
          categories.voices++;
          logMsg(`  🗣️ Voice: "${name}" (${(sound as AudioBuffer).duration.toFixed(2)}s)`, 'ok');
        }
      }
      else if (/model|mod|obj|3d|mesh|geometry/i.test(nameL)) {
        library.modelLibrary[name] = bytes;
        categories.models++;
        logMsg(`  🎲 Model: "${name}" (${(bytes.length/1024).toFixed(0)} KB)`, 'ok');
        // Try to parse as FPM format and register in AssetCatalog
        try {
          const fpmModel = parseFPM(bytes);
          if (fpmModel && fpmModel.vertices.length > 0) {
            const vertCount = fpmModel.vertices.length / 3;
            const triCount = fpmModel.indices.length / 3;
            const mesh = fpmToTHREE(fpmModel);
            const cat = globalAssetCatalog();
            if (cat && mesh) {
              const modelName = fpmModel.name;
              cat.registerModel(modelName, mesh);
              logMsg(`    → Registered "${modelName}" ${vertCount}v / ${triCount}tri`, 'ok');
            }
          }
        } catch (_e) {
          // FPM parse failed, data may be MS3D or another format
        }
      }
      else if (/font|dmd|ttf|char|character/i.test(nameL)) {
        library.fontLibrary[name] = bytes;
        categories.fonts++;
        logMsg(`  🔤 Font: "${name}" (${(bytes.length/1024).toFixed(0)} KB)`, 'ok');
      }
      else if (/script|vbs|code/i.test(nameL)) {
        try {
          const text = new TextDecoder('utf-8', { fatal: false }).decode(bytes);
          if (/\bSub\s+\w+/i.test(text)) {
            library.scriptLibrary[name] = text;
            categories.scripts++;
            logMsg(`  📝 Script: "${name}" (${text.split('\n').length} lines)`, 'ok');
          }
        } catch { void 0; }
      }
      else {
        categories.other++;
      }
    }

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

    const summary = Object.entries(categories)
      .filter(([, count]) => count > 0)
      .map(([type, count]) => `${count} ${type}`)
      .join(', ');

    logMsg(`✅ Library loaded: ${summary}`, 'ok');

    getLibraryCache().set(libName, library);
    onLoaded(library);
  } catch (err: any) {
    logMsg(`❌ FPL Parse Error: ${err.message}`, 'error');
    onError?.(err.message || 'Failed to parse FPL file');
  }
}
