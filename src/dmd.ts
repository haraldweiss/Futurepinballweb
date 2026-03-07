import { state, currentTableConfig } from './game';
import { getTopScores } from './highscore';

// ── DMD Konstanten ───────────────────────────────────────────────────────────
// ─── Phase 3: Configurable Resolution ───
export let DMD_W = 128, DMD_H = 32;
let DMD_DOT = 4, DMD_GAP = 1;
export let DMD_STEP = DMD_DOT + DMD_GAP;
const DMD_SCALE = 2;

// ─── Phase 3: Color Schemes ───────────────────────────────────────────────────
export interface DMDColorScheme {
  background: string;
  offColor: string;
  onColor: string;
  glowColor: string;
  accentColor: string;
}

const DMD_COLOR_SCHEMES: Record<string, DMDColorScheme> = {
  amber: {
    background: '#060100',
    offColor: '#180400',
    onColor: '#ffaa00',
    glowColor: '#ffaa00',
    accentColor: '#ffff00',
  },
  green: {
    background: '#001000',
    offColor: '#0a2000',
    onColor: '#00ff00',
    glowColor: '#00ff99',
    accentColor: '#ffff00',
  },
  red: {
    background: '#100000',
    offColor: '#200a00',
    onColor: '#ff3300',
    glowColor: '#ff6600',
    accentColor: '#ffff00',
  },
  white: {
    background: '#000000',
    offColor: '#0a0a0a',
    onColor: '#ffffff',
    glowColor: '#cccccc',
    accentColor: '#cccccc',
  },
};

// ─── Phase 3: DMD Rendering Options ───
export interface DMDOptions {
  enableGlow: boolean;
  glowIntensity: number;
  colorScheme: string;
  resolution: 'standard' | 'hires' | 'uhires';
}

export let dmdOptions: DMDOptions = {
  enableGlow: localStorage.getItem('fpw_dmd_glow') !== 'false',
  glowIntensity: 0.6,
  colorScheme: localStorage.getItem('fpw_dmd_color') || 'amber',
  resolution: (localStorage.getItem('fpw_dmd_res') || 'standard') as any,
};

// Apply resolution
function setDMDResolution(res: 'standard' | 'hires' | 'uhires') {
  switch (res) {
    case 'hires':   DMD_W = 256; DMD_H = 64;  DMD_DOT = 3; DMD_GAP = 0; break;
    case 'uhires':  DMD_W = 512; DMD_H = 128; DMD_DOT = 2; DMD_GAP = 0; break;
    default:        DMD_W = 128; DMD_H = 32;  DMD_DOT = 4; DMD_GAP = 1; break;
  }
  DMD_STEP = DMD_DOT + DMD_GAP;
  dmdOptions.resolution = res;
  localStorage.setItem('fpw_dmd_res', res);
}

setDMDResolution(dmdOptions.resolution);

export function setDMDColorScheme(scheme: string): void {
  if (scheme in DMD_COLOR_SCHEMES) {
    dmdOptions.colorScheme = scheme;
    localStorage.setItem('fpw_dmd_color', scheme);
  }
}

export function setDMDResolutionOption(res: 'standard' | 'hires' | 'uhires'): void {
  setDMDResolution(res);
}

export function setDMDGlow(enabled: boolean): void {
  dmdOptions.enableGlow = enabled;
  localStorage.setItem('fpw_dmd_glow', enabled.toString());
}

// ── Canvas-Setup ─────────────────────────────────────────────────────────────
const dmdCanvas = document.getElementById('dmd') as HTMLCanvasElement;
function updateCanvasSize() {
  dmdCanvas.width  = DMD_W * DMD_STEP;
  dmdCanvas.height = DMD_H * DMD_STEP;
}
updateCanvasSize();
const dmdCtx = dmdCanvas.getContext('2d')!;

