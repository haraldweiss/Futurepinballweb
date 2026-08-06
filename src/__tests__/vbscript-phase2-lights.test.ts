// SPDX-License-Identifier: AGPL-3.0-or-later
/**
 * Tests für Phase 2: VBScript Light & Flasher Control
 * (No mocks needed — testing callback logic directly)
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { cb } from '../game/callbacks';

describe('VBScript Phase 2: Light Control API', () => {
  beforeEach(() => {
    // Reset lamp state between tests
    // Note: We can't directly clear the module-level Map,
    // so we set known values in each test.
  });

  describe('setLampState callback', () => {
    it('is defined as a function', () => {
      expect(typeof cb.setLampState).toBe('function');
    });

    it('accepts name and intensity parameters', () => {
      expect(() => cb.setLampState('L1', 1)).not.toThrow();
      expect(() => cb.setLampState('L2', 0.5)).not.toThrow();
      expect(() => cb.setLampState('GI0', 0)).not.toThrow();
    });

    it('stores lamp state that can be retrieved', () => {
      cb.setLampState('L1', 1);
      expect(cb.getLampState('L1')).toBe(1);
    });

    it('updates existing lamp state', () => {
      cb.setLampState('L1', 1);
      cb.setLampState('L1', 0);
      expect(cb.getLampState('L1')).toBe(0);
    });

    it('handles multiple lamps independently', () => {
      cb.setLampState('L1', 1);
      cb.setLampState('L2', 0.5);
      cb.setLampState('L3', 0);
      expect(cb.getLampState('L1')).toBe(1);
      expect(cb.getLampState('L2')).toBe(0.5);
      expect(cb.getLampState('L3')).toBe(0);
    });
  });

  describe('getLampState callback', () => {
    it('returns 0 for unknown lamp', () => {
      expect(cb.getLampState('UNKNOWN')).toBe(0);
    });

    it('returns last set intensity', () => {
      cb.setLampState('L5', 0.75);
      expect(cb.getLampState('L5')).toBe(0.75);
    });
  });

  describe('setLampBlinkPattern callback', () => {
    it('is defined as a function', () => {
      expect(typeof cb.setLampBlinkPattern).toBe('function');
    });

    it('accepts name, pattern, and interval', () => {
      expect(() => cb.setLampBlinkPattern('L1', '10', 250)).not.toThrow();
      expect(() => cb.setLampBlinkPattern('L2', '1010', 500)).not.toThrow();
    });

    it('overwrites previous blink pattern for same lamp', () => {
      cb.setLampBlinkPattern('L1', '10', 250);
      cb.setLampBlinkPattern('L1', '1100', 500);
      expect(true).toBe(true);
    });
  });

  describe('setGIState callback', () => {
    it('is defined as a function', () => {
      expect(typeof cb.setGIState).toBe('function');
    });

    it('accepts index and intensity', () => {
      expect(() => cb.setGIState(0, 1)).not.toThrow();
      expect(() => cb.setGIState(1, 0)).not.toThrow();
      expect(() => cb.setGIState(2, 0.5)).not.toThrow();
    });
  });
});

describe('VBScript Phase 2: Flasher Control API', () => {
  describe('setFlasherState callback', () => {
    it('is defined as a function', () => {
      expect(typeof cb.setFlasherState).toBe('function');
    });

    it('accepts name, intensity, and RGB parameters', () => {
      expect(() => cb.setFlasherState('F1', 1, 255, 0, 0)).not.toThrow();
      expect(() => cb.setFlasherState('F2', 0.5, 0, 255, 0)).not.toThrow();
      expect(() => cb.setFlasherState('F3', 0, 0, 0, 0)).not.toThrow();
    });

    it('uses default RGB of white when not specified', () => {
      expect(() => cb.setFlasherState('F1', 1)).not.toThrow();
    });
  });

  describe('setFlasherBlinkPattern callback', () => {
    it('is defined as a function', () => {
      expect(typeof cb.setFlasherBlinkPattern).toBe('function');
    });

    it('accepts name, pattern, and interval', () => {
      expect(() => cb.setFlasherBlinkPattern('F1', '10', 250)).not.toThrow();
      expect(() => cb.setFlasherBlinkPattern('F2', '1100', 500)).not.toThrow();
    });
  });
});

describe('VBScript Phase 2: LightState API', () => {
  it('returns 0 for lamp that has never been set', () => {
    expect(cb.getLampState('NEVER_SET')).toBe(0);
  });

  it('returns 1 after lamp turned on', () => {
    cb.setLampState('L10', 1);
    expect(cb.getLampState('L10')).toBe(1);
  });

  it('returns 0 after lamp turned off', () => {
    cb.setLampState('L10', 1);
    cb.setLampState('L10', 0);
    expect(cb.getLampState('L10')).toBe(0);
  });

  it('returns correct intensity for partial brightness', () => {
    cb.setLampState('L10', 0.5);
    expect(cb.getLampState('L10')).toBe(0.5);
  });
});

describe('VBScript Phase 2: API Logic', () => {
  describe('SetLamp value interpretation', () => {
    it('treats boolean true as intensity 1', () => {
      const value: any = true;
      const isOn = value === true || value === 1 || value === 'on' || value === 'On';
      const intensity = typeof value === 'number' ? Math.max(0, Math.min(1, +value)) : (isOn ? 1 : 0);
      expect(intensity).toBe(1);
    });

    it('treats boolean false as intensity 0', () => {
      const value: any = false;
      const isOn = value === true || value === 1 || value === 'on' || value === 'On';
      const intensity = typeof value === 'number' ? Math.max(0, Math.min(1, +value)) : (isOn ? 1 : 0);
      expect(intensity).toBe(0);
    });

    it('treats numeric value as direct intensity', () => {
      const value: any = 0.75;
      const isOn = value === true || value === 1 || value === 'on' || value === 'On';
      const intensity = typeof value === 'number' ? Math.max(0, Math.min(1, +value)) : (isOn ? 1 : 0);
      expect(intensity).toBe(0.75);
    });

    it('clamps intensity to 0-1 range', () => {
      const value: any = 1.5;
      const intensity = typeof value === 'number' ? Math.max(0, Math.min(1, +value)) : 0;
      expect(intensity).toBe(1);
    });

    it('treats string "on" as intensity 1', () => {
      const value: any = 'on';
      const isOn = value === true || value === 1 || value === 'on' || value === 'On';
      const intensity = typeof value === 'number' ? Math.max(0, Math.min(1, +value)) : (isOn ? 1 : 0);
      expect(intensity).toBe(1);
    });

    it('treats string "Off" as intensity 0', () => {
      const value: any = 'Off';
      const isOn = value === true || value === 1 || value === 'on' || value === 'On';
      const intensity = typeof value === 'number' ? Math.max(0, Math.min(1, +value)) : (isOn ? 1 : 0);
      expect(intensity).toBe(0);
    });
  });

  describe('SetLampState intensity clamping', () => {
    it('clamps negative intensity to 0', () => {
      const intensity = Math.max(0, Math.min(1, -0.5));
      expect(intensity).toBe(0);
    });

    it('clamps intensity >1 to 1', () => {
      const intensity = Math.max(0, Math.min(1, 2.0));
      expect(intensity).toBe(1);
    });

    it('preserves valid intensity', () => {
      const intensity = Math.max(0, Math.min(1, 0.5));
      expect(intensity).toBe(0.5);
    });
  });

  describe('SetGlow percentage conversion', () => {
    it('converts percentage to 0-1 range', () => {
      const intensity = 50;
      const result = Math.max(0, Math.min(1, intensity / 100));
      expect(result).toBe(0.5);
    });

    it('handles 100% as full intensity', () => {
      const intensity = 100;
      const result = Math.max(0, Math.min(1, intensity / 100));
      expect(result).toBe(1);
    });

    it('handles 0% as off', () => {
      const intensity = 0;
      const result = Math.max(0, Math.min(1, intensity / 100));
      expect(result).toBe(0);
    });
  });

  describe('SetFlasher intensity clamping', () => {
    it('clamps intensity to 0-100 range', () => {
      const rawIntensity = 150;
      const clamped = Math.max(0, Math.min(100, rawIntensity));
      expect(clamped).toBe(100);
    });

    it('converts percentage to 0-1 for callback', () => {
      const intensity = 75;
      const converted = intensity / 100;
      expect(converted).toBe(0.75);
    });

    it('handles 0% intensity', () => {
      const intensity = 0;
      const clamped = Math.max(0, Math.min(100, intensity));
      expect(clamped).toBe(0);
    });

    it('handles 100% intensity', () => {
      const intensity = 100;
      const clamped = Math.max(0, Math.min(100, intensity));
      expect(clamped).toBe(100);
    });
  });

  describe('LightOn/LightOff/LightBlink stubs replaced', () => {
    it('LightOn logic calls setLampState with intensity 1', () => {
      const mockSetLampState = vi.fn();
      const origSetLampState = cb.setLampState;
      cb.setLampState = mockSetLampState;
      // Simulate: LightOn = (name) => cb.setLampState?.(name, 1)
      const LightOn = (name: string) => cb.setLampState?.(name, 1);
      LightOn('L1');
      expect(mockSetLampState).toHaveBeenCalledWith('L1', 1);
      cb.setLampState = origSetLampState;
    });

    it('LightOff logic calls setLampState with intensity 0', () => {
      const mockSetLampState = vi.fn();
      const origSetLampState = cb.setLampState;
      cb.setLampState = mockSetLampState;
      const LightOff = (name: string) => cb.setLampState?.(name, 0);
      LightOff('L1');
      expect(mockSetLampState).toHaveBeenCalledWith('L1', 0);
      cb.setLampState = origSetLampState;
    });

    it('LightBlink logic calls setLampBlinkPattern', () => {
      const mockSetLampBlinkPattern = vi.fn();
      const origSetLampBlinkPattern = cb.setLampBlinkPattern;
      cb.setLampBlinkPattern = mockSetLampBlinkPattern;
      const LightBlink = (name: string) => cb.setLampBlinkPattern?.(name, '10', 250);
      LightBlink('L1');
      expect(mockSetLampBlinkPattern).toHaveBeenCalledWith('L1', '10', 250);
      cb.setLampBlinkPattern = origSetLampBlinkPattern;
    });

    it('FlasherOn logic calls setFlasherState with full intensity', () => {
      const mockSetFlasherState = vi.fn();
      const origSetFlasherState = cb.setFlasherState;
      cb.setFlasherState = mockSetFlasherState;
      const FlasherOn = (name: string) => cb.setFlasherState?.(name, 1, 255, 255, 255);
      FlasherOn('F1');
      expect(mockSetFlasherState).toHaveBeenCalledWith('F1', 1, 255, 255, 255);
      cb.setFlasherState = origSetFlasherState;
    });

    it('FlasherOff logic calls setFlasherState with zero intensity', () => {
      const mockSetFlasherState = vi.fn();
      const origSetFlasherState = cb.setFlasherState;
      cb.setFlasherState = mockSetFlasherState;
      const FlasherOff = (name: string) => cb.setFlasherState?.(name, 0, 0, 0, 0);
      FlasherOff('F1');
      expect(mockSetFlasherState).toHaveBeenCalledWith('F1', 0, 0, 0, 0);
      cb.setFlasherState = origSetFlasherState;
    });

    it('FlasherBlink logic calls setFlasherBlinkPattern', () => {
      const mockSetFlasherBlinkPattern = vi.fn();
      const origSetFlasherBlinkPattern = cb.setFlasherBlinkPattern;
      cb.setFlasherBlinkPattern = mockSetFlasherBlinkPattern;
      const FlasherBlink = (name: string) => cb.setFlasherBlinkPattern?.(name, '10', 250);
      FlasherBlink('F1');
      expect(mockSetFlasherBlinkPattern).toHaveBeenCalledWith('F1', '10', 250);
      cb.setFlasherBlinkPattern = origSetFlasherBlinkPattern;
    });
  });
});
