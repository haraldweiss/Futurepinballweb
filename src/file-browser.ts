// SPDX-License-Identifier: AGPL-3.0-or-later
// © 2026 Harald Weiss
/**
 * file-browser.ts — FPT & Library File Browser (Core + UI + Advanced)
 *
 * Consolidated from file-browser.ts, file-browser-ui.ts, file-browser-advanced.ts
 */

export interface FileInfo {
  name: string;
  size: number;
  modified: number;
  handle: FileSystemFileHandle | FileSystemDirectoryHandle;
  type?: 'fpt' | 'fpl' | 'lib';
}

export interface FileOverview {
  tables: FileInfo[];
  libraries: FileInfo[];
  selectedTable: FileInfo | null;
  selectedLibraries: FileInfo[];
  tableDirectory?: FileSystemDirectoryHandle;
  libraryDirectory?: FileSystemDirectoryHandle;
}

export interface FileDisplay {
  fileInfo: FileInfo;
  isSelected: boolean;
  isHovered: boolean;
  preview?: string;
}

export interface FavoriteEntry {
  name: string;
  path: string;
  type: 'table' | 'library';
  addedDate: number;
  lastUsed: number;
  iconColor?: string;
}

export interface BatchJob {
  id: string;
  files: FileInfo[];
  libraries: FileInfo[];
  status: 'pending' | 'loading' | 'completed' | 'failed';
  progress: number;
  currentFile?: FileInfo;
  results: Array<{
    file: FileInfo;
    success: boolean;
    error?: string;
    duration: number;
  }>;
}

export interface FilePreview {
  fileInfo: FileInfo;
  thumbnail?: string;
  estimatedDuration?: number;
  dimensions?: { width: number; height: number };
  description?: string;
}

// ─── Core: FileSystemBrowser ─────────────────────────────────────────────────

export class FileSystemBrowser {
  private tableDirectory: FileSystemDirectoryHandle | null = null;
  private libraryDirectory: FileSystemDirectoryHandle | null = null;

  async selectTableDirectory(): Promise<FileInfo[]> {
    if ('showDirectoryPicker' in window) {
      try {
        this.tableDirectory = await (window as any).showDirectoryPicker();
        if (this.tableDirectory) {
          console.log('✓ Table directory selected (FSA):', this.tableDirectory.name);
          return this.scanDirectory(this.tableDirectory, '.fpt');
        }
      } catch (error) {
        const errMsg = error instanceof Error ? error.message : String(error);
        console.warn(`FSA failed: ${errMsg}, trying fallback...`);
      }
    } else {
      console.warn('File System Access API not available, using fallback');
    }
    return this.selectTableDirectoryFallback();
  }

  async selectLibraryDirectory(): Promise<FileInfo[]> {
    if ('showDirectoryPicker' in window) {
      try {
        this.libraryDirectory = await (window as any).showDirectoryPicker();
        if (this.libraryDirectory) {
          console.log('✓ Library directory selected (FSA):', this.libraryDirectory.name);
          return this.scanDirectory(this.libraryDirectory, ['.fpl', '.lib']);
        }
      } catch (error) {
        const errMsg = error instanceof Error ? error.message : String(error);
        console.warn(`FSA failed: ${errMsg}, trying fallback...`);
      }
    } else {
      console.warn('File System Access API not available, using fallback');
    }
    return this.selectLibraryDirectoryFallback();
  }

