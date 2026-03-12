/**
 * directory-path-manager.ts — Speichert und verwaltet zuletzt genutzte Verzeichnispfade
 */

interface PathEntry {
  name: string;
  timestamp: number;
}

export class DirectoryPathManager {
  private static readonly TABLE_PATHS_KEY = 'fp_table_paths';
  private static readonly LIBRARY_PATHS_KEY = 'fp_library_paths';
  private static readonly MAX_PATHS = 5;

  /**
   * Speichert einen Tabellen-Pfad
   */
  static saveTablePath(directoryName: string): void {
    this.savePath(this.TABLE_PATHS_KEY, directoryName);
  }

  /**
   * Speichert einen Bibliotheks-Pfad
   */
  static saveLibraryPath(directoryName: string): void {
    this.savePath(this.LIBRARY_PATHS_KEY, directoryName);
  }

  /**
   * Holt die letzten Tabellen-Pfade (bis zu MAX_PATHS)
   */
  static getTablePaths(): PathEntry[] {
    return this.getPaths(this.TABLE_PATHS_KEY);
  }

  /**
   * Holt die letzten Bibliotheks-Pfade (bis zu MAX_PATHS)
   */
  static getLibraryPaths(): PathEntry[] {
    return this.getPaths(this.LIBRARY_PATHS_KEY);
  }

  /**
   * Holt den letzten Tabellen-Pfad
   */
  static getLastTablePath(): PathEntry | null {
    const paths = this.getPaths(this.TABLE_PATHS_KEY);
    return paths.length > 0 ? paths[0] : null;
  }

  /**
   * Holt den letzten Bibliotheks-Pfad
   */
  static getLastLibraryPath(): PathEntry | null {
    const paths = this.getPaths(this.LIBRARY_PATHS_KEY);
    return paths.length > 0 ? paths[0] : null;
  }

  /**
   * Löscht einen Pfad aus der History
   */
  static removePath(type: 'table' | 'library', directoryName: string): void {
    const key = type === 'table' ? this.TABLE_PATHS_KEY : this.LIBRARY_PATHS_KEY;
    const paths = this.getPaths(key);
    const filtered = paths.filter(p => p.name !== directoryName);
    localStorage.setItem(key, JSON.stringify(filtered));
  }

  /**
   * Löscht alle gespeicherten Pfade
   */
  static clearAllPaths(type?: 'table' | 'library'): void {
    if (!type) {
      localStorage.removeItem(this.TABLE_PATHS_KEY);
      localStorage.removeItem(this.LIBRARY_PATHS_KEY);
    } else if (type === 'table') {
      localStorage.removeItem(this.TABLE_PATHS_KEY);
    } else {
      localStorage.removeItem(this.LIBRARY_PATHS_KEY);
    }
  }

  // ─── Private Helpers ─────────────────────────────────────────────────────

  private static savePath(key: string, directoryName: string): void {
    const paths = this.getPaths(key);

    // Duplikate entfernen
    const filtered = paths.filter(p => p.name !== directoryName);

    // Neue Entry an den Anfang
    const newEntry: PathEntry = {
      name: directoryName,
      timestamp: Date.now(),
    };

    const updated = [newEntry, ...filtered].slice(0, this.MAX_PATHS);
    localStorage.setItem(key, JSON.stringify(updated));
  }

  private static getPaths(key: string): PathEntry[] {
    try {
      const stored = localStorage.getItem(key);
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      console.warn(`Failed to parse paths from ${key}:`, e);
      return [];
    }
  }
}
