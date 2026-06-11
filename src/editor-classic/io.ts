// SPDX-License-Identifier: AGPL-3.0-or-later
// © 2026 Harald Weiss

import type { Bumper, Ramp, Target } from './types';
import { state } from './state';
import { render } from './canvas';
import { updateSidebar, updateStatus } from './sidebar';

function buildConfig() {
  const tc = parseInt(state.tableColor.replace('#', ''), 16) || 0x1a4a15;
  const ac = parseInt(state.accentColor.replace('#', ''), 16) || 0x00ff66;
  return {
    name: state.tableName, tableColor: tc, accentColor: ac,
    bumpers: state.elements.filter(e => e.type==='bumper').map(e => ({ x:(e as Bumper).x, y:(e as Bumper).y, color:e.color })),
    targets: state.elements.filter(e => e.type==='target').map(e => ({ x:(e as Target).x, y:(e as Target).y, color:e.color })),
    ramps:   state.elements.filter(e => e.type==='ramp'  ).map(e => ({ x1:(e as Ramp).x1, y1:(e as Ramp).y1, x2:(e as Ramp).x2, y2:(e as Ramp).y2, color:e.color })),
    lights: [
      { color: ac, intensity: 0.8, dist: 10, x: 0,  y: 2,  z: 4 },
      { color: ac, intensity: 0.4, dist: 8,  x: -2, y: -2, z: 3 },
    ],
  };
}

window.exportJSON = () => {
  const json = JSON.stringify(buildConfig(), null, 2);
  const a    = document.createElement('a');
  a.href     = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
  a.download = `${state.tableName.replace(/[^A-Za-z0-9_-]/g, '_')  }.json`;
  a.click(); URL.revokeObjectURL(a.href);
};

window.openInGame = () => {
  localStorage.setItem('fpw_custom_table', JSON.stringify(buildConfig()));
  window.open('index.html?load=custom', '_blank');
};

window.importJSON = () => {
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
  state.tableName   = cfg.name || 'Importiert';
  const tc    = (`000000${  (cfg.tableColor  || 0x1a4a15).toString(16)}`).slice(-6);
  const ac    = (`000000${  (cfg.accentColor || 0x00ff66).toString(16)}`).slice(-6);
  state.tableColor  = `#${  tc}`;
  state.accentColor = `#${  ac}`;
  state.elements    = [];
  (cfg.bumpers || []).forEach((b: any) => state.elements.push({ type:'bumper', x:b.x, y:b.y, color:b.color||0xff2200 }));
  (cfg.targets || []).forEach((t: any) => state.elements.push({ type:'target', x:t.x, y:t.y, color:t.color||0x00aaff }));
  (cfg.ramps   || []).forEach((r: any) => state.elements.push({ type:'ramp', x1:r.x1, y1:r.y1, x2:r.x2, y2:r.y2, color:r.color||0x00ff66 }));
  state.selectedIdx = -1;
  (document.getElementById('tbl-name')   as HTMLInputElement).value = state.tableName;
  (document.getElementById('tbl-color')  as HTMLInputElement).value = state.tableColor;
  (document.getElementById('tbl-accent') as HTMLInputElement).value = state.accentColor;
  updateSidebar(); updateStatus(); render();
}

// ─── Demo-Tische ──────────────────────────────────────────────────────────────
window.loadDemo = (key: string) => {
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
