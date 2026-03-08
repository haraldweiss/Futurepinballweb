/**
 * file-browser-ui.ts — Enhanced File Browser UI Components
 *
 * Provides rich UI components for displaying and managing file selections:
 * - File overview panels with detailed metadata
 * - Multi-select checkboxes for libraries
 * - File filtering and search
 * - Library preview and compatibility info
 * - Recent files tracking
 * - Drag & drop support (future)
 */

import type { FileInfo, FileOverview } from './file-browser';
import { formatFileSize, formatDate } from './file-browser';

/**
 * Enhanced file display with metadata
 */
export interface FileDisplay {
  fileInfo: FileInfo;
  isSelected: boolean;
  isHovered: boolean;
  preview?: string;  // File preview/description
}

/**
 * File browser UI manager
 */
export class FileBrowserUIManager {
  private selectedTables: Map<string, FileInfo> = new Map();
  private selectedLibraries: Map<string, FileInfo> = new Map();
  private recentFiles: string[] = [];
  private maxRecentFiles = 10;

  /**
   * Create file row element with enhanced styling
   */
  createFileRow(fileInfo: FileInfo, isSelected: boolean = false, onSelect?: (file: FileInfo) => void): HTMLElement {
    const row = document.createElement('div');
    row.className = 'file-row';
    row.style.cssText = `
      padding: 8px;
      border-bottom: 1px solid #223;
      cursor: pointer;
      transition: all 0.2s;
      display: flex;
      align-items: center;
      gap: 8px;
      ${isSelected ? 'background: rgba(0, 200, 100, 0.15); border-left: 3px solid #00ff88;' : 'border-left: 3px solid transparent;'}
    `;

    // Hover effects
    row.onmouseover = () => {
      row.style.background = isSelected ? 'rgba(0, 200, 100, 0.25)' : 'rgba(0, 100, 80, 0.1)';
    };
    row.onmouseout = () => {
      row.style.background = isSelected ? 'rgba(0, 200, 100, 0.15)' : '';
    };

    // Click handler
    if (onSelect) {
      row.onclick = () => onSelect(fileInfo);
    }

    // File info
    const infoDiv = document.createElement('div');
    infoDiv.style.cssText = 'flex: 1;';

    const nameEl = document.createElement('div');
    nameEl.style.cssText = `color: ${this.getFileColor(fileInfo.name)}; font-size: 11px; margin-bottom: 2px; font-weight: 500;`;
    nameEl.textContent = fileInfo.name;

    const metaEl = document.createElement('div');
    metaEl.style.cssText = 'color: #556; font-size: 9px;';
    metaEl.textContent = `${formatFileSize(fileInfo.size)} • ${formatDate(fileInfo.modified)}`;

    infoDiv.appendChild(nameEl);
    infoDiv.appendChild(metaEl);
    row.appendChild(infoDiv);

    // Type badge
    if (fileInfo.type) {
      const badge = document.createElement('div');
      badge.style.cssText = `
        padding: 2px 6px;
        border-radius: 3px;
        font-size: 8px;
        font-weight: bold;
        background: ${this.getTypeBadgeColor(fileInfo.type)};
      `;
      badge.textContent = fileInfo.type.toUpperCase();
      row.appendChild(badge);
    }

    return row;
  }

  /**
   * Create library checkbox row
   */
  createLibraryCheckbox(fileInfo: FileInfo, isSelected: boolean = false, onToggle?: (file: FileInfo, selected: boolean) => void): HTMLElement {
    const row = document.createElement('div');
    row.style.cssText = `
      padding: 8px;
      border-bottom: 1px solid #223;
      display: flex;
      align-items: center;
      gap: 8px;
    `;

    // Checkbox
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = isSelected;
    checkbox.style.cssText = 'width: 14px; height: 14px; cursor: pointer;';
    checkbox.onchange = () => {
      if (onToggle) onToggle(fileInfo, checkbox.checked);
    };

    // File info
    const infoDiv = document.createElement('div');
    infoDiv.style.cssText = 'flex: 1;';

    const nameEl = document.createElement('div');
    nameEl.style.cssText = `color: #0088ff; font-size: 11px; margin-bottom: 2px;`;
    nameEl.textContent = fileInfo.name;

    const metaEl = document.createElement('div');
    metaEl.style.cssText = 'color: #556; font-size: 9px;';
    metaEl.textContent = formatFileSize(fileInfo.size);

    infoDiv.appendChild(nameEl);
    infoDiv.appendChild(metaEl);

    row.appendChild(checkbox);
    row.appendChild(infoDiv);

    return row;
  }

