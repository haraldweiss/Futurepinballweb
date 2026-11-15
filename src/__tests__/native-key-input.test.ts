import { afterEach, expect, it, vi } from 'vitest';
vi.mock('../dmd', () => ({ dmdEvent: vi.fn() }));
import { runFPScript, resetFPScript, dispatchFPScriptKey, releaseFPScriptKeys, buildFPScriptAPI } from '../script-engine';
import { fptResources, state, keys } from '../game';
import { releaseHeldControls } from '../app/key-release';

const key = (code: string, extra: KeyboardEventInit = {}) => new KeyboardEvent('keydown', { code, ...extra });
afterEach(() => { resetFPScript(); document.body.innerHTML = ''; delete fptResources.nativeElements; state.score = 0; });
function load(body: string[]) {
  document.body.innerHTML = '<div id="script-log"></div>';
  runFPScript(body.join('\n'));
}

it('matches separate flipper actions through GetKeyCode and suppresses repeated presses', () => {
  load([
    'Sub FuturePinball_KeyPressed(ByVal code)',
    ' If code = GetKeyCode(LeftFlipperKey) Then AddScore 10',
    ' If code = GetKeyCode(RightFlipperKey) Then AddScore 100',
    'End Sub',
    'Sub FuturePinball_KeyReleased(ByVal code)',
    ' If code = GetKeyCode(LeftFlipperKey) Then AddScore 1',
    'End Sub',
  ]);
  dispatchFPScriptKey(key('ShiftLeft', { key: 'Shift', location: 1, keyCode: 16 }), true);
  dispatchFPScriptKey(key('ShiftLeft', { repeat: true }), true);
  dispatchFPScriptKey(key('ShiftRight', { key: 'Shift', location: 2, keyCode: 16 }), true);
  expect(state.score).toBe(110);
  dispatchFPScriptKey(key('ShiftLeft'), false);
  dispatchFPScriptKey(key('ShiftLeft'), false);
  expect(state.score).toBe(111);
});

it('matches native coin/start/plunger defaults and literal J scan codes', () => {
  load([
    'Sub FuturePinball_KeyPressed(ByVal code)',
    ' If code = GetKeyCode(InsertCoinKey) Then AddScore 1',
    ' If code = GetKeyCode(StartGameKey) Then AddScore 10',
    ' If code = GetKeyCode(PlungerKey) Then AddScore 100',
    ' If code = 36 Then AddScore 1000',
    'End Sub',
  ]);
  for (const code of ['Digit5', 'Digit1', 'Enter', 'KeyJ']) dispatchFPScriptKey(key(code), true);
  expect(state.score).toBe(1111);
});

it('releases held native keys once on focus loss and forgets them on script reset', () => {
  load(['Sub FuturePinball_KeyReleased(ByVal code)', ' AddScore 1', 'End Sub']);
  dispatchFPScriptKey(key('ShiftLeft'), true); dispatchFPScriptKey(key('Enter'), true);
  releaseFPScriptKeys(); releaseFPScriptKeys(); expect(state.score).toBe(2);
  dispatchFPScriptKey(key('ShiftRight'), true); resetFPScript();
  load(['Sub FuturePinball_KeyReleased(ByVal code)', ' AddScore 100', 'End Sub']);
  releaseFPScriptKeys(); expect(state.score).toBe(2);
});

it('ignores editor presses but releases a key held before the editor gained focus', () => {
  load(['Sub FuturePinball_KeyPressed(ByVal code)', ' AddScore 10', 'End Sub',
    'Sub FuturePinball_KeyReleased(ByVal code)', ' AddScore 1', 'End Sub']);
  dispatchFPScriptKey(key('KeyJ'), true);
  const editor = document.createElement('textarea'); document.body.append(editor);
  const editing = key('KeyK'); Object.defineProperty(editing, 'target', { value: editor });
  dispatchFPScriptKey(editing, true);
  const releasing = key('KeyJ'); Object.defineProperty(releasing, 'target', { value: editor });
  dispatchFPScriptKey(releasing, false);
  expect(state.score).toBe(11);
});

it('preserves legacy virtual-key handlers and ignores unsupported physical keys', () => {
  load(['Sub KeyPressed(ByVal code)', ' AddScore code', 'End Sub']);
  dispatchFPScriptKey(key('Enter', { keyCode: 13 }), true);
  dispatchFPScriptKey(key('Unidentified', { keyCode: 900 }), true);
  expect(state.score).toBe(13);
});

it('reports unsupported named actions instead of treating enum IDs as scan codes', () => {
  load([]); const api = buildFPScriptAPI();
  expect(api.LeftFlipperKey).toBe(0); expect(api.ServiceKey).toBe(16);
  expect(api.GetKeyCode(api.LeftFlipperKey)).toBe(42);
  expect(api.GetKeyCode(api.ServiceKey)).toBe(0);
  expect(document.querySelector('#script-log')!.textContent).toContain('GetKeyCode unsupported');
});

it('binds action names and GetKeyCode case-insensitively without changing script-owned names', () => {
  load(['Sub FuturePinball_KeyPressed(ByVal code)',
    ' If code = getkeycode(leftflipperkey) Then AddScore 25', 'End Sub']);
  dispatchFPScriptKey(key('ShiftLeft'), true); expect(state.score).toBe(25);
});

it('ignores composing and unknown physical codes without inventing scan codes', () => {
  load(['Sub FuturePinball_KeyPressed(ByVal code)', ' AddScore 1', 'End Sub']);
  dispatchFPScriptKey(key('KeyJ', { isComposing: true }), true);
  dispatchFPScriptKey(key('constructor'), true);
  expect(state.score).toBe(0);
});

it('cancels stored plunger power and disables each held legacy flipper on focus loss', () => {
  load(['Sub LeftFlipper_Disabled()', ' AddScore 1', 'End Sub',
    'Sub RightFlipper_Disabled()', ' AddScore 10', 'End Sub']);
  keys.left = true; keys.right = true; state.plungerCharging = true; state.plungerCharge = 0.8;
  releaseHeldControls(); releaseHeldControls();
  expect(keys).toEqual({ left: false, right: false });
  expect(state.plungerCharging).toBe(false); expect(state.plungerCharge).toBe(0);
  expect(state.score).toBe(11);
});
