// SPDX-License-Identifier: AGPL-3.0-or-later
// © 2026 Harald Weiss

export interface QualityPreset {
  name: 'low' | 'medium' | 'high' | 'ultra';
  label: string;

  // Graphics settings
  shadowsEnabled: boolean;
  shadowMapSize: number;
  bloomEnabled: boolean;
  bloomStrength: number;
  bloomRadius: number;
  volumetricEnabled: boolean;
  volumetricIntensity: number;
  dofEnabled: boolean;
  particleCount: number;

  // Phase 1: Screen Space Reflections (SSR)
  ssrEnabled: boolean;
  ssrSamples: number;
  ssrIntensity: number;
  ssrMaxDistance: number;

  // Phase 2: Motion Blur
  motionBlurEnabled: boolean;
  motionBlurSamples: number;
  motionBlurStrength: number;

  // Phase 3: Cascaded Shadows & Per-Light Bloom
  cascadeShadowsEnabled: boolean;
  cascadeCount: number;
  cascadeShadowMapSize: number;
  perLightBloomEnabled: boolean;
  perLightBloomStrength: number;
  perLightBloomThreshold: number;

  // Phase 4: Advanced Particle System
  advancedParticlesEnabled: boolean;
  particlePhysicsEnabled: boolean;
  maxParticles: number;

  // Phase 5: Film Effects
  filmEffectsEnabled: boolean;
  filmGrainIntensity: number;
  chromaticAberrationEnabled: boolean;
  screenDistortionEnabled: boolean;

  // Phase 6: Depth of Field (Optional, ultra-only)
  depthOfFieldEnabled: boolean;
  dofAperture: number;
  dofSamples: number;

  // Physics settings
  physicsSubsteps: number;

  // DMD settings
  dmdResolution: 'standard' | 'hires';
  dmdGlowEnabled: boolean;
  dmdGlowIntensity: number;

  // Backglass settings
  backglassEnabled: boolean;
  backglass3D: boolean;

  // Adaptive settings
  targetFPS: number;
  pixelRatioCap: number;
}

