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

  const ballCollider = state.world.createCollider(
    RAPIER.ColliderDesc.ball(0.22)
      .setRestitution(config.ballRestitution ?? 0.85)
      .setFriction(config.ballFriction ?? 0.25)
      .setDensity(0.15),  // Lighter ball = better flipper control
    state.ballBody
  );
  state.colliderNames!.set('Ball', ballCollider.handle);
  state.allColliders!.push(ballCollider.handle);

  onProgress?.('Creating flippers...');
  const flipperHalfLen = (config.flipperLength ?? 2.1) / 2;

  const lFlipperDesc = RAPIER.RigidBodyDesc.kinematicPositionBased()
    .setTranslation(config.leftFlipperPos.x, config.leftFlipperPos.y, 0.0);
  state.lFlipperBody = state.world.createRigidBody(lFlipperDesc);
  const lFlipperCollider = state.world.createCollider(
    RAPIER.ColliderDesc.cuboid(flipperHalfLen, 0.13, 0.1)
      .setTranslation(flipperHalfLen, 0.0, 0.0)
      .setRestitution(config.flipperRestitution ?? 0.95)
      .setFriction(config.flipperFriction ?? 0.6)
      .setDensity(2.0),  // Heavier flippers = more power to ball
    state.lFlipperBody
  );
  state.colliderNames!.set('LeftFlipper', lFlipperCollider.handle);
  state.allColliders!.push(lFlipperCollider.handle);

  const rFlipperDesc = RAPIER.RigidBodyDesc.kinematicPositionBased()
    .setTranslation(config.rightFlipperPos.x, config.rightFlipperPos.y, 0.0);
  state.rFlipperBody = state.world.createRigidBody(rFlipperDesc);
  const rFlipperCollider = state.world.createCollider(
    RAPIER.ColliderDesc.cuboid(flipperHalfLen, 0.13, 0.1)
      .setTranslation(-flipperHalfLen, 0.0, 0.0)
      .setRestitution(config.flipperRestitution ?? 0.95)
      .setFriction(config.flipperFriction ?? 0.6)
      .setDensity(2.0),  // Heavier flippers = more power to ball
    state.rFlipperBody
  );
  state.colliderNames!.set('RightFlipper', rFlipperCollider.handle);
  state.allColliders!.push(rFlipperCollider.handle);

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
      state.colliderNames!.set(`Bumper${i + 1}`, collider.handle);
      state.allColliders!.push(collider.handle);
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
      state.colliderNames!.set(`Target${i + 1}`, collider.handle);
      state.allColliders!.push(collider.handle);
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
      const rampCollider = state.world!.createCollider(
        RAPIER.ColliderDesc.cuboid(len / 2, 0.07, 0.15)
          .setRestitution(rest).setFriction(fric),
        body
      );
      state.colliderNames!.set(`Ramp${i + 1}`, rampCollider.handle);
      state.allColliders!.push(rampCollider.handle);
    });

    // Slingshots werden bereits im tableBodies-Loop oben aus dem `side`-Feld
    // erkannt und in state.slingshotMap eingetragen.

    // Gates — thin walls (fixed, rotated box)
    onProgress?.(`Creating ${(tc.gates || []).length} gates...`);
    (tc.gates || []).forEach((g: any, i: number) => {
      const angle = g.angle ?? 0;
      const body = state.world!.createRigidBody(
        RAPIER.RigidBodyDesc.fixed().setTranslation(g.x, g.y, 0.0).setRotation({
          x: 0, y: 0, z: Math.sin(angle / 2), w: Math.cos(angle / 2),
        })
      );
      state.tableBodies.push(body);
      const collider = state.world!.createCollider(
        RAPIER.ColliderDesc.cuboid(0.05, 0.35, 0.15)
          .setRestitution(0.6).setFriction(0.1),
        body
      );
      state.gateMap.set(collider.handle, { x: g.x, y: g.y, index: i });
      state.colliderNames!.set(`Gate${i + 1}`, collider.handle);
      state.allColliders!.push(collider.handle);
    });

    // Kickers — high-restitution ball collider (kick impulse on contact)
    onProgress?.(`Creating ${(tc.kickers || []).length} kickers...`);
    (tc.kickers || []).forEach((k: any, i: number) => {
      const radius = k.radius ?? 0.25;
      const kickForce = k.kickForce ?? 8.0;
      const body = state.world!.createRigidBody(
        RAPIER.RigidBodyDesc.fixed().setTranslation(k.x, k.y, 0.0)
      );
      state.tableBodies.push(body);
      const collider = state.world!.createCollider(
        RAPIER.ColliderDesc.ball(radius)
          .setRestitution(1.2).setFriction(0.0)
          .setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS),
        body
      );
      state.kickerMap.set(collider.handle, { x: k.x, y: k.y, index: i, kickForce });
      state.colliderNames!.set(`Kicker${i + 1}`, collider.handle);
      state.allColliders!.push(collider.handle);
    });

    // Spinners — fixed circle collider (visual spin on hit)
    onProgress?.(`Creating ${(tc.spinners || []).length} spinners...`);
    (tc.spinners || []).forEach((s: any, i: number) => {
      const radius = s.radius ?? 0.3;
      const body = state.world!.createRigidBody(
        RAPIER.RigidBodyDesc.fixed().setTranslation(s.x, s.y, 0.0)
      );
      state.tableBodies.push(body);
      const collider = state.world!.createCollider(
        RAPIER.ColliderDesc.ball(radius)
          .setRestitution(0.7).setFriction(0.05)
          .setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS),
        body
      );
      state.spinnerMap.set(collider.handle, { x: s.x, y: s.y, index: i });
      state.colliderNames!.set(`Spinner${i + 1}`, collider.handle);
      state.allColliders!.push(collider.handle);
    });

    // Triggers — thin box sensor-like (event on ball overlap)
    onProgress?.(`Creating ${(tc.triggers || []).length} triggers...`);
    (tc.triggers || []).forEach((t: any, i: number) => {
      const w = t.width ?? 0.5;
      const h = t.height ?? 0.5;
      const body = state.world!.createRigidBody(
        RAPIER.RigidBodyDesc.fixed().setTranslation(t.x, t.y, 0.0)
      );
      state.tableBodies.push(body);
      const collider = state.world!.createCollider(
        RAPIER.ColliderDesc.cuboid(w / 2, h / 2, 0.15)
          .setRestitution(0.5).setFriction(0.1)
          .setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS),
        body
      );
      state.triggerMap.set(collider.handle, { x: t.x, y: t.y, index: i });
      state.colliderNames!.set(`Trigger${i + 1}`, collider.handle);
      state.allColliders!.push(collider.handle);
    });
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
  if (state.gateMap.size === 0 && config.gateMap) {
    state.gateMap = new Map(config.gateMap);
  }
  if (state.kickerMap.size === 0 && config.kickerMap) {
    state.kickerMap = new Map(config.kickerMap);
  }
  if (state.spinnerMap.size === 0 && config.spinnerMap) {
    state.spinnerMap = new Map(config.spinnerMap);
  }
  if (state.triggerMap.size === 0 && config.triggerMap) {
    state.triggerMap = new Map(config.triggerMap);
  }

  onProgress?.('Physics ready!');
  if (import.meta.env.DEV) { console.log('[Physics Worker] Initialized physics world'); }
}
