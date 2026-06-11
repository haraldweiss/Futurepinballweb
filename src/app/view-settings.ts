// SPDX-License-Identifier: AGPL-3.0-or-later
import * as THREE from 'three';

export interface ViewSettingsApi {
  /** Read the vp-* sliders, apply them to the camera and persist to localStorage. */
  applyViewSettings: () => void;
  /** Reset the sliders to defaults and re-apply. */
  resetViewSettings: () => void;
  /** Wire up the VIEW panel (sliders + rotation buttons) and apply saved settings. */
  initViewSettings: () => void;
}

type RotateAndRedraw = (targetDegrees: 0 | 90 | 180 | 270, duration?: number) => Promise<void>;

/**
 * VIEW panel (zoom / tilt / FOV sliders + playfield rotation buttons).
 *
 * Extracted from main.ts. Owns its own `fpw_view` localStorage state and drives
 * the injected camera. The rotation buttons delegate to the injected
 * rotateAndRedraw (a main.ts orchestration helper); current-rotation read-back
 * stays on the typed `window.getCurrentRotation` global.
 */
export function createViewSettings(
  camera: THREE.PerspectiveCamera,
  rotateAndRedraw: RotateAndRedraw,
): ViewSettingsApi {
  const VIEW_KEY = 'fpw_view';
  let viewSettings: Record<string, number> = (() => {
    try { return JSON.parse(localStorage.getItem(VIEW_KEY) ?? '{}') ?? {}; }
    catch (e) { console.debug('[view-settings] parse failed:', (e || 'unknown')); return {}; }
  })();

  const applyViewSettings = (): void => {
    const zoom = parseFloat((document.getElementById('vp-zoom') as HTMLInputElement).value);
    const tilt = parseFloat((document.getElementById('vp-tilt') as HTMLInputElement).value);
    const fov  = parseFloat((document.getElementById('vp-fov')  as HTMLInputElement).value);
    (document.getElementById('vp-zoom-val') as HTMLElement).textContent = zoom.toFixed(1);
    (document.getElementById('vp-tilt-val') as HTMLElement).textContent = tilt.toFixed(2);
    (document.getElementById('vp-fov-val')  as HTMLElement).textContent = fov.toFixed(0);
    camera.position.set(0, tilt - 9.5, zoom); camera.lookAt(0, tilt * 0.5 + 0.3, 0);
    camera.fov = fov; camera.updateProjectionMatrix();
    viewSettings = { zoom, tilt, fov }; localStorage.setItem(VIEW_KEY, JSON.stringify(viewSettings));
  };

  const resetViewSettings = (): void => {
    (document.getElementById('vp-zoom') as HTMLInputElement).value = '16';
    (document.getElementById('vp-tilt') as HTMLInputElement).value = '0.5';
    (document.getElementById('vp-fov')  as HTMLInputElement).value = '58';
    applyViewSettings();
  };

  const initViewSettings = (): void => {
    const { zoom = 16, tilt = 0.5, fov = 58 } = viewSettings;
    const zEl = document.getElementById('vp-zoom') as HTMLInputElement;
    const tEl = document.getElementById('vp-tilt') as HTMLInputElement;
    const fEl = document.getElementById('vp-fov')  as HTMLInputElement;
    if (zEl) { zEl.value = String(zoom); (document.getElementById('vp-zoom-val') as HTMLElement).textContent = String(zoom); }
    if (tEl) { tEl.value = String(tilt); (document.getElementById('vp-tilt-val') as HTMLElement).textContent = String(tilt); }
    if (fEl) { fEl.value = String(fov);  (document.getElementById('vp-fov-val')  as HTMLElement).textContent = String(fov); }
    // Inline `oninput="applyViewSettings()"` was previously in the HTML, but
    // Electron's contextIsolation/CSP blocks inline JS handlers — sliders did
    // nothing in the packaged build. Wire via addEventListener instead.
    const onSlide = () => applyViewSettings();
    zEl?.addEventListener('input', onSlide);
    tEl?.addEventListener('input', onSlide);
    fEl?.addEventListener('input', onSlide);
    document.getElementById('vp-reset')?.addEventListener('click', () => resetViewSettings());

    // Rotation buttons inside VIEW panel — keyboardless rotation for cabinets
    // that don't have Ctrl mapped to any input. Sets the playfield to the
    // exact angle and persists it (rotateAndRedraw saves to localStorage).
    const rotValEl = document.getElementById('vp-rot-val');
    const updateRotLabel = (forced?: number) => {
      // Prefer explicit value (set immediately on click) over engine state,
      // since rotateAndRedraw is async and would leave the UI showing the
      // pre-rotation state until the animation completes.
      const cur = forced ?? (window.getCurrentRotation?.() ?? 0);
      if (rotValEl) rotValEl.textContent = `${cur}°`;
      document.querySelectorAll<HTMLElement>('.vp-rot-btn').forEach(b => {
        const isActive = Number(b.dataset.rot) === cur;
        // Use cssText so we override #view-panel button { background: ... }
        // with !important — otherwise the panel-wide rule wins on some browsers.
        b.style.setProperty('background', isActive ? 'rgba(0,220,120,0.8)' : 'rgba(0,80,40,0.3)', 'important');
        b.style.setProperty('border-color', isActive ? '#00ff88' : '#00cc66', 'important');
        b.style.setProperty('font-weight', isActive ? 'bold' : 'normal', 'important');
      });
    };
    document.querySelectorAll<HTMLElement>('.vp-rot-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const deg = Number(btn.dataset.rot) as 0 | 90 | 180 | 270;
        // Update UI immediately so the user sees feedback before the
        // 300ms rotation animation completes.
        updateRotLabel(deg);
        await rotateAndRedraw(deg, 300);
        updateRotLabel(deg);
      });
    });
    updateRotLabel();
    if (zoom !== 16 || tilt !== 0.5 || fov !== 58) applyViewSettings();
  };

  return { applyViewSettings, resetViewSettings, initViewSettings };
}
