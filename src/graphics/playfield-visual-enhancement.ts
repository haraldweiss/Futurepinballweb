// SPDX-License-Identifier: AGPL-3.0-or-later
// © 2026 Harald Weiss
/**
 * playfield-visual-enhancement.ts — Enhanced PBR Materials for Playfield
 *
 * Manages enhanced PBR materials (bumpers, targets, ramps, ball, flippers)
 * with quality-preset-aware envMap intensity and emissive properties.
 *
 * NOTE: SSAO, custom lighting overrides, and shadow quality management have
 * been removed — they either duplicated or conflicted with scene-setup.ts
 * (PCFSoftShadowMap, ACESFilmic, sRGB color space) and LightManager
 * (shadow config, light lifecycle). SSAO also lacked composer integration
 * and would need a proper G-buffer Pass to work.
 */

import * as THREE from 'three';
import { devLog } from '../utils/dev-log';
import type { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { EnhancedMaterialFactory, getEnhancedMaterialFactory } from './enhanced-materials';
import { getMetallicMaterialFactory } from './metallic-materials';

/**
 * PlayfieldVisualEnhancement — Enhanced PBR material management
 */
export class PlayfieldVisualEnhancement {
  private scene: THREE.Scene;
  private materialFactory: EnhancedMaterialFactory;

  private enabledFeatures = {
    enhancedMaterials: true,
  };

  constructor(scene: THREE.Scene, _camera: THREE.Camera, _renderer: THREE.WebGLRenderer, _composer: EffectComposer) {
    this.scene = scene;
    this.materialFactory = getEnhancedMaterialFactory();
    devLog('✓ PlayfieldVisualEnhancement initialized');
  }

  /**
   * No-op: formerly initialized SSAO + lighting overrides that either
   * conflicted with scene-setup.ts / LightManager or were never wired
   * to the composer chain. Kept as a hook point for future enhancements.
   */
  initialize(): void {
    devLog('✓ PlayfieldVisualEnhancement ready (materials only)');
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
   * Set visual quality preset (propagates to material envMap intensity)
   */
  setQualityPreset(preset: 'low' | 'medium' | 'high' | 'ultra'): void {
    this.materialFactory.updateQualityPreset(preset);
  }

  /**
   * Toggle specific visual features
   */
  toggleFeature(feature: keyof typeof this.enabledFeatures, enabled: boolean): void {
    this.enabledFeatures[feature] = enabled;
    devLog(`Feature '${feature}' ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Dispose and cleanup
   */
  dispose(): void {
    this.materialFactory.dispose();
    devLog('✓ PlayfieldVisualEnhancement disposed');
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