  /**
   * Create file details panel
   */
  createFileDetailsPanel(fileInfo: FileInfo): HTMLElement {
    const panel = document.createElement('div');
    panel.style.cssText = `
      border: 1px solid #334;
      border-radius: 6px;
      padding: 12px;
      background: rgba(0, 30, 50, 0.5);
      margin-top: 10px;
    `;

    const sections: Array<[string, string]> = [
      ['📄 Dateiname', fileInfo.name],
      ['📊 Größe', formatFileSize(fileInfo.size)],
      ['🕐 Geändert', formatDate(fileInfo.modified)],
      ['🏷️ Typ', fileInfo.type?.toUpperCase() || 'Unbekannt'],
    ];

    for (const [label, value] of sections) {
      const row = document.createElement('div');
      row.style.cssText = 'display: grid; grid-template-columns: 120px 1fr; margin-bottom: 8px; font-size: 10px;';

      const labelEl = document.createElement('div');
      labelEl.style.cssText = 'color: #667; font-weight: bold;';
      labelEl.textContent = label;

      const valueEl = document.createElement('div');
      valueEl.style.cssText = 'color: #aab; word-break: break-all;';
      valueEl.textContent = value;

      row.appendChild(labelEl);
      row.appendChild(valueEl);
      panel.appendChild(row);
    }

    return panel;
  }

  /**
   * Create file overview summary
   */
  createOverviewSummary(tableCount: number, libraryCount: number, totalSize: number): HTMLElement {
    const panel = document.createElement('div');
    panel.style.cssText = `
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 10px;
      margin: 10px 0;
    `;

    const items = [
      { label: '📚 Tische', value: String(tableCount), color: '#00ff88' },
      { label: '📦 Bibliotheken', value: String(libraryCount), color: '#0088ff' },
      { label: '💾 Größe', value: formatFileSize(totalSize), color: '#ffaa00' },
    ];

    for (const item of items) {
      const card = document.createElement('div');
      card.style.cssText = `
        background: rgba(0, 30, 50, 0.5);
        border: 1px solid #334;
        border-radius: 6px;
        padding: 12px;
        text-align: center;
      `;

      const labelEl = document.createElement('div');
      labelEl.style.cssText = `color: #667; font-size: 10px; margin-bottom: 4px;`;
      labelEl.textContent = item.label;

      const valueEl = document.createElement('div');
      valueEl.style.cssText = `color: ${item.color}; font-size: 14px; font-weight: bold; font-family: 'Courier New', monospace;`;
      valueEl.textContent = item.value;

      card.appendChild(labelEl);
      card.appendChild(valueEl);
      panel.appendChild(card);
    }

    return panel;
  }

  /**
   * Create filter input element
   */
  createFilterInput(placeholder: string = 'Datei durchsuchen...'): HTMLElement {
    const container = document.createElement('div');
    container.style.cssText = 'margin-bottom: 10px;';

    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = placeholder;
    input.style.cssText = `
      width: 100%;
      padding: 6px 8px;
      background: rgba(0, 20, 40, 0.5);
      border: 1px solid #334;
      border-radius: 4px;
      color: #aab;
      font-size: 11px;
      font-family: 'Courier New', monospace;
    `;

    container.appendChild(input);
    return container;
  }

  /**
   * Filter files by name
   */
  filterFiles(files: FileInfo[], query: string): FileInfo[] {
    if (!query) return files;
    const lower = query.toLowerCase();
    return files.filter(f => f.name.toLowerCase().includes(lower));
  }

