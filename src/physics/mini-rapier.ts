// SPDX-License-Identifier: AGPL-3.0-or-later
// © 2026 Harald Weiss

/**
 * mini-rapier.ts — Dependency-free 2.5D physics engine with a Rapier3D-facade API.
 *
 * Replaces @dimforge/rapier3d (WASM, 1.57 MB) for this project's actual use case:
 * a single dynamic ball (plus optional extra balls) against fixed walls and
 * kinematic flippers in the x/y plane. z is carried through the API for
 * compatibility but the simulation is 2D.
 *
 * Semantics replicated from the previous Rapier setup:
 *  - world.step() advances a FIXED 1/60 s per call (Rapier's default timestep;
 *    the old worker never overrode it — the game is tuned to this).
 *  - Restitution/friction combine rule: average of both colliders (Rapier default).
 *  - Collision events fire when at least one collider of the pair has
 *    ActiveEvents.COLLISION_EVENTS; both start and stop events are emitted.
 *  - Kinematic bodies derive their velocity from the last setNextKinematic* pose.
 *  - CCD: fast dynamic bodies sub-integrate so no tunneling through thin walls.
 */

export interface Vec3 { x: number; y: number; z: number }
export interface Quat { x: number; y: number; z: number; w: number }

export const ActiveEvents = { COLLISION_EVENTS: 1 } as const;

const FIXED_DT = 1 / 60;
const SLOP = 0.001;             // allowed penetration before correction
const CORRECTION_PERCENT = 0.8; // positional correction strength
/**
 * Impact speed below which a contact is solved as perfectly inelastic.
 *
 * Gravity adds ~0.163 units/s per step (9.8 / 60), so a body resting on a
 * surface re-enters contact every single step. With restitution applied to
 * *any* approaching velocity the body rebounds at ~0.68 × that increment and
 * never comes to rest — it micro-bounces forever (visible jitter, and a ball
 * that never settles in a lane/saucer). Every production solver drops
 * restitution below a threshold (Box2D `b2_velocityThreshold`, Rapier
 * `restitution_threshold`); 1.0 matches our units — gravity is 9.8 and the
 * plunger launches at 13–16, so real impacts are far above it.
 */
const RESTITUTION_THRESHOLD = 1.0;
/**
 * Max positional correction applied to one body per step (Box2D
 * `b2_maxLinearCorrection`).
 *
 * Without a cap, a deep overlap is resolved in ONE step: measured, a ball
 * resting 0.37 units inside a wall snapped 0.354 units (≈1.6 ball radii) in a
 * single 1/60 s step. That is a visible teleport — it happens whenever the
 * ball is repositioned into an overlap (stuck recovery, reset into a rubber,
 * a tunneling event). Capping spreads the same resolution over a few steps,
 * so the ball slides out smoothly instead of jumping.
 */
const MAX_CORRECTION = 0.2;

function quatToAngle(r: Quat | number): number {
  if (typeof r === 'number') return r; // radians about z (lenient extension)
  return 2 * Math.atan2(r.z, r.w);
}

function wrapAngle(a: number): number {
  while (a > Math.PI) a -= 2 * Math.PI;
  while (a < -Math.PI) a += 2 * Math.PI;
  return a;
}

// ─── Descriptors ────────────────────────────────────────────────────────────

type BodyKind = 'dynamic' | 'fixed' | 'kinematic';

export class RigidBodyDesc {
  kind: BodyKind;
  pos = { x: 0, y: 0 };
  angle = 0;
  linvel = { x: 0, y: 0 };
  gravityScale = 1;
  linearDamping = 0;
  angularDamping = 0;
  ccd = false;
  canSleep = true;

  private constructor(kind: BodyKind) { this.kind = kind; }
  static dynamic() { return new RigidBodyDesc('dynamic'); }
  static fixed() { return new RigidBodyDesc('fixed'); }
  static kinematicPositionBased() { return new RigidBodyDesc('kinematic'); }

