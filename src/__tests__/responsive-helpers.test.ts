// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, it, expect } from 'vitest';
import {
  calculateResponsiveZoom, getResponsiveCameraTilt, getResponsiveFlipperX,
  calcSafeFlipperLength, getAutoQualityPreset, detectDeviceType,
} from '../app/responsive-helpers';

describe('calculateResponsiveZoom', () => {
  it('returns higher zoom for narrower aspect ratios', () => {
    expect(calculateResponsiveZoom(0.5)).toBeGreaterThan(calculateResponsiveZoom(2.0));
  });
  it('clamps between 12 and 28', () => {
    expect(calculateResponsiveZoom(0.1)).toBeGreaterThanOrEqual(12);
    expect(calculateResponsiveZoom(0.1)).toBeLessThanOrEqual(28);
    expect(calculateResponsiveZoom(5.0)).toBeGreaterThanOrEqual(12);
    expect(calculateResponsiveZoom(5.0)).toBeLessThanOrEqual(28);
  });
});

describe('getResponsiveCameraTilt', () => {
  it('returns lower (more negative) values for wider screens', () => {
    expect(getResponsiveCameraTilt(0.5)).toBe(-8);
    expect(getResponsiveCameraTilt(2.0)).toBe(-10);
  });
});

describe('getResponsiveFlipperX', () => {
  it('returns larger values for wider aspect ratios', () => {
    const narrow = getResponsiveFlipperX(0.6);
    const wide = getResponsiveFlipperX(1.8);
    expect(wide).toBeGreaterThan(narrow);
  });
  it('stays within reasonable range', () => {
    expect(getResponsiveFlipperX(0.3)).toBeGreaterThan(0.8);
    expect(getResponsiveFlipperX(3.0)).toBeLessThan(1.5);
  });
});

describe('calcSafeFlipperLength', () => {
  it('returns shorter lengths for closer flippers', () => {
    expect(calcSafeFlipperLength(0.95)).toBeLessThan(calcSafeFlipperLength(1.3));
  });
  it('clamps between 1.2 and 2.1', () => {
    expect(calcSafeFlipperLength(0.5)).toBeGreaterThanOrEqual(1.2);
    expect(calcSafeFlipperLength(2.0)).toBeLessThanOrEqual(2.1);
  });
});

describe('getAutoQualityPreset', () => {
  it('returns a non-empty string', () => {
    expect(getAutoQualityPreset().length).toBeGreaterThan(0);
  });
});

describe('detectDeviceType', () => {
  it('returns one of the valid device types', () => {
    expect(['mobile', 'tablet', 'desktop']).toContain(detectDeviceType());
  });
});
