// SPDX-License-Identifier: AGPL-3.0-or-later
// © 2026 Harald Weiss
/**
 * NAS Source — Load FPL/FPT files from local NAS file server.
 *
 * The NAS file server runs on the Mac at http://localhost:4157/ and serves
 * files from /Volumes/WindowsBackup/.../FuturePinball/ over HTTP with CORS.
 */

const NAS_SERVER = 'http://localhost:4157';

export type NASStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export interface NASEntry {
  name: string;
  path: string;
  isDir: boolean;
  size: number;
  ext: string;
}

export interface NASState {
  status: NASStatus;
  serverUrl: string;
  entries: NASEntry[];
  currentDir: string;
  error: string;
}

let _state: NASState = {
  status: 'disconnected',
  serverUrl: NAS_SERVER,
  entries: [],
  currentDir: '',
  error: '',
};

let _listeners: Array<(state: NASState) => void> = [];

function notify(): void {
  const s = { ..._state };
  _listeners.forEach(fn => fn(s));
}

export async function checkNASConnection(): Promise<boolean> {
  _state.status = 'connecting';
  notify();
  try {
    const res = await fetch(`${NAS_SERVER}/api/health`, {
      mode: 'cors',
      signal: AbortSignal.timeout(3000),
    });
    if (res.ok) {
      const data = await res.json();
      _state.status = 'connected';
      _state.error = '';
      notify();
      if (import.meta.env.DEV) {
        console.log(`[NAS] Connected: ${data.fplCount} FPL, ${data.fptCount} FPT files`);
      }
      return true;
    }
  } catch (e: any) {
    _state.status = 'error';
    _state.error = e.message || 'Connection failed';
    notify();
    return false;
  }
  _state.status = 'disconnected';
  notify();
  return false;
}

export async function listNASDirectory(dir: string = ''): Promise<NASEntry[]> {
  try {
    const res = await fetch(`${NAS_SERVER}/api/list?dir=${encodeURIComponent(dir)}`, {
      mode: 'cors',
      signal: AbortSignal.timeout(10000),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.entries) {
        _state.entries = data.entries;
        _state.currentDir = dir;
        notify();
        return data.entries;
      }
    }
  } catch {}
  return [];
}

export async function downloadNASFile(filePath: string): Promise<ArrayBuffer | null> {
  try {
    const res = await fetch(`${NAS_SERVER}/api/file?path=${encodeURIComponent(filePath)}`, {
      mode: 'cors',
      signal: AbortSignal.timeout(120000),
    });
    if (res.ok) {
      return await res.arrayBuffer();
    }
  } catch (e: any) {
    if (import.meta.env.DEV) {
      console.warn(`[NAS] Download failed: ${filePath} — ${e.message}`);
    }
  }
  return null;
}

export async function searchNASFiles(query: string): Promise<NASEntry[]> {
  try {
    const res = await fetch(`${NAS_SERVER}/api/search?q=${encodeURIComponent(query)}`, {
      mode: 'cors',
      signal: AbortSignal.timeout(15000),
    });
    if (res.ok) {
      const data = await res.json();
      return data.results || [];
    }
  } catch {}
  return [];
}

export function subscribeNAS(callback: (state: NASState) => void): () => void {
  _listeners.push(callback);
  callback({ ..._state });
  return () => {
    _listeners = _listeners.filter(fn => fn !== callback);
  };
}

export function getNASState(): NASState {
  return { ..._state };
}

export async function connectNAS(): Promise<boolean> {
  const ok = await checkNASConnection();
  if (ok) {
    await listNASDirectory('');
  }
  return ok;
}

export async function loadNASFile(filePath: string): Promise<File | null> {
  const buffer = await downloadNASFile(filePath);
  if (!buffer) return null;
  const name = filePath.split('/').pop() || filePath;
  const blob = new Blob([buffer]);
  return new File([blob], name);
}

// ─── NAS Browser Panel ─────────────────────────────────────────────────────
// Simple floating UI shown when connectNAS() is called

let _panel: HTMLDivElement | null = null;