const dmdOff = document.createElement('canvas');
function updateOffscreenSize() {
  dmdOff.width  = DMD_W * DMD_SCALE;
  dmdOff.height = DMD_H * DMD_SCALE;
}
updateOffscreenSize();
const dmdOff2d = dmdOff.getContext('2d')!;
dmdOff2d.imageSmoothingEnabled = true;

// ── Modus (Dot / Solid) ───────────────────────────────────────────────────────
export let dmdSolidMode = localStorage.getItem('fpw_dmd_mode') === 'solid';

export function toggleDMDMode(): void {
  dmdSolidMode = !dmdSolidMode;
  localStorage.setItem('fpw_dmd_mode', dmdSolidMode ? 'solid' : 'dot');
  const btn = document.getElementById('dmd-mode-btn');
  if (btn) btn.textContent = dmdSolidMode ? 'SOLID' : 'DOT';
}

// ─── Phase 3: Dirty Rectangle Tracking ───────────────────────────────────────
interface DirtyRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

class DirtyRectTracker {
  private rects: DirtyRect[] = [];
  private fullRedraw = true;

  markDirty(x: number, y: number, width: number = 1, height: number = 1): void {
    this.rects.push({ x, y, width, height });
  }

  markFullDirty(): void {
    this.fullRedraw = true;
    this.rects = [];
  }

  getDirtyRects(): DirtyRect[] {
    if (this.fullRedraw) {
      this.fullRedraw = false;
      this.rects = [];
      return [{ x: 0, y: 0, width: DMD_W, height: DMD_H }];
    }

    if (this.rects.length === 0) return [];

    // Merge overlapping rectangles
    const merged = this.mergeRectangles(this.rects);
    this.rects = [];
    return merged;
  }

  private mergeRectangles(rects: DirtyRect[]): DirtyRect[] {
    if (rects.length === 0) return [];
    if (rects.length === 1) return rects;

    const sorted = rects.sort((a, b) => a.x !== b.x ? a.x - b.x : a.y - b.y);
    const merged: DirtyRect[] = [sorted[0]];

    for (let i = 1; i < sorted.length; i++) {
      const current = sorted[i];
      const last = merged[merged.length - 1];

      // Check if rectangles overlap or touch
      if (
        current.x <= last.x + last.width &&
        current.x + current.width >= last.x &&
        current.y <= last.y + last.height &&
        current.y + current.height >= last.y
      ) {
        // Merge: expand last rectangle to contain current
        const minX = Math.min(last.x, current.x);
        const minY = Math.min(last.y, current.y);
        const maxX = Math.max(last.x + last.width, current.x + current.width);
        const maxY = Math.max(last.y + last.height, current.y + current.height);

        merged[merged.length - 1] = {
          x: minX,
          y: minY,
          width: maxX - minX,
          height: maxY - minY,
        };
      } else {
        merged.push(current);
      }
    }

    return merged;
  }
}

const dirtyRectTracker = new DirtyRectTracker();

// ── DMD State ─────────────────────────────────────────────────────────────────
export const dmdState = {
  mode:       'attract' as 'attract' | 'playing' | 'event' | 'gameover',
  eventText:  '',
  eventTimer: 0,
  scrollX:    0,
  animFrame:  0,
};

// ── Draw helpers ──────────────────────────────────────────────────────────────
/**
 * ─── Phase 3: Enhanced Text Rendering ───
 * Supports different font sizes and scales for multi-resolution DMD
 */
function dmdDrawText(text: string, x: number, y: number, size: number, align: CanvasTextAlign = 'center', style?: 'normal' | 'bold' | 'glow'): void {
  const S = DMD_SCALE;
  const weight = style === 'bold' ? 'bold' : 'normal';
  dmdOff2d.font      = `${weight} ${size * S}px "Courier New", monospace`;
  dmdOff2d.textAlign = align;
  dmdOff2d.fillStyle = '#fff';

  // ─── Phase 3: Text effect - glow for special text ───
  if (style === 'glow') {
    dmdOff2d.shadowColor = '#fff';
    dmdOff2d.shadowBlur = 3;
    dmdOff2d.shadowOffsetX = 0;
    dmdOff2d.shadowOffsetY = 0;
  }

  dmdOff2d.fillText(text, x * S, y * S);

  if (style === 'glow') {
    dmdOff2d.shadowColor = 'transparent';
    dmdOff2d.shadowBlur = 0;
  }
}

