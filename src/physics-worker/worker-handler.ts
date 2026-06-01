// SPDX-License-Identifier: AGPL-3.0-or-later
// © 2026 Harald Weiss

import RAPIER from '@dimforge/rapier2d-compat';
import { state } from './worker-state';
import type { WorkerMessage } from './worker-types';
import { initializePhysics } from './physics-init';
import { stepPhysics } from './physics-step';
import {
  updateFlipperRotation,
  updateBallPosition,
  setBallGravityScale,
  disposePhysics,
} from './physics-bodies';

self.onmessage = async (event: MessageEvent<WorkerMessage>) => {
  const { type, ...params } = event.data;

  try {
    switch (type) {
      case 'init': {
        if (!state.rapierInitialized) {
          if (import.meta.env.DEV) { console.log('[Physics Worker] Initializing RAPIER...'); }
          await RAPIER.init();
          state.rapierInitialized = true;
          if (import.meta.env.DEV) { console.log('[Physics Worker] RAPIER initialized'); }
        }
        initializePhysics((params as any).config);
        self.postMessage({ type: 'ready' });
        break;
      }

      case 'step': {
        const { dt, substeps } = params as any;
        const result = stepPhysics(dt, substeps);
        self.postMessage({ type: 'frame', data: result });
        break;
      }

      case 'updateFlipper': {
        const { side, angle } = params as any;
        updateFlipperRotation(side, angle);
        break;
      }

      case 'updateBall': {
        const { x, y, vx, vy } = params as any;
        updateBallPosition(x, y, vx, vy);
        break;
      }

      case 'setBallGravity': {
        const { scale } = params as any;
        setBallGravityScale(scale);
        break;
      }

      case 'setWorldGravity': {
        const { x, y } = params as any;
        if (state.world) {
          state.world.gravity.x = x;
          state.world.gravity.y = y;
          if (import.meta.env.DEV) { console.log(`[Physics Worker] World gravity → (${x.toFixed(2)}, ${y.toFixed(2)})`); }
        }
        break;
      }

      case 'dispose': {
        disposePhysics();
        self.postMessage({ type: 'disposed' });
        break;
      }

      default:
        if (import.meta.env.DEV) { console.warn(`[Physics Worker] Unknown message type: ${type}`); }
    }
  } catch (error) {
    if (import.meta.env.DEV) { console.error('[Physics Worker] Error processing message:', error); }
    self.postMessage({ type: 'error', error: String(error) });
  }
};

self.postMessage({ type: 'worker-ready' });
if (import.meta.env.DEV) { console.log('[Physics Worker] Worker initialized and ready'); }