  setTranslation(x: number, y: number, _z = 0) { this.pos = { x, y }; return this; }
  setLinvel(x: number, y: number, _z = 0) { this.linvel = { x, y }; return this; }
  setGravityScale(s: number) { this.gravityScale = s; return this; }
  setCanSleep(v: boolean) { this.canSleep = v; return this; }
  setLinearDamping(d: number) { this.linearDamping = d; return this; }
  setAngularDamping(d: number) { this.angularDamping = d; return this; }
  setCcdEnabled(v: boolean) { this.ccd = v; return this; }
  setRotation(r: Quat | number) { this.angle = quatToAngle(r); return this; }
}

type Shape =
  | { kind: 'ball'; r: number }
  | { kind: 'cuboid'; hx: number; hy: number };

export class ColliderDesc {
  shape: Shape;
  restitution = 0.5;
  friction = 0.5;
  density = 1;
  offset = { x: 0, y: 0 };
  activeEvents = false;

  private constructor(shape: Shape) { this.shape = shape; }
  static ball(r: number) { return new ColliderDesc({ kind: 'ball', r }); }
  static cuboid(hx: number, hy: number, _hz = 0) { return new ColliderDesc({ kind: 'cuboid', hx, hy }); }

  setRestitution(v: number) { this.restitution = v; return this; }
  setFriction(v: number) { this.friction = v; return this; }
  setDensity(v: number) { this.density = v; return this; }
  setTranslation(x: number, y: number, _z = 0) { this.offset = { x, y }; return this; }
  setActiveEvents(_flag: number) { this.activeEvents = true; return this; }
}


// ─── Bodies & colliders ─────────────────────────────────────────────────────

export class Collider {
  readonly handle: number;
  readonly body: RigidBody;
  shape: Shape;
  offset: { x: number; y: number };
  restitution: number;
  friction: number;
  density: number;
  activeEvents: boolean;

  constructor(handle: number, body: RigidBody, desc: ColliderDesc) {
    this.handle = handle;
    this.body = body;
    this.shape = desc.shape;
    this.offset = { ...desc.offset };
    this.restitution = desc.restitution;
    this.friction = desc.friction;
    this.density = desc.density;
    this.activeEvents = desc.activeEvents;
  }

  setRestitution(v: number) { this.restitution = v; }
  setFriction(v: number) { this.friction = v; }

  /** World-space center of this collider shape. */
  worldCenter(): { x: number; y: number } {
    const c = Math.cos(this.body.angle), s = Math.sin(this.body.angle);
    return {
      x: this.body.pos.x + this.offset.x * c - this.offset.y * s,
      y: this.body.pos.y + this.offset.x * s + this.offset.y * c,
    };
  }
}

export class RigidBody {
  readonly handle: number;
  readonly kind: BodyKind;
  pos: { x: number; y: number };
  angle: number;
  vel: { x: number; y: number };      // backing field for linvel()
  angV = 0;                            // backing field for angvel() (about z)
  gravityScale: number;
  linearDamping: number;
  angularDamping: number;
  ccd: boolean;
  mass = 1;
  invMass = 0;
  inertia = 1;
  invInertia = 0;
  nextKin: { x: number; y: number; angle: number } | null = null;
  colliders: Collider[] = [];

  constructor(handle: number, desc: RigidBodyDesc) {
    this.handle = handle;
    this.kind = desc.kind;
    this.pos = { ...desc.pos };
    this.angle = desc.angle;
    this.vel = { ...desc.linvel };
    this.gravityScale = desc.gravityScale;
    this.linearDamping = desc.linearDamping;
    this.angularDamping = desc.angularDamping;
    this.ccd = desc.ccd;
  }

