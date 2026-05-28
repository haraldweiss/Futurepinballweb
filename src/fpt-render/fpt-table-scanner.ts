// SPDX-License-Identifier: AGPL-3.0-or-later
// © 2026 Harald Weiss
/**
 * fpt-table-scanner.ts — Scan a directory for .fpt files via Electron IPC.
 *
 * Electron-only: in plain browsers `electronAPI` is undefined and we return
 * an empty list (the user falls back to the existing drag-drop / file-picker
 * path in src/file-browser.ts).
 */

export interface FPTFileEntry {
  /** Absolute path on disk. */
  path: string;
  /** Filename without `.fpt` extension. */
  name: string;
  /** File size in bytes. */
  size: number;
  /** Last-modified timestamp (epoch ms). */
  mtime: number;
}

export async function scanFPTDirectory(dirPath: string): Promise<FPTFileEntry[]> {
  const api = (window as any).electronAPI;
  if (!api?.scanFPTDirectory) return [];
  try {
    const entries = await api.scanFPTDirectory(dirPath);
    return Array.isArray(entries) ? entries : [];
  } catch (e) {
    console.warn('[fpt-scanner] scan failed:', e);
    return [];
  }
}
