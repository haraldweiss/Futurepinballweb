/**
 * ─── Phase 5: Performance Profiling & Quality System ───────────────────────
 *
 * Monitors FPS, memory usage, draw calls, and provides quality presets
 * for adaptive performance across devices
 */

import * as THREE from 'three';

/**
 * ─── Phase 5: Quality Preset Configuration ───
 */
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
  ssrSamples: number;              // 0, 8, 12, 16
  ssrIntensity: number;            // 0.0-1.0
  ssrMaxDistance: number;          // pixels

  // Phase 2: Motion Blur
  motionBlurEnabled: boolean;
  motionBlurSamples: number;       // 4, 8, 12
  motionBlurStrength: number;      // 0.0-1.0

  // Phase 3: Cascaded Shadows & Per-Light Bloom
  cascadeShadowsEnabled: boolean;
  cascadeCount: number;            // 2, 3, 4
  cascadeShadowMapSize: number;    // 512, 1024, 2048, 4096
  perLightBloomEnabled: boolean;
  perLightBloomStrength: number;   // 0.0-2.0
  perLightBloomThreshold: number;  // 0.0-1.0

  // Phase 4: Advanced Particle System
  advancedParticlesEnabled: boolean;
  particlePhysicsEnabled: boolean;
  maxParticles: number;            // 100, 300, 600, 1000

  // Phase 5: Film Effects
  filmEffectsEnabled: boolean;
  filmGrainIntensity: number;      // 0.0-0.3
  chromaticAberrationEnabled: boolean;
  screenDistortionEnabled: boolean;

  // Phase 6: Depth of Field (Optional, ultra-only)
  depthOfFieldEnabled: boolean;
  dofAperture: number;             // 0.1-2.0
  dofSamples: number;              // 4, 8, 12, 16

  // Physics settings
  physicsSubsteps: number;

  // DMD settings
  dmdResolution: 'standard' | 'hires';
  dmdGlowEnabled: boolean;
  dmdGlowIntensity: number;

  // Backglass settings
  backglassEnabled: boolean;
  backglass3D: boolean;

  // Volumetric lighting settings
  volumetricEnabled: boolean;
  volumetricIntensity: number;

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
    ssrEnabled: false,                  // Disable SSR for performance
    ssrSamples: 0,
    ssrIntensity: 0.0,
    ssrMaxDistance: 4.0,
    motionBlurEnabled: false,           // Disable motion blur for performance
    motionBlurSamples: 0,
    motionBlurStrength: 0.0,
    cascadeShadowsEnabled: false,       // Disable cascaded shadows for performance
    cascadeCount: 2,
    cascadeShadowMapSize: 512,
    perLightBloomEnabled: false,        // Disable per-light bloom for performance
    perLightBloomStrength: 0.0,
    perLightBloomThreshold: 0.5,
    advancedParticlesEnabled: false,    // Disable advanced particles for performance
    particlePhysicsEnabled: false,
    maxParticles: 100,
    filmEffectsEnabled: false,          // Disable film effects for performance
    filmGrainIntensity: 0.05,
    chromaticAberrationEnabled: false,
    screenDistortionEnabled: false,
    depthOfFieldEnabled: false,         // DoF disabled on low
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
    ssrEnabled: false,                  // Disable SSR on medium for balance
    ssrSamples: 0,
    ssrIntensity: 0.0,
    ssrMaxDistance: 4.0,
    motionBlurEnabled: false,           // Disable motion blur on medium
    motionBlurSamples: 0,
    motionBlurStrength: 0.0,
    cascadeShadowsEnabled: true,        // Enable cascaded shadows on medium
    cascadeCount: 3,
    cascadeShadowMapSize: 1024,
    perLightBloomEnabled: false,        // Selective bloom on medium
    perLightBloomStrength: 0.5,
    perLightBloomThreshold: 0.6,
    advancedParticlesEnabled: true,     // Enable particles on medium
    particlePhysicsEnabled: false,      // Simplified physics
    maxParticles: 300,
    filmEffectsEnabled: true,           // Enable film effects on medium
    filmGrainIntensity: 0.1,
    chromaticAberrationEnabled: false,
    screenDistortionEnabled: false,
    depthOfFieldEnabled: false,         // DoF disabled on medium
    dofAperture: 0.3,
    dofSamples: 4,
    physicsSubsteps: 2,
    dmdResolution: 'standard',
    dmdGlowEnabled: true,
    dmdGlowIntensity: 0.5,
    backglassEnabled: true,
    backglass3D: false,
    volumetricEnabled: true,
    volumetricIntensity: 0.3,  // ─── Reduced from 0.5: Less aggressive volumetric darkening
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
    ssrEnabled: true,                   // Enable SSR on high
    ssrSamples: 12,
    ssrIntensity: 0.8,
    ssrMaxDistance: 8.0,
    motionBlurEnabled: true,            // Enable motion blur on high
    motionBlurSamples: 8,
    motionBlurStrength: 0.6,
    cascadeShadowsEnabled: true,        // Full cascaded shadows on high
    cascadeCount: 4,
    cascadeShadowMapSize: 2048,
    perLightBloomEnabled: true,         // Full per-light bloom on high
    perLightBloomStrength: 1.2,
    perLightBloomThreshold: 0.5,
    advancedParticlesEnabled: true,     // Full particles on high with physics
    particlePhysicsEnabled: true,
    maxParticles: 600,
    filmEffectsEnabled: true,           // Full film effects on high
    filmGrainIntensity: 0.15,
    chromaticAberrationEnabled: true,   // Selective aberration on high
    screenDistortionEnabled: false,
    depthOfFieldEnabled: false,         // DoF disabled on high
    dofAperture: 0.4,
    dofSamples: 8,
    physicsSubsteps: 3,
    dmdResolution: 'hires',
    dmdGlowEnabled: true,
    dmdGlowIntensity: 0.7,
    backglassEnabled: true,
    backglass3D: true,
    volumetricEnabled: true,
    volumetricIntensity: 0.4,  // ─── Reduced from 0.8: Less aggressive god rays, better playfield visibility
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
    ssrEnabled: true,                   // Enable SSR on ultra with max settings
    ssrSamples: 16,
    ssrIntensity: 1.0,
    ssrMaxDistance: 12.0,
    motionBlurEnabled: true,            // Enable motion blur on ultra with max settings
    motionBlurSamples: 12,
    motionBlurStrength: 0.9,
    cascadeShadowsEnabled: true,        // Maximum cascaded shadows on ultra
    cascadeCount: 4,
    cascadeShadowMapSize: 4096,
    perLightBloomEnabled: true,         // Enhanced per-light bloom on ultra
    perLightBloomStrength: 1.5,
    perLightBloomThreshold: 0.4,
    advancedParticlesEnabled: true,     // Maximum particles on ultra
    particlePhysicsEnabled: true,
    maxParticles: 1000,
    filmEffectsEnabled: true,           // Maximum film effects on ultra
    filmGrainIntensity: 0.2,
    chromaticAberrationEnabled: true,   // Full aberration on ultra
    screenDistortionEnabled: true,      // Full distortion on ultra
    depthOfFieldEnabled: true,          // DoF enabled on ultra only
    dofAperture: 0.5,
    dofSamples: 8,
    physicsSubsteps: 4,
    dmdResolution: 'hires',
    dmdGlowEnabled: true,
    dmdGlowIntensity: 1.0,
    backglassEnabled: true,
    backglass3D: true,
    volumetricEnabled: true,
    volumetricIntensity: 0.5,  // ─── Reduced from 1.0: Prevents excessive god ray darkening on ultra
    targetFPS: 60,
    pixelRatioCap: 2,
  },
};

