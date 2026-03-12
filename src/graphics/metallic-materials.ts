/**
 * metallic-materials.ts — Enhanced Metallic Materials
 *
 * Provides high-quality PBR materials for metallic surfaces with:
 * - Enhanced specular highlights
 * - Fresnel effects for edge reflections
 * - Metalness-based property scaling
 * - Integration with SSR (Screen Space Reflections)
 *
 * Used for: Ball, flippers, bumpers, and other reflective elements
 */

import * as THREE from 'three';

export interface MetallicMaterialConfig {
  color: number | string;
  metalness: number;
  roughness: number;
  envMapIntensity: number;
}

/**
 * Create enhanced metallic material for pinball ball
 */
export function createMetallicBallMaterial(config?: Partial<MetallicMaterialConfig>): THREE.MeshStandardMaterial {
  const defaultConfig: MetallicMaterialConfig = {
    color: 0xcccccc,
    metalness: 0.95,    // Almost fully metallic (mirror-like)
    roughness: 0.02,    // Very shiny, minimal roughness
    envMapIntensity: 1.5,
  };

  const finalConfig = { ...defaultConfig, ...config };

  const material = new THREE.MeshStandardMaterial({
    color: new THREE.Color(finalConfig.color),
    metalness: finalConfig.metalness,
    roughness: finalConfig.roughness,
    envMapIntensity: finalConfig.envMapIntensity,
  });

  // Enhance specular highlights via shader hook
  material.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <lights_fragment_begin>',
      `
      #include <lights_fragment_begin>
      // Enhanced specular highlights for metallic ball
      reflectedLight.specular *= 1.3;
      `
    );
  };

  return material;
}

/**
 * Create enhanced metallic material for flippers
 */
export function createMetallicFlipperMaterial(config?: Partial<MetallicMaterialConfig>): THREE.MeshStandardMaterial {
  const defaultConfig: MetallicMaterialConfig = {
    color: 0xff8800,    // Orange metallic
    metalness: 0.7,     // Moderately metallic
    roughness: 0.25,    // Somewhat rough for impact feel
    envMapIntensity: 1.2,
  };

  const finalConfig = { ...defaultConfig, ...config };

  const material = new THREE.MeshStandardMaterial({
    color: new THREE.Color(finalConfig.color),
    metalness: finalConfig.metalness,
    roughness: finalConfig.roughness,
    envMapIntensity: finalConfig.envMapIntensity,
  });

  material.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <lights_fragment_begin>',
      `
      #include <lights_fragment_begin>
      // Enhanced specular for flipper surface
      reflectedLight.specular *= 1.2;
      `
    );
  };

  return material;
}

/**
 * Create enhanced metallic material for bumpers
 */
export function createMetallicBumperMaterial(color: number = 0xff3333): THREE.MeshStandardMaterial {
  const material = new THREE.MeshStandardMaterial({
    color: new THREE.Color(color),
    metalness: 0.5,     // Half-metallic (painted metal)
    roughness: 0.35,    // Moderate roughness for impact feedback
    emissive: new THREE.Color(color),
    emissiveIntensity: 0.1,  // Subtle glow
  });

  material.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <lights_fragment_begin>',
      `
      #include <lights_fragment_begin>
      // Enhanced highlights for bumper ring
      reflectedLight.specular *= 1.15;
      `
    );
  };

  return material;
}

/**
 * Create enhanced metallic material for targets
 */
export function createMetallicTargetMaterial(color: number = 0x00ccff): THREE.MeshStandardMaterial {
  const material = new THREE.MeshStandardMaterial({
    color: new THREE.Color(color),
    metalness: 0.3,     // Mostly plastic/painted
    roughness: 0.25,    // Glossy surface
    emissive: new THREE.Color(color),
    emissiveIntensity: 0.15,  // Moderate glow
  });

  material.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <lights_fragment_begin>',
      `
      #include <lights_fragment_begin>
      // Glossy target surface
      reflectedLight.specular *= 1.2;
      `
    );
  };

  return material;
}

/**
 * Create glossy ramp material with metallic properties
 */