  /**
   * Get color for file by type
   */
  private getFileColor(filename: string): string {
    const lower = filename.toLowerCase();
    if (lower.endsWith('.fpt')) return '#00ff88';
    if (lower.endsWith('.fpl')) return '#0088ff';
    if (lower.endsWith('.lib')) return '#00aaff';
    if (lower.endsWith('.json')) return '#ffaa00';
    return '#aab';
  }

  /**
   * Get badge color for file type
   */
  private getTypeBadgeColor(type: string): string {
    switch (type) {
      case 'fpt':
        return 'rgba(0, 150, 100, 0.3)';
      case 'fpl':
      case 'lib':
        return 'rgba(0, 100, 180, 0.3)';
      default:
        return 'rgba(100, 100, 100, 0.3)';
    }
  }

  /**
   * Add file to recent files list
   */
  addToRecent(filename: string): void {
    // Remove if already in list
    this.recentFiles = this.recentFiles.filter(f => f !== filename);
    // Add to front
    this.recentFiles.unshift(filename);
    // Keep only recent N files
    this.recentFiles = this.recentFiles.slice(0, this.maxRecentFiles);
  }

  /**
   * Get recent files
   */
  getRecentFiles(): string[] {
    return [...this.recentFiles];
  }

  /**
   * Create recent files list element
   */
  createRecentFilesList(files: string[], onSelect?: (filename: string) => void): HTMLElement {
    const container = document.createElement('div');
    container.style.cssText = 'margin-top: 12px;';

    const titleEl = document.createElement('div');
    titleEl.style.cssText = 'color: #667; font-size: 10px; font-weight: bold; margin-bottom: 6px; letter-spacing: 1px;';
    titleEl.textContent = '🕐 ZULETZT VERWENDET';
    container.appendChild(titleEl);

    if (files.length === 0) {
      const emptyEl = document.createElement('div');
      emptyEl.style.cssText = 'color: #556; font-size: 9px; padding: 6px;';
      emptyEl.textContent = 'Keine kürzlichen Dateien';
      container.appendChild(emptyEl);
      return container;
    }

    for (const filename of files) {
      const row = document.createElement('div');
      row.style.cssText = `
        padding: 4px 6px;
        border-radius: 3px;
        cursor: pointer;
        font-size: 10px;
        color: #aab;
        transition: all 0.15s;
        border-left: 2px solid transparent;
      `;

      row.onmouseover = () => {
        row.style.background = 'rgba(0, 150, 100, 0.1)';
        row.style.borderLeftColor = '#00ff88';
        row.style.color = '#00ff88';
      };
      row.onmouseout = () => {
        row.style.background = '';
        row.style.borderLeftColor = 'transparent';
        row.style.color = '#aab';
      };

      if (onSelect) {
        row.onclick = () => onSelect(filename);
      }

      row.textContent = filename;
      container.appendChild(row);
    }

    return container;
  }

  /**
   * Create compatibility info panel
   */
  createCompatibilityInfo(libraryName: string, tableCount: number): HTMLElement {
    const panel = document.createElement('div');
    panel.style.cssText = `
      background: rgba(0, 150, 100, 0.1);
      border: 1px solid #00ff88;
      border-radius: 6px;
      padding: 8px;
      font-size: 10px;
      color: #aab;
      margin-top: 8px;
    `;

    const icon = document.createElement('span');
    icon.style.cssText = 'color: #00ff88; font-weight: bold;';
    icon.textContent = '✓ ';

    const text = document.createTextNode(`Bibliothek ist mit ${tableCount} Tisch${tableCount !== 1 ? 'en' : ''} kompatibel`);

    panel.appendChild(icon);
    panel.appendChild(text);

    return panel;
  }
}

/**
 * Global UI manager instance
 */
let globalUIManager: FileBrowserUIManager | null = null;

export function getFileBrowserUIManager(): FileBrowserUIManager {
  if (!globalUIManager) {
    globalUIManager = new FileBrowserUIManager();
  }
  return globalUIManager;
}

export function resetFileBrowserUIManager(): void {
  globalUIManager = null;
}
