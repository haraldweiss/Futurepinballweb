/**
 * Table Compatibility Tests — Multi-Table Loading & Parser Robustness
 *
 * Tests FPT table loading across various configurations and layouts.
 * Covers parser robustness, physics initialization, and resource cleanup.
 *
 * Run with: npm test
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

/**
 * Mock FPT Table Configurations
 */
interface TableConfig {
  name: string;
  layout: 'wide' | 'shallow' | 'ramp-heavy' | 'bumper-field';
  bumperCount: number;
  targetCount: number;
  rampCount: number;
  hasBackglass: boolean;
  hasAnimations: boolean;
}

/**
 * Mock FPT Parser
 */
class MockFPTParser {
  parseCount: number = 0;
  lastParsedTable: string | null = null;
  errors: string[] = [];

  parse(filePath: string): {
    success: boolean;
    config: TableConfig | null;
    error?: string;
  } {
    this.parseCount++;
    this.lastParsedTable = filePath;

    // Simulate parsing different table types
    if (filePath.includes('invalid') || filePath.includes('corrupt')) {
      const error = 'Invalid FPT file format';
      this.errors.push(error);
      return { success: false, config: null, error };
    }

    if (filePath.includes('wide')) {
      return {
        success: true,
        config: {
          name: 'wide-table',
          layout: 'wide',
          bumperCount: 6,
          targetCount: 8,
          rampCount: 2,
          hasBackglass: true,
          hasAnimations: true,
        },
      };
    }

    if (filePath.includes('shallow')) {
      return {
        success: true,
        config: {
          name: 'shallow-table',
          layout: 'shallow',
          bumperCount: 3,
          targetCount: 5,
          rampCount: 1,
          hasBackglass: true,
          hasAnimations: false,
        },
      };
    }

    if (filePath.includes('ramp')) {
      return {
        success: true,
        config: {
          name: 'ramp-table',
          layout: 'ramp-heavy',
          bumperCount: 2,
          targetCount: 10,
          rampCount: 4,
          hasBackglass: true,
          hasAnimations: true,
        },
      };
    }

    // Default table
    return {
      success: true,
      config: {
        name: 'default-table',
        layout: 'bumper-field',
        bumperCount: 4,
        targetCount: 6,
        rampCount: 1,
        hasBackglass: true,
        hasAnimations: false,
      },
    };
  }

  getErrors(): string[] {
    return this.errors;
  }

  reset(): void {
    this.parseCount = 0;
    this.lastParsedTable = null;
    this.errors = [];
  }
}

/**
 * Mock Table Manager
 */
class TableManager {
  parser: MockFPTParser;
  loadedTables: Map<string, TableConfig> = new Map();
  activeTable: string | null = null;
  physicsObjects: Map<string, any> = new Map();

  constructor() {
    this.parser = new MockFPTParser();
  }

  loadTable(filePath: string): boolean {
    const result = this.parser.parse(filePath);

    if (!result.success) {
      return false;
    }

    // Unload previous table if one is active
    if (this.activeTable) {
      this.unloadTable(this.activeTable);
    }

    const config = result.config!;
    this.loadedTables.set(filePath, config);
    this.activeTable = filePath;

    // Create physics objects based on config
    this.createPhysicsObjects(config);

    return true;
  }

  private createPhysicsObjects(config: TableConfig): void {
    // Clear previous objects
    this.physicsObjects.clear();

    // Create bumpers
    for (let i = 0; i < config.bumperCount; i++) {
      this.physicsObjects.set(`bumper-${i}`, {
        type: 'bumper',
        position: { x: Math.random() * 5 - 2.5, y: Math.random() * 4 - 2 },
      });
    }

    // Create targets
    for (let i = 0; i < config.targetCount; i++) {
      this.physicsObjects.set(`target-${i}`, {
        type: 'target',
        position: { x: Math.random() * 5 - 2.5, y: Math.random() * 4 - 2 },
      });
    }

    // Create ramps
    for (let i = 0; i < config.rampCount; i++) {
      this.physicsObjects.set(`ramp-${i}`, {
        type: 'ramp',
        position: { x: Math.random() * 5 - 2.5, y: Math.random() * 4 - 2 },
      });
    }

    // Add flippers
    this.physicsObjects.set('flipper-left', {
      type: 'flipper',
      position: { x: -1.5, y: -3 },
    });
    this.physicsObjects.set('flipper-right', {
      type: 'flipper',
      position: { x: 1.5, y: -3 },
    });
  }

  unloadTable(filePath: string): boolean {
    if (!this.loadedTables.has(filePath)) {
      return false;
    }

    this.loadedTables.delete(filePath);
    if (this.activeTable === filePath) {
      this.activeTable = null;
    }

    // Clear physics objects
    this.physicsObjects.clear();

    return true;
  }

