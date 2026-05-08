// SPDX-License-Identifier: AGPL-3.0-or-later
// © 2026 Harald Weiss
/**
 * electron-preload.cjs — Preload Script for Secure Context
 *
 * Exposes safe APIs to the renderer process using context isolation
 * for security. Uses .cjs to keep CommonJS semantics under
 * "type": "module" — see electron-main.cjs for the full rationale.
 */

const { contextBridge, ipcRenderer } = require('electron');

// Expose safe APIs to window context
contextBridge.exposeInMainWorld('electronAPI', {
  // File operations
  openFile: (options) => ipcRenderer.invoke('dialog:openFile', options),
  saveFile: (options) => ipcRenderer.invoke('dialog:saveFile', options),
  selectDirectory: () => ipcRenderer.invoke('dialog:selectDirectory'),

  // App info
  getVersion: () => ipcRenderer.invoke('app:getVersion'),
  getPath: (name) => ipcRenderer.invoke('app:getPath', name),

  // Updates
  checkForUpdates: () => ipcRenderer.invoke('updater:checkForUpdates'),
  quitAndInstall: () => ipcRenderer.invoke('updater:quitAndInstall'),

  // Update notifications
  onUpdateAvailable: (callback) => {
    ipcRenderer.on('updater:update-available', callback);
  },
  onUpdateDownloaded: (callback) => {
    ipcRenderer.on('updater:update-downloaded', callback);
  },
  onUpdateError: (callback) => {
    ipcRenderer.on('updater:error', (_event, message) => {
      callback(message);
    });
  },

  // Remove listeners
  removeUpdateListeners: () => {
    ipcRenderer.removeAllListeners('updater:update-available');
    ipcRenderer.removeAllListeners('updater:update-downloaded');
    ipcRenderer.removeAllListeners('updater:error');
  },

  // Multi-screen support (Phase 4) — Electron-only path, undefined in browser
  getAllDisplays: () => ipcRenderer.invoke('screen:getAllDisplays'),
  openWindow: (options) => ipcRenderer.invoke('window:openOnDisplay', options),
  closeWindow: (id) => ipcRenderer.invoke('window:close', id),
  closeAllChildWindows: () => ipcRenderer.invoke('window:closeAllChildren'),
});
