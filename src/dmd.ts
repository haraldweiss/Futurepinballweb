// SPDX-License-Identifier: AGPL-3.0-or-later
// © 2026 Harald Weiss
import { state, currentTableConfig } from './game';
import { getTopScores } from './highscore';
import { getDMDSize, getDMDDotSize, onDisplayResize } from './responsive-display';
import { dmdBoundsTracker } from './dmd-bounds-tracker';
import { coinSystemState } from './coin-system';

// ── DMD Konstanten ───────────────────────────────────────────────────────────
// ─── Phase 3: Configurable Resolution ───
export let DMD_W = 128, DMD_H = 32;
let DMD_DOT = 4, DMD_GAP = 1;
export let DMD_STEP = DMD_DOT + DMD_GAP;
let DMD_SCALE = 2;  // Dynamic scale based on screen size

// ─── Responsive DMD Scaling ───
function calculateResponsiveDMDScale(): number {
  // Calculate scale based on window height
  // Min 1x (small screens), max 6x (large screens)
  const minHeight = 256;  // Minimum practical height
  const maxHeight = 1080; // Maximum practical height

  const availableHeight = window.innerHeight - 80;  // Account for UI chrome
  const scale = Math.max(1, Math.min(6, Math.floor(availableHeight / 32))); // 32 = DMD_H

  return scale;
}

function updateResponsiveDMDScale(): void {
  const newScale = calculateResponsiveDMDScale();
  if (newScale !== DMD_SCALE) {
    DMD_SCALE = newScale;
    DMD_STEP = DMD_DOT + DMD_GAP;
    console.log(`📺 DMD scale adjusted to ${DMD_SCALE}x for ${window.innerHeight}px height`);
    // Trigger re-render
    dmdClear();
  }
}

// ─── DMD Drag-to-Resize System ───
let isDraggingDMD = false;
let dragStartX = 0;
let dragStartY = 0;
let dragStartWidth = 0;
let dragStartHeight = 0;
let currentDragHandle = '';

const RESIZE_HANDLE_SIZE = 12;
const MIN_DMD_WIDTH = 256;
const MIN_DMD_HEIGHT = 64;
const DMD_RESIZE_STORAGE_KEY = 'fpw_dmd_custom_size';

export function initDMDResizing(canvas: HTMLCanvasElement, wrap: HTMLElement): void {
  // Create resize handles
  const createHandle = (position: string) => {
    const handle = document.createElement('div');
    handle.className = `dmd-resize-handle dmd-resize-${position}`;
    handle.style.cssText = `
      position: absolute;
      width: ${RESIZE_HANDLE_SIZE}px;
      height: ${RESIZE_HANDLE_SIZE}px;
      background: rgba(255, 170, 0, 0.3);
      border: 2px solid rgba(255, 170, 0, 0.8);
      cursor: ${getCursorForHandle(position)};
      z-index: 1000;
    `;

    // Position handle based on corner/edge
    if (position.includes('top-left')) handle.style.top = '-6px';
    else if (position.includes('top-right')) handle.style.top = '-6px';
    else if (position.includes('bottom-left')) handle.style.bottom = '-6px';
    else if (position.includes('bottom-right')) handle.style.bottom = '-6px';

    if (position.includes('left')) handle.style.left = '-6px';
    else if (position.includes('right')) handle.style.right = '-6px';

    handle.addEventListener('mousedown', (e) => startDMDDrag(e, position, canvas, wrap));
    return handle;
  };

  wrap.style.position = 'relative';
  wrap.style.userSelect = 'none';

  // Add corner handles
  ['top-left', 'top-right', 'bottom-left', 'bottom-right'].forEach(pos => {
    wrap.appendChild(createHandle(pos));
  });

  // Load custom size if saved
  loadDMDCustomSize(canvas, wrap);

  console.log('📺 DMD resize system initialized - drag corners to resize');
}

function getCursorForHandle(position: string): string {
  if (position === 'top-left') return 'nwse-resize';
  if (position === 'top-right') return 'nesw-resize';
  if (position === 'bottom-left') return 'nesw-resize';
  if (position === 'bottom-right') return 'nwse-resize';
  return 'pointer';
}

