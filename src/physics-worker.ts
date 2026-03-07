/**
 * physics-worker.ts — Physics simulation worker thread
 * Runs Rapier2D physics on a separate CPU core for non-blocking simulation
 *
 * Phase 15: Physics Worker System
 * Offloads physics calculations to prevent main-thread blocking
 * Expected 30-40% FPS improvement on multi-core devices
 */

import RAPIER from '@dimforge/rapier2d-compat';

// ─── Worker State ───────────────────────────────────────────────────────────

let world: RAPIER.World | null = null;
let eventQueue: RAPIER.EventQueue | null = null;

// Physics bodies
let ballBody: RAPIER.RigidBody | null = null;
let lFlipperBody: RAPIER.RigidBody | null = null;
let rFlipperBody: RAPIER.RigidBody | null = null;

// Maps for collision detection
let bumperMap: Map<number, { x: number; y: number; index: number }> = new Map();
let targetMap: Map<number, { x: number; y: number; index: number }> = new Map();
let slingshotMap: Map<number, string> = new Map();
let tableBodies: RAPIER.RigidBody[] = [];

// Physics state
let gravity = { x: 0, y: -9.8 };
let frameCount = 0;
let lastPhysicsUpdate = 0;

/**
 * Initialize the physics world in the worker.
 * Called once from main thread with initial configuration.
 */
function initializePhysics(config: any): void {
  // Reset table bodies array for fresh initialization (prevents stale body accumulation on reload)
  tableBodies = [];

  // Create world
  world = new RAPIER.World(gravity);
  eventQueue = new RAPIER.EventQueue(true);

  // Create ball
  const ballDesc = RAPIER.RigidBodyDesc.dynamic()
    .setTranslation(config.ballInitialPos.x, config.ballInitialPos.y)
    .setLinvel(0, 0)
    .setGravityScale(1.0, true)
    .setCanSleep(false)
    .setLinearDamping(0.002)
    .setAngularDamping(0.1);

  ballBody = world.createRigidBody(ballDesc);

  const ballCollider = world.createCollider(
    RAPIER.ColliderDesc.ball(0.22)
      .setRestitution(config.ballRestitution ?? 0.5)
      .setFriction(config.ballFriction ?? 0.3)
      .setDensity(1.0),
    ballBody
  );

  // Create flippers
  const lFlipperDesc = RAPIER.RigidBodyDesc.kinematicPositionBased()
    .setTranslation(config.leftFlipperPos.x, config.leftFlipperPos.y)
    .setRotation(0);

  lFlipperBody = world.createRigidBody(lFlipperDesc);
  world.createCollider(
    RAPIER.ColliderDesc.capsule(config.flipperLength ?? 2.1, 0.08)
      .setRestitution(config.flipperRestitution ?? 0.5)
      .setFriction(config.flipperFriction ?? 0.6)
      .setDensity(0.5)
      .setRotation(0),
    lFlipperBody
  );

  const rFlipperDesc = RAPIER.RigidBodyDesc.kinematicPositionBased()
    .setTranslation(config.rightFlipperPos.x, config.rightFlipperPos.y)
    .setRotation(0);

  rFlipperBody = world.createRigidBody(rFlipperDesc);
  world.createCollider(
    RAPIER.ColliderDesc.capsule(config.flipperLength ?? 2.1, 0.08)
      .setRestitution(config.flipperRestitution ?? 0.5)
      .setFriction(config.flipperFriction ?? 0.6)
      .setDensity(0.5)
      .setRotation(Math.PI),
    rFlipperBody
  );

  // Create table bodies (walls, ramps, etc.)
  if (config.tableBodies) {
    for (const bodyConfig of config.tableBodies) {
      const desc = RAPIER.RigidBodyDesc.fixed()
        .setTranslation(bodyConfig.x, bodyConfig.y)
        .setRotation(bodyConfig.rotation ?? 0);

      const body = world.createRigidBody(desc);

      let colliderDesc: RAPIER.ColliderDesc;
      if (bodyConfig.type === 'box') {
        colliderDesc = RAPIER.ColliderDesc.cuboid(
          bodyConfig.width ?? 1,
          bodyConfig.height ?? 0.1
        );
      } else if (bodyConfig.type === 'circle') {
        colliderDesc = RAPIER.ColliderDesc.ball(bodyConfig.radius ?? 0.2);
      } else {
        colliderDesc = RAPIER.ColliderDesc.cuboid(1, 0.1);
      }

      colliderDesc
        .setRestitution(bodyConfig.restitution ?? 0.8)
        .setFriction(bodyConfig.friction ?? 0.1)
        .setDensity(0.0);

      world.createCollider(colliderDesc, body);
      tableBodies.push(body);
    }
  }

  // Store collision maps for later reference
  bumperMap = new Map(config.bumperMap ?? []);
  targetMap = new Map(config.targetMap ?? []);
  slingshotMap = new Map(config.slingshotMap ?? []);

  console.log('[Physics Worker] Initialized physics world');
}

/**
 * Step the physics simulation by dt seconds.
 * Called every frame from main thread.
 */