  private async selectTableDirectoryFallback(): Promise<FileInfo[]> {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      (input as any).webkitdirectory = true;
      input.multiple = true;

      input.onchange = () => {
        const files = input.files;
        if (!files) { resolve([]); return; }
        const fileInfos: FileInfo[] = [];
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          if (file.name.toLowerCase().endsWith('.fpt')) {
            fileInfos.push({ name: file.name, size: file.size, modified: file.lastModified, handle: file as any, type: 'fpt' });
          }
        }
        fileInfos.sort((a, b) => a.name.localeCompare(b.name));
        resolve(fileInfos);
      };
      input.onerror = () => resolve([]);
      input.click();
    });
  }

  private async selectLibraryDirectoryFallback(): Promise<FileInfo[]> {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      (input as any).webkitdirectory = true;
      input.multiple = true;

      input.onchange = () => {
        const files = input.files;
        if (!files) { resolve([]); return; }
        const fileInfos: FileInfo[] = [];
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          const name = file.name.toLowerCase();
          if (name.endsWith('.fpl') || name.endsWith('.lib')) {
            fileInfos.push({ name: file.name, size: file.size, modified: file.lastModified, handle: file as any, type: name.endsWith('.fpl') ? 'fpl' : 'lib' });
          }
        }
        fileInfos.sort((a, b) => a.name.localeCompare(b.name));
        resolve(fileInfos);
      };
      input.onerror = () => resolve([]);
      input.click();
    });
  }

  async scanDirectory(dirHandle: FileSystemDirectoryHandle, filters: string | string[] = []): Promise<FileInfo[]> {
    const files: FileInfo[] = [];
    const filterArray = Array.isArray(filters) ? filters : [filters];
    try {
      for await (const entry of (dirHandle as any).values()) {
        if (entry.kind === 'file') {
          if (filterArray.length > 0) {
            const matches = filterArray.some(f => entry.name.toLowerCase().endsWith(f.toLowerCase()));
            if (!matches) continue;
          }
          try {
            const file = await entry.getFile();
            files.push({ name: entry.name, size: file.size, modified: file.lastModified, handle: entry, type: this.detectFileType(entry.name) });
          } catch (error) { console.warn(`Failed to read file: ${entry.name}`, error); }
        }
      }
      files.sort((a, b) => a.name.localeCompare(b.name));
      return files;
    } catch (error) {
      console.error('Directory scan failed:', error);
      return [];
    }
  }

  private detectFileType(filename: string): 'fpt' | 'fpl' | 'lib' | undefined {
    const lower = filename.toLowerCase();
    if (lower.endsWith('.fpt')) return 'fpt';
    if (lower.endsWith('.fpl')) return 'fpl';
    if (lower.endsWith('.lib')) return 'lib';
    return undefined;
  }

  async getFile(fileHandle: FileSystemFileHandle): Promise<File> {
    return fileHandle.getFile();
  }

  getSelectedDirectories() {
    return { tableDirectory: this.tableDirectory, libraryDirectory: this.libraryDirectory };
  }

  clear() {
    this.tableDirectory = null;
    this.libraryDirectory = null;
  }
}

