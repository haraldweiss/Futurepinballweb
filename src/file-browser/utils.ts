// SPDX-License-Identifier: AGPL-3.0-or-later
// © 2026 Harald Weiss

import type { FileInfo, FileOverview } from './types';

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
