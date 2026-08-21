// SPDX-License-Identifier: AGPL-3.0-or-later
// © 2026 Harald Weiss

/**
 * Quality Preset Applier — extracted from main.ts
 *
 * Factory-DI pattern (mirrors animation-loop.ts / game-controls.ts). Applies the
 * currently-selected quality preset to the render pipeline + lights each time the
 * preset name changes. lastAppliedQualityPreset is mutable module state, so it is
 * injected via getter/setter to stay in sync with main.ts.
 */

export interface QualityPresetApplierDeps {
  profiler: any;
  appendLogEntry: any;
  bloomPass: any;
  mainSpot: any;
  renderer: any;
  ambLight: any;
  fillLight: any;
  rimLight: any;
  ballOuterMaterial: any;
  ballGlowMaterial: any;
  backglassRenderer: any;
  particleField: any;
  volumetricPass: any;
  getPlayfieldVisualEnhancement: any;
  getLastAppliedQualityPreset: () => string;
  setLastAppliedQualityPreset: (value: string) => void;
}

export function createQualityPresetApplier(deps: QualityPresetApplierDeps): () => void {
  let lastAppliedQualityPreset = deps.getLastAppliedQualityPreset();
  const profiler = deps.profiler;
  const appendLogEntry = deps.appendLogEntry;
  const bloomPass = deps.bloomPass;
  const mainSpot = deps.mainSpot;
  const renderer = deps.renderer;
  const ambLight = deps.ambLight;
  const fillLight = deps.fillLight;
  const rimLight = deps.rimLight;
  const ballOuterMaterial = deps.ballOuterMaterial;
  const ballGlowMaterial = deps.ballGlowMaterial;
  const backglassRenderer = deps.backglassRenderer;
  const particleField = deps.particleField;
  const volumetricPass = deps.volumetricPass;
  const getPlayfieldVisualEnhancement = deps.getPlayfieldVisualEnhancement;
  return function applyQualityPreset(): void {
  try {
    // Check name first (string compare, no object copy). Only fetch the full
    // preset object when a change is actually detected.
    const presetName = profiler.getCurrentPresetName();
    if (lastAppliedQualityPreset === presetName) return;
    lastAppliedQualityPreset = presetName; deps.setLastAppliedQualityPreset(presetName);

    const currentPreset = profiler.getQualityPreset();
    appendLogEntry(`⚙️ Applying quality preset: ${currentPreset.label}`, 'ok');

    // ─── Bloom Pass ───
    // UnrealBloomPass has no setEnabled(); toggle the inherited Pass.enabled flag.
    if (bloomPass) {
      bloomPass.enabled = currentPreset.bloomEnabled;
      if (currentPreset.bloomEnabled) {
        bloomPass.strength = currentPreset.bloomStrength;
        bloomPass.radius = currentPreset.bloomRadius;
        bloomPass.threshold = 0.25;
      }
    }

    // ─── Shadow Maps ───
    // THREE.SpotLight has no setProperty(); set castShadow directly.
    if (currentPreset.shadowsEnabled) {
      if (mainSpot) {
        mainSpot.castShadow = true;
        mainSpot.shadow.mapSize.set(currentPreset.shadowMapSize, currentPreset.shadowMapSize);
        // Scale shadow blur quality with preset: lower presets use fewer samples
        const blurSamplesMap: Record<string, number> = {
          low: 4, medium: 8, high: 16, ultra: 16
        };
        mainSpot.shadow.blurSamples = blurSamplesMap[currentPreset.name] ?? 16;
      }
      renderer.shadowMap.enabled = true;
    } else {
      if (mainSpot) mainSpot.castShadow = false;
      renderer.shadowMap.enabled = false;
    }

    // ─── Lighting Intensities ───
    if (ambLight) ambLight.intensity = currentPreset.shadowsEnabled ? 0.25 : 0.35;
    if (fillLight) fillLight.intensity = currentPreset.shadowsEnabled ? 1.2 : 1.5;
    if (rimLight) rimLight.intensity = currentPreset.shadowsEnabled ? 0.7 : 0.5;

    // ─── Ball Material Emissive ───
    if (ballOuterMaterial) {
      ballOuterMaterial.emissiveIntensity = currentPreset.bloomEnabled ? 0.3 : 0.1;
    }
    if (ballGlowMaterial) {
      ballGlowMaterial.emissiveIntensity = currentPreset.bloomEnabled ? 0.6 : 0.2;
      ballGlowMaterial.opacity = currentPreset.bloomEnabled ? 0.12 : 0.06;
    }

    // ─── Particle System ───
    particleField.setMaxParts(currentPreset.particleCount);
    appendLogEntry(`  └─ Particles: ${particleField.maxParts} max`, 'ok');

    // ─── Backglass Mode ───
    if (backglassRenderer) {
      if (currentPreset.backglassEnabled) {
        backglassRenderer.setEnabled(true);
        backglassRenderer.setRenderMode(currentPreset.backglass3D);
        appendLogEntry(`  └─ Backglass: ${currentPreset.backglass3D ? '3D' : '2D'}`, 'ok');
      } else {
        backglassRenderer.setEnabled(false);
      }
    }

    // ─── Volumetric Lighting ───
    if (volumetricPass) {
      volumetricPass.enabled = currentPreset.volumetricEnabled;
      if (currentPreset.volumetricEnabled) {
        volumetricPass.setExposure(currentPreset.volumetricIntensity);
        appendLogEntry(`  └─ Volumetric: ${(currentPreset.volumetricIntensity * 100).toFixed(0)}%`, 'ok');
      }
    }

    // ─── Phase 16+: Playfield Visual Enhancements ───
    const enhancement = getPlayfieldVisualEnhancement();
    if (enhancement) {
      enhancement.setQualityPreset(currentPreset.name as 'low' | 'medium' | 'high' | 'ultra');
      appendLogEntry(`  └─ Visual Enhancement: ${currentPreset.name}`, 'ok');
    }

    // ─── DMD Resolution ───
    if (currentPreset.dmdResolution) {
      window.setDMDResolutionOption?.(currentPreset.dmdResolution);
      window.setDMDGlow?.(currentPreset.dmdGlowEnabled, currentPreset.dmdGlowIntensity);
      appendLogEntry(`  └─ DMD: ${currentPreset.dmdResolution} (glow: ${currentPreset.dmdGlowEnabled})`, 'ok');
    }

    // ─── Tone Mapping Exposure ───
    renderer.toneMappingExposure = currentPreset.bloomEnabled ? 1.35 : 1.30;  // ─── Increased from 1.15/1.05 to combat SSAO/fog darkening
  } catch (err) {
    appendLogEntry(`❌ Error in applyQualityPreset: ${err instanceof Error ? err.message : String(err)}`, 'error');
  }

  };
}
