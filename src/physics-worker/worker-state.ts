// SPDX-License-Identifier: AGPL-3.0-or-later
// © 2026 Harald Weiss

import type { World, RigidBody, EventQueue } from '../physics/mini-rapier';

export const state = {
  rapierInitialized: false,
  world: null as World | null,
  eventQueue: null as EventQueue | null,
  ballBody: null as RigidBody | null,
  lFlipperBody: null as RigidBody | null,
  rFlipperBody: null as RigidBody | null,
  bumperMap: new Map<number, { x: number; y: number; index: number }>(),
  targetMap: new Map<number, { x: number; y: number; index: number }>(),
  slingshotMap: new Map<number, string>(),
  gateMap: new Map<number, { x: number; y: number; index: number }>(),
  kickerMap: new Map<number, { x: number; y: number; index: number; kickForce: number }>(),
  spinnerMap: new Map<number, { x: number; y: number; index: number }>(),
  triggerMap: new Map<number, { x: number; y: number; index: number }>(),
  tableBodies: [] as RigidBody[],
  gravity: { x: 0, y: -9.8, z: 0.0 },
  frameCount: 0,
  lastPhysicsUpdate: 0,
  colliderNames: new Map<string, number>(),
  allColliders: [] as number[],
};
