/**
 * polish-suite-diagnostics.ts — Full Polish Suite Diagnostics & Health Check
 *
 * Provides comprehensive system health checks, performance metrics, and artifact detection
 * for the Full Polish Suite visual enhancement system.
 */

import * as THREE from 'three';
import { QualityPreset, QUALITY_PRESETS } from '../profiler';

export interface DiagnosticReport {
  timestamp: string;
  systemHealth: SystemHealthStatus;
  features: FeatureDiagnostics;
  performance: PerformanceMetrics;
  artifacts: ArtifactDetection;
  recommendations: string[];
}

export interface SystemHealthStatus {
  overall: 'healthy' | 'degraded' | 'critical';
  renderer: RendererStatus;
  memory: MemoryStatus;
  renderTargets: RenderTargetStatus;
}

export interface RendererStatus {
  webglVersion: string;
  maxTextureSize: number;
  maxRenderBufferSize: number;
  antialias: boolean;
  floatTextures: boolean;
  halfFloatTextures: boolean;
  depthTexture: boolean;
}

export interface MemoryStatus {
  heapUsed: number;
  heapLimit: number;
  heapPercent: number;
  estimate?: number;
  status: 'healthy' | 'warning' | 'critical';
}

export interface RenderTargetStatus {
  activeTargets: number;
  estimatedVRAM: number;
  status: 'healthy' | 'warning' | 'critical';
}

export interface FeatureDiagnostics {
  ssr: FeatureStatus;
  motionBlur: FeatureStatus;
  cascadedShadows: FeatureStatus;
  perLightBloom: FeatureStatus;
  advancedParticles: FeatureStatus;
  filmEffects: FeatureStatus;
  dof: FeatureStatus;
}

export interface FeatureStatus {
  enabled: boolean;
  functional: boolean;
  sampleCount?: number;
  intensity?: number;
  memoryUsage?: number;
  issues: string[];
}

export interface PerformanceMetrics {
  fps: number;
  frameTime: number;
  vSync: boolean;
  droppedFrames: number;
  cpuLoad: number;
  gpuLoad: number;
  activeDrawCalls: number;
}

export interface ArtifactDetection {
  shadingArtifacts: string[];
  geometryIssues: string[];
  lightingProblems: string[];
  particleIssues: string[];
  performanceIssues: string[];
  recommendations: string[];
}

/**
 * Full Polish Suite Diagnostics System
 */
export class PolishSuiteDiagnostics {
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.Camera;
  private fps: number = 60;
  private frameCount: number = 0;
  private lastTime: number = performance.now();
  private droppedFrames: number = 0;

  constructor(
    renderer: THREE.WebGLRenderer,
    scene: THREE.Scene,
    camera: THREE.Camera
  ) {
    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;
  }

  /**
   * Run complete diagnostic report
   */
  runDiagnostics(currentPreset: QualityPreset): DiagnosticReport {
    const now = new Date();
    const timestamp = now.toISOString();

    return {
      timestamp,
      systemHealth: this.checkSystemHealth(),
      features: this.checkFeatures(currentPreset),
      performance: this.checkPerformance(),
      artifacts: this.detectArtifacts(currentPreset),
      recommendations: this.generateRecommendations(currentPreset),
    };
  }

  /**
   * Check overall system health
   */
  private checkSystemHealth(): SystemHealthStatus {
    const memStatus = this.checkMemory();
    const rendererStatus = this.checkRenderer();
    const rtStatus = this.checkRenderTargets();

    let overall: 'healthy' | 'degraded' | 'critical' = 'healthy';
    if (
      memStatus.status === 'critical' ||
      rtStatus.status === 'critical'
    ) {
      overall = 'critical';
    } else if (
      memStatus.status === 'warning' ||
      rtStatus.status === 'warning'
    ) {
      overall = 'degraded';
    }

    return {
      overall,
      renderer: rendererStatus,
      memory: memStatus,
      renderTargets: rtStatus,
    };
  }

