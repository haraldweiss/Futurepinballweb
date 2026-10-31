import { beforeEach, expect, it, vi } from 'vitest';
vi.mock('../dmd', () => ({ dmdEvent: vi.fn() }));
import { buildFPScriptAPI } from '../script-engine';
import { state } from '../game/state';

beforeEach(() => { localStorage.clear(); state.score = 0; state.ballNum = 1; state.numPlayers = 0; state.tiltActive = false; state.tiltWarnings = 0; });

it('exposes native IScriptGlobal names used by real tables', () => {
  const api = buildFPScriptAPI();
  expect(typeof api.AddDebugText).toBe('function');
  expect(typeof api.LogDebugTextToDisk).toBe('function');
  expect(api.GetKeyCode()).toBe(0);
  expect(api.fpGameInPlay).toBe(false);
  expect(api.fpTilted).toBe(false);
  expect(api.fpTiltWarnings).toBe(0);
  expect(api.fpBallID).toBe(1);
  expect(api.fpEventID).toBe(0);
  expect(api.fpInitialJackpot).toBe(0);
  expect(api.LoadExternalScript('x')).toBe(false);
  expect(() => api.EffectMusic('m', 1)).not.toThrow();
  expect(() => api.LookAtPlayfield()).not.toThrow();
  expect(() => api.LookAtBackbox()).not.toThrow();
});

it('maps BeginGame to game start and records a high score', () => {
  state.numPlayers = 1;
  state.score = 1234;
  const api = buildFPScriptAPI();
  api.BeginGame();
  expect(state.ballNum).toBe(1);
  expect(state.score).toBe(0);
  expect(api.fpGameInPlay).toBe(true);
  state.score = 5000;
  expect(api.EnterHighScore()).toBeGreaterThan(0);
  expect(api.SortHighScores()).toContain(5000);
});

it('provides a restricted Eval for object-existence checks', () => {
  const api = buildFPScriptAPI();
  expect(api.Eval('IsObject("FizXDMD")')).toBe(true);
  expect(api.Eval('IsEmpty("x")')).toBe(false);
  expect(api.Eval('1 + 1')).toBeUndefined();
});
