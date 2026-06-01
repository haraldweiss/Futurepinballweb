// SPDX-License-Identifier: AGPL-3.0-or-later
// © 2026 Harald Weiss

export type ToolType = 'select' | 'bumper' | 'target' | 'ramp';

export interface Bumper { type: 'bumper'; x: number;  y: number;  color: number; }
export interface Target { type: 'target'; x: number;  y: number;  color: number; }
export interface Ramp   { type: 'ramp';   x1: number; y1: number; x2: number; y2: number; color: number; }
export type Elem = Bumper | Target | Ramp;
