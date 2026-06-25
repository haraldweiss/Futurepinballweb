/**
 * game-state.ts — Game state management functions.
 *
 * resetBall() resets ball position for a new ball.
 * resetGameState() resets all game state for a new table load.
 *
 * Extracted from main.ts.
 */
import { state, cb } from '../game';
import { getPhysicsWorker } from '../physics-worker-bridge';

/**
 * Reset ball position to the plunger lane.
 */
export function resetBall(): void {
  // Position ball ON TOP of plunger knob (knob world Y = -5.5) so plunger can push it
  // Knob top surface at -5.39, add ball radius 0.2 = -5.19 ≈ -5.2
  state.ballPos.set(2.65, -5.2, 0.3);
  state.ballVel.x = 0; state.ballVel.y = 0;
  state.inLane = true; state.tiltWarnings = 0; state.tiltActive = false;
  state.plungerCharge = 0; state.plungerCharging = false;

  try {
    const bridge = getPhysicsWorker();
    bridge.updateBallPosition(2.65, -5.2, 0, 0);
    bridge.setBallGravityScale(0.0);
  } catch { /* physics worker not ready */ }
}

/**
 * Reset full game state on table load.
 */
export function resetGameState(): void {
  state.score = 0;
  state.ballNum = 1;
  state.multiplier = 1;
  state.bumperHits = 0;
  state.inLane = true;
  state.tiltWarnings = 0;
  state.tiltActive = false;
  state.plungerCharge = 0;
  state.plungerCharging = false;
  state.ballSavesRemaining = 1;
  state.ballSaveMode = 'none';
  state.lastRank = 0;

  // Arcade Mode: Initialize player/coin system
  state.credits = 0;
  state.numPlayers = 0;
  state.currentPlayer = 0;
  state.playerScores = [0, 0, 0, 0];

  resetBall();
  cb.updateHUD();
}
