import { expect, it } from 'vitest';
import { vbsToJS } from '../utils/vbs-transpiler';

it('strips VBScript parameter modifiers', () => {
  const js = vbsToJS([
    'Sub FuturePinball_KeyPressed(ByVal KeyCode)',
    'End Sub',
    'Function Pick(ByRef value, Optional fallback = 5)',
    'End Function',
  ].join('\n'));
  expect(js).toContain('function FuturePinball_KeyPressed(KeyCode) {');
  expect(js).toContain('function Pick(value, fallback = 5) {');
  expect(js).not.toContain('ByVal');
  expect(js).not.toContain('ByRef');
});

it('wraps command-style calls whose argument contains a nested call', () => {
  const js = vbsToJS('AddDebugText CStr(KeyCode)\nFoo a, B(1)\n');
  expect(js).toContain('AddDebugText(String(KeyCode));');
  expect(js).toContain('Foo(a, B(1));');
});

it('handles native script patterns: operators, arrays, cases and comments', () => {
  const js = vbsToJS([
    "' comment with : colon",
    'Option Explicit',
    'Dim arr(8,4)',
    'If Position <> 0 Then arr(1) = 1 : End If',
    'If x =< 0 Then y = 1 Else y = 2',
    "Select Case n",
    'Case 1: AddScore 10',
    'Case Else',
    'End Select',
    'On Error Resume Next',
    'On Error GoTo 0',
    'Sub EmptyArgs',
    '  Foo "a", , 3',
    'End Sub',
  ].join('\n'));
  expect(js).toContain('//  comment with : colon');
  expect(js).toContain('// Option Explicit');
  expect(js).toContain('let arr;');
  expect(js).toContain('Position !== 0');
  expect(js).toContain('x <= 0');
  expect(js).toContain('case 1:');
  expect(js).toContain('AddScore(10);');
  expect(js).toContain('try {');
  expect(js).toContain('} catch (e) { /* ignored */ }');
  expect(js).toContain('Foo("a", undefined, 3);');
});
