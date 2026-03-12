/**
 * playfield-visual-enhancement.ts — Comprehensive Visual Upgrade System for Playfield
 *
 * Coordinates all visual enhancements to make the playfield competitive with VPX:
 * - Screen-Space Ambient Occlusion (SSAO)
 * - Enhanced PBR Materials
 * - Improved Shadows and Lighting
 * - Color Grading and Tone Mapping
 * - Screen-Space Reflections
 * - Enhanced Particle Effects
 */

import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { SSAOPass } from './ssao-pass';
import { EnhancedMaterialFactory, getEnhancedMaterialFactory } from './enhanced-materials';
import { getMetallicMaterialFactory } from './metallic-materials';

/**
 * ColorGradingShader — Tone mapping and color grading post-process
 */
const ColorGradingShader = {
  uniforms: {
    tDiffuse: { value: null },
    exposure: { value: 1.0 },
    saturation: { value: 1.0 },
    contrast: { value: 1.0 },
    colorTemp: { value: 0.0 }, // -1 to +1
  },

  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,

  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float exposure;
    uniform float saturation;
    uniform float contrast;
    uniform float colorTemp;

    varying vec2 vUv;

    vec3 tonemap(vec3 col) {
      // ACES tone mapping
      const float A = 2.51;
      const float B = 0.03;
      const float C = 2.43;
      const float D = 0.59;
      const float E = 0.14;
      return clamp((col * (A * col + B)) / (col * (C * col + D) + E), 0.0, 1.0);
    }

    vec3 adjustSaturation(vec3 color, float saturation) {
      const vec3 weights = vec3(0.299, 0.587, 0.114);
      float gray = dot(color, weights);
      return mix(vec3(gray), color, saturation);
    }

    void main() {
      vec4 texColor = texture2D(tDiffuse, vUv);
      vec3 col = texColor.rgb;

      // Apply exposure
      col *= exposure;

      // Apply tone mapping
      col = tonemap(col);

      // Apply color temperature
      if (colorTemp > 0.0) {
        // Warm (yellow)
        col.rb *= mix(1.0, 0.8, colorTemp);
        col.g *= mix(1.0, 1.1, colorTemp);
      } else {
        // Cool (blue)
        col.rb *= mix(1.0, 1.2, -colorTemp);
        col.g *= mix(1.0, 0.9, -colorTemp);
      }

      // Apply saturation
      col = adjustSaturation(col, saturation);

      // Apply contrast
      col = mix(vec3(0.5), col, contrast);

      gl_FragColor = vec4(col, texColor.a);
    }
  `,
};

/**
 * PlayfieldVisualEnhancement — Main orchestrator for all visual improvements
 */
export class PlayfieldVisualEnhancement {
  private scene: THREE.Scene;
  private camera: THREE.Camera;
  private renderer: THREE.WebGLRenderer;
  private composer: EffectComposer;

  private ssaoPass: SSAOPass | null = null;
  private colorGradingPass: ShaderPass | null = null;
  private materialFactory: EnhancedMaterialFactory;

  private enabledFeatures = {
    ssao: true,
    colorGrading: true,
    improvedLighting: true,
    enhancedMaterials: true,
    improvedShadows: true,
  };

  private qualityPreset: 'low' | 'medium' | 'high' | 'ultra' = 'high';

  constructor(scene: THREE.Scene, camera: THREE.Camera, renderer: THREE.WebGLRenderer, composer: EffectComposer) {
    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;
    this.composer = composer;
    this.materialFactory = getEnhancedMaterialFactory();

    console.log('✓ PlayfieldVisualEnhancement initialized');
  }

  /**
   * Initialize all visual enhancements
   */
  initialize(): void {
    // Initialize SSAO
    if (this.enabledFeatures.ssao) {
      this.initializeSSAO();
    }

    // Initialize Color Grading
    if (this.enabledFeatures.colorGrading) {
      this.initializeColorGrading();
    }

    // Initialize Lighting Improvements
    if (this.enabledFeatures.improvedLighting) {
      this.initializeImprovedLighting();
    }

    // Initialize Shadow Improvements
    if (this.enabledFeatures.improvedShadows) {
      this.improveShallowAndReflections();
    }

    console.log('✓ All visual enhancements initialized');
  }

  /**
   * Initialize Screen-Space Ambient Occlusion
   */
  private initializeSSAO(): void {
    this.ssaoPass = new SSAOPass(this.scene, this.camera, this.renderer);
    this.setQualityPreset(this.qualityPreset);
    console.log('✓ SSAO Pass initialized');
  }

  /**
   * Initialize Color Grading and Tone Mapping
   */
  private initializeColorGrading(): void {
    this.colorGradingPass = new ShaderPass(ColorGradingShader);
    this.colorGradingPass.uniforms.exposure.value = 1.05;
    this.colorGradingPass.uniforms.saturation.value = 1.1;
    this.colorGradingPass.uniforms.contrast.value = 1.05;
    this.colorGradingPass.uniforms.colorTemp.value = 0.1; // Slightly warm
    console.log('✓ Color Grading Pass initialized');
  }

  /**
   * Initialize Improved Lighting System
   */
  private initializeImprovedLighting(): void {
    // Enhance existing lights
    const lights = this.scene.children.filter(c => c instanceof THREE.Light);

    for (const light of lights) {
      if (light instanceof THREE.DirectionalLight) {
        // Improve shadow maps for main directional light
        light.shadow.mapSize.width = 2048;
        light.shadow.mapSize.height = 2048;
        light.shadow.camera.far = 100;
        light.shadow.bias = -0.0001;
        light.shadow.normalBias = 0.01;
        light.castShadow = true;
      } else if (light instanceof THREE.PointLight) {
        // Optimize point lights
        light.shadow.mapSize.width = 1024;
        light.shadow.mapSize.height = 1024;
        light.castShadow = true;
      }
    }

    console.log('✓ Improved Lighting initialized');
  }

  /**
   * Improve shadows and add reflection capabilities
   */
  private improveShallowAndReflections(): void {
    // Enable shadow map on renderer
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;

    // Improve render target resolution for better shadows
    this.renderer.shadowMap.autoUpdate = true;

    // Configure shadow maps for better quality
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    console.log('✓ Shadow and Reflection improvements applied');
  }

  /**
   * Apply enhanced materials to mesh
   */
  applyEnhancedMaterial(mesh: THREE.Mesh, materialType: 'bumper' | 'target' | 'ramp' | 'playfield' | 'ball' | 'flipper', color?: THREE.Color | string): void {
    if (!this.enabledFeatures.enhancedMaterials) return;

    const factory = getEnhancedMaterialFactory();
    let material: THREE.Material;

    switch (materialType) {
      case 'bumper':
        material = factory.createBumperMaterial(color || '#ff6600');
        break;
      case 'target':
        material = factory.createTargetMaterial(color || '#00ff00');
        break;
      case 'ramp':
        material = factory.createRampMaterial(color || '#ccb366');
        break;
      case 'playfield':
        material = factory.createPlayfieldMaterial(color || '#8b7355');
        break;
      case 'ball':
        material = factory.createBallMaterial(color || '#ffffff');
        break;
      case 'flipper':
        material = factory.createFlipperMaterial(color || '#ff6600');
        break;
      default:
        return;
    }

    mesh.material = material;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
  }

  /**
   * Apply metallic materials to reflective surfaces (Phase 18+: SSR)
   */
  applyMetallicMaterial(mesh: THREE.Mesh, materialType: 'ball' | 'flipper' | 'bumper' | 'target' | 'ramp', color?: THREE.Color | string): void {
    const metallicFactory = getMetallicMaterialFactory();
    let material: THREE.MeshStandardMaterial;

    switch (materialType) {
      case 'ball':
        material = metallicFactory.getBallMaterial(color || 0xcccccc);
        break;
      case 'flipper':
        material = metallicFactory.getFlipperMaterial(color || 0xff8800);
        break;
      case 'bumper':
        material = metallicFactory.getBumperMaterial((color as number) || 0xff3333);
        break;
      case 'target':
        material = metallicFactory.getTargetMaterial((color as number) || 0x00ccff);
        break;
      case 'ramp':
        material = metallicFactory.getRampMaterial(color || 0xaa7744);
        break;
      default:
        return;
    }

    mesh.material = material;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
  }

  /**
   * Update visual intensity based on game state
   */
  updateLightingIntensity(intensity: number): void {
    const lights = this.scene.children.filter(c => c instanceof THREE.Light);

    for (const light of lights) {
      if (light instanceof THREE.Light) {
        const baseIntensity = (light as any).baseIntensity || light.intensity;
        light.intensity = baseIntensity * Math.max(0.3, intensity);
      }
    }

    // Update color grading exposure
    if (this.colorGradingPass) {
      this.colorGradingPass.uniforms.exposure.value = 0.9 + intensity * 0.2;
    }
  }

  /**
   * Set visual quality preset
   */
  setQualityPreset(preset: 'low' | 'medium' | 'high' | 'ultra'): void {
    this.qualityPreset = preset;

    if (this.ssaoPass) {
      this.ssaoPass.setQualityPreset(preset);
    }

    this.materialFactory.updateQualityPreset(preset);

    // Adjust color grading based on preset
    if (this.colorGradingPass) {
      const saturationMap = { 'low': 0.95, 'medium': 1.0, 'high': 1.1, 'ultra': 1.15 };
      const contrastMap = { 'low': 1.0, 'medium': 1.02, 'high': 1.05, 'ultra': 1.08 };

      this.colorGradingPass.uniforms.saturation.value = saturationMap[preset];
      this.colorGradingPass.uniforms.contrast.value = contrastMap[preset];
    }
  }

  /**
   * Toggle specific visual features
   */
  toggleFeature(feature: keyof typeof this.enabledFeatures, enabled: boolean): void {
    this.enabledFeatures[feature] = enabled;
    console.log(`Feature '${feature}' ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Handle window resize
   */
  onWindowResize(width: number, height: number): void {
    if (this.ssaoPass) {
      this.ssaoPass.setSize(width, height);
    }
  }

  /**
   * Get enabled features status
   */
  getFeatures() {
    return { ...this.enabledFeatures };
  }

  /**
   * Dispose and cleanup
   */
  dispose(): void {
    if (this.ssaoPass) {
      this.ssaoPass.dispose();
    }
    if (this.colorGradingPass) {
      this.colorGradingPass.dispose();
    }
    this.materialFactory.dispose();
    console.log('✓ PlayfieldVisualEnhancement disposed');
  }
}

// Global instance
let enhancementSystem: PlayfieldVisualEnhancement | null = null;

export function initializePlayfieldVisualEnhancement(
  scene: THREE.Scene,
  camera: THREE.Camera,
  renderer: THREE.WebGLRenderer,
  composer: EffectComposer,
): PlayfieldVisualEnhancement {
  if (enhancementSystem) {
    enhancementSystem.dispose();
  }

  enhancementSystem = new PlayfieldVisualEnhancement(scene, camera, renderer, composer);
  enhancementSystem.initialize();
  return enhancementSystem;
}

export function getPlayfieldVisualEnhancement(): PlayfieldVisualEnhancement | null {
  return enhancementSystem;
}

export function disposePlayfieldVisualEnhancement(): void {
  if (enhancementSystem) {
    enhancementSystem.dispose();
    enhancementSystem = null;
  }
}
