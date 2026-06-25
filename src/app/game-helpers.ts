/**
 * game-helpers.ts — Small game utility functions extracted from main.ts.
 *
 * All dependencies are module-level imports — no DI needed.
 * These are pure extractions of self-contained functions.
 */
import { state } from '../game';
import { dmdState } from '../dmd';
import { getPhysicsWorker } from '../physics-worker-bridge';

/**
 * Rotate the physics gravity vector to match visual rotation.
 * See: main.ts animate() — playgroundGroup.rotation.z drives visual rotation.
 */
export function applyPhysicsGravityForRotation(deg: 0 | 90 | 180 | 270): void {
  const G = 9.8;
  let gx = 0, gy = -G;
  switch (deg) {
    case 0:   gx = 0;   gy = -G; break;
    case 90:  gx = -G;  gy = 0;  break;
    case 180: gx = 0;   gy = G;  break;
    case 270: gx = G;   gy = 0;  break;
  }
  try {
    const bridge = getPhysicsWorker();
    bridge?.setWorldGravity?.(gx, gy);
  } catch (e) {
    console.warn('[gravity] physics worker not ready yet, will retry after table load:', (e as Error).message);
  }
}

// ─── DEBUG: DEV-Only helpers (tree-shaken in production) ─────────────────────

if (import.meta.env.DEV) {
  /** Set world gravity from DevTools console. */
  window.testGravity = (x: number, y: number) => {
    const bridge = getPhysicsWorker();
    if (!bridge) {
      console.warn('[testGravity] physics worker not ready');
      return;
    }
    bridge.setWorldGravity?.(x, y);
    console.log(`[testGravity] world gravity set to (${x}, ${y})`);
  };

  /** Force-set score for cross-window bridge testing. */
  window.forceScore = (n: number) => {
    state.score = n;
    state.ballNum = Math.max(1, state.ballNum);
    state.multiplier = Math.max(1, state.multiplier);
    if (dmdState.mode === 'attract') dmdState.mode = 'playing';
    console.log(`[forceScore] state.score = ${n}, dmdState.mode = ${dmdState.mode}`);
    console.log(`              expecting Backglass + DMD windows to show ${n} within 1 frame`);
  };

  /** Dump current state diagnostics to console. */
  window.dumpState = () => {
    const diag = window._msDiag || {};
    console.log('=== STATE DIAGNOSTICS ===');
    console.log(`state.score = ${state.score}`);
    console.log(`state.ballNum = ${state.ballNum}`);
    console.log(`state.multiplier = ${state.multiplier}`);
    console.log(`state.bumperHits = ${state.bumperHits}`);
    console.log(`dmdState.mode = ${dmdState.mode}`);
    console.log(`dmdState.animFrame = ${dmdState.animFrame}`);
    console.log(`outgoing total = ${diag.outgoing_total}, bc=${diag.outgoing_bc_ok}, ipc=${diag.outgoing_ipc_ok}, ls=${diag.outgoing_ls_ok}`);
    console.log(`bridge_present = ${diag.bridge_present}`);
    console.log(`ipc_error = ${diag.outgoing_ipc_error}`);
  };
}
