/**
 * enhanced-materials.ts — High-Quality PBR Materials for Playfield Elements
 *
 * Provides physically-based rendering materials optimized for:
 * - Bumpers (rubber, metallic accents)
 * - Targets (plastic, shiny)
 * - Ramps (glossy, detailed)
 * - Playfield surface (wood grain, worn finish)
 * - Ball (mirror-like metallic sphere)
 */

import * as THREE from 'three';

export interface MaterialProperties {
  color: string;
  metalness: number;
  roughness: number;
  emissive: string;
  emissiveIntensity: number;
  normalScale: number;
}

/**
 * EnhancedMaterialFactory — Create high-quality PBR materials
 */
export class EnhancedMaterialFactory {
  private textures: Map<string, THREE.Texture> = new Map();
  private materials: Map<string, THREE.Material> = new Map();

  /**
   * Create rubber bumper material (glossy, slightly metallic)
   */
  createBumperMaterial(color: THREE.Color | string, intensity: number = 1.0): THREE.MeshStandardMaterial {
    const key = `bumper_${color}`;
    if (this.materials.has(key)) {
      return this.materials.get(key) as THREE.MeshStandardMaterial;
    }

    const material = new THREE.MeshStandardMaterial({
      color: new THREE.Color(color),
      metalness: 0.4 * intensity,        // Slight metallic sheen
      roughness: 0.35 * intensity,       // Glossy finish
      emissive: new THREE.Color(color),
      emissiveIntensity: 0.15 * intensity, // Subtle glow at night
      envMapIntensity: 1.2,
      flatShading: false,                // Smooth shading
      side: THREE.FrontSide,
    });

    material.onBeforeCompile = (shader) => {
      // Add custom lighting enhancement
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <lights_fragment_begin>',
        `
          #include <lights_fragment_begin>
          // Enhance specular highlights on bumpers
          reflectedLight.specular *= 1.2;
        `
      );
    };

