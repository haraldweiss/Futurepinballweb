# Phase B0 — Auto-Scan + Tisch-Browser-UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Scan a user-specified directory for `.fpt` table files and present them in the Quick Menu alongside the existing demo tables, with live search, sort, and filter. Clicking an FPT file loads it via the existing parser (rendering polish lives in Phase B1+).

**Architecture:** A small `src/fpt-render/` module (scanner + UI helpers) talks to a new Electron IPC handler (`fpt:scanDirectory`) that uses `fs.readdir` in the main process. The renderer never touches the filesystem directly. A `localStorage` key persists the chosen directory between sessions. The existing Quick Menu HTML in `index.html` gets a second section ("FPT Tables") that's populated dynamically; the existing "Demo Tables" cards stay as static markup.

**Tech Stack:** TypeScript, Electron (IPC), Vitest, happy-dom, existing `parseFPTFile()` from `src/fpt-parser.ts`.

---

## File Structure

**New files:**
- `src/fpt-render/fpt-table-scanner.ts` — Renderer-side scanner: calls Electron IPC, returns `FPTFileEntry[]`
- `src/fpt-render/fpt-table-browser.ts` — Quick Menu integration: render list, wire search/sort/filter, click→load
- `src/fpt-render/fpt-path-config.ts` — localStorage persistence + path dialog
- `src/__tests__/fpt-table-scanner.test.ts` — Tests for the scanner (mocked IPC)
- `src/__tests__/fpt-table-browser.test.ts` — Tests for filter/sort logic
- `src/__tests__/fpt-path-config.test.ts` — Tests for path persistence

**Modified files:**
- `electron-main.cjs` — Add `ipcMain.handle('fpt:scanDirectory')` + `ipcMain.handle('fpt:readFile')` + `ipcMain.handle('fpt:pickDirectory')`
- `electron-preload.cjs` — Expose `electronAPI.scanFPTDirectory`, `readFPTFile`, `pickFPTDirectory`
- `src/index.html` — Add `#qm-fpt-section` HTML markup with search input, sort dropdown, filter toggles, and dynamic table list container
- `src/main.ts` — Initialize FPT browser on Quick Menu open, hook up the click→load path

---

## Task 1: Define `FPTFileEntry` type + scanner skeleton

**Files:**
- Create: `src/fpt-render/fpt-table-scanner.ts`
- Test: `src/__tests__/fpt-table-scanner.test.ts`

- [x] **Step 1: Create the scanner test file**

```ts
// src/__tests__/fpt-table-scanner.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { scanFPTDirectory, type FPTFileEntry } from '../fpt-render/fpt-table-scanner';

describe('scanFPTDirectory', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    delete (window as any).electronAPI;
  });

  it('returns an empty array when electronAPI is unavailable', async () => {
    const result = await scanFPTDirectory('/some/path');
    expect(result).toEqual([]);
  });
});
```

- [x] **Step 2: Run test, verify it fails**

Run: `npx vitest run src/__tests__/fpt-table-scanner.test.ts`
Expected: FAIL with "Cannot find module" or similar.

- [x] **Step 3: Implement scanner skeleton**

```ts
// src/fpt-render/fpt-table-scanner.ts
// SPDX-License-Identifier: AGPL-3.0-or-later
// © 2026 Harald Weiss
/**
 * fpt-table-scanner.ts — Scan a directory for .fpt files via Electron IPC.
 *
 * Electron-only: in plain browsers `electronAPI` is undefined and we return
 * an empty list (the user falls back to the existing drag-drop / file-picker
 * path in src/file-browser.ts).
 */

export interface FPTFileEntry {
  /** Absolute path on disk. */
  path: string;
  /** Filename without `.fpt` extension. */
  name: string;
  /** File size in bytes. */
  size: number;
  /** Last-modified timestamp (epoch ms). */
  mtime: number;
}

export async function scanFPTDirectory(dirPath: string): Promise<FPTFileEntry[]> {
  const api = (window as any).electronAPI;
  if (!api?.scanFPTDirectory) return [];
  try {
    const entries = await api.scanFPTDirectory(dirPath);
    return Array.isArray(entries) ? entries : [];
  } catch (e) {
    console.warn('[fpt-scanner] scan failed:', e);
    return [];
  }
}
```

