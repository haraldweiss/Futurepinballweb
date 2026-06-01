// SPDX-License-Identifier: AGPL-3.0-or-later
// © 2026 Harald Weiss

import type { Elem } from './types';
import { state, COLORS, hex } from './state';

export const canvas = document.getElementById('editor-canvas') as HTMLCanvasElement;
export const ctx = canvas.getContext('2d')!;
export const GW = 6, GH = 12;

export function gToC(gx: number, gy: number) {
  return { x: (gx + GW / 2) * (canvas.width  / GW),
           y: (GH / 2 - gy) * (canvas.height / GH) };
}
export function cToG(cx: number, cy: number) {
  return { x: cx * (GW / canvas.width)  - GW  / 2,
           y: GH / 2 - cy * (GH / canvas.height) };
}

export function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = state.tableColor;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = 'rgba(255,255,255,0.06)';
  ctx.lineWidth   = 0.5;
  const step = canvas.width / (GW * 5);
  for (let x = 0; x <= canvas.width + 1; x += step) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
  }
  for (let y = 0; y <= canvas.height + 1; y += step) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
  }

  const midY = gToC(0, 0).y;
  ctx.strokeStyle = 'rgba(255,255,255,0.12)'; ctx.lineWidth = 1;
  ctx.setLineDash([4, 6]);
  ctx.beginPath(); ctx.moveTo(0, midY); ctx.lineTo(canvas.width, midY); ctx.stroke();
  ctx.setLineDash([]);

  const drainY = gToC(0, -5.5).y;
  ctx.strokeStyle = 'rgba(255,60,60,0.35)'; ctx.lineWidth = 1;
  ctx.setLineDash([5, 5]);
  ctx.beginPath(); ctx.moveTo(0, drainY); ctx.lineTo(canvas.width, drainY); ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = 'rgba(255,80,80,0.5)'; ctx.font = `${canvas.width * 0.045}px monospace`;
  ctx.textAlign = 'left'; ctx.textBaseline = 'bottom';
  ctx.fillText('DRAIN', 4, drainY - 2);

  const laneX = gToC(2.2, 0).x;
  ctx.strokeStyle = 'rgba(0,150,255,0.18)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(laneX, 0); ctx.lineTo(laneX, canvas.height); ctx.stroke();

  ctx.strokeStyle = 'rgba(200,220,255,0.35)'; ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, canvas.width - 2, canvas.height - 2);

  state.elements.forEach((el, i) => drawElem(el, i === state.selectedIdx));

  if (state.tool === 'ramp' && state.rampStart) {
    const p = gToC(state.rampStart.x, state.rampStart.y);
    ctx.fillStyle = hex(COLORS[state.colorIdx]);
    ctx.beginPath(); ctx.arc(p.x, p.y, 7, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 1;
    ctx.stroke();
  }
}

function drawElem(el: Elem, selected: boolean) {
  const c = hex(el.color);
  if (el.type === 'bumper') {
    const p = gToC(el.x, el.y);
    const r = (canvas.width / GW) * 0.42;
    ctx.save();
    ctx.shadowColor = c; ctx.shadowBlur = selected ? 20 : 8;
    ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
    ctx.fillStyle = `${c  }33`; ctx.fill();
    ctx.strokeStyle = c; ctx.lineWidth = selected ? 3 : 2; ctx.stroke();
    ctx.fillStyle = c; ctx.font = `bold ${r * 0.75}px monospace`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('●', p.x, p.y);
    ctx.restore();
    if (selected) drawHandle(p.x, p.y);

  } else if (el.type === 'target') {
    const p = gToC(el.x, el.y);
    const w = (canvas.width  / GW) * 0.55;
    const h = (canvas.height / GH) * 0.42;
    ctx.save();
    ctx.shadowColor = c; ctx.shadowBlur = selected ? 18 : 6;
    ctx.fillStyle = `${c  }33`; ctx.fillRect(p.x - w/2, p.y - h/2, w, h);
    ctx.strokeStyle = c; ctx.lineWidth = selected ? 3 : 2;
    ctx.strokeRect(p.x - w/2, p.y - h/2, w, h);
    ctx.restore();
    if (selected) drawHandle(p.x, p.y);

  } else if (el.type === 'ramp') {
    const p1 = gToC(el.x1, el.y1), p2 = gToC(el.x2, el.y2);
    const dx = p2.x - p1.x, dy = p2.y - p1.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    ctx.save();
    ctx.shadowColor = c; ctx.shadowBlur = selected ? 14 : 4;
    ctx.strokeStyle = c; ctx.lineWidth = selected ? 5 : 3;
    ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.stroke();
    if (len > 12) {
      const ux = dx/len, uy = dy/len;
      const mx = (p1.x+p2.x)/2, my = (p1.y+p2.y)/2;
      ctx.fillStyle = c;
      ctx.beginPath();
      ctx.moveTo(mx + ux*9, my + uy*9);
      ctx.lineTo(mx - ux*5 - uy*6, my - uy*5 + ux*6);
      ctx.lineTo(mx - ux*5 + uy*6, my - uy*5 - ux*6);
      ctx.fill();
    }
    ctx.restore();
    if (selected) { drawHandle(p1.x, p1.y); drawHandle(p2.x, p2.y); }
  }
}

function drawHandle(x: number, y: number) {
  ctx.save();
  ctx.fillStyle = '#fff'; ctx.strokeStyle = '#00aaff'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(x, y, 6, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.restore();
}
