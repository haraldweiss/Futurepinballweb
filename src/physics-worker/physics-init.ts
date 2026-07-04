// SPDX-License-Identifier: AGPL-3.0-or-later
// © 2026 Harald Weiss

import RAPIER from '@dimforge/rapier3d';
import { state } from './worker-state';

/**
 * Initialize the physics world in the worker.
 * Called once from main thread with initial configuration.
 * @param config - Configuration object
 * @param onProgress - Optional callback for progress updates
 */
export function initializePhysics(
  config: any,
  onProgress?: (detail: string) => void,
): void {
  state.world = new RAPIER.World(state.gravity);
  state.eventQueue = new RAPIER.EventQueue(true);

  onProgress?.('Creating ball...');
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

  onProgress?.('Creating flippers...');
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

  onProgress?.('Building walls...');
  let wallCount = 0;

  if (config.tableBodies) {
    const totalWalls = config.tableBodies.length;
    for (const bodyConfig of config.tableBodies) {
      wallCount++;
      if (wallCount % 3 === 0) onProgress?.(`Walls: ${wallCount}/${totalWalls}`);
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

      // Enable collision events for slingshots so they appear in drainCollisionEvents
      if (bodyConfig.side) {
        colliderDesc.setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS);
      }

      const collider = state.world.createCollider(colliderDesc, body);
      state.tableBodies.push(body);

      // If the body has a `side` field, it's a slingshot — record it
      if (bodyConfig.side) {
        state.slingshotMap.set(collider.handle, bodyConfig.side);
      }
    }
  }

  // ─── Build bumpers/targets/ramps from table config (Phase 2) ───
  // Falls tableConfig übergeben wird, baut der Worker die Elemente
  // direkt statt serialisierte Maps vom Main Thread zu empfangen.
  // Dadurch entfällt buildPhysicsTable() im Main Thread.
  // Hinweis: state.slingshotMap wird NICHT gecleart — sie wurde bereits
  // im tableBodies-Loop oben aus dem `side`-Feld befüllt.
  state.bumperMap.clear();
  state.targetMap.clear();

  const tc = config.tableConfig;
  if (tc) {
    const physCfg = tc.physics ?? {};
    const elemPhys = tc.elementPhysics ?? {};
    const bumperRest = physCfg.bumperRestitution ?? 0.7;
    const bumperFric = physCfg.bumperFriction ?? 0.0;
    const targetRest = physCfg.targetRestitution ?? 0.7;
    const targetFric = physCfg.targetFriction ?? 0.2;
    const rampRest = physCfg.rampRestitution ?? 0.8;
    const rampFric = physCfg.rampFriction ?? 0.25;

    // Bumpers
    onProgress?.(`Creating ${(tc.bumpers || []).length} bumpers...`);
    (tc.bumpers || []).forEach((b: any, i: number) => {
      const body = state.world!.createRigidBody(
        RAPIER.RigidBodyDesc.fixed().setTranslation(b.x, b.y, 0.0)
      );
      state.tableBodies.push(body);
      const elemOvr = elemPhys.bumpers?.[i] ?? {};
      const rest = elemOvr.restitution ?? bumperRest;
      const fric = elemOvr.friction ?? bumperFric;
      const sizeScale = b.size ?? 1.0;
      const collider = state.world!.createCollider(
        RAPIER.ColliderDesc.ball(0.42 * sizeScale)
          .setRestitution(rest).setFriction(fric)
          .setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS),
        body
      );
      state.bumperMap.set(collider.handle, { x: b.x, y: b.y, index: i });
    });

    // Targets
    onProgress?.(`Creating ${(tc.targets || []).length} targets...`);
    (tc.targets || []).forEach((t: any, i: number) => {
      const body = state.world!.createRigidBody(
        RAPIER.RigidBodyDesc.fixed().setTranslation(t.x, t.y, 0.0)
      );
      state.tableBodies.push(body);
      const elemOvr = elemPhys.targets?.[i] ?? {};
      const rest = elemOvr.restitution ?? targetRest;
      const fric = elemOvr.friction ?? targetFric;
      const collider = state.world!.createCollider(
        RAPIER.ColliderDesc.cuboid(0.28, 0.21, 0.15)
          .setRestitution(rest).setFriction(fric)
          .setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS),
        body
      );
      state.targetMap.set(collider.handle, { x: t.x, y: t.y, index: i });
    });

    // Ramps
    onProgress?.(`Creating ${(tc.ramps || []).length} ramps...`);
    (tc.ramps || []).forEach((r: any, i: number) => {
      const cx = (r.x1 + r.x2) / 2, cy = (r.y1 + r.y2) / 2;
      const dx = r.x2 - r.x1, dy = r.y2 - r.y1;
      const len = Math.sqrt(dx * dx + dy * dy);
      const elemOvr = elemPhys.ramps?.[i] ?? {};
      const rest = elemOvr.restitution ?? rampRest;
      const fric = elemOvr.friction ?? rampFric;
      const body = state.world!.createRigidBody(
        RAPIER.RigidBodyDesc.fixed()
          .setTranslation(cx, cy, 0.0)
          .setRotation({
            x: 0, y: 0,
            z: Math.sin(Math.atan2(dy, dx) / 2),
            w: Math.cos(Math.atan2(dy, dx) / 2),
          })
      );
      state.tableBodies.push(body);
      state.world!.createCollider(
        RAPIER.ColliderDesc.cuboid(len / 2, 0.07, 0.15)
          .setRestitution(rest).setFriction(fric),
        body
      );
    });

    // Slingshots werden bereits im tableBodies-Loop oben aus dem `side`-Feld
    // erkannt und in state.slingshotMap eingetragen.
  }

  // Falls keine tableConfig, fallback zu serialisierten Maps (Legacy)
  if (state.bumperMap.size === 0 && config.bumperMap) {
    state.bumperMap = new Map(config.bumperMap);
  }
  if (state.targetMap.size === 0 && config.targetMap) {
    state.targetMap = new Map(config.targetMap);
  }
  if (state.slingshotMap.size === 0 && config.slingshotMap) {
    state.slingshotMap = new Map(config.slingshotMap);
  }

  onProgress?.('Physics ready!');
  if (import.meta.env.DEV) { console.log('[Physics Worker] Initialized physics world'); }
}
