// SPDX-License-Identifier: AGPL-3.0-or-later
/**
 * Tests für Phase 5: VBScript Physics + Material Control
 * (No mocks needed — testing callback logic directly)
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { cb } from '../game/callbacks';

describe('VBScript Phase 5: Physics + Material Control', () => {
  describe('setMaterial callback', () => {
    it('is defined as a function', () => {
      expect(typeof cb.setMaterial).toBe('function');
    });

    it('accepts objName and material parameters', () => {
      expect(() => cb.setMaterial('Bumper1', 'Rubber')).not.toThrow();
      expect(() => cb.setMaterial('FlipperL', 'Metal')).not.toThrow();
    });

    it('accepts various material names', () => {
      expect(() => cb.setMaterial('Ramp1', 'Plastic')).not.toThrow();
      expect(() => cb.setMaterial('Target1', 'Wood')).not.toThrow();
    });
  });

  describe('setElasticity callback', () => {
    it('is defined as a function', () => {
      expect(typeof cb.setElasticity).toBe('function');
    });

    it('accepts numeric elasticity values', () => {
      expect(() => cb.setElasticity(0.85)).not.toThrow();
      expect(() => cb.setElasticity(0)).not.toThrow();
      expect(() => cb.setElasticity(1)).not.toThrow();
    });
  });

  describe('setFriction callback', () => {
    it('is defined as a function', () => {
      expect(typeof cb.setFriction).toBe('function');
    });

    it('accepts numeric friction values', () => {
      expect(() => cb.setFriction(0.3)).not.toThrow();
      expect(() => cb.setFriction(0)).not.toThrow();
      expect(() => cb.setFriction(1)).not.toThrow();
    });
  });

  describe('tableShake callback (used by ShakeTable)', () => {
    it('is defined as a function', () => {
      expect(typeof cb.tableShake).toBe('function');
    });

    it('accepts magnitude and duration parameters', () => {
      expect(() => cb.tableShake(1.0, 200)).not.toThrow();
      expect(() => cb.tableShake(0.5, 100)).not.toThrow();
    });
  });
});
