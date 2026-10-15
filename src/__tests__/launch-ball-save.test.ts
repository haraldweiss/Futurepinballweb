import { describe, expect, it } from 'vitest';
import { armLaunchBallSave } from '../app/ball-save';
import type { GameState } from '../types';

describe('launch ball-save window', () => {
  it('arms the initial launch of a new ball', () => {
    const state = { ballSaveMode: 'none', ballSaveTimer: 0 } satisfies Pick<GameState, 'ballSaveMode' | 'ballSaveTimer'>;
    armLaunchBallSave(state);
    expect(state.ballSaveMode).toBe('active');
    expect(state.ballSaveTimer).toBe(3.5);
  });
  it.each(['active', 'exhausted'] as const)('does not replenish a %s save on every relaunch', mode => {
    const state = { ballSaveMode: mode, ballSaveTimer: 0 } satisfies Pick<GameState, 'ballSaveMode' | 'ballSaveTimer'>;
    armLaunchBallSave(state);
    expect(state.ballSaveTimer).toBe(0);
  });
  it('preserves a script-provided or still-running save window', () => {
    const state = { ballSaveMode: 'active', ballSaveTimer: 1.2 } satisfies Pick<GameState, 'ballSaveMode' | 'ballSaveTimer'>;
    armLaunchBallSave(state);
    expect(state.ballSaveTimer).toBe(1.2);
  });
});
