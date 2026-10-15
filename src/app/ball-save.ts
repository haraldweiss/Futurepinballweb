import type { GameState } from '../types';

/** Arm the launch grace period once per ball, not once per saved-ball relaunch. */
export function armLaunchBallSave(state: Pick<GameState, 'ballSaveMode' | 'ballSaveTimer'>): void {
  if (state.ballSaveMode !== 'none') return;
  state.ballSaveMode = 'active';
  state.ballSaveTimer = 3.5;
}