- [x] **Step 4: Verify test passes**

Run: `npx vitest run src/__tests__/fpt-table-scanner.test.ts`
Expected: PASS.

- [x] **Step 5: Commit**

```bash
git add src/fpt-render/fpt-table-scanner.ts src/__tests__/fpt-table-scanner.test.ts
git commit -m "feat(fpt): add scanFPTDirectory scaffold + browser fallback test

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 2: Scanner forwards to electronAPI when available

**Files:**
- Modify: `src/__tests__/fpt-table-scanner.test.ts` (add tests)
- Already created: `src/fpt-render/fpt-table-scanner.ts` (no changes — existing impl forwards)

- [x] **Step 1: Add tests covering the IPC path**

Append to `src/__tests__/fpt-table-scanner.test.ts`:

```ts
describe('scanFPTDirectory with electronAPI', () => {
  beforeEach(() => {
    (window as any).electronAPI = {
      scanFPTDirectory: vi.fn().mockResolvedValue([
        { path: '/a/Willow.fpt', name: 'Willow', size: 12345, mtime: 1000 },
        { path: '/a/Pharaoh.fpt', name: 'Pharaoh', size: 6789, mtime: 2000 },
      ]),
    };
  });

  it('returns entries from electronAPI', async () => {
    const result = await scanFPTDirectory('/a');
    expect(result).toHaveLength(2);
    expect(result[0].name).toBe('Willow');
  });

  it('returns [] when IPC throws', async () => {
    (window as any).electronAPI.scanFPTDirectory = vi.fn().mockRejectedValue(new Error('EACCES'));
    const result = await scanFPTDirectory('/a');
    expect(result).toEqual([]);
  });

  it('returns [] when IPC returns non-array', async () => {
    (window as any).electronAPI.scanFPTDirectory = vi.fn().mockResolvedValue(null);
    const result = await scanFPTDirectory('/a');
    expect(result).toEqual([]);
  });
});
```

- [x] **Step 2: Run tests**

Run: `npx vitest run src/__tests__/fpt-table-scanner.test.ts`
Expected: PASS — all 4 tests green (the existing impl from Task 1 already handles all cases).

- [x] **Step 3: Commit**

```bash
git add src/__tests__/fpt-table-scanner.test.ts
git commit -m "test(fpt): cover scanFPTDirectory IPC paths

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 3: Add Electron IPC handler `fpt:scanDirectory`

**Files:**
- Modify: `electron-main.cjs` (add IPC handler)
- Modify: `electron-preload.cjs` (expose to renderer)

- [x] **Step 1: Add IPC handler in `electron-main.cjs`**

Find the existing `ipcMain.handle('window:closeAllChildren', ...)` block at the end of the IPC handlers section. Insert AFTER it:

```js
// FPT directory scanner — list .fpt files with basic metadata.
// Renderer can't safely use fs.readdir; main process owns filesystem access.
ipcMain.handle('fpt:scanDirectory', async (_event, dirPath) => {
  if (typeof dirPath !== 'string' || dirPath.length === 0) return [];
  try {
    const dirents = await fs.promises.readdir(dirPath, { withFileTypes: true });
    const fptFiles = dirents.filter(d => d.isFile() && d.name.toLowerCase().endsWith('.fpt'));
    const out = [];
    for (const dirent of fptFiles) {
      const fullPath = path.join(dirPath, dirent.name);
      try {
        const stat = await fs.promises.stat(fullPath);
        out.push({
          path: fullPath,
          name: dirent.name.replace(/\.fpt$/i, ''),
          size: stat.size,
          mtime: stat.mtimeMs,
        });
      } catch { /* ignore individual stat failures */ }
    }
    return out;
  } catch (err) {
    console.warn('[fpt:scanDirectory] failed:', err.message);
    return [];
  }
});
```