// ─── Utilities ────────────────────────────────────────────────────────────────

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${Math.round((bytes / Math.pow(k, i)) * 10) / 10} ${sizes[i]}`;
}

export function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
}

export function createFileOverview(tables: FileInfo[], libraries: FileInfo[], selectedTable: FileInfo | null = null, selectedLibraries: FileInfo[] = []): FileOverview {
  return { tables, libraries, selectedTable, selectedLibraries, tableDirectory: undefined, libraryDirectory: undefined };
}

export function getCompatibleLibraries(selectedLibraries: FileInfo[], _tableCount: number): FileInfo[] {
  return selectedLibraries;
}

export function getFileStatistics(tables: FileInfo[], libraries: FileInfo[]) {
  const tableSize = tables.reduce((sum, f) => sum + f.size, 0);
  const librarySize = libraries.reduce((sum, f) => sum + f.size, 0);
  return {
    tableCount: tables.length, libraryCount: libraries.length, totalSize: tableSize + librarySize,
    tableSize, librarySize, averageTableSize: tables.length > 0 ? tableSize / tables.length : 0,
    averageLibrarySize: libraries.length > 0 ? librarySize / libraries.length : 0,
  };
}

// ─── UI: FileBrowserUIManager ────────────────────────────────────────────────

export class FileBrowserUIManager {
  private selectedTables: Map<string, FileInfo> = new Map();
  private selectedLibraries: Map<string, FileInfo> = new Map();
  private recentFiles: string[] = [];
  private maxRecentFiles = 10;

  createFileRow(fileInfo: FileInfo, isSelected: boolean = false, onSelect?: (file: FileInfo) => void): HTMLElement {
    const row = document.createElement('div');
    row.className = 'file-row';
    row.style.cssText = `padding:8px;border-bottom:1px solid #223;cursor:pointer;transition:all 0.2s;display:flex;align-items:center;gap:8px;${isSelected ? 'background:rgba(0,200,100,0.15);border-left:3px solid #00ff88;' : 'border-left:3px solid transparent;'}`;
    row.onmouseover = () => { row.style.background = isSelected ? 'rgba(0,200,100,0.25)' : 'rgba(0,100,80,0.1)'; };
    row.onmouseout = () => { row.style.background = isSelected ? 'rgba(0,200,100,0.15)' : ''; };
    if (onSelect) row.onclick = () => onSelect(fileInfo);
    const infoDiv = document.createElement('div');
    infoDiv.style.cssText = 'flex:1;';
    const nameEl = document.createElement('div');
    nameEl.style.cssText = `color:${this.getFileColor(fileInfo.name)};font-size:11px;margin-bottom:2px;font-weight:500;`;
    nameEl.textContent = fileInfo.name;
    const metaEl = document.createElement('div');
    metaEl.style.cssText = 'color:#556;font-size:9px;';
    metaEl.textContent = `${formatFileSize(fileInfo.size)} • ${formatDate(fileInfo.modified)}`;
    infoDiv.appendChild(nameEl);
    infoDiv.appendChild(metaEl);
    row.appendChild(infoDiv);
    if (fileInfo.type) {
      const badge = document.createElement('div');
      badge.style.cssText = `padding:2px 6px;border-radius:3px;font-size:8px;font-weight:bold;background:${this.getTypeBadgeColor(fileInfo.type)};`;
      badge.textContent = fileInfo.type.toUpperCase();
      row.appendChild(badge);
    }
    return row;
  }

  createLibraryCheckbox(fileInfo: FileInfo, isSelected: boolean = false, onToggle?: (file: FileInfo, selected: boolean) => void): HTMLElement {
    const row = document.createElement('div');
    row.style.cssText = 'padding:8px;border-bottom:1px solid #223;display:flex;align-items:center;gap:8px;';
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox'; checkbox.checked = isSelected;
    checkbox.style.cssText = 'width:14px;height:14px;cursor:pointer;';
    checkbox.onchange = () => { if (onToggle) onToggle(fileInfo, checkbox.checked); };
    const infoDiv = document.createElement('div');
    infoDiv.style.cssText = 'flex:1;';
    const nameEl = document.createElement('div');
    nameEl.style.cssText = 'color:#0088ff;font-size:11px;margin-bottom:2px;';
    nameEl.textContent = fileInfo.name;
    const metaEl = document.createElement('div');
    metaEl.style.cssText = 'color:#556;font-size:9px;';
    metaEl.textContent = formatFileSize(fileInfo.size);
    infoDiv.appendChild(nameEl); infoDiv.appendChild(metaEl);
    row.appendChild(checkbox); row.appendChild(infoDiv);
    return row;
  }

  createFileDetailsPanel(fileInfo: FileInfo): HTMLElement {
    const panel = document.createElement('div');
    panel.style.cssText = 'border:1px solid #334;border-radius:6px;padding:12px;background:rgba(0,30,50,0.5);margin-top:10px;';
    const sections: Array<[string, string]> = [
      ['Dateiname', fileInfo.name], ['Größe', formatFileSize(fileInfo.size)],
      ['Geändert', formatDate(fileInfo.modified)], ['Typ', fileInfo.type?.toUpperCase() || 'Unbekannt'],
    ];
    for (const [label, value] of sections) {
      const row = document.createElement('div');
      row.style.cssText = 'display:grid;grid-template-columns:120px 1fr;margin-bottom:8px;font-size:10px;';
      const labelEl = document.createElement('div');
      labelEl.style.cssText = 'color:#667;font-weight:bold;'; labelEl.textContent = label;
      const valueEl = document.createElement('div');
      valueEl.style.cssText = 'color:#aab;word-break:break-all;'; valueEl.textContent = value;
      row.appendChild(labelEl); row.appendChild(valueEl); panel.appendChild(row);
    }
    return panel;
  }

  createOverviewSummary(tableCount: number, libraryCount: number, totalSize: number): HTMLElement {
    const panel = document.createElement('div');
    panel.style.cssText = 'display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin:10px 0;';
    const items = [
      { label: 'Tische', value: String(tableCount), color: '#00ff88' },
      { label: 'Bibliotheken', value: String(libraryCount), color: '#0088ff' },
      { label: 'Größe', value: formatFileSize(totalSize), color: '#ffaa00' },
    ];
    for (const item of items) {
      const card = document.createElement('div');
      card.style.cssText = 'background:rgba(0,30,50,0.5);border:1px solid #334;border-radius:6px;padding:12px;text-align:center;';
      const labelEl = document.createElement('div');
      labelEl.style.cssText = `color:#667;font-size:10px;margin-bottom:4px;`; labelEl.textContent = item.label;
      const valueEl = document.createElement('div');
      valueEl.style.cssText = `color:${item.color};font-size:14px;font-weight:bold;font-family:'Courier New',monospace;`;
      valueEl.textContent = item.value;
      card.appendChild(labelEl); card.appendChild(valueEl); panel.appendChild(card);
    }
    return panel;
  }

  createFilterInput(placeholder: string = 'Datei durchsuchen...'): HTMLElement {
    const container = document.createElement('div');
    container.style.cssText = 'margin-bottom:10px;';
    const input = document.createElement('input');
    input.type = 'text'; input.placeholder = placeholder;
    input.style.cssText = 'width:100%;padding:6px 8px;background:rgba(0,20,40,0.5);border:1px solid #334;border-radius:4px;color:#aab;font-size:11px;font-family:\'Courier New\',monospace;';
    container.appendChild(input);
    return container;
  }

  filterFiles(files: FileInfo[], query: string): FileInfo[] {
    if (!query) return files;
    const lower = query.toLowerCase();
    return files.filter(f => f.name.toLowerCase().includes(lower));
  }

  private getFileColor(filename: string): string {
    const lower = filename.toLowerCase();
    if (lower.endsWith('.fpt')) return '#00ff88';
    if (lower.endsWith('.fpl')) return '#0088ff';
    if (lower.endsWith('.lib')) return '#00aaff';
    if (lower.endsWith('.json')) return '#ffaa00';
    return '#aab';
  }

  private getTypeBadgeColor(type: string): string {
    switch (type) {
      case 'fpt': return 'rgba(0,150,100,0.3)';
      case 'fpl': case 'lib': return 'rgba(0,100,180,0.3)';
      default: return 'rgba(100,100,100,0.3)';
    }
  }

  addToRecent(filename: string): void {
    this.recentFiles = this.recentFiles.filter(f => f !== filename);
    this.recentFiles.unshift(filename);
    this.recentFiles = this.recentFiles.slice(0, this.maxRecentFiles);
  }

  getRecentFiles(): string[] { return [...this.recentFiles]; }

  createRecentFilesList(files: string[], onSelect?: (filename: string) => void): HTMLElement {
    const container = document.createElement('div');
    container.style.cssText = 'margin-top:12px;';
    const titleEl = document.createElement('div');
    titleEl.style.cssText = 'color:#667;font-size:10px;font-weight:bold;margin-bottom:6px;letter-spacing:1px;';
    titleEl.textContent = 'ZULETZT VERWENDET';
    container.appendChild(titleEl);
    if (files.length === 0) {
      const emptyEl = document.createElement('div');
      emptyEl.style.cssText = 'color:#556;font-size:9px;padding:6px;';
      emptyEl.textContent = 'Keine kürzlichen Dateien';
      container.appendChild(emptyEl); return container;
    }
    for (const filename of files) {
      const row = document.createElement('div');
      row.style.cssText = 'padding:4px 6px;border-radius:3px;cursor:pointer;font-size:10px;color:#aab;transition:all 0.15s;border-left:2px solid transparent;';
      row.onmouseover = () => { row.style.background = 'rgba(0,150,100,0.1)'; row.style.borderLeftColor = '#00ff88'; row.style.color = '#00ff88'; };
      row.onmouseout = () => { row.style.background = ''; row.style.borderLeftColor = 'transparent'; row.style.color = '#aab'; };
      if (onSelect) row.onclick = () => onSelect(filename);
      row.textContent = filename;
      container.appendChild(row);
    }
    return container;
  }

  createCompatibilityInfo(libraryName: string, tableCount: number): HTMLElement {
    const panel = document.createElement('div');
    panel.style.cssText = 'background:rgba(0,150,100,0.1);border:1px solid #00ff88;border-radius:6px;padding:8px;font-size:10px;color:#aab;margin-top:8px;';
    const icon = document.createElement('span');
    icon.style.cssText = 'color:#00ff88;font-weight:bold;';
    icon.textContent = '✓ ';
    const text = document.createTextNode(`Bibliothek ist mit ${tableCount} Tisch${tableCount !== 1 ? 'en' : ''} kompatibel`);
    panel.appendChild(icon); panel.appendChild(text);
    return panel;
  }
}

