/**
 * physics-worker-setup.ts — Physics worker initialization after table build.
 *
 * Phase 2: Physics runs entirely in the worker.
 * No more buildPhysicsTable() on main thread — the worker creates
 * bumpers/targets/ramps directly from currentTableConfig.
 *
 * Extracted from main.ts.
 */
import { physics, currentTableConfig } from '../game';
import { initializePhysicsWorker } from '../physics-worker-bridge';
import { getDefaultPhysicsConfig, validatePhysicsConfig, logPhysicsConfig } from '../physics-config-enhancer';
import { getResponsiveFlipperX } from './responsive-helpers';
import { handlePhysicsFrame } from './physics-frame-handler';
import { setDevFlag } from '../window-api';
import { setLoadPhase, setWorkerDetail } from './loader-ui';
import type { PhysicsFrameData } from '../physics-worker-bridge';

/**
 * Initialize the physics worker with the current table configuration.
 * The worker builds all physics bodies (ball, flippers, walls, bumpers,
 * targets, ramps) from the table config — no duplicate build on main thread.
 */
export async function setupPhysicsWorker(): Promise<void> {
  setDevFlag('SETUP_WORKER_START', Date.now());
  try {
    setDevFlag('SETUP_WORKER_INIT_START', Date.now());
    const bridge = await initializePhysicsWorker();
    if (import.meta.env.DEV) {
      setDevFlag('SETUP_WORKER_INIT_OK', Date.now());
      setDevFlag('SETUP_WORKER_INIT_TIME',
        (window.debugWindow?.SETUP_WORKER_INIT_OK ?? 0) - (window.debugWindow?.SETUP_WORKER_INIT_START ?? 0));
    }

    if (physics) {
      setDevFlag('SETUP_WORKER_CONFIG_START', Date.now());

      // Phase 3: Forward worker progress to the loading overlay
      setLoadPhase('building-physics');
      bridge.setProgressCallback((detail: string) => {
        setWorkerDetail(detail);
      });

      const physicsConfig = getDefaultPhysicsConfig();
      const validation = validatePhysicsConfig(physicsConfig);
      if (!validation.valid) {
        console.warn('[Physics] Config validation errors:', validation.errors);
      }
      if (validation.warnings.length > 0) {
        console.warn('[Physics] Config warnings:', validation.warnings);
      }
      logPhysicsConfig(physicsConfig, 'Table Load');

      // Hardcoded walls + slingshots (structural, not from table config)
      // These define the physical enclosure of the playfield.
      // Slingshots carry a `side` field so the worker can build slingshotMap.
      const tableBodies = [
        // Perimeter walls
        { type: 'box', x: 0,     y: 6.3,  width: 3.3,  height: 0.2, restitution: 0.5, friction: 0.2 },
        { type: 'box', x: -3.15, y: 0,    width: 0.15, height: 7.0, restitution: 0.5, friction: 0.2 },
        { type: 'box', x: 3.15,  y: 0,    width: 0.15, height: 7.0, restitution: 0.5, friction: 0.2 },
        // Slingshots (side marks them for slingshotMap)
        { type: 'box', x: -2.2,  y: -1.5, width: 0.12, height: 0.9, rotation: -0.5,  restitution: 1.4, friction: 0.3, side: 'left' },
        { type: 'box', x:  2.2,  y: -1.5, width: 0.12, height: 0.9, rotation:  0.5,  restitution: 1.4, friction: 0.3, side: 'right' },
        // Drain lane walls
        { type: 'box', x: -1.15, y: -5.05, width: 0.1, height: 1.0, restitution: 0.5, friction: 0.2 },
        { type: 'box', x:  1.15, y: -5.05, width: 0.1, height: 1.0, restitution: 0.5, friction: 0.2 },
        // Drain bottom
        { type: 'box', x: 0,     y: -6.0, width: 3.2, height: 0.2, restitution: 0.3, friction: 0.1 },
        // Plunger lane walls
        { type: 'box', x: 2.10, y: -5.5, width: 0.08, height: 1.5, restitution: 0.5, friction: 0.3 },
        { type: 'box', x: 3.20, y: -5.5, width: 0.08, height: 1.5, restitution: 0.5, friction: 0.3 },
        // Plunger guide
        { type: 'box', x: 2.65, y: -7.0, width: 0.55, height: 0.12, restitution: 0.5, friction: 0.5 },
        // Inlane guide walls (below slingshots)
        { type: 'box', x: -1.55, y: -4.4, width: 0.35, height: 0.12, rotation: -0.35, restitution: 0.5, friction: 0.5 },
        { type: 'box', x:  1.55, y: -4.4, width: 0.35, height: 0.12, rotation:  0.35, restitution: 0.5, friction: 0.5 },
      ];

      bridge.initializePhysicsWorld({
        ballInitialPos: { x: 2.65, y: -5.2, z: 0 },
        ballRestitution: physicsConfig.ball.restitution,
        ballFriction: physicsConfig.ball.friction,
        leftFlipperPos: { x: -getResponsiveFlipperX(innerWidth / innerHeight), y: -4.6, z: 0 },
        rightFlipperPos: { x: getResponsiveFlipperX(innerWidth / innerHeight), y: -4.6, z: 0 },
        flipperLength: physicsConfig.flipper.length,
        flipperRestitution: physicsConfig.flipper.restitution,
        flipperFriction: physicsConfig.flipper.friction,
        tableBodies,
        // Bumper/target maps are empty — worker builds from tableConfig
        bumperMap: new Map(),
        targetMap: new Map(),
        // SlingshotMap sent as fallback (worker also populates from tableBodies side field)
        slingshotMap: physics.slingshotMap,
        // Send full table config so worker builds bumpers/targets/ramps
        tableConfig: currentTableConfig ?? undefined,
      });
      setDevFlag('SETUP_WORKER_CONFIG_OK', Date.now());

      if (import.meta.env.DEV) { setDevFlag('SETUP_WORKER_CALLBACK_START', Date.now()); }
      bridge.setFrameCallback((frame: PhysicsFrameData) => {
        handlePhysicsFrame(frame);
      });
      setDevFlag('SETUP_WORKER_CALLBACK_OK', Date.now());

      if (import.meta.env.DEV) {
        console.log('✓ Physics worker initialized and ready');
        setDevFlag('SETUP_WORKER_COMPLETE', true);
      }
    } else {
      setDevFlag('SETUP_WORKER_NO_PHYSICS', true);
    }
  } catch (error) {
    setDevFlag('SETUP_WORKER_ERROR', (error as Error).message);
    console.error('Failed to initialize physics worker:', error);
    console.warn('Falling back to single-threaded physics');
  }
  setDevFlag('SETUP_WORKER_END', Date.now());
}
