import { afterEach, beforeEach, expect, it, vi } from 'vitest';
vi.mock('../dmd', () => ({ dmdEvent: vi.fn() }));
import { buildFPScriptAPI, callScriptFn, resetFPScript, runFPScript } from '../script-engine';
import { state } from '../game';

beforeEach(() => { resetFPScript(); state.score = 0; state.currentPlayer = 0; state.numPlayers = 0; state.playerScores = [0,0,0,0]; document.body.innerHTML = '<div id="script-log"></div>'; });
afterEach(() => { resetFPScript(); });

it('shares runtime settings across APIs and preserves script-owned statistics across BeginGame', () => {
  const api = buildFPScriptAPI();
  expect(api.nvBallsPerGame).toBe(3); expect(api.nvTotalGamesPlayed).toBe(0); expect(api.nvJackpot).toBe(0);
  api.nvBallsPerGame = 5; api.nvTotalGamesPlayed = 2; api.nvJackpot = 1200;
  api.BeginGame();
  const current = buildFPScriptAPI();
  expect(current.nvBallsPerGame).toBe(5); expect(current.nvTotalGamesPlayed).toBe(2); expect(current.nvJackpot).toBe(1200);
});

it('keeps settings and statistics live in delayed handlers, including case-insensitive names', () => {
  runFPScript('Sub StartRound()\n nvtotalgamesplayed = nvtotalgamesplayed + 1\n AddDebugText CStr(nvballspergame)\n nvjackpot = nvjackpot + 100\nEnd Sub');
  const api = buildFPScriptAPI(); api.nvBallsPerGame = 5; api.nvTotalGamesPlayed = 7; api.nvJackpot = 500;
  callScriptFn('StartRound'); callScriptFn('StartRound');
  expect(api.nvTotalGamesPlayed).toBe(9); expect(api.nvJackpot).toBe(700);
  expect(document.querySelector('#script-log')!.textContent).toContain('[Debug] 5');
  expect(document.querySelector('#script-log')!.textContent).not.toContain('Fehler:');
});

it('resets runtime settings on script reload instead of claiming persistence', () => {
  const api = buildFPScriptAPI(); api.nvTotalGamesPlayed = 8; api.nvJackpot = 100; api.nvBallsPerGame = 5;
  runFPScript('Sub Ping()\nEnd Sub');
  const fresh = buildFPScriptAPI();
  expect(fresh.nvTotalGamesPlayed).toBe(0); expect(fresh.nvJackpot).toBe(0); expect(fresh.nvBallsPerGame).toBe(3);
});

it('rejects invalid setting writes without changing the existing values', () => {
  const api = buildFPScriptAPI();
  expect(() => { api.nvBallsPerGame = 0; }).toThrow(RangeError);
  expect(() => { api.nvBallsPerGame = Infinity; }).toThrow(RangeError);
  expect(() => { api.nvTotalGamesPlayed = -1; }).toThrow(RangeError);
  expect(() => { api.nvJackpot = Number.MAX_SAFE_INTEGER + 1; }).toThrow(RangeError);
  expect(api.nvBallsPerGame).toBe(3); expect(api.nvTotalGamesPlayed).toBe(0); expect(api.nvJackpot).toBe(0);
});

it('shares scalar and indexed special scores and clears them only when a game begins', () => {
  runFPScript('Sub AwardSpecial()\n nvSpecialScore(2) = nvSpecialScore(2) + 50\n nvSpecialScore1 = 25\nEnd Sub');
  callScriptFn('AwardSpecial');
  const api = buildFPScriptAPI();
  expect(api.nvSpecialScore1).toBe(25); expect(api.nvSpecialScore2).toBe(50); expect(api.nvSpecialScore(2)).toBe(50);
  api.EndGame(); expect(api.nvSpecialScore2).toBe(50);
  api.BeginGame(); expect(api.nvSpecialScore1).toBe(0); expect(api.nvSpecialScore2).toBe(0);
  expect(() => api.nvSpecialScore(0)).toThrow(RangeError);
});