- [x] **Step 2: Verify `fs` is imported at top of file**

Open `electron-main.cjs` lines 1-30 and check that `const fs = require('fs');` is present (it should be from existing code). If missing, add it next to the existing `path` import.

- [x] **Step 3: Expose IPC in `electron-preload.cjs`**

Find the existing `electronAPI` object in `electron-preload.cjs`. Add this entry alongside the other IPC bindings (e.g. next to `getAllDisplays`):

```js
// Phase B0: FPT auto-scan
scanFPTDirectory: (dirPath) => ipcRenderer.invoke('fpt:scanDirectory', dirPath),
```

- [x] **Step 4: Type-check the build still passes**

Run: `npm run build`
Expected: build succeeds with no TypeScript errors.

- [x] **Step 5: Commit**

```bash
git add electron-main.cjs electron-preload.cjs
git commit -m "feat(electron): add fpt:scanDirectory IPC handler

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 4: Path-config module (localStorage persistence)

**Files:**
- Create: `src/fpt-render/fpt-path-config.ts`
- Test: `src/__tests__/fpt-path-config.test.ts`

- [x] **Step 1: Write the test**

```ts
// src/__tests__/fpt-path-config.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { getFPTPath, setFPTPath, clearFPTPath, FPT_PATH_KEY } from '../fpt-render/fpt-path-config';

describe('fpt-path-config', () => {
  beforeEach(() => {
    localStorage.removeItem(FPT_PATH_KEY);
  });

  it('returns null when no path is saved', () => {
    expect(getFPTPath()).toBeNull();
  });

  it('persists a path via setFPTPath + getFPTPath', () => {
    setFPTPath('/Users/me/Tables');
    expect(getFPTPath()).toBe('/Users/me/Tables');
  });

  it('clearFPTPath removes the saved value', () => {
    setFPTPath('/x');
    clearFPTPath();
    expect(getFPTPath()).toBeNull();
  });

  it('rejects empty paths', () => {
    setFPTPath('');
    expect(getFPTPath()).toBeNull();
  });
});
```

- [x] **Step 2: Run, verify failure**

Run: `npx vitest run src/__tests__/fpt-path-config.test.ts`
Expected: FAIL — module doesn't exist.

- [x] **Step 3: Implement the module**

```ts
// src/fpt-render/fpt-path-config.ts
// SPDX-License-Identifier: AGPL-3.0-or-later
// © 2026 Harald Weiss
/**
 * fpt-path-config.ts — Persist the chosen FPT directory across sessions.
 *
 * The user picks a directory once (Phase B0 setup dialog). The path is saved
 * to localStorage. On subsequent app starts, scanFPTDirectory(getFPTPath())
 * runs automatically and populates the Quick Menu.
 */

export const FPT_PATH_KEY = 'fpw_fpt_directory';

export function getFPTPath(): string | null {
  try {
    const v = localStorage.getItem(FPT_PATH_KEY);
    return v && v.length > 0 ? v : null;
  } catch {
    return null;
  }
}

export function setFPTPath(path: string): void {
  try {
    if (path && path.length > 0) {
      localStorage.setItem(FPT_PATH_KEY, path);
    } else {
      localStorage.removeItem(FPT_PATH_KEY);
    }
  } catch { /* localStorage may throw under strict policies */ }
}

