// SPDX-License-Identifier: AGPL-3.0-or-later
// © 2026 Harald Weiss

import type { FileInfo, FavoriteEntry, BatchJob, FilePreview } from './types';
import { formatFileSize, formatDate } from './utils';

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
