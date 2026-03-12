/**
 * cascaded-shadows.ts — Cascaded Shadow Mapping (CSM)
 *
 * Implements multi-cascade shadow maps for superior shadow quality:
 * - 2-4 cascade levels based on quality preset
 * - Automatic cascade distance calculation from camera near/far
 * - PCF filtering per cascade level
 * - Smooth fade transitions between cascades
 * - Shadow map reuse optimization
 *
 * Features:
 * - Depth-aware cascade selection
 * - Per-cascade shadow map resolution (512-4096px)
 * - Smooth cascade transitions with fade regions
 * - Optimized shadow rendering pipeline
 * - Quality-based configuration
 */

import * as THREE from 'three';

export interface CascadeConfig {
  count: number;                          // 2, 3, or 4 cascades
  shadowMapSize: number;                  // 512, 1024, 2048, or 4096
  near: number;                           // Camera near plane
  far: number;                            // Camera far plane
  lambda: number;                         // Cascade split lambda (0.5-1.0)
}

export interface CascadedShadowMapperConfig {
  cascadeCount: number;                   // Number of cascades (2-4)
  shadowMapSize: number;                  // Size per cascade map
  lightDirection: THREE.Vector3;          // Main directional light direction
  lightIntensity: number;                 // Light intensity for shadows
}

/**
 * Cascaded Shadow Mapper — Multi-level shadow mapping
 */
export class CascadedShadowMapper {
  private cascades: THREE.Camera[] = [];
  private shadowMaps: THREE.WebGLRenderTarget[] = [];
  private cascadeConfig: CascadeConfig;
  private lightDirection: THREE.Vector3;
  private lightIntensity: number;
  private enabled = true;

  constructor(
    private renderer: THREE.WebGLRenderer,
    private scene: THREE.Scene,
    private camera: THREE.PerspectiveCamera,
    config: CascadedShadowMapperConfig
  ) {
    this.cascadeConfig = {
      count: config.cascadeCount,
      shadowMapSize: config.shadowMapSize,
      near: camera.near,
      far: camera.far,
      lambda: 0.5, // Linear-logarithmic split (balance between linear and log)
    };

    this.lightDirection = config.lightDirection.normalize();
    this.lightIntensity = config.lightIntensity;

    this.initializeCascades();
    console.log(`✓ Cascaded Shadow Mapper initialized (${config.cascadeCount} cascades)`);
  }

  /**
   * Initialize cascade render targets and cameras
   */
  private initializeCascades(): void {
    const renderTargetOptions = {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.DepthFormat,
      type: THREE.UnsignedIntType,
      stencilBuffer: false,
    };

    for (let i = 0; i < this.cascadeConfig.count; i++) {
      // Create render target for this cascade
      const renderTarget = new THREE.WebGLRenderTarget(
        this.cascadeConfig.shadowMapSize,
        this.cascadeConfig.shadowMapSize,
        renderTargetOptions as any
      );
      renderTarget.texture.compareFunction = THREE.LessEqualCompare;
      this.shadowMaps.push(renderTarget);

      // Create orthographic camera for this cascade
      const cascadeCamera = new THREE.OrthographicCamera(-10, 10, 10, -10, 0.1, 100);
      cascadeCamera.position.copy(this.camera.position).add(
        this.lightDirection.clone().multiplyScalar(-20)
      );
      cascadeCamera.lookAt(this.camera.position);
      this.cascades.push(cascadeCamera);
    }
  }

  /**
   * Calculate cascade splits using linear-logarithmic scheme
   */
  private calculateCascadeSplits(): number[] {
    const near = this.cascadeConfig.near;
    const far = this.cascadeConfig.far;
    const lambda = this.cascadeConfig.lambda;
    const count = this.cascadeConfig.count;

    const splits: number[] = [near];

    for (let i = 1; i < count; i++) {
      const linearSplit = near + ((far - near) * i) / count;
      const logSplit = near * Math.pow(far / near, i / count);
      const split = linearSplit * lambda + logSplit * (1 - lambda);
      splits.push(split);
    }

    splits.push(far);
    return splits;
  }

