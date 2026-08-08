// SPDX-License-Identifier: AGPL-3.0-or-later
// © 2026 Harald Weiss

import * as THREE from 'three';
import type { ParticleField } from './particle-field';

/**
 * Dependencies for game controls (flippers, plunger, multiball, nudge).
 * Extracted from main.ts to reduce entry-point complexity.
 */
export interface GameControlsDeps {
  // Game state (from ./game)
  state: any;
  physics: any;
  extraBalls: any[];
  bumpers: any[];
  keys: { left: boolean; right: boolean };
  // Three.js objects
  scene: THREE.Scene;
  leftFlipperGroup: THREE.Group;
  rightFlipperGroup: THREE.Group;
  plungerKnob: THREE.Mesh | null;
  // Module-level flags
  getFlippersDisabled: () => boolean;
  getLastLeftPressed: () => boolean;
  getLastRightPressed: () => boolean;
  setLastLeftPressed: (v: boolean) => void;
  setLastRightPressed: (v: boolean) => void;
  // Systems
  particleField: ParticleField;
  getCurrentFps: () => number;
  getPhysicsWorker: () => any;
  getSoundManager: () => Promise<any>;
  // DMD
  dmdEvent: (text: string) => void;
  dmdState: any;
  // UI callbacks
  showNotification: (msg: string) => void;
  updateHUD: () => void;
  // Audio
  playSound: (type: string) => void;
  // Multiball callbacks (from cb)
  onMultiballFlash: () => void;
  onBonusAnnouncement: (text: string) => void;
  onMultiballSound: () => void;
  // Video triggers
  onTiltVideo: () => void;
  onMultiballStartVideo: () => void;
  // Animation
  getAnimationBindingManager: () => any;
  getAnimationScheduler: () => any;
  getBamBridge: () => any;
  // Rapier (may be null in fallback)
  RAPIER: any;
}

export interface GameControls {
  updateFlippers(): void;
  updatePlunger(dt: number): void;
  nudgeTable(direction: number): void;
  launchMultiBall(): void;
  updateExtraBalls(dt: number): void;
}

