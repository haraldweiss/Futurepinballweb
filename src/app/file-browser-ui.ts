/**
 * file-browser-ui.ts — DOM-level file browsing functions for tables and libraries.
 *
 * Extracted from main.ts: browseTableDirectory, browseLibraryDirectory,
 * renderTableFileGrid, renderLibraryFileList.
 *
 * These interact with the File System Access API (showDirectoryPicker) or
 * fallback to webkitdirectory, and render results into DOM grids/lists.
 */
import * as THREE from 'three';
import {
  updateTablePathShortcuts, updateLibraryPathShortcuts,
} from './path-shortcuts';
import { DirectoryPathManager } from '../directory-path-manager';
import { appendLogEntry } from './log-utils';
import { escapeHtml } from '../utils/html-escape';
import { parseFPTFile, parseFPLFile } from '../fpt-parser';
import { setLoadedLibrary } from '../game';
import { createLibrarySelector } from './library-selector';

export interface FileBrowserUIDeps {
  /** Main entry point to load a table with physics worker. */
  loadTableWithPhysicsWorker: (cfg: any, scene: THREE.Scene, library?: any) => Promise<void>;
  /** Reset full game state before loading a new table. */
  resetGameState: () => void;
  /** The current THREE.Scene instance. */
  scene: THREE.Scene;
}

export interface FileBrowserUIApi {
  browseTableDirectory: () => Promise<void>;
  browseLibraryDirectory: () => Promise<void>;
}

/**
 * Initialize DOM-level file browsing functions and wire event listeners.
 * Returns references to browseTableDirectory and browseLibraryDirectory
 * for use by path-shortcut callbacks and window-api registration.
 */
