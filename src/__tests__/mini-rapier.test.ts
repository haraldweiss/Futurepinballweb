// SPDX-License-Identifier: AGPL-3.0-or-later
// © 2026 Harald Weiss
import { describe, it, expect } from 'vitest';
import RAPIER from '../physics/mini-rapier';

describe('mini-rapier physics engine (facade)', () => {
  it('creates a world, ball and wall and applies gravity', () => {
    const world = new RAPIER.World({ x: 0, y: -9.8, z: 0 });
    const ball = world.createRigidBody(
      RAPIER.RigidBodyDesc.dynamic().setTranslation(0, 0, 0).setCcdEnabled(true),
    );
    world.createCollider(RAPIER.ColliderDesc.ball(0.22).setRestitution(0.5).setFriction(0.3), ball);
    for (let i = 0; i < 60; i++) world.step();
    const pos = ball.translation();
    // After 1s of free fall from rest under 9.8 m/s²: ~4.4 units down
    expect(pos.y).toBeLessThan(-4.0);
    expect(pos.y).toBeGreaterThan(-5.5);
  });

  it('reflects the ball off a fixed wall', () => {
    const world = new RAPIER.World({ x: 0, y: 0, z: 0 });
    const ball = world.createRigidBody(
      RAPIER.RigidBodyDesc.dynamic().setTranslation(0, 0, 0).setCcdEnabled(true).setLinvel(10, 0),
    );
    world.createCollider(RAPIER.ColliderDesc.ball(0.22).setRestitution(1.0), ball);
    // Wall to the right
    const wall = world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(2.0, 0, 0));
    world.createCollider(RAPIER.ColliderDesc.cuboid(0.1, 1.0, 0.1).setRestitution(1.0), wall);
    // 120 substeps-free steps
    for (let i = 0; i < 150; i++) world.step();
    const vel = ball.linvel();
    // Should now be moving left (away from wall)
    expect(vel.x).toBeLessThan(0);
  });

  it('emits collision start and end events', () => {
    const world = new RAPIER.World({ x: 0, y: 0, z: 0 });
    const eq = new RAPIER.EventQueue(true);
    const ball = world.createRigidBody(
      RAPIER.RigidBodyDesc.dynamic().setTranslation(0, 0, 0).setCcdEnabled(true).setLinvel(2, 0),
    );
    world.createCollider(
      RAPIER.ColliderDesc.ball(0.22).setRestitution(0.5)
        .setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS),
      ball,
    );
    const wall = world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(0.6, 0, 0));
    world.createCollider(RAPIER.ColliderDesc.cuboid(0.1, 1.0, 0.1), wall);

    const events: boolean[] = [];
    for (let i = 0; i < 300; i++) {
      world.step(eq);
      eq.drainCollisionEvents((_h1, _h2, started) => events.push(started));
    }
    expect(events.length).toBeGreaterThan(0);
    expect(events[0]).toBe(true);
    expect(events.some((e) => e === false)).toBe(true); // stop event fired later
  });

  it('kinematic body moving via setNextKinematicTranslation pushes the ball', () => {
    const world = new RAPIER.World({ x: 0, y: 0, z: 0 });
    // Ball at rest at the origin
    const ball = world.createRigidBody(
      RAPIER.RigidBodyDesc.dynamic().setTranslation(0.0, 0.0, 0).setCcdEnabled(true),
    );
    world.createCollider(RAPIER.ColliderDesc.ball(0.22).setRestitution(0.9).setFriction(0.4), ball);

    // A kinematic block pushes the ball from the left (+x), driven each step
    const pusher = world.createRigidBody(
      RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(-0.8, 0, 0),
    );
    world.createCollider(
      RAPIER.ColliderDesc.cuboid(0.3, 0.5, 0.1).setRestitution(0.9).setFriction(0.4),
      pusher,
    );
    for (let i = 0; i < 30; i++) {
      pusher.setNextKinematicTranslation({ x: -0.8 + i * 0.1, y: 0, z: 0 });
      world.step();
    }
    const v = ball.linvel();
    expect(Math.hypot(v.x, v.y)).toBeGreaterThan(1.0);
    expect(v.x).toBeGreaterThan(0); // pushed to the right
  });

  it('ball hitting a bumper bounces back with high restitution', () => {
    const world = new RAPIER.World({ x: 0, y: 0, z: 0 });
    const ball = world.createRigidBody(
      RAPIER.RigidBodyDesc.dynamic().setTranslation(0, 0, 0).setCcdEnabled(true).setLinvel(5, 0),
    );
    world.createCollider(RAPIER.ColliderDesc.ball(0.22).setRestitution(0.5).setFriction(0.0), ball);
    const bumper = world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(1.0, 0, 0));
    world.createCollider(RAPIER.ColliderDesc.ball(0.42).setRestitution(0.7).setFriction(0.0), bumper);

    for (let i = 0; i < 120; i++) world.step();
    const vel = ball.linvel();
    expect(vel.x).toBeLessThan(0); // bounced back to the left
  });

  it('updateBallPosition-like setTranslation + setLinvel works', () => {
    const world = new RAPIER.World({ x: 0, y: -9.8, z: 0 });
    const ball = world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(0, 0, 0).setCcdEnabled(true));
    world.createCollider(RAPIER.ColliderDesc.ball(0.22), ball);
    ball.setTranslation({ x: 2, y: 3, z: 0 }, true);
    ball.setLinvel({ x: 1, y: 2, z: 0 }, true);
    expect(ball.translation()).toMatchObject({ x: 2, y: 3, z: 0 });
    expect(ball.linvel()).toMatchObject({ x: 1, y: 2 });
  });

  /**
   * Regression: without a restitution velocity threshold the ball re-entered
   * contact on every step (gravity adds ~0.163 units/s per step) and rebounded
   * at ~0.43× that increment forever — it never came to rest. That is the
   * micro-jitter / "ball never settles" symptom.
   */
  it('a ball resting on a floor settles instead of bouncing forever', () => {
    const world = new RAPIER.World({ x: 0, y: -9.8, z: 0 });
    // Ball at rest exactly touching the floor top surface (y = -0.5).
    const ball = world.createRigidBody(
      RAPIER.RigidBodyDesc.dynamic().setTranslation(0, -0.28, 0).setCanSleep(false),
    );
    world.createCollider(
      RAPIER.ColliderDesc.ball(0.22).setRestitution(0.85).setFriction(0.25).setDensity(0.15),
      ball,
    );
    const floor = world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(0, -1, 0));
    world.createCollider(RAPIER.ColliderDesc.cuboid(5, 0.5, 0.5), floor);

    for (let i = 0; i < 300; i++) world.step();

    const vel = ball.linvel();
    const pos = ball.translation();
    // Settled: no residual bounce velocity, still resting on the surface.
    expect(Math.hypot(vel.x, vel.y)).toBeLessThan(0.05);
    expect(pos.y).toBeGreaterThan(-0.35);
    expect(pos.y).toBeLessThan(-0.2);
  });

  /** Guard: real impacts stay elastic — the threshold must not soften them. */
  it('a fast impact keeps full restitution (threshold only affects slow contacts)', () => {
    const world = new RAPIER.World({ x: 0, y: 0, z: 0 });
    const ball = world.createRigidBody(
      RAPIER.RigidBodyDesc.dynamic().setTranslation(0, 0, 0).setLinvel(8, 0),
    );
    world.createCollider(RAPIER.ColliderDesc.ball(0.22).setRestitution(0.9).setFriction(0.0), ball);
    const wall = world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(1.0, 0, 0));
    world.createCollider(RAPIER.ColliderDesc.cuboid(0.1, 2.0, 0.1).setRestitution(0.9), wall);

    // Capture the speed just before and just after the bounce.
    let beforeImpact = 8;
    let afterImpact = 0;
    for (let i = 0; i < 60; i++) {
      const vx = ball.linvel().x;
      if (vx > 0) beforeImpact = vx;
      else { afterImpact = vx; break; }
      world.step();
    }
    // Combined restitution 0.9 → rebounds with ~90% of the approach speed.
    expect(afterImpact).toBeLessThan(0);
    expect(Math.abs(afterImpact)).toBeGreaterThan(beforeImpact * 0.75);
  });

  /**
   * Regression: unclamped positional correction resolved a deep overlap in a
   * single step — measured, a ball 0.37 units inside a wall snapped 0.354
   * units (≈1.6 ball radii) in one 1/60 s step, a visible teleport. The cap
   * spreads the resolution over several steps.
   */
  it('resolves a deep overlap over several steps instead of teleporting', () => {
    const world = new RAPIER.World({ x: 0, y: 0, z: 0 });
    // Ball centre 0.85 with a wall spanning x ∈ [-1, 1] → penetration 0.37.
    const ball = world.createRigidBody(
      RAPIER.RigidBodyDesc.dynamic().setTranslation(0.85, 0, 0),
    );
    world.createCollider(
      RAPIER.ColliderDesc.ball(0.22).setRestitution(0.5).setDensity(0.15), ball,
    );
    const wall = world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(0, 0, 0));
    world.createCollider(RAPIER.ColliderDesc.cuboid(1.0, 2.0, 0.5), wall);

    let maxStepJump = 0;
    let prev = ball.translation().x;
    for (let i = 0; i < 8; i++) {
      world.step();
      const x = ball.translation().x;
      maxStepJump = Math.max(maxStepJump, Math.abs(x - prev));
      prev = x;
    }
    // No single step may move the ball more than the correction cap (+ slop).
    expect(maxStepJump).toBeLessThanOrEqual(0.25);
    // …and it must still end up fully outside the wall (surface at x = 1.22).
    expect(ball.translation().x).toBeGreaterThan(1.15);
  });

  it('a ball resting on the floor stays settled for many seconds', () => {
    const world = new RAPIER.World({ x: 0, y: -9.8, z: 0 });
    const ball = world.createRigidBody(
      RAPIER.RigidBodyDesc.dynamic().setTranslation(0, -0.28, 0),
    );
    world.createCollider(
      RAPIER.ColliderDesc.ball(0.22).setRestitution(0.85).setFriction(0.25).setDensity(0.15),
      ball,
    );
    const floor = world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(0, -1, 0));
    world.createCollider(RAPIER.ColliderDesc.cuboid(5, 0.5, 0.5), floor);

    for (let i = 0; i < 600; i++) world.step(); // 10 s of simulation
    // Measured: y stays at exactly -0.28111 with v = 0 — no drift, no jitter.
    expect(Math.abs(ball.translation().y - -0.28111)).toBeLessThan(0.001);
    expect(Math.hypot(ball.linvel().x, ball.linvel().y)).toBeLessThan(0.001);
  });
});
