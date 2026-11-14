import { afterEach, expect, it, vi } from 'vitest';
vi.mock('../dmd', () => ({ dmdEvent: vi.fn() }));
import { buildFPScriptAPI, runFPScript } from '../script-engine';
import { fptResources } from '../game';

const elements = [
  { name: 'LeftFlipper1', type: 7, kind: 'flipper', x: 144.5, y: 917.5 },
  { name: 'Signal', type: 3, kind: 'light', x: 258, y: 550 },
];
afterEach(() => {
  delete fptResources.nativeElements;
  document.body.innerHTML = '';
});

it('shares direct element state with a case-insensitive BAM name lookup', () => {
  fptResources.nativeElements = elements;
  const api = buildFPScriptAPI();
  const direct = api.__element('LeftFlipper1');
  direct.Strength = 73;
  const info = api.xBAM.FindObject('leftflipper1');
  expect(info.Exist).toBe(true);
  expect(info.Name).toBe('LeftFlipper1');
  expect(info.X).toBe(144.5);
  expect(info.Y).toBe(917.5);
  expect(info.Strength).toBe(73);
  info.Strength = 82;
  expect(direct.Strength).toBe(82);
});

it('uses verified native type IDs when an older decoder supplies a conflicting label', () => {
  fptResources.nativeElements = [{ ...elements[0], kind: 'rail' }];
  const api = buildFPScriptAPI();
  const direct = api.__element('LeftFlipper1');
  direct.Strength = 73;
  expect(api.xBAM.FindObject('LeftFlipper1').Strength).toBe(73);
});

it('shares reel values and digits when scripts use either binding and property casing', () => {
  fptResources.nativeElements = [{ name: 'ScoreReel', type: 25, kind: 'reel', x: 10, y: 20 }];
  const api = buildFPScriptAPI();
  const direct = api.__element('ScoreReel');
  const found = api.xBAM.FindObject('scorereel');
  found.value = 42;
  found.digits = 5;
  expect(direct.Value).toBe(42);
  expect(direct.Digits).toBe(5);
  direct.SetScore(81);
  expect(found.score).toBe(81);
});

it('retains extension properties and material requests while warning about unsupported physics', () => {
  document.body.innerHTML = '<div id="script-log"></div>';
  fptResources.nativeElements = elements;
  const api = buildFPScriptAPI();
  api.xBAM.CreateAllExt();
  const ext = api.__element('LeftFlipper1Ext');
  ext.mass = 5;
  ext.ExtInt1 = 7;
  ext.SetMaterial(0.8, 1, 0.2, 0.1);
  const found = api.xBAM.FindObject('LEFTFLIPPER1');
  expect(found.Mass).toBe(5);
  expect(found.ExtInt1).toBe(7);
  expect(found.PhysicsMaterial).toEqual({ elasticity: 0.8, softness: 1, staticFriction: 0.2, kineticFriction: 0.1 });
  expect(document.querySelector('#script-log')!.textContent).toMatch(/SetMaterial.*not applied.*physics/i);
});

it('does not report missing or case-colliding names as existing objects', () => {
  fptResources.nativeElements = [...elements, { ...elements[0], name: 'LEFTFLIPPER1' }];
  const api = buildFPScriptAPI();
  expect(api.xBAM.FindObject('Missing').Exist).toBe(false);
  expect(api.xBAM.FindObject('LeftFlipper1').Exist).toBe(false);
  expect(() => api.xBAM.FindObject('Missing').SetMaterial(1, 1, 1, 1)).toThrow(/missing/i);
});

it('diagnoses coordinate lookup rather than inventing native matching rules', () => {
  fptResources.nativeElements = elements;
  expect(() => buildFPScriptAPI().xBAM.FindObject(258, 550, 3)).toThrow(/coordinate.*unsupported/i);
});

it('keeps extension state within one script session', () => {
  fptResources.nativeElements = elements;
  buildFPScriptAPI().xBAM.FindObject('Signal').ExtInt1 = 12;
  expect(buildFPScriptAPI().xBAM.FindObject('Signal').ExtInt1).toBe(0);
});

it('does not confuse an actual name ending in Ext with another element extension', () => {
  fptResources.nativeElements = [...elements, { name: 'LeftFlipper1Ext', type: 3, kind: 'light', x: 10, y: 20 }];
  const api = buildFPScriptAPI();
  const light = api.__element('LeftFlipper1Ext');
  light.State = 1;
  expect(api.xBAM.FindObject('LeftFlipper1Ext').State).toBe(1);
  expect(api.xBAM.FindObject('LeftFlipper1Ext').X).toBe(10);
  expect(api.xBAM.FindObject('LeftFlipper1').State).not.toBe(1);
});

it('binds CreateAllExt names to imported elements inside a real script', () => {
  document.body.innerHTML = '<div id="script-log"></div>';
  fptResources.nativeElements = elements;
  runFPScript([
    'xBAM.CreateAllExt()',
    'LeftFlipper1.Strength = 73',
    'LeftFlipper1Ext.ExtInt1 = 19',
    'Dim found : Set found = xBAM.FindObject("leftflipper1")',
    'AddDebugText CStr(found.Strength)',
    'AddDebugText CStr(found.ExtInt1)',
  ].join('\n'));
  const log = document.querySelector('#script-log')!.textContent!;
  expect(log).toContain('[Debug] 73');
  expect(log).toContain('[Debug] 19');
  expect(log).not.toMatch(/Script-Fehler|Script blocked/);
});
