// SPDX-License-Identifier: AGPL-3.0-or-later
// © 2026 Harald Weiss

/**
 * Quality Preset validation — proves every declared preset flag actually engages
 * the render pipeline / lights. The graphics pipeline was heavily reworked
 * (2026-06-17/06-20); these tests guard against silent no-ops (a past incident:
 * bloomPass.setEnabled / mainSpot.setProperty were non-existent methods → optional
 * chain no-ops). We drive createQualityPresetApplier with mock passes/lights and
 * assert the resulting state matches each QUALITY_PRESETS entry.
 */

import { describe, it, expect, vi } from 'vitest';
import { QUALITY_PRESETS, QualityPreset } from '../profiler/quality-presets';
import { createQualityPresetApplier, QualityPresetApplierDeps } from '../app/quality-preset-applier';

const BLUR_SAMPLES: Record<string, number> = { low: 4, medium: 8, high: 16, ultra: 16 };

function buildDeps(preset: QualityPreset, seedLast = '') {
  const bloomPass = { enabled: true, strength: 0, radius: 0, threshold: 0 };
  const mainSpot = { castShadow: false, shadow: { mapSize: { set: vi.fn() }, blurSamples: 0 } };
  const renderer = { shadowMap: { enabled: false }, toneMappingExposure: 1 };
  const ambLight = { intensity: 0 };
  const fillLight = { intensity: 0 };
  const rimLight = { intensity: 0 };
  const ballOuterMaterial = { emissiveIntensity: 0 };
  const ballGlowMaterial = { emissiveIntensity: 0, opacity: 0 };
  const particleField = { maxParts: 0, setMaxParts: (n: number) => { particleField.maxParts = n; } };
  const backglassRenderer = { enabled: false, setEnabled: vi.fn(), setRenderMode: vi.fn() };
  const volumetricPass = { enabled: false, setExposure: vi.fn() };
  const enhancement = { qualityPreset: '', setQualityPreset: vi.fn((n: string) => { enhancement.qualityPreset = n; }) };
  const profiler = {
    getCurrentPresetName: () => preset.name,
    getQualityPreset: () => preset,
  };
  const appendLogEntry = vi.fn();
  const getPlayfieldVisualEnhancement = () => enhancement;
  const setLastAppliedQualityPreset = vi.fn();

  const deps: QualityPresetApplierDeps = {
    profiler,
    appendLogEntry,
    bloomPass,
    mainSpot,
    renderer,
    ambLight,
    fillLight,
    rimLight,
    ballOuterMaterial,
    ballGlowMaterial,
    backglassRenderer,
    particleField,
    volumetricPass,
    getPlayfieldVisualEnhancement,
    getLastAppliedQualityPreset: () => seedLast,
    setLastAppliedQualityPreset,
  };

  return {
    deps, bloomPass, mainSpot, renderer, ambLight, fillLight, rimLight,
    ballOuterMaterial, ballGlowMaterial, particleField, backglassRenderer,
    volumetricPass, enhancement, appendLogEntry, setLastAppliedQualityPreset,
  };
}

