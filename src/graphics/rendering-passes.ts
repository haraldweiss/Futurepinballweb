/**
 * rendering-passes.ts — Modular post-processing pass implementations
 * Provides bloom, FXAA, tone mapping and other effects as composable passes
 */

import * as THREE from 'three';
import { RenderPass as RenderPassBase, UnrealBloomPass } from 'three/addons/postprocessing/index.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { FXAAShader } from 'three/addons/shaders/FXAAShader.js';
import { RenderPass } from './graphics-types';

/**
 * BaseRenderPass — Renders scene to framebuffer.
 * Usually the first pass in the pipeline.
 */
export class SceneRenderPass extends RenderPass {
  private pass: RenderPassBase;

  constructor(scene: THREE.Scene, camera: THREE.Camera) {
    super('SceneRender');
    this.pass = new RenderPassBase(scene, camera);
    this.pass.renderToScreen = false;  // Let other passes handle output
  }

  render(renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera): void {
    // Scene render is handled by EffectComposer internally
    // This pass exists for pipeline abstraction
  }

  dispose(): void {
    // RenderPass doesn't need explicit disposal
  }
}

/**
 * BloomPass — Adds glow effect to bright surfaces.
 * Parameters can be adjusted per quality preset.
 */
export class BloomPassImpl extends RenderPass {
  private pass: UnrealBloomPass;

  constructor(width: number, height: number, strength: number = 1.6, radius: number = 0.75, threshold: number = 0.15) {
    super('Bloom');
    this.pass = new UnrealBloomPass(new THREE.Vector2(width, height), strength, radius, threshold);
    this.pass.renderToScreen = false;
  }

  render(renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera): void {
    // Pass is executed by EffectComposer
  }

  /**
   * Update bloom strength.
   */
  setStrength(strength: number): void {
    this.pass.strength = strength;
  }

  /**
   * Update bloom radius (glow falloff).
   */
  setRadius(radius: number): void {
    this.pass.radius = radius;
  }

  /**
   * Update bloom threshold (which surfaces glow).
   */
  setThreshold(threshold: number): void {
    this.pass.threshold = threshold;
  }

  /**
   * Resize for viewport changes.
   */
  setSize(width: number, height: number): void {
    this.pass.setSize(width, height);
  }

  getPass(): UnrealBloomPass {
    return this.pass;
  }

  dispose(): void {
    // UnrealBloomPass handles its own cleanup
  }
}

/**
 * FXAAPass — Fast approximate anti-aliasing.
 * Smooths jagged edges without MSAA overhead.
 */
export class FXAAPassImpl extends RenderPass {
  private pass: ShaderPass;
  private width: number;
  private height: number;

  constructor(width: number, height: number) {
    super('FXAA');
    this.width = width;
    this.height = height;

    this.pass = new ShaderPass(FXAAShader);
    this.updateResolution(width, height);
    this.pass.renderToScreen = false;
  }

  render(renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera): void {
    // Pass is executed by EffectComposer
  }

  /**
   * Update resolution for quality adjustments.
   */
  private updateResolution(width: number, height: number): void {
    this.pass.uniforms['resolution'].value.x = 1 / width;
    this.pass.uniforms['resolution'].value.y = 1 / height;
  }

  /**
   * Resize for viewport changes.
   */
  setSize(width: number, height: number, pixelRatio: number = 1): void {
    this.width = width;
    this.height = height;
    this.updateResolution(width * pixelRatio, height * pixelRatio);
  }

  getPass(): ShaderPass {
    return this.pass;
  }

  dispose(): void {
    if (this.pass.fsQuad?.geometry) {
      this.pass.fsQuad.geometry.dispose();
    }
    if (this.pass.fsQuad?.material) {
      this.pass.fsQuad.material.dispose();
    }
  }
}

/**
 * ToneMappingPass — Applies tone mapping for better color reproduction.
 * Converts HDR to display range.
 */
export class ToneMappingPassImpl extends RenderPass {
  private renderer: THREE.WebGLRenderer | null = null;
  private exposure: number = 1.15;

  constructor() {
    super('ToneMapping');
  }

  render(renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera): void {
    // Tone mapping is applied in renderer, not as a separate pass
    // But we keep this for pipeline consistency
    if (renderer !== this.renderer) {
      this.renderer = renderer;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = this.exposure;
    }
  }

  /**
   * Set tone mapping exposure.
   */
  setExposure(exposure: number): void {
    this.exposure = exposure;
    if (this.renderer) {
      this.renderer.toneMappingExposure = exposure;
    }
  }

