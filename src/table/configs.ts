// SPDX-License-Identifier: AGPL-3.0-or-later
import type { TableConfig } from '../types';

export const TABLE_CONFIGS: Record<string, TableConfig> = {
  pharaoh: {
    name: "Pharaoh's Gold", author: 'FPW Team', year: 2025, tableColor: 0x2d1810, accentColor: 0xffd700,
    bumpers: [
      { x:-0.8, y:2.5, color:0xffaa00 }, { x:0.8, y:2.5, color:0xffaa00 }, { x:0.0, y:3.8, color:0xffaa00 },
    ],
    targets: [
      { x:-1.6, y:0.8, color:0xffd700 }, { x:0.0, y:-0.2, color:0xffd700 }, { x:1.6, y:0.8, color:0xffd700 },
    ],
    ramps: [
      { x1:-2.5, y1:0.0, x2:-1.2, y2:2.0, color:0xcc8800 },
      { x1: 2.0, y1:0.0, x2: 1.2, y2:2.0, color:0xcc8800 },
    ],
    gates: [
      { x:-1.5, y:-1.0, angle: 0.3, color: 0xffaa00 },
      { x: 1.5, y:-1.0, angle: -0.3, color: 0xffaa00 },
    ],
    kickers: [
      { x:-2.0, y:1.5, radius: 0.25, color: 0xff4400, kickForce: 8 },
      { x: 2.0, y:1.5, radius: 0.25, color: 0xff4400, kickForce: 8 },
    ],
    spinners: [
      { x:0.0, y:1.0, radius: 0.3, color: 0xffdd00 },
    ],
    triggers: [
      { x:-0.8, y:4.5, width: 0.5, height: 0.5, color: 0xffd700 },
      { x: 0.8, y:4.5, width: 0.5, height: 0.5, color: 0xffd700 },
    ],
    lights: [
      { color:0xffd700, intensity:0.8, dist:9, x:0,  y:3,  z:3 },
      { color:0xcc8800, intensity:0.6, dist:8, x:-2, y:2,  z:3 },
      { color:0xcc8800, intensity:0.6, dist:8, x:2,  y:2,  z:3 },
    ],
  },
  dragon: {
    name: "Dragon's Castle", author: 'FPW Team', year: 2025, tableColor: 0x1a1a1a, accentColor: 0xff0000,
    bumpers: [
      { x:-1.4, y:1.5, color:0xff2020 }, { x:1.4, y:1.5, color:0xff2020 },
      { x:0.0,  y:2.8, color:0xff2020 }, { x:-0.8, y:3.8, color:0xcc0000 }, { x:0.8, y:3.8, color:0xcc0000 },
    ],
    targets: [
      { x:-1.8, y:0.8, color:0xff5500 }, { x:-1.8, y:-0.3, color:0xff5500 },
      { x:1.8, y:0.8, color:0xff5500 }, { x:1.8, y:-0.3, color:0xff5500 },
    ],
    ramps: [
      { x1:-2.6, y1:0.0, x2:-1.5, y2:2.2, color:0xaa2200 },
      { x1: 2.0, y1:0.0, x2: 1.5, y2:2.2, color:0xaa2200 },
      { x1:-0.8, y1:4.2, x2: 0.8, y2:5.0, color:0x880000 },
    ],
    lights: [
      { color:0xff2200, intensity:1.0, dist:11, x:0,  y:2,  z:4 },
      { color:0xcc0000, intensity:0.7, dist:9,  x:-2, y:3,  z:3 },
      { color:0xcc0000, intensity:0.7, dist:9,  x:2,  y:3,  z:3 },
      { color:0xff0000, intensity:0.5, dist:8,  x:0,  y:-1, z:3 },
    ],
  },
  knight: {
    name: "Knight's Quest", author: 'FPW Team', year: 2025, tableColor: 0x2d2416, accentColor: 0xffff00,
    bumpers: [
      { x:-0.9, y:2.2, color:0xffdd44 }, { x:0.9, y:2.2, color:0xffdd44 },
    ],
    targets: [
      { x:-1.6, y:0.5, color:0xffee66 }, { x:0.0, y:-0.5, color:0xffee66 }, { x:1.6, y:0.5, color:0xffee66 },
    ],
    ramps: [
      { x1:-2.2, y1:0.5, x2:-1.0, y2:2.5, color:0xdd9900 },
    ],
    lights: [
      { color:0xffdd44, intensity:0.7, dist:8, x:0, y:2, z:3 },
      { color:0xffff00, intensity:0.5, dist:7, x:-2, y:0, z:3 },
    ],
  },
  cyber: {
    name: 'Cyber Nexus', author: 'FPW Team', year: 2025, tableColor: 0x0a0a1a, accentColor: 0x00ff88,
    bumpers: [
      { x:-1.2, y:1.6, color:0x00ffaa }, { x:1.2, y:1.6, color:0x00ffaa },
      { x:0.0,  y:3.0, color:0x00ffaa }, { x:-0.7, y:4.0, color:0x00dd88 }, { x:0.7, y:4.0, color:0x00dd88 },
    ],
    targets: [
      { x:-1.8, y:0.9, color:0x0088ff }, { x:-1.8, y:-0.2, color:0x0088ff },
      { x:1.8, y:0.9, color:0x0088ff }, { x:1.8, y:-0.2, color:0x0088ff },
    ],
    ramps: [
      { x1:-2.5, y1:-0.5, x2:-1.2, y2:2.2, color:0x0099dd },
      { x1: 2.0, y1:-0.5, x2: 1.2, y2:2.2, color:0x0099dd },
    ],
    lights: [
      { color:0x00ff88, intensity:0.9, dist:10, x:0,  y:2,  z:4 },
      { color:0x0088ff, intensity:0.7, dist:9,  x:-2, y:2,  z:3 },
      { color:0x0088ff, intensity:0.7, dist:9,  x:2,  y:2,  z:3 },
      { color:0x00ffff, intensity:0.5, dist:8,  x:0,  y:-2, z:3 },
    ],
  },
  neon: {
    name: 'Neon City', author: 'FPW Team', year: 2025, tableColor: 0x1a0a2e, accentColor: 0xff006e,
    bumpers: [
      { x:-0.9, y:2.3, color:0xff1493 }, { x:0.9, y:2.3, color:0xff1493 }, { x:0.0, y:3.7, color:0xdd0066 },
    ],
    targets: [
      { x:-1.6, y:0.6, color:0xff69b4 }, { x:0.0, y:-0.4, color:0xff69b4 }, { x:1.6, y:0.6, color:0xff69b4 },
    ],
    ramps: [
      { x1:-2.3, y1:0.2, x2:-1.0, y2:2.0, color:0xdd0099 },
      { x1: 2.0, y1:0.2, x2: 1.0, y2:2.0, color:0xdd0099 },
    ],
    lights: [
      { color:0xff006e, intensity:0.8, dist:9, x:0,  y:2, z:3 },
      { color:0xff1493, intensity:0.6, dist:8, x:-2, y:2, z:3 },
      { color:0xff1493, intensity:0.6, dist:8, x:2,  y:2, z:3 },
    ],
  },
  jungle: {
    name: 'Jungle Expedition', author: 'FPW Team', year: 2025, tableColor: 0x1a2d1a, accentColor: 0x00dd44,
    bumpers: [
      { x:-0.9, y:1.8, color:0x00dd44 }, { x:0.9, y:1.8, color:0x00dd44 },
      { x:0.0,  y:3.0, color:0x00cc33 }, { x:-1.4, y:3.5, color:0x22aa44 },
    ],
    targets: [
      { x:-1.6, y:0.7, color:0x11ff44 }, { x:0.0, y:-0.3, color:0x11ff44 }, { x:1.6, y:0.7, color:0x11ff44 },
    ],
    ramps: [
      { x1:-2.4, y1:0.1, x2:-1.1, y2:2.1, color:0x00aa00 },
      { x1: 2.0, y1:0.1, x2: 1.1, y2:2.1, color:0x00aa00 },
    ],
    lights: [
      { color:0x00dd44, intensity:0.8, dist:9, x:0,  y:2,  z:3 },
      { color:0x11aa22, intensity:0.6, dist:8, x:-2, y:1,  z:3 },
      { color:0x11aa22, intensity:0.6, dist:8, x:2,  y:1,  z:3 },
    ],
  },
};