function startDMDDrag(e: MouseEvent, handle: string, canvas: HTMLCanvasElement, wrap: HTMLElement): void {
  isDraggingDMD = true;
  currentDragHandle = handle;
  dragStartX = e.clientX;
  dragStartY = e.clientY;
  dragStartWidth = canvas.offsetWidth;
  dragStartHeight = canvas.offsetHeight;

  e.preventDefault();

  const handleDMDDrag = (moveEvent: MouseEvent) => {
    const deltaX = moveEvent.clientX - dragStartX;
    const deltaY = moveEvent.clientY - dragStartY;

    let newWidth = dragStartWidth;
    let newHeight = dragStartHeight;

    // Calculate new dimensions based on which corner is being dragged
    if (handle.includes('right')) newWidth = Math.max(MIN_DMD_WIDTH, dragStartWidth + deltaX);
    if (handle.includes('bottom')) newHeight = Math.max(MIN_DMD_HEIGHT, dragStartHeight + deltaY);
    if (handle.includes('left')) newWidth = Math.max(MIN_DMD_WIDTH, dragStartWidth - deltaX);
    if (handle.includes('top')) newHeight = Math.max(MIN_DMD_HEIGHT, dragStartHeight - deltaY);

    // Maintain 4:1 aspect ratio (128:32)
    const targetAspect = 128 / 32;
    const currentAspect = newWidth / newHeight;

    if (Math.abs(currentAspect - targetAspect) > 0.1) {
      if (currentAspect > targetAspect) {
        newHeight = newWidth / targetAspect;
      } else {
        newWidth = newHeight * targetAspect;
      }
    }

    canvas.style.width = `${newWidth  }px`;
    canvas.style.height = `${newHeight  }px`;

    // Update DMD scale based on new size
    const newScale = Math.max(1, Math.floor(newHeight / 32));
    if (newScale !== DMD_SCALE) {
      DMD_SCALE = newScale;
      console.log(`📺 DMD resized to ${newWidth}x${newHeight}px (scale: ${DMD_SCALE}x)`);
    }
  };

  const stopDMDDrag = () => {
    isDraggingDMD = false;
    window.removeEventListener('mousemove', handleDMDDrag);
    window.removeEventListener('mouseup', stopDMDDrag);

    // Save custom size
    saveDMDCustomSize(canvas.offsetWidth, canvas.offsetHeight);
  };

  window.addEventListener('mousemove', handleDMDDrag);
  window.addEventListener('mouseup', stopDMDDrag);
}

function saveDMDCustomSize(width: number, height: number): void {
  try {
    localStorage.setItem(DMD_RESIZE_STORAGE_KEY, JSON.stringify({ width, height }));
    console.log(`✓ DMD size saved: ${width}x${height}px`);
  } catch (e) {
    console.warn('Could not save DMD size:', e);
  }
}

function loadDMDCustomSize(canvas: HTMLCanvasElement, wrap: HTMLElement): void {
  try {
    const saved = localStorage.getItem(DMD_RESIZE_STORAGE_KEY);
    if (saved) {
      const { width, height } = JSON.parse(saved);
      canvas.style.width = `${width  }px`;
      canvas.style.height = `${height  }px`;
      const newScale = Math.max(1, Math.floor(height / 32));
      DMD_SCALE = newScale;
      console.log(`📺 DMD restored to saved size: ${width}x${height}px (scale: ${DMD_SCALE}x)`);
    }
  } catch (e) {
    console.warn('Could not load DMD size:', e);
  }
}

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

export const dmdOptions: DMDOptions = {
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
  // ─── Responsive DMD Sizing ───
  const dmdSize = getDMDSize();
  dmdCanvas.width = dmdSize.canvasWidth;
  dmdCanvas.height = dmdSize.canvasHeight;
  dmdCanvas.style.width = `${dmdSize.displayWidth}px`;
  dmdCanvas.style.height = `${dmdSize.displayHeight}px`;

  // Scale canvas context if needed
  const scale = dmdSize.scale;
  if (scale && scale !== 1) {
    const ctx = dmdCanvas.getContext('2d');
    if (ctx) {
      ctx.scale(scale, scale);
    }
  }
}
updateCanvasSize();

