// SPDX-License-Identifier: AGPL-3.0-or-later
import { getScreenRoleManager } from '../screen-role-manager';
import { devLog } from '../utils/dev-log';

export interface DmdVisibilityApi {
  /** Auto-hide the playfield DMD when a dedicated DMD screen is configured. */
  initDMDVisibility: () => void;
  /** Manually toggle DMD visibility (hide-dmd button). */
  toggleHideDMD: () => void;
  /** Current hidden state. */
  getDmdHidden: () => boolean;
}

/**
 * DMD on-screen visibility for the playfield window.
 *
 * Extracted from main.ts. Owns the hidden flag; the window role is injected
 * (the URL `?role=` value) since it is read once at startup on the entry point.
 */
export function createDmdVisibility(fpwRole: string | null): DmdVisibilityApi {
  let dmdHidden = false;

  // ─── Auto-hide DMD on playfield when using multi-screen mode ───
  // Check if we're in a multi-screen setup with dedicated DMD screen
  const initDMDVisibility = (): void => {
    const screenRoleMgr = getScreenRoleManager();
    const layout = screenRoleMgr.getLayout();
    const hasDedicatedDMD = layout.screens.some(s => s.role === 'dmd');

    // If multi-screen mode with dedicated DMD, and this is NOT the DMD window, hide it
    if (layout.screenCount > 1 && hasDedicatedDMD && fpwRole !== 'dmd') {
      dmdHidden = true;
      devLog(`🎮 Multi-screen mode detected: DMD hidden on ${fpwRole || 'playfield'} window`);
    }
  };

  const toggleHideDMD = (): void => {
    dmdHidden = !dmdHidden;
    const wrap = document.getElementById('dmd-wrap')!, btn = document.getElementById('hide-dmd-btn')!;
    wrap.style.display = dmdHidden ? 'none' : '';
    btn.classList.toggle('dmd-hidden', dmdHidden);
  };

  const getDmdHidden = (): boolean => dmdHidden;

  return { initDMDVisibility, toggleHideDMD, getDmdHidden };
}