  /**
   * Change tone mapping mode.
   */
  setToneMapping(type: number): void {
    if (this.renderer) {
      this.renderer.toneMapping = type;
    }
  }

  dispose(): void {
    // Nothing to dispose for tone mapping
  }
}

/**
 * CustomShaderPass — Generic shader pass for custom effects.
 * Can be used for custom color grading, filters, etc.
 */
export class CustomShaderPass extends RenderPass {
  private pass: ShaderPass;

  constructor(shader: THREE.Shader, name: string = 'CustomShader') {
    super(name);
    this.pass = new ShaderPass(shader);
    this.pass.renderToScreen = false;
  }

  render(renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera): void {
    // Pass is executed by EffectComposer
  }

  /**
   * Set a uniform value in the shader.
   */
  setUniform(name: string, value: any): void {
    if (this.pass.uniforms[name]) {
      this.pass.uniforms[name].value = value;
    }
  }

  getPass(): ShaderPass {
    return this.pass;
  }

  dispose(): void {
    if (this.pass.fsQuad?.geometry) {
      this.pass.fsQuad.geometry.dispose();
    }
    if (this.pass.fsQuad?.material) {
      this.pass.fsQuad.material.dispose();
    }
  }
}

/**
 * Helper to setup standard post-processing pipeline.
 */
export function createStandardPasses(
  composer: THREE.EffectComposer,
  scene: THREE.Scene,
  camera: THREE.Camera,
  width: number,
  height: number,
  options?: {
    bloomStrength?: number;
    bloomRadius?: number;
    bloomThreshold?: number;
  }
): {
  bloom: BloomPassImpl;
  fxaa: FXAAPassImpl;
  toneMapping: ToneMappingPassImpl;
} {
  // Bloom
  const bloom = new BloomPassImpl(
    width,
    height,
    options?.bloomStrength ?? 1.6,
    options?.bloomRadius ?? 0.75,
    options?.bloomThreshold ?? 0.15
  );
  composer.addPass(bloom.getPass());

  // FXAA
  const fxaa = new FXAAPassImpl(width, height);
  composer.addPass(fxaa.getPass());
  fxaa.getPass().renderToScreen = true;  // Last pass renders to screen

  // Tone mapping (built into renderer, but included for completeness)
  const toneMapping = new ToneMappingPassImpl();

  return { bloom, fxaa, toneMapping };
}

/**
 * Helper to create a complete post-processing pipeline.
 */
export function createPostProcessingPipeline(
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.Camera,
  qualityPreset: 'low' | 'medium' | 'high' | 'ultra' = 'high'
): THREE.EffectComposer {
  const width = window.innerWidth;
  const height = window.innerHeight;
  const pixelRatio = renderer.getPixelRatio();

  const composer = new THREE.EffectComposer(renderer);

  // Base scene render
  const renderPass = new RenderPassBase(scene, camera);
  composer.addPass(renderPass);

  // Quality-dependent effects
  const presetConfig = getPresetConfig(qualityPreset);

  if (presetConfig.bloomEnabled) {
    const bloom = new BloomPassImpl(
      width,
      height,
      presetConfig.bloomStrength,
      presetConfig.bloomRadius,
      presetConfig.bloomThreshold
    );
    composer.addPass(bloom.getPass());
  }

  if (presetConfig.fxaaEnabled) {
    const fxaa = new FXAAPassImpl(width, height);
    fxaa.setSize(width, height, pixelRatio);
    composer.addPass(fxaa.getPass());
  }

  // Always apply tone mapping
  const lastPass = composer.passes[composer.passes.length - 1];
  if (lastPass) {
    lastPass.renderToScreen = true;
  }

  return composer;
}

/**
 * Get preset configuration for post-processing.
 */
function getPresetConfig(preset: 'low' | 'medium' | 'high' | 'ultra') {
  const configs = {
    low: {
      bloomEnabled: false,
      bloomStrength: 0,
      bloomRadius: 0,
      bloomThreshold: 0,
      fxaaEnabled: true,
    },
    medium: {
      bloomEnabled: true,
      bloomStrength: 1.0,
      bloomRadius: 0.65,
      bloomThreshold: 0.25,
      fxaaEnabled: true,
    },
    high: {
      bloomEnabled: true,
      bloomStrength: 1.6,
      bloomRadius: 0.75,
      bloomThreshold: 0.15,
      fxaaEnabled: true,
    },
    ultra: {
      bloomEnabled: true,
      bloomStrength: 1.8,
      bloomRadius: 0.85,
      bloomThreshold: 0.10,
      fxaaEnabled: true,
    },
  };

  return configs[preset];
}