export function clearFPTPath(): void {
  try { localStorage.removeItem(FPT_PATH_KEY); } catch { /* ignore */ }
}
```

- [x] **Step 4: Run tests, verify pass**

Run: `npx vitest run src/__tests__/fpt-path-config.test.ts`
Expected: PASS — all 4 tests green.

- [x] **Step 5: Commit**

```bash
git add src/fpt-render/fpt-path-config.ts src/__tests__/fpt-path-config.test.ts
git commit -m "feat(fpt): persist FPT directory in localStorage

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 5: Add IPC handler `fpt:pickDirectory` for OS folder picker

**Files:**
- Modify: `electron-main.cjs`
- Modify: `electron-preload.cjs`

- [x] **Step 1: Add the IPC handler to `electron-main.cjs`**

Add right after the `fpt:scanDirectory` handler from Task 3:

```js
// Show a native OS folder picker for the user to choose their FPT directory.
ipcMain.handle('fpt:pickDirectory', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Select your Future Pinball tables directory',
    properties: ['openDirectory'],
  });
  if (result.canceled || result.filePaths.length === 0) return null;
  return result.filePaths[0];
});
```

- [x] **Step 2: Expose in preload**

In `electron-preload.cjs`, alongside `scanFPTDirectory`, add:

```js
pickFPTDirectory: () => ipcRenderer.invoke('fpt:pickDirectory'),
```

- [x] **Step 3: Build to verify**

Run: `npm run build`
Expected: PASS.

- [x] **Step 4: Commit**

```bash
git add electron-main.cjs electron-preload.cjs
git commit -m "feat(electron): add fpt:pickDirectory IPC handler for native folder picker

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 6: Filter + sort pure functions

**Files:**
- Create: `src/fpt-render/fpt-table-browser.ts` (just filter/sort first; UI later)
- Test: `src/__tests__/fpt-table-browser.test.ts`

- [x] **Step 1: Write tests**

```ts
// src/__tests__/fpt-table-browser.test.ts
import { describe, it, expect } from 'vitest';
import { filterEntries, sortEntries, type SortKey } from '../fpt-render/fpt-table-browser';
import type { FPTFileEntry } from '../fpt-render/fpt-table-scanner';

const ENTRIES: FPTFileEntry[] = [
  { path: '/a/Willow.fpt', name: 'Willow', size: 60_000_000, mtime: 3000 },
  { path: '/a/Pharaoh.fpt', name: "Pharaoh's Gold", size: 30_000_000, mtime: 1000 },
  { path: '/a/zwillow.fpt', name: 'ZWillow', size: 5_000_000, mtime: 2000 },
];

describe('filterEntries', () => {
  it('returns all entries for empty query', () => {
    expect(filterEntries(ENTRIES, '')).toEqual(ENTRIES);
  });

  it('matches case-insensitive substring of name', () => {
    const r = filterEntries(ENTRIES, 'will');
    expect(r.map(e => e.name)).toEqual(['Willow', 'ZWillow']);
  });

  it('returns [] when nothing matches', () => {
    expect(filterEntries(ENTRIES, 'xyz')).toEqual([]);
  });

  it('trims whitespace from query', () => {
    expect(filterEntries(ENTRIES, '  will  ')).toHaveLength(2);
  });
});

describe('sortEntries', () => {
  it('sorts by name ascending', () => {
    const r = sortEntries(ENTRIES, 'name');
    expect(r.map(e => e.name)).toEqual(["Pharaoh's Gold", 'Willow', 'ZWillow']);
  });

  it('sorts by size descending', () => {
    const r = sortEntries(ENTRIES, 'size');
    expect(r.map(e => e.name)).toEqual(['Willow', "Pharaoh's Gold", 'ZWillow']);
  });

  it('sorts by mtime descending (newest first)', () => {
    const r = sortEntries(ENTRIES, 'mtime');
    expect(r.map(e => e.name)).toEqual(['Willow', 'ZWillow', "Pharaoh's Gold"]);
  });

  it('does not mutate the input', () => {
    const copy = [...ENTRIES];
    sortEntries(copy, 'name');
    expect(copy).toEqual(ENTRIES);
  });
});
```

- [x] **Step 2: Run, verify failure**

Run: `npx vitest run src/__tests__/fpt-table-browser.test.ts`
Expected: FAIL — module missing.

- [x] **Step 3: Implement the module**

```ts
// src/fpt-render/fpt-table-browser.ts
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
```

- [x] **Step 4: Run tests, verify pass**

Run: `npx vitest run src/__tests__/fpt-table-browser.test.ts`
Expected: PASS — all 8 tests green.

- [x] **Step 5: Commit**

```bash
git add src/fpt-render/fpt-table-browser.ts src/__tests__/fpt-table-browser.test.ts
git commit -m "feat(fpt): add filter+sort helpers for table browser

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 7: Quick Menu HTML + CSS for FPT section

