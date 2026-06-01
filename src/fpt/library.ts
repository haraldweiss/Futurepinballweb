// SPDX-License-Identifier: AGPL-3.0-or-later
// © 2026 Harald Weiss
import { logMsg } from './log';
import { getLibraryCache } from '../library-cache';

// ─── Library Dependency Detection ──────────────────────────────────────────
export interface LibraryDependency {
  name: string;
  type: 'graphics' | 'sound' | 'music' | 'script' | 'font' | 'model' | 'voice' | 'unknown';
  required: boolean;
  loaded: boolean;
  suggestedPath?: string;
}

// Get cached library by name (Phase 5: now uses TTL-enabled cache)
export function getLibraryByName(name: string): any | null {
  return getLibraryCache().get(name) || null;
}

export function detectLibraryDependencies(tableName: string, script: string | null, coordCount: number): LibraryDependency[] {
  const dependencies = new Map<string, LibraryDependency>();

  if (!script) {
    // Heuristic-based detection from table name
    logMsg(`ℹ️ Keine Script-Analyse möglich, verwende Tabellen-Name Heuristik`, 'info');
  } else {
    const scriptL = script.toLowerCase();

    // Pattern matching for library references in VBScript
    const patterns = [
      { regex: /load(?:texture|gfx|image|graphic)\s*\(\s*["']([^"']+)["']/gi, type: 'graphics' as const },
      { regex: /load(?:sound|sfx|audio|effect|fx)\s*\(\s*["']([^"']+)["']/gi, type: 'sound' as const },
      { regex: /play(?:music|song|track|mus|msc)\s*\(\s*["']([^"']+)["']/gi, type: 'music' as const },
      { regex: /load(?:script|code|vbs|lib)\s*\(\s*["']([^"']+)["']/gi, type: 'script' as const },
      { regex: /load(?:font|dmd|char|text)\s*\(\s*["']([^"']+)["']/gi, type: 'font' as const },
      { regex: /load(?:model|mesh|3d|obj|geometry)\s*\(\s*["']([^"']+)["']/gi, type: 'model' as const },
      { regex: /play(?:voice|speech|narrator|voc|vo)\s*\(\s*["']([^"']+)["']/gi, type: 'voice' as const },
    ];

    for (const { regex, type } of patterns) {
      let match;
      while ((match = regex.exec(scriptL)) !== null) {
        const libName = match[1].trim();
        if (libName && libName.length > 0 && !libName.endsWith('.')) {
          const key = libName.toLowerCase();
          if (!dependencies.has(key)) {
            // Phase 5: Check TTL-enabled cache
            const loaded = getLibraryCache().has(libName) || getLibraryCache().has(key);
            dependencies.set(key, {
              name: libName,
              type,
              required: true,
              loaded,
            });
          }
        }
      }
    }
  }

  // Common libraries based on table name patterns
  const commonLibPatterns = [
    { pattern: /star.*trek|trek|spock/i, libs: ['Star Trek MU_textures.fpl', 'Star Trek MU_sounds.fpl', 'Star Trek MU_music.fpl'] },
    { pattern: /terminator|t2|1991/i, libs: ['T2_GFX.fpl', 'T2_SoundEffects.fpl', 'T2_Music.fpl'] },
    { pattern: /addams|family|morticia|wednesday/i, libs: ['AFGfx.fpl', 'AFMusic.fpl', 'AFMusic.fpl'] },
    { pattern: /alien|aliens|ripley/i, libs: ['ripley_dmd.fpl', 'ripley_musica.fpl', 'ripley_sonidos.fpl'] },
    { pattern: /ghostbuster|ghost|ecto/i, libs: ['ghostbuster_gfx.fpl', 'ghostbuster_musics.fpl', 'ghostbuster_sounds.fpl'] },
    { pattern: /back.*future|bttf|delorean/i, libs: ['bttftextures.fpl', 'bttfmusic.fpl', 'bttfsfx.fpl'] },
    { pattern: /williams|bally|gottlieb|stern|em|electro/i, libs: ['fpTextures.fpl', 'fpSounds.fpl'] },
  ];

  for (const { pattern, libs } of commonLibPatterns) {
    if (pattern.test(tableName)) {
      for (const libName of libs) {
        const key = libName.toLowerCase();
        if (!dependencies.has(key)) {
          const type = libName.includes('music') || libName.includes('mus') || libName.includes('msc')
            ? 'music'
            : libName.includes('sound') || libName.includes('snd') || libName.includes('sfx') || libName.includes('fx')
            ? 'sound'
            : libName.includes('voice') || libName.includes('voc') || libName.includes('vo') || libName.includes('speech')
            ? 'voice'
            : libName.includes('font') || libName.includes('dmd') || libName.includes('char')
            ? 'font'
            : 'graphics';

          // Phase 5: Check TTL-enabled cache
          const loaded = getLibraryCache().has(libName) || getLibraryCache().has(key);
          dependencies.set(key, {
            name: libName,
            type,
            required: false,
            loaded,
          });
        }
      }
    }
  }

  return Array.from(dependencies.values());
}

// Get missing libraries for a table
export function getMissingLibraries(dependencies: LibraryDependency[]): LibraryDependency[] {
  return dependencies.filter(dep => !dep.loaded && dep.required);
}

// Format library dependency for display
export function formatLibraryDependencies(dependencies: LibraryDependency[]): string {
  const byType = new Map<string, LibraryDependency[]>();
  for (const dep of dependencies) {
    if (!byType.has(dep.type)) byType.set(dep.type, []);
    byType.get(dep.type)!.push(dep);
  }

  let result = '';
  const typeEmojis: Record<string, string> = {
    graphics: '🖼️',
    sound: '🔊',
    music: '🎵',
    script: '📝',
    font: '🔤',
    model: '🎲',
    voice: '🗣️',
    unknown: '❓',
  };

  for (const [type, deps] of byType) {
    const emoji = typeEmojis[type] || '📦';
    result += `${emoji} ${type.toUpperCase()}: ${deps.map(d => d.name).join(', ')}\n`;
  }
  return result;
}

// Merge multiple libraries (for combined resource loading)
export function mergeLibraries(libraries: any[]): any {
  const merged = {
    name: 'Merged',
    tableTemplates: {},
    physicsPresets: {},
    soundLibrary: {},
    textureLibrary: {},
    modelLibrary: {},
    fontLibrary: {},
    scriptLibrary: {},
    voiceLibrary: {},
  };

  for (const lib of libraries) {
    if (!lib) continue;
    Object.assign(merged.tableTemplates, lib.tableTemplates || {});
    Object.assign(merged.physicsPresets, lib.physicsPresets || {});
    Object.assign(merged.soundLibrary, lib.soundLibrary || {});
    Object.assign(merged.textureLibrary, lib.textureLibrary || {});
    Object.assign(merged.modelLibrary, lib.modelLibrary || {});
    Object.assign(merged.fontLibrary, lib.fontLibrary || {});
    Object.assign(merged.scriptLibrary, lib.scriptLibrary || {});
    Object.assign(merged.voiceLibrary, lib.voiceLibrary || {});
  }

  return merged;
}
