// SPDX-License-Identifier: AGPL-3.0-or-later
// © 2026 Harald Weiss

import type { FileInfo } from './types';

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
