/**
 * table-selector.ts — Table Selection Modal
 *
 * Displays available demo tables and allows users to choose one when
 * the game starts with no table loaded.
 */

import { TABLE_CONFIGS } from './table';
import type { TableConfig } from './types';

export interface TableInfo {
  key: string;
  name: string;
  bumperCount: number;
  targetCount: number;
  rampCount: number;
  difficulty: 'easy' | 'medium' | 'hard';
}

export class TableSelector {
  private modal: HTMLElement | null = null;
  private isVisible = false;
  private selectedCallback: ((tableKey: string) => void) | null = null;

  /**
   * Get available tables
   */
  getAvailableTables(): TableInfo[] {
    return [
      {
        key: 'pharaoh',
        name: 'Pharaoh\'s Gold',
        bumperCount: 3,
        targetCount: 3,
        rampCount: 2,
        difficulty: 'medium',
      },
      {
        key: 'dragon',
        name: 'Dragon\'s Castle',
        bumperCount: 5,
        targetCount: 4,
        rampCount: 3,
        difficulty: 'hard',
      },
      {
        key: 'knight',
        name: 'Knight\'s Quest',
        bumperCount: 2,
        targetCount: 3,
        rampCount: 1,
        difficulty: 'easy',
      },
      {
        key: 'cyber',
        name: 'Cyber Nexus',
        bumperCount: 5,
        targetCount: 4,
        rampCount: 2,
        difficulty: 'hard',
      },
      {
        key: 'neon',
        name: 'Neon City',
        bumperCount: 3,
        targetCount: 3,
        rampCount: 2,
        difficulty: 'medium',
      },
      {
        key: 'jungle',
        name: 'Jungle Expedition',
        bumperCount: 4,
        targetCount: 3,
        rampCount: 2,
        difficulty: 'medium',
      },
    ];
  }

  /**
   * Show table selection modal
   */
  show(callback: (tableKey: string) => void): void {
    this.selectedCallback = callback;

    if (!this.modal) {
      this.createModal();
    }

    if (this.modal) {
      this.modal.classList.remove('hidden');
      this.isVisible = true;
    }
  }

  /**
   * Hide table selection modal
   */
  hide(): void {
    if (this.modal) {
      this.modal.classList.add('hidden');
      this.isVisible = false;
    }
  }

  /**
   * Check if modal is visible
   */
  isOpen(): boolean {
    return this.isVisible;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Private methods
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Create modal DOM structure
   */
  private createModal(): void {
    this.modal = document.getElementById('table-selector-modal') || document.createElement('div');

    if (!this.modal.id) {
      this.modal.id = 'table-selector-modal';
      this.modal.className = 'table-selector-modal';
      this.modal.innerHTML = this.getModalHTML();
      document.body.appendChild(this.modal);
    }

    // Attach event listeners
    this.attachEventListeners();
  }

  /**
   * Get modal HTML structure
   */
  private getModalHTML(): string {
    const tables = this.getAvailableTables();

    const tableCards = tables.map(table => `
      <div class="table-card" data-table-key="${table.key}">
        <div class="table-card-header">
          <h3>${table.name}</h3>
          <span class="difficulty difficulty-${table.difficulty}">${table.difficulty.toUpperCase()}</span>
        </div>
        <div class="table-card-stats">
          <div class="stat">● ${table.bumperCount} Bumpers</div>
          <div class="stat">▪ ${table.targetCount} Targets</div>
          <div class="stat">╱ ${table.rampCount} Ramps</div>
        </div>
        <button class="table-card-btn">Select</button>
      </div>
    `).join('');

    return `
      <div class="table-selector-overlay">
        <div class="table-selector-container">
          <div class="table-selector-header">
            <h1>🎮 Choose a Table</h1>
            <p>Select a demo table to start playing</p>
          </div>

          <div class="table-selector-grid">
            ${tableCards}
          </div>

          <div class="table-selector-footer">
            <small>You can switch tables anytime from the editor menu</small>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Attach event listeners to modal
   */
  private attachEventListeners(): void {
    if (!this.modal) return;

    // Table card selection
    const tableCards = this.modal.querySelectorAll('.table-card');
    tableCards.forEach(card => {
      card.addEventListener('click', () => {
        const tableKey = (card as HTMLElement).dataset.tableKey;
        if (tableKey && this.selectedCallback) {
          this.selectedCallback(tableKey);
          this.hide();
        }
      });

      // Hover effect
      card.addEventListener('mouseenter', () => {
        card.classList.add('active');
      });

      card.addEventListener('mouseleave', () => {
        card.classList.remove('active');
      });
    });

    // Also handle button clicks
    const buttons = this.modal.querySelectorAll('.table-card-btn');
    buttons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const card = btn.closest('.table-card') as HTMLElement;
        if (card) {
          card.click();
        }
      });
    });
  }
}

/**
 * Global instance
 */
let tableSelectorInstance: TableSelector | null = null;

/**
 * Get or create table selector instance
 */
export function getTableSelector(): TableSelector {
  if (!tableSelectorInstance) {
    tableSelectorInstance = new TableSelector();
  }
  return tableSelectorInstance;
}

/**
 * Show table selector
 */
export function showTableSelector(callback: (tableKey: string) => void): void {
  getTableSelector().show(callback);
}

/**
 * Hide table selector
 */
export function hideTableSelector(): void {
  getTableSelector().hide();
}
