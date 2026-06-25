/**
 * table-loader.ts — Table loading with physics worker integration.
 *
 * Orchestrates: buildTable → applyEnhancedVisuals → setupPhysicsWorker.
 * Returns a bound function with the original (cfg, scene, library?) signature
 * so all existing call sites work unchanged.
 *
 * Extracted from main.ts.
 */
import * as THREE from 'three';
import { buildTable } from '../table';
import { applyEnhancedVisualsToTable } from './enhanced-visuals';
import { setDevFlag } from '../window-api';

export interface TableLoaderDeps {
  /** THREE.Group for playground (supports cabinet rotation). */
  playgroundGroup: THREE.Group;
  /** Initialize the physics worker after building the table. */
  setupPhysicsWorker: () => Promise<void>;
}

export type LoadTableFn = (tableConfig: any, sceneTarget: THREE.Scene, library?: any) => Promise<void>;

/**
 * Create a bound loadTableWithPhysicsWorker function.
 * The returned function has the original signature used by all call sites.
 */
export function createTableLoader(deps: TableLoaderDeps): LoadTableFn {
  const { playgroundGroup, setupPhysicsWorker } = deps;

  return async (tableConfig, sceneTarget, library?) => {
    if (import.meta.env.DEV) {
      console.log('[loadTableWithPhysicsWorker] START');
      setDevFlag('BUILD_TABLE_START', Date.now());
      console.log('[loadTableWithPhysicsWorker] Building table...');
    }
    buildTable(tableConfig, sceneTarget, library, playgroundGroup);
    if (import.meta.env.DEV) {
      setDevFlag('BUILD_TABLE_OK', Date.now());
      setDevFlag('BUILD_TABLE_TIME_MS',
        (window.debugWindow?.BUILD_TABLE_OK ?? 0) - (window.debugWindow?.BUILD_TABLE_START ?? 0));
      console.log('[loadTableWithPhysicsWorker] Table built in',
        window.debugWindow?.BUILD_TABLE_TIME_MS, 'ms');
    }

    applyEnhancedVisualsToTable(sceneTarget);

    if (import.meta.env.DEV) {
      setDevFlag('PHYSICS_WORKER_START', Date.now());
      console.log('[loadTableWithPhysicsWorker] Setting up physics worker...');
    }
    try {
      await setupPhysicsWorker();
      if (import.meta.env.DEV) {
        setDevFlag('PHYSICS_WORKER_OK', Date.now());
        setDevFlag('PHYSICS_WORKER_TIME_MS',
          (window.debugWindow?.PHYSICS_WORKER_OK ?? 0) - (window.debugWindow?.PHYSICS_WORKER_START ?? 0));
        console.log('[loadTableWithPhysicsWorker] Physics worker setup OK in',
          window.debugWindow?.PHYSICS_WORKER_TIME_MS, 'ms');
        setDevFlag('LOAD_TABLE_COMPLETE', true);
      }
    } catch (error) {
      setDevFlag('PHYSICS_WORKER_ERROR', (error as Error)?.message ?? '');
      console.error('Physics worker setup failed:', error);
    }
    if (import.meta.env.DEV) { console.log('[loadTableWithPhysicsWorker] COMPLETE'); }
  };
}