  _attach(collider: Collider) {
    this.colliders.push(collider);
    if (this.kind === 'dynamic') {
      // Recompute mass/inertia from attached shapes (this app uses
      // single-collider dynamic bodies, but sum for correctness).
      let m = 0, i = 0;
      for (const c of this.colliders) {
        if (c.shape.kind === 'ball') {
          const d = c.density > 0 ? c.density : 1;
          m += d * Math.PI * c.shape.r * c.shape.r;
          i += 0.5 * d * Math.PI * c.shape.r ** 4;
        } else {
          const d = c.density > 0 ? c.density : 1;
          const w = c.shape.hx * 2, h = c.shape.hy * 2;
          m += d * w * h;
          i += (d * w * h * (w * w + h * h)) / 12;
        }
      }
      if (m <= 0) m = 1;
      this.mass = m; this.invMass = 1 / m;
      this.inertia = i > 0 ? i : 1; this.invInertia = 1 / this.inertia;
    }
  }

  _detachAll() { this.colliders = []; }

  /** Kinematic velocity derived from the pending next pose (called each step). */
  _advanceKinematic(dt: number) {
    if (this.kind !== 'kinematic') return;
    if (this.nextKin) {
      this.vel = { x: (this.nextKin.x - this.pos.x) / dt, y: (this.nextKin.y - this.pos.y) / dt };
      this.angV = wrapAngle(this.nextKin.angle - this.angle) / dt;
      this.pos = { x: this.nextKin.x, y: this.nextKin.y };
      this.angle = wrapAngle(this.nextKin.angle);
    } else {
      this.vel = { x: 0, y: 0 };
      this.angV = 0;
    }
  }

  // ── Facade methods ──
  translation(): Vec3 { return { x: this.pos.x, y: this.pos.y, z: 0 }; }
  setTranslation(v: Vec3, _wake = true) { this.pos = { x: v.x, y: v.y }; }
  linvel(): Vec3 { return { x: this.vel.x, y: this.vel.y, z: 0 }; }
  setLinvel(v: Vec3, _wake = true) { this.vel = { x: v.x, y: v.y }; }
  angvel(): Vec3 { return { x: 0, y: 0, z: this.angV }; }
  setAngvel(v: Vec3, _wake = true) { this.angV = v.z; }
  setGravityScale(s: number, _wake = true) { this.gravityScale = s; }
  rotation(): Quat { return { x: 0, y: 0, z: Math.sin(this.angle / 2), w: Math.cos(this.angle / 2) }; }
  setRotation(r: Quat | number, _wake = true) { this.angle = wrapAngle(quatToAngle(r)); }
  setNextKinematicTranslation(v: Vec3) {
    if (!this.nextKin) this.nextKin = { x: this.pos.x, y: this.pos.y, angle: this.angle };
    this.nextKin.x = v.x; this.nextKin.y = v.y;
  }
  setNextKinematicRotation(q: Quat | number) {
    if (!this.nextKin) this.nextKin = { x: this.pos.x, y: this.pos.y, angle: this.angle };
    this.nextKin.angle = quatToAngle(q);
  }
  applyImpulse(v: Vec3, _wake = true) {
    if (this.invMass === 0) return;
    this.vel.x += v.x * this.invMass;
    this.vel.y += v.y * this.invMass;
  }
  collider(i: number): Collider { return this.colliders[i]; }
}

// ─── Event queue ────────────────────────────────────────────────────────────

type CollisionCb = (h1: number, h2: number, started: boolean) => void;

export class EventQueue {
  private events: Array<[number, number, boolean]> = [];
  constructor(_autoDrain = true) {}
  _push(h1: number, h2: number, started: boolean) { this.events.push([h1, h2, started]); }
  drainCollisionEvents(cb: CollisionCb) {
    for (const [h1, h2, started] of this.events) cb(h1, h2, started);
    this.events = [];
  }
  free() { this.events = []; }
}

// ─── Narrow phase ───────────────────────────────────────────────────────────

interface Contact {
  a: Collider;            // dynamic side
  b: Collider;            // other side
  nx: number; ny: number; // normal pointing from b toward a
  px: number; py: number; // contact point (world)
  penetration: number;
}

