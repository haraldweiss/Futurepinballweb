// SPDX-License-Identifier: AGPL-3.0-or-later
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
vi.mock('../dmd', () => ({ dmdEvent: vi.fn() }));
import {
  resetFPScript, runFPScript, callScriptFn, callScriptBumper, callScriptSlingshot,
} from '../script-engine';
import { cb } from '../game';

const log = () => document.querySelector('#script-log')!.textContent!;

beforeEach(() => {
  resetFPScript();
  cb.createBall = () => {};
  cb.setFlipperSolenoid = () => {};
  document.body.innerHTML = '<div id="script-log"></div>';
});
afterEach(() => { resetFPScript(); });

it('routes native flipper solenoids to host flipper control', () => {
  const events: Array<[string, boolean]> = [];
  cb.setFlipperSolenoid = (side, enabled) => { events.push([side, enabled]); };
  runFPScript('Sub Press()\n LeftFlipper.SolenoidOn\n RightFlipper.SolenoidOn\n LeftFlipper.SolenoidOff\nEnd Sub');
  callScriptFn('Press');
  expect(events).toEqual([['left', true], ['right', true], ['left', false]]);
});

it('pulses a flipper solenoid on and releases it through the host callback', () => {
  vi.useFakeTimers();
  const events: Array<[string, boolean]> = [];
  cb.setFlipperSolenoid = (side, enabled) => { events.push([side, enabled]); };
  runFPScript('Sub Pulse()\n RightFlipper.SolenoidPulse\nEnd Sub');
  callScriptFn('Pulse');
  expect(events).toEqual([['right', true]]);
  vi.advanceTimersByTime(200);
  expect(events).toEqual([['right', true], ['right', false]]);
  vi.useRealTimers();
});

it('asks the host for a ball when a native kicker calls CreateBall', () => {
  let requests = 0;
  cb.createBall = () => { requests++; };
  runFPScript('Sub Create()\n PlungerKicker.CreateBall\nEnd Sub');
  callScriptFn('Create');
  expect(requests).toBe(1);
  expect(log()).toContain('PlungerKicker.CreateBall');
});

it('dispatches suffixed native slingshot handlers by side', () => {
  runFPScript('Sub LeftSlingshotRubber_Hit()\n AddDebugText "left-sling"\nEnd Sub\n'
    + 'Sub RightSlingshotRubber_Hit()\n AddDebugText "right-sling"\nEnd Sub');
  expect(callScriptSlingshot('left')).toBe(true);
  expect(log()).toContain('[Debug] left-sling');
  expect(log()).not.toContain('[Debug] right-sling');
});

it('dispatches library-prefixed bumper handlers', () => {
  runFPScript('Sub PinMechSound_Bumper1_Hit()\n AddDebugText "bumper-one"\nEnd Sub');
  expect(callScriptBumper(0)).toBe(true);
  expect(log()).toContain('[Debug] bumper-one');
});

it('reports no handler for elements the table does not implement', () => {
  runFPScript('Sub Unrelated()\nEnd Sub');
  expect(callScriptSlingshot('left')).toBe(false);
  expect(callScriptBumper(0)).toBe(false);
});
