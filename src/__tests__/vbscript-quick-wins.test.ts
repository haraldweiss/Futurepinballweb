// SPDX-License-Identifier: AGPL-3.0-or-later
/**
 * Tests für VBScript Quick Wins: Table Info + Player + Ball + DMD
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { cb } from '../game/callbacks';

// Mock dmdEvent before importing script-engine
vi.mock('../dmd', () => ({
  dmdEvent: vi.fn(),
}));

import { buildFPScriptAPI } from '../script-engine';

describe('VBScript Quick Wins: Table Info', () => {
  let api: ReturnType<typeof buildFPScriptAPI>;

  beforeEach(() => {
    api = buildFPScriptAPI();
  });

  it('GetTableWidth returns standard FP width', () => {
    expect(typeof api.GetTableWidth).toBe('function');
    expect(api.GetTableWidth()).toBe(50.8);
  });

  it('GetTableHeight returns standard FP height', () => {
    expect(typeof api.GetTableHeight).toBe('function');
    expect(api.GetTableHeight()).toBe(114.0);
  });

  it('TableName returns a string', () => {
    expect(typeof api.TableName).toBe('function');
    expect(typeof api.TableName()).toBe('string');
  });
});

describe('VBScript Quick Wins: Player Score', () => {
  let api: ReturnType<typeof buildFPScriptAPI>;

  beforeEach(() => {
    api = buildFPScriptAPI();
  });

  it('AddPlayerScore is defined', () => {
    expect(typeof api.AddPlayerScore).toBe('function');
  });

  it('AddPlayerScore adds points without throwing', () => {
    expect(() => api.AddPlayerScore(1, 1000)).not.toThrow();
    expect(() => api.AddPlayerScore(2, 500)).not.toThrow();
    expect(() => api.AddPlayerScore(0, 100)).not.toThrow();
  });

  it('AddPlayerScore handles negative points gracefully', () => {
    expect(() => api.AddPlayerScore(1, -100)).not.toThrow();
  });
});

describe('VBScript Quick Wins: Ball Control', () => {
  let api: ReturnType<typeof buildFPScriptAPI>;

  beforeEach(() => {
    api = buildFPScriptAPI();
  });

  it('AddBall is defined', () => {
    expect(typeof api.AddBall).toBe('function');
  });

  it('AddBall calls launchMultiBall', () => {
    const spy = vi.spyOn(cb, 'launchMultiBall');
    api.AddBall(2);
    expect(spy).toHaveBeenCalledTimes(2);
    spy.mockRestore();
  });

  it('AddBall defaults to 1 ball', () => {
    const spy = vi.spyOn(cb, 'launchMultiBall');
    api.AddBall();
    expect(spy).toHaveBeenCalledTimes(1);
    spy.mockRestore();
  });

  it('GetBallCount is defined', () => {
    expect(typeof api.GetBallCount).toBe('function');
  });

  it('GetBallCount returns at least 1', () => {
    expect(api.GetBallCount()).toBeGreaterThanOrEqual(1);
  });
});

describe('VBScript Quick Wins: DMD Control', () => {
  let api: ReturnType<typeof buildFPScriptAPI>;

  beforeEach(() => {
    api = buildFPScriptAPI();
  });

  it('DMDClear is defined', () => {
    expect(typeof api.DMDClear).toBe('function');
  });

  it('DMDClear calls dmdEvent', async () => {
    const { dmdEvent } = await import('../dmd');
    api.DMDClear();
    expect(dmdEvent).toHaveBeenCalledWith('');
  });
});

// ─── Additional tests for mittelfristige improvements ───

describe('VBScript Proxy Stubs with real callbacks', () => {
  let api: ReturnType<typeof buildFPScriptAPI>;

  beforeEach(() => {
    api = buildFPScriptAPI();
  });

  it('Bumpers[1].Fire triggers triggerBumperFlash', () => {
    const spy = vi.spyOn(cb, 'triggerBumperFlash');
    (api.Bumpers as any)[1].Fire();
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it('Ramps["Ramp1"].Fire triggers triggerRampCompletion', () => {
    const spy = vi.spyOn(cb, 'triggerRampCompletion');
    (api.Ramps as any)['Ramp1'].Fire();
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it('Lights["L1"].TurnOn calls setLampState with intensity 1', () => {
    const spy = vi.spyOn(cb, 'setLampState');
    (api.Lights as any)['L1'].TurnOn();
    expect(spy).toHaveBeenCalledWith('L1', 1);
    spy.mockRestore();
  });

  it('Lights["L1"].TurnOff calls setLampState with intensity 0', () => {
    const spy = vi.spyOn(cb, 'setLampState');
    (api.Lights as any)['L1'].TurnOff();
    expect(spy).toHaveBeenCalledWith('L1', 0);
    spy.mockRestore();
  });
});

describe('VBScript Coil/Solenoid callbacks', () => {
  let api: ReturnType<typeof buildFPScriptAPI>;

  beforeEach(() => {
    api = buildFPScriptAPI();
  });

  it('FireCoil calls cb.fireCoil', () => {
    const spy = vi.spyOn(cb, 'fireCoil');
    api.FireCoil('Kicker1');
    expect(spy).toHaveBeenCalledWith('Kicker1');
    spy.mockRestore();
  });

  it('SolenoidOn calls cb.solenoidOn', () => {
    const spy = vi.spyOn(cb, 'solenoidOn');
    api.SolenoidOn('Gate1');
    expect(spy).toHaveBeenCalledWith('Gate1');
    spy.mockRestore();
  });

  it('SolenoidOff calls cb.solenoidOff', () => {
    const spy = vi.spyOn(cb, 'solenoidOff');
    api.SolenoidOff('Gate1');
    expect(spy).toHaveBeenCalledWith('Gate1');
    spy.mockRestore();
  });
});

describe('VBScript PlaySound3D', () => {
  let api: ReturnType<typeof buildFPScriptAPI>;

  beforeEach(() => {
    api = buildFPScriptAPI();
  });

  it('PlaySound3D is defined', () => {
    expect(typeof api.PlaySound3D).toBe('function');
  });

  it('PlaySound3D accepts name, x, y without throwing', () => {
    expect(() => api.PlaySound3D('bumper', 1.0, 2.0)).not.toThrow();
  });

  it('StopSound3D is defined', () => {
    expect(typeof api.StopSound3D).toBe('function');
  });
});