export const QUALITY_PRESETS: Record<string, QualityPreset> = {
  low: {
    name: 'low',
    label: 'Low (Performance)',
    shadowsEnabled: false,
    shadowMapSize: 1024,
    bloomEnabled: false,
    bloomStrength: 0.5,
    bloomRadius: 0.3,
    dofEnabled: false,
    particleCount: 50,
    ssrEnabled: false,
    ssrSamples: 0,
    ssrIntensity: 0.0,
    ssrMaxDistance: 4.0,
    motionBlurEnabled: false,
    motionBlurSamples: 0,
    motionBlurStrength: 0.0,
    cascadeShadowsEnabled: false,
    cascadeCount: 2,
    cascadeShadowMapSize: 512,
    perLightBloomEnabled: false,
    perLightBloomStrength: 0.0,
    perLightBloomThreshold: 0.5,
    advancedParticlesEnabled: false,
    particlePhysicsEnabled: false,
    maxParticles: 100,
    filmEffectsEnabled: false,
    filmGrainIntensity: 0.05,
    chromaticAberrationEnabled: false,
    screenDistortionEnabled: false,
    depthOfFieldEnabled: false,
    dofAperture: 0.3,
    dofSamples: 4,
    physicsSubsteps: 1,
    dmdResolution: 'standard',
    dmdGlowEnabled: false,
    dmdGlowIntensity: 0.3,
    backglassEnabled: false,
    backglass3D: false,
    volumetricEnabled: false,
    volumetricIntensity: 0.0,
    targetFPS: 30,
    pixelRatioCap: 1,
  },
  medium: {
    name: 'medium',
    label: 'Medium (Balanced)',
    shadowsEnabled: true,
    shadowMapSize: 1024,
    bloomEnabled: true,
    bloomStrength: 0.9,
    bloomRadius: 0.5,
    dofEnabled: false,
    particleCount: 150,
    ssrEnabled: false,
    ssrSamples: 0,
    ssrIntensity: 0.0,
    ssrMaxDistance: 4.0,
    motionBlurEnabled: false,
    motionBlurSamples: 0,
    motionBlurStrength: 0.0,
    cascadeShadowsEnabled: true,
    cascadeCount: 3,
    cascadeShadowMapSize: 1024,
    perLightBloomEnabled: false,
    perLightBloomStrength: 0.5,
    perLightBloomThreshold: 0.6,
    advancedParticlesEnabled: true,
    particlePhysicsEnabled: false,
    maxParticles: 300,
    filmEffectsEnabled: true,
    filmGrainIntensity: 0.1,
    chromaticAberrationEnabled: false,
    screenDistortionEnabled: false,
    depthOfFieldEnabled: false,
    dofAperture: 0.3,
    dofSamples: 4,
    physicsSubsteps: 2,
    dmdResolution: 'standard',
    dmdGlowEnabled: true,
    dmdGlowIntensity: 0.5,
    backglassEnabled: true,
    backglass3D: false,
    volumetricEnabled: true,
    volumetricIntensity: 0.3,
    targetFPS: 50,
    pixelRatioCap: 1.5,
  },
  high: {
    name: 'high',
    label: 'High (Quality)',
    shadowsEnabled: true,
    shadowMapSize: 2048,
    bloomEnabled: true,
    bloomStrength: 1.1,
    bloomRadius: 0.65,
    dofEnabled: false,
    particleCount: 300,
    ssrEnabled: true,
    ssrSamples: 12,
    ssrIntensity: 0.8,
    ssrMaxDistance: 8.0,
    motionBlurEnabled: true,
    motionBlurSamples: 8,
    motionBlurStrength: 0.6,
    cascadeShadowsEnabled: true,
    cascadeCount: 4,
    cascadeShadowMapSize: 2048,
    perLightBloomEnabled: true,
    perLightBloomStrength: 1.2,
    perLightBloomThreshold: 0.5,
    advancedParticlesEnabled: true,
    particlePhysicsEnabled: true,
    maxParticles: 600,
    filmEffectsEnabled: true,
    filmGrainIntensity: 0.15,
    chromaticAberrationEnabled: true,
    screenDistortionEnabled: false,
    depthOfFieldEnabled: false,
    dofAperture: 0.4,
    dofSamples: 8,
    physicsSubsteps: 3,
    dmdResolution: 'hires',
    dmdGlowEnabled: true,
    dmdGlowIntensity: 0.7,
    backglassEnabled: true,
    backglass3D: true,
    volumetricEnabled: true,
    volumetricIntensity: 0.4,
    targetFPS: 60,
    pixelRatioCap: 2,
  },
  ultra: {
    name: 'ultra',
    label: 'Ultra (Maximum)',
    shadowsEnabled: true,
    shadowMapSize: 2048,
    bloomEnabled: true,
    bloomStrength: 1.2,
    bloomRadius: 0.8,
    dofEnabled: true,
    particleCount: 500,
    ssrEnabled: true,
    ssrSamples: 16,
    ssrIntensity: 1.0,
    ssrMaxDistance: 12.0,
    motionBlurEnabled: true,
    motionBlurSamples: 12,
    motionBlurStrength: 0.9,
    cascadeShadowsEnabled: true,
    cascadeCount: 4,
    cascadeShadowMapSize: 4096,
    perLightBloomEnabled: true,
    perLightBloomStrength: 1.5,
    perLightBloomThreshold: 0.4,
    advancedParticlesEnabled: true,
    particlePhysicsEnabled: true,
    maxParticles: 1000,
    filmEffectsEnabled: true,
    filmGrainIntensity: 0.2,
    chromaticAberrationEnabled: true,
    screenDistortionEnabled: true,
    depthOfFieldEnabled: true,
    dofAperture: 0.5,
    dofSamples: 8,
    physicsSubsteps: 4,
    dmdResolution: 'hires',
    dmdGlowEnabled: true,
    dmdGlowIntensity: 1.0,
    backglassEnabled: true,
    backglass3D: true,
    volumetricEnabled: true,
    volumetricIntensity: 0.5,
    targetFPS: 60,
    pixelRatioCap: 2,
  },
};
