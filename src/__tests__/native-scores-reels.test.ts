import { afterEach, expect, it, vi } from 'vitest';
vi.mock('../dmd', () => ({ dmdEvent: vi.fn() }));
import { buildFPScriptAPI, callScriptFn, runFPScript, resetFPScript } from '../script-engine';
import { fptResources, state, setFpScriptHandlers } from '../game';
import { resetGameState } from '../app/game-state';

afterEach(() => {
  state.playerScores = [0, 0, 0, 0]; state.score = 0; state.credits = 0; state.currentPlayer = 0;
  delete fptResources.nativeElements;
  setFpScriptHandlers({}); document.body.innerHTML = '';
  resetFPScript(); vi.useRealTimers();
});

it('updates native score aliases and indexed scores through a delayed script handler', () => {
  document.body.innerHTML = '<div id="script-log"></div>';
  state.currentPlayer = 2;
  runFPScript([
    'Sub Award()',
    ' nvScore(CurrentPlayer) = nvScore(CurrentPlayer) + 125',
    ' nvScore1 = 30',
    ' AddDebugText CStr(nvScore2)',
    'End Sub',
  ].join('\n'));
  // The existing physics/scoring path writes the active HUD score directly.
  state.score = 500;
  expect(callScriptFn('Award')).toBe(true);
  expect(state.playerScores).toEqual([30, 625, 0, 0]);
  expect(state.score).toBe(625);
  expect(document.querySelector('#script-log')!.textContent).toContain('[Debug] 625');
});

it('preserves script-owned player variables while leaving native score getters live', () => {
  document.body.innerHTML = '<div id="script-log"></div>';
  runFPScript([
    'Dim CurrentPlayer',
    'CurrentPlayer = 2',
    'Sub ReadScore()',
    ' AddDebugText CStr(nvScore(CurrentPlayer))',
    'End Sub',
  ].join('\n'));
  state.playerScores[1] = 75;
  expect(callScriptFn('ReadScore')).toBe(true);
  expect(document.querySelector('#script-log')!.textContent).toContain('[Debug] 75');
});

it('does not mistake commas in loop initializers for native property declarations', () => {
  document.body.innerHTML = '<div id="script-log"></div>';
  runFPScript([
    'Sub Check()',
    ' For i = Max(0, CurrentPlayer) To 2',
    '  AddDebugText CStr(i)',
    ' Next',
    'End Sub',
  ].join('\n'));
  state.currentPlayer = 2;
  expect(callScriptFn('Check')).toBe(true);
  expect(document.querySelector('#script-log')!.textContent).toContain('[Debug] 2');
});

it('keeps credits, current player and existing API getters live between events', () => {
  document.body.innerHTML = '<div id="script-log"></div>';
  runFPScript([
    'Sub Coin()',
    ' nvCredits = nvCredits + 1',
    ' AddDebugText CStr(CurrentPlayer)',
    ' AddDebugText CStr(fpGameInPlay)',
    'End Sub',
  ].join('\n'));
  state.currentPlayer = 3; state.credits = 4; state.numPlayers = 3;
  expect(callScriptFn('Coin')).toBe(true);
  expect(state.credits).toBe(5);
  expect(document.querySelector('#script-log')!.textContent).toContain('[Debug] 3');
  expect(document.querySelector('#script-log')!.textContent).toContain('[Debug] true');
  state.numPlayers = 0;
});

it('separates reel score from bulb state and supports native add/reset methods', () => {
  const reel = buildFPScriptAPI().__element('Player1Reel');
  reel.SetValue(1250);
  reel.State = 0;
  expect(reel.Value).toBe(1250);
  expect(reel.State).toBe(0);
  reel.AddValue(75);
  expect(reel.Value).toBe(1325);
  reel.ResetToZero();
  expect(reel.Value).toBe(0);
});

it('ends the runtime game without erasing the final player scores', () => {
  const api = buildFPScriptAPI();
  api.BeginGame();
  api.nvScore1 = 125;
  expect(api.fpGameInPlay).toBe(true);
  api.EndGame();
  expect(api.fpGameInPlay).toBe(false);
  expect(api.nvScore1).toBe(125);
});

it('accepts case-insensitive native indexed score and reel member spelling', () => {
  document.body.innerHTML = '<div id="script-log"></div>';
  fptResources.nativeElements = [{ name: 'Player1Reel', type: 25, kind: 'reel', x: 0, y: 0 }];
  runFPScript('nvscore(1) = 90\nPlayer1Reel.setvalue NVSCORE1\nPlayer1Reel.addvalue 5');
  expect(state.playerScores[0]).toBe(90);
  expect(document.querySelector('output')?.textContent).toBe('0000095');
});

it('renders imported reel values as text and preserves them when lighting changes', () => {
  fptResources.nativeElements = [{ name: 'Player1Reel', type: 25, kind: 'reel', x: 0, y: 0 }];
  const reel = buildFPScriptAPI().__element('Player1Reel');
  reel.Count = 5;
  reel.SetValue(125);
  const panel = document.querySelector('[aria-label="Table displays"]');
  expect(panel).not.toBeNull();
  expect(panel!.textContent).toContain('Player1Reel');
  expect(panel!.querySelector('output')!.textContent).toBe('00125');
  reel.State = 0;
  expect(panel!.querySelector('output')!.textContent).toBe('00125');
  reel.AddValue(25);
  expect(panel!.querySelector('output')!.textContent).toBe('00150');
});

it('removes old script handlers and visible displays when changing tables', () => {
  fptResources.nativeElements = [{ name: 'Player1Reel', type: 25, kind: 'reel', x: 0, y: 0 }];
  runFPScript('Sub Award()\nPlayer1Reel.SetValue 125\nEnd Sub');
  expect(callScriptFn('Award')).toBe(true);
  expect(document.querySelector('[aria-label="Table displays"]')).not.toBeNull();
  resetGameState();
  expect(callScriptFn('Award')).toBe(false);
  expect(document.querySelector('[aria-label="Table displays"]')).toBeNull();
});

it('cancels the previous table timer before same-named handlers are registered', () => {
  vi.useFakeTimers();
  runFPScript('WatchTimer.Interval = 10\nWatchTimer.Enabled = True\nSub WatchTimer_Expired()\nnvScore1 = nvScore1 + 1\nEnd Sub');
  vi.advanceTimersByTime(10);
  expect(state.playerScores[0]).toBe(1);
  resetGameState();
  runFPScript('Sub WatchTimer_Expired()\nnvScore1 = 99\nEnd Sub');
  vi.advanceTimersByTime(30);
  expect(state.playerScores[0]).toBe(0);
});
