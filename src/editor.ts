/**
 * editor.ts — Visueller Tisch-Editor
 * Koordinatensystem: Game-Space X: -3..+3, Y: -6..+6 (Y oben positiv)
 */

type ToolType = 'select' | 'bumper' | 'target' | 'ramp';

interface Bumper { type: 'bumper'; x: number;  y: number;  color: number; }
interface Target { type: 'target'; x: number;  y: number;  color: number; }
interface Ramp   { type: 'ramp';   x1: number; y1: number; x2: number; y2: number; color: number; }
type Elem = Bumper | Target | Ramp;

// ─── State ────────────────────────────────────────────────────────────────────
let tool: ToolType   = 'select';
let elements: Elem[] = [];
let selectedIdx      = -1;
let isDragging       = false;
let dragOffX         = 0, dragOffY = 0;
let rampStart: { x: number; y: number } | null = null;
let snapEnabled      = true;

let tableName   = 'Mein Tisch';
let tableColor  = '#1a2a18';
let accentColor = '#00ff66';

const COLORS = [0xff2200, 0xff6600, 0xffcc00, 0x00ff88, 0x00aaff, 0xcc00ff, 0xff00aa, 0x00ffff];
let colorIdx = 0;

// ─── Canvas ───────────────────────────────────────────────────────────────────
const canvas = document.getElementById('editor-canvas') as HTMLCanvasElement;
const ctx    = canvas.getContext('2d')!;
const GW = 6, GH = 12;

function gToC(gx: number, gy: number) {
  return { x: (gx + GW / 2) * (canvas.width  / GW),
           y: (GH / 2 - gy) * (canvas.height / GH) };
}
function cToG(cx: number, cy: number) {
  return { x: cx * (GW / canvas.width)  - GW  / 2,
           y: GH / 2 - cy * (GH / canvas.height) };
}
function snap(v: number) { return snapEnabled ? Math.round(v * 5) / 5 : v; }
function hex(n: number)  { return '#' + ('000000' + n.toString(16)).slice(-6); }