export function dmdClear(): void {
  dmdOff2d.fillStyle = '#000';
  dmdOff2d.fillRect(0, 0, DMD_W * DMD_SCALE, DMD_H * DMD_SCALE);
}

/**
 * ─── Phase 3: Enhanced dmdFlush with LED glow effects ───
 * Renders DMD with individual LED dots, optional glow halos, and multi-color support
 */
export function dmdFlush(): void {
  const colorScheme = DMD_COLOR_SCHEMES[dmdOptions.colorScheme] || DMD_COLOR_SCHEMES.amber;

  // Background fill
  dmdCtx.fillStyle = colorScheme.background;
  dmdCtx.fillRect(0, 0, dmdCanvas.width, dmdCanvas.height);

  if (dmdSolidMode) {
    // Solid mode: full smooth rendering with color overlay
    dmdCtx.save();
    dmdCtx.imageSmoothingEnabled = true;
    dmdCtx.imageSmoothingQuality = 'high';
    dmdCtx.drawImage(dmdOff, 0, 0, dmdCanvas.width, dmdCanvas.height);
    dmdCtx.globalCompositeOperation = 'multiply';

    // Extract RGB from onColor (hex format)
    const hexColor = colorScheme.onColor;
    const rgb = parseInt(hexColor.slice(1), 16);
    const r = (rgb >> 16) & 255, g = (rgb >> 8) & 255, b = rgb & 255;
    dmdCtx.fillStyle = `rgb(${r},${g},${b})`;

    dmdCtx.fillRect(0, 0, dmdCanvas.width, dmdCanvas.height);
    dmdCtx.restore();
    return;
  }

  // Dot mode: individual LED dots with optional glow
  const S  = DMD_SCALE;
  const px = dmdOff2d.getImageData(0, 0, DMD_W * S, DMD_H * S).data;

  // ─── Phase 3: LED Rendering with Glow ───
  for (let row = 0; row < DMD_H; row++) {
    for (let col = 0; col < DMD_W; col++) {
      const sr = row * S + (S >> 1), sc = col * S + (S >> 1);
      const brightness  = px[(sr * DMD_W * S + sc) * 4];  // Brightness from rendered text
      const cx = col * DMD_STEP + DMD_DOT * 0.5;
      const cy = row * DMD_STEP + DMD_DOT * 0.5;

      if (brightness > 20) {
        const t = brightness / 255;
        const lev = t < 0.25 ? 0.25 : t < 0.5 ? 0.5 : t < 0.75 ? 0.75 : 1.0;
        const a = 0.40 + 0.60 * lev;

        // ─── Glow Halo (if enabled) ───
        if (dmdOptions.enableGlow && DMD_DOT >= 3) {
          const glowRadius = DMD_DOT + 1.5;
          const glowGradient = dmdCtx.createRadialGradient(cx, cy, DMD_DOT * 0.44, cx, cy, glowRadius);

          const glowColor = colorScheme.glowColor;
          const rgb = parseInt(glowColor.slice(1), 16);
          const r = (rgb >> 16) & 255, g = (rgb >> 8) & 255, b = rgb & 255;

          glowGradient.addColorStop(0, `rgba(${r},${g},${b},${a * dmdOptions.glowIntensity})`);
          glowGradient.addColorStop(1, `rgba(${r},${g},${b},0)`);
          dmdCtx.fillStyle = glowGradient;
          dmdCtx.beginPath();
          dmdCtx.arc(cx, cy, glowRadius, 0, Math.PI * 2);
          dmdCtx.fill();
        }

        // ─── Core LED Dot ───
        const rgb = parseInt(colorScheme.onColor.slice(1), 16);
        const r = (rgb >> 16) & 255, g = (rgb >> 8) & 255, b = rgb & 255;
        dmdCtx.fillStyle = `rgba(${r},${g},${b},${a})`;
        dmdCtx.beginPath();
        dmdCtx.arc(cx, cy, DMD_DOT * 0.44, 0, Math.PI * 2);
        dmdCtx.fill();

        // ─── Optional Reflection Highlight ───
        if (lev > 0.6 && DMD_DOT > 2) {
          dmdCtx.fillStyle = `rgba(255,255,255,${a * 0.3})`;
          dmdCtx.beginPath();
          dmdCtx.arc(cx - DMD_DOT * 0.3, cy - DMD_DOT * 0.3, DMD_DOT * 0.2, 0, Math.PI * 2);
          dmdCtx.fill();
        }
      } else {
        // Off LED: subtle dim dot
        dmdCtx.fillStyle = colorScheme.offColor;
        dmdCtx.beginPath();
        dmdCtx.arc(cx, cy, DMD_DOT * 0.3, 0, Math.PI * 2);
        dmdCtx.fill();
      }
    }
  }
}

