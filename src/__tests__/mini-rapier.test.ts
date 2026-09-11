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
});