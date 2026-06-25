/**
 * quality-system.ts — Quality preset system.
 *
 * applyOptimizedTableView() applies responsive view + quality optimization.
 * Quality setters (setQualityPreset, getQualityPreset, toggleAutoQuality)
 * expose profiler controls to the UI.
 *
 * Extracted from main.ts.
 */
import * as THREE from 'three';
import { QUALITY_PRESETS, PerformanceProfiler } from '../profiler';
import { devLog } from '../utils/dev-log';
import { getOptimizedTableView } from './view-utils';

export interface QualitySystemDeps {
  camera: THREE.PerspectiveCamera;
  profiler: PerformanceProfiler;
  /** Tracks last applied preset to avoid redundant calls. */
  lastAppliedQualityPreset: { current: string };
  /** Reference to showProfiler flag (mutated by togglePerformanceMonitor). */
  showProfilerRef: { current: boolean };
  /** Callback to apply quality preset to rendering objects. */
  applyQualityPreset: () => void;
}

export interface QualitySystemApi {
  applyOptimizedTableView: () => void;
  setQualityPreset: (name: string) => void;
  getQualityPreset: () => any;
  getAvailableQualityPresets: () => string[];
  toggleAutoQuality: () => void;
  getPerformanceMetrics: () => any;
  togglePerformanceMonitor: () => void;
}

/**
 * Create quality system functions bound to the app's rendering objects.
 */
export function createQualitySystem(deps: QualitySystemDeps): QualitySystemApi {
  const { camera, profiler, lastAppliedQualityPreset, showProfilerRef, applyQualityPreset } = deps;

  function applyOptimizedTableView(): void {
    const view = getOptimizedTableView();

    if (camera instanceof THREE.PerspectiveCamera) {
      camera.fov = view.fov;
      camera.position.z = view.zoom;
      camera.position.y = view.tilt;
      camera.updateProjectionMatrix();
    }

    const currentQuality = localStorage.getItem('fpw_quality_preset') || 'auto';
    if (currentQuality !== view.quality) {
      profiler.setQualityPreset(view.quality);
      applyQualityPreset();
      localStorage.setItem('fpw_quality_preset', view.quality);
    }
  }

  function setQualityPreset(name: string): void {
    profiler.setQualityPreset(name);
    applyQualityPreset();
    devLog(`✅ Quality preset changed to: ${name}`);
  }

  function getQualityPreset(): any {
    return profiler.getQualityPreset();
  }

  function getAvailableQualityPresets(): string[] {
    return Object.keys(QUALITY_PRESETS);
  }

  function toggleAutoQuality(): void {
    const current = profiler.isAutoAdjusting();
    profiler.setAutoAdjust(!current);
    devLog(`🎯 Auto-quality adjustment: ${!current ? 'ON' : 'OFF'}`);
  }

  function getPerformanceMetrics(): any {
    return profiler.getMetrics();
  }

  function togglePerformanceMonitor(): void {
    showProfilerRef.current = !showProfilerRef.current;
    localStorage.setItem('fpw_show_profiler', showProfilerRef.current.toString());
  }

  return {
    applyOptimizedTableView,
    setQualityPreset,
    getQualityPreset,
    getAvailableQualityPresets,
    toggleAutoQuality,
    getPerformanceMetrics,
    togglePerformanceMonitor,
  };
}
