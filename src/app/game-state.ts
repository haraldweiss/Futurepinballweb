/**
 * game-state.ts — Game state management functions.
 *
 * resetBall() resets ball position for a new ball.
 * resetGameState() resets all game state for a new table load.
 *
 * Extracted from main.ts.
 */
import { state, cb, physics } from '../game';
import { getPhysicsWorker } from '../physics-worker-bridge';
import { callScriptFn, resetFPScript } from '../script-engine';
import { resetCoinSystem } from '../coin-system/api';

/**
 * Reset ball position to the plunger lane.
 */
export function resetBall(): void {
  // Position ball ON TOP of plunger knob (knob world Y = -5.5) so plunger can push it
  // Knob top surface at -5.39, add ball radius 0.2 = -5.19 ≈ -5.2
  state.nativeBallParked = false;
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
 * Remove the ball from play when a native table script owns the drain.
 * The script decides whether/when to request the next ball via CreateBall.
 */
export function parkNativeBall(): void {
  state.nativeBallParked = true;
  state.inLane = false;
  state.ballPos.set(0, -20, 0);
  state.ballVel.x = 0; state.ballVel.y = 0;
  try {
    const bridge = getPhysicsWorker();
    bridge.updateBallPosition(0, -20, 0, 0);
    bridge.setBallGravityScale(0);
  } catch { /* physics worker not ready */ }
  if (physics?.ballBody) {
    physics.ballBody.setTranslation({ x: 0, y: -20, z: 0 }, true);
    physics.ballBody.setLinvel({ x: 0, y: 0, z: 0 }, true);
  }
}

/**
 * Serve a ball for a native kicker's CreateBall request.
 * A parked ball means the script ended the previous ball; the next request
 * advances the HUD ball number. Any other request is a multiball feed.
 */
export function createScriptBall(): void {
  if (state.nativeBallParked) {
    state.nativeBallParked = false;
    state.ballNum = Math.min(state.ballNum + 1, 99);
    resetBall();
    cb.updateHUD();
    cb.dmdEvent(`BALL ${state.ballNum}`);
    return;
  }
  if (state.inLane) { resetBall(); return; }
  cb.launchMultiBall();
}

/**
 * Reset full game state on table load.
 */
export function resetGameState(): void {
  callScriptFn('FuturePinball_EndPlay') || callScriptFn('_EndPlay');
  resetFPScript();
  resetCoinSystem();
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
  state.ballSaveTimer = 0;
  state.lastRank = 0;

  // Arcade Mode: Initialize player/coin system
  state.credits = 0;
  state.numPlayers = 0;
  state.currentPlayer = 0;
  state.playerScores = [0, 0, 0, 0];

  resetBall();
  cb.updateHUD();
}
