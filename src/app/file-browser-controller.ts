// SPDX-License-Identifier: AGPL-3.0-or-later
import {
  FileInfo, formatFileSize,
  getFileSystemBrowser,
  getFileBrowserUIManager,
  getAdvancedFileBrowserManager,
  type BatchJob,
} from '../file-browser';
import { appendLogEntry } from './log-utils';
import { parseFPTFile } from '../fpt-parser';
import { showLoadingOverlay, hideLoadingOverlay, updateLoadingProgress } from './loader-ui';
import { switchTab, closeLoader } from './ui-utils';

/** Physics/scene/state-touching hooks that stay on the main.ts entry point (§3.3). */
export interface FileBrowserDeps {
  resetGameState: () => void;
  /** Build + wire a parsed FPT config into the live scene/physics worker. */
  loadTableConfig: (cfg: unknown) => Promise<void>;
}

export interface FileBrowserApi {
  updateFileBrowserUI: () => void;
  browseTableDirectoryFS: () => Promise<void>;
  browseLibraryDirectoryFS: () => Promise<void>;
  selectTableFile: (fileInfo: FileInfo) => void;
  loadSelectedTable: () => Promise<void>;
  addToFavorites: (filename: string, type: 'table' | 'library') => void;
  getAdvancedFavoritesCount: () => number;
  getRecentTables: () => FileInfo[];
  createBatchLoadJob: (tableNames: string[]) => string;
  getBatchJobStatus: (jobId: string) => BatchJob | undefined;
  setupTableDragDrop: () => void;
  sortTableFiles: (field: string, files?: FileInfo[]) => FileInfo[];
}

/** Build a styled <div> with optional text — small helper for the status panel. */
function div(cssText: string, text?: string): HTMLDivElement {
  const d = document.createElement('div');
  d.style.cssText = cssText;
  if (text !== undefined) d.textContent = text;
  return d;
}

/**
 * File-browser controller: directory browsing, table/library selection, favourites,
 * batch jobs, drag&drop and the "load selected table" flow.
 *
 * Extracted from main.ts. Owns its own selection state; file-system / UI / advanced
 * managers and the loader overlay are imported directly. The physics-worker table
 * build and game-state reset stay on the entry point and are injected via
 * FileBrowserDeps so the Rapier bridge (§3.3) is not reached from here.
 */