    this.materials.set(key, material);
    return material;
  }

  /**
   * Create glossy target material (plastic, reflective)
   */
  createTargetMaterial(color: THREE.Color | string): THREE.MeshStandardMaterial {
    const key = `target_${color}`;
    if (this.materials.has(key)) {
      return this.materials.get(key) as THREE.MeshStandardMaterial;
    }

    const material = new THREE.MeshStandardMaterial({
      color: new THREE.Color(color),
      metalness: 0.15,
      roughness: 0.25,                   // Very glossy
      emissive: new THREE.Color(color),
      emissiveIntensity: 0.2,           // Bright glow
      envMapIntensity: 1.4,
      flatShading: false,
      side: THREE.FrontSide,
    });

    this.materials.set(key, material);
    return material;
  }

  /**
   * Create ramp material (smooth, angled surface with light reflection)
   */
  createRampMaterial(color: THREE.Color | string = '#ccb366'): THREE.MeshStandardMaterial {
    const key = `ramp_${color}`;
    if (this.materials.has(key)) {
      return this.materials.get(key) as THREE.MeshStandardMaterial;
    }

    const material = new THREE.MeshStandardMaterial({
      color: new THREE.Color(color),
      metalness: 0.25,
      roughness: 0.4,
      emissive: new THREE.Color(color),
      emissiveIntensity: 0.1,
      envMapIntensity: 1.3,
      flatShading: false,
    });

    this.materials.set(key, material);
    return material;
  }

  /**
   * Create playfield surface material (wood grain simulation)
   */
  createPlayfieldMaterial(baseColor: THREE.Color | string = '#8b7355'): THREE.MeshStandardMaterial {
    const key = `playfield_${baseColor}`;
    if (this.materials.has(key)) {
      return this.materials.get(key) as THREE.MeshStandardMaterial;
    }

    const material = new THREE.MeshStandardMaterial({
      color: new THREE.Color(baseColor),
      metalness: 0.05,
      roughness: 0.85,                   // Worn, matte finish
      emissive: new THREE.Color(0x000000),
      emissiveIntensity: 0.0,
      envMapIntensity: 0.4,
      flatShading: false,
      map: this.generateWoodGrainTexture(),
    });

    this.materials.set(key, material);
    return material;
  }

  /**
   * Create ball material (metallic, mirror-like)
   */
  createBallMaterial(color: THREE.Color | string = '#ffffff'): THREE.MeshStandardMaterial {
    const key = `ball_${color}`;
    if (this.materials.has(key)) {
      return this.materials.get(key) as THREE.MeshStandardMaterial;
    }

    const material = new THREE.MeshStandardMaterial({
      color: new THREE.Color(color),
      metalness: 0.95,                   // Highly reflective
      roughness: 0.1,                    // Mirror-like finish
      emissive: new THREE.Color(color),
      emissiveIntensity: 0.05,           // Slight glow
      envMapIntensity: 1.5,
      flatShading: false,
      normalScale: new THREE.Vector2(0.1, 0.1), // Subtle details
    });

    this.materials.set(key, material);
    return material;
  }

  /**
   * Create flipper material (metal arm)
   */
  createFlipperMaterial(color: THREE.Color | string = '#ff6600'): THREE.MeshStandardMaterial {
    const key = `flipper_${color}`;
    if (this.materials.has(key)) {
      return this.materials.get(key) as THREE.MeshStandardMaterial;
    }

    const material = new THREE.MeshStandardMaterial({
      color: new THREE.Color(color),
      metalness: 0.7,                    // Metal
      roughness: 0.3,                    // Polished metal
      emissive: new THREE.Color(0x000000),
      emissiveIntensity: 0.0,
      envMapIntensity: 1.2,
      flatShading: false,
    });

    this.materials.set(key, material);
    return material;
  }

  /**
   * Generate procedural wood grain texture
   */
  private generateWoodGrainTexture(): THREE.Texture {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;

    const ctx = canvas.getContext('2d')!;
    const imageData = ctx.createImageData(512, 512);
    const data = imageData.data;

    // Generate wood grain pattern using Perlin-like noise
    for (let i = 0; i < data.length; i += 4) {
      const pixelIdx = i / 4;
      const x = pixelIdx % 512;
      const y = Math.floor(pixelIdx / 512);

      // Simple fractal-like pattern
      let value = 0;
      let amplitude = 1;
      let frequency = 1;

      for (let octave = 0; octave < 3; octave++) {
        const angle = Math.sin(y * 0.002 * frequency) * 50;
        const wave = Math.sin((x + angle) * 0.01 * frequency) * 0.5 + 0.5;
        value += wave * amplitude;
        amplitude *= 0.5;
        frequency *= 2;
      }

      value = Math.max(0, Math.min(255, value * 180 + 60));

      // Add color variation (brownish wood)
      const baseColor = Math.floor(value);
      const colorVariation = Math.sin(y * 0.005) * 10;

      data[i] = baseColor + colorVariation;        // R
      data[i + 1] = Math.floor(baseColor * 0.8);   // G
      data[i + 2] = Math.floor(baseColor * 0.6);   // B
      data[i + 3] = 255;                            // A
    }

    ctx.putImageData(imageData, 0, 0);

    const texture = new THREE.CanvasTexture(canvas);
    texture.magFilter = THREE.LinearFilter;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(2, 1);

    this.textures.set('wood_grain', texture);
    return texture;
  }

  /**
   * Update material properties based on game lighting intensity
   */
  updateMaterialIntensity(material: THREE.MeshStandardMaterial, intensity: number): void {
    if (material instanceof THREE.MeshStandardMaterial) {
      material.emissiveIntensity = Math.max(0, material.emissiveIntensity * intensity);
    }
  }

  /**
   * Update all materials for quality preset
   */
  updateQualityPreset(preset: 'low' | 'medium' | 'high' | 'ultra'): void {
    const envMapIntensityMap = {
      'low': 0.6,
      'medium': 0.9,
      'high': 1.2,
      'ultra': 1.5,
    };

    const intensity = envMapIntensityMap[preset];

    for (const material of this.materials.values()) {
      if (material instanceof THREE.MeshStandardMaterial) {
        material.envMapIntensity = intensity;
      }
    }
  }

  /**
   * Dispose all materials and textures
   */
  dispose(): void {
    for (const material of this.materials.values()) {
      material.dispose();
    }
    for (const texture of this.textures.values()) {
      texture.dispose();
    }
    this.materials.clear();
    this.textures.clear();
  }
}

// Global instance
let materialFactory: EnhancedMaterialFactory | null = null;

export function getEnhancedMaterialFactory(): EnhancedMaterialFactory {
  if (!materialFactory) {
    materialFactory = new EnhancedMaterialFactory();
  }
  return materialFactory;
}

export function disposeEnhancedMaterials(): void {
  if (materialFactory) {
    materialFactory.dispose();
    materialFactory = null;
  }
}