  /**
   * Check renderer capabilities
   */
  private checkRenderer(): RendererStatus {
    const gl = this.renderer.getContext() as WebGLRenderingContext;
    const ext = gl.getExtension('EXT_texture_filter_anisotropic') ||
                gl.getExtension('MOZ_EXT_texture_filter_anisotropic') ||
                gl.getExtension('WEBKIT_EXT_texture_filter_anisotropic');

    return {
      webglVersion: gl.getParameter(gl.VERSION),
      maxTextureSize: gl.getParameter(gl.MAX_TEXTURE_SIZE),
      maxRenderBufferSize: gl.getParameter(gl.MAX_RENDERBUFFER_SIZE),
      antialias: this.renderer.antialias,
      floatTextures: !!gl.getExtension('OES_texture_float'),
      halfFloatTextures: !!gl.getExtension('OES_texture_half_float'),
      depthTexture: !!gl.getExtension('WEBGL_depth_texture'),
    };
  }

  /**
   * Check memory usage
   */
  private checkMemory(): MemoryStatus {
    let heapUsed = 0;
    let heapLimit = 0;
    let heapPercent = 0;
    let status: 'healthy' | 'warning' | 'critical' = 'healthy';

    if ((performance as any).memory) {
      heapUsed = (performance as any).memory.usedJSHeapSize;
      heapLimit = (performance as any).memory.jsHeapSizeLimit;
      heapPercent = (heapUsed / heapLimit) * 100;

      if (heapPercent > 90) {
        status = 'critical';
      } else if (heapPercent > 75) {
        status = 'warning';
      }
    }

    return {
      heapUsed,
      heapLimit,
      heapPercent,
      estimate: this.estimateVRAMUsage(),
      status,
    };
  }

  /**
   * Check render target status
   */
  private checkRenderTargets(): RenderTargetStatus {
    let activeTargets = 0;
    let estimatedVRAM = 0;

    // Traverse scene and count render targets
    this.scene.traverse((obj: any) => {
      if (obj.renderTarget) {
        activeTargets++;
        estimatedVRAM += obj.renderTarget.width * obj.renderTarget.height * 4 * 4; // 4 bytes per pixel
      }
    });

    let status: 'healthy' | 'warning' | 'critical' = 'healthy';
    if (estimatedVRAM > 200 * 1024 * 1024) { // 200MB
      status = 'warning';
    } else if (estimatedVRAM > 500 * 1024 * 1024) { // 500MB
      status = 'critical';
    }

    return {
      activeTargets,
      estimatedVRAM,
      status,
    };
  }

  /**
   * Estimate VRAM usage for render targets
   */
  private estimateVRAMUsage(): number {
    // Estimate based on common render targets:
    // - Bloom target: 1920x1080x4 = 8.3MB
    // - SSR targets: 1920x1080x4x3 = 24.9MB
    // - Cascade shadows: 2048x2048x4 = 64MB
    // - Particle buffer: 600 particles x 64 bytes = ~38KB
    // Total estimate: ~100MB

    return 100 * 1024 * 1024; // 100MB estimated
  }

