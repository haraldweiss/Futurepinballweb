/**
 * Event Handlers Initialization
 * Phase: Security Remediation Phase 1 - Replace Inline onclick
 * 
 * Instead of inline onclick="..." attributes, we register event listeners.
 * This enables CSP compliance and cleaner separation of concerns.
 */

/**
 * Initialize all UI event handlers
 * Call this after DOM is ready (in main.ts)
 */
export function initializeEventHandlers(): void {
  console.log('[Event Handlers] Initializing UI event handlers...');
  
  // Quick Menu
  initializeQuickMenuHandlers();
  
  // Tab Navigation
  initializeTabHandlers();
  
  // Table Selection
  initializeTableSelectionHandlers();
  
  // Modal Controls
  initializeModalHandlers();
  
  // View Controls
  initializeViewControlHandlers();
  
  console.log('[Event Handlers] ✓ All handlers initialized');
  
  // ─── Phase 24 Enhancement: Auto-open Quick Menu on startup ───
  setTimeout(() => {
    const modal = document.getElementById('loader-modal');
    const quickMenu = document.getElementById('quick-menu');
    if (modal && quickMenu) {
      const isModalHidden = window.getComputedStyle(modal).display === 'none';
      if (isModalHidden && !quickMenu.classList.contains('open')) {
        openQuickMenu();
        console.log('[Event Handlers] ✅ Quick Menu auto-opened on startup');
      }
    }
  }, 100);
}

/**
 * Quick Menu Helpers (exported for global access)
 */
export function openQuickMenu(): void {
  const quickMenu = document.getElementById('quick-menu');
  if (quickMenu) quickMenu.classList.add('open');
}

export function closeQuickMenu(): void {
  const quickMenu = document.getElementById('quick-menu');
  if (quickMenu) quickMenu.classList.remove('open');
}

/**
 * Quick Menu Handlers
 * Replaces: onclick="closeQuickMenu()" and onclick="openQuickMenu()"
 */
function initializeQuickMenuHandlers(): void {
  const closeBtn = document.getElementById('menu-close-btn');
  const quickMenu = document.getElementById('quick-menu');
  const openLoaderBtn = document.getElementById('open-loader');
  
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      closeQuickMenu();
    });
  }
  
  // Demo table cards in quick menu
  document.querySelectorAll('.quick-table-card').forEach((card) => {
    const tableId = card.getAttribute('data-table');
    if (!tableId) {
      // Extract from existing HTML structure if needed
      const heading = card.querySelector('h3')?.textContent || '';
      const tableMap: { [key: string]: string } = {
        'Pharaoh': 'pharaoh', 'Dragon': 'dragon', 'Knight': 'knight',
        'Cyber': 'cyber', 'Neon': 'neon', 'Jungle': 'jungle'
      };
      const table = Object.entries(tableMap).find(([name]) => heading.includes(name))?.[1];
      if (table) {
        card.setAttribute('data-table', table);
      }
    }
    
    card.addEventListener('click', () => {
      const table = card.getAttribute('data-table');
      if (table && typeof (window as any).loadDemoTable === 'function') {
        (window as any).loadDemoTable(table);
        quickMenu?.classList.remove('open');
      }
    });
  });
  
  // Quick action buttons
  const importBtn = document.querySelector('.quick-action-btn:nth-child(1)');
  const browserBtn = document.querySelector('.quick-action-btn:nth-child(2)');
  const infoBtn = document.querySelector('.quick-action-btn:nth-child(3)');
  
  if (importBtn) {
    importBtn.addEventListener('click', () => {
      if (typeof (window as any).switchTab === 'function') {
        (window as any).switchTab('import');
      }
      const modal = document.getElementById('loader-modal');
      if (modal) modal.style.display = 'flex';
    });
  }
  
  if (browserBtn) {
    browserBtn.addEventListener('click', () => {
      if (typeof (window as any).switchTab === 'function') {
        (window as any).switchTab('browser');
      }
      const modal = document.getElementById('loader-modal');
      if (modal) modal.style.display = 'flex';
    });
  }
  
  if (infoBtn) {
    infoBtn.addEventListener('click', () => {
      if (typeof (window as any).switchTab === 'function') {
        (window as any).switchTab('info');
      }
      const modal = document.getElementById('loader-modal');
      if (modal) modal.style.display = 'flex';
    });
  }
}

/**
 * Tab Navigation Handlers
 * Replaces: onclick="switchTab(...)"
 */