/** Circle (a) vs circle (b). */
function circleVsCircle(a: Collider, b: Collider): Contact | null {
  const ar = a.shape.kind === 'ball' ? a.shape.r : 0;
  const br = b.shape.kind === 'ball' ? b.shape.r : 0;
  const ca = a.worldCenter(), cb = b.worldCenter();
  const dx = ca.x - cb.x, dy = ca.y - cb.y;
  const dist = Math.hypot(dx, dy);
  const pen = ar + br - dist;
  if (pen <= 0) return null;
  const nx = dist > 1e-9 ? dx / dist : 0;
  const ny = dist > 1e-9 ? dy / dist : 1;
  return { a, b, nx, ny, px: ca.x - nx * ar, py: ca.y - ny * ar, penetration: pen };
}

/** Circle (a) vs oriented box (b). Box rotation = b.body.angle. */
function circleVsBox(a: Collider, b: Collider): Contact | null {
  if (a.shape.kind !== 'ball' || b.shape.kind !== 'cuboid') return null;
  const r = a.shape.r;
  const ca = a.worldCenter(), cb = b.worldCenter();
  const cos = Math.cos(-b.body.angle), sin = Math.sin(-b.body.angle);
  // circle center in box-local frame
  const lx = (ca.x - cb.x) * cos - (ca.y - cb.y) * sin;
  const ly = (ca.x - cb.x) * sin + (ca.y - cb.y) * cos;
  const hx = b.shape.hx, hy = b.shape.hy;

  const cx = Math.max(-hx, Math.min(hx, lx));
  const cy = Math.max(-hy, Math.min(hy, ly));
  let nxL: number, nyL: number, pen: number;

  if (cx === lx && cy === ly) {
    // center inside the box — push out along the least-penetration axis
    const dxp = hx - Math.abs(lx), dyp = hy - Math.abs(ly);
    if (dxp < dyp) { nxL = lx >= 0 ? 1 : -1; nyL = 0; pen = dxp + r; }
    else { nxL = 0; nyL = ly >= 0 ? 1 : -1; pen = dyp + r; }
  } else {
    const dx = lx - cx, dy = ly - cy;
    const dist = Math.hypot(dx, dy);
    pen = r - dist;
    if (pen <= 0) return null;
    nxL = dist > 1e-9 ? dx / dist : 0;
    nyL = dist > 1e-9 ? dy / dist : 1;
  }

  // normal back to world frame
  const c2 = Math.cos(b.body.angle), s2 = Math.sin(b.body.angle);
  const nx = nxL * c2 - nyL * s2;
  const ny = nxL * s2 + nyL * c2;
  return { a, b, nx, ny, px: ca.x - nx * r, py: ca.y - ny * r, penetration: pen };
}

function collide(a: Collider, b: Collider): Contact | null {
  if (a.shape.kind === 'ball' && b.shape.kind === 'ball') return circleVsCircle(a, b);
  if (a.shape.kind === 'ball' && b.shape.kind === 'cuboid') return circleVsBox(a, b);
  if (a.shape.kind === 'cuboid' && b.shape.kind === 'ball') {
    const c = circleVsBox(b, a);
    if (c) return { a, b, nx: -c.nx, ny: -c.ny, px: c.px, py: c.py, penetration: c.penetration };
  }
  return null; // box-box not needed (no dynamic boxes in this app)
}


// ─── World ──────────────────────────────────────────────────────────────────

export class World {
  gravity: Vec3;
  timestep = FIXED_DT;
  private bodies: RigidBody[] = [];
  private worldColliders: Collider[] = [];
  private nextHandle = 1;
  private prevPairs = new Set<string>();
  /**
   * Positional correction already applied to each body during the current
   * step. A single pair can generate several contact points (and CCD
   * sub-slices / solver iterations re-solve them), so capping per *contact*
   * does not bound how far a body moves — measured, a deep overlap still
   * snapped 0.335 units in one step. The budget is per body per step and is
   * reset in step().
   */
  private correctionUsed = new Map<RigidBody, { x: number; y: number }>();

  constructor(gravity: Vec3) { this.gravity = { ...gravity }; }