it('allocates a one-dimensional Dim array through its inclusive upper bound', () => {
  runFPScript('Dim remaining(4)\nSub PreparePlayers()\n AddDebugText CStr(UBound(remaining))\n For i = 1 To 4\n remaining(i) = 5\n Next\n AddDebugText CStr(remaining(4))\nEnd Sub');
  callScriptFn('PreparePlayers');
  expect(document.querySelector('#script-log')!.textContent).toContain('[Debug] 4');
  expect(document.querySelector('#script-log')!.textContent).toContain('[Debug] 5');
  expect(document.querySelector('#script-log')!.textContent).not.toContain('Fehler:');
});

it('shares top-level constants and variable initializers with deferred script handlers', () => {
  runFPScript('Const maxPlayers = 4\nDim configured\nconfigured = 5\nSub ReadSettings()\n AddDebugText CStr(maxPlayers)\n AddDebugText CStr(configured)\nEnd Sub');
  callScriptFn('ReadSettings');
  expect(document.querySelector('#script-log')!.textContent).toContain('[Debug] 4');
  expect(document.querySelector('#script-log')!.textContent).toContain('[Debug] 5');
  expect(document.querySelector('#script-log')!.textContent).not.toContain('Fehler:');
});

it('reads initialized arrays in conditions while preserving quoted array-like text', () => {
  runFPScript('Dim levels(4)\nSub CheckLevels()\n levels(1) = 2\n If levels(1) >= 2 Then AddDebugText "matched"\n AddDebugText "levels(1)"\nEnd Sub');
  callScriptFn('CheckLevels');
  expect(document.querySelector('#script-log')!.textContent).toContain('[Debug] matched');
  expect(document.querySelector('#script-log')!.textContent).toContain('[Debug] levels(1)');
  expect(document.querySelector('#script-log')!.textContent).not.toContain('Fehler:');
});

it('reads quoted numeric and nested array indexes without rewriting literal text', () => {
  runFPScript('Dim awards(4)\nSub ReadAwards()\n awards(1) = 2\n awards(2) = 7\n AddDebugText awards("2")\n AddDebugText awards(awards(1))\n AddDebugText "awards(2)"\nEnd Sub');
  callScriptFn('ReadAwards');
  const text = document.querySelector('#script-log')!.textContent!;
  expect(text.match(/\[Debug\] 7/g)).toHaveLength(2);
  expect(text).toContain('[Debug] awards(2)'); expect(text).not.toContain('Fehler:');
});

it('matches array uses case-insensitively and writes through call-style indexes', () => {
  runFPScript('Dim Awards(4)\nSub MixedCase()\n awards(CInt("2")) = 6\n AddDebugText CStr(AWARDS(2))\nEnd Sub');
  callScriptFn('MixedCase');
  const text = document.querySelector('#script-log')!.textContent!;
  expect(text).toContain('[Debug] 6');
  expect(text).not.toContain('Fehler:');
});

it('rejects bare replacement of callable indexed score properties', () => {
  const api = buildFPScriptAPI();
  api.nvSpecialScore(2);
  const mutable = api as unknown as Record<string, unknown>;
  expect(() => { mutable.nvScore = 5; }).toThrow(RangeError);
  expect(() => { mutable.nvSpecialScore = 0; }).toThrow(RangeError);
  expect(api.nvSpecialScore(2)).toBe(0);
  expect(() => api.nvSpecialScore(-1)).toThrow(RangeError);
});

it('keeps a pre-reset API writing into the current session defaults', () => {
  const stale = buildFPScriptAPI();
  stale.nvJackpot = 100;
  runFPScript('Sub Ping()\nEnd Sub');
  expect(stale.nvJackpot).toBe(0);
  expect(buildFPScriptAPI().nvJackpot).toBe(0);
});

it('validates setting writes made by delayed handlers', () => {
  runFPScript('Sub BadSettings()\n nvBallsPerGame = 0\nEnd Sub');
  callScriptFn('BadSettings');
  expect(document.querySelector('#script-log')!.textContent).toContain('Fehler:');
  expect(buildFPScriptAPI().nvBallsPerGame).toBe(3);
});