describe('applyQualityPreset — preset → render state mapping', () => {
  const entries = Object.entries(QUALITY_PRESETS) as [string, QualityPreset][];

  it.each(entries)('applies "%s" preset to passes and lights', (_name, preset) => {
    const m = buildDeps(preset);
    const apply = createQualityPresetApplier(m.deps);
    apply();

    // ─── Bloom Pass (UnrealBloomPass has no setEnabled → Pass.enabled) ───
    expect(m.bloomPass.enabled).toBe(preset.bloomEnabled);
    if (preset.bloomEnabled) {
      expect(m.bloomPass.strength).toBeCloseTo(preset.bloomStrength);
      expect(m.bloomPass.radius).toBeCloseTo(preset.bloomRadius);
      expect(m.bloomPass.threshold).toBeCloseTo(0.25);
    }

    // ─── Shadow Maps (THREE.SpotLight has no setProperty → castShadow) ───
    expect(m.mainSpot.castShadow).toBe(preset.shadowsEnabled);
    expect(m.renderer.shadowMap.enabled).toBe(preset.shadowsEnabled);
    if (preset.shadowsEnabled) {
      expect(m.mainSpot.shadow.mapSize.set).toHaveBeenCalledWith(preset.shadowMapSize, preset.shadowMapSize);
      expect(m.mainSpot.shadow.blurSamples).toBe(BLUR_SAMPLES[preset.name] ?? 16);
    }

    // ─── Lighting Intensities (scaled by shadowsEnabled) ───
    expect(m.ambLight.intensity).toBe(preset.shadowsEnabled ? 0.25 : 0.35);
    expect(m.fillLight.intensity).toBe(preset.shadowsEnabled ? 1.2 : 1.5);
    expect(m.rimLight.intensity).toBe(preset.shadowsEnabled ? 0.7 : 0.5);

    // ─── Ball Material Emissive (scaled by bloomEnabled) ───
    expect(m.ballOuterMaterial.emissiveIntensity).toBe(preset.bloomEnabled ? 0.3 : 0.1);
    expect(m.ballGlowMaterial.emissiveIntensity).toBe(preset.bloomEnabled ? 0.6 : 0.2);
    expect(m.ballGlowMaterial.opacity).toBe(preset.bloomEnabled ? 0.12 : 0.06);

    // ─── Particle System ───
    expect(m.particleField.maxParts).toBe(preset.particleCount);

    // ─── Volumetric Lighting ───
    expect(m.volumetricPass.enabled).toBe(preset.volumetricEnabled);
    if (preset.volumetricEnabled) {
      expect(m.volumetricPass.setExposure).toHaveBeenCalledWith(preset.volumetricIntensity);
    }

    // ─── Playfield Visual Enhancement ───
    expect(m.enhancement.setQualityPreset).toHaveBeenCalledWith(preset.name);

    // ─── Tone Mapping Exposure (combat fog/SSAO darkening) ───
    expect(m.renderer.toneMappingExposure).toBeCloseTo(preset.bloomEnabled ? 1.35 : 1.30);

    // ─── Backglass mode ───
    if (preset.backglassEnabled) {
      expect(m.backglassRenderer.setEnabled).toHaveBeenCalledWith(true);
      expect(m.backglassRenderer.setRenderMode).toHaveBeenCalledWith(preset.backglass3D);
    } else {
      expect(m.backglassRenderer.setEnabled).toHaveBeenCalledWith(false);
    }

    // ─── lastAppliedQualityPreset synced back to main.ts ───
    expect(m.setLastAppliedQualityPreset).toHaveBeenCalledWith(preset.name);
  });

  it('early-returns when the preset name is unchanged (no re-apply)', () => {
    const preset = QUALITY_PRESETS.ultra; // shadowsEnabled=true, but seed == name → skip
    const m = buildDeps(preset, /* seedLast */ preset.name);
    const apply = createQualityPresetApplier(m.deps);
    apply();

    // ultra would set castShadow=true if applied; early-return leaves the mock default
    expect(m.mainSpot.castShadow).toBe(false);
    expect(m.setLastAppliedQualityPreset).not.toHaveBeenCalled();
    expect(m.appendLogEntry).not.toHaveBeenCalled();
  });

  it('low and ultra presets diverge on bloom + shadows + volumetric (no silent no-ops)', () => {
    const low = buildDeps(QUALITY_PRESETS.low);
    const ultra = buildDeps(QUALITY_PRESETS.ultra);
    createQualityPresetApplier(low.deps)();
    createQualityPresetApplier(ultra.deps)();

    expect(low.bloomPass.enabled).toBe(false);
    expect(ultra.bloomPass.enabled).toBe(true);
    expect(low.mainSpot.castShadow).toBe(false);
    expect(ultra.mainSpot.castShadow).toBe(true);
    expect(low.volumetricPass.enabled).toBe(false);
    expect(ultra.volumetricPass.enabled).toBe(true);
  });
});