// ─── Initialize DMD Bounds Tracker ──
const dmdWrap = document.getElementById('dmd-wrap');
if (dmdCanvas && dmdWrap) {
  dmdBoundsTracker.initialize(dmdCanvas, dmdWrap);
  console.log('📍 DMD bounds tracker initialized');
}

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
// Default to solid mode — the LED-dot rendering at 128x32 native resolution
// makes most text unreadable on modern high-DPI displays. SOLID renders the
// underlying smooth canvas with the LED color overlay, which is far more
// legible. Users can still toggle to DOT mode via the button if they prefer
// the retro look.
export let dmdSolidMode = (localStorage.getItem('fpw_dmd_mode') ?? 'solid') === 'solid';

export function toggleDMDMode(): void {
  dmdSolidMode = !dmdSolidMode;
  localStorage.setItem('fpw_dmd_mode', dmdSolidMode ? 'solid' : 'dot');
  const btn = document.getElementById('dmd-mode-btn');
  if (btn) btn.textContent = dmdSolidMode ? 'SOLID' : 'DOT';
}

// ─── Responsive DMD Resize Handler ───────────────────────────────────────────
window.addEventListener('resize', () => {
  clearTimeout((window as any).dmdResizeTimer);
  (window as any).dmdResizeTimer = setTimeout(() => {
    updateCanvasSize();
  }, 150);
});

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
//
// Mode lifecycle (per table session):
//   tableinfo  — boot scroll: TABLENAME · BY AUTHOR · YEAR  (≈4-5 sec)
//   attract    — idle: "INSERT COIN TO PLAY" cycling with high scores / controls
//   launch     — coin inserted, waiting for the player to release the plunger
//   playing    — game in progress: live score + ball/mult/tablename
//   event      — temporary in-game notification (BUMPER!, MULTIBALL!, …)
//                auto-reverts to playing when eventTimer hits 0
//   gameover   — final score screen
//
// State transitions are driven from main.ts:
//   loadDemoTable     → 'tableinfo' (with bootTimer)
//   tableinfo expires → 'attract'
//   coin / startGame  → 'launch'
//   plunger fires     → 'playing'
//   game over         → 'gameover'
export const dmdState = {
  mode:       'tableinfo' as 'tableinfo' | 'attract' | 'launch' | 'playing' | 'event' | 'gameover',
  eventText:  '',
  eventTimer: 0,
  bootTimer:  0,    // counts down 'tableinfo' → 'attract' (set by main when loading a table)
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
// Legacy alias: external callers (separate backglass window) still import
// dmdRenderAttract by name. The real attract-mode logic lives below in
// dmdRenderInsertCoin — forward to it.
export function dmdRenderAttract(): void {
  dmdRenderInsertCoin();
}

/**
 * Render text on the offscreen DMD buffer. If it fits the display, draws it
 * centered. If it overflows, scrolls it horizontally so the user can still
 * read the full content over time.
 *
 * Direction: 'right' means the text travels left-to-right across the panel
 * (entry from left edge, exit at right edge), 'left' is the traditional
 * ticker tape direction.
 */
function dmdDrawTextOrScroll(
  text: string,
  y: number,
  size: number,
  speedPxPerFrame: number = 0.5,
  direction: 'left' | 'right' = 'right'
): void {
  const S = DMD_SCALE;
  const fontStr = `normal ${size * S}px "Courier New", monospace`;
  dmdOff2d.font = fontStr;
  const measured = dmdOff2d.measureText(text).width;
  const displayPx = DMD_W * S;
  const safeWidthPx = displayPx - 2 * S;  // small horizontal padding

  if (measured <= safeWidthPx) {
    // Fits \u2014 draw centered exactly like before
    dmdDrawText(text, DMD_W / 2, y, size);
    return;
  }

  // Overflows \u2014 scroll. Pad with spaces so two consecutive cycles have a
  // visible gap and read as one repeating line, not as touching characters.
  const padded = `${text  }    `;
  dmdOff2d.font = fontStr;
  const cycleW = dmdOff2d.measureText(padded).width;
  const t = (dmdState.animFrame * speedPxPerFrame * S) % cycleW;

  // Position of first copy. For 'right' the text emerges from the left edge
  // and moves rightward; for 'left' it emerges from the right edge and moves
  // leftward (classic ticker tape).
  const x0 = direction === 'right' ? -cycleW + t : displayPx - t;

  dmdOff2d.fillStyle = '#fff';
  dmdOff2d.textAlign = 'left';
  dmdOff2d.textBaseline = 'alphabetic';
  // Draw two adjacent copies for a seamless wrap.
  dmdOff2d.fillText(padded, x0, y * S);
  dmdOff2d.fillText(padded, x0 + cycleW, y * S);
}

export function dmdRenderPlaying(): void {
  dmdClear();
  const scoreStr = state.score.toLocaleString().padStart(12, ' ');
  dmdDrawText(scoreStr, DMD_W / 2, 14, 14);
  const tname = (currentTableConfig ? currentTableConfig.name : 'FUTURE PINBALL').toUpperCase();

  // Show player info if multiplayer
  let playerInfo = '';
  if (state.numPlayers > 1) {
    playerInfo = `P${state.currentPlayer} `;
  }

  // Status line \u2014 fits at default font on most table names; long names
  // (e.g. "PHARAOH'S GOLD") may overflow and will then scroll.
  dmdDrawTextOrScroll(
    `${playerInfo}BALL ${state.ballNum}/3   \u00d7${state.multiplier}   ${tname}`,
    28, 7
  );
  dmdFlush();
}

export function dmdRenderEvent(): void {
  dmdClear();
  // Event text \u2014 scrolls if it overflows, otherwise centered. No flash.
  dmdDrawTextOrScroll(dmdState.eventText, 13, 11);
  dmdDrawText(`+${100 * state.multiplier} PTS`, DMD_W / 2, 28, 7);
  dmdFlush();
}

export function dmdRenderGameOver(): void {
  dmdClear();
  // Always render header — flashing rendered the DMD unreadable. See comment
  // in dmdRenderEvent above.
  if (state.lastRank === 1) {
    dmdDrawText('NEW HIGH SCORE!', DMD_W / 2, 10, 10);
  } else {
    dmdDrawText('GAME OVER', DMD_W / 2, 10, 13);
  }
  const rankStr = state.lastRank ? `RANK #${state.lastRank}  ` : '';
  dmdDrawText(`${rankStr  }SCORE: ${  state.lastScore.toLocaleString()}`, DMD_W / 2, 26, 7);
  dmdFlush();
}

// ── Boot scroll: TABLENAME · BY AUTHOR · YEAR ────────────────────────────────
// Always scrolls so the boot sequence is unambiguously animated. Top line
// also gets a subtle pulse via dot-count to make it clear this isn't a
// frozen frame.
export function dmdRenderTableInfo(): void {
  dmdClear();

  const tname = (currentTableConfig?.name ?? 'FUTURE PINBALL').toUpperCase();
  const author = currentTableConfig?.author ?? 'FPW TEAM';
  const year = currentTableConfig?.year ?? new Date().getFullYear();

  // Top line: "LOADING" with animated dots so it's never visually frozen
  // even if the bottom-line scroll is briefly off-screen between cycles.
  const dots = '.'.repeat(1 + Math.floor(dmdState.animFrame / 20) % 4);
  dmdDrawText(`LOADING${  dots}`, DMD_W / 2, 9, 7);

  // Bottom line: ALWAYS scroll, faster so motion is obvious in the 5-sec window
  const scrollLine = `${tname}    ·    BY ${author.toUpperCase()}    ·    ${year}    `;
  dmdScrollText(scrollLine, 26, 9, 3.0, 'right');

  dmdFlush();
}

/**
 * Force-scroll a single line: skips the "fits → centre" early-return so the
 * text always animates, padding the gap with extra spaces so two adjacent
 * cycles read as one continuous ticker.
 */
function dmdScrollText(
  text: string,
  y: number,
  size: number,
  speedPxPerFrame: number = 0.6,
  direction: 'left' | 'right' = 'right'
): void {
  const S = DMD_SCALE;
  dmdOff2d.font = `normal ${size * S}px "Courier New", monospace`;
  const cycleW = dmdOff2d.measureText(text).width;
  const displayPx = DMD_W * S;
  const t = (dmdState.animFrame * speedPxPerFrame * S) % cycleW;
  const x0 = direction === 'right' ? -cycleW + t : displayPx - t;

  dmdOff2d.fillStyle = '#fff';
  dmdOff2d.textAlign = 'left';
  dmdOff2d.textBaseline = 'alphabetic';
  dmdOff2d.fillText(text, x0, y * S);
  dmdOff2d.fillText(text, x0 + cycleW, y * S);
}

// ── Idle / attract: cycles between INSERT COIN, high scores, controls ────────
export function dmdRenderInsertCoin(): void {
  dmdClear();

  const coins = coinSystemState.coinsInserted;
  // Cycle in 4-second blocks: INSERT COIN → HIGH SCORES → CONTROLS → repeat
  const phase = Math.floor(dmdState.animFrame / 240) % 3;

  if (phase === 0) {
    if (coins === 0) {
      // No credits yet — invite to insert
      dmdDrawText('INSERT COIN', DMD_W / 2, 12, 11);
      dmdScrollText('  PRESS 5 TO INSERT COIN  ', 27, 7, 2.5, 'right');
    } else {
      // Credits available — show count + start hint per allowed player count
      // (1 credit = 1 player, 2 = 2 players, … capped at 4)
      dmdDrawText(`CREDITS  ${coins}`, DMD_W / 2, 12, 11);
      const maxPlayers = Math.min(coins, 4);
      const hint = maxPlayers === 1
        ? 'PRESS 1 TO START'
        : `PRESS 1-${maxPlayers} TO START  (${maxPlayers}P MAX)`;
      dmdScrollText(`   ${  hint  }   `, 27, 7, 2.5, 'right');
    }
  } else if (phase === 1) {
    // HIGH SCORES
    const scores = getTopScores();
    dmdDrawText('HIGH SCORES', DMD_W / 2, 9, 8);
    if (scores[0]) dmdDrawText(`#1  ${scores[0].toLocaleString()}`, DMD_W / 2, 21, 7);
    if (scores[1]) dmdDrawText(`#2  ${scores[1].toLocaleString()}`, DMD_W / 2, 30, 6);
  } else {
    // CONTROLS
    dmdDrawText('CONTROLS', DMD_W / 2, 9, 8);
    dmdScrollText(
      '  SHIFT = FLIPPER  ·  ENTER = PLUNGER  ·  Z/X = TILT  ·  R = RESET  ',
      26, 7, 2.5, 'right'
    );
  }

  dmdFlush();
}

// ── Coin inserted — waiting for plunger ─────────────────────────────────────
export function dmdRenderLaunch(): void {
  dmdClear();
  // Top: short attention-grabber. Bottom: scrolling instruction so it can't
  // be missed and isn't dimmed by an alpha pulse (which made the instruction
  // hard to read against the LED color overlay in the previous version).
  dmdDrawText('LAUNCH BALL', DMD_W / 2, 12, 11);
  dmdScrollText('  HOLD ENTER, RELEASE TO FIRE  ', 27, 7, 2.5, 'right');
  dmdFlush();
}

// ── Update (jeden Frame aufrufen) ─────────────────────────────────────────────
export function dmdUpdate(): void {
  dmdState.animFrame++;
  let modeChanged = false;

  // ─── Phase 3: Track mode changes for full redraw ───
  const prevMode = dmdState.mode;

  // Mode auto-transitions
  if (dmdState.bootTimer > 0) {
    dmdState.bootTimer--;
    if (dmdState.bootTimer === 0 && dmdState.mode === 'tableinfo') {
      // Boot scroll done — go to attract idle
      dmdState.mode = 'attract';
      dmdState.animFrame = 0;
    }
  }

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
    case 'tableinfo': dmdRenderTableInfo(); break;
    case 'attract':   dmdRenderInsertCoin(); break;
    case 'launch':    dmdRenderLaunch();    break;
    case 'playing':   dmdRenderPlaying();   break;
    case 'event':     dmdRenderEvent();     break;
    case 'gameover':  dmdRenderGameOver();  break;
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
