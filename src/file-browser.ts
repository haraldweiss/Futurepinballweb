/**
 * file-browser.ts — Dynamic FPT & Library File Browser
 *
 * Allows users to:
 * 1. Browse and select FPT table files from a directory
 * 2. Browse and select library directories (.FPL/.LIB files)
 * 3. View overview of available files with details
 * 4. Load tables with dynamically selected libraries
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

/**
 * FileSystemBrowser — Browse and scan directories for FPT/FPL files
 */
export class FileSystemBrowser {
  private tableDirectory: FileSystemDirectoryHandle | null = null;
  private libraryDirectory: FileSystemDirectoryHandle | null = null;

  /**
   * Let user select FPT table directory via browser picker
   */
  async selectTableDirectory(): Promise<FileInfo[]> {
    try {
      this.tableDirectory = await window.showDirectoryPicker();
      console.log('✓ Table directory selected:', this.tableDirectory.name);
      return this.scanDirectory(this.tableDirectory, '.fpt');
    } catch (error) {
      console.error('❌ Table directory selection cancelled or failed:', error);
      return [];
    }
  }

  /**
   * Let user select library directory via browser picker
   */
  async selectLibraryDirectory(): Promise<FileInfo[]> {
    try {
      this.libraryDirectory = await window.showDirectoryPicker();
      console.log('✓ Library directory selected:', this.libraryDirectory.name);
      return this.scanDirectory(this.libraryDirectory, ['.fpl', '.lib']);
    } catch (error) {
      console.error('❌ Library directory selection cancelled or failed:', error);
      return [];
    }
  }

  /**
   * Scan a directory for files matching filter
   */
  async scanDirectory(
    dirHandle: FileSystemDirectoryHandle,
    filters: string | string[] = []
  ): Promise<FileInfo[]> {
    const files: FileInfo[] = [];
    const filterArray = Array.isArray(filters) ? filters : [filters];

    try {
      for await (const entry of dirHandle.values()) {
        if (entry.kind === 'file') {
          // Apply extension filter
          if (filterArray.length > 0) {
            const matches = filterArray.some(f => entry.name.toLowerCase().endsWith(f.toLowerCase()));
            if (!matches) continue;
          }

          try {
            const file = await entry.getFile();
            files.push({
              name: entry.name,
              size: file.size,
              modified: file.lastModified,
              handle: entry,
              type: this.detectFileType(entry.name)
            });
          } catch (error) {
            console.warn(`Failed to read file: ${entry.name}`, error);
          }
        }
      }

      // Sort by name
      files.sort((a, b) => a.name.localeCompare(b.name));
      console.log(`✓ Scanned directory: found ${files.length} files`);
      return files;
    } catch (error) {
      console.error('❌ Directory scan failed:', error);
      return [];
    }
  }

  /**
   * Detect file type from extension
   */
  private detectFileType(filename: string): 'fpt' | 'fpl' | 'lib' | undefined {
    const lower = filename.toLowerCase();
    if (lower.endsWith('.fpt')) return 'fpt';
    if (lower.endsWith('.fpl')) return 'fpl';
    if (lower.endsWith('.lib')) return 'lib';
    return undefined;
  }

  /**
   * Get file from handle (for loading)
   */
  async getFile(fileHandle: FileSystemFileHandle): Promise<File> {
    return fileHandle.getFile();
  }

  /**
   * Get currently selected directories
   */
  getSelectedDirectories() {
    return {
      tableDirectory: this.tableDirectory,
      libraryDirectory: this.libraryDirectory
    };
  }

  /**
   * Clear selections
   */
  clear() {
    this.tableDirectory = null;
    this.libraryDirectory = null;
  }
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 10) / 10 + ' ' + sizes[i];
}

/**
 * Format timestamp for display
 */
export function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
}

/**
 * Create file overview from selections
 */
export function createFileOverview(
  tables: FileInfo[],
  libraries: FileInfo[],
  selectedTable: FileInfo | null = null,
  selectedLibraries: FileInfo[] = []
): FileOverview {
  return {
    tables,
    libraries,
    selectedTable,
    selectedLibraries,
    tableDirectory: undefined,
    libraryDirectory: undefined
  };
}

/**
 * Library compatibility helper
 */
export function getCompatibleLibraries(selectedLibraries: FileInfo[], tableCount: number): FileInfo[] {
  // All selected libraries are considered compatible with the selected table
  // In the future, this could check library metadata or compatibility info
  return selectedLibraries;
}

/**
 * Get statistics for file overview
 */
export function getFileStatistics(tables: FileInfo[], libraries: FileInfo[]) {
  const tableSize = tables.reduce((sum, f) => sum + f.size, 0);
  const librarySize = libraries.reduce((sum, f) => sum + f.size, 0);
  const totalSize = tableSize + librarySize;

  return {
    tableCount: tables.length,
    libraryCount: libraries.length,
    totalSize,
    tableSize,
    librarySize,
    averageTableSize: tables.length > 0 ? tableSize / tables.length : 0,
    averageLibrarySize: libraries.length > 0 ? librarySize / libraries.length : 0,
  };
}

/**
 * Global browser instance
 */
let globalBrowser: FileSystemBrowser | null = null;

export function getFileSystemBrowser(): FileSystemBrowser {
  if (!globalBrowser) {
    globalBrowser = new FileSystemBrowser();
  }
  return globalBrowser;
}

export function resetFileSystemBrowser(): void {
  if (globalBrowser) {
    globalBrowser.clear();
    globalBrowser = null;
  }
}
