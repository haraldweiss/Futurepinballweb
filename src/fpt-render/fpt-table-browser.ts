// SPDX-License-Identifier: AGPL-3.0-or-later
// © 2026 Harald Weiss
/**
 * fpt-table-browser.ts — UI helpers for the FPT section of the Quick Menu.
 *
 * Pure logic: filtering and sorting. UI rendering lives in a separate
 * function lower down (added in Task 8).
 */

import type { FPTFileEntry } from './fpt-table-scanner';

export type SortKey = 'name' | 'size' | 'mtime';

export function filterEntries(entries: FPTFileEntry[], query: string): FPTFileEntry[] {
  const q = query.trim().toLowerCase();
  if (q.length === 0) return entries;
  return entries.filter(e => e.name.toLowerCase().includes(q));
}

export function sortEntries(entries: FPTFileEntry[], key: SortKey): FPTFileEntry[] {
  // Copy first — never mutate caller's array.
  const copy = [...entries];
  switch (key) {
    case 'name':
      copy.sort((a, b) => a.name.localeCompare(b.name));
      break;
    case 'size':
      copy.sort((a, b) => b.size - a.size); // descending: largest first
      break;
    case 'mtime':
      copy.sort((a, b) => b.mtime - a.mtime); // descending: newest first
      break;
  }
  return copy;
}
