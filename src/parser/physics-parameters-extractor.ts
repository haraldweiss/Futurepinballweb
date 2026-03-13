/**
 * physics-parameters-extractor.ts — Enhanced physics extraction for each element
 * Restitution, friction, damping, max velocity, collision groups
 */

import { MaterialDefinition } from './enhanced-fpt-types';

// ─── Constants ─────────────────────────────────────────────────────────────
const PHYSICS_PARAM_RANGES = {
  restitution: { min: 0.0, max: 1.6 },
  friction: { min: 0.0, max: 2.0 },
  damping: { min: 0.0, max: 1.0 },
  mass: { min: 0.0, max: 100.0 },
  maxVelocity: { min: 1.0, max: 50.0 },
  gravityScale: { min: 0.0, max: 3.0 },
};

// ─── Core Extraction ───────────────────────────────────────────────────────

/**
 * Extract enhanced physics parameters from binary
 */
export function extractEnhancedPhysicsData(
  bytes: Uint8Array,
  elementCount: number
): Map<string, PhysicsProfile> {
  const physicsMap = new Map<string, PhysicsProfile>();

  // Strategy 1: Scan for physics block patterns
  const physicsBlocks = scanForPhysicsBlocks(bytes);
  console.log(`Found ${physicsBlocks.length} potential physics blocks`);

  // Strategy 2: Scan for restitution values
  const restitutionValues = scanPhysicsRange(bytes, PHYSICS_PARAM_RANGES.restitution);

  // Strategy 3: Scan for friction values
  const frictionValues = scanPhysicsRange(bytes, PHYSICS_PARAM_RANGES.friction);

  // Combine into element profiles
  for (let i = 0; i < elementCount && i < Math.max(restitutionValues.length, frictionValues.length); i++) {
    const profile: PhysicsProfile = {
      restitution: restitutionValues[i] || 0.8,
      friction: frictionValues[i] || 0.5,
      damping: 0.0,
      mass: 0,
      maxVelocity: 10.0,
      gravityScale: 1.0,
      angularFriction: 0.3,
    };

    physicsMap.set(`element_${i}`, profile);
  }

  return physicsMap;
}

interface PhysicsProfile {
  restitution: number;
  friction: number;
  damping: number;
  mass: number;
  maxVelocity: number;
  gravityScale: number;
  angularFriction?: number;
}

/**
 * Scan for physics parameter blocks
 */
function scanForPhysicsBlocks(bytes: Uint8Array): Array<{ offset: number; data: Uint8Array }> {
  const blocks: Array<{ offset: number; data: Uint8Array }> = [];
  const view = new DataView(bytes.buffer, bytes.byteOffset);

  // Physics blocks often contain 4-6 consecutive float32 values
  // in valid physics ranges
  for (let i = 0; i < bytes.length - 24; i += 4) {
    try {
      const vals = [];
      let validCount = 0;

      for (let j = 0; j < 6; j++) {
        const val = view.getFloat32(i + j * 4, true);

        if (isValidPhysicsValue(val)) {
          validCount++;
          vals.push(val);
        }
      }

      if (validCount >= 4) {
        // Likely a physics block
        blocks.push({
          offset: i,
          data: bytes.slice(i, i + 24),
        });
        i += 20; // Skip ahead to avoid overlaps
      }
    } catch {
      // Skip invalid reads
    }
  }

  return blocks;
}

/**
 * Check if float value is likely a physics parameter
 */
function isValidPhysicsValue(val: number): boolean {
  if (!Number.isFinite(val)) return false;

  // Check against all known physics ranges
  for (const range of Object.values(PHYSICS_PARAM_RANGES)) {
    if (val >= range.min && val <= range.max) return true;
  }

  return false;
}

/**
 * Scan for values in specific physics range
 */
function scanPhysicsRange(
  bytes: Uint8Array,
  range: { min: number; max: number },
  maxResults: number = 100
): number[] {
  const values: number[] = [];
  const view = new DataView(bytes.buffer, bytes.byteOffset);

  for (let i = 0; i < bytes.length - 3; i += 4) {
    try {
      const val = view.getFloat32(i, true);

      if (val >= range.min && val <= range.max && Number.isFinite(val)) {
        // Avoid very close duplicates
        if (values.length === 0 || Math.abs(values[values.length - 1] - val) > 0.01) {
          values.push(val);
          if (values.length >= maxResults) break;
        }
      }
    } catch {
      // Skip
    }
  }

  return values;
}

/**
 * Extract material physics for elements
 */
