// SPDX-License-Identifier: AGPL-3.0-or-later
// © 2026 Harald Weiss

import RAPIER from '@dimforge/rapier3d';
import { state } from './worker-state';

/**
 * Initialize the physics world in the worker.
 * Called once from main thread with initial configuration.
 */
export function initializePhysics(config: any): void {
  state.world = new RAPIER.World(state.gravity);
  state.eventQueue = new RAPIER.EventQueue(true);

  const ballDesc = RAPIER.RigidBodyDesc.dynamic()
    .setTranslation(config.ballInitialPos.x, config.ballInitialPos.y, 0.0)
    .setLinvel(0.0, 0.0, 0.0)
    .setGravityScale(1.0)
    .setCanSleep(false)
    .setLinearDamping(0.002)
    .setAngularDamping(0.1)
    .setCcdEnabled(true);

  state.ballBody = state.world.createRigidBody(ballDesc);

  state.world.createCollider(
    RAPIER.ColliderDesc.ball(0.22)
      .setRestitution(config.ballRestitution ?? 0.85)
      .setFriction(config.ballFriction ?? 0.25)
      .setDensity(0.15),  // Lighter ball = better flipper control
    state.ballBody
  );

  const flipperHalfLen = (config.flipperLength ?? 2.1) / 2;

  const lFlipperDesc = RAPIER.RigidBodyDesc.kinematicPositionBased()
    .setTranslation(config.leftFlipperPos.x, config.leftFlipperPos.y, 0.0);
  state.lFlipperBody = state.world.createRigidBody(lFlipperDesc);
  state.world.createCollider(
    RAPIER.ColliderDesc.cuboid(flipperHalfLen, 0.13, 0.1)
      .setTranslation(flipperHalfLen, 0.0, 0.0)
      .setRestitution(config.flipperRestitution ?? 0.95)
      .setFriction(config.flipperFriction ?? 0.6)
      .setDensity(2.0),  // Heavier flippers = more power to ball
    state.lFlipperBody
  );

  const rFlipperDesc = RAPIER.RigidBodyDesc.kinematicPositionBased()
    .setTranslation(config.rightFlipperPos.x, config.rightFlipperPos.y, 0.0);
  state.rFlipperBody = state.world.createRigidBody(rFlipperDesc);
  state.world.createCollider(
    RAPIER.ColliderDesc.cuboid(flipperHalfLen, 0.13, 0.1)
      .setTranslation(-flipperHalfLen, 0.0, 0.0)
      .setRestitution(config.flipperRestitution ?? 0.95)
      .setFriction(config.flipperFriction ?? 0.6)
      .setDensity(2.0),  // Heavier flippers = more power to ball
    state.rFlipperBody
  );

  if (config.tableBodies) {
    for (const bodyConfig of config.tableBodies) {
      const desc = RAPIER.RigidBodyDesc.fixed()
        .setTranslation(bodyConfig.x, bodyConfig.y, 0.0)
        .setRotation(bodyConfig.rotation ?? 0);

      const body = state.world.createRigidBody(desc);

      let colliderDesc: RAPIER.ColliderDesc;
      if (bodyConfig.type === 'box') {
        colliderDesc = RAPIER.ColliderDesc.cuboid(
          bodyConfig.width ?? 1,
          bodyConfig.height ?? 0.1,
          0.15
        );
      } else if (bodyConfig.type === 'circle') {
        colliderDesc = RAPIER.ColliderDesc.ball(bodyConfig.radius ?? 0.2);
      } else {
        colliderDesc = RAPIER.ColliderDesc.cuboid(1, 0.1, 0.1);
      }

      colliderDesc
        .setRestitution(bodyConfig.restitution ?? 0.8)
        .setFriction(bodyConfig.friction ?? 0.1)
        .setDensity(0.0);

      state.world.createCollider(colliderDesc, body);
      state.tableBodies.push(body);
    }
  }

  state.bumperMap = new Map(config.bumperMap ?? []);
  state.targetMap = new Map(config.targetMap ?? []);
  state.slingshotMap = new Map(config.slingshotMap ?? []);

  if (import.meta.env.DEV) { console.log('[Physics Worker] Initialized physics world'); }
}
