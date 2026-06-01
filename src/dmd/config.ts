// SPDX-License-Identifier: AGPL-3.0-or-later
// © 2026 Harald Weiss
import { dmdBoundsTracker } from '../dmd-bounds-tracker';
import { getDMDSize } from '../responsive-display';
import { devLog } from '../utils/dev-log';

// ── DMD Konstanten ───────────────────────────────────────────────────────────
// ─── Phase 3: Configurable Resolution ───
export let DMD_W = 128, DMD_H = 32;
export let DMD_DOT = 4, DMD_GAP = 1;
export let DMD_STEP = DMD_DOT + DMD_GAP;
export let DMD_SCALE = 2;  // Dynamic scale based on screen size

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
    devLog(`📺 DMD scale adjusted to ${DMD_SCALE}x for ${window.innerHeight}px height`);
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
      -webkit-app-region: no-drag;
      app-region: no-drag;
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

  devLog('📺 DMD resize system initialized - drag corners to resize');
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
      devLog(`📺 DMD resized to ${newWidth}x${newHeight}px (scale: ${DMD_SCALE}x)`);
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
    devLog(`✓ DMD size saved: ${width}x${height}px`);
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
      devLog(`📺 DMD restored to saved size: ${width}x${height}px (scale: ${DMD_SCALE}x)`);
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

export const DMD_COLOR_SCHEMES: Record<string, DMDColorScheme> = {
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
export const dmdCanvas = document.getElementById('dmd') as HTMLCanvasElement;
export function updateCanvasSize() {
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
  devLog('📍 DMD bounds tracker initialized');
}

export const dmdCtx = dmdCanvas.getContext('2d')!;

export const dmdOff = document.createElement('canvas');
export function updateOffscreenSize() {
  dmdOff.width  = DMD_W * DMD_SCALE;
  dmdOff.height = DMD_H * DMD_SCALE;
}
updateOffscreenSize();
export const dmdOff2d = dmdOff.getContext('2d')!;
dmdOff2d.imageSmoothingEnabled = true;

// ─── Responsive DMD Resize Handler ───────────────────────────────────────────
window.addEventListener('resize', () => {
  clearTimeout((window as any).dmdResizeTimer);
  (window as any).dmdResizeTimer = setTimeout(() => {
    updateCanvasSize();
  }, 150);
});

// ── dmdClear (lives here to avoid circular dep with updateResponsiveDMDScale) ──
export function dmdClear(): void {
  dmdOff2d.fillStyle = '#000';
  dmdOff2d.fillRect(0, 0, DMD_W * DMD_SCALE, DMD_H * DMD_SCALE);
}
