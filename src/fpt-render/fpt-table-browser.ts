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

/**
 * Render entries as cards inside a container element.
 *
 * Uses textContent (never innerHTML) for all user-controlled strings — FPT
 * filenames come from the user's filesystem and could in principle contain
 * HTML metacharacters; we never inject them as markup.
 */
export function renderTableList(
  container: HTMLElement,
  entries: FPTFileEntry[],
  onClick: (entry: FPTFileEntry) => void
): void {
  // Clear previous content (preserves the empty-state ::after pseudo if list
  // is empty — see CSS in index.html).
  container.replaceChildren();

  for (const entry of entries) {
    const card = document.createElement('div');
    card.className = 'qm-fpt-card';

    const nameEl = document.createElement('div');
    nameEl.className = 'qm-fpt-name';
    nameEl.textContent = entry.name;
    card.appendChild(nameEl);

    const metaEl = document.createElement('div');
    metaEl.className = 'qm-fpt-meta';
    metaEl.textContent = formatMeta(entry);
    card.appendChild(metaEl);

    card.addEventListener('click', () => onClick(entry));
    container.appendChild(card);
  }
}

function formatMeta(entry: FPTFileEntry): string {
  const sizeMb = (entry.size / (1024 * 1024)).toFixed(1);
  const date = new Date(entry.mtime).toISOString().slice(0, 10);
  return `${sizeMb} MB · ${date}`;
}