export function createMetallicRampMaterial(config?: Partial<MetallicMaterialConfig>): THREE.MeshStandardMaterial {
  const defaultConfig: MetallicMaterialConfig = {
    color: 0xaa7744,    // Wood-tone metallic
    metalness: 0.3,
    roughness: 0.4,
    envMapIntensity: 1.1,
  };

  const finalConfig = { ...defaultConfig, ...config };

  const material = new THREE.MeshStandardMaterial({
    color: new THREE.Color(finalConfig.color),
    metalness: finalConfig.metalness,
    roughness: finalConfig.roughness,
    envMapIntensity: finalConfig.envMapIntensity,
  });

  material.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <lights_fragment_begin>',
      `
      #include <lights_fragment_begin>
      // Glossy ramp surface
      reflectedLight.specular *= 1.1;
      `
    );
  };

  return material;
}

/**
 * Enhanced Metallic Material Factory
 *
 * Provides pre-configured metallic materials optimized for SSR
 */
export class EnhancedMetallicMaterialFactory {
  private cache: Map<string, THREE.MeshStandardMaterial> = new Map();

  /**
   * Get or create metallic ball material
   */
  getBallMaterial(color?: number | string): THREE.MeshStandardMaterial {
    const key = `ball_${color || 'default'}`;

    if (!this.cache.has(key)) {
      this.cache.set(key, createMetallicBallMaterial({ color }));
    }

    return this.cache.get(key)!;
  }

  /**
   * Get or create metallic flipper material
   */
  getFlipperMaterial(color?: number | string): THREE.MeshStandardMaterial {
    const key = `flipper_${color || 'default'}`;

    if (!this.cache.has(key)) {
      this.cache.set(key, createMetallicFlipperMaterial({ color }));
    }

    return this.cache.get(key)!;
  }

  /**
   * Get or create metallic bumper material
   */
  getBumperMaterial(color: number = 0xff3333): THREE.MeshStandardMaterial {
    const key = `bumper_${color}`;

    if (!this.cache.has(key)) {
      this.cache.set(key, createMetallicBumperMaterial(color));
    }

    return this.cache.get(key)!;
  }

  /**
   * Get or create metallic target material
   */
  getTargetMaterial(color: number = 0x00ccff): THREE.MeshStandardMaterial {
    const key = `target_${color}`;

    if (!this.cache.has(key)) {
      this.cache.set(key, createMetallicTargetMaterial(color));
    }

    return this.cache.get(key)!;
  }

  /**
   * Get or create metallic ramp material
   */
  getRampMaterial(color?: number | string): THREE.MeshStandardMaterial {
    const key = `ramp_${color || 'default'}`;

    if (!this.cache.has(key)) {
      this.cache.set(key, createMetallicRampMaterial({ color }));
    }

    return this.cache.get(key)!;
  }

  /**
   * Get or create custom metallic material
   */
  getCustomMaterial(id: string, config: MetallicMaterialConfig): THREE.MeshStandardMaterial {
    if (!this.cache.has(id)) {
      const material = new THREE.MeshStandardMaterial({
        color: new THREE.Color(config.color),
        metalness: Math.max(0, Math.min(1, config.metalness)),
        roughness: Math.max(0, Math.min(1, config.roughness)),
        envMapIntensity: config.envMapIntensity,
      });

      material.onBeforeCompile = (shader) => {
        shader.fragmentShader = shader.fragmentShader.replace(
          '#include <lights_fragment_begin>',
          `
          #include <lights_fragment_begin>
          // Custom metallic material
          reflectedLight.specular *= ${1.0 + config.metalness * 0.3};
          `
        );
      };

      this.cache.set(id, material);
    }

    return this.cache.get(id)!;
  }

  /**
   * Dispose all cached materials
   */
  dispose() {
    this.cache.forEach((material) => material.dispose());
    this.cache.clear();
  }

  /**
   * Get cache size for debugging
   */
  getCacheSize(): number {
    return this.cache.size;
  }
}

/**
 * Global instance of metallic material factory
 */
let globalMetallicFactory: EnhancedMetallicMaterialFactory | null = null;

/**
 * Get global metallic material factory
 */
export function getMetallicMaterialFactory(): EnhancedMetallicMaterialFactory {
  if (!globalMetallicFactory) {
    globalMetallicFactory = new EnhancedMetallicMaterialFactory();
  }
  return globalMetallicFactory;
}

/**
 * Initialize metallic material system
 */
export function initializeMetallicMaterials() {
  globalMetallicFactory = new EnhancedMetallicMaterialFactory();
  console.log('✓ Enhanced metallic material factory initialized');
}

/**
 * Cleanup metallic materials
 */
export function disposeMetallicMaterials() {
  if (globalMetallicFactory) {
    globalMetallicFactory.dispose();
    globalMetallicFactory = null;
  }
}
