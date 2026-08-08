// SPDX-License-Identifier: AGPL-3.0-or-later
// © 2026 Harald Weiss

import RAPIER from '@dimforge/rapier3d';

export const state = {
  rapierInitialized: false,
  world: null as RAPIER.World | null,
  eventQueue: null as RAPIER.EventQueue | null,
  ballBody: null as RAPIER.RigidBody | null,
  lFlipperBody: null as RAPIER.RigidBody | null,
  rFlipperBody: null as RAPIER.RigidBody | null,
  bumperMap: new Map<number, { x: number; y: number; index: number }>(),
  targetMap: new Map<number, { x: number; y: number; index: number }>(),
  slingshotMap: new Map<number, string>(),
  gateMap: new Map<number, { x: number; y: number; index: number }>(),
  kickerMap: new Map<number, { x: number; y: number; index: number; kickForce: number }>(),
  spinnerMap: new Map<number, { x: number; y: number; index: number }>(),
  triggerMap: new Map<number, { x: number; y: number; index: number }>(),
  tableBodies: [] as RAPIER.RigidBody[],
  gravity: { x: 0, y: -9.8, z: 0.0 },
  frameCount: 0,
  lastPhysicsUpdate: 0,
  colliderNames: new Map<string, number>(),
  allColliders: [] as number[],
};
