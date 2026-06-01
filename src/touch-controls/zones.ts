// SPDX-License-Identifier: AGPL-3.0-or-later
// © 2026 Harald Weiss

import { TouchZone } from './types';

export function getDefaultZones(): { left: TouchZone; right: TouchZone; plunger: TouchZone } {
  const w = window.innerWidth;
  const h = window.innerHeight;

  return {
    left: {
      x: 0,
      y: h * 0.6,
      width: w * 0.25,
      height: h * 0.4,
    },
    right: {
      x: w * 0.75,
      y: h * 0.6,
      width: w * 0.25,
      height: h * 0.4,
    },
    plunger: {
      x: w * 0.75,
      y: 0,
      width: w * 0.25,
      height: h * 0.35,
    },
  };
}

export function pointInZone(x: number, y: number, zone: TouchZone): boolean {
  return x >= zone.x && x < zone.x + zone.width &&
         y >= zone.y && y < zone.y + zone.height;
}
