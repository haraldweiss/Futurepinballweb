// SPDX-License-Identifier: AGPL-3.0-or-later
// © 2026 Harald Weiss
/**
 * fpt-path-config.ts — Persist the chosen FPT directory across sessions.
 *
 * The user picks a directory once (Phase B0 setup dialog). The path is saved
 * to localStorage. On subsequent app starts, scanFPTDirectory(getFPTPath())
 * runs automatically and populates the Quick Menu.
 */

export const FPT_PATH_KEY = 'fpw_fpt_directory';

export function getFPTPath(): string | null {
  try {
    const v = localStorage.getItem(FPT_PATH_KEY);
    return v && v.length > 0 ? v : null;
  } catch {
    return null;
  }
}

export function setFPTPath(path: string): void {
  try {
    if (path && path.length > 0) {
      localStorage.setItem(FPT_PATH_KEY, path);
    } else {
      localStorage.removeItem(FPT_PATH_KEY);
    }
  } catch { /* localStorage may throw under strict policies */ }
}

export function clearFPTPath(): void {
  try { localStorage.removeItem(FPT_PATH_KEY); } catch { /* ignore */ }
}
