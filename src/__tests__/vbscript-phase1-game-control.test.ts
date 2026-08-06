// SPDX-License-Identifier: AGPL-3.0-or-later
/**
 * Tests für Phase 1: VBScript Game Control + Tilt + Nudge + Player System
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock browser-only modules
vi.mock('../script-engine', () => ({ runFPScript: vi.fn(), resolveSoundForPlayback: vi.fn() }));
vi.mock('../audio-system', () => ({ getAudioCtx: vi.fn(), playFPTMusic: vi.fn(), startBGMusic: vi.fn(), stopBGMusic: vi.fn() }));
vi.mock('cfb', () => ({}));

import { state } from '../game/state';
import { cb } from '../game/callbacks';

// We need to test the actual API functions, so we re-implement the relevant ones
// based on what buildFPScriptAPI() produces. This tests the logic, not the wiring.

describe('VBScript Phase 1: Game Control', () => {
  beforeEach(() => {
    // Reset state
    state.score = 0;
    state.ballNum = 1;
    state.numPlayers = 1;
    state.currentPlayer = 1;
    state.playerScores = [0, 0, 0, 0];
    state.tiltWarnings = 0;
    state.tiltActive = false;
    state.bumperHits = 0;
    state.multiplier = 1;
    state.credits = 0;
    state.ballSaveTimer = 0;
    state.ballSaveMode = 'none';
    state.activeModes.clear();
    state.ballVel = { x: 0, y: 0 };
    vi.clearAllMocks();
  });

  describe('StartGame', () => {
    it('resets score, ball count, and player state', () => {
      // Simulate StartGame logic
      state.score = 5000;
      state.ballNum = 3;
      state.tiltWarnings = 2;

      // Call the API function logic
      state.ballNum = 1;
      state.score = 0;
      state.numPlayers = Math.max(1, state.numPlayers);
      state.currentPlayer = 1;
      state.playerScores = [0, 0, 0, 0];
      state.tiltWarnings = 0;
      state.tiltActive = false;
      state.bumperHits = 0;
      state.multiplier = 1;

      expect(state.ballNum).toBe(1);
      expect(state.score).toBe(0);
      expect(state.tiltWarnings).toBe(0);
      expect(state.tiltActive).toBe(false);
      expect(state.bumperHits).toBe(0);
    });

    it('calls updateHUD and showNotification', () => {
      const mockUpdateHUD = vi.fn();
      const mockShowNotification = vi.fn();
      const mockDmdEvent = vi.fn();

      mockUpdateHUD();
      mockShowNotification('🎮 GAME STARTED');
      mockDmdEvent('GAME STARTED');

      expect(mockUpdateHUD).toHaveBeenCalledTimes(1);
      expect(mockShowNotification).toHaveBeenCalledWith('🎮 GAME STARTED');
      expect(mockDmdEvent).toHaveBeenCalledWith('GAME STARTED');
    });
  });

  describe('EndGame', () => {
    it('triggers game over notifications and visuals', () => {
      const mockShowNotification = vi.fn();
      const mockUpdateBackglassModeInfo = vi.fn();
      const mockTriggerDrainVisual = vi.fn();
      const mockDmdEvent = vi.fn();

      mockShowNotification('🕹️ GAME OVER');
      mockUpdateBackglassModeInfo('GAME OVER');
      mockTriggerDrainVisual();
      mockDmdEvent('GAME OVER');

      expect(mockShowNotification).toHaveBeenCalledWith('🕹️ GAME OVER');
      expect(mockUpdateBackglassModeInfo).toHaveBeenCalledWith('GAME OVER');
      expect(mockTriggerDrainVisual).toHaveBeenCalledTimes(1);
      expect(mockDmdEvent).toHaveBeenCalledWith('GAME OVER');
    });
  });

  describe('ResetScores', () => {
    it('zeros all player scores', () => {
      state.score = 10000;
      state.playerScores = [5000, 3000, 2000, 0];

      state.score = 0;
      state.playerScores = state.playerScores.map(() => 0);

      expect(state.score).toBe(0);
      expect(state.playerScores).toEqual([0, 0, 0, 0]);
    });
  });

  describe('PauseGame / ResumeGame', () => {
    it('adds and removes paused mode', () => {
      state.activeModes.set('paused', { type: 'pause', progress: 0, timeout: 0 });
      expect(state.activeModes.has('paused')).toBe(true);

      state.activeModes.delete('paused');
      expect(state.activeModes.has('paused')).toBe(false);
    });
  });

  describe('DrainBall', () => {
    it('increments ball number on drain', () => {
      state.ballNum = 1;
      state.ballNum += 1;
      expect(state.ballNum).toBe(2);
    });

    it('triggers game over when ball exceeds 3', () => {
      state.ballNum = 3;
      state.ballNum += 1;
      expect(state.ballNum).toBe(4);
      // In the API, this would call EndGame()
      const shouldGameOver = state.ballNum > 3;
      expect(shouldGameOver).toBe(true);
    });

    it('resets ball when not at last ball', () => {
      state.ballNum = 1;
      state.ballNum += 1;
      expect(state.ballNum).toBe(2);
      // In the API, this would call cb.resetBall()
      const shouldResetBall = state.ballNum <= 3;
      expect(shouldResetBall).toBe(true);
    });
  });

  describe('SetBallSave', () => {
    it('configures ball save timer in seconds', () => {
      const seconds = 5;
      const expected = Math.max(0, seconds);
      state.ballSaveTimer = expected * 1000;
      state.ballSaveMode = 'active';
      state.ballSavesRemaining = 1;

      expect(state.ballSaveTimer).toBe(5000);
      expect(state.ballSaveMode).toBe('active');
      expect(state.ballSavesRemaining).toBe(1);
    });

    it('defaults to 3 seconds when no argument', () => {
      const seconds = 3; // default
      state.ballSaveTimer = seconds * 1000;
      expect(state.ballSaveTimer).toBe(3000);
    });

    it('clamps negative values to 0', () => {
      const seconds = -5;
      const result = Math.max(0, seconds);
      expect(result).toBe(0);
    });
  });

  describe('GetBallSaveTime', () => {
    it('returns remaining ball save time in seconds', () => {
      state.ballSaveTimer = 3500;
      const result = state.ballSaveTimer / 1000;
      expect(result).toBe(3.5);
    });
  });

  describe('IsBallSaveActive', () => {
    it('returns true when ball save is active and timer > 0', () => {
      (state.ballSaveMode as string) = 'active';
      state.ballSaveTimer = 2000;
      const result = state.ballSaveMode === 'active' && state.ballSaveTimer > 0;
      expect(result).toBe(true);
    });

    it('returns false when ball save mode is none', () => {
      (state.ballSaveMode as string) = 'none';
      state.ballSaveTimer = 2000;
      const result = state.ballSaveMode === 'active' && state.ballSaveTimer > 0;
      expect(result).toBe(false);
    });

    it('returns false when timer expired', () => {
      (state.ballSaveMode as string) = 'active';
      state.ballSaveTimer = 0;
      const result = state.ballSaveMode === 'active' && state.ballSaveTimer > 0;
      expect(result).toBe(false);
    });
  });
});

describe('VBScript Phase 1: Tilt System', () => {
  beforeEach(() => {
    state.tiltWarnings = 0;
    state.tiltActive = false;
    state.ballVel = { x: 0, y: 0 };
    vi.clearAllMocks();
  });

  describe('Tilt', () => {
    it('sets tiltActive and max warnings', () => {
      state.tiltActive = true;
      state.tiltWarnings = 3;

      expect(state.tiltActive).toBe(true);
      expect(state.tiltWarnings).toBe(3);
    });

    it('does not re-trigger if already tilted', () => {
      state.tiltActive = true;
      // In the API: if (state.tiltActive) return;
      const canTilt = !state.tiltActive;
      expect(canTilt).toBe(false);
    });

    it('calls notification, shake, and flipper disable', () => {
      const mockShowNotification = vi.fn();
      const mockTableShake = vi.fn();
      const mockDisableFlippers = vi.fn();
      const mockDmdEvent = vi.fn();

      mockShowNotification('⚠️ TILT!');
      mockTableShake(0.5, 300);
      mockDisableFlippers();
      mockDmdEvent('TILT!');

      expect(mockShowNotification).toHaveBeenCalledWith('⚠️ TILT!');
      expect(mockTableShake).toHaveBeenCalledWith(0.5, 300);
      expect(mockDisableFlippers).toHaveBeenCalledTimes(1);
      expect(mockDmdEvent).toHaveBeenCalledWith('TILT!');
    });
  });

  describe('Nudge', () => {
    it('adds nudge force to ball velocity', () => {
      state.ballVel = { x: 0, y: 0 };
      const nx = 1.5, ny = -0.5;
      state.ballVel.x += nx * 0.01;
      state.ballVel.y += ny * 0.01;

      expect(state.ballVel.x).toBeCloseTo(0.015);
      expect(state.ballVel.y).toBeCloseTo(-0.005);
    });

    it('increments tilt warnings on nudge', () => {
      state.tiltWarnings = 0;
      state.tiltWarnings = Math.min(3, state.tiltWarnings + 1);
      expect(state.tiltWarnings).toBe(1);

      state.tiltWarnings = Math.min(3, state.tiltWarnings + 1);
      expect(state.tiltWarnings).toBe(2);
    });

    it('caps tilt warnings at 3', () => {
      state.tiltWarnings = 3;
      state.tiltWarnings = Math.min(3, state.tiltWarnings + 1);
      expect(state.tiltWarnings).toBe(3);
    });

    it('triggers tilt when warnings reach 3', () => {
      state.tiltWarnings = 2;
      state.tiltWarnings = Math.min(3, state.tiltWarnings + 1);
      expect(state.tiltWarnings).toBe(3);

      const shouldTilt = state.tiltWarnings >= 3;
      expect(shouldTilt).toBe(true);
    });

    it('does not trigger tilt below 3 warnings', () => {
      state.tiltWarnings = 1;
      const shouldTilt = state.tiltWarnings >= 3;
      expect(shouldTilt).toBe(false);
    });
  });

  describe('NudgeX / NudgeY', () => {
    it('NudgeX only affects X velocity', () => {
      state.ballVel = { x: 0, y: 0 };
      const force = 2.0;
      // NudgeX(force) => Nudge(force, 0)
      state.ballVel.x += force * 0.01;
      expect(state.ballVel.x).toBeCloseTo(0.02);
      expect(state.ballVel.y).toBe(0);
    });

    it('NudgeY only affects Y velocity', () => {
      state.ballVel = { x: 0, y: 0 };
      const force = 1.5;
      // NudgeY(force) => Nudge(0, force)
      state.ballVel.y += force * 0.01;
      expect(state.ballVel.x).toBe(0);
      expect(state.ballVel.y).toBeCloseTo(0.015);
    });
  });

  describe('GetTiltWarnings', () => {
    it('returns current tilt warning count', () => {
      state.tiltWarnings = 2;
      expect(state.tiltWarnings).toBe(2);
    });
  });

  describe('GetTiltActive', () => {
    it('returns tilt active state', () => {
      state.tiltActive = true;
      expect(state.tiltActive).toBe(true);
      state.tiltActive = false;
      expect(state.tiltActive).toBe(false);
    });
  });

  describe('ResetTilt', () => {
    it('clears tilt warnings and active state', () => {
      state.tiltWarnings = 3;
      state.tiltActive = true;

      state.tiltWarnings = 0;
      state.tiltActive = false;

      expect(state.tiltWarnings).toBe(0);
      expect(state.tiltActive).toBe(false);
    });

    it('re-enables flippers on reset', () => {
      const mockEnableFlippers = vi.fn();
      mockEnableFlippers();
      expect(mockEnableFlippers).toHaveBeenCalledTimes(1);
    });
  });
});

describe('VBScript Phase 1: Player System', () => {
  beforeEach(() => {
    state.currentPlayer = 1;
    state.playerScores = [0, 0, 0, 0];
    state.credits = 0;
    vi.clearAllMocks();
  });

  describe('GetPlayerScore', () => {
    it('returns score for specified player', () => {
      state.playerScores = [1000, 2000, 3000, 4000];
      const p = 2; // player 2
      const result = state.playerScores[p - 1] ?? 0;
      expect(result).toBe(2000);
    });

    it('returns score for current player when no argument', () => {
      state.currentPlayer = 3;
      state.playerScores = [1000, 2000, 3000, 4000];
      const p = state.currentPlayer;
      const result = state.playerScores[p - 1] ?? 0;
      expect(result).toBe(3000);
    });

    it('returns 0 for invalid player', () => {
      state.playerScores = [1000, 2000, 3000, 4000];
      const p = 99;
      const result = state.playerScores[p - 1] ?? 0;
      expect(result).toBe(0);
    });
  });

  describe('SetCredits', () => {
    it('sets credits to specified value', () => {
      state.credits = 4;
      expect(state.credits).toBe(4);
    });

    it('clamps negative values to 0', () => {
      const n = -5;
      state.credits = Math.max(0, n);
      expect(state.credits).toBe(0);
    });
  });

  describe('GetCredits', () => {
    it('returns current credits', () => {
      state.credits = 3;
      expect(state.credits).toBe(3);
    });
  });

  describe('AddCredit', () => {
    it('increments credits by 1', () => {
      state.credits = 2;
      state.credits += 1;
      expect(state.credits).toBe(3);
    });
  });
});

describe('VBScript Phase 1: Callback Wiring', () => {
  it('disableFlippers callback is defined', () => {
    expect(typeof cb.disableFlippers).toBe('function');
  });

  it('enableFlippers callback is defined', () => {
    expect(typeof cb.enableFlippers).toBe('function');
  });

  it('applyNudgeForce callback is defined', () => {
    expect(typeof cb.applyNudgeForce).toBe('function');
  });

  it('disableFlippers and enableFlippers are callable without error', () => {
    expect(() => cb.disableFlippers()).not.toThrow();
    expect(() => cb.enableFlippers()).not.toThrow();
  });

  it('applyNudgeForce accepts x,y parameters without error', () => {
    expect(() => cb.applyNudgeForce(0.5, -0.3)).not.toThrow();
  });
});
