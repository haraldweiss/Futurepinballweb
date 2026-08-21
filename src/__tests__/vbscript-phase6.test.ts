// SPDX-License-Identifier: AGPL-3.0-or-later
// © 2026 Harald Weiss

import { describe, it, expect, vi, afterEach } from 'vitest';

// Mock dmd module to prevent canvas access in jsdom
vi.mock('../dmd', () => ({
  dmdEvent: vi.fn(),
  initDMD: vi.fn(),
}));

import { buildFPScriptAPI } from '../script-engine';
import { cb } from '../game/callbacks';
import { gates, kickers, spinners, triggers } from '../game';

/**
 * Tests for VBScript API Phase 6: Gates, Kickers, Spinners, Triggers
 */
  // Helper: safely access Proxy-indexed properties (avoids TS7053 on Proxy get trap)
  const gateAt = (api: any, key: string) => api.Gates[key];
  const kickerAt = (api: any, key: string) => api.Kickers[key];
  const spinnerAt = (api: any, key: string) => api.Spinners[key];
  const triggerAt = (api: any, key: string) => api.Triggers[key];

describe('VBScript Phase 6: Gates', () => {
  it('Gates proxy returns indexed objects with 1-based Index', () => {
    const api = buildFPScriptAPI();
    expect(gateAt(api, '1').Index).toBe(1);
    expect(gateAt(api, '2').Index).toBe(2);
    expect(gateAt(api, '3').Index).toBe(3);
  });

  it('Gates have Enabled, Open(), Close() methods', () => {
    const api = buildFPScriptAPI();
    const gate = gateAt(api, '1');
    expect(gate.Enabled).toBe(true);
    expect(typeof gate.Open).toBe('function');
    expect(typeof gate.Close).toBe('function');
    expect(() => gate.Open()).not.toThrow();
    expect(() => gate.Close()).not.toThrow();
  });

  it('Gates.Open() triggers triggerGateHit callback', () => {
    cb.triggerGateHit = vi.fn();
    const api = buildFPScriptAPI();
    gateAt(api, '1').Open();
    expect(cb.triggerGateHit).toHaveBeenCalled();
  });
});

describe('VBScript Phase 6: Kickers', () => {
  it('Kickers proxy returns indexed objects', () => {
    const api = buildFPScriptAPI();
    expect(kickerAt(api, '1').Index).toBe(1);
    expect(kickerAt(api, '2').Index).toBe(2);
  });

  it('Kickers have Enabled and Fire() methods', () => {
    const api = buildFPScriptAPI();
    const kicker = kickerAt(api, '1');
    expect(kicker.Enabled).toBe(true);
    expect(typeof kicker.Fire).toBe('function');
    expect(() => kicker.Fire()).not.toThrow();
  });

  it('Kickers.Fire() triggers triggerKickerFire callback', () => {
    cb.triggerKickerFire = vi.fn();
    const api = buildFPScriptAPI();
    kickerAt(api, '1').Fire();
    expect(cb.triggerKickerFire).toHaveBeenCalled();
  });
});

describe('VBScript Phase 6: Spinners', () => {
  it('Spinners proxy returns indexed objects', () => {
    const api = buildFPScriptAPI();
    expect(spinnerAt(api, '1').Index).toBe(1);
    expect(spinnerAt(api, '2').Index).toBe(2);
  });

  it('Spinners have Enabled, Spin(), Stop() methods', () => {
    const api = buildFPScriptAPI();
    const spinner = spinnerAt(api, '1');
    expect(spinner.Enabled).toBe(true);
    expect(typeof spinner.Spin).toBe('function');
    expect(typeof spinner.Stop).toBe('function');
    expect(() => spinner.Spin()).not.toThrow();
    expect(() => spinner.Stop()).not.toThrow();
  });

  it('Spinners.Spin() triggers triggerSpinnerHit callback', () => {
    cb.triggerSpinnerHit = vi.fn();
    const api = buildFPScriptAPI();
    spinnerAt(api, '1').Spin();
    expect(cb.triggerSpinnerHit).toHaveBeenCalled();
  });
});

describe('VBScript Phase 6: Triggers', () => {
  it('Triggers proxy returns indexed objects', () => {
    const api = buildFPScriptAPI();
    expect(triggerAt(api, '1').Index).toBe(1);
    expect(triggerAt(api, '2').Index).toBe(2);
  });

  it('Triggers have Enabled and Fire() methods', () => {
    const api = buildFPScriptAPI();
    const trigger = triggerAt(api, '1');
    expect(trigger.Enabled).toBe(true);
    expect(typeof trigger.Fire).toBe('function');
    expect(() => trigger.Fire()).not.toThrow();
  });

  it('Triggers.Fire() triggers triggerTriggerHit callback', () => {
    cb.triggerTriggerHit = vi.fn();
    const api = buildFPScriptAPI();
    triggerAt(api, '1').Fire();
    expect(cb.triggerTriggerHit).toHaveBeenCalled();
  });
});

