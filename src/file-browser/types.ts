// SPDX-License-Identifier: AGPL-3.0-or-later
// © 2026 Harald Weiss

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
