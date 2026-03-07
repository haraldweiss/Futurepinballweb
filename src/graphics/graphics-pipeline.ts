/**
 * graphics-pipeline.ts — Main orchestrator for the graphics rendering system
 * Manages: render loop, quality presets, geometry pooling, lighting, post-processing passes
 */

import * as THREE from 'three';
import { RenderPass, QualityPreset, GraphicsMetrics } from './graphics-types';
import { GeometryPool } from './geometry-pool';
import { MaterialFactory } from './material-factory';
import { LightManager } from './light-manager';

/**
 * GraphicsPipeline orchestrates all rendering operations.
 *
 * Responsibilities:
 * - Manage render loop coordination
 * - Handle frame timing and FPS monitoring
 * - Manage quality preset switching
 * - Coordinate geometry pool, material factory, lighting
 * - Execute post-processing passes in order
 */
export class GraphicsPipeline {
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.Camera;
  private composer: THREE.EffectComposer;

  // Graphics subsystems
  private geometryPool: GeometryPool;
  private materialFactory: MaterialFactory;
  private lightManager: LightManager;

  // Rendering passes
  private passes: Map<string, RenderPass> = new Map();
  private qualityPreset: QualityPreset = QUALITY_PRESETS.high;

  // Performance tracking
  private frameCount = 0;
  private lastTime = performance.now();
  private fps = 60;
  private frameTime = 16.67;  // milliseconds

  // Metrics
  private metrics: GraphicsMetrics = {
    frameTime: 0,
    fps: 60,
    drawCalls: 0,
    geometriesPooled: 0,
    materialsPooled: 0,
    lightsActive: 0,
    bloomTime: 0,
  };

  constructor(renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera, composer: THREE.EffectComposer) {
    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;
    this.composer = composer;

    // Initialize graphics subsystems
    this.geometryPool = new GeometryPool();
    this.materialFactory = new MaterialFactory();
    this.lightManager = new LightManager(scene);

    console.log('✓ GraphicsPipeline initialized');
  }

  /**
   * Initialize the pipeline (load resources, setup passes, etc.)
   */
  async initialize(): Promise<void> {
    // Can be extended for async resource loading
    console.log('✓ GraphicsPipeline ready');
  }

  /**
   * Register a rendering pass to be executed in order.
   */
  registerPass(pass: RenderPass): void {
    if (this.passes.has(pass.name)) {
      console.warn(`Pass "${pass.name}" already registered, replacing...`);
    }
    this.passes.set(pass.name, pass);
    console.log(`✓ Registered pass: ${pass.name}`);
  }

  /**
   * Remove a rendering pass by name.
   */
  removePass(name: string): void {
    const pass = this.passes.get(name);
    if (pass) {
      pass.dispose();
      this.passes.delete(name);
      console.log(`✓ Removed pass: ${name}`);
    }
  }

  /**
   * Main render frame function. Call once per animation frame.
   */
  renderFrame(dt: number): void {
    // Update frame timing and FPS
    const now = performance.now();
    const deltaTime = now - this.lastTime;

    this.frameCount++;
    if (deltaTime >= 1000) {
      this.fps = Math.round((this.frameCount * 1000) / deltaTime);
      this.frameTime = deltaTime / this.frameCount;
      this.frameCount = 0;
      this.lastTime = now;
    }

    // Update lighting system
    this.lightManager.update(dt);

    // Execute all registered passes in order
    const passStartTime = performance.now();
    for (const pass of this.passes.values()) {
      if (pass.enabled) {
        pass.render(this.renderer, this.scene, this.camera, dt);
      }
    }
    this.metrics.bloomTime = performance.now() - passStartTime;

    // Update metrics
    this.updateMetrics();
  }

  /**
   * Switch quality preset (affects bloom, shadows, etc.)
   */
  setQualityPreset(presetName: 'low' | 'medium' | 'high' | 'ultra'): void {
    const preset = QUALITY_PRESETS[presetName];
    if (!preset) {
      console.warn(`Unknown quality preset: ${presetName}`);
      return;
    }

    this.qualityPreset = preset;

    // Update pass settings based on preset
    const bloomPass = this.passes.get('Bloom') as any;
    if (bloomPass) {
      bloomPass.setStrength(preset.bloomStrength);
      bloomPass.setRadius(preset.bloomRadius);
      bloomPass.setThreshold(preset.bloomThreshold);
    }

    // Update light shadows
    this.lightManager.updateShadowMap(preset.shadowMapSize);

    console.log(`✓ Quality preset changed to: ${presetName}`);
  }

