// SPDX-License-Identifier: AGPL-3.0-or-later
import { getScreenRoleManager, type ScreenRole } from '../screen-role-manager';
import { getAllScreensForLayout, type ScreenLike } from './screen-utils';
import { showNotification } from './notification';
import { devLog } from '../utils/dev-log';

/** main.ts-local helpers the multiscreen subsystem drives but does not own. */
export interface MultiscreenDeps {
  initInlineBackglass: () => void;
  stopInlineBackglass: () => void;
  initDMDVisibility: () => void;
  getDmdHidden: () => boolean;
  loadDemoTable: (key: string) => void;
}

export interface MultiscreenApi {
  selectMsLayout: (n: number) => void;
  openMultiscreenModal: () => void;
  closeMultiscreenModal: () => void;
  applyMsLayout: () => Promise<void>;
  resetScreenRoles: (screenCount?: number) => void;
  swapScreenRoles: (screen1: number, screen2: number) => void;
  autoDetectScreens: () => Promise<void>;
  applyStartupScreenConfig: () => Promise<void>;
}

/**
 * Multi-screen layout + secondary-window orchestration (DMD / Backglass popups).
 *
 * Extracted from main.ts. Owns its own layout state (_msLayout / _msWindows) and
 * wires the multiscreen modal. Screen-role and screen-enumeration helpers are
 * imported directly; the inline-backglass / DMD-visibility / table-load helpers
 * that live on the main.ts entry point are injected via MultiscreenDeps.
 */
