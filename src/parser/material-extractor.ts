/**
 * material-extractor.ts — Extract material properties from textures and binary data
 * Define materials with physics and visual properties
 */

import { MaterialDefinition } from './enhanced-fpt-types';
import * as THREE from 'three';

// ─── Material Library ──────────────────────────────────────────────────────

const MATERIAL_LIBRARY: Record<string, MaterialDefinition> = {
  rubber: {
    name: 'rubber',
    displayName: 'Rubber',
    baseColor: 0x222222,
    roughness: 0.9,
    metallic: 0.0,
    type: 'rubber',
    surfaceProperties: {
      friction: 0.7,
      restitution: 0.95,
      damping: 0.2,
    },
  },

  plastic: {
    name: 'plastic',
    displayName: 'Plastic',
    baseColor: 0x666666,
    roughness: 0.6,
    metallic: 0.05,
    type: 'plastic',
    surfaceProperties: {
      friction: 0.4,
      restitution: 0.85,
      damping: 0.08,
    },
  },

  metal: {
    name: 'metal',
    displayName: 'Metal',
    baseColor: 0xcccccc,
    roughness: 0.3,
    metallic: 0.95,
    type: 'metal',
    surfaceProperties: {
      friction: 0.2,
      restitution: 0.75,
      damping: 0.02,
    },
  },

  wood: {
    name: 'wood',
    displayName: 'Wood',
    baseColor: 0x8b6914,
    roughness: 0.7,
    metallic: 0.0,
    normalIntensity: 0.5,
    type: 'wood',
    surfaceProperties: {
      friction: 0.5,
      restitution: 0.6,
      damping: 0.1,
    },
  },

  glass: {
    name: 'glass',
    displayName: 'Glass',
    baseColor: 0xddddff,
    roughness: 0.1,
    metallic: 0.0,
    type: 'glass',
    surfaceProperties: {
      friction: 0.1,
      restitution: 0.95,
      damping: 0.01,
    },
  },

  composite: {
    name: 'composite',
    displayName: 'Composite',
    baseColor: 0x555555,
    roughness: 0.65,
    metallic: 0.2,
    type: 'composite',
    surfaceProperties: {
      friction: 0.45,
      restitution: 0.8,
      damping: 0.06,
    },
  },
};

// ─── Core Extraction ───────────────────────────────────────────────────────

/**
 * Extract material definitions from binary and textures
 */
export function extractMaterials(
  buffer: ArrayBuffer,
  textures?: Map<string, THREE.Texture>
): Map<string, MaterialDefinition> {
  const materials = new Map<string, MaterialDefinition>();

  // Start with library materials
  for (const [name, material] of Object.entries(MATERIAL_LIBRARY)) {
    materials.set(name, { ...material });
  }

  // Refine materials using texture analysis
  if (textures) {
    for (const [texName, texture] of textures) {
      const inferredMaterial = inferMaterialFromTexture(texture);
      if (inferredMaterial) {
        const key = texName.toLowerCase().replace(/\s+/g, '_');
        materials.set(key, inferredMaterial);
      }
    }
  }

  return materials;
}

/**
 * Infer material properties from texture analysis
 */
export function inferMaterialFromTexture(texture: THREE.Texture): MaterialDefinition | null {
  if (!texture.image) return null;

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  canvas.width = Math.min(texture.image.width, 256);
  canvas.height = Math.min(texture.image.height, 256);
  ctx.drawImage(texture.image, 0, 0, canvas.width, canvas.height);

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  // Analyze pixels
  let brightness = 0;
  let variance = 0;
  let colorR = 0, colorG = 0, colorB = 0;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    brightness += (r + g + b) / 3;
    colorR += r;
    colorG += g;
    colorB += b;
  }

  brightness /= data.length / 4;
  colorR /= data.length / 4;
  colorG /= data.length / 4;
  colorB /= data.length / 4;

  // Calculate variance (roughness indicator)
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const avg = (r + g + b) / 3;
    variance += Math.pow(avg - brightness, 2);
  }

  variance /= data.length / 4;
  variance = Math.sqrt(variance) / 255;

  // Infer material type
  const baseColor = (Math.floor(colorR) << 16) | (Math.floor(colorG) << 8) | Math.floor(colorB);

  // Determine roughness from variance
  const roughness = Math.min(1.0, variance);

  // Determine metallic from brightness and saturation
  const saturation = Math.max(
    Math.abs(colorR - colorG),
    Math.max(Math.abs(colorG - colorB), Math.abs(colorR - colorB))
  ) / 255;
  const metallic = brightness > 180 && saturation < 0.2 ? 0.8 : 0.1;

  // Determine material type
  let type: 'rubber' | 'plastic' | 'metal' | 'wood' | 'glass' | 'composite' = 'composite';

  if (metallic > 0.5) {
    type = 'metal';
  } else if (roughness > 0.8 && brightness < 100) {
    type = 'rubber';
  } else if (brightness > 200) {
    type = 'plastic';
  } else {
    type = 'composite';
  }

  return {
    name: `texture_material_${baseColor.toString(16)}`,
    displayName: `Material ${baseColor.toString(16)}`,
    baseColor,
    roughness: Math.min(1.0, roughness),
    metallic: Math.min(1.0, metallic),
    type,
    surfaceProperties: {
      friction: 0.3 + roughness * 0.4,
      restitution: metallic > 0.5 ? 0.7 : 0.85,
      damping: (1 - metallic) * 0.1,
    },
  };
}