function stepPhysics(dt: number, substeps: number): PhysicsFrame {
  if (!world || !eventQueue || !ballBody) {
    return { ballPos: { x: 0, y: 0 }, ballVel: { x: 0, y: 0 }, collisions: [] };
  }

  frameCount++;

  // Step physics multiple times for accuracy
  for (let i = 0; i < substeps; i++) {
    world.step(eventQueue);
  }

  // Extract ball state
  const ballPos = ballBody.translation();
  const ballVel = ballBody.linvel();
  const ballAng = ballBody.angvel();

  // Collect collision events
  const collisions: CollisionEvent[] = [];

  eventQueue.drainCollisionEvents((h1, h2, started) => {
    if (!started || !world) return;

    const ballHandle = ballBody!.collider(0).handle;
    let otherHandle = -1;

    if (h1 === ballHandle) {
      otherHandle = h2;
    } else if (h2 === ballHandle) {
      otherHandle = h1;
    }

    if (otherHandle < 0) return;

    // Identify collision type
    let collisionType = 'unknown';
    let collisionData: any = { handle: otherHandle };

    if (otherHandle === lFlipperBody?.collider(0).handle) {
      collisionType = 'flipper_left';
    } else if (otherHandle === rFlipperBody?.collider(0).handle) {
      collisionType = 'flipper_right';
    } else {
      // Check bumpers and targets
      for (const [key, bumper] of bumperMap) {
        if (key === otherHandle) {
          collisionType = 'bumper';
          collisionData = { index: bumper.index, x: bumper.x, y: bumper.y };
          break;
        }
      }

      if (collisionType === 'unknown') {
        for (const [key, target] of targetMap) {
          if (key === otherHandle) {
            collisionType = 'target';
            collisionData = { index: target.index, x: target.x, y: target.y };
            break;
          }
        }
      }

      if (collisionType === 'unknown') {
        for (const [key, slingside] of slingshotMap) {
          if (key === otherHandle) {
            collisionType = 'slingshot';
            collisionData = { side: slingside };
            break;
          }
        }
      }
    }

    collisions.push({
      type: collisionType,
      data: collisionData,
      time: frameCount,
    });
  });

  // Return frame data
  const result: PhysicsFrame = {
    ballPos: { x: ballPos.x, y: ballPos.y, z: 0.3 },
    ballVel: { x: ballVel.x, y: ballVel.y },
    ballAng,
    collisions,
    frameCount,
  };

  lastPhysicsUpdate = performance.now();
  return result;
}

/**
 * Update flipper rotation (kinematic body).
 */
function updateFlipperRotation(side: 'left' | 'right', angle: number): void {
  if (!world) return;

  const flipper = side === 'left' ? lFlipperBody : rFlipperBody;
  if (!flipper) return;

  // Update rotation for kinematic body
  const currentPos = flipper.translation();
  flipper.setNextKinematicRotation(angle);
  flipper.setNextKinematicTranslation(currentPos);
}

/**
 * Update ball position (used when draining or plunging).
 */
function updateBallPosition(x: number, y: number, vx: number = 0, vy: number = 0): void {
  if (!ballBody) return;

  ballBody.setTranslation({ x, y }, true);
  ballBody.setLinvel({ x: vx, y: vy }, true);
  ballBody.setAngvel(0, true);
}

/**
 * Set ball gravity scale (for in-lane detection).
 */
function setBallGravityScale(scale: number): void {
  if (!ballBody) return;
  ballBody.setGravityScale(scale, true);
}

/**
 * Get ball velocity magnitude for diagnostics.
 */
function getBallSpeed(): number {
  if (!ballBody) return 0;
  const vel = ballBody.linvel();
  return Math.hypot(vel.x, vel.y);
}

/**
 * Dispose and cleanup physics world.
 */
function disposePhysics(): void {
  if (world) {
    world.free();
    world = null;
  }
  if (eventQueue) {
    eventQueue.free();
    eventQueue = null;
  }
  ballBody = null;
  lFlipperBody = null;
  rFlipperBody = null;
  bumperMap.clear();
  targetMap.clear();
  slingshotMap.clear();
  tableBodies = [];

  console.log('[Physics Worker] Physics world disposed');
}

// ─── Worker Message Handler ──────────────────────────────────────────────────

type WorkerMessage =
  | { type: 'init'; config: any }
  | { type: 'step'; dt: number; substeps: number }
  | { type: 'updateFlipper'; side: 'left' | 'right'; angle: number }
  | { type: 'updateBall'; x: number; y: number; vx?: number; vy?: number }
  | { type: 'setBallGravity'; scale: number }
  | { type: 'dispose' };

type PhysicsFrame = {
  ballPos: { x: number; y: number; z: number };
  ballVel: { x: number; y: number };
  ballAng?: number;
  collisions: CollisionEvent[];
  frameCount?: number;
};

type CollisionEvent = {
  type: string;
  data: any;
  time: number;
};

// Message handler
self.onmessage = (event: MessageEvent<WorkerMessage>) => {
  const { type, ...params } = event.data;

  try {
    switch (type) {
      case 'init': {
        initializePhysics((params as any).config);
        self.postMessage({ type: 'ready' });
        break;
      }

      case 'step': {
        const { dt, substeps } = params as any;
        const result = stepPhysics(dt, substeps);
        self.postMessage({ type: 'frame', data: result });
        break;
      }

      case 'updateFlipper': {
        const { side, angle } = params as any;
        updateFlipperRotation(side, angle);
        break;
      }

      case 'updateBall': {
        const { x, y, vx, vy } = params as any;
        updateBallPosition(x, y, vx, vy);
        break;
      }

      case 'setBallGravity': {
        const { scale } = params as any;
        setBallGravityScale(scale);
        break;
      }

      case 'dispose': {
        disposePhysics();
        self.postMessage({ type: 'disposed' });
        break;
      }

      default:
        console.warn(`[Physics Worker] Unknown message type: ${type}`);
    }
  } catch (error) {
    console.error('[Physics Worker] Error processing message:', error);
    self.postMessage({ type: 'error', error: String(error) });
  }
};

// Signal ready
self.postMessage({ type: 'worker-ready' });
console.log('[Physics Worker] Worker initialized and ready');
