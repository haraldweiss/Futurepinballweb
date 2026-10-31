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
