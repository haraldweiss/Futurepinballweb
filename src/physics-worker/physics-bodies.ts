// SPDX-License-Identifier: AGPL-3.0-or-later
// © 2026 Harald Weiss

import { state } from './worker-state';

/**
 * Update flipper rotation (kinematic body).
 */
export function updateFlipperRotation(side: 'left' | 'right', angle: number): void {
  if (!state.world) return;

  const flipper = side === 'left' ? state.lFlipperBody : state.rFlipperBody;
  if (!flipper) return;

  const currentPos = flipper.translation();
  flipper.setNextKinematicRotation({ x: 0, y: 0, z: Math.sin(angle/2), w: Math.cos(angle/2) });
  flipper.setNextKinematicTranslation(currentPos);
}

/**
 * Update ball position (used when draining or plunging).
 */
export function updateBallPosition(x: number, y: number, vx: number = 0, vy: number = 0): void {
  if (!state.ballBody) return;

  state.ballBody.setTranslation({ x: x, y: y, z: 0 }, true);
  state.ballBody.setLinvel({ x: vx, y: vy, z: 0 }, true);
  state.ballBody.setAngvel({ x: 0, y: 0, z: 0 }, true);
}

/**
 * Set ball gravity scale (for in-lane detection).
 */
export function setBallGravityScale(scale: number): void {
  if (!state.ballBody) return;
  state.ballBody.setGravityScale(scale, true);
}

/**
 * Get ball velocity magnitude for diagnostics.
 */
export function getBallSpeed(): number {
  if (!state.ballBody) return 0;
  const vel = state.ballBody.linvel();
  return Math.hypot(vel.x, vel.y);
}

/**
 * Dispose and cleanup physics world.
 */
export function disposePhysics(): void {
  if (state.world) {
    state.world.free();
    state.world = null;
  }
  if (state.eventQueue) {
    state.eventQueue.free();
    state.eventQueue = null;
  }
  state.ballBody = null;
  state.lFlipperBody = null;
  state.rFlipperBody = null;
  state.bumperMap.clear();
  state.targetMap.clear();
  state.slingshotMap.clear();
  state.tableBodies = [];

  if (import.meta.env.DEV) { console.log('[Physics Worker] Physics world disposed'); }
}