/**
 * Map elements to materials based on color and position
 */
export function mapElementsToMaterials(
  elements: Array<{ id: string; color: number }>,
  materials: Map<string, MaterialDefinition>
): Map<string, string> {
  const mapping = new Map<string, string>();

  for (const element of elements) {
    const bestMatch = findClosestMaterial(element.color, materials);
    mapping.set(element.id, bestMatch);
  }

  return mapping;
}

/**
 * Find closest material match for a color
 */
function findClosestMaterial(color: number, materials: Map<string, MaterialDefinition>): string {
  let bestMaterial = 'composite';
  let bestDistance = Infinity;

  const r1 = (color >> 16) & 0xff;
  const g1 = (color >> 8) & 0xff;
  const b1 = color & 0xff;

  for (const [name, material] of materials) {
    const r2 = (material.baseColor >> 16) & 0xff;
    const g2 = (material.baseColor >> 8) & 0xff;
    const b2 = material.baseColor & 0xff;

    const distance = Math.sqrt(
      Math.pow(r1 - r2, 2) + Math.pow(g1 - g2, 2) + Math.pow(b1 - b2, 2)
    );

    if (distance < bestDistance) {
      bestDistance = distance;
      bestMaterial = name;
    }
  }

  return bestMaterial;
}

/**
 * Apply material physics to game elements
 */
export function applyMaterialPhysicsToElements(
  elements: Array<any>,
  elementMaterialMap: Map<string, string>,
  materials: Map<string, MaterialDefinition>
): void {
  for (const element of elements) {
    const materialName = elementMaterialMap.get(element.id);
    if (!materialName) continue;

    const material = materials.get(materialName);
    if (!material) continue;

    // Apply material physics to element
    element.physics = {
      ...element.physics,
      friction: material.surfaceProperties.friction,
      restitution: material.surfaceProperties.restitution,
      damping: material.surfaceProperties.damping,
    };

    // Update visual material reference
    if (element.visual) {
      element.visual.material = materialName;
    }
  }
}

/**
 * Create Three.js material from definition
 */
export function createThreeMaterialFromDefinition(definition: MaterialDefinition): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: new THREE.Color(definition.baseColor),
    roughness: definition.roughness,
    metalness: definition.metallic,
    normalScale: new THREE.Vector2(definition.normalIntensity || 1.0),
  });
}

/**
 * Validate material definitions
 */
export function validateMaterials(materials: Map<string, MaterialDefinition>): {
  valid: number;
  invalid: number;
  warnings: string[];
} {
  const warnings: string[] = [];
  let valid = 0;
  let invalid = 0;

  for (const [name, material] of materials) {
    const errors: string[] = [];

    if (material.roughness < 0 || material.roughness > 1) {
      errors.push(`Roughness ${material.roughness} outside [0, 1]`);
    }

    if (material.metallic < 0 || material.metallic > 1) {
      errors.push(`Metallic ${material.metallic} outside [0, 1]`);
    }

    if (material.surfaceProperties.friction < 0 || material.surfaceProperties.friction > 2) {
      errors.push(`Friction out of range`);
    }

    if (errors.length > 0) {
      invalid++;
      warnings.push(`Material ${name}: ${errors.join('; ')}`);
    } else {
      valid++;
    }
  }

  return { valid, invalid, warnings };
}

/**
 * Generate material summary
 */
export function summarizeMaterials(materials: Map<string, MaterialDefinition>): string {
  const typeCount = new Map<string, number>();

  for (const material of materials.values()) {
    typeCount.set(material.type, (typeCount.get(material.type) || 0) + 1);
  }

  let summary = `Materials: ${materials.size}\n`;
  for (const [type, count] of typeCount) {
    summary += `  ${type}: ${count}\n`;
  }

  return summary;
}