export function initMultiscreen(deps: MultiscreenDeps): MultiscreenApi {
  let _msLayout = 1;
  const _msWindows: Record<string, Window | null> = {};

  const selectMsLayout = (n: number): void => {
    _msLayout = n;
    [1, 2, 3].forEach(i => document.getElementById(`ms-card-${i}`)?.classList.toggle('selected', i === n));

    // ─── Update Screen Role Configuration UI ───
    const roleConfig = document.getElementById('screen-role-config')!;
    const roleList = document.getElementById('screen-role-list')!;

    if (n > 1) {
      roleConfig.style.display = 'block';
      roleList.replaceChildren(); // clear previous role controls

      // Create role assignment controls for each screen
      const mgr = getScreenRoleManager();
      const layout = mgr.getLayout();

      for (let i = 0; i < n; i++) {
        const currentRole = layout.screens[i]?.role || 'none';
        const screenDiv = document.createElement('div');
        screenDiv.style.display = 'flex';
        screenDiv.style.gap = '8px';
        screenDiv.style.alignItems = 'center';

        const label = document.createElement('label');
        label.style.flex = '0 0 80px';
        label.style.color = '#00aaff';
        label.style.fontSize = '12px';
        label.textContent = `Screen ${i + 1}:`;

        const select = document.createElement('select');
        select.style.flex = '1';
        select.style.padding = '6px';
        select.style.background = '#1a1a2e';
        select.style.color = '#aaa';
        select.style.border = '1px solid #667';
        select.style.borderRadius = '4px';
        select.onchange = (e: Event) => {
          mgr.setRoleForScreen(i, (e.target as HTMLSelectElement).value as ScreenRole);
        };

        const options = [
          { value: 'playfield', text: '▶ Playfield (Main Game)' },
          { value: 'backglass', text: '🎪 Backglass (Cabinet Art)' },
          { value: 'dmd', text: '🔢 DMD (Score Display)' },
        ];

        options.forEach(opt => {
          const option = document.createElement('option');
          option.value = opt.value;
          option.textContent = opt.text;
          option.selected = currentRole === opt.value;
          select.appendChild(option);
        });

        screenDiv.appendChild(label);
        screenDiv.appendChild(select);
        roleList.appendChild(screenDiv);
      }
    } else {
      roleConfig.style.display = 'none';
    }
  };

  // Wire the multi-screen modal's click handlers exactly once. The HTML
  // (index.html) declares the cards / buttons but never had click listeners
  // attached — so clicking "3 SCREENS" or "APPLY LAYOUT" was a no-op,
  // which made the modal feel completely broken on the cabinet.
  let _msModalWired = false;
  const wireMultiscreenModalOnce = (): void => {
    if (_msModalWired) return;
    const modal = document.getElementById('multiscreen-modal');
    if (!modal) return; // DOM not ready yet
    for (const n of [1, 2, 3] as const) {
      document.getElementById(`ms-card-${n}`)?.addEventListener('click', () => {
        selectMsLayout(n);
      });
    }
    document.getElementById('ms-apply')?.addEventListener('click', () => {
      void applyMsLayout();
    });
    document.getElementById('ms-autodetect')?.addEventListener('click', () => {
      void autoDetectScreens();
    });
    document.getElementById('ms-close')?.addEventListener('click', () => {
      closeMultiscreenModal();
    });
    _msModalWired = true;
  };

  const openMultiscreenModal = (): void => {
    wireMultiscreenModalOnce();
    document.getElementById('multiscreen-modal')!.classList.add('open');
  };
  const closeMultiscreenModal = (): void => document.getElementById('multiscreen-modal')!.classList.remove('open');

  async function openMultiscreenWindow(
    url: string,
    name: string,
    x: number,
    y: number,
    w: number,
    h: number,
    role: string,
  ): Promise<Window | null> {
    const api = window.electronAPI;
    if (api?.openWindow) {
      try {
        await api.openWindow({
          url,
          x: Math.round(x),
          y: Math.round(y),
          width: Math.round(w),
          height: Math.round(h),
          role,
        });
        // Electron child windows aren't a renderer-accessible Window object.
        // Return a stub the existing code can store/test for non-null.
        return { closed: false, close: () => { /* main-process handles close */ } } as unknown as Window;
      } catch (e) {
        console.warn(`[multiscreen] electronAPI.openWindow failed for ${role}, falling back:`, e);
      }
    }
    const features = `width=${Math.round(w)},height=${Math.round(h)},left=${Math.round(x)},top=${Math.round(y)},toolbar=no,menubar=no,scrollbars=no,resizable=yes`;
    return window.open(url, name, features);
  }

  // ─── Screen Role Management ───
  const resetScreenRoles = (screenCount?: number): void => {
    const count = screenCount || _msLayout;
    getScreenRoleManager().resetToDefault(count);
    selectMsLayout(count);
  };

  const swapScreenRoles = (screen1: number, screen2: number): void => {
    getScreenRoleManager().swapRoles(screen1, screen2);
    selectMsLayout(_msLayout);
  };

  const autoDetectScreens = async (): Promise<void> => {
    const info = document.getElementById('ms-detect-info')!; info.classList.add('visible'); info.textContent = 'Scanning...';
    const screensList = await getAllScreensForLayout();
    const screenCount = screensList.length;
    if (screenCount >= 3) { info.textContent = `✓ ${screenCount} screens — 3-screen empfohlen`; selectMsLayout(3); }
    else if (screenCount === 2) { info.textContent = `✓ 2 screens — 2-screen empfohlen`; selectMsLayout(2); }
    else { info.textContent = `1 screen`; selectMsLayout(1); }
  };

  const applyStartupScreenConfig = async (): Promise<void> => {
    const config = window._startupScreenConfig;
    const tableParam = new URLSearchParams(location.search).get('table');

    if (!config) return;

    if (tableParam) {
      const demoTable = tableParam;
      deps.loadDemoTable(demoTable);
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    if (config === 'auto') {
      await autoDetectScreens();
      setTimeout(() => applyMsLayout(), 500);
    } else if ([1, 2, 3].includes(config)) {
      selectMsLayout(config);
      setTimeout(() => applyMsLayout(), 300);
    }
  };

  const applyMsLayout = async (): Promise<void> => {
    closeMultiscreenModal();
    ['dmd', 'backglass'].forEach(role => { if (_msWindows[role] && !(_msWindows[role] as Window).closed) (_msWindows[role] as Window).close(); delete _msWindows[role]; });
    deps.stopInlineBackglass();
    const btn = document.getElementById('multiscreen-btn')!, hdBtn = document.getElementById('hide-dmd-btn')!;
    const base = location.origin + location.pathname, sw = screen.width, sh = screen.height;

    // ─── Get screen role assignments ───
    const screenRoleMgr = getScreenRoleManager();
    const roleLayout = screenRoleMgr.getLayout();

    // Try to get available screens (Phase 4: uses Electron IPC if available)
    const screens: ScreenLike[] = await getAllScreensForLayout();
    devLog(`📺 Screen API detected: ${screens.length} screens found`);
    screens.forEach((s, i) => {
      devLog(`  Screen ${i}: ${s.availWidth}x${s.availHeight} @ (${s.availLeft},${s.availTop})${s.isPrimary ? ' [PRIMARY]' : ''}`);
    });

    if (_msLayout === 1) {
      deps.initInlineBackglass(); btn.classList.add('active-multi');
    } else if (_msLayout === 2) {
      // ─── 2-Screen: Use role assignments ───
      // Find which screen should be backglass/dmd
      const bgScreen = roleLayout.screens.find(s => s.role === 'backglass' || s.role === 'dmd');
      const screenIdx = bgScreen?.screenIndex || 1; // Default to screen 2

      if (screens.length > screenIdx) {
        const screen2 = screens[screenIdx];
        const x = screen2.availLeft, y = screen2.availTop, w = screen2.availWidth, h = screen2.availHeight;
        _msWindows['backglass'] = await openMultiscreenWindow(`${base}?role=backglass`, 'fpw_backglass', x, y, w, h, 'backglass');
        showNotification(`2-Screen: Backglass auf Screen ${screenIdx + 1} geöffnet`);
      } else {
        _msWindows['backglass'] = await openMultiscreenWindow(`${base}?role=backglass`, 'fpw_backglass', 0, 0, sw, sh, 'backglass');
        showNotification('2-Screen: Bitte Backglass-Fenster auf zweiten Monitor ziehen');
      }
      if (hdBtn) { hdBtn.style.display = 'block'; } btn.classList.add('active-multi');
    } else if (_msLayout === 3) {
      // ─── 3-Screen: Use individual role assignments ───
      const bgConfig = roleLayout.screens.find(s => s.role === 'backglass');
      const dmdConfig = roleLayout.screens.find(s => s.role === 'dmd');

      const bgScreenIdx = bgConfig?.screenIndex ?? 1;
      const dmdScreenIdx = dmdConfig?.screenIndex ?? 2;

      devLog(`🎮 3-Screen Mode: Backglass on screen ${bgScreenIdx + 1}, DMD on screen ${dmdScreenIdx + 1}. Detected ${screens.length} physical screens`);

      if (screens.length >= 3) {
        // Backglass on assigned screen
        if (bgScreenIdx < screens.length) {
          const bgScreen = screens[bgScreenIdx];
          const xbg = bgScreen.availLeft, ybg = bgScreen.availTop, wbg = bgScreen.availWidth, hbg = bgScreen.availHeight;
          _msWindows['backglass'] = await openMultiscreenWindow(`${base}?role=backglass&nodmd=1`, 'fpw_backglass', xbg, ybg, wbg, hbg, 'backglass');
        }

        // DMD on assigned screen
        if (dmdScreenIdx < screens.length) {
          const dmdScreen = screens[dmdScreenIdx];
          const xdmd = dmdScreen.availLeft, ydmd = dmdScreen.availTop, wdmd = dmdScreen.availWidth, hdmd = dmdScreen.availHeight;
          devLog(`✓ Opening DMD on Screen ${dmdScreenIdx + 1}: ${wdmd}x${hdmd} at (${xdmd},${ydmd})`);
          _msWindows['dmd'] = await openMultiscreenWindow(`${base}?role=dmd`, 'fpw_dmd', xdmd, ydmd, wdmd, hdmd, 'dmd');
          if (!_msWindows['dmd']) {
            console.warn('⚠ Detailed positioning failed, trying basic openMultiscreenWindow()');
            _msWindows['dmd'] = await openMultiscreenWindow(`${base}?role=dmd`, 'fpw_dmd', 0, 0, 1024, 256, 'dmd');
          }
          if (!_msWindows['dmd']) console.error('⚠ DMD window failed to open - may be blocked by browser or popups disabled');
        } else {
          console.warn(`⚠ DMD screen index ${dmdScreenIdx} >= total screens ${screens.length}, falling back`);
        }

        showNotification(`3-Screen: Backglass auf Screen ${bgScreenIdx + 1}, DMD auf Screen ${dmdScreenIdx + 1} geöffnet`);
      } else if (screens.length === 2) {
        // Fallback for 2 physical screens: backglass on screen 2, DMD on screen 2 (split layout)
        console.warn('⚠ Only 2 screens detected, opening Backglass+DMD both on Screen 2');
        const screen2 = screens[1];
        const x = screen2.availLeft, y = screen2.availTop, w = screen2.availWidth, h = screen2.availHeight;
        _msWindows['backglass'] = await openMultiscreenWindow(`${base}?role=backglass&nodmd=1`, 'fpw_backglass', x, y, w, h, 'backglass');
        devLog(`✓ Backglass opened on Screen 2`);
        _msWindows['dmd'] = await openMultiscreenWindow(`${base}?role=dmd`, 'fpw_dmd', x, y, w, h, 'dmd');
        devLog(`✓ DMD opened on Screen 2`);
        showNotification('3-Screen-Modus mit 2 Bildschirmen: Backglass+DMD auf Screen 2');
      } else {
        // Fallback for single screen: manual arrangement
        _msWindows['backglass'] = await openMultiscreenWindow(`${base}?role=backglass&nodmd=1`, 'fpw_backglass', 0, 0, Math.round(sw * 0.75), Math.round(sh * 0.75), 'backglass');
        _msWindows['dmd'] = await openMultiscreenWindow(`${base}?role=dmd`, 'fpw_dmd', 0, 0, Math.round(sw * 0.55), Math.round(sh * 0.28), 'dmd');
        showNotification('3-Screen: Fenster auf gewünschte Bildschirme ziehen');
      }
      if (hdBtn) hdBtn.style.display = 'block'; btn.classList.add('active-multi');
    }

    // Re-apply DMD visibility based on the new multi-screen layout
    setTimeout(() => {
      deps.initDMDVisibility();
      const wrap = document.getElementById('dmd-wrap');
      const btn2 = document.getElementById('hide-dmd-btn');
      const dmdHidden = deps.getDmdHidden();
      if (wrap) wrap.style.display = dmdHidden ? 'none' : '';
      if (btn2) btn2.classList.toggle('dmd-hidden', dmdHidden);
    }, 200);
  };

  return {
    selectMsLayout,
    openMultiscreenModal,
    closeMultiscreenModal,
    applyMsLayout,
    resetScreenRoles,
    swapScreenRoles,
    autoDetectScreens,
    applyStartupScreenConfig,
  };
}