// ── Render-Funktionen ────────────────────────────────────────────────────────
export function dmdRenderAttract(): void {
  dmdClear();
  const phase = Math.floor(dmdState.animFrame / 150) % 3;
  if (phase === 1) {
    const scores = getTopScores();
    dmdDrawText('HIGH SCORES', DMD_W / 2, 9, 9);
    if (scores[0]) dmdDrawText(`#1  ${scores[0].toLocaleString()}`, DMD_W / 2, 21, 7);
    if (scores[1]) dmdDrawText(`#2  ${scores[1].toLocaleString()}`, DMD_W / 2, 30, 6);
  } else if (phase === 2) {
    dmdDrawText('ENTER HALTEN = PLUNGER',      DMD_W / 2, 10, 7);
    dmdDrawText('Z / X = TILT   M = MUSIK',    DMD_W / 2, 22, 7);
    dmdDrawText('LEFT/RIGHT SHIFT = FLIPPER',  DMD_W / 2, 30, 6);
  } else {
    const S   = DMD_SCALE;
    const msg = '  FUTURE PINBALL WEB  \u2014 INSERT COIN \u2014  ';
    dmdOff2d.font      = `bold ${8 * S}px "Courier New", monospace`;
    dmdOff2d.textAlign = 'left';
    dmdOff2d.fillStyle = '#fff';
    const w = dmdOff2d.measureText(msg).width;
    const x = DMD_W * S - ((dmdState.scrollX * 0.6 * S) % (w + DMD_W * S));
    dmdOff2d.fillText(msg, x, 13 * S);
    dmdOff2d.fillStyle = '#aaa';
    dmdOff2d.font      = `bold ${6 * S}px "Courier New", monospace`;
    dmdOff2d.textAlign = 'center';
    dmdOff2d.fillText('FUTURE PINBALL WEB v1.0', DMD_W * S / 2, 27 * S);
  }
  dmdState.scrollX++;
  dmdFlush();
}

export function dmdRenderPlaying(): void {
  dmdClear();
  const scoreStr = state.score.toLocaleString().padStart(12, ' ');
  dmdDrawText(scoreStr, DMD_W / 2, 14, 14);
  const tname = (currentTableConfig ? currentTableConfig.name : 'FUTURE PINBALL').toUpperCase();
  dmdDrawText(`BALL ${state.ballNum}/3   \u00d7${state.multiplier}   ${tname}`, DMD_W / 2, 28, 7);
  dmdFlush();
}

export function dmdRenderEvent(): void {
  dmdClear();
  const flash = Math.floor(dmdState.animFrame / 7) % 2 === 0;
  if (flash) dmdDrawText(dmdState.eventText, DMD_W / 2, 13, 11);
  dmdDrawText(`+${100 * state.multiplier} PTS`, DMD_W / 2, 28, 7);
  dmdFlush();
}