export function initFileBrowserUI(deps: FileBrowserUIDeps): FileBrowserUIApi {
  const { loadTableWithPhysicsWorker, resetGameState, scene } = deps;
  const showLibrarySelector = createLibrarySelector({ loadTableWithPhysicsWorker, resetGameState, scene });
  const libraryRef = () => (window as any)._loadedLibrary;

  // ─── File Input / Drag-and-Drop ───
  const handleFile = async (f: File) => {
    if (f.name.endsWith('.fpl')) {
      await parseFPLFile(
        f,
        (lib: any) => {
          setLoadedLibrary(lib);
          showLibrarySelector(lib);
          appendLogEntry(`📚 Library loaded: ${lib.name} (${Object.keys(lib.tableTemplates).length} tables)`);
        },
        (err) => appendLogEntry(`❌ FPL Error: ${err}`, 'error')
      );
    } else if (f.name.endsWith('.fpt')) {
      resetGameState();
      parseFPTFile(f,
        cfg => loadTableWithPhysicsWorker(cfg, scene, libraryRef()),
        () => window.closeLoader(),
        (t: string) => window.switchTab(t)
      );
    }
  };

  // ─── Wire file input + drop zone event listeners ───
  const fileInput = document.getElementById('file-input') as HTMLInputElement;
  const dropZone = document.getElementById('drop-zone') as HTMLElement;

  if (fileInput) {
    fileInput.addEventListener('change', e => {
      const f = (e.target as HTMLInputElement).files?.[0];
      if (f) handleFile(f);
    });
  }
  if (dropZone) {
    dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('drag-over'); });
    dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
    dropZone.addEventListener('drop', e => {
      e.preventDefault();
      dropZone.classList.remove('drag-over');
      const f = e.dataTransfer?.files[0];
      if (f) handleFile(f);
    });
  }

  // ─── Table Directory Browser ───
  async function browseTableDirectory(): Promise<void> {
    const dirPathInput = document.getElementById('table-dir-path') as HTMLInputElement;
    const tableInput = document.getElementById('table-dir-input') as HTMLInputElement;

    appendLogEntry('📂 Verzeichnis wird ausgewählt...', 'info');

    if ('showDirectoryPicker' in window) {
      try {
        const dirHandle = await window.showDirectoryPicker!();
        dirPathInput.value = dirHandle.name || 'Tabellenverzeichnis';
        DirectoryPathManager.saveTablePath(dirHandle.name || 'Tabellenverzeichnis');
        updateTablePathShortcuts(browseTableDirectory);

        const files: File[] = [];
        for await (const [name, handle] of dirHandle.entries()) {
          if (name.endsWith('.fpt') || name.endsWith('.fp')) {
            try {
              const file = await (handle as FileSystemFileHandle).getFile();
              files.push(file);
            } catch (e) {
              console.warn(`⚠ Fehler beim Lesen der Datei ${name}:`, e);
            }
          }
        }

        appendLogEntry(`✅ ${files.length} Tabellen-Dateien gefunden`, 'ok');
        renderTableFileGrid(files);
      } catch (e: any) {
        if (e.name === 'AbortError') {
          appendLogEntry('❌ Verzeichnis-Auswahl abgebrochen', 'warn');
        } else {
          appendLogEntry(`❌ Fehler beim Verzeichnis-Picker: ${e.message}`, 'error');
        }
      }
    } else if (tableInput) {
      tableInput.onchange = (e) => {
        const input = e.target as HTMLInputElement;
        if (input.files && input.files.length > 0) {
          const files: File[] = [];
          Array.from(input.files).forEach(f => {
            if (f.name.endsWith('.fpt') || f.name.endsWith('.fp')) {
              files.push(f);
            }
          });
          dirPathInput.value = 'Tabellenverzeichnis';
          DirectoryPathManager.saveTablePath('Tabellenverzeichnis');
          updateTablePathShortcuts(browseTableDirectory);
          appendLogEntry(`✅ ${files.length} Tabellen-Dateien gefunden`, 'ok');
          renderTableFileGrid(files);
        } else {
          appendLogEntry('❌ Keine Dateien ausgewählt', 'warn');
        }
      };
      tableInput.click();
    } else {
      appendLogEntry('❌ Verzeichnis-Auswahl wird in diesem Browser nicht unterstützt', 'error');
    }
  }

  // ─── Table File Grid ───
  function renderTableFileGrid(files: File[]): void {
    const grid = document.getElementById('table-file-grid')!;
    grid.innerHTML = '';
    if (files.length === 0) {
      grid.innerHTML = '<p style="color:#667; font-size:12px; text-align:center;">Keine .fpt Dateien gefunden.</p>';
      return;
    }

    files.sort((a, b) => a.name.localeCompare(b.name));
    for (const f of files) {
      const card = document.createElement('div');
      card.className = 'table-card';
      const sizeMB = (f.size / 1024 / 1024).toFixed(2);
      const displayName = escapeHtml(f.name.replace(/\.fpt$/i, ''));
      card.innerHTML = `<div class="preview">🎱</div><h3>${displayName}</h3><span>${sizeMB} MB</span>`;
      card.style.cursor = 'pointer';
      card.onclick = () => {
        resetGameState();
        parseFPTFile(f,
          cfg => loadTableWithPhysicsWorker(cfg, scene, libraryRef()),
          () => window.closeLoader(),
          (t: string) => window.switchTab(t)
        );
      };
      grid.appendChild(card);
    }
  }

  // ─── Library Directory Browser ───
  async function browseLibraryDirectory(): Promise<void> {
    const dirPathInput = document.getElementById('lib-dir-path') as HTMLInputElement;
    const libInput = document.getElementById('lib-dir-input') as HTMLInputElement;

    appendLogEntry('📚 Bibliotheksverzeichnis wird ausgewählt...', 'info');

    if ('showDirectoryPicker' in window) {
      try {
        const dirHandle = await window.showDirectoryPicker!();
        dirPathInput.value = dirHandle.name || 'Bibliotheksverzeichnis';
        DirectoryPathManager.saveLibraryPath(dirHandle.name || 'Bibliotheksverzeichnis');
        updateLibraryPathShortcuts(browseLibraryDirectory);

        const files: File[] = [];
        for await (const [name, handle] of dirHandle.entries()) {
          if (name.endsWith('.fpl')) {
            try {
              const file = await (handle as FileSystemFileHandle).getFile();
              files.push(file);
            } catch (e) {
              console.warn(`⚠ Fehler beim Lesen der Datei ${name}:`, e);
            }
          }
        }

        appendLogEntry(`✅ ${files.length} Bibliotheks-Dateien gefunden`, 'ok');
        renderLibraryFileList(files);
      } catch (e: any) {
        if (e.name === 'AbortError') {
          appendLogEntry('❌ Verzeichnis-Auswahl abgebrochen', 'warn');
        } else {
          appendLogEntry(`❌ Fehler beim Verzeichnis-Picker: ${e.message}`, 'error');
        }
      }
    } else if (libInput) {
      libInput.onchange = (e) => {
        const input = e.target as HTMLInputElement;
        if (input.files && input.files.length > 0) {
          const files: File[] = [];
          Array.from(input.files).forEach(f => {
            if (f.name.endsWith('.fpl')) {
              files.push(f);
            }
          });
          dirPathInput.value = 'Bibliotheksverzeichnis';
          DirectoryPathManager.saveLibraryPath('Bibliotheksverzeichnis');
          updateLibraryPathShortcuts(browseLibraryDirectory);
          appendLogEntry(`✅ ${files.length} Bibliotheks-Dateien gefunden`, 'ok');
          renderLibraryFileList(files);
        } else {
          appendLogEntry('❌ Keine Dateien ausgewählt', 'warn');
        }
      };
      libInput.click();
    } else {
      appendLogEntry('❌ Verzeichnis-Auswahl wird in diesem Browser nicht unterstützt', 'error');
    }
  }

  // ─── Library File List ───
  function renderLibraryFileList(files: File[]): void {
    const list = document.getElementById('lib-file-list')!;
    list.innerHTML = '';

    if (files.length === 0) {
      list.innerHTML = '<p style="color:#667; font-size:12px;">Keine .fpl Dateien gefunden.</p>';
      return;
    }

    for (const f of files) {
      const btn = document.createElement('button');
      btn.className = 'tab-btn';
      btn.style.display = 'block';
      btn.style.marginBottom = '6px';
      btn.style.width = '100%';
      btn.style.textAlign = 'left';
      btn.textContent = `📚 ${f.name.replace(/\.fpl$/i, '')} (${(f.size / 1024).toFixed(0)} KB)`;
      btn.onclick = async () => {
        await parseFPLFile(f,
          (lib: any) => {
            setLoadedLibrary(lib);
            (document.getElementById('lib-status') as HTMLElement).textContent =
              `✅ ${lib.name} geladen (${Object.keys(lib.tableTemplates || {}).length} Tabellen)`;
            appendLogEntry(`📚 Library: ${lib.name}`);
          },
          (err: string) => appendLogEntry(`❌ FPL Error: ${err}`, 'error')
        );
      };
      list.appendChild(btn);
    }
  }

  // ─── Wire directory browser buttons ───
  const btnBrowseTables = document.getElementById('btn-browse-tables');
  if (btnBrowseTables) btnBrowseTables.addEventListener('click', () => browseTableDirectory());

  const btnBrowseLibrary = document.getElementById('btn-browse-library');
  if (btnBrowseLibrary) btnBrowseLibrary.addEventListener('click', () => browseLibraryDirectory());

  return { browseTableDirectory, browseLibraryDirectory };
}
