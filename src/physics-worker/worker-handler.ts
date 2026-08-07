// SPDX-License-Identifier: AGPL-3.0-or-later
// © 2026 Harald Weiss

import RAPIER from '@dimforge/rapier3d';
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

interface InitParams { config: any; }
interface StepParams { dt: number; substeps: number; }
interface UpdateFlipperParams { side: 'left' | 'right'; angle: number; }
interface UpdateBallParams { x: number; y: number; vx?: number; vy?: number; }
interface SetBallGravityParams { scale: number; }
interface SetWorldGravityParams { x: number; y: number; }
interface SetMaterialParams { objName: string; material: string; }
interface SetElasticityParams { value: number; }
interface SetFrictionParams { value: number; }

const MATERIAL_PRESETS: Record<string, { restitution: number; friction: number }> = {
  'rubber':    { restitution: 0.85, friction: 0.6 },
  'metal':     { restitution: 0.15, friction: 0.3 },
  'plastic':   { restitution: 0.55, friction: 0.4 },
  'wood':      { restitution: 0.40, friction: 0.5 },
  'default':   { restitution: 0.50, friction: 0.3 },
};

self.onmessage = async (event: MessageEvent<WorkerMessage>) => {
  const { type, ...params } = event.data;

  try {
    switch (type) {
      case 'init': {
        if (!state.rapierInitialized) {
          if (import.meta.env.DEV) { console.log('[Physics Worker] Initializing RAPIER...'); }
          state.rapierInitialized = true; // RAPIER3D auto-inits
          if (import.meta.env.DEV) { console.log('[Physics Worker] RAPIER initialized'); }
        }
        initializePhysics((params as InitParams).config, (detail: string) => {
          self.postMessage({ type: 'progress', detail });
        });
        self.postMessage({ type: 'ready' });
        break;
      }

      case 'step': {
        const { dt, substeps } = params as StepParams;
        const result = stepPhysics(dt, substeps);
        self.postMessage({ type: 'frame', data: result });
        break;
      }

      case 'updateFlipper': {
        const { side, angle } = params as UpdateFlipperParams;
        updateFlipperRotation(side, angle);
        break;
      }

      case 'updateBall': {
        const { x, y, vx, vy } = params as UpdateBallParams;
        updateBallPosition(x, y, vx, vy);
        break;
      }

      case 'setBallGravity': {
        const { scale } = params as SetBallGravityParams;
        setBallGravityScale(scale);
        break;
      }

      case 'setWorldGravity': {
        const { x, y } = params as SetWorldGravityParams;
        if (state.world) {
          state.world.gravity.x = x;
          state.world.gravity.y = y;
          if (import.meta.env.DEV) { console.log(`[Physics Worker] World gravity → (${x.toFixed(2)}, ${y.toFixed(2)})`); }
        }
        break;
      }

      case 'setMaterial': {
        const { objName, material } = params as SetMaterialParams;
        // Map material name to physics properties
        const matProps = MATERIAL_PRESETS[material] ?? MATERIAL_PRESETS['default'];
        if (state.world) {
          // Find collider by name and update its material
          const handle = state.colliderNames?.get(objName);
          if (handle !== undefined) {
            const collider = state.world.getCollider(handle);
            if (collider) {
              collider.setRestitution(matProps.restitution);
              collider.setFriction(matProps.friction);
              if (import.meta.env.DEV) {
                console.log(`[Physics Worker] Material '${material}' applied to '${objName}' (rest=${matProps.restitution}, fric=${matProps.friction})`);
              }
            }
          }
        }
        break;
      }

      case 'setElasticity': {
        const { value } = params as SetElasticityParams;
        if (state.world) {
          // Apply to all colliders
          if (state.allColliders) {
            for (const handle of state.allColliders) {
              const collider = state.world.getCollider(handle);
              if (collider) collider.setRestitution(value);
            }
          }
          if (import.meta.env.DEV) { console.log(`[Physics Worker] Global elasticity → ${value}`); }
        }
        break;
      }

      case 'setFriction': {
        const { value } = params as SetFrictionParams;
        if (state.world) {
          // Apply to all colliders
          if (state.allColliders) {
            for (const handle of state.allColliders) {
              const collider = state.world.getCollider(handle);
              if (collider) collider.setFriction(value);
            }
          }
          if (import.meta.env.DEV) { console.log(`[Physics Worker] Global friction → ${value}`); }
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
