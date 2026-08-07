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