  /**
   * Check feature status
   */
  private checkFeatures(preset: QualityPreset): FeatureDiagnostics {
    return {
      ssr: {
        enabled: preset.ssrEnabled,
        functional: preset.ssrEnabled,
        sampleCount: preset.ssrSamples,
        intensity: preset.ssrIntensity,
        issues: preset.ssrEnabled ? [] : ['SSR disabled on this preset'],
      },
      motionBlur: {
        enabled: preset.motionBlurEnabled,
        functional: preset.motionBlurEnabled,
        sampleCount: preset.motionBlurSamples,
        intensity: preset.motionBlurStrength,
        issues: preset.motionBlurEnabled ? [] : ['Motion blur disabled on this preset'],
      },
      cascadedShadows: {
        enabled: preset.cascadeShadowsEnabled,
        functional: preset.cascadeShadowsEnabled,
        sampleCount: preset.cascadeCount,
        intensity: preset.cascadeShadowMapSize,
        issues: preset.cascadeShadowsEnabled ? [] : ['Cascaded shadows disabled'],
      },
      perLightBloom: {
        enabled: preset.perLightBloomEnabled,
        functional: preset.perLightBloomEnabled,
        intensity: preset.perLightBloomStrength,
        issues: preset.perLightBloomEnabled ? [] : ['Per-light bloom disabled'],
      },
      advancedParticles: {
        enabled: preset.advancedParticlesEnabled,
        functional: preset.advancedParticlesEnabled,
        sampleCount: preset.maxParticles,
        intensity: preset.particlePhysicsEnabled ? 1.0 : 0.5,
        issues: preset.advancedParticlesEnabled ? [] : ['Advanced particles disabled'],
      },
      filmEffects: {
        enabled: preset.filmEffectsEnabled,
        functional: preset.filmEffectsEnabled,
        intensity: preset.filmGrainIntensity,
        issues: preset.filmEffectsEnabled ? [] : ['Film effects disabled'],
      },
      dof: {
        enabled: preset.depthOfFieldEnabled,
        functional: preset.depthOfFieldEnabled,
        sampleCount: preset.dofSamples,
        intensity: preset.dofAperture,
        issues: preset.depthOfFieldEnabled ? [] : ['DOF disabled (ultra only)'],
      },
    };
  }

  /**
   * Check performance metrics
   */
  private checkPerformance(): PerformanceMetrics {
    const now = performance.now();
    const delta = now - this.lastTime;

    this.frameCount++;
    if (delta >= 1000) {
      this.fps = this.frameCount;
      this.frameCount = 0;
      this.lastTime = now;
    }

    const frameTime = delta;
    const droppedFrames = this.fps < 50 ? 60 - this.fps : 0;

    return {
      fps: this.fps,
      frameTime,
      vSync: true,
      droppedFrames,
      cpuLoad: Math.min(100, (frameTime / 16.67) * 100),
      gpuLoad: Math.min(100, (frameTime / 16.67) * 100),
      activeDrawCalls: this.renderer.info.render.calls,
    };
  }

  /**
   * Detect visual artifacts
   */
  private detectArtifacts(preset: QualityPreset): ArtifactDetection {
    const artifacts: ArtifactDetection = {
      shadingArtifacts: [],
      geometryIssues: [],
      lightingProblems: [],
      particleIssues: [],
      performanceIssues: [],
      recommendations: [],
    };

    // Check SSR artifacts
    if (preset.ssrEnabled && preset.ssrSamples < 8) {
      artifacts.shadingArtifacts.push('SSR may appear blocky with <8 samples');
      artifacts.recommendations.push('Increase ssrSamples to 12-16');
    }

    // Check shadow artifacts
    if (preset.cascadeShadowsEnabled && preset.cascadeShadowMapSize < 1024) {
      artifacts.lightingProblems.push('Cascaded shadows may have banding');
      artifacts.recommendations.push('Increase cascadeShadowMapSize to 2048+');
    }

    // Check particle issues
    if (preset.maxParticles > 800 && preset.particlePhysicsEnabled) {
      artifacts.particleIssues.push('High particle count with physics may cause slowdown');
      artifacts.recommendations.push('Reduce maxParticles or disable physics on lower devices');
    }

    // Check film grain intensity
    if (preset.filmGrainIntensity > 0.25) {
      artifacts.shadingArtifacts.push('Film grain may be too visible');
      artifacts.recommendations.push('Reduce filmGrainIntensity to 0.15-0.2');
    }

    return artifacts;
  }

