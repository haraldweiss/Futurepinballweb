// SPDX-License-Identifier: AGPL-3.0-or-later
export interface ReelDisplayState { value: number; digits: number; bulb: number; brightness: number }

export function clearReelDisplays(): void {
  document.getElementById('native-reel-displays')?.remove();
}

/** Readable fallback output; native reel geometry/fonts/layout remain separate. */
export function renderReelDisplay(name: string, state: ReelDisplayState): void {
  let panel = document.getElementById('native-reel-displays');
  if (!panel) {
    panel = document.createElement('section');
    panel.id = 'native-reel-displays'; panel.setAttribute('aria-label', 'Table displays');
    panel.style.cssText = 'position:fixed;left:12px;top:68px;z-index:15;box-sizing:border-box;max-width:calc(100vw - 24px);max-height:28vh;overflow:auto;padding:10px 12px;background:#10101ce8;border:1px solid #6d5b37;border-radius:8px;color:#ffd68a;font:12px monospace;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px 14px;pointer-events:auto;';
    const heading = document.createElement('div'); heading.textContent = 'TABLE DISPLAYS';
    heading.style.cssText = 'grid-column:1/-1;font-size:10px;letter-spacing:2px;color:#b8ad97;';
    const responsive = document.createElement('style');
    responsive.textContent = '@media (max-width:600px){#native-reel-displays{top:140px!important}}';
    panel.append(responsive, heading); document.body.appendChild(panel);
  }
  let output = [...panel.querySelectorAll('output')].find(element => element.dataset.reelName === name);
  if (!output) {
    const row = document.createElement('div'); const label = document.createElement('div');
    label.textContent = name; label.style.cssText = 'font-size:10px;color:#b8ad97;overflow:hidden;text-overflow:ellipsis;max-width:140px;';
    output = document.createElement('output'); output.dataset.reelName = name;
    output.setAttribute('aria-label', name); output.style.cssText = 'font-size:clamp(12px,3.3vw,20px);letter-spacing:2px;font-variant-numeric:tabular-nums;overflow-wrap:anywhere;';
    row.append(label, output); panel.appendChild(row);
  }
  const sign = state.value < 0 ? '-' : '';
  output.textContent = sign + Math.abs(state.value).toString().padStart(state.digits, '0');
  output.style.opacity = String((state.bulb === 0 ? 0.45 : 1) * state.brightness);
  output.dataset.bulbState = String(state.bulb);
}