export function showNASBrowser(): void {
  if (_panel) {
    _panel.style.display = _panel.style.display === 'none' ? 'flex' : 'none';
    return;
  }
  
  const panel = document.createElement('div');
  panel.id = 'fpw-nas-browser';
  panel.style.cssText = [
    'position: fixed; top: 60px; right: 20px; width: 380px; max-height: 70vh;',
    'background: rgba(10,10,20,0.95); border: 1px solid #4488ff;',
    'border-radius: 8px; display: flex; flex-direction: column; z-index: 9998;',
    'font: 12px/1.4 sans-serif; color: #ddd; overflow: hidden;',
    'box-shadow: 0 4px 20px rgba(0,0,0,0.6); backdrop-filter: blur(6px);',
  ].join(' ');
  
  // Header
  const header = document.createElement('div');
  header.style.cssText = [
    'padding: 8px 12px; background: #1a1a2e; border-bottom: 1px solid #333;',
    'font-weight: bold; display: flex; justify-content: space-between; align-items: center;',
  ].join(' ');
  
  const title = document.createElement('span');
  title.style.color = '#88aaff';
  title.textContent = 'NAS File Browser';
  
  const closeBtn = document.createElement('button');
  closeBtn.textContent = 'X';
  closeBtn.style.cssText = [
    'width: 22px; height: 22px; border: none; background: rgba(255,60,60,0.5);',
    'color: #fff; border-radius: 4px; cursor: pointer; font-size: 12px;',
  ].join(' ');
  closeBtn.onclick = () => { panel.style.display = 'none'; };
  
  header.appendChild(title);
  header.appendChild(closeBtn);
  panel.appendChild(header);
  
  // Path breadcrumb
  const pathBar = document.createElement('div');
  pathBar.id = 'fpw-nas-path';
  pathBar.style.cssText = [
    'padding: 4px 12px; background: #0a0a15; border-bottom: 1px solid #222;',
    'font-size: 11px; color: #888; display: flex; gap: 4px;',
  ].join(' ');
  panel.appendChild(pathBar);
  
  // File list
  const fileList = document.createElement('div');
  fileList.id = 'fpw-nas-list';
  fileList.style.cssText = 'flex: 1; overflow-y: auto; padding: 4px 0;';
  fileList.innerHTML = '<div style="padding:20px;text-align:center;color:#666">Connecting...</div>';
  panel.appendChild(fileList);
  
  // Status bar
  const statusBar = document.createElement('div');
  statusBar.id = 'fpw-nas-status';
  statusBar.style.cssText = [
    'padding: 4px 12px; background: #0a0a15; border-top: 1px solid #222;',
    'font-size: 10px; color: #666;',
  ].join(' ');
  panel.appendChild(statusBar);
  
  document.body.appendChild(panel);
  _panel = panel;
  
  // Load NAS file list
  refreshNASList('');
}

async function refreshNASList(dir: string): Promise<void> {
  const list = document.getElementById('fpw-nas-list');
  const pathBar = document.getElementById('fpw-nas-path');
  const statusBar = document.getElementById('fpw-nas-status');
  
  if (!list || !pathBar || !statusBar) return;
  
  list.innerHTML = '<div style="padding:20px;text-align:center;color:#666">Loading...</div>';
  
  const entries = await listNASDirectory(dir);
  
  if (entries.length === 0) {
    list.innerHTML = '<div style="padding:20px;text-align:center;color:#666">No files found</div>';
    statusBar.textContent = '0 files — NAS at ' + NAS_SERVER;
    return;
  }
  
  // Update path
  const parts = dir ? dir.split('/').filter(Boolean) : [];
  pathBar.innerHTML = '<a href="#" data-dir="" style="color:#88aaff">~</a>';
  let cumDir = '';
  for (const p of parts) {
    cumDir += '/' + p;
    pathBar.innerHTML += ' / <a href="#" data-dir="' + cumDir + '" style="color:#88aaff">' + p + '</a>';
  }
  
  // Clickable path
  pathBar.querySelectorAll('a').forEach(a => {
    a.onclick = (e) => {
      e.preventDefault();
      refreshNASList(a.getAttribute('data-dir') || '');
    };
  });
  
  // Render file list
  list.innerHTML = '';
  for (const entry of entries) {
    const item = document.createElement('div');
    item.style.cssText = [
      'padding: 6px 12px; cursor: pointer; display: flex; justify-content: space-between;',
      'align-items: center; border-bottom: 1px solid #1a1a1a; transition: background 0.15s;',
    ].join(' ');
    
    const icon = entry.isDir ? '📁' : (entry.ext === '.fpl' ? '📚' : entry.ext === '.fpt' ? '🎮' : '📄');
    const sizeStr = entry.isDir ? '' : formatBytes(entry.size);
    
    item.innerHTML = '<span>' + icon + ' ' + escapeHtml(entry.name) + '</span>' +
      '<span style="color:#666;font-size:10px">' + sizeStr + '</span>';
    
    item.onmouseenter = () => { item.style.background = 'rgba(68,136,255,0.1)'; };
    item.onmouseleave = () => { item.style.background = ''; };
    
    item.onclick = async () => {
      if (entry.isDir) {
        await refreshNASList(entry.path);
      } else {
        statusBar.textContent = 'Loading ' + entry.name + '...';
        loadNASFileIntoApp(entry.path, entry.name);
      }
    };
    
    list.appendChild(item);
  }
  
  const fplCount = entries.filter(e => !e.isDir && e.ext === '.fpl').length;
  const fptCount = entries.filter(e => !e.isDir && e.ext === '.fpt').length;
  statusBar.textContent = `${entries.filter(e => !e.isDir).length} files (${fplCount} FPL, ${fptCount} FPT) — NAS at ${NAS_SERVER}`;
}

async function loadNASFileIntoApp(filePath: string, fileName: string): Promise<void> {
  const statusBar = document.getElementById('fpw-nas-status');
  if (statusBar) statusBar.textContent = '⬇ Downloading ' + fileName + '...';
  
  const file = await loadNASFile(filePath);
  if (!file) {
    if (statusBar) statusBar.textContent = '❌ Failed to load ' + fileName;
    return;
  }
  
  if (statusBar) statusBar.textContent = '📦 Processing ' + fileName + '...';
  
  // Dispatch a custom event so main.ts can handle the file
  const event = new CustomEvent('fpl-file-loaded', { detail: { file } });
  window.dispatchEvent(event);
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return (bytes / Math.pow(k, i)).toFixed(i > 0 ? 1 : 0) + ' ' + sizes[i];
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