function initializeTabHandlers(): void {
  document.querySelectorAll('.tab-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const tabs = ['demo', 'import', 'browser', 'info', 'script'];
      let tabName = '';
      
      // Extract tab name from button text or data-tab attribute
      if (btn.textContent?.includes('DEMO')) tabName = 'demo';
      else if (btn.textContent?.includes('IMPORT')) tabName = 'import';
      else if (btn.textContent?.includes('BROWSER')) tabName = 'browser';
      else if (btn.textContent?.includes('INFO')) tabName = 'info';
      else if (btn.textContent?.includes('SCRIPT')) tabName = 'script';
      
      if (tabName && typeof (window as any).switchTab === 'function') {
        (window as any).switchTab(tabName);
      }
    });
  });
}

/**
 * Table Selection Handlers
 * Replaces: onclick="loadDemoTable(...)"
 */
function initializeTableSelectionHandlers(): void {
  // Demo table cards in modal
  document.querySelectorAll('#tab-demo .table-card').forEach((card) => {
    card.addEventListener('click', () => {
      const heading = card.querySelector('h3')?.textContent || '';
      const tableMap: { [key: string]: string } = {
        'Pharaoh': 'pharaoh', 'Dragon': 'dragon', 'Knight': 'knight',
        'Cyber': 'cyber', 'Neon': 'neon', 'Jungle': 'jungle'
      };
      
      const table = Object.entries(tableMap).find(([name]) => heading.includes(name))?.[1];
      if (table && typeof (window as any).loadDemoTable === 'function') {
        (window as any).loadDemoTable(table);
      }
    });
  });
  
  // Browser table list buttons
  document.querySelectorAll('#tables-list button').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (typeof (window as any).browseTableDirectory === 'function') {
        (window as any).browseTableDirectory();
      }
    });
  });
}

/**
 * Modal and Control Handlers
 * Replaces: onclick="closeLoader()" and similar
 */
function initializeModalHandlers(): void {
  const closeBtn = document.querySelector('.btn-primary');
  if (closeBtn && closeBtn.textContent?.includes('SPIELEN')) {
    closeBtn.addEventListener('click', () => {
      if (typeof (window as any).closeLoader === 'function') {
        (window as any).closeLoader();
      }
    });
  }
  
  // Drop zone for file input
  const dropZone = document.getElementById('drop-zone');
  if (dropZone) {
    dropZone.addEventListener('click', () => {
      const fileInput = document.getElementById('file-input') as HTMLInputElement;
      if (fileInput) fileInput.click();
    });
  }
}

/**
 * View Control Handlers
 * Replaces: onclick="toggleFullscreen()" etc
 */
function initializeViewControlHandlers(): void {
  const fullscreenBtn = document.getElementById('fullscreen-btn');
  if (fullscreenBtn) {
    fullscreenBtn.addEventListener('click', () => {
      if (typeof (window as any).toggleFullscreen === 'function') {
        (window as any).toggleFullscreen();
      }
    });
  }
  
  const multiscreenBtn = document.getElementById('multiscreen-btn');
  if (multiscreenBtn) {
    multiscreenBtn.addEventListener('click', () => {
      if (typeof (window as any).openMultiscreenModal === 'function') {
        (window as any).openMultiscreenModal();
      }
    });
  }
  
  const viewBtn = document.getElementById('view-btn');
  if (viewBtn) {
    viewBtn.addEventListener('click', () => {
      if (typeof (window as any).toggleViewPanel === 'function') {
        (window as any).toggleViewPanel();
      }
    });
  }
  
  const hideDmdBtn = document.getElementById('hide-dmd-btn');
  if (hideDmdBtn) {
    hideDmdBtn.addEventListener('click', () => {
      if (typeof (window as any).toggleHideDMD === 'function') {
        (window as any).toggleHideDMD();
      }
    });
  }
  
  const dmdModeBtn = document.getElementById('dmd-mode-btn');
  if (dmdModeBtn) {
    dmdModeBtn.addEventListener('click', () => {
      if (typeof (window as any).toggleDMDMode === 'function') {
        (window as any).toggleDMDMode();
      }
    });
  }
  
  const installBtn = document.getElementById('install-btn');
  if (installBtn) {
    installBtn.addEventListener('click', () => {
      if (typeof (window as any).installPWA === 'function') {
        (window as any).installPWA();
      }
    });
  }
}