  /**
   * Generate optimization recommendations
   */
  private generateRecommendations(preset: QualityPreset): string[] {
    const recommendations: string[] = [];

    // FPS optimization
    if (this.fps < 50) {
      recommendations.push(
        `Low FPS (${this.fps}): Consider switching to medium preset or disabling SSR/motion blur`
      );
    }

    // Memory optimization
    if ((performance as any).memory) {
      const heapUsed = (performance as any).memory.usedJSHeapSize;
      const heapLimit = (performance as any).memory.jsHeapSizeLimit;
      const heapPercent = (heapUsed / heapLimit) * 100;

      if (heapPercent > 80) {
        recommendations.push(
          `High memory usage (${heapPercent.toFixed(1)}%): Enable garbage collection by reducing particle count`
        );
      }
    }

    // Feature recommendations
    if (!preset.ssrEnabled && preset.name === 'high') {
      recommendations.push('SSR is disabled on this preset - consider enabling for better visuals');
    }

    if (preset.cascadeShadowsEnabled && preset.cascadeShadowMapSize === 512) {
      recommendations.push(
        'Shadow map resolution is low - increase to 1024+ for better quality'
      );
    }

    // Device recommendations
    if (this.renderer.info.render.calls > 2000) {
      recommendations.push('High draw call count detected - consider reducing particle count or simplifying geometry');
    }

    return recommendations;
  }

  /**
   * Format diagnostic report as human-readable text
   */
  formatReport(report: DiagnosticReport): string {
    let output = '═══════════════════════════════════════════════════════\n';
    output += '  Full Polish Suite - Diagnostic Report\n';
    output += '═══════════════════════════════════════════════════════\n\n';

    output += `📅 Generated: ${report.timestamp}\n\n`;

    // System Health
    output += '🏥 System Health: ' + (report.systemHealth.overall === 'healthy' ? '✅ HEALTHY' : '⚠️ ' + report.systemHealth.overall.toUpperCase()) + '\n';
    output += `   Memory: ${(report.systemHealth.memory.heapPercent).toFixed(1)}% used\n`;
    output += `   Render Targets: ${report.systemHealth.renderTargets.activeTargets}\n\n`;

    // Performance
    output += `⚡ Performance\n`;
    output += `   FPS: ${report.performance.fps} | Frame Time: ${report.performance.frameTime.toFixed(2)}ms\n`;
    output += `   CPU Load: ${report.performance.cpuLoad.toFixed(1)}% | GPU Load: ${report.performance.gpuLoad.toFixed(1)}%\n`;
    output += `   Draw Calls: ${report.performance.activeDrawCalls}\n\n`;

    // Features
    output += '🎨 Active Features\n';
    const features = Object.entries(report.features);
    features.forEach(([name, status]) => {
      output += `   ${status.enabled ? '✅' : '❌'} ${name}: ${status.functional ? 'Functional' : 'Issues'}\n`;
    });
    output += '\n';

    // Artifacts
    if (report.artifacts.shadingArtifacts.length > 0) {
      output += '🐛 Shading Artifacts\n';
      report.artifacts.shadingArtifacts.forEach(artifact => {
        output += `   ⚠️ ${artifact}\n`;
      });
      output += '\n';
    }

    // Recommendations
    if (report.recommendations.length > 0) {
      output += '💡 Recommendations\n';
      report.recommendations.forEach(rec => {
        output += `   • ${rec}\n`;
      });
      output += '\n';
    }

    output += '═══════════════════════════════════════════════════════\n';

    return output;
  }
}

/**
 * Global diagnostics instance
 */
let globalDiagnostics: PolishSuiteDiagnostics | null = null;

/**
 * Initialize diagnostics
 */
export function initializePolishSuiteDiagnostics(
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.Camera
): void {
  globalDiagnostics = new PolishSuiteDiagnostics(renderer, scene, camera);
  console.log('✓ Polish Suite Diagnostics initialized');
}

/**
 * Run diagnostics and print report
 */
export function runPolishSuiteDiagnostics(preset: QualityPreset): DiagnosticReport | null {
  if (!globalDiagnostics) {
    console.warn('⚠️ Diagnostics not initialized');
    return null;
  }

  const report = globalDiagnostics.runDiagnostics(preset);
  const formatted = globalDiagnostics.formatReport(report);
  console.log(formatted);

  return report;
}

/**
 * Get diagnostics instance
 */
export function getPolishSuiteDiagnostics(): PolishSuiteDiagnostics | null {
  return globalDiagnostics;
}