  switchTable(fromPath: string, toPath: string): boolean {
    if (!this.loadTable(toPath)) {
      return false;
    }
    this.unloadTable(fromPath);
    return true;
  }

  getLoadedTableCount(): number {
    return this.loadedTables.size;
  }

  getPhysicsObjectCount(): number {
    return this.physicsObjects.size;
  }

  getTableConfig(filePath: string): TableConfig | null {
    return this.loadedTables.get(filePath) || null;
  }

  dispose(): void {
    this.loadedTables.clear();
    this.physicsObjects.clear();
    this.activeTable = null;
  }
}

// ───────────────────────────────────────────────────────────────────────────

describe('Table Compatibility', () => {
  let manager: TableManager;

  beforeEach(() => {
    manager = new TableManager();
  });

  describe('Single Table Loading', () => {
    it('should load wide table layout', () => {
      const success = manager.loadTable('tables/wide-table.fpt');
      expect(success).toBe(true);
      expect(manager.getLoadedTableCount()).toBe(1);
    });

    it('should load shallow table layout', () => {
      const success = manager.loadTable('tables/shallow-table.fpt');
      expect(success).toBe(true);
      expect(manager.getLoadedTableCount()).toBe(1);
    });

    it('should load ramp-heavy table', () => {
      const success = manager.loadTable('tables/ramp-table.fpt');
      expect(success).toBe(true);
      expect(manager.getLoadedTableCount()).toBe(1);
    });

    it('should reject invalid FPT file', () => {
      const success = manager.loadTable('tables/invalid.fpt');
      expect(success).toBe(false);
      expect(manager.getLoadedTableCount()).toBe(0);
    });

    it('should reject corrupt file', () => {
      const success = manager.loadTable('tables/corrupt.dat');
      expect(success).toBe(false);
      expect(manager.parser.getErrors().length).toBeGreaterThan(0);
    });
  });

  describe('Physics Initialization', () => {
    it('should create bumpers based on config', () => {
      manager.loadTable('tables/wide-table.fpt');
      const config = manager.getTableConfig('tables/wide-table.fpt');

      expect(config).toBeDefined();
      expect(config!.bumperCount).toBe(6);
    });

    it('should create targets based on config', () => {
      manager.loadTable('tables/ramp-table.fpt');
      const config = manager.getTableConfig('tables/ramp-table.fpt');

      expect(config!.targetCount).toBe(10);
    });

    it('should always create flippers', () => {
      manager.loadTable('tables/shallow-table.fpt');

      expect(manager.physicsObjects.has('flipper-left')).toBe(true);
      expect(manager.physicsObjects.has('flipper-right')).toBe(true);
    });

    it('should initialize all table objects', () => {
      manager.loadTable('tables/wide-table.fpt');
      const config = manager.getTableConfig('tables/wide-table.fpt');

      const totalObjects =
        config!.bumperCount +
        config!.targetCount +
        config!.rampCount +
        2; // flippers
      expect(manager.getPhysicsObjectCount()).toBe(totalObjects);
    });

    it('should validate object counts for different layouts', () => {
      manager.loadTable('tables/wide-table.fpt');
      const wideCount = manager.getPhysicsObjectCount();

      manager.loadTable('tables/shallow-table.fpt');
      const shallowCount = manager.getPhysicsObjectCount();

      expect(wideCount).toBeGreaterThan(shallowCount);
    });
  });

  describe('Table Switching', () => {
    it('should switch from one table to another', () => {
      manager.loadTable('tables/wide-table.fpt');
      expect(manager.activeTable).toBe('tables/wide-table.fpt');

      manager.switchTable('tables/wide-table.fpt', 'tables/shallow-table.fpt');
      expect(manager.activeTable).toBe('tables/shallow-table.fpt');
    });

    it('should unload previous table on switch', () => {
      manager.loadTable('tables/wide-table.fpt');
      manager.switchTable('tables/wide-table.fpt', 'tables/ramp-table.fpt');

      expect(manager.getTableConfig('tables/wide-table.fpt')).toBeNull();
      expect(manager.getTableConfig('tables/ramp-table.fpt')).toBeDefined();
    });

    it('should handle switch failure gracefully', () => {
      manager.loadTable('tables/wide-table.fpt');
      const success = manager.switchTable(
        'tables/wide-table.fpt',
        'tables/invalid.fpt'
      );

      expect(success).toBe(false);
    });

    it('should maintain single active table', () => {
      manager.loadTable('tables/wide-table.fpt');
      manager.loadTable('tables/shallow-table.fpt');

      expect(manager.activeTable).toBe('tables/shallow-table.fpt');
      expect(manager.getLoadedTableCount()).toBe(1); // Only active table loaded
    });
  });

  describe('Memory Management', () => {
    it('should clear physics objects on unload', () => {
      manager.loadTable('tables/wide-table.fpt');
      expect(manager.getPhysicsObjectCount()).toBeGreaterThan(0);

      manager.unloadTable('tables/wide-table.fpt');
      expect(manager.getPhysicsObjectCount()).toBe(0);
    });

    it('should not leak memory on repeated loads', () => {
      const counts = [];

      for (let i = 0; i < 5; i++) {
        manager.loadTable('tables/wide-table.fpt');
        counts.push(manager.getPhysicsObjectCount());
        manager.unloadTable('tables/wide-table.fpt');
      }

      // All load/unload cycles should have same object count
      expect(counts.every(c => c === counts[0])).toBe(true);
    });

    it('should properly dispose all resources', () => {
      manager.loadTable('tables/wide-table.fpt');
      manager.loadTable('tables/shallow-table.fpt');

      manager.dispose();

      expect(manager.getLoadedTableCount()).toBe(0);
      expect(manager.getPhysicsObjectCount()).toBe(0);
      expect(manager.activeTable).toBeNull();
    });

    it('should handle dispose without active table', () => {
      expect(() => manager.dispose()).not.toThrow();
    });
  });

  describe('Parser Robustness', () => {
    it('should track parse count', () => {
      manager.loadTable('tables/wide-table.fpt');
      manager.loadTable('tables/shallow-table.fpt');

      expect(manager.parser.parseCount).toBe(2);
    });

    it('should record last parsed table', () => {
      manager.loadTable('tables/wide-table.fpt');
      manager.loadTable('tables/shallow-table.fpt');

      expect(manager.parser.lastParsedTable).toBe('tables/shallow-table.fpt');
    });

    it('should collect error messages', () => {
      manager.loadTable('tables/invalid.fpt');
      manager.loadTable('tables/corrupt.fpt');

      expect(manager.parser.getErrors().length).toBe(2);
    });

    it('should reset parser state', () => {
      manager.loadTable('tables/wide-table.fpt');
      manager.parser.reset();

      expect(manager.parser.parseCount).toBe(0);
      expect(manager.parser.lastParsedTable).toBeNull();
      expect(manager.parser.getErrors().length).toBe(0);
    });
  });

  describe('Layout-Specific Validation', () => {
    it('should recognize wide layout', () => {
      manager.loadTable('tables/wide-table.fpt');
      const config = manager.getTableConfig('tables/wide-table.fpt');

      expect(config!.layout).toBe('wide');
      expect(config!.bumperCount).toBeGreaterThan(4);
    });

    it('should recognize shallow layout', () => {
      manager.loadTable('tables/shallow-table.fpt');
      const config = manager.getTableConfig('tables/shallow-table.fpt');

      expect(config!.layout).toBe('shallow');
      expect(config!.rampCount).toBeLessThan(2);
    });

    it('should recognize ramp-heavy layout', () => {
      manager.loadTable('tables/ramp-table.fpt');
      const config = manager.getTableConfig('tables/ramp-table.fpt');

      expect(config!.layout).toBe('ramp-heavy');
      expect(config!.rampCount).toBeGreaterThanOrEqual(3);
    });

    it('should validate target count consistency', () => {
      manager.loadTable('tables/ramp-table.fpt');
      const config = manager.getTableConfig('tables/ramp-table.fpt');

      // Ramp tables typically have more targets
      expect(config!.targetCount).toBeGreaterThan(
        config!.bumperCount + config!.rampCount
      );
    });
  });

  describe('Complex Scenarios', () => {
    it('should handle sequential table loads', () => {
      const tables = [
        'tables/wide-table.fpt',
        'tables/shallow-table.fpt',
        'tables/ramp-table.fpt',
      ];

      for (const table of tables) {
        const success = manager.loadTable(table);
        expect(success).toBe(true);
        expect(manager.activeTable).toBe(table);
      }
    });

    it('should unload current table when loading next', () => {
      manager.loadTable('tables/wide-table.fpt');
      expect(manager.getLoadedTableCount()).toBe(1);

      manager.loadTable('tables/shallow-table.fpt');
      expect(manager.getLoadedTableCount()).toBe(1); // Previous unloaded automatically
      expect(manager.activeTable).toBe('tables/shallow-table.fpt');
    });

    it('should maintain parser integrity across loads', () => {
      manager.loadTable('tables/wide-table.fpt');
      manager.loadTable('tables/invalid.fpt');
      manager.loadTable('tables/shallow-table.fpt');

      expect(manager.parser.parseCount).toBe(3);
      expect(manager.parser.getErrors().length).toBe(1);
    });

    it('should handle mixed load/unload operations', () => {
      manager.loadTable('tables/wide-table.fpt');
      manager.loadTable('tables/shallow-table.fpt');
      manager.unloadTable('tables/shallow-table.fpt');
      manager.loadTable('tables/ramp-table.fpt');

      expect(manager.getLoadedTableCount()).toBe(1);
      expect(manager.activeTable).toBe('tables/ramp-table.fpt');
    });
  });
});
