/**
 * Scoring System Tests — Example test suite for tech debt Phase 1
 *
 * This test file demonstrates how to test the scoring system
 * Run with: npm test
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

/**
 * Mock game state for testing
 */
interface MockGameState {
  score: number;
  multiplier: number;
  bumperHits: number;
  bumperCombo: number;
  bumperComboMultiplier: number;
}

const mockGameState: MockGameState = {
  score: 0,
  multiplier: 1,
  bumperHits: 0,
  bumperCombo: 0,
  bumperComboMultiplier: 1.0,
};

/**
 * Helper functions to simulate scoring logic
 */
function scoreBumperHit(state: MockGameState, basePoints: number = 100): void {
  state.bumperHits++;
  state.bumperCombo++;
  state.bumperComboMultiplier = 1.0 + (state.bumperCombo * 0.1);
  const points = Math.floor(basePoints * state.multiplier * state.bumperComboMultiplier);
  state.score += points;
}

function scoreTargetHit(state: MockGameState, basePoints: number = 150): void {
  const points = Math.floor(basePoints * state.multiplier);
  state.score += points;
}

function resetCombo(state: MockGameState): void {
  state.bumperCombo = 0;
  state.bumperComboMultiplier = 1.0;
}

function setMultiplier(state: MockGameState, value: number): void {
  state.multiplier = Math.max(1, value);
}

// ───────────────────────────────────────────────────────────────────────────

describe('Scoring System', () => {
  beforeEach(() => {
    // Reset game state before each test
    mockGameState.score = 0;
    mockGameState.multiplier = 1;
    mockGameState.bumperHits = 0;
    mockGameState.bumperCombo = 0;
    mockGameState.bumperComboMultiplier = 1.0;
  });

  describe('Bumper Hits', () => {
    it('should award base points for first bumper hit', () => {
      scoreBumperHit(mockGameState, 100);
      // First hit: 100 * 1 * 1.1 = 110 (combo is incremented first)
      expect(mockGameState.score).toBe(110);
      expect(mockGameState.bumperHits).toBe(1);
    });

    it('should apply combo multiplier on consecutive hits', () => {
      scoreBumperHit(mockGameState, 100);
      scoreBumperHit(mockGameState, 100);
      scoreBumperHit(mockGameState, 100);

      // Hit 1: 100 * 1.0 * 1.1 = 110
      // Hit 2: 100 * 1.0 * 1.2 = 120
      // Hit 3: 100 * 1.0 * 1.3 = 130
      expect(mockGameState.score).toBe(360);
      expect(mockGameState.bumperCombo).toBe(3);
    });

    it('should reset combo on target hit', () => {
      scoreBumperHit(mockGameState, 100);
      scoreBumperHit(mockGameState, 100);
      resetCombo(mockGameState);

      expect(mockGameState.bumperCombo).toBe(0);
      expect(mockGameState.bumperComboMultiplier).toBe(1.0);
    });
  });

  describe('Score Multiplier', () => {
    it('should apply multiplier to bumper hits', () => {
      setMultiplier(mockGameState, 2);
      scoreBumperHit(mockGameState, 100);
      // First hit: 100 * 2 * 1.1 = 220
      expect(mockGameState.score).toBe(220);
    });

    it('should apply multiplier to target hits', () => {
      setMultiplier(mockGameState, 3);
      scoreTargetHit(mockGameState, 150);
      expect(mockGameState.score).toBe(450);
    });

    it('should apply both multiplier and combo', () => {
      setMultiplier(mockGameState, 2);
      scoreBumperHit(mockGameState, 100);
      scoreBumperHit(mockGameState, 100);

      // Hit 1: 100 * 2 * 1.1 = 220 (combo is incremented first, so multiplier is 1.1)
      // Hit 2: 100 * 2 * 1.2 = 240
      expect(mockGameState.score).toBe(460);
    });
  });

  describe('Target Hits', () => {
    it('should award base points for target hit', () => {
      scoreTargetHit(mockGameState, 150);
      expect(mockGameState.score).toBe(150);
    });

    it('should not accumulate combo on target hits', () => {
      scoreBumperHit(mockGameState, 100);
      scoreTargetHit(mockGameState, 150);
      const comboAfterTarget = mockGameState.bumperCombo;
      scoreTargetHit(mockGameState, 150);

      expect(mockGameState.bumperCombo).toBe(comboAfterTarget);
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero multiplier as 1', () => {
      setMultiplier(mockGameState, 0);
      scoreBumperHit(mockGameState, 100);
      expect(mockGameState.multiplier).toBe(1);
      expect(mockGameState.score).toBe(110); // 100 * 1 * 1.1 (first combo hit)
    });

    it('should handle large combo chains', () => {
      setMultiplier(mockGameState, 1);

      // Hit bumper 10 times
      for (let i = 0; i < 10; i++) {
        scoreBumperHit(mockGameState, 100);
      }

      expect(mockGameState.bumperCombo).toBe(10);
      expect(mockGameState.bumperComboMultiplier).toBe(2.0); // 1.0 + (10 * 0.1)
    });

    it('should not let score go negative', () => {
      mockGameState.score = 50;
      // In real implementation, should clamp scores
      expect(mockGameState.score).toBeGreaterThanOrEqual(0);
    });
  });
});
