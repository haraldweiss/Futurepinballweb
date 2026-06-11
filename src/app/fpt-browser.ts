// SPDX-License-Identifier: AGPL-3.0-or-later
import { showNotification } from './notification';
import { parseFPTFile } from '../fpt-parser';

export async function loadFPTFromPath(filePath: string): Promise<void> {
  const api = window.electronAPI;
  if (!api?.readFPTFile) throw new Error('not running in Electron');
  const buf: ArrayBuffer = await api.readFPTFile(filePath);
  const filename = filePath.split(/[\\/]/).pop() ?? 'table.fpt';
  const file = new File([buf], filename, { type: 'application/octet-stream' });
  await parseFPTFile(file);
  showNotification(`Loaded ${filename} — rendering polish in upcoming phases`);
}

export async function initializeFPTBrowser(): Promise<void> {
  const api = window.electronAPI;
  if (!api?.scanFPTDirectory) {
    const section = document.getElementById('qm-fpt-section');
    if (section) section.style.display = 'none';
    return;
  }

  const { scanFPTDirectory } = await import('../fpt-render/fpt-table-scanner');
  const { filterEntries, sortEntries, renderTableList } = await import('../fpt-render/fpt-table-browser');
  type SortKey = 'name' | 'size' | 'mtime';
  const { getFPTPath, setFPTPath } = await import('../fpt-render/fpt-path-config');

  const listEl = document.getElementById('qm-fpt-list')!;
  const searchEl = document.getElementById('qm-fpt-search') as HTMLInputElement;
  const sortEl = document.getElementById('qm-fpt-sort') as HTMLSelectElement;
  const pathBtn = document.getElementById('qm-fpt-set-path') as HTMLButtonElement;

  let allEntries: import('../fpt-render/fpt-table-scanner').FPTFileEntry[] = [];

  const refreshList = () => {
    const filtered = filterEntries(allEntries, searchEl.value);
    const sorted = sortEntries(filtered, sortEl.value as SortKey);
    renderTableList(listEl, sorted, (entry) => {
      void loadFPTFromPath(entry.path).catch((e) => {
        console.error('[fpt-browser] load failed:', e);
        showNotification(`Failed to load ${entry.name}: ${(e as Error).message}`);
      });
    });
  };

  const scan = async (path: string | null) => {
    if (!path) { allEntries = []; refreshList(); return; }
    allEntries = await scanFPTDirectory(path);
    refreshList();
  };

  await scan(getFPTPath());

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
