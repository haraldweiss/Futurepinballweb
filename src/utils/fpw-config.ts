/**
 * fpw-config.ts — Runtime accessor for `.fpw-config.json`
 *
 * The installer (`installer.js`) writes `.fpw-config.json` at install time
 * with detected system info and an auto-tuned quality preset. This module
 * fetches that file at boot so the renderer can honour the auto-detected
 * settings on first run.
 *
 * The runtime is browser-only, so the file is exposed as a static asset by
 * Vite (see `vite.config.ts` — the dev middleware and the `buildStart` hook
 * copy `<projectRoot>/.fpw-config.json` so it sits next to `index.html` in
 * both `npm run dev` and `npm run build` outputs). Inside Electron the file
 * loads via `file://` from the same directory as `index.html`.
 */

export type QualityPresetName = 'low' | 'medium' | 'high' | 'ultra';

export interface FpwQualitySettings {
  shadowMapSize: number;
  bloomEnabled: boolean;
  particleCount: number;
  volumetricLighting: boolean;
  ssaoEnabled: boolean;
}

export interface FpwSystemInfo {
  os: string;
  osName: string;
  architecture: string;
  cpuCores: number;
  totalMemoryGB: number;
  nodeVersion: string;
}

export interface FpwDisplayInfo {
  screenCount: number;
  primaryResolution: { width: number; height: number };
  rotation: string;
}

export interface FpwConfig {
  system: FpwSystemInfo;
  display: FpwDisplayInfo;
  qualityPreset: QualityPresetName;
  qualitySettings: FpwQualitySettings;
  timestamp: string;
}

const VALID_PRESETS: ReadonlySet<string> = new Set(['low', 'medium', 'high', 'ultra']);

/**
 * Type-guard for a parsed JSON blob — returns true if it has the minimum
 * shape we rely on (`qualityPreset` is one of the four valid presets).
 * Anything else (extra fields, missing `system`/`display`) is tolerated.
 */
function isFpwConfig(value: unknown): value is FpwConfig {
  if (!value || typeof value !== 'object') return false;
  const v = value as { qualityPreset?: unknown };
  return typeof v.qualityPreset === 'string' && VALID_PRESETS.has(v.qualityPreset);
}

/**
 * Fetch `.fpw-config.json` relative to the current document so it works for
 * `npm run dev` (Vite dev server), `npm run preview` (static dist), and
 * Electron `file://` loads. Returns `null` (never throws) if the file is
 * missing or malformed — the caller falls back to the existing default.
 */
export async function loadFpwConfig(): Promise<FpwConfig | null> {
  try {
    // Use a URL relative to the current document so this works both for
    // http(s):// dev/preview servers and Electron's file:// scheme.
    const url = new URL('./.fpw-config.json', location.href);
    const response = await fetch(url.toString(), { cache: 'no-cache' });
    if (!response.ok) {
      // 404 is the expected case when the user hasn't run the installer yet.
      return null;
    }
    const data: unknown = await response.json();
    if (!isFpwConfig(data)) {
      console.warn('[fpw-config] .fpw-config.json is malformed; ignoring');
      return null;
    }
    return data;
  } catch (err) {
    // Network error, JSON parse error, missing file — all non-fatal.
    console.warn('[fpw-config] Could not load .fpw-config.json:',
      err instanceof Error ? err.message : err);
    return null;
  }
}