  /**
   * Get current quality preset
   */
  getQualityPreset(): QualityPreset {
    return this.qualityPreset;
  }

  /**
   * Get the geometry pool for requesting geometries
   */
  getGeometryPool(): GeometryPool {
    return this.geometryPool;
  }

  /**
   * Get the material factory for requesting materials
   */
  getMaterialFactory(): MaterialFactory {
    return this.materialFactory;
  }

  /**
   * Get the light manager for light lifecycle operations
   */
  getLightManager(): LightManager {
    return this.lightManager;
  }

  /**
   * Get current performance metrics
   */
  getMetrics(): GraphicsMetrics {
    return {
      ...this.metrics,
      fps: this.fps,
      frameTime: this.frameTime,
    };
  }

  /**
   * Update graphics metrics from renderer state
   */
  private updateMetrics(): void {
    // drawCalls can be queried from renderer if it supports it
    const info = (this.renderer as any).info;
    if (info) {
      this.metrics.drawCalls = info.render.calls || 0;
    }

    this.metrics.geometriesPooled = this.geometryPool.getPoolSize();
    this.metrics.materialsPooled = this.materialFactory.getCacheSize();
    this.metrics.lightsActive = this.lightManager.getLightCount();
  }

  /**
   * Cleanup all resources
   */
  dispose(): void {
    // Dispose passes
    for (const pass of this.passes.values()) {
      pass.dispose();
    }
    this.passes.clear();

    // Dispose subsystems
    this.geometryPool.dispose();
    this.materialFactory.dispose();
    this.lightManager.dispose();

    console.log('✓ GraphicsPipeline disposed');
  }
}

// ─── Quality Presets ────────────────────────────────────────────────────────

export const QUALITY_PRESETS: Record<'low' | 'medium' | 'high' | 'ultra', QualityPreset> = {
  low: {
    name: 'low',
    bloomEnabled: false,
    bloomStrength: 0.0,
    bloomRadius: 0.5,
    bloomThreshold: 0.5,
    fxaaEnabled: true,
    shadowMapSize: 512,
    shadowsEnabled: false,
    particlesEnabled: false,
    maxDrawCalls: 500,
  },
  medium: {
    name: 'medium',
    bloomEnabled: true,
    bloomStrength: 1.0,
    bloomRadius: 0.65,
    bloomThreshold: 0.25,
    fxaaEnabled: true,
    shadowMapSize: 1024,
    shadowsEnabled: true,
    particlesEnabled: true,
    maxDrawCalls: 1000,
  },
  high: {
    name: 'high',
    bloomEnabled: true,
    bloomStrength: 1.6,
    bloomRadius: 0.75,
    bloomThreshold: 0.15,
    fxaaEnabled: true,
    shadowMapSize: 2048,
    shadowsEnabled: true,
    particlesEnabled: true,
    maxDrawCalls: 2000,
  },
  ultra: {
    name: 'ultra',
    bloomEnabled: true,
    bloomStrength: 1.8,
    bloomRadius: 0.85,
    bloomThreshold: 0.10,
    fxaaEnabled: true,
    shadowMapSize: 4096,
    shadowsEnabled: true,
    particlesEnabled: true,
    maxDrawCalls: 4000,
  },
};

// ─── Singleton Instance ─────────────────────────────────────────────────────

let graphicsPipelineInstance: GraphicsPipeline | null = null;

/**
 * Initialize the graphics pipeline singleton
 */
export function initializeGraphicsPipeline(
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.Camera,
  composer: THREE.EffectComposer
): GraphicsPipeline {
  if (!graphicsPipelineInstance) {
    graphicsPipelineInstance = new GraphicsPipeline(renderer, scene, camera, composer);
  }
  return graphicsPipelineInstance;
}

/**
 * Get the graphics pipeline singleton
 */
export function getGraphicsPipeline(): GraphicsPipeline {
  if (!graphicsPipelineInstance) {
    throw new Error('GraphicsPipeline not initialized. Call initializeGraphicsPipeline() first.');
  }
  return graphicsPipelineInstance;
}
