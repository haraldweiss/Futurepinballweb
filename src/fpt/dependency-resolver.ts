// SPDX-License-Identifier: AGPL-3.0-or-later
// © 2026 Harald Weiss
import type { ExternalReference } from './external-references';

export interface DependencyFile {
  rootId: string;
  relativePath: string;
}

export interface DependencyRoot {
  id: string;
  /** Lower priorities are searched first; equal priorities share ambiguity scope. */
  priority: number;
}

export interface LibraryFileResolution {
  reference: ExternalReference;
  /** resolved-file finds only the library file; its member has not been inspected. */
  status: 'resolved-file' | 'missing-file' | 'ambiguous-file' | 'invalid-path';
  candidates: DependencyFile[];
}

/** Validate before normalizing: never collapse traversal or absolute paths into matches. */
function normalizeRelativePath(path: string): string | undefined {
  if (!path || /[\x00-\x1f\x7f-\x9f:]/.test(path)) return undefined;
  const components = path.split(/[\\/]/);
  if (components.some(part => !part || part === '.' || part === '..')) return undefined;
  return components.join('/').replace(/[A-Z]/g, char => char.toLowerCase());
}

function compareText(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/**
 * Resolve relative library names against caller-inventoried files without I/O.
 * Invalid inventory/configuration throws; invalid reference paths are reported per reference.
 * Source names remain unchanged and matching folds ASCII case only.
 */
export function resolveLibraryFiles(
  references: readonly ExternalReference[],
  roots: readonly DependencyRoot[],
  files: readonly DependencyFile[],
): LibraryFileResolution[] {
  const priorities = new Map<string, number>();
  for (const root of roots) {
    if (priorities.has(root.id)) throw new Error(`Duplicate dependency root ID: ${root.id}`);
    if (!Number.isFinite(root.priority)) throw new Error(`Invalid dependency root priority: ${root.id}`);
    priorities.set(root.id, root.priority);
  }

  const inventory = new Map<string, Array<{ file: DependencyFile; priority: number }>>();
  const seen = new Map<string, Set<string>>();
  for (const file of files) {
    const priority = priorities.get(file.rootId);
    if (priority === undefined) throw new Error(`Unknown dependency root ID: ${file.rootId}`);
    const path = normalizeRelativePath(file.relativePath);
    if (path === undefined) throw new Error(`Invalid dependency inventory path: ${file.relativePath}`);
    const rootPaths = seen.get(file.rootId) ?? new Set<string>();
    if (rootPaths.has(file.relativePath)) continue;
    rootPaths.add(file.relativePath);
    seen.set(file.rootId, rootPaths);
    const entries = inventory.get(path) ?? [];
    entries.push({ file, priority });
    inventory.set(path, entries);
  }
  for (const entries of inventory.values()) {
    entries.sort((a, b) => a.priority - b.priority
      || compareText(a.file.rootId, b.file.rootId)
      || compareText(a.file.relativePath, b.file.relativePath));
  }

  return references.map(reference => {
    const path = normalizeRelativePath(reference.libraryPath);
    if (path === undefined || normalizeRelativePath(reference.memberPath) === undefined) {
      return { reference, status: 'invalid-path', candidates: [] };
    }
    const entries = inventory.get(path) ?? [];
    const candidates = entries.filter(entry => entry.priority === entries[0]?.priority).map(entry => entry.file);
    return { reference, status: candidates.length === 0 ? 'missing-file'
      : candidates.length === 1 ? 'resolved-file' : 'ambiguous-file', candidates };
  });
}
