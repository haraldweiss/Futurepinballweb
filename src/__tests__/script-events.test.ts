import { expect, it, vi } from 'vitest';
vi.mock('../dmd', () => ({ dmdEvent: vi.fn() }));
import { runFPScript, callScriptFn } from '../script-engine';

it('dispatches begin, key and end events', () => {
  runFPScript([
    'Sub FuturePinball_BeginPlay()',
    '  AddDebugText "begin"',
    'End Sub',
    'Sub FuturePinball_KeyPressed(ByVal KeyCode)',
    '  AddDebugText CStr(KeyCode)',
    'End Sub',
    'Sub FuturePinball_EndPlay()',
    '  AddDebugText "end"',
    'End Sub',
  ].join('\n'));
  expect(callScriptFn('FuturePinball_BeginPlay')).toBe(true);
  expect(callScriptFn('FuturePinball_KeyPressed', 13)).toBe(true);
  expect(callScriptFn('FuturePinball_EndPlay')).toBe(true);
});

it('lets a script-defined function override the same-named API binding', () => {
  runFPScript([
    'Sub AddScore(points)',
    '  AddDebugText "custom"',
    'End Sub',
    'Sub FuturePinball_BeginPlay()',
    '  AddScore 5',
    'End Sub',
  ].join('\n'));
  expect(callScriptFn('FuturePinball_BeginPlay')).toBe(true);
});

it('binds unknown native table elements to placeholder objects', () => {
  runFPScript([
    'Sub FuturePinball_BeginPlay()',
    '  Player1Reel.SetValue 5',
    '  DummyTrigger.Enabled = True',
    '  LeftFlipper.SolenoidOn()',
    'End Sub',
  ].join('\n'));
  expect(callScriptFn('FuturePinball_BeginPlay')).toBe(true);
});

it('allows top-level calls to functions declared later', () => {
  runFPScript([
    'Check()',
    'Sub Check()',
    '  AddDebugText "called"',
    'End Sub',
  ].join('\n'));
  expect(callScriptFn('Check')).toBe(true);
});

it('resolves a function called from another function', () => {
  runFPScript([
    'Sub A()',
    '  B()',
    'End Sub',
    'Sub B()',
    '  AddDebugText "b"',
    'End Sub',
    'A()',
  ].join('\n'));
  expect(callScriptFn('A')).toBe(true);
  expect(callScriptFn('B')).toBe(true);
});