**Files:**
- Modify: `src/index.html`

- [x] **Step 1: Add CSS for the new section**

Find the existing `#quick-menu-box` CSS block in `src/index.html` (around line 253). Add these rules right after the existing Quick Menu rules:

```css
    /* Phase B0: FPT Tables section */
    #qm-fpt-section { margin-top: 20px; padding-top: 16px; border-top: 1px solid rgba(0,170,255,0.3); }
    #qm-fpt-section h3 { color: #00aaff; font-size: 14px; letter-spacing: 2px; text-align: center; margin-bottom: 12px; }
    #qm-fpt-controls { display: flex; gap: 8px; align-items: center; margin-bottom: 12px; }
    #qm-fpt-search { flex: 1; padding: 8px 12px; background: rgba(0,30,60,0.6); border: 1px solid #335; border-radius: 6px; color: #ccc; font-family: 'Courier New', monospace; font-size: 13px; }
    #qm-fpt-search:focus { outline: none; border-color: #00aaff; }
    #qm-fpt-sort { padding: 8px 10px; background: rgba(0,30,60,0.6); border: 1px solid #335; border-radius: 6px; color: #ccc; font-family: 'Courier New', monospace; font-size: 12px; cursor: pointer; }
    #qm-fpt-set-path { padding: 8px 12px; background: rgba(0,100,50,0.3); border: 1px solid #00cc66; color: #00cc66; border-radius: 6px; cursor: pointer; font-family: 'Courier New', monospace; font-size: 11px; letter-spacing: 1px; }
    #qm-fpt-set-path:hover { background: rgba(0,150,80,0.4); }
    #qm-fpt-list { max-height: 360px; overflow-y: auto; display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 10px; }
    #qm-fpt-list:empty::after { content: 'No tables found. Click "Set path" to choose a directory.'; display: block; padding: 30px; text-align: center; color: #556; font-style: italic; }
    .qm-fpt-card { background: rgba(0,30,60,0.4); border: 1px solid #224; border-radius: 8px; padding: 10px 12px; cursor: pointer; transition: all 0.15s; }
    .qm-fpt-card:hover { border-color: #00aaff; background: rgba(0,60,100,0.5); }
    .qm-fpt-card .qm-fpt-name { color: #ccc; font-size: 13px; margin-bottom: 4px; word-break: break-word; }
    .qm-fpt-card .qm-fpt-meta { color: #557; font-size: 10px; }
```

- [x] **Step 2: Add HTML markup**

Find the existing `<div id="quick-menu-box">` content in `src/index.html` (around line 348). Right BEFORE the existing `<div class="quick-actions">` block, insert the new section:

```html
      <div id="qm-fpt-section">
        <h3>📁 FPT Tables</h3>
        <div id="qm-fpt-controls">
          <input id="qm-fpt-search" type="text" placeholder="Search by name…" />
          <select id="qm-fpt-sort">
            <option value="name">Name ↑</option>
            <option value="size">Size ↓</option>
            <option value="mtime">Last modified ↓</option>
          </select>
          <button id="qm-fpt-set-path" type="button">⚙ Set path</button>
        </div>
        <div id="qm-fpt-list"></div>
      </div>
```