describe('VBScript Phase 6: Callbacks exist', () => {
  it('cb.triggerGateHit is a function', () => {
    expect(typeof cb.triggerGateHit).toBe('function');
  });

  it('cb.triggerKickerFire is a function', () => {
    expect(typeof cb.triggerKickerFire).toBe('function');
  });

  it('cb.triggerSpinnerHit is a function', () => {
    expect(typeof cb.triggerSpinnerHit).toBe('function');
  });

  it('cb.triggerTriggerHit is a function', () => {
    expect(typeof cb.triggerTriggerHit).toBe('function');
  });
});

describe('VBScript Phase 6: VBScript API integration', () => {
  // VBScript `Gates(1)` transpiles to `Gates['1']` (Proxy get trap)
  it("API call Gates['1'].Open triggers triggerGateHit", () => {
    cb.triggerGateHit = vi.fn();
    const api = buildFPScriptAPI();
    gateAt(api, '1').Open();
    expect(cb.triggerGateHit).toHaveBeenCalled();
  });

  it("API call Kickers['1'].Fire triggers triggerKickerFire", () => {
    cb.triggerKickerFire = vi.fn();
    const api = buildFPScriptAPI();
    kickerAt(api, '1').Fire();
    expect(cb.triggerKickerFire).toHaveBeenCalled();
  });

  it("API call Spinners['1'].Spin triggers triggerSpinnerHit", () => {
    cb.triggerSpinnerHit = vi.fn();
    const api = buildFPScriptAPI();
    spinnerAt(api, '1').Spin();
    expect(cb.triggerSpinnerHit).toHaveBeenCalled();
  });

  it("API call Triggers['1'].Fire triggers triggerTriggerHit", () => {
    cb.triggerTriggerHit = vi.fn();
    const api = buildFPScriptAPI();
    triggerAt(api, '1').Fire();
    expect(cb.triggerTriggerHit).toHaveBeenCalled();
  });
});
describe('VBScript Phase 6: GetElement by name', () => {
  afterEach(() => {
    gates.length = 0;
    kickers.length = 0;
    spinners.length = 0;
    triggers.length = 0;
  });

  const fakeMesh = (name: string) => ({ userData: { name }, position: { x: 0, y: 0, z: 0 }, visible: true } as any);

  it('GetElement("Gate0") resolves a gate descriptor', () => {
    const m = fakeMesh('Gate0');
    gates.push({ x: 1, y: 2, mesh: m });
    const el = buildFPScriptAPI().GetElement('Gate0');
    expect(el).not.toBeNull();
    expect(el).toMatchObject({ type: 'gate', index: 0, name: 'Gate0', x: 1, y: 2 });
    expect(el?.mesh).toBe(m);
  });

  it('GetElement("Kicker1") resolves the second kicker by name', () => {
    const m0 = fakeMesh('Kicker0');
    const m1 = fakeMesh('Kicker1');
    kickers.push({ x: 3, y: 4, mesh: m0 });
    kickers.push({ x: 9, y: 9, mesh: m1 });
    const el = buildFPScriptAPI().GetElement('Kicker1');
    expect(el).not.toBeNull();
    expect(el).toMatchObject({ type: 'kicker', index: 1, name: 'Kicker1', x: 9, y: 9 });
    expect(el?.mesh).toBe(m1);
  });

  it('GetElement("Spinner0") resolves a spinner descriptor', () => {
    const m = fakeMesh('Spinner0');
    spinners.push({ x: 5, y: 6, mesh: m });
    const el = buildFPScriptAPI().GetElement('Spinner0');
    expect(el).not.toBeNull();
    expect(el).toMatchObject({ type: 'spinner', index: 0, name: 'Spinner0', x: 5, y: 6 });
    expect(el?.mesh).toBe(m);
  });

  it('GetElement("Trigger0") resolves a trigger descriptor', () => {
    const m = fakeMesh('Trigger0');
    triggers.push({ x: 7, y: 8, mesh: m });
    const el = buildFPScriptAPI().GetElement('Trigger0');
    expect(el).not.toBeNull();
    expect(el).toMatchObject({ type: 'trigger', index: 0, name: 'Trigger0', x: 7, y: 8 });
    expect(el?.mesh).toBe(m);
  });

  it('GetElement returns null for an unknown element', () => {
    expect(buildFPScriptAPI().GetElement('NoSuchElement')).toBeNull();
  });

  it('GetElementCount returns per-type and total counts including Phase 6', () => {
    gates.push({ x: 0, y: 0, mesh: {} as any });
    kickers.push({ x: 0, y: 0, mesh: {} as any });
    const api = buildFPScriptAPI();
    expect(api.GetElementCount('gate')).toBe(1);
    expect(api.GetElementCount('kicker')).toBe(1);
    expect(api.GetElementCount('spinner')).toBe(0);
    expect(api.GetElementCount('trigger')).toBe(0);
    expect(api.GetElementCount('all')).toBe(2);
  });

  it('ListElements("all") includes Phase 6 elements', () => {
    gates.push({ x: 0, y: 0, mesh: {} as any });
    const api = buildFPScriptAPI();
    const list = api.ListElements('all');
    expect(list.some((e: any) => e.type === 'gate' && e.name === 'Gate0')).toBe(true);
  });
});
