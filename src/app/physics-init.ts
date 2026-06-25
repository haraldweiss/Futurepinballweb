/**
 * physics-init.ts — Rapier3D physics world initialization.
 *
 * Creates the physics world, ball, flippers, walls, slingshots, and guides.
 * Returns the handles needed by the collision event handler.
 *
 * Extracted from main.ts.
 */
export interface PhysicsInitResult {
  leftFlipperColliderHandle: number;
  rightFlipperColliderHandle: number;
}

/** Shared Rapier3D module reference (initialized once by initPhysics). */
export let RAPIER: any = null;

/**
 * Initialize the Rapier3D physics world.
 * @param setPhysics - Function to store the created physics state.
 * @returns The flipper collider handles needed by the collision handler.
 */
export async function initPhysics(
  setPhysics: (state: any) => void,
): Promise<PhysicsInitResult> {
  if (!RAPIER) RAPIER = await import('@dimforge/rapier3d').then(m => m.default);
  const world = new RAPIER.World({ x: 0.0, y: -9.8, z: 0.0 });
  const eventQueue = new RAPIER.EventQueue(true);

  const ballBody = world.createRigidBody(
    RAPIER.RigidBodyDesc.dynamic().setTranslation(2.55, -5.0, 0.0)
      .setGravityScale(0.0).setLinearDamping(0.0).setAngularDamping(0.9).setCcdEnabled(true)
  );
  const ballCollider = world.createCollider(
    RAPIER.ColliderDesc.ball(0.22).setRestitution(0.5).setFriction(0.3), ballBody
  );

  const lFlipperBody = world.createRigidBody(
    RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(-1.15, -4.6, 0.0).setCcdEnabled(true)
  );
  const lFlipperCollider = world.createCollider(
    RAPIER.ColliderDesc.cuboid(1.05, 0.13, 0.15).setTranslation(1.05, 0.0, 0.0)
      .setRestitution(0.5).setFriction(0.6), lFlipperBody
  );

  const rFlipperBody = world.createRigidBody(
    RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(1.15, -4.6, 0.0).setCcdEnabled(true)
  );
  const rFlipperCollider = world.createCollider(
    RAPIER.ColliderDesc.cuboid(1.05, 0.13, 0.15).setTranslation(-1.05, 0.0, 0.0)
      .setRestitution(0.5).setFriction(0.6), rFlipperBody
  );

  const addFixedBox = (x: number, y: number, hw: number, hh: number, angle = 0, restitution = 0.75) => {
    const body = world.createRigidBody(
      RAPIER.RigidBodyDesc.fixed().setTranslation(x, y, 0.0)
        .setRotation({ x: 0, y: 0, z: Math.sin(angle / 2), w: Math.cos(angle / 2) })
    );
    world.createCollider(RAPIER.ColliderDesc.cuboid(hw, hh, 0.15).setRestitution(restitution).setFriction(0.2), body);
    return body;
  };

  addFixedBox(-3.15, 0.0, 0.11, 6.25);
  addFixedBox(3.15, 0.0, 0.11, 6.25);
  addFixedBox(0.0, 6.15, 3.27, 0.11);
  addFixedBox(2.35, 5.68, 0.60, 0.08, Math.atan2(0.56, -1.40), 0.65);

  const slingshotMap = new Map<number, string>();
  const addSlingshot = (x: number, y: number, angle: number, side: string) => {
    const body = world.createRigidBody(
      RAPIER.RigidBodyDesc.fixed().setTranslation(x, y, 0.0)
        .setRotation({ x: 0, y: 0, z: Math.sin(angle / 2), w: Math.cos(angle / 2) })
    );
    const col = world.createCollider(
      RAPIER.ColliderDesc.cuboid(0.09, 0.65, 0.1).setRestitution(0.85).setFriction(0.1)
        .setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS),
      body
    );
    slingshotMap.set(col.handle, side);
  };
  addSlingshot(-2.0, -1.6, -0.3, 'left');
  addSlingshot(2.0, -1.6, 0.3, 'right');

  const addSeg = (x1: number, y1: number, x2: number, y2: number, res = 0.65) => {
    const cx = (x1 + x2) / 2, cy = (y1 + y2) / 2, dx = x2 - x1, dy = y2 - y1;
    addFixedBox(cx, cy, Math.sqrt(dx * dx + dy * dy) / 2, 0.07, Math.atan2(dy, dx), res);
  };
  addSeg(-1.9, -2.3, -1.15, -4.5);
  addSeg(1.9, -2.3, 1.15, -4.5);
  addSeg(-1.15, -4.85, -2.5, -6.2);
  addSeg(1.15, -4.85, 2.5, -6.2);

  setPhysics({
    world, ballBody, ballCollider, eventQueue,
    lFlipperBody, rFlipperBody,
    bumperMap: new Map(), targetMap: new Map(), slingshotMap, tableBodies: [],
  });

  return {
    leftFlipperColliderHandle: lFlipperCollider.handle,
    rightFlipperColliderHandle: rFlipperCollider.handle,
  };
}