// ─── Advanced: AdvancedFileBrowserManager ─────────────────────────────────────

export class AdvancedFileBrowserManager {
  private favorites: Map<string, FavoriteEntry> = new Map();
  private batchJobs: Map<string, BatchJob> = new Map();
  private recentFiles: FileInfo[] = [];
  private maxRecent = 20;
  private previewCache: Map<string, FilePreview> = new Map();
  private dragDropEnabled = true;

  loadFavoritesFromStorage(): void {
    try {
      const stored = localStorage.getItem('fpw-favorites');
      if (stored) {
        this.favorites = new Map(JSON.parse(stored));
      }
    } catch (error) { console.warn('Failed to load favorites from storage:', error); }
  }

  saveFavoritesToStorage(): void {
    try {
      localStorage.setItem('fpw-favorites', JSON.stringify(Array.from(this.favorites.entries())));
    } catch (error) { console.warn('Failed to save favorites to storage:', error); }
  }

  addFavorite(fileInfo: FileInfo, type: 'table' | 'library'): void {
    const entry: FavoriteEntry = { name: fileInfo.name, path: fileInfo.name, type, addedDate: Date.now(), lastUsed: Date.now(), iconColor: type === 'table' ? '#00ff88' : '#0088ff' };
    this.favorites.set(fileInfo.name, entry);
    this.saveFavoritesToStorage();
  }