// ─── Render ───────────────────────────────────────────────────────────────────
function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Spielfeld-Hintergrund
  ctx.fillStyle = tableColor;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Grid
  ctx.strokeStyle = 'rgba(255,255,255,0.06)';
  ctx.lineWidth   = 0.5;
  const step = canvas.width / (GW * 5);
  for (let x = 0; x <= canvas.width + 1; x += step) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
  }
  for (let y = 0; y <= canvas.height + 1; y += step) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
  }

  // Mittellinie (gestrichelt)
  const midY = gToC(0, 0).y;
  ctx.strokeStyle = 'rgba(255,255,255,0.12)'; ctx.lineWidth = 1;
  ctx.setLineDash([4, 6]);
  ctx.beginPath(); ctx.moveTo(0, midY); ctx.lineTo(canvas.width, midY); ctx.stroke();
  ctx.setLineDash([]);

  // Drain-Linie
  const drainY = gToC(0, -5.5).y;
  ctx.strokeStyle = 'rgba(255,60,60,0.35)'; ctx.lineWidth = 1;
  ctx.setLineDash([5, 5]);
  ctx.beginPath(); ctx.moveTo(0, drainY); ctx.lineTo(canvas.width, drainY); ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = 'rgba(255,80,80,0.5)'; ctx.font = `${canvas.width * 0.045}px monospace`;
  ctx.textAlign = 'left'; ctx.textBaseline = 'bottom';
  ctx.fillText('DRAIN', 4, drainY - 2);

  // Shooter-Lane
  const laneX = gToC(2.2, 0).x;
  ctx.strokeStyle = 'rgba(0,150,255,0.18)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(laneX, 0); ctx.lineTo(laneX, canvas.height); ctx.stroke();

  // Wand-Rahmen
  ctx.strokeStyle = 'rgba(200,220,255,0.35)'; ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, canvas.width - 2, canvas.height - 2);

  // Elemente
  elements.forEach((el, i) => drawElem(el, i === selectedIdx));

  // Ramp-Startpunkt Vorschau
  if (tool === 'ramp' && rampStart) {
    const p = gToC(rampStart.x, rampStart.y);
    ctx.fillStyle = hex(COLORS[colorIdx]);
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
    ctx.fillStyle = c + '33'; ctx.fill();
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
    ctx.fillStyle = c + '33'; ctx.fillRect(p.x - w/2, p.y - h/2, w, h);
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

// ─── Hit-Test ─────────────────────────────────────────────────────────────────
function hitTest(cx: number, cy: number): number {
  const gp = cToG(cx, cy);
  for (let i = elements.length - 1; i >= 0; i--) {
    const el = elements[i];
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

// ─── Mouse Events ─────────────────────────────────────────────────────────────
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
  const col = COLORS[colorIdx % COLORS.length];

  if (tool === 'select') {
    selectedIdx = hitTest(cx, cy);
    if (selectedIdx >= 0) {
      isDragging = true;
      const el = elements[selectedIdx];
      if (el.type === 'bumper' || el.type === 'target') {
        dragOffX = el.x - gp.x; dragOffY = el.y - gp.y;
      } else if (el.type === 'ramp') {
        dragOffX = (el.x1+el.x2)/2 - gp.x; dragOffY = (el.y1+el.y2)/2 - gp.y;
      }
    }
  } else if (tool === 'bumper') {
    elements.push({ type:'bumper', x:gx, y:gy, color:col });
    selectedIdx = elements.length - 1;
  } else if (tool === 'target') {
    elements.push({ type:'target', x:gx, y:gy, color:col });
    selectedIdx = elements.length - 1;
  } else if (tool === 'ramp') {
    if (!rampStart) {
      rampStart = { x:gx, y:gy };
    } else {
      elements.push({ type:'ramp', x1:rampStart.x, y1:rampStart.y, x2:gx, y2:gy, color:col });
      rampStart = null;
      selectedIdx = elements.length - 1;
    }
  }

  updateSidebar(); updateStatus(); render();
});

canvas.addEventListener('mousemove', (e) => {
  if (!isDragging || selectedIdx < 0) return;
  const { cx, cy } = getCanvasPos(e);
  const gp = cToG(cx, cy);
  const nx = snap(gp.x + dragOffX), ny = snap(gp.y + dragOffY);
  const el = elements[selectedIdx];
  if (el.type === 'bumper' || el.type === 'target') {
    el.x = nx; el.y = ny;
  } else if (el.type === 'ramp') {
    const dx = el.x2-el.x1, dy = el.y2-el.y1;
    el.x1 = nx - dx/2; el.y1 = ny - dy/2;
    el.x2 = nx + dx/2; el.y2 = ny + dy/2;
  }
  updateSidebar(); render();
});

canvas.addEventListener('mouseup',    () => isDragging = false);
canvas.addEventListener('mouseleave', () => isDragging = false);

document.addEventListener('keydown', (e) => {
  if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
  if (e.key === 'Delete' || e.key === 'Backspace') deleteSelected();
  if (e.key === 'Escape') { selectedIdx = -1; rampStart = null; updateSidebar(); render(); }
  if (e.key === 's') setTool('select');
  if (e.key === 'b') setTool('bumper');
  if (e.key === 't') setTool('target');
  if (e.key === 'r') setTool('ramp');
});

// ─── Sidebar ──────────────────────────────────────────────────────────────────
function updateSidebar() {
  const panel = document.getElementById('props-panel')!;
  if (selectedIdx < 0 || selectedIdx >= elements.length) {
    panel.innerHTML = `<p class="hint">Kein Element gewählt.<br><br>
      Werkzeug wählen und auf den Canvas klicken, um Elemente hinzuzufügen.<br><br>
      <span class="key">S</span> Auswählen &nbsp;
      <span class="key">B</span> Bumper &nbsp;
      <span class="key">T</span> Target &nbsp;
      <span class="key">R</span> Rampe<br>
      <span class="key">DEL</span> Löschen &nbsp;
      <span class="key">ESC</span> Abbrechen</p>`;
    return;
  }
  const el = elements[selectedIdx];
  const colorSwatches = COLORS.map(c =>
    `<div class="color-swatch ${el.color===c?'active':''}" style="background:${hex(c)}"
      onclick="setElemColor(${c})"></div>`
  ).join('');

  let coordHtml = '';
  if (el.type === 'bumper' || el.type === 'target') {
    coordHtml = `
      <div class="prop-row"><label>X</label>
        <input type="number" step="0.2" value="${el.x.toFixed(2)}" oninput="setProp('x',this.value)"></div>
      <div class="prop-row"><label>Y</label>
        <input type="number" step="0.2" value="${el.y.toFixed(2)}" oninput="setProp('y',this.value)"></div>`;
  } else if (el.type === 'ramp') {
    coordHtml = `
      <div class="prop-row"><label>X1</label><input type="number" step="0.2" value="${el.x1.toFixed(2)}" oninput="setProp('x1',this.value)"></div>
      <div class="prop-row"><label>Y1</label><input type="number" step="0.2" value="${el.y1.toFixed(2)}" oninput="setProp('y1',this.value)"></div>
      <div class="prop-row"><label>X2</label><input type="number" step="0.2" value="${el.x2.toFixed(2)}" oninput="setProp('x2',this.value)"></div>
      <div class="prop-row"><label>Y2</label><input type="number" step="0.2" value="${el.y2.toFixed(2)}" oninput="setProp('y2',this.value)"></div>`;
  }

  panel.innerHTML = `
    <div class="prop-type">${el.type.toUpperCase()}</div>
    ${coordHtml}
    <div class="prop-row"><label>Farbe</label></div>
    <div class="color-row">${colorSwatches}</div>
    <button class="btn-del" onclick="deleteSelected()">🗑 Löschen</button>`;
}

function updateStatus() {
  const b = elements.filter(e => e.type==='bumper').length;
  const t = elements.filter(e => e.type==='target').length;
  const r = elements.filter(e => e.type==='ramp').length;
  const el = document.getElementById('elem-count');
  if (el) el.textContent = `${b} Bumper · ${t} Targets · ${r} Rampen`;
}

// ─── Global Callbacks ─────────────────────────────────────────────────────────
(window as any).setTool = setTool;
function setTool(t: ToolType) {
  tool = t; rampStart = null;
  document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('tool-' + t)?.classList.add('active');
  canvas.style.cursor = t === 'select' ? 'default' : 'crosshair';
}

(window as any).deleteSelected = deleteSelected;
function deleteSelected() {
  if (selectedIdx >= 0) {
    elements.splice(selectedIdx, 1);
    selectedIdx = -1;
    updateSidebar(); updateStatus(); render();
  }
}

(window as any).clearAll = () => {
  if (!confirm('Alle Elemente löschen?')) return;
  elements = []; selectedIdx = -1; rampStart = null;
  updateSidebar(); updateStatus(); render();
};

(window as any).toggleSnap = () => {
  snapEnabled = !snapEnabled;
  const btn = document.getElementById('snap-btn')!;
  btn.classList.toggle('active', snapEnabled);
  btn.textContent = snapEnabled ? '⊞ SNAP AN' : '⊞ SNAP AUS';
};

(window as any).cycleColor = () => {
  colorIdx = (colorIdx + 1) % COLORS.length;
  updateColorDot();
  if (selectedIdx >= 0) { elements[selectedIdx].color = COLORS[colorIdx]; updateSidebar(); render(); }
};

(window as any).setProp = (key: string, val: string) => {
  if (selectedIdx < 0) return;
  (elements[selectedIdx] as any)[key] = parseFloat(val) || 0;
  render();
};

(window as any).setElemColor = (color: number) => {
  if (selectedIdx < 0) return;
  elements[selectedIdx].color = color;
  colorIdx = COLORS.indexOf(color);
  updateColorDot(); updateSidebar(); render();
};

function updateColorDot() {
  const d = document.getElementById('color-dot');
  if (d) d.style.background = hex(COLORS[colorIdx]);
}

// ─── Table Properties ─────────────────────────────────────────────────────────
document.getElementById('tbl-name')!.addEventListener('input', (e) => {
  tableName = (e.target as HTMLInputElement).value || 'Mein Tisch';
});
document.getElementById('tbl-color')!.addEventListener('input', (e) => {
  tableColor = (e.target as HTMLInputElement).value; render();
});
document.getElementById('tbl-accent')!.addEventListener('input', (e) => {
  accentColor = (e.target as HTMLInputElement).value;
});

// ─── Export / Import ──────────────────────────────────────────────────────────
function buildConfig() {
  const tc = parseInt(tableColor.replace('#', ''), 16) || 0x1a4a15;
  const ac = parseInt(accentColor.replace('#', ''), 16) || 0x00ff66;
  return {
    name: tableName, tableColor: tc, accentColor: ac,
    bumpers: elements.filter(e => e.type==='bumper').map(e => ({ x:(e as Bumper).x, y:(e as Bumper).y, color:e.color })),
    targets: elements.filter(e => e.type==='target').map(e => ({ x:(e as Target).x, y:(e as Target).y, color:e.color })),
    ramps:   elements.filter(e => e.type==='ramp'  ).map(e => ({ x1:(e as Ramp).x1, y1:(e as Ramp).y1, x2:(e as Ramp).x2, y2:(e as Ramp).y2, color:e.color })),
    lights: [
      { color: ac, intensity: 0.8, dist: 10, x: 0,  y: 2,  z: 4 },
      { color: ac, intensity: 0.4, dist: 8,  x: -2, y: -2, z: 3 },
    ],
  };
}

(window as any).exportJSON = () => {
  const json = JSON.stringify(buildConfig(), null, 2);
  const a    = document.createElement('a');
  a.href     = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
  a.download = tableName.replace(/[^A-Za-z0-9_-]/g, '_') + '.json';
  a.click(); URL.revokeObjectURL(a.href);
};

(window as any).openInGame = () => {
  localStorage.setItem('fpw_custom_table', JSON.stringify(buildConfig()));
  window.open('index.html?load=custom', '_blank');
};

(window as any).importJSON = () => {
  const input = document.createElement('input');
  input.type = 'file'; input.accept = '.json';
  input.onchange = (e) => {
    const f = (e.target as HTMLInputElement).files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = ev => {
      try { loadFromConfig(JSON.parse(ev.target!.result as string)); }
      catch { alert('Ungültige JSON-Datei.'); }
    };
    reader.readAsText(f);
  };
  input.click();
};

function loadFromConfig(cfg: any) {
  tableName   = cfg.name || 'Importiert';
  const tc    = ('000000' + ((cfg.tableColor  || 0x1a4a15).toString(16))).slice(-6);
  const ac    = ('000000' + ((cfg.accentColor || 0x00ff66).toString(16))).slice(-6);
  tableColor  = '#' + tc;
  accentColor = '#' + ac;
  elements    = [];
  (cfg.bumpers || []).forEach((b: any) => elements.push({ type:'bumper', x:b.x, y:b.y, color:b.color||0xff2200 }));
  (cfg.targets || []).forEach((t: any) => elements.push({ type:'target', x:t.x, y:t.y, color:t.color||0x00aaff }));
  (cfg.ramps   || []).forEach((r: any) => elements.push({ type:'ramp', x1:r.x1, y1:r.y1, x2:r.x2, y2:r.y2, color:r.color||0x00ff66 }));
  selectedIdx = -1;
  (document.getElementById('tbl-name')   as HTMLInputElement).value = tableName;
  (document.getElementById('tbl-color')  as HTMLInputElement).value = tableColor;
  (document.getElementById('tbl-accent') as HTMLInputElement).value = accentColor;
  updateSidebar(); updateStatus(); render();
}

// ─── Demo-Tische ──────────────────────────────────────────────────────────────
(window as any).loadDemo = (key: string) => {
  const demos: Record<string,any> = {
    classic: { name:'Classic Arcade', tableColor:0x1a4a15, accentColor:0x00ff66,
      bumpers:[{x:-1.1,y:2.2,color:0xff2200},{x:1.1,y:2.2,color:0xff9900},{x:0,y:3.6,color:0xff00aa}],
      targets:[{x:1.8,y:0.8,color:0xff2200},{x:1.8,y:0.1,color:0xff6600},{x:1.8,y:-0.6,color:0xff9900}],
      ramps:[{x1:-2.6,y1:0.2,x2:-1.5,y2:1.6,color:0x00ff66},{x1:2.0,y1:0.2,x2:1.5,y2:1.6,color:0x00ff66}] },
    space: { name:'Space Attack', tableColor:0x05051a, accentColor:0x0066ff,
      bumpers:[{x:-1.3,y:1.5,color:0x0088ff},{x:1.3,y:1.5,color:0x00ccff},{x:0,y:3,color:0xcc00ff},{x:-0.8,y:4.2,color:0xff0066},{x:0.8,y:4.2,color:0xff6600}],
      targets:[{x:-1.8,y:1,color:0xcc00ff},{x:-1.8,y:0.2,color:0x0088ff}],
      ramps:[{x1:-2.5,y1:-0.5,x2:-1.2,y2:2,color:0x0066ff},{x1:2,y1:-0.5,x2:1.2,y2:2,color:0x0066ff}] },
    fire: { name:'Fire Storm', tableColor:0x1a0500, accentColor:0xff4400,
      bumpers:[{x:-1,y:2,color:0xff2200},{x:1,y:2,color:0xff6600},{x:0,y:3.5,color:0xffaa00},{x:-1.5,y:3.8,color:0xff0000}],
      targets:[{x:1.8,y:1.2,color:0xff2200},{x:1.8,y:0.4,color:0xff6600}],
      ramps:[{x1:-2.6,y1:0,x2:-1.8,y2:1.8,color:0xff4400},{x1:2,y1:0,x2:1.8,y2:1.8,color:0xff4400}] },
  };
  if (demos[key]) loadFromConfig(demos[key]);
};

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