export function createGameControls(deps: GameControlsDeps): GameControls {
  const {
    state, physics, extraBalls, bumpers, keys,
    scene, leftFlipperGroup, rightFlipperGroup, plungerKnob,
    getFlippersDisabled, getLastLeftPressed, getLastRightPressed,
    setLastLeftPressed, setLastRightPressed,
    particleField, getCurrentFps, getPhysicsWorker, getSoundManager,
    dmdEvent, dmdState, showNotification, updateHUD, playSound,
    onTiltVideo, onMultiballStartVideo,
    getAnimationBindingManager, getAnimationScheduler, getBamBridge,
    onMultiballFlash, onBonusAnnouncement, onMultiballSound,
    RAPIER,
  } = deps;

  // ─── Nudge Table ────────────────────────────────────────────────────────────
  function nudgeTable(direction: number): void {
    if (state.tiltActive || state.inLane) return;
    state.tiltWarnings++;
    if (state.tiltWarnings >= 3) {
      state.tiltActive = true;

      try {
        const bridge = getPhysicsWorker();
        bridge.updateBallPosition(state.ballPos.x, state.ballPos.y, direction * 1.5, -3.0);
      } catch { /* physics worker not ready */ }

      dmdEvent('TILT!!!'); showNotification('⚠️ TILT!'); playSound('drain');

      // ─── Phase 17+: Trigger tilt video ───
      onTiltVideo();

      setTimeout(() => { state.tiltActive = false; }, 100);
    } else {
      const force = 1.8 + state.tiltWarnings * 0.6;

      try {
        const bridge = getPhysicsWorker();
        const newVx = state.ballVel.x + direction * force;
        const newVy = state.ballVel.y + 0.5;
        bridge.updateBallPosition(state.ballPos.x, state.ballPos.y, newVx, newVy);
      } catch { /* physics worker not ready */ }

      dmdEvent(state.tiltWarnings === 2 ? 'TILT WARNING!!' : 'TILT WARNING!');
      particleField.spawn(state.ballPos.x, state.ballPos.y, 0xffaa00, 6, getCurrentFps());
    }
  }

  // ─── Multiball ──────────────────────────────────────────────────────────────
  function launchMultiBall(): void {
    if (extraBalls.length >= 2 || state.inLane) return;
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.22, 24, 24),
      new THREE.MeshStandardMaterial({ color: 0xffcc00, metalness: 1.0, roughness: 0.05, emissive: 0xff8800, emissiveIntensity: 0.4 })
    );
    mesh.add(new THREE.PointLight(0xffaa00, 1.8, 4));
    mesh.castShadow = true; scene.add(mesh);

    const startX = (Math.random() - 0.5) * 1.2, startY = 2.5 + Math.random();
    let rapierBody: any = null;
    if (physics && RAPIER) {
      rapierBody = physics.world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(startX, startY, 0.0).setLinearDamping(0.0).setAngularDamping(0.9).setCcdEnabled(true));
      physics.world.createCollider(RAPIER.ColliderDesc.ball(0.22).setRestitution(0.5).setFriction(0.3), rapierBody);
      rapierBody.setLinvel({ x: -3 + Math.random() * 6, y: 5 + Math.random() * 5, z: 0 }, true);
    }
    extraBalls.push({ pos: new THREE.Vector3(startX, startY, 0.5), vel: { x: 0, y: 0 }, mesh, rapierBody });

    // ─── Phase 2: Trigger multiball flash effect ───
    onMultiballFlash();
    onBonusAnnouncement('MULTIBALL!');
    onMultiballSound();

    dmdEvent('MULTIBALL!'); showNotification('🎱 MULTIBALL!'); particleField.spawn(0, 2, 0xffcc00, 30, getCurrentFps()); playSound('bumper');

    // ─── Phase 13: Trigger multiball launch animations ───
    const animationBindingManager = getAnimationBindingManager();
    const animationScheduler = getAnimationScheduler();
    const bamBridge = getBamBridge();
    if (animationBindingManager && animationScheduler && bamBridge) {
      const bindings = animationBindingManager.getBindingsFor('multiball', 'on_launch');
      bindings.forEach((binding: any) => {
        if (binding.autoPlay) {
          bamBridge.playAnimation(binding.sequenceId);
          animationBindingManager.markTriggered(binding.id);
        }
      });
    }

    // ─── Phase 17+: Trigger multiball video ───
    onMultiballStartVideo();
  }

  // ─── Extra Balls Update ─────────────────────────────────────────────────────
  function updateExtraBalls(dt: number): void {
    for (let i = extraBalls.length - 1; i >= 0; i--) {
      const b = extraBalls[i];
      if (b.rapierBody && physics) {
        const pos = b.rapierBody.translation(), vel = b.rapierBody.linvel();
        b.pos.x = pos.x; b.pos.y = pos.y; b.vel.x = vel.x; b.vel.y = vel.y;
        bumpers.forEach((bu: any) => {
          const dx = b.pos.x - bu.x, dy = b.pos.y - bu.y, d = Math.sqrt(dx * dx + dy * dy);
          if (d < 0.55 && d > 0.001) {
            const spd = Math.max(Math.hypot(vel.x, vel.y), 5.5) * 1.1;
            b.rapierBody!.setLinvel({ x: (dx / d) * spd, y: (dy / d) * spd, z: 0 }, true);
            state.score += 150 * state.multiplier; particleField.spawn(bu.x, bu.y, bu.mesh.userData.color, 8, getCurrentFps()); updateHUD();
          }
        });
        if (b.pos.y < -7.0) {
          physics.world.removeRigidBody(b.rapierBody); scene.remove(b.mesh); extraBalls.splice(i, 1);
          playSound('drain'); if (extraBalls.length === 0) dmdEvent('SINGLE BALL'); continue;
        }
      } else {
        b.vel.y -= 9.8 * dt; b.pos.x += b.vel.x * dt; b.pos.y += b.vel.y * dt;
        if (b.pos.x > 2.82) { b.pos.x = 2.82; b.vel.x *= -0.82; } if (b.pos.x < -2.82) { b.pos.x = -2.82; b.vel.x *= -0.82; }
        if (b.pos.y > 5.90) { b.pos.y = 5.90; b.vel.y *= -0.82; }
        if (b.pos.y < -7.0) { scene.remove(b.mesh); extraBalls.splice(i, 1); playSound('drain'); if (extraBalls.length === 0) dmdEvent('SINGLE BALL'); continue; }
      }
      b.mesh.position.set(b.pos.x, b.pos.y, 0.5);
      b.mesh.rotation.x += b.vel.y * dt * 0.6; b.mesh.rotation.z -= b.vel.x * dt * 0.6;
    }
  }

  // ─── Flipper Update ─────────────────────────────────────────────────────────
  function updateFlippers(): void {
    // Phase 1: Respect flippers-disabled state (TILT, script control)
    const effectiveLeft = getFlippersDisabled() ? false : keys.left;
    const effectiveRight = getFlippersDisabled() ? false : keys.right;
    // Phase 3: Enhanced flipper angles (35° active instead of 28° for better control)
    const lAngle = effectiveLeft ? THREE.MathUtils.degToRad(35) : THREE.MathUtils.degToRad(-28);
    const rAngle = effectiveRight ? THREE.MathUtils.degToRad(-35) : THREE.MathUtils.degToRad(28);
    leftFlipperGroup.rotation.z += (lAngle - leftFlipperGroup.rotation.z) * 0.35;
    rightFlipperGroup.rotation.z += (rAngle - rightFlipperGroup.rotation.z) * 0.35;

    // ─── Phase 25: Play flipper sound on activation ───
    if (effectiveLeft || effectiveRight) {
      getSoundManager().then((soundMgr) => {
        if (effectiveLeft && !getLastLeftPressed()) {
          soundMgr.playFlipperHit(0.8);
        }
        if (effectiveRight && !getLastRightPressed()) {
          soundMgr.playFlipperHit(0.8);
        }
      }).catch(() => {
        // Sound unavailable, continue silently
      });
      setLastLeftPressed(effectiveLeft);
      setLastRightPressed(effectiveRight);
    } else {
      setLastLeftPressed(false);
      setLastRightPressed(false);
    }

    // Phase 15: Update physics worker with flipper rotations
    try {
      const bridge = getPhysicsWorker();
      bridge.updateLeftFlipperRotation(leftFlipperGroup.rotation.z);
      bridge.updateRightFlipperRotation(rightFlipperGroup.rotation.z);
    } catch (e) {
      console.warn('[main] Flipper physics worker fallback:', (e || 'unknown'));
      // Fallback: Direct physics access (single-threaded)
      if (physics) {
        // Sync both position and rotation for kinematic bodies to prevent sticking
        const lPos = leftFlipperGroup.position;
        const rPos = rightFlipperGroup.position;
        physics.lFlipperBody.setNextKinematicTranslation({ x: lPos.x, y: lPos.y, z: 0 });
        physics.rFlipperBody.setNextKinematicTranslation({ x: rPos.x, y: rPos.y, z: 0 });
        physics.lFlipperBody.setNextKinematicRotation({ x: 0, y: 0, z: Math.sin(leftFlipperGroup.rotation.z / 2), w: Math.cos(leftFlipperGroup.rotation.z / 2) });
        physics.rFlipperBody.setNextKinematicRotation({ x: 0, y: 0, z: Math.sin(rightFlipperGroup.rotation.z / 2), w: Math.cos(rightFlipperGroup.rotation.z / 2) });
      }
    }

    const lFL = leftFlipperGroup.userData.flipperLight;
    const rFL = rightFlipperGroup.userData.flipperLight;
    if (lFL) lFL.intensity = keys.left ? 2.0 : 0.6;
    if (rFL) rFL.intensity = keys.right ? 2.0 : 0.6;
  }

  // ─── Plunger Update ─────────────────────────────────────────────────────────
  function updatePlunger(dt: number): void {
    if (!plungerKnob) return;
    if (state.inLane && state.plungerCharging) {
      state.plungerCharge = Math.min(1.0, state.plungerCharge + dt * 0.9);
      // Plunger group is at y=-6.3, so local y=0.8 gives world y=-5.5 (rest position)
      // When charging, move down relative to parent group
      plungerKnob.position.y = 0.8 - state.plungerCharge * 0.7;
      if (Math.floor(state.plungerCharge * 10) % 3 === 0) {
        const bars = '█'.repeat(Math.floor(state.plungerCharge * 8));
        dmdState.eventText = `POWER ${bars}`; dmdState.eventTimer = 3; dmdState.mode = 'event';
      }
    } else {
      // Return to rest position (local y=0.8) with smooth interpolation
      plungerKnob.position.y += (0.8 - plungerKnob.position.y) * 0.35;
      if (state.inLane) state.plungerCharge = 0;
    }
  }

  return { updateFlippers, updatePlunger, nudgeTable, launchMultiBall, updateExtraBalls };
}
