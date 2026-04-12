# Physics Tuning Guide — Future Pinball Web

**Version**: 1.0 | **Status**: Complete | **Physics Engine**: Rapier2D 0.12

## Overview

This guide explains how the physics system works, how to tune gravity and friction, add new material types, and optimize collision detection for different table layouts. The system uses **Rapier2D** (WASM-based physics engine) with custom material interactions and adaptive substeps.

## Table of Contents

1. [Physics Engine Basics](#physics-engine-basics)
2. [Rapier2D Configuration](#rapier2d-configuration)
3. [Material System](#material-system)
4. [Gravity & Friction Tuning](#gravity--friction-tuning)
5. [Collision Detection](#collision-detection)
6. [Adaptive Substeps](#adaptive-substeps)
7. [Adding New Material Types](#adding-new-material-types)
8. [Performance Optimization](#performance-optimization)
9. [Troubleshooting Physics Issues](#troubleshooting-physics-issues)
10. [Advanced Tuning](#advanced-tuning)

---

## Physics Engine Basics

### Architecture Overview

```
┌─────────────────────────────────────────────┐
│         Physics Update Loop (main.ts)        │
│  - Called every frame (60 FPS = 16.67ms)    │
└──────────────────┬──────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────┐
│    Adaptive Substep Calculator               │
│  - Measure frame time                        │
│  - Adjust substeps: 3-5 per frame            │
└──────────────────┬──────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────┐
│    Rapier2D Physics Step (WASM)              │
│  - Simulate gravity, collisions              │
│  - Update body positions/velocities          │
│  - Run for N substeps per frame              │
└──────────────────┬──────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────┐
│    Collision Event Processing                │
│  - Detect bumper/flipper/target hits         │
│  - Generate score, trigger animations       │
└─────────────────────────────────────────────┘
```

### Key Constants

```typescript
// From src/physics.ts
const GRAVITY = -9.81;              // m/s² (standard Earth gravity)
const BALL_MASS = 1.0;              // kg
const BALL_RADIUS = 0.1;            // meters (diameter 0.2m ≈ 1.5")
const BALL_RESTITUTION = 0.95;      // Bounciness (0-1)
const DAMPING_LINEAR = 0.01;        // Velocity friction
const DAMPING_ANGULAR = 0.01;       // Rotation friction
const FRICTION_COEFFICIENT = 0.5;   // Surface friction
```

---

## Rapier2D Configuration

### Initializing Physics World

```typescript
// From src/physics.ts

// Create physics world
const world = new RAPIER.World(new RAPIER.Vector2(0, GRAVITY));

// Configuration
world.setGravity(new RAPIER.Vector2(0, GRAVITY));
world.maxNumIterations = 4;              // Solver iterations per step
world.contact_skin = 0.01;               // Contact buffer (collision tolerance)
world.contactEventHandler = {            // Collision callbacks
  onCollisionEvent: (event: any) => { /*...*/ },
  onContactForceEvent: (event: any) => { /*...*/ }
};
```

### Parameters Explained

| Parameter | Value | Effect |
|-----------|-------|--------|
| **gravity** | (0, -9.81) | Downward acceleration (m/s²) |
| **maxNumIterations** | 4 | Higher = more accurate, slower |
| **contact_skin** | 0.01m | Contact tolerance; larger = more stable but less precise |
| **damping_linear** | 0.01 | Velocity decay over time |
| **damping_angular** | 0.01 | Rotation decay over time |
| **restitution** | 0.95 | Bounce factor (0=dead, 1=perfect) |

### Tweaking Parameters for Table Types

**Fast/Aggressive Tables** (lots of multiball):
```typescript
world.maxNumIterations = 5;        // Better collision accuracy
world.contact_skin = 0.005;        // Tighter collision detection
BALL_RESTITUTION = 0.98;           // Bouncier
GRAVITY = -10.5;                   // Slightly steeper
```

**Slow/Precise Tables** (ramp-based):
```typescript
world.maxNumIterations = 3;        // Faster, acceptable for smooth play
world.contact_skin = 0.02;         // More forgiving
BALL_RESTITUTION = 0.92;           // Less bouncy
GRAVITY = -9.5;                    // Slightly gentler
```

---

## Material System

### Predefined Materials

The material system defines 8 material types with 11 unique interactions:

```typescript
enum MaterialType {
  PlayfieldSurface = 'playfield',    // Base wood/plastic
  Flipper = 'flipper',               // Movable rubber pads
  Bumper = 'bumper',                 // Spring-loaded balls
  Target = 'target',                 // Hit targets
  RampSurface = 'ramp',              // Angled surfaces
  Rails = 'rails',                   // Ball guides
  RubberBand = 'rubber',             // Rubber posts
  MetalBall = 'ball'                 // Pinball (object)
}
```

### Material Interaction Table

```
                Playfield  Flipper  Bumper  Target  Ramp  Rails  Rubber  Ball
Playfield         -        0.5      0.6    0.7    0.4   0.3    0.8    0.5
Flipper          0.5        -       0.8    0.7    0.6   0.5    0.9    0.9
Bumper           0.6       0.8       -     0.9    0.7   0.6    0.85   0.95
Target           0.7       0.7      0.9     -     0.8   0.7    0.9    0.95
Ramp             0.4       0.6      0.7    0.8     -    0.2    0.7    0.4
Rails            0.3       0.5      0.6    0.7    0.2    -     0.6    0.3
Rubber           0.8       0.9      0.85   0.9    0.7   0.6     -     0.95
Ball              0.5       0.9      0.95   0.95   0.4   0.3    0.95    -

Values = friction coefficient (0 = frictionless, 1 = maximum friction)
```

### Accessing Material Properties

```typescript
const materialSystem = new MaterialSystem();

// Get friction between ball and bumper
const friction = materialSystem.getFriction('ball', 'bumper');
console.log(friction);  // 0.95

// Check if material exists
if (materialSystem.hasMaterial('flipper')) {
  const properties = materialSystem.getMaterialProperties('flipper');
  console.log(properties);  // { friction: [...], restitution: [...] }
}
```

---

## Gravity & Friction Tuning

### Understanding Gravity

```typescript
// Gravity determines how quickly the ball falls
// Standard Earth: 9.81 m/s²

// More negative = faster falling
const veryGravity = -15;     // Ball falls fast, hard to control
const standardGravity = -9.81; // Realistic
const lightGravity = -5;      // Ball falls slowly, floaty feel

// Test: Drop ball from 1m
// Time to fall: t = sqrt(2*h/g)
// Standard: t = sqrt(2*1/9.81) ≈ 0.45 seconds
// Light: t = sqrt(2*1/5) ≈ 0.63 seconds
```

### Understanding Friction

```typescript
// Friction slows horizontal movement
// Typical values: 0.3 (slippery) to 0.9 (sticky)

// Low friction (0.3) = slippery playfield
// - Ball glides far
// - Hard to control ball with flipper
// - Good for ramp-heavy tables

// High friction (0.8) = sticky playfield
// - Ball stops quickly
// - Easy flipper control
// - Good for bumper-heavy tables
```

### Tuning Steps

**Step 1: Baseline Testing**

```typescript
// Create test table with default settings
const physics = new PhysicsEngine();
const ball = physics.addBall(5, 5);

// Drop ball from 1m height
physics.applyForce(ball, { x: 0, y: -10 });

// Measure fall time, stopping distance
let frameCount = 0;
while (ball.position.y > 0) {
  physics.step(0.016);
  frameCount++;
}

const fallTime = frameCount * 0.016;
console.log('Fall time:', fallTime, 'seconds');
```

**Step 2: Adjust Gravity**

```typescript
// If ball falls too fast, reduce gravity magnitude
if (fallTime < 0.4) {
  GRAVITY = -8;  // Decrease gravity
}

// If ball falls too slow, increase gravity magnitude
if (fallTime > 0.5) {
  GRAVITY = -11;  // Increase gravity
}
```

**Step 3: Test Friction**

```typescript
// Apply horizontal impulse and measure stopping distance
const ball = physics.addBall(5, 5);
physics.applyForce(ball, { x: 5, y: 0 });

let distance = 0;
while (ball.velocity.x > 0.1) {
  physics.step(0.016);
  distance += ball.velocity.x * 0.016;
}

console.log('Stopping distance:', distance, 'meters');

// Adjust friction if needed:
// - If distance > 3m: increase friction (playfield too slippery)
// - If distance < 1m: decrease friction (playfield too sticky)
```

---

## Collision Detection

### Continuous Collision Detection (CCD)

The physics engine supports **Continuous Collision Detection** to prevent objects from passing through each other at high speeds:

```typescript
// Enable CCD on flipper colliders
const flipped = world.createRigidBody(
  RAPIER.RigidBodyDesc.kinematicPositionBased()
    .setTranslation(flipperX, flipperY)
    .setCcdEnabled(true)  // Enable CCD
);

// CCD is slower but prevents ball clipping at high velocities
// Trade-off: accuracy vs. performance
```

### Collision Groups

```typescript
// Define collision groups (bits)
const GROUP_BALL = 0x0001;       // Ball
const GROUP_PLAYFIELD = 0x0002;  // Playfield surface
const GROUP_FLIPPER = 0x0004;    // Flippers
const GROUP_BUMPER = 0x0008;     // Bumpers
const GROUP_TARGET = 0x0010;     // Targets

// Set collision filters
const ballBody = world.createRigidBody(ballDesc);
ballBody.setCollisionGroups(GROUP_BALL);

// Allow ball to collide with everything
ballBody.setActiveSensors(GROUP_PLAYFIELD | GROUP_FLIPPER | GROUP_BUMPER | GROUP_TARGET);
```

### Detecting Collisions

```typescript
// Get active collisions
const contacts = world.contactWith(ballBody, otherBody);

for (const contact of contacts) {
  if (contact.has_any_active_contact) {
    // Calculate impulse
    const impulse = contact.contact_force1;
    const magnitude = Math.sqrt(
      impulse.x * impulse.x + impulse.y * impulse.y
    );

    // Play sound based on impact force
    if (magnitude > 5) {
      playSound('bumper-hit-loud');
    } else if (magnitude > 2) {
      playSound('bumper-hit-soft');
    }

    // Generate score
    const points = calculateScore(contact.colliderWith);
  }
}
```

---

## Adaptive Substeps

### How Adaptive Substeps Work

```typescript
// In main.ts update loop

const deltaTime = 0.016;  // 60 FPS = 16.67ms

// Calculate substeps based on frame time
let substeps = calculateSubsteps(frameTime);

// Lower FPS = fewer substeps
// - 60 FPS (16.67ms) → 5 substeps
// - 50 FPS (20ms) → 4 substeps
// - 45 FPS (22.2ms) → 4 substeps
// - 30 FPS (33.3ms) → 3 substeps

// Run physics with calculated substeps
const physicsDeltaTime = deltaTime / substeps;
for (let i = 0; i < substeps; i++) {
  world.step(physicsDeltaTime);
}
```

### Calculating Optimal Substeps

```typescript
function calculateSubsteps(frameTime: number): number {
  // Target: 5-6 substeps for 60 FPS
  const targetSubstepTime = deltaTime / 5;

  // If frame rate drops, reduce substeps
  if (frameTime > 16.67 * 1.5) {  // 45 FPS threshold
    return 4;
  }

  if (frameTime > 16.67 * 2) {  // 30 FPS threshold
    return 3;
  }

  // Otherwise, use 5 substeps
  return 5;
}
```

### Impact on Physics

| Substeps | Frame Rate | Physics Accuracy | Performance |
|----------|-----------|------------------|-------------|
| 5 | 60 FPS | Excellent | Normal |
| 4 | 45-50 FPS | Good | Good |
| 3 | 30-40 FPS | Acceptable | Good |
| 2 | <30 FPS | Poor | Fast |

---

## Adding New Material Types

### Step 1: Define Material

```typescript
// Add to MaterialType enum
export enum MaterialType {
  // ... existing materials ...
  GlassBumper = 'glass-bumper',    // New: frictionless bumper
  MagneticRail = 'magnetic-rail'   // New: magnetic attraction
}
```

### Step 2: Add Material Properties

```typescript
// In MaterialSystem constructor
const materialProperties = new Map<MaterialType, MaterialProperties>();

materialProperties.set(MaterialType.GlassBumper, {
  friction: {
    [MaterialType.Ball]: 0.2,         // Very slippery for ball
    [MaterialType.Flipper]: 0.3,
    [MaterialType.Playfield]: 0.15
  },
  restitution: {
    [MaterialType.Ball]: 0.98,        // Very bouncy
    [MaterialType.Flipper]: 0.95
  },
  damping: 0.02
});

materialProperties.set(MaterialType.MagneticRail, {
  friction: {
    [MaterialType.Ball]: 0.8,         // Sticky to keep ball on rail
    [MaterialType.Flipper]: 0.6
  },
  restitution: {
    [MaterialType.Ball]: 0.85
  },
  damping: 0.05,
  magneticStrength: 2.0              // Custom property for magnetic attraction
});
```

### Step 3: Use in Table

```typescript
// In table.ts, when creating playfield elements
const bumper = createBumper({
  x: 5,
  y: 10,
  material: MaterialType.GlassBumper,  // Use new material
  radius: 0.3
});

const rail = createRail({
  x1: 0, y1: 5,
  x2: 10, y2: 5,
  material: MaterialType.MagneticRail   // Use new material
});
```

---

## Performance Optimization

### Collision Detection Optimization

```typescript
// Strategy 1: Broad-phase culling
// Only check objects that are close together
const nearbyBodies = world.bodiesIter().filter(body => {
  const dist = distance(ball.position, body.position);
  return dist < 5;  // Only check objects within 5 meters
});

// Strategy 2: Reduce collision group complexity
// Instead of 8 groups, use 4 groups if possible
// Fewer groups = faster collision checks

// Strategy 3: Lazy collision updates
// Only update collisions every N frames for distant objects
let collisionFrameCounter = 0;
if (collisionFrameCounter % 2 === 0) {
  updateDistantCollisions();
}
collisionFrameCounter++;
```

### Physics Solver Optimization

```typescript
// Lower maxNumIterations for faster, less accurate physics
world.maxNumIterations = 2;  // 2 = fast, 4 = balanced, 6 = accurate

// Increase contact_skin for more forgiving collisions
world.contact_skin = 0.02;   // Larger = faster but less precise

// Disable unused features
world.gravity = null;        // If not needed for this table type
```

### Memory Optimization

```typescript
// Reuse objects instead of creating new ones
const impulseMagnitude = (impulse) => {
  return Math.sqrt(impulse.x ** 2 + impulse.y ** 2);
};

// Instead of:
const direction = {
  x: impulse.x / mag,
  y: impulse.y / mag
};

// Do:
const dirX = impulse.x / mag;
const dirY = impulse.y / mag;
```

---

## Troubleshooting Physics Issues

### Problem: Ball Passes Through Flipper

**Cause**: Collision detection too coarse, CCD not enabled

**Solution**:
```typescript
// Enable CCD on flipper
flipperBody.setCcdEnabled(true);

// Or increase collision check frequency
world.maxNumIterations = 5;
world.contact_skin = 0.005;  // Tighter tolerance
```

### Problem: Ball Moves Too Slowly

**Cause**: Friction too high, gravity too low

**Solution**:
```typescript
// Increase gravity
GRAVITY = -11;

// OR decrease friction on playfield
materialSystem.setFriction(MaterialType.Ball, MaterialType.Playfield, 0.3);

// OR reduce damping
ball.linearDamping = 0.005;
```

### Problem: Ball Bounces Too Much

**Cause**: Restitution too high

**Solution**:
```typescript
// Decrease restitution
ball.restitution = 0.85;

// Or use material with lower restitution
materialSystem.setRestitution(MaterialType.PlayfieldSurface, 0.8);
```

### Problem: Physics Instability/Jitter

**Cause**: Too many substeps, solver iterations too high

**Solution**:
```typescript
// Reduce substeps
function calculateSubsteps(frameTime) {
  return Math.max(2, Math.min(4, Math.floor(frameTime / 8)));
}

// Reduce solver iterations
world.maxNumIterations = 3;

// Increase contact skin slightly
world.contact_skin = 0.02;
```

### Problem: Flipper Doesn't Rotate Properly

**Cause**: Kinematic body not receiving rotation updates

**Solution**:
```typescript
// Ensure kinematic position and rotation are both updated
flipperBody.setNextKinematicPosition(newPosition);
flipperBody.setNextKinematicRotation(newRotation);

// Or use dynamic body with high motor forces
flipperBody.setLinearVelocity(impulse, true);
flipperBody.setAngularVelocity(rotationVelocity, true);
```

---

## Advanced Tuning

### Custom Damping Per Material

```typescript
// Different materials have different damping
function getLinearDamping(material: MaterialType): number {
  switch (material) {
    case MaterialType.RubberBand:
      return 0.05;     // Rubber is sticky
    case MaterialType.MetalBall:
      return 0.02;     // Metal is slippery
    case MaterialType.Bumper:
      return 0.03;
    default:
      return 0.01;
  }
}

// Apply to bodies
body.linearDamping = getLinearDamping(bodyMaterial);
```

### Ramp Physics

```typescript
// Ramps need special handling to prevent ball from sliding off

// Solution 1: Reduce friction on ramp to encourage sliding
materialSystem.setFriction(MaterialType.Ball, MaterialType.Ramp, 0.2);

// Solution 2: Use rails/guides to keep ball on path
createRail(rampStart, rampEnd);

// Solution 3: Add artificial "stickiness" at key points
function applyRampStickiness(ball, rampSegment) {
  if (ball.isOnRamp(rampSegment)) {
    // Dampen perpendicular velocity to keep ball centered
    const perpendicularVel = getPerpendicularComponent(ball.velocity, rampDir);
    ball.velocity.sub(perpendicularVel.scale(0.5));
  }
}
```

### Multiball Physics

```typescript
// Multiball requires special handling to prevent overlapping

function addBallToMultiball(balls: Ball[]): Ball {
  // Find safe position for new ball
  let newBall = null;
  let attempts = 0;

  while (newBall === null && attempts < 10) {
    const candidate = createBall(
      Math.random() * 5,    // Random X
      Math.random() * 5     // Random Y
    );

    // Check if overlaps with any existing ball
    let overlaps = false;
    for (const existingBall of balls) {
      const dist = distance(candidate.position, existingBall.position);
      if (dist < 0.3) {  // Minimum distance between balls
        overlaps = true;
        break;
      }
    }

    if (!overlaps) {
      newBall = candidate;
    }
    attempts++;
  }

  return newBall;
}
```

---

## Reference Values

### Newton's Laws Applied to Pinball

```
Force = Mass × Acceleration
F = m × a

Example: 1kg ball, 10m/s² acceleration
F = 1 × 10 = 10 Newtons

Impulse (sudden force) = Force × Time
I = F × t

Example: Flipper hits ball for 0.05 seconds with 50N
I = 50 × 0.05 = 2.5 Newton-seconds
```

### Common Pinball Measurements

```
Standard Pinball Dimensions:
- Ball diameter: 1.0625 inches (27mm) ≈ 0.1m in game
- Playfield: 42-50 inches wide × 100+ inches long
- Flipper length: 3.25-4 inches

Common Velocities:
- Ball exit from flipper: 3-5 m/s
- Ball on ramp: 2-4 m/s
- Ball rolling to drain: 0.5-1 m/s
- Bumper impact: 1-2 m/s
```

### Gravity Comparison

```
Earth: 9.81 m/s²
Moon: 1.62 m/s² (light, floaty feel)
Jupiter: 24.79 m/s² (heavy, fast falling)

For realistic pinball feel: -9.5 to -10.5 m/s²
For arcade feel: -10 to -11 m/s²
For challenge mode: -11 to -12 m/s²
```

---

## Debugging Physics

### Log Physics State

```typescript
function debugPhysicsFrame() {
  const ball = world.getBody('ball');

  console.log('Ball State:', {
    position: { x: ball.position.x, y: ball.position.y },
    velocity: { x: ball.linearVelocity.x, y: ball.linearVelocity.y },
    speed: Math.sqrt(
      ball.linearVelocity.x ** 2 + ball.linearVelocity.y ** 2
    ),
    angularVelocity: ball.angularVelocity,
    damping: ball.linearDamping
  });
}
```

### Visualize Collisions

```typescript
// Enable collision visualization in debug mode
if (DEBUG_MODE) {
  world.contactIterator((manifold, rigidBody1, rigidBody2) => {
    // Draw collision points
    const contact = manifold.contact_points[0];
    drawDebugPoint(contact.local_p1, { r: 255, g: 0, b: 0 });
    drawDebugPoint(contact.local_p2, { r: 255, g: 0, b: 0 });
  });
}
```

---

## Best Practices Summary

### DO ✅

- ✅ Test gravity settings with baseline drop test
- ✅ Measure friction by stopping distance
- ✅ Enable CCD on fast-moving objects (flippers, bumpers)
- ✅ Use adaptive substeps to handle frame rate drops
- ✅ Create custom materials for special table types
- ✅ Log physics state for debugging
- ✅ Measure frame time to optimize substeps

### DON'T ❌

- ❌ Use gravity > -12 or < -5 (unrealistic)
- ❌ Set friction outside 0.2-0.9 range
- ❌ Disable gravity for the ball
- ❌ Use restitution > 1.0 (violates physics)
- ❌ Add too many collision groups (slow)
- ❌ Ignore CCD on fast objects (clipping)
- ❌ Max out solver iterations (performance)

---

## Resources

- **Rapier2D Documentation**: https://rapier.rs/
- **Source Code**: `src/physics.ts`, `src/physics/material-system.ts`
- **Test Files**: `src/__tests__/physics.test.ts`, `src/__tests__/stress-physics.test.ts`
- **Configuration**: `src/main.ts` (physics initialization)

---

**Document Version**: 1.0 | **Last Updated**: 2026-04-12 | **Status**: Complete
