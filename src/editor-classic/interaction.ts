// SPDX-License-Identifier: AGPL-3.0-or-later
// © 2026 Harald Weiss

import type { ToolType } from './types';
import { state, COLORS, snap } from './state';
import { canvas, ctx, cToG, gToC, render } from './canvas';
import { updateSidebar, updateStatus } from './sidebar';

function hitTest(cx: number, cy: number): number {
  const gp = cToG(cx, cy);
  for (let i = state.elements.length - 1; i >= 0; i--) {
    const el = state.elements[i];
    if (el.type === 'bumper') {
      if (Math.hypot(gp.x - el.x, gp.y - el.y) < 0.6) return i;
    } else if (el.type === 'target') {
      if (Math.abs(gp.x - el.x) < 0.38 && Math.abs(gp.y - el.y) < 0.3) return i;
    } else if (el.type === 'ramp') {
      const dx = el.x2-el.x1, dy = el.y2-el.y1;
      const t  = Math.max(0, Math.min(1, ((gp.x-el.x1)*dx + (gp.y-el.y1)*dy) / (dx*dx+dy*dy)));
      if (Math.hypot(gp.x-(el.x1+t*dx), gp.y-(el.y1+t*dy)) < 0.3) return i;
    }
  }
  return -1;
}

function getCanvasPos(e: MouseEvent) {
  const rect = canvas.getBoundingClientRect();
  return {
    cx: (e.clientX - rect.left) * (canvas.width  / rect.width),
    cy: (e.clientY - rect.top)  * (canvas.height / rect.height),
  };
}

canvas.addEventListener('mousedown', (e) => {
  const { cx, cy } = getCanvasPos(e);
  const gp = cToG(cx, cy);
  const gx = snap(gp.x), gy = snap(gp.y);
  const col = COLORS[state.colorIdx % COLORS.length];

  if (state.tool === 'select') {
    state.selectedIdx = hitTest(cx, cy);
    if (state.selectedIdx >= 0) {
      state.isDragging = true;
      const el = state.elements[state.selectedIdx];
      if (el.type === 'bumper' || el.type === 'target') {
        state.dragOffX = el.x - gp.x; state.dragOffY = el.y - gp.y;
      } else if (el.type === 'ramp') {
        state.dragOffX = (el.x1+el.x2)/2 - gp.x; state.dragOffY = (el.y1+el.y2)/2 - gp.y;
      }
    }
  } else if (state.tool === 'bumper') {
    state.elements.push({ type:'bumper', x:gx, y:gy, color:col });
    state.selectedIdx = state.elements.length - 1;
  } else if (state.tool === 'target') {
    state.elements.push({ type:'target', x:gx, y:gy, color:col });
    state.selectedIdx = state.elements.length - 1;
  } else if (state.tool === 'ramp') {
    if (!state.rampStart) {
      state.rampStart = { x:gx, y:gy };
    } else {
      state.elements.push({ type:'ramp', x1:state.rampStart.x, y1:state.rampStart.y, x2:gx, y2:gy, color:col });
      state.rampStart = null;
      state.selectedIdx = state.elements.length - 1;
    }
  }

  updateSidebar(); updateStatus(); render();
});

canvas.addEventListener('mousemove', (e) => {
  if (!state.isDragging || state.selectedIdx < 0) return;
  const { cx, cy } = getCanvasPos(e);
  const gp = cToG(cx, cy);
  const nx = snap(gp.x + state.dragOffX), ny = snap(gp.y + state.dragOffY);
  const el = state.elements[state.selectedIdx];
  if (el.type === 'bumper' || el.type === 'target') {
    el.x = nx; el.y = ny;
  } else if (el.type === 'ramp') {
    const dx = el.x2-el.x1, dy = el.y2-el.y1;
    el.x1 = nx - dx/2; el.y1 = ny - dy/2;
    el.x2 = nx + dx/2; el.y2 = ny + dy/2;
  }
  updateSidebar(); render();
});

canvas.addEventListener('mouseup',    () => state.isDragging = false);
canvas.addEventListener('mouseleave', () => state.isDragging = false);

document.addEventListener('keydown', (e) => {
  if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
  if (e.key === 'Delete' || e.key === 'Backspace') deleteSelected();
  if (e.key === 'Escape') { state.selectedIdx = -1; state.rampStart = null; updateSidebar(); render(); }
  if (e.key === 's') setTool('select');
  if (e.key === 'b') setTool('bumper');
  if (e.key === 't') setTool('target');
  if (e.key === 'r') setTool('ramp');
});

// ─── Global Callbacks ─────────────────────────────────────────────────────────
(window as any).setTool = setTool;
export function setTool(t: ToolType) {
  state.tool = t; state.rampStart = null;
  document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
  document.getElementById(`tool-${  t}`)?.classList.add('active');
  canvas.style.cursor = t === 'select' ? 'default' : 'crosshair';
}

(window as any).deleteSelected = deleteSelected;
export function deleteSelected() {
  if (state.selectedIdx >= 0) {
    state.elements.splice(state.selectedIdx, 1);
    state.selectedIdx = -1;
    updateSidebar(); updateStatus(); render();
  }
}

(window as any).clearAll = () => {
  if (!confirm('Alle Elemente löschen?')) return;
  state.elements = []; state.selectedIdx = -1; state.rampStart = null;
  updateSidebar(); updateStatus(); render();
};

(window as any).toggleSnap = () => {
  state.snapEnabled = !state.snapEnabled;
  const btn = document.getElementById('snap-btn')!;
  btn.classList.toggle('active', state.snapEnabled);
  btn.textContent = state.snapEnabled ? '⊞ SNAP AN' : '⊞ SNAP AUS';
};