  createRigidBody(desc: RigidBodyDesc): RigidBody {
    const body = new RigidBody(this.nextHandle++, desc);
    this.bodies.push(body);
    return body;
  }

  createCollider(desc: ColliderDesc, body: RigidBody): Collider {
    const col = new Collider(this.nextHandle++, body, desc);
    this.worldColliders.push(col);
    body._attach(col);
    return col;
  }

  getCollider(handle: number): Collider | undefined {
    return this.worldColliders.find(c => c.handle === handle);
  }

  removeRigidBody(body: RigidBody): void {
    this.bodies = this.bodies.filter(b => b !== body);
    const removed = new Set(body.colliders);
    this.worldColliders = this.worldColliders.filter(c => !removed.has(c));
    body._detachAll();
    for (const key of [...this.prevPairs]) {
      const [k1, k2] = key.split(':').map(Number);
      for (const c of removed) {
        if (k1 === c.handle || k2 === c.handle) this.prevPairs.delete(key);
      }
    }
  }

  free(): void {
    this.bodies = [];
    this.worldColliders = [];
    this.prevPairs.clear();
    this.correctionUsed.clear();
  }

  /** Velocity of a body at a world contact point (v + ω × r). */
  private surfaceVelocity(body: RigidBody, px: number, py: number): { x: number; y: number } {
    const rx = px - body.pos.x, ry = py - body.pos.y;
    return { x: body.vel.x - body.angV * ry, y: body.vel.y + body.angV * rx };
  }

  /** Impulse + positional correction for one contact (a is the dynamic side). */
  private solveContact(c: Contact): void {
    const body = c.a.body;
    if (body.invMass === 0) return;

    const mu = (c.a.friction + c.b.friction) / 2;

    // vector from ball center to contact point
    const ac = c.a.worldCenter();
    const rx = c.px - ac.x, ry = c.py - ac.y;

    const vB = this.surfaceVelocity(body, c.px, c.py);
    const vO = c.b.body.kind === 'kinematic'
      ? this.surfaceVelocity(c.b.body, c.px, c.py)
      : { x: 0, y: 0 };
    const rvx = vB.x - vO.x, rvy = vB.y - vO.y;
    const vn = rvx * c.nx + rvy * c.ny;

    if (vn < 0) {
      // Slow contacts are inelastic so resting bodies can settle (see
      // RESTITUTION_THRESHOLD). Fast impacts keep the full combined
      // restitution, so bumper/flipper/wall bounce behaviour is unchanged.
      const e = (-vn < RESTITUTION_THRESHOLD)
        ? 0
        : (c.a.restitution + c.b.restitution) / 2;
      const rnCross = rx * c.ny - ry * c.nx;
      const denom = body.invMass + rnCross * rnCross * body.invInertia;
      const j = (-(1 + e) * vn) / denom;
      body.vel.x += j * c.nx * body.invMass;
      body.vel.y += j * c.ny * body.invMass;
      body.angV += rnCross * j * body.invInertia;

      // Coulomb friction (recompute tangent velocity after normal impulse)
      const tx = -c.ny, ty = c.nx;
      const vB2 = this.surfaceVelocity(body, c.px, c.py);
      const vt = (vB2.x - vO.x) * tx + (vB2.y - vO.y) * ty;
      const rtCross = rx * ty - ry * tx;
      const denomT = body.invMass + rtCross * rtCross * body.invInertia;
      let jt = -vt / denomT;
      const maxF = mu * j;
      jt = Math.max(-maxF, Math.min(maxF, jt));
      body.vel.x += jt * tx * body.invMass;
      body.vel.y += jt * ty * body.invMass;
      body.angV += rtCross * jt * body.invInertia;
    }

    // Positional correction — push the dynamic body out of penetration.
    // Budgeted per body per step (see MAX_CORRECTION / correctionUsed) so a
    // deep overlap — or several contact points from one pair — slides out over
    // a few steps instead of teleporting the body in one.
    const corrMag = Math.max(c.penetration - SLOP, 0) * CORRECTION_PERCENT;
    if (corrMag > 0) {
      const used = this.correctionUsed.get(body) ?? { x: 0, y: 0 };
      const remaining = MAX_CORRECTION - Math.hypot(used.x, used.y);
      if (remaining > 0) {
        const applied = Math.min(corrMag, remaining);
        const dx = c.nx * applied, dy = c.ny * applied;
        body.pos.x += dx;
        body.pos.y += dy;
        used.x += dx; used.y += dy;
        this.correctionUsed.set(body, used);
      }
    }
  }