- [x] **Step 3: Verify build still works**

Run: `npm run build`
Expected: PASS.

- [x] **Step 4: Commit**

```bash
git add src/index.html
git commit -m "feat(fpt): add FPT-Tables section HTML+CSS to Quick Menu

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 8: Quick Menu render function (populates list from entries)

**Files:**
- Modify: `src/fpt-render/fpt-table-browser.ts` (add render function)
- Test: extend `src/__tests__/fpt-table-browser.test.ts`

- [x] **Step 1: Add render-function tests**

Append to `src/__tests__/fpt-table-browser.test.ts`. Note the new top-level imports needed:

```ts
import { vi, beforeEach } from 'vitest';
import { renderTableList } from '../fpt-render/fpt-table-browser';

describe('renderTableList', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  it('renders one card per entry', () => {
    renderTableList(container, ENTRIES, () => {});
    const cards = container.querySelectorAll('.qm-fpt-card');
    expect(cards).toHaveLength(3);
  });

  it('shows the table name on each card', () => {
    renderTableList(container, ENTRIES, () => {});
    const names = Array.from(container.querySelectorAll('.qm-fpt-name')).map(el => el.textContent);
    expect(names).toEqual(['Willow', "Pharaoh's Gold", 'ZWillow']);
  });

  it('escapes user-controlled text (no HTML injection)', () => {
    const evil = [{ path: '/x.fpt', name: '<img src=x onerror=alert(1)>', size: 1, mtime: 1 }];
    renderTableList(container, evil, () => {});
    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('.qm-fpt-name')!.textContent).toContain('<img');
  });

  it('clears previous content before rendering', () => {
    const stale = document.createElement('span');
    stale.className = 'leftover';
    stale.textContent = 'x';
    container.appendChild(stale);
    renderTableList(container, ENTRIES, () => {});
    expect(container.querySelector('.leftover')).toBeNull();
  });

  it('calls onClick with the entry when card is clicked', () => {
    const handler = vi.fn();
    renderTableList(container, ENTRIES, handler);
    (container.querySelector('.qm-fpt-card') as HTMLElement).click();
    expect(handler).toHaveBeenCalledWith(ENTRIES[0]);
  });
});
```

- [x] **Step 2: Run, verify failure**

Run: `npx vitest run src/__tests__/fpt-table-browser.test.ts`
Expected: FAIL — `renderTableList` doesn't exist.

- [x] **Step 3: Implement render function**

Append to `src/fpt-render/fpt-table-browser.ts`:

```ts
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
```

- [x] **Step 4: Run tests, verify pass**

Run: `npx vitest run src/__tests__/fpt-table-browser.test.ts`
Expected: PASS — all tests green (filter+sort tests still pass, render tests new and green).

- [x] **Step 5: Commit**

```bash
git add src/fpt-render/fpt-table-browser.ts src/__tests__/fpt-table-browser.test.ts
git commit -m "feat(fpt): add safe DOM render for table-browser cards

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 9: `fpt:readFile` IPC for loading a chosen FPT

**Files:**
- Modify: `electron-main.cjs`
- Modify: `electron-preload.cjs`

- [x] **Step 1: Add IPC handler**

In `electron-main.cjs`, add after the `fpt:pickDirectory` handler from Task 5:

```js
// Read an FPT file from disk and return its bytes to the renderer.
// Returned as a Node Buffer; structured-clone serializes it to ArrayBuffer.
ipcMain.handle('fpt:readFile', async (_event, filePath) => {
  if (typeof filePath !== 'string') throw new Error('filePath required');
  // Sanity: refuse to read files outside an .fpt extension. The preload
  // contract says renderer only asks for file paths the scanner returned,
  // but defense in depth doesn't hurt.
  if (!filePath.toLowerCase().endsWith('.fpt')) throw new Error('not an fpt file');
  const buf = await fs.promises.readFile(filePath);
  // Convert to ArrayBuffer so structured clone gives renderer-friendly bytes.
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
});
```

