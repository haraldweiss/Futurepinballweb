// SPDX-License-Identifier: AGPL-3.0-or-later
// © 2026 Harald Weiss
/**
 * file-browser.ts — Barrel for FPT & Library File Browser (Core + UI + Advanced)
 */

export * from './file-browser/types';
export * from './file-browser/core';
export * from './file-browser/utils';
export * from './file-browser/ui';
export * from './file-browser/advanced';

import { FileSystemBrowser } from './file-browser/core';
import { FileBrowserUIManager } from './file-browser/ui';
import { AdvancedFileBrowserManager } from './file-browser/advanced';

let globalBrowser: FileSystemBrowser | null = null;
let globalUIManager: FileBrowserUIManager | null = null;
let globalAdvancedManager: AdvancedFileBrowserManager | null = null;

export function getFileSystemBrowser(): FileSystemBrowser {
  if (!globalBrowser) globalBrowser = new FileSystemBrowser();
  return globalBrowser;
}

export function resetFileSystemBrowser(): void {
  if (globalBrowser) { globalBrowser.clear(); globalBrowser = null; }
}

export function getFileBrowserUIManager(): FileBrowserUIManager {
  if (!globalUIManager) globalUIManager = new FileBrowserUIManager();
  return globalUIManager;
}

export function resetFileBrowserUIManager(): void {
  globalUIManager = null;
}

export function getAdvancedFileBrowserManager(): AdvancedFileBrowserManager {
  if (!globalAdvancedManager) {
    globalAdvancedManager = new AdvancedFileBrowserManager();
    globalAdvancedManager.loadFavoritesFromStorage();
  }
  return globalAdvancedManager;
}

export function resetAdvancedFileBrowserManager(): void {
  globalAdvancedManager = null;
}