  private pairKey(h1: number, h2: number): string {
    return h1 < h2 ? `${h1}:${h2}` : `${h2}:${h1}`;
  }

  step(eventQueue?: EventQueue): void {
    const dt = this.timestep;
    this.correctionUsed.clear();

    // 1. Kinematic bodies: derive velocity from pending next pose
    for (const b of this.bodies) b._advanceKinematic(dt);

    // 2. Gravity
    for (const b of this.bodies) {
      if (b.kind !== 'dynamic') continue;
      b.vel.x += this.gravity.x * b.gravityScale * dt;
      b.vel.y += this.gravity.y * b.gravityScale * dt;
    }

    // 3. Integrate (with CCD sub-integration) + solve contacts
    const touchedPairs = new Set<string>();
    for (const b of this.bodies) {
      if (b.kind !== 'dynamic') continue;
      const speed = Math.hypot(b.vel.x, b.vel.y);
      const maxR = b.colliders.reduce(
        (m, c) => (c.shape.kind === 'ball' ? Math.max(m, c.shape.r) : m), 0.1);
      const dist = speed * dt;
      const slices = b.ccd && dist > maxR * 0.5
        ? Math.min(16, Math.ceil(dist / (maxR * 0.5)))
        : 1;
      const sdt = dt / slices;

      for (let s = 0; s < slices; s++) {
        b.pos.x += b.vel.x * sdt;
        b.pos.y += b.vel.y * sdt;
        b.angle = wrapAngle(b.angle + b.angV * sdt);

        // contacts for this body (2 solver iterations is plenty for pinball)
        for (let iter = 0; iter < 2; iter++) {
          for (const a of b.colliders) {
            for (const other of this.worldColliders) {
              if (other === a || other.body === b) continue;
              const contact = collide(a, other);
              if (contact) {
                touchedPairs.add(this.pairKey(a.handle, other.handle));
                this.solveContact(contact);
              }
            }
          }
        }
      }
    }

    // 4. Damping: v *= 1 / (1 + dt * d)  (Rapier's formula)
    for (const b of this.bodies) {
      if (b.kind !== 'dynamic') continue;
      const ld = 1 / (1 + dt * b.linearDamping);
      const ad = 1 / (1 + dt * b.angularDamping);
      b.vel.x *= ld; b.vel.y *= ld;
      b.angV *= ad;
    }

    // 5. Collision events (started / stopped) — fire when at least one
    //    collider of the pair opted into ActiveEvents.
    if (eventQueue) {
      for (const key of touchedPairs) {
        if (this.prevPairs.has(key)) continue;
        const [h1, h2] = key.split(':').map(Number);
        const c1 = this.getCollider(h1), c2 = this.getCollider(h2);
        if (c1 && c2 && (c1.activeEvents || c2.activeEvents)) {
          eventQueue._push(h1, h2, true);
        }
      }
      for (const key of this.prevPairs) {
        if (touchedPairs.has(key)) continue;
        const [h1, h2] = key.split(':').map(Number);
        const c1 = this.getCollider(h1), c2 = this.getCollider(h2);
        if (c1 && c2 && (c1.activeEvents || c2.activeEvents)) {
          eventQueue._push(h1, h2, false);
        }
      }
    }
    this.prevPairs = touchedPairs;
  }
}

// ─── Default export (namespace-style facade, mirrors @dimforge/rapier3d) ────

const RAPIER = {
  World,
  RigidBodyDesc,
  ColliderDesc,
  EventQueue,
  ActiveEvents,
};

export default RAPIER;