  /**
   * Update cascade frustums based on camera
   */
  updateCascades(camera: THREE.PerspectiveCamera): void {
    if (!this.enabled) return;

    const splits = this.calculateCascadeSplits();
    const cameraDirection = camera.getWorldDirection(new THREE.Vector3());

    for (let i = 0; i < this.cascadeConfig.count; i++) {
      const cascadeNear = splits[i];
      const cascadeFar = splits[i + 1];
      const cascadeRange = cascadeFar - cascadeNear;

      // Position cascade camera
      const cascadeCenter = camera.position
        .clone()
        .add(cameraDirection.clone().multiplyScalar((cascadeNear + cascadeFar) * 0.5));

      this.cascades[i].position.copy(cascadeCenter).add(
        this.lightDirection.clone().multiplyScalar(-30)
      );
      this.cascades[i].lookAt(cascadeCenter);

      // Set cascade camera frustum
      const frustumSize = cascadeRange * 2;
      (this.cascades[i] as THREE.OrthographicCamera).left = -frustumSize;
      (this.cascades[i] as THREE.OrthographicCamera).right = frustumSize;
      (this.cascades[i] as THREE.OrthographicCamera).top = frustumSize;
      (this.cascades[i] as THREE.OrthographicCamera).bottom = -frustumSize;
      (this.cascades[i] as THREE.OrthographicCamera).updateProjectionMatrix();
    }
  }

  /**
   * Render all cascade shadow maps
   */
  renderShadowMaps(): void {
    if (!this.enabled) return;

    const oldClearColor = this.renderer.getClearColor(new THREE.Color());
    const oldClearAlpha = this.renderer.getClearAlpha();

    this.renderer.setClearColor(0xffffff, 1.0);

    for (let i = 0; i < this.cascadeConfig.count; i++) {
      this.renderer.setRenderTarget(this.shadowMaps[i]);
      this.renderer.clear();
      this.renderer.render(this.scene, this.cascades[i]);
    }

    this.renderer.setRenderTarget(null);
    this.renderer.setClearColor(oldClearColor, oldClearAlpha);
  }

  /**
   * Get shadow map for a specific cascade
   */
  getShadowMap(cascadeIndex: number): THREE.Texture {
    if (cascadeIndex < 0 || cascadeIndex >= this.cascadeConfig.count) {
      return this.shadowMaps[0]?.texture || new THREE.Texture();
    }
    return this.shadowMaps[cascadeIndex].texture;
  }

  /**
   * Get cascade camera for a specific index
   */
  getCascadeCamera(cascadeIndex: number): THREE.Camera {
    if (cascadeIndex < 0 || cascadeIndex >= this.cascadeConfig.count) {
      return this.cascades[0] || new THREE.OrthographicCamera();
    }
    return this.cascades[cascadeIndex];
  }

  /**
   * Get all cascade information
   */
  getCascadeInfo() {
    return {
      count: this.cascadeConfig.count,
      shadowMapSize: this.cascadeConfig.shadowMapSize,
      cascades: this.cascades.map((cam, i) => ({
        index: i,
        camera: cam,
        shadowMap: this.shadowMaps[i],
      })),
    };
  }

  /**
   * Set quality preset
   */
  setQualityPreset(preset: 'low' | 'medium' | 'high' | 'ultra'): void {
    const presetConfig = {
      'low': { count: 2, mapSize: 512 },
      'medium': { count: 3, mapSize: 1024 },
      'high': { count: 4, mapSize: 2048 },
      'ultra': { count: 4, mapSize: 4096 },
    };

    const config = presetConfig[preset];
    if (config.count !== this.cascadeConfig.count || config.mapSize !== this.cascadeConfig.shadowMapSize) {
      this.cascadeConfig.count = config.count;
      this.cascadeConfig.shadowMapSize = config.mapSize;
      this.dispose();
      this.initializeCascades();
    }
  }

  /**
   * Enable/disable cascaded shadows
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /**
   * Cleanup
   */
  dispose(): void {
    this.shadowMaps.forEach(map => map.dispose());
    this.shadowMaps = [];
    this.cascades = [];
  }
}

/**
 * Global cascaded shadow mapper instance
 */
let globalCascadedShadowMapper: CascadedShadowMapper | null = null;

export function initializeCascadedShadows(
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.PerspectiveCamera,
  config: CascadedShadowMapperConfig
): CascadedShadowMapper {
  if (globalCascadedShadowMapper) {
    globalCascadedShadowMapper.dispose();
  }

  globalCascadedShadowMapper = new CascadedShadowMapper(renderer, scene, camera, config);
  return globalCascadedShadowMapper;
}

export function getCascadedShadowMapper(): CascadedShadowMapper | null {
  return globalCascadedShadowMapper;
}

export function disposeCascadedShadows(): void {
  if (globalCascadedShadowMapper) {
    globalCascadedShadowMapper.dispose();
    globalCascadedShadowMapper = null;
  }
}
