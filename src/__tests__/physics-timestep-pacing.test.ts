// SPDX-License-Identifier: AGPL-3.0-or-later
// © 2026 Harald Weiss

/**
 * Fixed-timestep pacing regression tests.
 *
 * mini-rapier's world.step() advances a FIXED 1/60 s and ignores the dt sent
 * to the worker, so the *step count* per rendered frame is what sets game
 * speed. It used to be an FPS bucket (4/5/6 steps chosen from currentFps),
 * which made the simulation rate depend on the display refresh rate and flip
 * abruptly whenever FPS crossed the 45/55 bucket boundaries — the visible
 * "ball speed stutters" symptom. These tests pin the wall-clock-derived
 * pacing: identical simulation rate on every refresh rate, no discarded time,
 * and a catch-up cap so a hitch cannot spiral.
 */
import { describe, it, expect } from 'vitest';
import { advanceFixedTimestep } from '../app/animation-loop';

const FIXED_DT = 1 / 60;
/** Tuned rate: 6 fixed steps per 1/60 s of wall time (see SIM_TIME_SCALE). */
const SIM_TIME_SCALE = 6;
const MAX_PHYSICS_STEPS = 18;

/** Run `seconds` of wall time at `hz` and return the total steps consumed. */
function totalStepsOver(seconds: number, hz: number): { steps: number; accumulator: number } {
  const dt = 1 / hz;
  const frames = Math.round(seconds * hz);
  let acc = 0;
  let steps = 0;
  for (let i = 0; i < frames; i++) {
    const paced = advanceFixedTimestep(acc, dt);
    acc = paced.accumulator;
    steps += paced.steps;
  }
  return { steps, accumulator: acc };
}

describe('fixed-timestep physics pacing', () => {
  it('issues 6 steps per frame at 60 Hz (the tuned rate)', () => {
    const { steps } = advanceFixedTimestep(0, 1 / 60);
    expect(steps).toBe(6);
  });

  it('issues 3 steps per frame at 120 Hz', () => {
    const { steps } = advanceFixedTimestep(0, 1 / 120);
    expect(steps).toBe(3);
  });

  it('issues 12 steps per frame at 30 Hz', () => {
    const { steps } = advanceFixedTimestep(0, 1 / 30);
    expect(steps).toBe(12);
  });

  it('simulates the same amount of time per wall second on every refresh rate', () => {
    // The core guarantee: game speed must not depend on the display.
    const rates = [30, 60, 120, 144, 240];
    const totals = rates.map((hz) => totalStepsOver(1, hz).steps);
    for (const steps of totals) {
      // 1 s of wall time × SIM_TIME_SCALE ÷ fixed dt = 360 steps, ±1 rounding.
      expect(Math.abs(steps - 360)).toBeLessThanOrEqual(1);
    }
    // …and every rate agrees with every other rate (within float rounding).
    expect(Math.max(...totals) - Math.min(...totals)).toBeLessThanOrEqual(1);
  });

  it('carries leftover sub-step time instead of discarding it', () => {
    // Irregular frame times (a hitchy browser): simulated time must still
    // track wall time × SIM_TIME_SCALE within one fixed step.
    const dts = [0.010, 0.021, 0.016, 0.008, 0.033, 0.012, 0.019, 0.016, 0.027, 0.011];
    let acc = 0;
    let steps = 0;
    for (const dt of dts) {
      const paced = advanceFixedTimestep(acc, dt);
      acc = paced.accumulator;
      steps += paced.steps;
    }
    const wallTime = dts.reduce((a, b) => a + b, 0);
    const simulated = steps * FIXED_DT + acc;
    expect(simulated).toBeCloseTo(wallTime * SIM_TIME_SCALE, 6);
    // The remainder is always smaller than one step (nothing over-consumed).
    expect(acc).toBeGreaterThanOrEqual(0);
    expect(acc).toBeLessThan(FIXED_DT);
  });

  it('caps catch-up after a long hitch (no spiral of death)', () => {
    // The loop caps dt at 0.05 s; even a much larger value must not produce
    // an unbounded step count.
    const { steps, accumulator } = advanceFixedTimestep(0, 5.0);
    expect(steps).toBe(MAX_PHYSICS_STEPS);
    expect(accumulator).toBeLessThanOrEqual(MAX_PHYSICS_STEPS * FIXED_DT);
  });

  it('never returns a negative or fractional step count', () => {
    for (const dt of [0, 0.0001, 1 / 240, 1 / 60, 0.05]) {
      const { steps } = advanceFixedTimestep(0, dt);
      expect(Number.isInteger(steps)).toBe(true);
      expect(steps).toBeGreaterThanOrEqual(0);
    }
  });
});
