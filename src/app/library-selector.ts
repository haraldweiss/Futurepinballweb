/**
 * library-selector.ts — DOM-level library selector UI.
 *
 * Shows a modal with available table templates from a loaded FPL library.
 * Each template can be clicked to load directly via loadTableWithPhysicsWorker.
 *
 * Extracted from main.ts.
 */
import * as THREE from 'three';
import { appendLogEntry } from './log-utils';

export interface LibrarySelectorDeps {
  loadTableWithPhysicsWorker: (cfg: any, scene: THREE.Scene, library?: any) => Promise<void>;
  resetGameState: () => void;
  scene: THREE.Scene;
}

/**
 * Create the showLibrarySelector function. Returns a function that
 * displays the library selector modal for a given FPL library.
 */
export function createLibrarySelector(deps: LibrarySelectorDeps): (lib: any) => void {
  const { loadTableWithPhysicsWorker, resetGameState, scene } = deps;

  return (lib: any) => {
    const selector = document.getElementById('library-selector');
    const nameEl = document.getElementById('library-name');
    const tableEl = document.getElementById('library-tables');

    if (!selector || !nameEl || !tableEl) return;

    nameEl.textContent = `${lib.name} — ${Object.keys(lib.tableTemplates).length} tables available`;
    tableEl.innerHTML = '';

    for (const [templateName, templateConfig] of Object.entries(lib.tableTemplates)) {
      const btn = document.createElement('button');
      btn.className = 'library-table-btn';
      btn.textContent = templateName;
      btn.onclick = async () => {
        resetGameState();
        await loadTableWithPhysicsWorker(templateConfig, scene, lib);
        window.closeLoader();
        appendLogEntry(`✓ Loaded: ${lib.name} / ${templateName}`);
      };
      tableEl.appendChild(btn);
    }

    selector.style.display = 'block';
  };
}
