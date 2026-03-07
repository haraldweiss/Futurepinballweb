/**
 * graphics-types.ts — Shared type definitions for the graphics pipeline system
 * Provides interfaces for: RenderPass, GeometryPool, MaterialFactory, LightManager
 */

import type * as THREE from 'three';

// ─── Render Pass System ──────────────────────────────────────────────────────

/**
 * Abstract base class for all rendering passes.
 * Enables modular, composable post-processing pipeline.
 */
export abstract class RenderPass {
  name: string;
  enabled: boolean;

  constructor(name: string) {
    this.name = name;
    this.enabled = true;
  }

  /**
   * Execute this pass. Called once per frame by GraphicsPipeline.
   */
  abstract render(
    renderer: THREE.WebGLRenderer,
    scene: THREE.Scene,
    camera: THREE.Camera,
    dt: number
  ): void;

  /**
   * Cleanup resources (textures, framebuffers, etc.)
   */
  abstract dispose(): void;
}

// ─── Geometry Pooling System ─────────────────────────────────────────────────

/**
 * Key for caching geometries in the geometry pool.
 * Allows multiple geometries with same parameters to be reused.
 */
export interface GeometryKey {
  type: 'cylinder' | 'box' | 'sphere' | 'custom';
  params: Record<string, number | string>;
}

/**
 * Represents a pooled geometry entry with usage tracking.
 */
export interface PooledGeometry {
  geometry: THREE.BufferGeometry;
  refCount: number;
  created: number;  // Timestamp for LRU eviction
}

// ─── Material Factory System ─────────────────────────────────────────────────

/**
 * Configuration for material creation.
 */
export interface MaterialConfig {
  color: number;
  metalness?: number;
  roughness?: number;
  emissive?: number;
  emissiveIntensity?: number;
  normalMap?: THREE.Texture;
  aoMap?: THREE.Texture;
  displacementMap?: THREE.Texture;
}

/**
 * Represents a cached material with usage metadata.
 */
export interface CachedMaterial {
  material: THREE.MeshStandardMaterial;
  refCount: number;
  created: number;
}

/**
 * Texture atlas region UV coordinates for atlas-based rendering.
 */
export interface UVRegion {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

/**
 * Texture atlas containing consolidated textures.
 */
export interface TextureAtlas {
  texture: THREE.Texture;
  regions: Map<string, UVRegion>;
  width: number;
  height: number;
}

// ─── Light Manager System ────────────────────────────────────────────────────

/**
 * Configuration for light creation and updates.
 */
export interface LightConfig {
  color: number;
  intensity: number;
  distance?: number;
  angle?: number;
  penumbra?: number;
  decay?: number;
  castShadow?: boolean;
  shadowMapSize?: number;
}

/**
 * Runtime light metadata for lifecycle management.
 */
export interface ManagedLight {
  id: string;
  light: THREE.Light;
  config: LightConfig;
  dynamic: boolean;
  pulseMin?: number;
  pulseMax?: number;
  pulseDuration?: number;
  pulseTime?: number;
}

/**
 * Dynamic light update for per-frame changes.
 */
export interface DynamicLightUpdate {
  lightId: string;
  intensity?: number;
  color?: number;
  position?: { x: number; y: number; z: number };
}

// ─── Quality Presets ────────────────────────────────────────────────────────

/**
 * Quality preset configuration affecting rendering performance and visual fidelity.
 */
export interface QualityPreset {
  name: 'low' | 'medium' | 'high' | 'ultra';
  bloomEnabled: boolean;
  bloomStrength: number;
  bloomRadius: number;
  bloomThreshold: number;
  fxaaEnabled: boolean;
  shadowMapSize: 512 | 1024 | 2048 | 4096;
  shadowsEnabled: boolean;
  particlesEnabled: boolean;
  maxDrawCalls: number;
}

// ─── Graphics Pipeline State ────────────────────────────────────────────────

/**
 * Metrics for performance monitoring.
 */
export interface GraphicsMetrics {
  frameTime: number;
  fps: number;
  drawCalls: number;
  geometriesPooled: number;
  materialsPooled: number;
  lightsActive: number;
  bloomTime: number;
}

// ─── Pass Types for Composition ──────────────────────────────────────────────

/**
 * Base render pass - renders scene to target.
 */
export class BaseRenderPass extends RenderPass {
  private renderPass: THREE.RenderPass;
  private composer: THREE.EffectComposer;

  constructor(composer: THREE.EffectComposer, scene: THREE.Scene, camera: THREE.Camera) {
    super('BaseRender');
    this.composer = composer;
    this.renderPass = new (require('three/addons/postprocessing/RenderPass.js').RenderPass)(scene, camera);
    this.renderPass.renderToScreen = false;  // Let other passes handle output
  }

  render(renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera): void {
    if (!this.enabled) return;
    // Base pass is typically added to composer automatically
  }

  dispose(): void {
    // RenderPass doesn't need explicit disposal
  }
}

/**
 * Post-processing pass for bloom effect.
 */
export interface IBloomPass extends RenderPass {
  setStrength(strength: number): void;
  setRadius(radius: number): void;
  setThreshold(threshold: number): void;
}

/**
 * Post-processing pass for anti-aliasing.
 */
export interface IFXAAPass extends RenderPass {
  setResolution(width: number, height: number): void;
}

/**
 * Post-processing pass for tone mapping.
 */
export interface IToneMappingPass extends RenderPass {
  setExposure(exposure: number): void;
  setToneMapping(type: number): void;
}