  removeFavorite(filename: string): void {
    this.favorites.delete(filename);
    this.saveFavoritesToStorage();
  }

  isFavorited(filename: string): boolean { return this.favorites.has(filename); }
  getFavorites(): FavoriteEntry[] { return Array.from(this.favorites.values()).sort((a, b) => b.lastUsed - a.lastUsed); }

  createBatchJob(files: FileInfo[], libraries: FileInfo[]): BatchJob {
    const id = `batch-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const job: BatchJob = { id, files, libraries, status: 'pending', progress: 0, results: [] };
    this.batchJobs.set(id, job);
    return job;
  }

  updateBatchProgress(jobId: string, progress: number, currentFile?: FileInfo): void {
    const job = this.batchJobs.get(jobId);
    if (job) { job.progress = progress; job.currentFile = currentFile; }
  }

  completeBatchJob(jobId: string): BatchJob | undefined {
    const job = this.batchJobs.get(jobId);
    if (job) job.status = 'completed';
    return job;
  }

  getBatchJob(jobId: string): BatchJob | undefined { return this.batchJobs.get(jobId); }
  getAllBatchJobs(): BatchJob[] { return Array.from(this.batchJobs.values()); }

  setupDragDrop(dropZoneElement: HTMLElement, onDrop: (files: File[], type: 'table' | 'library') => Promise<void>): void {
    if (!this.dragDropEnabled || !dropZoneElement) return;
    dropZoneElement.addEventListener('dragover', (e) => { e.preventDefault(); e.stopPropagation(); dropZoneElement.style.background = 'rgba(0,200,100,0.2)'; dropZoneElement.style.borderColor = '#00ff88'; });
    dropZoneElement.addEventListener('dragleave', () => { dropZoneElement.style.background = ''; dropZoneElement.style.borderColor = ''; });
    dropZoneElement.addEventListener('drop', async (e) => {
      e.preventDefault(); e.stopPropagation();
      dropZoneElement.style.background = ''; dropZoneElement.style.borderColor = '';
      const files = Array.from(e.dataTransfer?.files || []);
      const tableFiles = files.filter(f => f.name.toLowerCase().endsWith('.fpt'));
      const libFiles = files.filter(f => f.name.toLowerCase().endsWith('.fpl') || f.name.toLowerCase().endsWith('.lib'));
      if (tableFiles.length > 0) await onDrop(tableFiles, 'table');
      if (libFiles.length > 0) await onDrop(libFiles, 'library');
    });
  }

  async generatePreview(fileInfo: FileInfo): Promise<FilePreview> {
    const cacheKey = `${fileInfo.name}-${fileInfo.modified}`;
    if (this.previewCache.has(cacheKey)) return this.previewCache.get(cacheKey)!;
    const preview: FilePreview = { fileInfo, description: this.generateDescription(fileInfo) };
    this.previewCache.set(cacheKey, preview);
    return preview;
  }

  private generateDescription(fileInfo: FileInfo): string {
    return `${fileInfo.type?.toUpperCase() || 'Unknown'} • ${formatFileSize(fileInfo.size)} • ${formatDate(fileInfo.modified)}`;
  }

  createFavoritesPanel(): HTMLElement {
    const panel = document.createElement('div');
    panel.style.cssText = 'border:1px solid #334;border-radius:6px;padding:12px;background:rgba(0,30,50,0.5);margin-bottom:12px;';
    const titleEl = document.createElement('div');
    titleEl.style.cssText = 'color:#ffaa00;font-size:11px;font-weight:bold;margin-bottom:8px;letter-spacing:1px;';
    titleEl.textContent = 'FAVORITEN'; panel.appendChild(titleEl);
    const favorites = this.getFavorites();
    if (favorites.length === 0) {
      const emptyEl = document.createElement('div');
      emptyEl.style.cssText = 'color:#556;font-size:10px;padding:8px;';
      emptyEl.textContent = 'Keine Favoriten.'; panel.appendChild(emptyEl); return panel;
    }
    for (const fav of favorites.slice(0, 5)) {
      const row = document.createElement('div');
      row.style.cssText = `padding:6px;border-radius:3px;cursor:pointer;font-size:10px;color:#aab;transition:all 0.15s;border-left:2px solid ${fav.iconColor};margin-bottom:4px;display:flex;justify-content:space-between;align-items:center;`;
      row.onmouseover = () => { row.style.background = 'rgba(0,150,100,0.1)'; row.style.color = fav.iconColor || ''; };
      row.onmouseout = () => { row.style.background = ''; row.style.color = '#aab'; };
      const nameEl = document.createElement('div'); nameEl.textContent = fav.name; nameEl.style.flex = '1';
      const removeBtn = document.createElement('button');
      removeBtn.textContent = '✕';
      removeBtn.style.cssText = 'background:none;border:none;color:#ff6666;cursor:pointer;font-size:10px;padding:0 4px;';
      removeBtn.onmouseover = () => removeBtn.style.color = '#ff3333';
      removeBtn.onmouseout = () => removeBtn.style.color = '#ff6666';
      removeBtn.onclick = (e) => { e.stopPropagation(); this.removeFavorite(fav.name); panel.replaceWith(this.createFavoritesPanel()); };
      row.appendChild(nameEl); row.appendChild(removeBtn); panel.appendChild(row);
    }
    return panel;
  }

  createPreviewCard(preview: FilePreview, onSelect?: () => void): HTMLElement {
    const card = document.createElement('div');
    card.style.cssText = 'border:1px solid #334;border-radius:6px;padding:12px;background:rgba(0,30,50,0.5);cursor:pointer;transition:all 0.2s;margin-bottom:8px;';
    card.onmouseover = () => { card.style.background = 'rgba(0,50,80,0.7)'; card.style.borderColor = '#0088ff'; };
    card.onmouseout = () => { card.style.background = 'rgba(0,30,50,0.5)'; card.style.borderColor = '#334'; };
    if (onSelect) card.onclick = onSelect;
    const nameEl = document.createElement('div');
    nameEl.style.cssText = 'color:#00ff88;font-size:11px;font-weight:bold;margin-bottom:4px;';
    nameEl.textContent = preview.fileInfo.name;
    const descEl = document.createElement('div');
    descEl.style.cssText = 'color:#556;font-size:9px;'; descEl.textContent = preview.description ?? '';
    card.appendChild(nameEl); card.appendChild(descEl);
    return card;
  }

  createBatchProgressPanel(job: BatchJob): HTMLElement {
    const panel = document.createElement('div');
    panel.style.cssText = 'border:1px solid #0088ff;border-radius:6px;padding:12px;background:rgba(0,100,180,0.1);';
    const titleEl = document.createElement('div');
    titleEl.style.cssText = 'color:#0088ff;font-size:11px;font-weight:bold;margin-bottom:8px;';
    titleEl.textContent = `Batch Job: ${job.id.substr(-8)}`; panel.appendChild(titleEl);
    const progressBarContainer = document.createElement('div');
    progressBarContainer.style.cssText = 'width:100%;height:6px;background:rgba(0,50,100,0.5);border-radius:3px;overflow:hidden;margin-bottom:8px;';
    const progressBar = document.createElement('div');
    progressBar.style.cssText = `height:100%;width:${job.progress}%;background:linear-gradient(90deg,#0088ff,#00ff88);transition:width 0.3s;`;
    progressBarContainer.appendChild(progressBar); panel.appendChild(progressBarContainer);
    const statusEl = document.createElement('div');
    statusEl.style.cssText = 'color:#aab;font-size:10px;margin-bottom:4px;';
    statusEl.textContent = `Status: ${job.status} (${job.results.length}/${job.files.length})`; panel.appendChild(statusEl);
    if (job.currentFile) {
      const currentEl = document.createElement('div');
      currentEl.style.cssText = 'color:#00ff88;font-size:9px;margin-top:4px;';
      currentEl.textContent = `Loading: ${job.currentFile.name}`; panel.appendChild(currentEl);
    }
    return panel;
  }

  createSortOptions(onSort: (field: string) => void): HTMLElement {
    const container = document.createElement('div');
    container.style.cssText = 'display:flex;gap:6px;margin-bottom:8px;';
    const options = [
      { label: 'Name', value: 'name' }, { label: 'Size', value: 'size' },
      { label: 'Date', value: 'date' }, { label: 'Type', value: 'type' },
    ];
    for (const opt of options) {
      const btn = document.createElement('button');
      btn.textContent = opt.label;
      btn.style.cssText = 'padding:4px 8px;background:rgba(0,100,150,0.2);border:1px solid #0088ff;border-radius:3px;color:#0088ff;cursor:pointer;font-size:9px;';
      btn.onmouseover = () => { btn.style.background = 'rgba(0,100,150,0.4)'; };
      btn.onmouseout = () => { btn.style.background = 'rgba(0,100,150,0.2)'; };
      btn.onclick = () => onSort(opt.value); container.appendChild(btn);
    }
    return container;
  }

  sortFiles(files: FileInfo[], field: string): FileInfo[] {
    const sorted = [...files];
    switch (field) {
      case 'name': sorted.sort((a, b) => a.name.localeCompare(b.name)); break;
      case 'size': sorted.sort((a, b) => b.size - a.size); break;
      case 'date': sorted.sort((a, b) => b.modified - a.modified); break;
      case 'type': sorted.sort((a, b) => (a.type || '').localeCompare(b.type || '')); break;
    }
    return sorted;
  }

  trackUsage(fileInfo: FileInfo): void {
    this.recentFiles = this.recentFiles.filter(f => f.name !== fileInfo.name);
    this.recentFiles.unshift(fileInfo);
    this.recentFiles = this.recentFiles.slice(0, this.maxRecent);
  }

  getRecent(): FileInfo[] { return [...this.recentFiles]; }
}

// ─── Singleton instances ──────────────────────────────────────────────────────

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
