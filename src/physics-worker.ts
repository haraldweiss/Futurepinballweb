// SPDX-License-Identifier: AGPL-3.0-or-later
// © 2026 Harald Weiss
/**
 * physics-worker.ts — Barrel for Physics Simulation Worker Thread
 * Composes sub-modules: state, types, init, step, bodies, handler
 */

import './physics-worker/worker-handler';

export type { WorkerMessage, PhysicsFrame, CollisionEvent } from './physics-worker/worker-types';
