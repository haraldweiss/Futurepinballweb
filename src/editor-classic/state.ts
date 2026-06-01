// SPDX-License-Identifier: AGPL-3.0-or-later
// © 2026 Harald Weiss

import type { ToolType, Elem } from './types';

export const state = {
  tool: 'select' as ToolType,
  elements: [] as Elem[],
  selectedIdx: -1,
  isDragging: false,
  dragOffX: 0,
  dragOffY: 0,
  rampStart: null as { x: number; y: number } | null,
  snapEnabled: true,
  tableName: 'Mein Tisch',
  tableColor: '#1a2a18',
  accentColor: '#00ff66',
  colorIdx: 0,
};

export const COLORS = [0xff2200, 0xff6600, 0xffcc00, 0x00ff88, 0x00aaff, 0xcc00ff, 0xff00aa, 0x00ffff];

export function hex(n: number) { return `#${  (`000000${  n.toString(16)}`).slice(-6)}`; }
export function snap(v: number) { return state.snapEnabled ? Math.round(v * 5) / 5 : v; }