export function initFileBrowser(deps: FileBrowserDeps): FileBrowserApi {
  const fileBrowserState = {
    selectedTableFile: null as FileInfo | null,
    selectedLibraryFiles: [] as FileInfo[],
    tableDirectory: null as FileSystemDirectoryHandle | null,
    libraryDirectory: null as FileSystemDirectoryHandle | null,
  };

  function updateFileBrowserUI(): void {
    // Update status
    const tableCount = fileBrowserState.selectedTableFile ? 1 : 0;
    const libCount = fileBrowserState.selectedLibraryFiles.length;
    const tableSize = fileBrowserState.selectedTableFile ? fileBrowserState.selectedTableFile.size : 0;
    const libSize = fileBrowserState.selectedLibraryFiles.reduce((sum, lib) => sum + lib.size, 0);
    const totalSize = tableSize + libSize;

    // Build the status panel with safe DOM construction (was innerHTML).
    const grid = div('display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 10px;');

    const tableBox = div('background: rgba(0, 150, 100, 0.1); border: 1px solid #00ff88; border-radius: 4px; padding: 8px;');
    tableBox.append(
      div('color: #667; font-size: 9px; margin-bottom: 3px;', '📚 TISCH'),
      div('color: #00ff88; font-size: 13px; font-weight: bold;', String(tableCount)),
      div('color: #556; font-size: 9px; margin-top: 2px;', formatFileSize(tableSize)),
    );

    const libBox = div('background: rgba(0, 100, 180, 0.1); border: 1px solid #0088ff; border-radius: 4px; padding: 8px;');
    libBox.append(
      div('color: #667; font-size: 9px; margin-bottom: 3px;', '📦 BIBLIOTHEKEN'),
      div('color: #0088ff; font-size: 13px; font-weight: bold;', String(libCount)),
      div('color: #556; font-size: 9px; margin-top: 2px;', formatFileSize(libSize)),
    );
    grid.append(tableBox, libBox);

    const totalWrap = div('color: #667; font-size: 9px; padding-top: 8px; border-top: 1px solid #334;');
    totalWrap.append(div('color: #ffaa00;', `💾 Gesamt: ${formatFileSize(totalSize)}`));

    const statusEl = document.getElementById('browser-status')!;
    statusEl.replaceChildren(grid, totalWrap);

    // Show/hide load button
    const loadBtn = document.getElementById('load-selected-btn')!;
    if (fileBrowserState.selectedTableFile) {
      loadBtn.style.display = 'block';
      // textContent renders the filename literally (no HTML parsing) — equivalent to
      // the previous escapeHtml()+innerHTML, without the XSS surface.
      loadBtn.textContent = `▶ ${fileBrowserState.selectedTableFile.name} LADEN`;
    } else {
      loadBtn.style.display = 'none';
    }
  }

  const browseTableDirectoryFS = async (): Promise<void> => {
    try {
      const browser = getFileSystemBrowser();
      const uiManager = getFileBrowserUIManager();
      const tables = await browser.selectTableDirectory();

      fileBrowserState.tableDirectory = browser.getSelectedDirectories().tableDirectory;
      fileBrowserState.selectedTableFile = null;
      fileBrowserState.selectedLibraryFiles = [];

      const tablesList = document.getElementById('tables-list')!;
      if (tables.length === 0) {
        tablesList.style.display = 'none';
        return;
      }

      tablesList.style.display = 'block';
      tablesList.replaceChildren();

      const filterContainer = document.createElement('div');
      filterContainer.style.cssText = 'margin-bottom: 8px;';
      const filterInput = document.createElement('input');
      filterInput.type = 'text';
      filterInput.placeholder = '🔍 Tisch durchsuchen...';
      filterInput.style.cssText = `
        width: 100%;
        padding: 4px 6px;
        background: rgba(0, 20, 40, 0.5);
        border: 1px solid #334;
        border-radius: 4px;
        color: #aab;
        font-size: 10px;
        font-family: 'Courier New', monospace;
        box-sizing: border-box;
      `;

      filterContainer.appendChild(filterInput);
      tablesList.parentElement?.insertBefore(filterContainer, tablesList);

      const renderRows = (filesToRender: FileInfo[]) => {
        tablesList.replaceChildren();
        for (const table of filesToRender) {
          const row = uiManager.createFileRow(table, false, (file) => selectTableFile(file));
          tablesList.appendChild(row);
        }
      };

      renderRows(tables);

      filterInput.oninput = () => {
        const filtered = uiManager.filterFiles(tables, filterInput.value);
        renderRows(filtered);
      };

      updateFileBrowserUI();
    } catch (error) {
      console.error('❌ Failed to browse table directory:', error);
    }
  };

  const browseLibraryDirectoryFS = async (): Promise<void> => {
    try {
      const browser = getFileSystemBrowser();
      const uiManager = getFileBrowserUIManager();
      const libraries = await browser.selectLibraryDirectory();

      fileBrowserState.libraryDirectory = browser.getSelectedDirectories().libraryDirectory;
      fileBrowserState.selectedLibraryFiles = [...libraries];

      const libsList = document.getElementById('libraries-list')!;
      if (libraries.length === 0) {
        libsList.style.display = 'none';
        return;
      }

      libsList.style.display = 'block';
      libsList.replaceChildren();

      const filterContainer = document.createElement('div');
      filterContainer.style.cssText = 'margin-bottom: 8px;';
      const filterInput = document.createElement('input');
      filterInput.type = 'text';
      filterInput.placeholder = '🔍 Bibliothek durchsuchen...';
      filterInput.style.cssText = `
        width: 100%;
        padding: 4px 6px;
        background: rgba(0, 20, 40, 0.5);
        border: 1px solid #334;
        border-radius: 4px;
        color: #aab;
        font-size: 10px;
        font-family: 'Courier New', monospace;
        box-sizing: border-box;
      `;

      filterContainer.appendChild(filterInput);
      libsList.parentElement?.insertBefore(filterContainer, libsList);

      const renderRows = (filesToRender: FileInfo[]) => {
        libsList.replaceChildren();
        for (const lib of filesToRender) {
          const isSelected = fileBrowserState.selectedLibraryFiles.some(l => l.name === lib.name);
          const row = uiManager.createLibraryCheckbox(lib, isSelected, (file, selected) => {
            if (selected) {
              if (!fileBrowserState.selectedLibraryFiles.some(l => l.name === file.name)) {
                fileBrowserState.selectedLibraryFiles.push(file);
              }
            } else {
              fileBrowserState.selectedLibraryFiles = fileBrowserState.selectedLibraryFiles.filter(l => l.name !== file.name);
            }
            updateFileBrowserUI();
          });
          libsList.appendChild(row);
        }
      };

      renderRows(libraries);

      // Filter on input
      filterInput.oninput = () => {
        const filtered = uiManager.filterFiles(libraries, filterInput.value);
        renderRows(filtered);
      };

      updateFileBrowserUI();
    } catch (error) {
      console.error('❌ Failed to browse library directory:', error);
    }
  };

  function selectTableFile(fileInfo: FileInfo): void {
    fileBrowserState.selectedTableFile = fileInfo;

    // Update visual selection
    const tablesList = document.getElementById('tables-list')!;
    for (const row of tablesList.querySelectorAll('div[style*="border-bottom"]')) {
      (row as HTMLElement).style.background = '';
    }

    // Find and highlight selected row
    for (const row of tablesList.querySelectorAll('div[style*="border-bottom"]')) {
      const nameEl = (row as HTMLElement).querySelector('div') as HTMLElement;
      if (nameEl && nameEl.textContent?.includes(fileInfo.name)) {
        (row as HTMLElement).style.background = 'rgba(0,200,100,0.2)';
        (row as HTMLElement).style.borderLeft = '3px solid #00ff88';
      }
    }

    updateFileBrowserUI();
  }

  const loadSelectedTable = async (): Promise<void> => {
    if (!fileBrowserState.selectedTableFile) {
      console.warn('⚠️ No table file selected');
      return;
    }

    try {
      const browser = getFileSystemBrowser();
      const fileHandle = fileBrowserState.selectedTableFile.handle as FileSystemFileHandle;
      const file = await browser.getFile(fileHandle);

      appendLogEntry(`Loading FPT: ${file.name} (${formatFileSize(file.size)})...`);

      showLoadingOverlay();

      const loadingCallbacks = {
        onPhaseStart: (phase: string) => {
          updateLoadingProgress(phase, 0, 1);
        },
        onResourceLoaded: (type: string, _name: string, progress: { current: number; total: number }) => {
          updateLoadingProgress(type, progress.current, progress.total);
        },
        onPhaseComplete: (phase: string, duration: number) => {
          appendLogEntry(`✓ ${phase.toUpperCase()} phase complete: ${duration.toFixed(0)}ms`);
        }
      };

      deps.resetGameState();
      await parseFPTFile(
        file,
        async (cfg: unknown) => {
          await deps.loadTableConfig(cfg);
        },
        () => {
          hideLoadingOverlay();
          closeLoader();
        },
        (tab: string) => {
          switchTab(tab);
        },
        loadingCallbacks
      );

      appendLogEntry(`✓ Loaded: ${file.name}`, 'ok');
      hideLoadingOverlay();
    } catch (error) {
      console.error('❌ Error loading table:', error);
      hideLoadingOverlay();
      appendLogEntry(`❌ Error: ${error instanceof Error ? error.message : String(error)}`, 'error');
    }
  };

  // ─── Advanced File Browser Features (Option A) ──────────────────────────────────
  const addToFavorites = (filename: string, type: 'table' | 'library'): void => {
    const advancedMgr = getAdvancedFileBrowserManager();
    const targetList = type === 'table' ? fileBrowserState.selectedTableFile : fileBrowserState.selectedLibraryFiles.find(f => f.name === filename);

    if (targetList) {
      advancedMgr.addFavorite(targetList, type);
      appendLogEntry(`⭐ Added to favorites: ${filename}`, 'log-ok');
    } else {
      console.warn('File not found in current selection');
    }
  };

  const getAdvancedFavoritesCount = (): number => {
    const advancedMgr = getAdvancedFileBrowserManager();
    return advancedMgr.getFavorites().length;
  };

  const getRecentTables = (): FileInfo[] => {
    const advancedMgr = getAdvancedFileBrowserManager();
    return advancedMgr.getRecent();
  };

  const createBatchLoadJob = (_tableNames: string[]): string => {
    const advancedMgr = getAdvancedFileBrowserManager();
    const files = fileBrowserState.selectedTableFile
      ? [fileBrowserState.selectedTableFile]
      : [];

    const job = advancedMgr.createBatchJob(files, fileBrowserState.selectedLibraryFiles);
    appendLogEntry(`📋 Created batch job: ${job.id}`, 'log-info');
    return job.id;
  };

  const getBatchJobStatus = (jobId: string): BatchJob | undefined => {
    const advancedMgr = getAdvancedFileBrowserManager();
    return advancedMgr.getBatchJob(jobId);
  };

  const setupTableDragDrop = (): void => {
    const advancedMgr = getAdvancedFileBrowserManager();
    const dropZone = document.getElementById('game-canvas');

    if (dropZone) {
      advancedMgr.setupDragDrop(dropZone, async (files: File[], type: 'table' | 'library') => {
        appendLogEntry(`📂 Dropped ${files.length} ${type} file${files.length !== 1 ? 's' : ''}`, 'log-info');
      });
      appendLogEntry('✓ Drag & drop enabled for game canvas', 'log-ok');
    }
  };

  const sortTableFiles = (field: string, files?: FileInfo[]): FileInfo[] => {
    const advancedMgr = getAdvancedFileBrowserManager();
    const filesToSort = files || (fileBrowserState.selectedTableFile ? [fileBrowserState.selectedTableFile] : []);
    return advancedMgr.sortFiles(filesToSort, field);
  };

  return {
    updateFileBrowserUI,
    browseTableDirectoryFS,
    browseLibraryDirectoryFS,
    selectTableFile,
    loadSelectedTable,
    addToFavorites,
    getAdvancedFavoritesCount,
    getRecentTables,
    createBatchLoadJob,
    getBatchJobStatus,
    setupTableDragDrop,
    sortTableFiles,
  };
}
