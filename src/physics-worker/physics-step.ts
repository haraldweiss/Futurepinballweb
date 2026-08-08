// SPDX-License-Identifier: AGPL-3.0-or-later
// © 2026 Harald Weiss

import { state } from './worker-state';
import type { PhysicsFrame, CollisionEvent } from './worker-types';

/**
 * Step the physics simulation by dt seconds.
 * Called every frame from main thread.
 */
export function stepPhysics(dt: number, substeps: number): PhysicsFrame {
  if (!state.world || !state.eventQueue || !state.ballBody) {
    return { ballPos: { x: 0, y: 0, z: 0 }, ballVel: { x: 0, y: 0 }, collisions: [] };
  }

  state.frameCount++;

  for (let i = 0; i < substeps; i++) {
    state.world.step(state.eventQueue);
  }

  const ballPos = state.ballBody.translation();
  const ballVel = state.ballBody.linvel();
  const ballAng = state.ballBody.angvel().z;

  const collisions: CollisionEvent[] = [];

  state.eventQueue.drainCollisionEvents((h1, h2, started) => {
    if (!started || !state.world) return;

    const ballHandle = state.ballBody!.collider(0).handle;
    let otherHandle = -1;

    if (h1 === ballHandle) {
      otherHandle = h2;
    } else if (h2 === ballHandle) {
      otherHandle = h1;
    }

    if (otherHandle < 0) return;

    let collisionType = 'unknown';
    let collisionData: any = { handle: otherHandle };

    if (otherHandle === state.lFlipperBody?.collider(0).handle) {
      collisionType = 'flipper_left';
    } else if (otherHandle === state.rFlipperBody?.collider(0).handle) {
      collisionType = 'flipper_right';
    } else {
      for (const [key, bumper] of state.bumperMap) {
        if (key === otherHandle) {
          collisionType = 'bumper';
          collisionData = { index: bumper.index, x: bumper.x, y: bumper.y };
          break;
        }
      }

      if (collisionType === 'unknown') {
        for (const [key, target] of state.targetMap) {
          if (key === otherHandle) {
            collisionType = 'target';
            collisionData = { index: target.index, x: target.x, y: target.y };
            break;
          }
        }
      }

      if (collisionType === 'unknown') {
        for (const [key, slingside] of state.slingshotMap) {
          if (key === otherHandle) {
            collisionType = 'slingshot';
            collisionData = { side: slingside };
            break;
          }
        }
      }

      if (collisionType === 'unknown') {
        for (const [key, gate] of state.gateMap) {
          if (key === otherHandle) {
            collisionType = 'gate';
            collisionData = { index: gate.index, x: gate.x, y: gate.y };
            break;
          }
        }
      }

      if (collisionType === 'unknown') {
        for (const [key, kicker] of state.kickerMap) {
          if (key === otherHandle) {
            collisionType = 'kicker';
            collisionData = { index: kicker.index, x: kicker.x, y: kicker.y };
            // Apply kick impulse: push ball away from kicker center
            if (state.ballBody) {
              const ballPos = state.ballBody.translation();
              const dx = ballPos.x - kicker.x;
              const dy = ballPos.y - kicker.y;
              const dist = Math.sqrt(dx * dx + dy * dy) || 1;
              const force = kicker.kickForce;
              state.ballBody.setLinvel(
                { x: (dx / dist) * force, y: (dy / dist) * force, z: 0 },
                true
              );
            }
            break;
          }
        }
      }

      if (collisionType === 'unknown') {
        for (const [key, spinner] of state.spinnerMap) {
          if (key === otherHandle) {
            collisionType = 'spinner';
            collisionData = { index: spinner.index, x: spinner.x, y: spinner.y };
            break;
          }
        }
      }

      if (collisionType === 'unknown') {
        for (const [key, trigger] of state.triggerMap) {
          if (key === otherHandle) {
            collisionType = 'trigger';
            collisionData = { index: trigger.index, x: trigger.x, y: trigger.y };
            break;
          }
        }
      }
    }

    collisions.push({
      type: collisionType,
      data: collisionData,
      time: state.frameCount,
    });
  });

  const result: PhysicsFrame = {
    ballPos: { x: ballPos.x, y: ballPos.y, z: 0.3 },
    ballVel: { x: ballVel.x, y: ballVel.y },
    ballAng,
    collisions,
    frameCount: state.frameCount,
  };

  state.lastPhysicsUpdate = performance.now();
  return result;
}
