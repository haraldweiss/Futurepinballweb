/**
 * light-manager.ts — Centralized light lifecycle management
 * Manages light creation, updates, shadows, dynamic effects
 */

import * as THREE from 'three';
import { LightConfig, ManagedLight, DynamicLightUpdate } from './graphics-types';

/**
 * LightManager centralizes light management.
 *
 * Enables:
 * - Centralized light creation and lifecycle
 * - Dynamic light intensity/color changes
 * - Pulse effects (light breathing)
 * - Shadow map management per quality preset
 * - Foundation for future deferred rendering
 *
 * Performance impact: Better memory management, easier quality preset adjustments
 */
export class LightManager {
  private scene: THREE.Scene;
  private lights: Map<string, ManagedLight> = new Map();
  private lightCount = 0;
  private shadowLights: Set<string> = new Set();
  private shadowMapSize: number = 2048;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    console.log('✓ LightManager initialized');
  }

  /**
   * Add a light to the scene with a unique ID.
   */
  addLight(id: string, type: 'ambient' | 'point' | 'spot' | 'directional', config: LightConfig): ManagedLight {
    if (this.lights.has(id)) {
      console.warn(`Light "${id}" already exists, replacing...`);
      this.removeLight(id);
    }

    let light: THREE.Light;

    switch (type) {
      case 'ambient':
        light = new THREE.AmbientLight(config.color, config.intensity);
        break;

      case 'point':
        light = new THREE.PointLight(config.color, config.intensity, config.distance ?? 100);
        light.castShadow = config.castShadow ?? false;
        if (light.castShadow && (light as any).shadow) {
          (light as any).shadow.mapSize.set(config.shadowMapSize ?? this.shadowMapSize, config.shadowMapSize ?? this.shadowMapSize);
        }
        break;

      case 'spot':
        light = new THREE.SpotLight(
          config.color,
          config.intensity,
          config.distance ?? 100,
          config.angle ?? Math.PI / 3,
          config.penumbra ?? 0.2,
          config.decay ?? 2
        );
        light.castShadow = config.castShadow ?? false;
        if (light.castShadow && (light as any).shadow) {
          (light as any).shadow.mapSize.set(config.shadowMapSize ?? this.shadowMapSize, config.shadowMapSize ?? this.shadowMapSize);
        }
        break;

      case 'directional':
        light = new THREE.DirectionalLight(config.color, config.intensity);
        light.castShadow = config.castShadow ?? false;
        if (light.castShadow && (light as any).shadow) {
          (light as any).shadow.mapSize.set(config.shadowMapSize ?? this.shadowMapSize, config.shadowMapSize ?? this.shadowMapSize);
        }
        break;

      default:
        throw new Error(`Unknown light type: ${type}`);
    }

    this.scene.add(light);

    const managed: ManagedLight = {
      id,
      light,
      config,
      dynamic: false,
      pulseTime: 0,
    };

    this.lights.set(id, managed);
    if (config.castShadow) {
      this.shadowLights.add(id);
    }

    this.lightCount++;
    console.log(`✓ Added light: ${id} (type: ${type})`);

    return managed;
  }

  /**
   * Remove a light from the scene and dispose it.
   */
  removeLight(id: string): void {
    const managed = this.lights.get(id);
    if (!managed) return;

    this.scene.remove(managed.light);
    this.shadowLights.delete(id);
    this.lights.delete(id);
    this.lightCount--;

    console.log(`✓ Removed light: ${id}`);
  }

  /**
   * Update light configuration.
   */
  updateLight(id: string, config: Partial<LightConfig>): void {
    const managed = this.lights.get(id);
    if (!managed) return;

    const light = managed.light;

    if (config.color !== undefined) {
      (light as any).color?.setHex(config.color);
    }

    if (config.intensity !== undefined) {
      light.intensity = config.intensity;
    }

    if (config.distance !== undefined && (light as any).distance !== undefined) {
      (light as any).distance = config.distance;
    }

    if (config.castShadow !== undefined) {
      light.castShadow = config.castShadow;
      if (config.castShadow) {
        this.shadowLights.add(id);
      } else {
        this.shadowLights.delete(id);
      }
    }

    // Update stored config
    managed.config = { ...managed.config, ...config };
  }

  /**
   * Set dynamic intensity for a light (without pulsing).
   */
  setDynamicIntensity(id: string, intensity: number): void {
    const managed = this.lights.get(id);
    if (!managed) return;

    managed.light.intensity = intensity;
    managed.dynamic = true;
  }

  /**
   * Create a pulsing effect on a light.
   */
  pulseLight(id: string, minIntensity: number, maxIntensity: number, duration: number): void {
    const managed = this.lights.get(id);
    if (!managed) return;

    managed.dynamic = true;
    managed.pulseMin = minIntensity;
    managed.pulseMax = maxIntensity;
    managed.pulseDuration = duration;
    managed.pulseTime = 0;
  }

  /**
   * Update shadow map size based on quality preset.
   */
  updateShadowMap(size: 512 | 1024 | 2048 | 4096): void {
    this.shadowMapSize = size;

    for (const id of this.shadowLights) {
      const managed = this.lights.get(id);
      if (!managed) continue;

      const light = managed.light as any;
      if (light.shadow) {
        light.shadow.mapSize.set(size, size);
        light.shadow.map?.dispose();
        light.shadow.map = null;  // Force Three.js to recreate shadow map
      }
    }

    console.log(`✓ Shadow map size updated to: ${size}×${size}`);
  }

  /**
   * Enable shadow casting for a light.
   */
  enableShadow(id: string): void {
    const managed = this.lights.get(id);
    if (!managed) return;

    managed.light.castShadow = true;
    this.shadowLights.add(id);
  }

  /**
   * Disable shadow casting for a light.
   */
  disableShadow(id: string): void {
    const managed = this.lights.get(id);
    if (!managed) return;

    managed.light.castShadow = false;
    this.shadowLights.delete(id);
  }

  /**
   * Batch update ambient brightness.
   */
  setAmbientBrightness(level: number): void {
    // Find ambient light and update intensity
    for (const managed of this.lights.values()) {
      if (managed.light instanceof THREE.AmbientLight) {
        managed.light.intensity = level;
      }
    }
  }

  /**
   * Update all dynamic lights per frame.
   * Should be called once per render frame.
   */
  update(dt: number): void {
    for (const managed of this.lights.values()) {
      if (!managed.dynamic) continue;

      // Handle pulsing
      if (managed.pulseMin !== undefined && managed.pulseMax !== undefined && managed.pulseDuration !== undefined) {
        managed.pulseTime! += dt;
        if (managed.pulseTime! >= managed.pulseDuration) {
          managed.pulseTime = 0;
        }

        const t = managed.pulseTime! / managed.pulseDuration;
        // Sine wave pulse: smooth in and out
        const pulse = Math.sin(t * Math.PI);
        const intensity = managed.pulseMin + (managed.pulseMax - managed.pulseMin) * pulse;
        managed.light.intensity = intensity;
      }
    }
  }

  /**
   * Get the number of active lights.
   */
  getLightCount(): number {
    return this.lightCount;
  }

  /**
   * Get the number of shadow-casting lights.
   */
  getShadowLightCount(): number {
    return this.shadowLights.size;
  }

  /**
   * Initialize standard pinball lighting setup.
   * Creates ambient, main spotlight, fill, accent, and rim lights.
   */
  initialize(): void {
    // Ambient light for base illumination
    this.addLight('ambient', 'ambient', {
      color: 0xffffff,
      intensity: 0.35,
    });

    // Main spotlight: shadows and visibility
    this.addLight('mainSpot', 'spot', {
      color: 0xffffff,
      intensity: 2.5,
      distance: 45,
      angle: Math.PI / 3.0,
      penumbra: 0.20,
      castShadow: true,
      shadowMapSize: 2048,
      shadowBias: -0.0020,
    });

    const mainSpot = this.lights.get('mainSpot')!.light as THREE.SpotLight;
    mainSpot.position.set(0, 14, 16);
    mainSpot.shadow.normalBias = 0.030;
    mainSpot.shadow.camera.near = 0.5;
    mainSpot.shadow.camera.far = 120;
    mainSpot.shadow.blurSamples = 16;

    // Fill light: warm, diffuse illumination
    this.addLight('fill', 'point', {
      color: 0xffffdd,
      intensity: 1.5,
      distance: 35,
      castShadow: true,
    });

    const fillLight = this.lights.get('fill')!.light as THREE.PointLight;
    fillLight.position.set(-9, 6, 9);

    // Accent light: cool tone for depth
    this.addLight('accent', 'point', {
      color: 0xccddff,
      intensity: 0.8,
      distance: 25,
    });

    const accentLight = this.lights.get('accent')!.light as THREE.PointLight;
    accentLight.position.set(9, 4, 5);

    // Rim light: edge definition
    this.addLight('rim', 'directional', {
      color: 0x88ccff,
      intensity: 0.9,
      castShadow: true,
    });

    const rimLight = this.lights.get('rim')!.light as THREE.DirectionalLight;
    rimLight.position.set(0, 22, -12);

    console.log('✓ Standard pinball lighting initialized');
  }

  /**
   * Get detailed light statistics.
   */
  getStats() {
    const stats = {
      total: this.lightCount,
      shadowCasters: this.shadowLights.size,
      ambientLights: 0,
      pointLights: 0,
      spotLights: 0,
      directionalLights: 0,
    };

    for (const managed of this.lights.values()) {
      if (managed.light instanceof THREE.AmbientLight) stats.ambientLights++;
      else if (managed.light instanceof THREE.PointLight) stats.pointLights++;
      else if (managed.light instanceof THREE.SpotLight) stats.spotLights++;
      else if (managed.light instanceof THREE.DirectionalLight) stats.directionalLights++;
    }

    return stats;
  }

  /**
   * Clear all lights and dispose resources.
   */
  dispose(): void {
    for (const managed of this.lights.values()) {
      this.scene.remove(managed.light);

      // Dispose shadow map if it exists
      if ((managed.light as any).shadow?.map) {
        (managed.light as any).shadow.map.dispose();
      }
    }

    this.lights.clear();
    this.shadowLights.clear();
    this.lightCount = 0;

    console.log('✓ LightManager disposed');
  }
}
