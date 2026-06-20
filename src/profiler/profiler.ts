// SPDX-License-Identifier: AGPL-3.0-or-later
// © 2026 Harald Weiss

import * as THREE from 'three';
import type { QualityPreset } from './quality-presets';
import { QUALITY_PRESETS } from './quality-presets';
import type { PerformanceMetrics } from './metrics';

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
    downgrade: 45,
    upgrade: 55,
  };

  constructor() {
    this.loadQualityPreset();
  }

  public updateFrame(renderer: THREE.WebGLRenderer): void {
    const now = performance.now();

    this.frameCount++;
    if (now - this.lastFpsUpdate > 1000) {
      this.currentFps = this.frameCount * (1000 / (now - this.lastFpsUpdate));
      this.metrics.fps = Math.round(this.currentFps);
      this.metrics.frameTime = 1000 / Math.max(this.currentFps, 1);

      this.fpsHistory.push(this.metrics.fps);
      if (this.fpsHistory.length > this.maxHistoryLength) {
        this.fpsHistory.shift();
      }

      const mem = (performance as Performance).memory;
      if (mem) {
        this.metrics.memoryUsed = Math.round(mem.usedJSHeapSize / 1048576);
        this.metrics.memoryTotal = Math.round(mem.jsHeapSizeLimit / 1048576);
      }

      this.metrics.drawCalls = renderer.info.render.calls;
      this.metrics.triangles = renderer.info.render.triangles;

      this.frameCount = 0;
      this.lastFpsUpdate = now;

      if (this.autoAdjust) {
        this.adjustQualityIfNeeded();
      }
    }
  }

  private adjustQualityIfNeeded(): void {
    const avgFps = this.getAverageFps();

    if (avgFps < this.fpsThresholds.downgrade) {
      const currentPresetName = this.qualityPreset.name;
      if (currentPresetName === 'ultra') this.setQualityPreset('high');
      else if (currentPresetName === 'high') this.setQualityPreset('medium');
      else if (currentPresetName === 'medium') this.setQualityPreset('low');
    } else if (avgFps > this.fpsThresholds.upgrade && this.getAverageFps(10) > this.fpsThresholds.upgrade) {
      const currentPresetName = this.qualityPreset.name;
      if (currentPresetName === 'low') this.setQualityPreset('medium');
      else if (currentPresetName === 'medium') this.setQualityPreset('high');
      else if (currentPresetName === 'high') this.setQualityPreset('ultra');
    }
  }

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

  public getCurrentPresetName(): string {
    return this.qualityPreset.name;
  }

  public getQualityPreset(): QualityPreset {
    return { ...this.qualityPreset };
  }

  public setQualityPreset(name: string): void {
    const preset = QUALITY_PRESETS[name];
    if (preset) {
      this.qualityPreset = preset;
      this.saveQualityPreset(name);
      if (import.meta.env.DEV) console.log(`🎨 Quality preset: ${preset.label}`);
    }
  }

  public setAutoAdjust(enabled: boolean): void {
    this.autoAdjust = enabled;
    localStorage.setItem('fpw_quality_auto', enabled.toString());
  }

  public isAutoAdjusting(): boolean {
    return this.autoAdjust;
  }

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

  public getMetricsDisplay(): string {
    const m = this.metrics;
    let display = `📊 FPS: ${m.fps.toFixed(0)} (${m.frameTime.toFixed(1)}ms)`;

    if (m.memoryUsed > 0) {
      display += ` | Mem: ${m.memoryUsed}/${m.memoryTotal}MB`;
    }

    display += ` | Draw: ${m.drawCalls} | Tri: ${(m.triangles / 1000000).toFixed(1)}M`;

    return display;
  }

  public static detectOptimalQuality(): string {
    const width = window.innerWidth;
    const devicePixelRatio = window.devicePixelRatio;

    if (width < 500 || devicePixelRatio < 1) return 'low';

    if (width < 768) return devicePixelRatio < 2 ? 'medium' : 'low';

    if (width < 1200) return 'medium';

    return 'high';
  }
}

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