- [x] **Step 2: Expose in preload**

Add to `electron-preload.cjs` alongside `scanFPTDirectory`:

```js
readFPTFile: (filePath) => ipcRenderer.invoke('fpt:readFile', filePath),
```

- [x] **Step 3: Build to verify**

Run: `npm run build`
Expected: PASS.

- [x] **Step 4: Commit**

```bash
git add electron-main.cjs electron-preload.cjs
git commit -m "feat(electron): add fpt:readFile IPC handler

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 10: Wire the FPT browser into Quick Menu init flow

**Files:**
- Modify: `src/main.ts`

- [x] **Step 1: Find the Quick Menu init point**

In `src/main.ts`, locate the existing `DOMContentLoaded` listener at the bottom of the file (it currently calls `showTableSelector` and `applyStartupScreenConfig`). We'll add the FPT-browser init right next to it.

- [x] **Step 2: Add a new `initializeFPTBrowser` function**

Add this function near the other top-level helpers in `src/main.ts` (e.g. after `browseTableDirectory`):

```ts
// Phase B0: FPT auto-scan + browser. Only runs when running under Electron
// (electronAPI present); in plain browsers the section stays empty and the
// user falls back to the existing drag-drop / file-picker UI.
async function initializeFPTBrowser(): Promise<void> {
  const api = (window as any).electronAPI;
  if (!api?.scanFPTDirectory) {
    // No Electron — hide the FPT section entirely
    const section = document.getElementById('qm-fpt-section');
    if (section) section.style.display = 'none';
    return;
  }

  const { scanFPTDirectory } = await import('./fpt-render/fpt-table-scanner');
  const { filterEntries, sortEntries, renderTableList, type SortKey } = await import('./fpt-render/fpt-table-browser');
  const { getFPTPath, setFPTPath } = await import('./fpt-render/fpt-path-config');

  const listEl = document.getElementById('qm-fpt-list')!;
  const searchEl = document.getElementById('qm-fpt-search') as HTMLInputElement;
  const sortEl = document.getElementById('qm-fpt-sort') as HTMLSelectElement;
  const pathBtn = document.getElementById('qm-fpt-set-path') as HTMLButtonElement;

  let allEntries: import('./fpt-render/fpt-table-scanner').FPTFileEntry[] = [];

  const refreshList = () => {
    const filtered = filterEntries(allEntries, searchEl.value);
    const sorted = sortEntries(filtered, sortEl.value as SortKey);
    renderTableList(listEl, sorted, (entry) => {
      void loadFPTFromPath(entry.path).catch((e) => {
        console.error('[fpt-browser] load failed:', e);
        showNotification(`Failed to load ${entry.name}: ${e.message}`);
      });
    });
  };

  const scan = async (path: string | null) => {
    if (!path) { allEntries = []; refreshList(); return; }
    allEntries = await scanFPTDirectory(path);
    console.log(`[fpt-browser] scanned ${allEntries.length} files in ${path}`);
    refreshList();
  };

  // Initial scan from saved path
  await scan(getFPTPath());

  // Wire controls
  searchEl.addEventListener('input', refreshList);
  sortEl.addEventListener('change', refreshList);
  pathBtn.addEventListener('click', async () => {
    const picked = await api.pickFPTDirectory?.();
    if (picked) {
      setFPTPath(picked);
      await scan(picked);
    }
  });
}