export function extractMaterialPhysics(
  bytes: Uint8Array
): Map<string, MaterialDefinition> {
  const materials = new Map<string, MaterialDefinition>();

  // Define standard material properties
  const standardMaterials: Record<string, MaterialDefinition> = {
    rubber: {
      name: 'rubber',
      displayName: 'Rubber',
      baseColor: 0x333333,
      roughness: 0.8,
      metallic: 0.0,
      type: 'rubber',
      surfaceProperties: {
        friction: 0.6,
        restitution: 0.95,
        damping: 0.1,
      },
    },
    plastic: {
      name: 'plastic',
      displayName: 'Plastic',
      baseColor: 0x666666,
      roughness: 0.5,
      metallic: 0.0,
      type: 'plastic',
      surfaceProperties: {
        friction: 0.4,
        restitution: 0.8,
        damping: 0.05,
      },
    },
    metal: {
      name: 'metal',
      displayName: 'Metal',
      baseColor: 0xaaaaaa,
      roughness: 0.3,
      metallic: 0.9,
      type: 'metal',
      surfaceProperties: {
        friction: 0.3,
        restitution: 0.7,
        damping: 0.02,
      },
    },
    wood: {
      name: 'wood',
      displayName: 'Wood',
      baseColor: 0x8b4513,
      roughness: 0.6,
      metallic: 0.0,
      type: 'wood',
      surfaceProperties: {
        friction: 0.5,
        restitution: 0.5,
        damping: 0.08,
      },
    },
  };

  for (const [name, material] of Object.entries(standardMaterials)) {
    materials.set(name, material);
  }

  return materials;
}

/**
 * Extract collision group definitions
 */
export function extractCollisionGroups(bytes: Uint8Array, elementCount: number) {
  // Default collision configuration
  const collisionGroups = [];

  // Group 1: Dynamic bodies (bumpers, targets)
  collisionGroups.push({
    id: 1,
    name: 'dynamic_elements',
    elementsInGroup: generateElementIds(0, Math.floor(elementCount * 0.4)),
    collisionResponse: {
      bounceMultiplier: 0.8,
      stickiness: 0.0,
      soundIntensity: 0.8,
    },
  });

  // Group 2: Kinematic bodies (flippers, ramps)
  collisionGroups.push({
    id: 2,
    name: 'kinematic_elements',
    elementsInGroup: generateElementIds(Math.floor(elementCount * 0.4), Math.floor(elementCount * 0.7)),
    collisionResponse: {
      bounceMultiplier: 1.2,
      stickiness: 0.2,
      soundIntensity: 1.0,
    },
  });

  // Group 3: Static bodies (walls)
  collisionGroups.push({
    id: 3,
    name: 'static_elements',
    elementsInGroup: generateElementIds(Math.floor(elementCount * 0.7), elementCount),
    collisionResponse: {
      bounceMultiplier: 0.6,
      stickiness: 0.0,
      soundIntensity: 0.5,
    },
  });

  return collisionGroups;
}

/**
 * Extract velocity limits per element type
 */
export function extractVelocityProfile(bytes: Uint8Array): VelocityProfile {
  const maxVelValues = scanPhysicsRange(bytes, PHYSICS_PARAM_RANGES.maxVelocity, 10);

  return {
    ballMaxVelocity: maxVelValues[0] || 10.0,
    bumperMaxVelocity: maxVelValues[1] || 8.0,
    flipperMaxVelocity: maxVelValues[2] || 15.0,
    defaultGravityScale: 1.0,
    airResistance: 0.02,
  };
}

interface VelocityProfile {
  ballMaxVelocity: number;
  bumperMaxVelocity: number;
  flipperMaxVelocity: number;
  defaultGravityScale: number;
  airResistance: number;
}

/**
 * Validate physics parameters
 */
export function validatePhysicsParameters(profile: PhysicsProfile): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (profile.restitution < 0 || profile.restitution > 1.6) {
    errors.push(`Restitution ${profile.restitution} out of range [0, 1.6]`);
  }

  if (profile.friction < 0 || profile.friction > 2.0) {
    errors.push(`Friction ${profile.friction} out of range [0, 2.0]`);
  }

  if (profile.maxVelocity < 1 || profile.maxVelocity > 50) {
    warnings.push(`Max velocity ${profile.maxVelocity} unusual`);
  }

  if (profile.restitution > 1.2) {
    warnings.push(`High restitution ${profile.restitution} (bouncy)`);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Utility: Generate element IDs
 */
function generateElementIds(start: number, end: number): string[] {
  const ids: string[] = [];
  for (let i = start; i < end; i++) {
    ids.push(`element_${i}`);
  }
  return ids;
}

/**
 * Summary of physics configuration
 */
export function summarizePhysicsExtraction(profiles: Map<string, PhysicsProfile>): string {
  const entries = Array.from(profiles.values());

  const avgRestitution = entries.reduce((sum, p) => sum + p.restitution, 0) / entries.length;
  const avgFriction = entries.reduce((sum, p) => sum + p.friction, 0) / entries.length;
  const avgMaxVel = entries.reduce((sum, p) => sum + p.maxVelocity, 0) / entries.length;

  return `
Physics Configuration:
  Elements: ${profiles.size}
  Avg Restitution: ${avgRestitution.toFixed(2)}
  Avg Friction: ${avgFriction.toFixed(2)}
  Avg Max Velocity: ${avgMaxVel.toFixed(1)} units/s
`.trim();
}