/**
 * ─── Phase 5: Performance Metrics ───
 */
export interface PerformanceMetrics {
  fps: number;
  frameTime: number;
  memoryUsed: number;
  memoryTotal: number;
  drawCalls: number;
  triangles: number;
}

/**
 * ─── Phase 5: Performance Profiler ───
 */
export class PerformanceProfiler {
  private metrics: PerformanceMetrics = {
    fps: 60,
    frameTime: 16.67,
    memoryUsed: 0,
    memoryTotal: 0,
    drawCalls: 0,
    triangles: 0,
  };

  private fpsHistory: number[] = [];
  private maxHistoryLength = 60;

  private frameCount = 0;
  private lastFpsUpdate = 0;
  private currentFps = 60;

  private qualityPreset: QualityPreset = QUALITY_PRESETS.high;
  private autoAdjust = true;
  private fpsThresholds = {
    downgrade: 45,  // Drop quality if FPS falls below this
    upgrade: 55,    // Increase quality if FPS stable above this
  };

  constructor() {
    this.loadQualityPreset();
  }

  /**
   * ─── Phase 5: Update Frame Metrics ───
   */
  public updateFrame(renderer: THREE.WebGLRenderer): void {
    const now = performance.now();

    this.frameCount++;
    if (now - this.lastFpsUpdate > 1000) {
      // Update FPS every second
      this.currentFps = this.frameCount * (1000 / (now - this.lastFpsUpdate));
      this.metrics.fps = Math.round(this.currentFps);
      this.metrics.frameTime = 1000 / Math.max(this.currentFps, 1);

      // Track FPS history
      this.fpsHistory.push(this.metrics.fps);
      if (this.fpsHistory.length > this.maxHistoryLength) {
        this.fpsHistory.shift();
      }

      // Memory metrics (if available)
      const mem = (performance as any).memory;
      if (mem) {
        this.metrics.memoryUsed = Math.round(mem.usedJSHeapSize / 1048576);
        this.metrics.memoryTotal = Math.round(mem.jsHeapSizeLimit / 1048576);
      }

      // Renderer metrics
      this.metrics.drawCalls = renderer.info.render.calls;
      this.metrics.triangles = renderer.info.render.triangles;

      this.frameCount = 0;
      this.lastFpsUpdate = now;

      // Auto-adjust quality if enabled
      if (this.autoAdjust) {
        this.adjustQualityIfNeeded();
      }
    }
  }

