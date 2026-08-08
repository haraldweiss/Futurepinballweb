// SPDX-License-Identifier: AGPL-3.0-or-later
// © 2026 Harald Weiss

import { describe, it, expect, vi } from 'vitest';

// Mock dmd module to prevent canvas access in jsdom
vi.mock('../dmd', () => ({
  dmdEvent: vi.fn(),
  initDMD: vi.fn(),
}));

import { buildFPScriptAPI } from '../script-engine';
import { cb } from '../game/callbacks';

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