export function dmdRenderGameOver(): void {
  dmdClear();
  const flash = Math.floor(dmdState.animFrame / 18) % 2 === 0;
  if (state.lastRank === 1 && flash) {
    dmdDrawText('NEW HIGH SCORE!', DMD_W / 2, 10, 10);
  } else if (flash) {
    dmdDrawText('GAME OVER', DMD_W / 2, 10, 13);
  }
  const rankStr = state.lastRank ? `RANK #${state.lastRank}  ` : '';
  dmdDrawText(rankStr + 'SCORE: ' + state.lastScore.toLocaleString(), DMD_W / 2, 26, 7);
  dmdFlush();
}

// ── Update (jeden Frame aufrufen) ─────────────────────────────────────────────
export function dmdUpdate(): void {
  dmdState.animFrame++;
  let modeChanged = false;

  // ─── Phase 3: Track mode changes for full redraw ───
  const prevMode = dmdState.mode;

  if (dmdState.eventTimer > 0) {
    dmdState.eventTimer--;
    dmdState.mode = 'event';
  } else if (dmdState.mode === 'event') {
    dmdState.mode = 'playing';
  }

  if (dmdState.mode !== prevMode) {
    modeChanged = true;
    dirtyRectTracker.markFullDirty();
  }

  switch (dmdState.mode) {
    case 'attract':  dmdRenderAttract();  break;
    case 'playing':  dmdRenderPlaying();  break;
    case 'event':    dmdRenderEvent();    break;
    case 'gameover': dmdRenderGameOver(); break;
  }

  // ─── Phase 3: Mark canvas dirty for next render ───
  if (modeChanged || dmdState.animFrame % 1 === 0) {
    // For now, mark full dirty on every frame (can optimize to partial later)
    // as text content changes frequently
    dirtyRectTracker.markFullDirty();
  }
}

/** Löst einen DMD-Event-Flash aus (~1 Sekunde). */
export function dmdEvent(text: string): void {
  dmdState.eventText  = text;
  dmdState.eventTimer = 55;
  dmdState.animFrame  = 0;
  dmdState.mode       = 'event';
}

// ─── Phase 3: Export color schemes and options for UI ───
export const DMD_COLOR_SCHEME_NAMES = Object.keys(DMD_COLOR_SCHEMES);
export const DMD_RESOLUTIONS = [
  { id: 'standard', label: '128×32', width: 128, height: 32 },
  { id: 'hires', label: '256×64', width: 256, height: 64 },
  { id: 'uhires', label: '512×128', width: 512, height: 128 },
] as const;

/**
 * ─── Phase 3: Get dirty rectangles for optimization ───
 * Returns list of areas that need redrawing
 */
export function getDMDDirtyRects(): DirtyRect[] {
  return dirtyRectTracker.getDirtyRects();
}

/**
 * Get current DMD configuration
 */
export function getDMDConfig() {
  return {
    colorScheme: dmdOptions.colorScheme,
    resolution: dmdOptions.resolution,
    enableGlow: dmdOptions.enableGlow,
    glowIntensity: dmdOptions.glowIntensity,
    solidMode: dmdSolidMode,
  };
}

/**
 * Cycle to next resolution
 */
export function cycleDMDResolution(): void {
  const current = DMD_RESOLUTIONS.findIndex(r => r.id === dmdOptions.resolution);
  const next = (current + 1) % DMD_RESOLUTIONS.length;
  setDMDResolutionOption(DMD_RESOLUTIONS[next].id as any);
  updateCanvasSize();
  updateOffscreenSize();
}

/**
 * Cycle to next color scheme
 */
export function cycleDMDColorScheme(): void {
  const current = DMD_COLOR_SCHEME_NAMES.indexOf(dmdOptions.colorScheme);
  const next = (current + 1) % DMD_COLOR_SCHEME_NAMES.length;
  setDMDColorScheme(DMD_COLOR_SCHEME_NAMES[next]);
}

export { dmdCanvas };