  /**
   * ─── Phase 5: Auto-adjust Quality ───
   */
  private adjustQualityIfNeeded(): void {
    const avgFps = this.getAverageFps();

    if (avgFps < this.fpsThresholds.downgrade) {
      // FPS too low, degrade quality
      const currentPresetName = this.qualityPreset.name;
      if (currentPresetName === 'ultra') this.setQualityPreset('high');
      else if (currentPresetName === 'high') this.setQualityPreset('medium');
      else if (currentPresetName === 'medium') this.setQualityPreset('low');
    } else if (avgFps > this.fpsThresholds.upgrade && this.getAverageFps(10) > this.fpsThresholds.upgrade) {
      // FPS consistently high, try upgrading
      const currentPresetName = this.qualityPreset.name;
      if (currentPresetName === 'low') this.setQualityPreset('medium');
      else if (currentPresetName === 'medium') this.setQualityPreset('high');
      else if (currentPresetName === 'high') this.setQualityPreset('ultra');
    }
  }

  /**
   * ─── Phase 5: Get Metrics ───
   */
  public getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  public getAverageFps(lastN?: number): number {
    if (this.fpsHistory.length === 0) return 60;
    const samples = lastN ? this.fpsHistory.slice(-lastN) : this.fpsHistory;
    return samples.reduce((a, b) => a + b, 0) / samples.length;
  }

  public getFpsHistory(): number[] {
    return [...this.fpsHistory];
  }

  /**
   * ─── Phase 5: Quality Preset Management ───
   */
  public getQualityPreset(): QualityPreset {
    return { ...this.qualityPreset };
  }

  public setQualityPreset(name: string): void {
    const preset = QUALITY_PRESETS[name];
    if (preset) {
      this.qualityPreset = preset;
      this.saveQualityPreset(name);
      console.log(`🎨 Quality preset: ${preset.label}`);
    }
  }

  public setAutoAdjust(enabled: boolean): void {
    this.autoAdjust = enabled;
    localStorage.setItem('fpw_quality_auto', enabled.toString());
  }

  public isAutoAdjusting(): boolean {
    return this.autoAdjust;
  }

  /**
   * ─── Phase 5: Persistence ───
   */
  private loadQualityPreset(): void {
    const saved = localStorage.getItem('fpw_quality_preset');
    if (saved && QUALITY_PRESETS[saved]) {
      this.qualityPreset = QUALITY_PRESETS[saved];
    }

    const autoAdjust = localStorage.getItem('fpw_quality_auto');
    this.autoAdjust = autoAdjust !== 'false';
  }

  private saveQualityPreset(name: string): void {
    localStorage.setItem('fpw_quality_preset', name);
  }

  /**
   * ─── Phase 5: Format Metrics for Display ───
   */
  public getMetricsDisplay(): string {
    const m = this.metrics;
    let display = `📊 FPS: ${m.fps.toFixed(0)} (${m.frameTime.toFixed(1)}ms)`;

    if (m.memoryUsed > 0) {
      display += ` | Mem: ${m.memoryUsed}/${m.memoryTotal}MB`;
    }

    display += ` | Draw: ${m.drawCalls} | Tri: ${(m.triangles / 1000000).toFixed(1)}M`;

    return display;
  }

  /**
   * ─── Phase 5: Detect Optimal Quality ───
   */
  public static detectOptimalQuality(): string {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const devicePixelRatio = window.devicePixelRatio;

    // Very small screen or low pixel ratio
    if (width < 500 || devicePixelRatio < 1) return 'low';

    // Mobile device
    if (width < 768) return devicePixelRatio < 2 ? 'medium' : 'low';

    // Tablet
    if (width < 1200) return 'medium';

    // Desktop
    return 'high';
  }
}

/**
 * ─── Phase 5: Global Profiler Instance ───
 */
let profiler: PerformanceProfiler | null = null;

export function getProfiler(): PerformanceProfiler {
  if (!profiler) {
    profiler = new PerformanceProfiler();
  }
  return profiler;
}

export function disposeProfiler(): void {
  profiler = null;
}
