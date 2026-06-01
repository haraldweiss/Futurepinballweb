// SPDX-License-Identifier: AGPL-3.0-or-later
// © 2026 Harald Weiss

import { state } from './state';
import { canvas, render } from './canvas';
import { setTool } from './interaction';
import { updateColorDot, updateStatus, updateSidebar } from './sidebar';

// ─── Table Properties ─────────────────────────────────────────────────────────
document.getElementById('tbl-name')!.addEventListener('input', (e) => {
  state.tableName = (e.target as HTMLInputElement).value || 'Mein Tisch';
});
document.getElementById('tbl-color')!.addEventListener('input', (e) => {
  state.tableColor = (e.target as HTMLInputElement).value; render();
});
document.getElementById('tbl-accent')!.addEventListener('input', (e) => {
  state.accentColor = (e.target as HTMLInputElement).value;
});

// ─── Resize ───────────────────────────────────────────────────────────────────
function resizeCanvas() {
  const wrap = canvas.parentElement!;
  const maxH = wrap.clientHeight - 8;
  const maxW = wrap.clientWidth  - 8;
  let w = maxW, h = w * 2;
  if (h > maxH) { h = maxH; w = h / 2; }
  canvas.width  = Math.floor(w);
  canvas.height = Math.floor(h);
  render();
}

window.addEventListener('resize', resizeCanvas);

// ─── Init ─────────────────────────────────────────────────────────────────────
resizeCanvas();
setTool('select');
updateColorDot();
updateStatus();
updateSidebar();