async function loadFPTFromPath(filePath: string): Promise<void> {
  const api = (window as any).electronAPI;
  if (!api?.readFPTFile) throw new Error('not running in Electron');
  const buf: ArrayBuffer = await api.readFPTFile(filePath);
  const bytes = new Uint8Array(buf);
  // Hand off to existing parser. Phase B0 stops here — actually showing the
  // table on the playfield with FPT-derived geometry is Phase B1+.
  const { parseFPTFile } = await import('./fpt-parser');
  await parseFPTFile(bytes, { onPhaseComplete: () => {} });
  showNotification(`Loaded ${filePath.split(/[\\/]/).pop()} — rendering polish in upcoming phases`);
}
```

- [x] **Step 3: Call `initializeFPTBrowser` from the existing `DOMContentLoaded` block**

Find the existing `document.addEventListener('DOMContentLoaded', () => { ... })` at the bottom of `src/main.ts`. Inside that handler, after the existing `showTableSelector` + `applyStartupScreenConfig` calls, add:

```ts
  void initializeFPTBrowser();
```

- [x] **Step 4: Build, verify TypeScript passes**

Run: `npm run build`
Expected: PASS.

- [x] **Step 5: Commit**

```bash
git add src/main.ts
git commit -m "feat(fpt): wire FPT browser into Quick Menu init

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 11: Manual smoke test on Electron

**Files:** none (verification only)

This task has no automated test — Electron + filesystem can't be fully simulated in unit tests. We verify by running the app and checking the Quick Menu.

- [x] **Step 1: Start the dev server**

Run: `npm run electron-dev`
Expected: Electron window opens, Quick Menu visible.

- [x] **Step 2: Verify the empty FPT section**

In the Quick Menu, confirm:
- The "📁 FPT Tables" section is visible below the Demo Tables.
- Search box, sort dropdown, "⚙ Set path" button render.
- The list area shows the empty-state hint text.

- [x] **Step 3: Set a path**

- Click "⚙ Set path".
- Native folder picker opens.
- Select a directory containing `.fpt` files (e.g. `~/FuturePinball/Tables/`).
- Confirm the FPT list populates with table names.
- Confirm size + last-modified shows on each card.

- [x] **Step 4: Verify search**

- Type "willow" (or any partial name) into the search box.
- Confirm the list narrows live.
- Clear the search → full list reappears.

- [x] **Step 5: Verify sort**

- Change the sort dropdown to "Size ↓".
- Confirm largest tables appear first.
- Change to "Last modified ↓".
- Confirm newest tables appear first.

- [x] **Step 6: Verify click → load**

- Click any FPT card.
- Confirm the parser runs (DevTools console should show parser log lines like `Textur: "..."` and `Sound: "..."`).
- Confirm a notification appears: `"Loaded Willow Pinball 1.5.fpt — rendering polish in upcoming phases"`.

- [x] **Step 7: Restart app and verify path persistence**

- Close Electron.
- Run `npm run electron-dev` again.
- Confirm the FPT section auto-populates from the previously chosen path (no re-set required).

- [x] **Step 8: If anything fails**

Diagnose, fix, commit. If everything passes, no commit needed.

---

## Self-Review Notes

This plan covers Phase B0 from the spec:
- **Auto-scan** → Tasks 1-3
- **Path persistence** → Task 4
- **Folder picker** → Task 5
- **Filter + sort** → Task 6
- **HTML/CSS** → Task 7
- **Render** → Task 8
- **File read** → Task 9
- **Wiring** → Task 10
- **Manual verify** → Task 11

Spec acceptance criteria coverage:
- ✅ "App starts; if directory is set, FPT list appears in Quick Menu within 1s for ≤1000 files." → Task 11 step 7
- ✅ "User can search 'willow' and see only matching files." → Task 6 + Task 11 step 4
- ✅ "User can change path; new path replaces displayed list." → Task 5 + Task 10 + Task 11 step 3
- ✅ "Clicking an FPT file currently loads it via existing parser." → Task 9 + Task 10 + Task 11 step 6

Out of scope here (correctly deferred to later phases):
- Thumbnails (post-MVP per spec)
- Filter toggles for Demo/FPT independent (not strictly needed yet — both sections always shown)
- Cover art from Backglass
- Library auto-resolution
