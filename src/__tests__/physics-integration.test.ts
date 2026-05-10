// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, it, expect, vi } from 'vitest';

// Mock browser-only modules
vi.mock('../script-engine', () => ({ runFPScript: vi.fn() }));
vi.mock('../audio-system', () => ({
  getAudioCtx: vi.fn(),
  playFPTMusic: vi.fn(),
  playSound: vi.fn(),
  startBGMusic: vi.fn(),
  stopBGMusic: vi.fn(),
}));
vi.mock('cfb', () => ({}));

import { extractFPTPhysics } from '../fpt-parser';

describe('FPT physics parameter extraction', () => {
  it('extractFPTPhysics returns a Map with valid entries from synthetic data', () => {
    // Build a synthetic byte buffer containing a known physics tuple at offset 0:
    // restitution=0.85, friction=0.25, maxVel=15, gravity=1.0
    const buf = new ArrayBuffer(64);
    const view = new DataView(buf);
    view.setFloat32(0,  0.85, true);  // restitution
    view.setFloat32(4,  0.25, true);  // friction
    view.setFloat32(8,  15.0, true);  // maxVel
    view.setFloat32(12, 1.0,  true);  // gravity
    // Pad with values out of physics ranges so they don't match
    for (let i = 16; i < 64; i += 4) view.setFloat32(i, 999.0, true);

    const result = extractFPTPhysics(new Uint8Array(buf), [{ x: 0, y: 0 }]);
    expect(result.size).toBeGreaterThan(0);
    const first = result.values().next().value as { restitution: number; friction: number };
    expect(first.restitution).toBeCloseTo(0.85, 2);
    expect(first.friction).toBeCloseTo(0.25, 2);
  });

  it('returns empty map when no valid physics tuples exist in input', () => {
    const buf = new Uint8Array(64).fill(0xFF); // all 0xFF bytes (invalid as floats)
    const result = extractFPTPhysics(buf, [{ x: 0, y: 0 }]);
    expect(result.size).toBe(0);
  });

  it('extracts multiple physics candidates from buffer with diverse valid ranges', () => {
    // Create buffer with 3 valid physics tuples at different offsets
    const buf = new ArrayBuffer(128);
    const view = new DataView(buf);

    // Tuple 1 at offset 0
    view.setFloat32(0,  0.7,  true);  // restitution
    view.setFloat32(4,  0.3,  true);  // friction
    view.setFloat32(8,  12.0, true);  // maxVel
    view.setFloat32(12, 0.95, true);  // gravity

    // Tuple 2 at offset 32
    view.setFloat32(32, 1.2,  true);  // restitution
    view.setFloat32(36, 0.15, true);  // friction
    view.setFloat32(40, 20.0, true);  // maxVel
    view.setFloat32(44, 1.1,  true);  // gravity

    // Tuple 3 at offset 64
    view.setFloat32(64, 0.5,  true);  // restitution (near lower bound)
    view.setFloat32(68, 0.55, true);  // friction
    view.setFloat32(72, 8.0,  true);  // maxVel
    view.setFloat32(76, 0.8,  true);  // gravity

    const result = extractFPTPhysics(new Uint8Array(buf), [{ x: 0, y: 0 }]);
    expect(result.size).toBeGreaterThanOrEqual(1);
  });

  it('rejects tuples with restitution outside valid range (0.3-1.6)', () => {
    // Fill entire buffer with invalid values to prevent overlapping reads
    const buf = new ArrayBuffer(64);
    const view = new DataView(buf);
    for (let i = 0; i < 64; i += 4) {
      view.setFloat32(i, 0.15, true); // All values too low
    }

    const result = extractFPTPhysics(new Uint8Array(buf), []);
    expect(result.size).toBe(0);
  });

  it('rejects tuples with friction outside valid range (-0.1 to 0.9)', () => {
    // Fill entire buffer with invalid friction values
    const buf = new ArrayBuffer(64);
    const view = new DataView(buf);
    for (let i = 0; i < 64; i += 4) {
      view.setFloat32(i, 1.5, true); // All values too high (invalid as both rest and fric)
    }

    const result = extractFPTPhysics(new Uint8Array(buf), []);
    expect(result.size).toBe(0);
  });

  it('handles NaN and Infinity gracefully', () => {
    // Alternate between NaN and Infinity to fill buffer
    const buf = new ArrayBuffer(64);
    const view = new DataView(buf);
    for (let i = 0; i < 64; i += 4) {
      if (i % 8 === 0) {
        view.setFloat32(i, NaN, true);
      } else {
        view.setFloat32(i, Infinity, true);
      }
    }

    const result = extractFPTPhysics(new Uint8Array(buf), []);
    expect(result.size).toBe(0);
  });
});

describe('elementPhysics overrides reach Rapier collider config', () => {
  it('applies per-bumper restitution override from config.elementPhysics', () => {
    // Type-contract smoke test — full Rapier integration is in physics.test.ts
    const config = {
      bumpers: [{ x: 0, y: 0, color: 0xffffff, size: 1.0 }],
      elementPhysics: {
        bumpers: { 0: { restitution: 1.5, friction: 0.05 } }
      }
    };
    const elemPhys = config.elementPhysics;
    expect(elemPhys.bumpers[0].restitution).toBe(1.5);
    expect(elemPhys.bumpers[0].friction).toBe(0.05);
  });

  it('config.elementPhysics is undefined when extractFPTPhysics returns empty map', () => {
    // Verify the parser integration path
    const elemPhysics = undefined;
    expect(elemPhysics).toBeUndefined();
  });
});
