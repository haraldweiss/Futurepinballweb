// SPDX-License-Identifier: AGPL-3.0-or-later
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
vi.mock('../dmd', () => ({ dmdEvent: vi.fn() }));
import { buildFPScriptAPI, callScriptDrain, resetFPScript, runFPScript } from '../script-engine';
import { state } from '../game';
import { createScriptBall, parkNativeBall, resetBall } from '../app/game-state';

const log = () => document.querySelector('#script-log')!.textContent!;

beforeEach(() => {
  resetFPScript();
  state.score = 0;
  state.ballNum = 1;
  state.numPlayers = 0;
  state.nativeBallParked = false;
  state.inLane = true;
  document.body.innerHTML = '<div id="script-log"></div>';
});
afterEach(() => { resetFPScript(); });

it('dispatches native Drain_Hit and library-prefixed drain handlers', () => {
  runFPScript('Sub Drain_Hit()\n AddDebugText "native-drain"\nEnd Sub\n'
    + 'Sub PinMechSound_Drain_Hit()\n AddDebugText "sound-drain"\nEnd Sub');
  expect(callScriptDrain()).toBe(true);
  expect(log()).toContain('[Debug] native-drain');
  expect(log()).toContain('[Debug] sound-drain');
});

it('keeps the legacy demo drain names working', () => {
  runFPScript('Sub Table_BallDrain()\n AddDebugText "demo-drain"\nEnd Sub');
  expect(callScriptDrain()).toBe(true);
  expect(log()).toContain('[Debug] demo-drain');
});

it('does not treat unrelated drain timers as drain events', () => {
  runFPScript('Sub DrainTimer_Expired()\nEnd Sub');
  expect(callScriptDrain()).toBe(false);
});

it('parks the ball when a native drain handler owns the drain', () => {
  parkNativeBall();
  expect(state.nativeBallParked).toBe(true);
  expect(state.inLane).toBe(false);
  expect(state.ballPos.y).toBeLessThan(-10);
});

it('serves the next ball and advances the HUD only when the script requests it', () => {
  state.ballNum = 1;
  parkNativeBall();
  createScriptBall();
  expect(state.nativeBallParked).toBe(false);
  expect(state.inLane).toBe(true);
  expect(state.ballNum).toBe(2);
  expect(state.ballPos.x).toBeCloseTo(2.65);

  // A CreateBall while the ball is still in the lane must not consume a ball.
  createScriptBall();
  expect(state.ballNum).toBe(2);
});

it('resetBall clears the parked state', () => {
  parkNativeBall();
  resetBall();
  expect(state.nativeBallParked).toBe(false);
});

it('completes the native high-score flow after recording the score', () => {
  runFPScript('Sub FuturePinball_NameEntryComplete(ByVal Position, ByVal Special)\n'
    + ' AddDebugText "entry " & CStr(Position)\nEnd Sub');
  buildFPScriptAPI().EnterHighScore();
  expect(log()).toContain('[Debug] entry');
});

it('resets the HUD ball number when the native script ends the game', () => {
  state.ballNum = 3;
  state.numPlayers = 1;
  buildFPScriptAPI().EndGame();
  expect(state.ballNum).toBe(1);
  expect(state.numPlayers).toBe(0);
});
