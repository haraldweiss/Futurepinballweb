// SPDX-License-Identifier: AGPL-3.0-or-later
// © 2026 Harald Weiss

import type { Bumper, Ramp, Target } from './types';
import { state, COLORS, hex } from './state';
import { render } from './canvas';

export function updateSidebar() {
  const panel = document.getElementById('props-panel')!;
  if (state.selectedIdx < 0 || state.selectedIdx >= state.elements.length) {
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
  const el = state.elements[state.selectedIdx];
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

  // eslint-disable-next-line no-unsanitized/property -- el fields are internal element state; numeric coords and enum types only
  panel.innerHTML = `
    <div class="prop-type">${el.type.toUpperCase()}</div>
    ${coordHtml}
    <div class="prop-row"><label>Farbe</label></div>
    <div class="color-row">${colorSwatches}</div>
    <button class="btn-del" onclick="deleteSelected()">🗑 Löschen</button>`;
}

export function updateStatus() {
  const b = state.elements.filter(e => e.type==='bumper').length;
  const t = state.elements.filter(e => e.type==='target').length;
  const r = state.elements.filter(e => e.type==='ramp').length;
  const el = document.getElementById('elem-count');
  if (el) el.textContent = `${b} Bumper · ${t} Targets · ${r} Rampen`;
}

export function updateColorDot() {
  const d = document.getElementById('color-dot');
  if (d) d.style.background = hex(COLORS[state.colorIdx]);
}

(window as any).cycleColor = () => {
  state.colorIdx = (state.colorIdx + 1) % COLORS.length;
  updateColorDot();
  if (state.selectedIdx >= 0) { state.elements[state.selectedIdx].color = COLORS[state.colorIdx]; updateSidebar(); render(); }
};

(window as any).setProp = (key: string, val: string) => {
  if (state.selectedIdx < 0) return;
  (state.elements[state.selectedIdx] as any)[key] = parseFloat(val) || 0;
  render();
};

(window as any).setElemColor = (color: number) => {
  if (state.selectedIdx < 0) return;
  state.elements[state.selectedIdx].color = color;
  state.colorIdx = COLORS.indexOf(color);
  updateColorDot(); updateSidebar(); render();
};
