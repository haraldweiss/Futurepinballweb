// SPDX-License-Identifier: AGPL-3.0-or-later
import { DirectoryPathManager } from '../directory-path-manager';
import { escapeHtml } from '../utils/html-escape';

export function updateTablePathShortcuts(browseTableDir: () => void): void {
  const container = document.getElementById('table-shortcuts-container');
  if (!container) return;

  const paths = DirectoryPathManager.getTablePaths();
  if (paths.length === 0) {
    container.innerHTML = '<p style="color:#999; font-size:11px;">Keine Verlauf</p>';
    return;
  }

  container.innerHTML = '<p style="color:#667; font-size:10px; margin-bottom:4px;">📋 Zuletzt geöffnet:</p>';
  paths.forEach((path, idx) => {
    const btn = document.createElement('button');
    btn.className = 'tab-btn';
    btn.style.fontSize = '11px';
    btn.style.padding = '4px 8px';
    btn.style.marginBottom = '3px';
    btn.style.width = '100%';
    btn.style.textAlign = 'left';
    btn.style.opacity = (1 - idx * 0.1).toString();
    btn.innerHTML = `🔄 ${escapeHtml(path.name)}`;
    btn.title = new Date(path.timestamp).toLocaleDateString();
    btn.onclick = browseTableDir;
    container.appendChild(btn);
  });

  const clearBtn = document.createElement('button');
  clearBtn.style.fontSize = '10px';
  clearBtn.style.padding = '3px 6px';
  clearBtn.style.marginTop = '6px';
  clearBtn.style.color = '#999';
  clearBtn.style.cursor = 'pointer';
  clearBtn.textContent = '✕ Löschen';
  clearBtn.onclick = () => {
    DirectoryPathManager.clearAllPaths('table');
    updateTablePathShortcuts(browseTableDir);
  };
  container.appendChild(clearBtn);
}

export function updateLibraryPathShortcuts(browseLibraryDir: () => void): void {
  const container = document.getElementById('library-shortcuts-container');
  if (!container) return;

  const paths = DirectoryPathManager.getLibraryPaths();
  if (paths.length === 0) {
    container.innerHTML = '<p style="color:#999; font-size:11px;">Keine Verlauf</p>';
    return;
  }

  container.innerHTML = '<p style="color:#667; font-size:10px; margin-bottom:4px;">📋 Zuletzt geöffnet:</p>';
  paths.forEach((path, idx) => {
    const btn = document.createElement('button');
    btn.className = 'tab-btn';
    btn.style.fontSize = '11px';
    btn.style.padding = '4px 8px';
    btn.style.marginBottom = '3px';
    btn.style.width = '100%';
    btn.style.textAlign = 'left';
    btn.style.opacity = (1 - idx * 0.1).toString();
    btn.innerHTML = `🔄 ${escapeHtml(path.name)}`;
    btn.title = new Date(path.timestamp).toLocaleDateString();
    btn.onclick = browseLibraryDir;
    container.appendChild(btn);
  });

  const clearBtn = document.createElement('button');
  clearBtn.style.fontSize = '10px';
  clearBtn.style.padding = '3px 6px';
  clearBtn.style.marginTop = '6px';
  clearBtn.style.color = '#999';
  clearBtn.style.cursor = 'pointer';
  clearBtn.textContent = '✕ Löschen';
  clearBtn.onclick = () => {
    DirectoryPathManager.clearAllPaths('library');
    updateLibraryPathShortcuts(browseLibraryDir);
  };
  container.appendChild(clearBtn);
}
