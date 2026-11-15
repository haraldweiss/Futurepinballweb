import { afterEach, beforeEach, expect, it, vi } from 'vitest';
vi.mock('../dmd', () => ({ dmdEvent: vi.fn() }));
vi.mock('../coin-system/dmd-renderer', () => ({ updateCoinDisplay: vi.fn() }));
import { runFPScript, resetFPScript, dispatchFPScriptKey, buildFPScriptAPI } from '../script-engine';
import { state } from '../game';
import { addCoin, startGame } from '../coin-system/coin-handler';
import { resetCoinSystem, getCoinSystemState, isGameStarted } from '../coin-system/api';
import { showCoinScreen } from '../coin-system/screen-manager';
import { usesNativeCoinRules } from '../script/rule-ownership';
import { handleArcadeKey } from '../app/arcade-input';
import { resetGameState } from '../app/game-state';

beforeEach(() => { vi.useFakeTimers(); resetFPScript(); resetCoinSystem(); state.credits = 0; state.score = 0; state.numPlayers = 0; state.currentPlayer = 0; state.playerScores = [0,0,0,0]; document.body.innerHTML = '<div id="script-log"></div>'; });
afterEach(() => { resetFPScript(); resetCoinSystem(); vi.useRealTimers(); });
const keyboard = (code: string, key: string, extra: KeyboardEventInit = {}) => new KeyboardEvent('keydown', { code, key, ...extra });
function nativeRules() {
  runFPScript([
    'Sub FuturePinball_KeyPressed(ByVal code)',
    ' If code = GetKeyCode(InsertCoinKey) Then nvCredits = nvCredits + 1',
    ' If code = GetKeyCode(StartGameKey) And nvCredits > 0 Then',
    '  nvCredits = nvCredits - 1',
    '  BeginGame',
    '  nvScore1 = 777',
    ' End If',
    'End Sub',
  ].join('\n'));
}

it('lets native rules credit once and preserves the native start score', () => {
  nativeRules(); const coin = keyboard('Digit5', '5');
  dispatchFPScriptKey(coin, true); handleArcadeKey(coin);
  expect(state.credits).toBe(1); expect(getCoinSystemState().coinsInserted).toBe(0);
  const start = keyboard('Digit1', '1'); dispatchFPScriptKey(start, true); handleArcadeKey(start);
  expect(state.credits).toBe(0); expect(state.score).toBe(777); expect(isGameStarted()).toBe(true);
});

it('blocks host coin/start/screen paths while native rules own them', () => {
  nativeRules(); state.credits = 4;
  addCoin(); startGame(); showCoinScreen(); vi.advanceTimersByTime(30000);
  expect(state.credits).toBe(4); expect(state.numPlayers).toBe(0);
  expect(getCoinSystemState().coinScreenVisible).toBe(false);
  expect(isGameStarted()).toBe(false);
  const api = buildFPScriptAPI(); api.BeginGame(); expect(isGameStarted()).toBe(true);
  api.EndGame(); expect(isGameStarted()).toBe(false);
});

it('keeps failed native scripts from silently enabling demo rules', () => {
  runFPScript('Sub FuturePinball_KeyPressed(ByVal code)\n Execute "unsafe"\nEnd Sub\nMissingCall()');
  expect(usesNativeCoinRules()).toBe(true);
  handleArcadeKey(keyboard('Digit5', '5')); expect(state.credits).toBe(0);
  expect(document.querySelector('#script-log')!.textContent).toMatch(/Script-Fehler|Script blocked/);
});

it('returns to demo rules on reset and leaves legacy handlers in demo mode', () => {
  nativeRules(); resetFPScript(); expect(usesNativeCoinRules()).toBe(false);
  runFPScript('Sub KeyPressed(ByVal code)\nEnd Sub'); expect(usesNativeCoinRules()).toBe(false);
  handleArcadeKey(keyboard('Digit5', '5')); expect(state.credits).toBe(1);
});

it('credits the configurable demo coin key and initializes players once at start', () => {
  showCoinScreen(); handleArcadeKey(keyboard('KeyC', 'c'));
  expect(state.credits).toBe(1); expect(getCoinSystemState().coinsInserted).toBe(1);
  handleArcadeKey(keyboard('Digit1', '1'));
  expect(state.credits).toBe(0); expect(state.numPlayers).toBe(1); expect(state.currentPlayer).toBe(1);
  expect(state.playerScores).toEqual([0,0,0,0]); expect(isGameStarted()).toBe(true);
});

it('spends demo credits once for capped multiplayer and retains unused credits', () => {
  addCoin(); addCoin(); addCoin(); startGame(2);
  expect(state.numPlayers).toBe(2); expect(state.credits).toBe(1);
  expect(getCoinSystemState().coinsInserted).toBe(1);
  state.score = 123; startGame(4);
  expect(state.numPlayers).toBe(1); expect(state.credits).toBe(0); expect(state.score).toBe(0);
  expect(startGame(1)).toBe(false);
});

it('does not credit repeat/modifier keys or start with an invalid player count', () => {
  handleArcadeKey(keyboard('Digit5', '5', { repeat: true }));
  handleArcadeKey(keyboard('Digit5', '5', { ctrlKey: true }));
  expect(state.credits).toBe(0);
  addCoin(); expect(startGame(NaN)).toBe(false); expect(state.credits).toBe(1); expect(state.numPlayers).toBe(0);
});

it('dispatches native handlers case-insensitively while retaining ownership', () => {
  runFPScript('Sub futurepinball_keypressed(ByVal code)\n nvCredits = nvCredits + 1\nEnd Sub');
  const coin = keyboard('Digit5', '5'); dispatchFPScriptKey(coin, true); handleArcadeKey(coin);
  expect(usesNativeCoinRules()).toBe(true); expect(state.credits).toBe(1);
  expect(getCoinSystemState().coinsInserted).toBe(0);
});

it('detects a continued native declaration before compilation', () => {
  runFPScript('Sub _\n FuturePinball_KeyPressed(ByVal code)\n nvCredits = nvCredits + 1\nEnd Sub');
  const coin = keyboard('Digit5', '5'); dispatchFPScriptKey(coin, true); handleArcadeKey(coin);
  expect(usesNativeCoinRules()).toBe(true); expect(state.credits).toBe(1);
  expect(getCoinSystemState().coinsInserted).toBe(0);
});

it('does not run a legacy key fallback after the native handler throws', () => {
  runFPScript('Sub FuturePinball_KeyPressed(ByVal code)\n nvCredits = nvCredits + 1\n MissingCall()\nEnd Sub\nSub KeyPressed(ByVal code)\n nvCredits = nvCredits + 10\nEnd Sub');
  dispatchFPScriptKey(keyboard('Digit5', '5'), true);
  expect(state.credits).toBe(1);
  expect(document.querySelector('#script-log')!.textContent).toContain('Fehler:');
});

it('clears demo credit and started state through the common imported-table reset', () => {
  addCoin(); addCoin(); addCoin(); startGame(1);
  expect(state.credits).toBe(2); expect(isGameStarted()).toBe(true);
  resetGameState();
  expect(getCoinSystemState().coinsInserted).toBe(0); expect(isGameStarted()).toBe(false);
  handleArcadeKey(keyboard('Digit5', '5')); expect(state.credits).toBe(1);
});
