// SPDX-License-Identifier: AGPL-3.0-or-later
// © 2026 Harald Weiss

export type WorkerMessage =
  | { type: 'init'; config: any }
  | { type: 'step'; dt: number; substeps: number }
  | { type: 'updateFlipper'; side: 'left' | 'right'; angle: number }
  | { type: 'updateBall'; x: number; y: number; vx?: number; vy?: number }
  | { type: 'setBallGravity'; scale: number }
  | { type: 'setWorldGravity'; x: number; y: number }
  | { type: 'dispose' };

export type PhysicsFrame = {
  ballPos: { x: number; y: number; z: number };
  ballVel: { x: number; y: number };
  ballAng?: number;
  collisions: CollisionEvent[];
  frameCount?: number;
};

export type CollisionEvent = {
  type: string;
  data: any;
  time: number;
};
