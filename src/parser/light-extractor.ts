/**
 * light-extractor.ts — Extract detailed light definitions from .fpt binary
 * Position, color, intensity, falloff, behavior, animation
 */

import { DetailedLight } from './enhanced-fpt-types';

// ─── Constants ─────────────────────────────────────────────────────────────
const INTENSITY_RANGE = { min: 0.0, max: 2.5 };
const FALLOFF_RANGE = { min: 1.0, max: 20.0 };
const TYPICAL_LIGHT_COUNT = 20; // Average FP table has 15-30 lights

// ─── Core Extraction ───────────────────────────────────────────────────────

/**
 * Extract all detailed light definitions from FPT binary
 */
export function extractDetailedLights(
  buffer: ArrayBuffer,
  elementCoordinates?: Array<{ x: number; y: number }>
): DetailedLight[] {
  const bytes = new Uint8Array(buffer);
  const lights: DetailedLight[] = [];

  // Strategy 1: Scan for light position clusters (XYZ triplets)
  const lightPositions = scanForLightPositions(bytes);
  console.log(`Found ${lightPositions.length} potential light positions`);

  // Strategy 2: Extract color data
  const colorData = extractLightColors(bytes, lightPositions.length);
  console.log(`Found ${colorData.length} color values`);

  // Strategy 3: Extract intensity values
  const intensities = extractLightIntensities(bytes, lightPositions.length);

  // Strategy 4: Extract falloff distances
  const falloffs = extractFalloffDistances(bytes, lightPositions.length);

  // Strategy 5: Detect light behaviors
  const behaviors = detectLightBehaviors(bytes, lightPositions.length);

  // Combine all extracted data
  for (let i = 0; i < lightPositions.length; i++) {
    const light: DetailedLight = {
      id: `light_${i}`,
      name: `Light ${i + 1}`,
      position: lightPositions[i],
      color: colorData[i] || { r: 1.0, g: 1.0, b: 1.0 },
      intensity: intensities[i] || 1.0,
      falloffDistance: falloffs[i] || 5.0,
      falloffType: 'quadratic',
      behavior: behaviors[i]?.behavior || 'static',
      behaviorRate: behaviors[i]?.rate,
      behaviorPhase: Math.random(),
    };

    // Link to nearby elements if coordinates provided
    if (elementCoordinates) {
      linkLightToNearestElement(light, elementCoordinates);
    }

    lights.push(light);
  }

  return lights;
}

/**
 * Scan for light position data (XYZ float triplets)
 */
function scanForLightPositions(bytes: Uint8Array): Array<{ x: number; y: number; z: number }> {
  const positions: Array<{ x: number; y: number; z: number }> = [];
  const view = new DataView(bytes.buffer, bytes.byteOffset);

  // Light positions typically in range:
  // X: -2 to 2 (relative to center)
  // Y: -5 to 5 (along playfield)
  // Z: 0 to 3 (height above playfield)

  for (let i = 0; i < bytes.length - 11; i += 4) {
    try {
      const x = view.getFloat32(i, true);
      const y = view.getFloat32(i + 4, true);
      const z = view.getFloat32(i + 8, true);

      // Validate bounds
      if (
        x >= -3 && x <= 3 &&
        y >= -6 && y <= 6 &&
        z >= -0.5 && z <= 4.0 &&
        Number.isFinite(x) && Number.isFinite(y) && Number.isFinite(z)
      ) {
        // Check if this position is significantly different from existing ones
        const isDuplicate = positions.some(
          pos => Math.abs(pos.x - x) < 0.1 && Math.abs(pos.y - y) < 0.1 && Math.abs(pos.z - z) < 0.1
        );

        if (!isDuplicate) {
          positions.push({ x, y, z });
          if (positions.length >= TYPICAL_LIGHT_COUNT * 2) break; // Limit search
        }
      }
    } catch {
      // Skip invalid reads
    }
  }

  return positions;
}

/**
 * Extract light colors from binary (RGB triplets)
 */
function extractLightColors(
  bytes: Uint8Array,
  expectedCount: number
): Array<{ r: number; g: number; b: number }> {
  const colors: Array<{ r: number; g: number; b: number }> = [];
  const view = new DataView(bytes.buffer, bytes.byteOffset);

  // Strategy 1: Look for RGB triplets (0.0-1.0 or 0-255 range)
  for (let i = 0; i < bytes.length - 11; i += 4) {
    try {
      // Try float32 RGB (0.0-1.0)
      const r = view.getFloat32(i, true);
      const g = view.getFloat32(i + 4, true);
      const b = view.getFloat32(i + 8, true);

      if (
        r >= 0 && r <= 1.1 &&
        g >= 0 && g <= 1.1 &&
        b >= 0 && b <= 1.1 &&
        Number.isFinite(r) && Number.isFinite(g) && Number.isFinite(b)
      ) {
        colors.push({ r, g, b });
        if (colors.length >= expectedCount) break;
      }
    } catch {
      // Skip
    }
  }

  // Strategy 2: If not enough colors found, look for byte triplets (0-255)
  if (colors.length < expectedCount / 2) {
    for (let i = 0; i < bytes.length - 2; i++) {
      const r = bytes[i];
      const g = bytes[i + 1];
      const b = bytes[i + 2];

      // RGB bytes are typically 0-255, with at least one value > 50
      if ((r + g + b) > 50 && (r + g + b) < 700) {
        colors.push({
          r: r / 255,
          g: g / 255,
          b: b / 255,
        });

        i += 2; // Skip to avoid overlapping triplets
        if (colors.length >= expectedCount) break;
      }
    }
  }

  return colors;
}

/**
 * Extract light intensity values
 */
function extractLightIntensities(bytes: Uint8Array, expectedCount: number): number[] {
  const intensities: number[] = [];
  const view = new DataView(bytes.buffer, bytes.byteOffset);

  // Intensity typically 0.0-2.0
  for (let i = 0; i < bytes.length - 3; i += 4) {
    try {
      const val = view.getFloat32(i, true);

      if (val >= INTENSITY_RANGE.min && val <= INTENSITY_RANGE.max && Number.isFinite(val)) {
        // Common values: 0.5, 1.0, 1.5, 2.0
        intensities.push(val);
        if (intensities.length >= expectedCount) break;
      }
    } catch {
      // Skip
    }
  }

  return intensities;
}

/**
 * Extract falloff distance values
 */
function extractFalloffDistances(bytes: Uint8Array, expectedCount: number): number[] {
  const falloffs: number[] = [];
  const view = new DataView(bytes.buffer, bytes.byteOffset);

  // Falloff typically 2.0-15.0 units
  for (let i = 0; i < bytes.length - 3; i += 4) {
    try {
      const val = view.getFloat32(i, true);

      if (val >= FALLOFF_RANGE.min && val <= FALLOFF_RANGE.max && Number.isFinite(val)) {
        falloffs.push(val);
        if (falloffs.length >= expectedCount) break;
      }
    } catch {
      // Skip
    }
  }

  return falloffs;
}

/**
 * Detect light behavior patterns (static, pulse, flash, fade)
 */
function detectLightBehaviors(
  bytes: Uint8Array,
  expectedCount: number
): Array<{ behavior: string; rate?: number; phase?: number }> {
  const behaviors: Array<{ behavior: string; rate?: number }> = [];

  // Behavior flags often stored as bytes near light position data
  // 0 = static, 1 = pulse, 2 = flash, 3 = fade
  for (let i = 0; i < bytes.length && behaviors.length < expectedCount; i++) {
    const byte = bytes[i];

    switch (byte) {
      case 0:
        behaviors.push({ behavior: 'static' });
        break;
      case 1:
        behaviors.push({ behavior: 'pulse', rate: 2.0 }); // 2 Hz typical
        break;
      case 2:
        behaviors.push({ behavior: 'flashing', rate: 5.0 }); // 5 Hz typical
        break;
      case 3:
        behaviors.push({ behavior: 'fade' });
        break;
    }
  }

  // Fallback: fill remaining with static lights
  while (behaviors.length < expectedCount) {
    behaviors.push({ behavior: 'static' });
  }

  return behaviors;
}

/**
 * Link light to nearest game element
 */
function linkLightToNearestElement(
  light: DetailedLight,
  elementCoordinates: Array<{ x: number; y: number }>
): void {
  if (elementCoordinates.length === 0) return;

  // Find nearest element
  let nearestIdx = 0;
  let nearestDist = Infinity;

  for (let i = 0; i < elementCoordinates.length; i++) {
    const coord = elementCoordinates[i];
    const dist = Math.sqrt(
      (light.position.x - coord.x) ** 2 +
      (light.position.y - coord.y) ** 2 +
      (light.position.z - 0.5) ** 2
    );

    if (dist < nearestDist) {
      nearestDist = dist;
      nearestIdx = i;
    }
  }

  // Link if close enough (within 1 unit)
  if (nearestDist < 1.0) {
    light.linkedElement = `element_${nearestIdx}`;
    light.linkType = nearestDist < 0.3 ? 'on-hit' : 'on-active';
  }
}

/**
 * Detect light behavior from animation data
 */
export function identifyLightBehavior(
  lightData: Uint8Array
): 'static' | 'pulse' | 'flashing' | 'fade' {
  if (lightData.length === 0) return 'static';

  // Look for behavior flag in first byte
  const behaviorFlag = lightData[0] & 0x0F;

  switch (behaviorFlag) {
    case 1:
      return 'pulse';
    case 2:
      return 'flashing';
    case 3:
      return 'fade';
    default:
      return 'static';
  }
}

/**
 * Extract light behavior animation rate (Hz)
 */
export function extractLightBehaviorRate(lightData: Uint8Array): number {
  if (lightData.length < 2) return 2.0; // Default pulse rate

  // Rate often stored as second byte (0-255 representing 0-10 Hz)
  const rateByte = lightData[1];
  return (rateByte / 255) * 10 + 0.5; // Scale to 0.5-10.5 Hz range
}

/**
 * Group lights by spatial proximity
 */
export function groupLightsByProximity(
  lights: DetailedLight[],
  maxDistance: number = 0.5
): Array<DetailedLight[]> {
  const groups: Array<DetailedLight[]> = [];
  const assigned = new Set<string>();

  for (const light of lights) {
    if (assigned.has(light.id)) continue;

    const group = [light];
    assigned.add(light.id);

    for (const other of lights) {
      if (assigned.has(other.id)) continue;

      const dist = Math.sqrt(
        (light.position.x - other.position.x) ** 2 +
        (light.position.y - other.position.y) ** 2 +
        (light.position.z - other.position.z) ** 2
      );

      if (dist <= maxDistance) {
        group.push(other);
        assigned.add(other.id);
      }
    }

    groups.push(group);
  }

  return groups;
}

/**
 * Infer light behavior from surrounding element types
 */
export function inferLightBehaviorFromContext(
  light: DetailedLight,
  linkedElementType?: string
): void {
  if (!linkedElementType) return;

  switch (linkedElementType) {
    case 'bumper':
      // Bumper lights flash on hit
      light.behavior = 'flashing';
      light.behaviorRate = 5.0;
      light.linkType = 'on-hit';
      break;

    case 'target':
      // Target lights pulse when ready
      light.behavior = 'pulse';
      light.behaviorRate = 2.0;
      light.linkType = 'on-active';
      break;

    case 'flipper':
      // Flipper lights are usually static or fade
      light.behavior = 'static';
      light.linkType = 'always-on';
      break;

    case 'ramp':
      // Ramp lights fade in/out
      light.behavior = 'fade';
      light.linkType = 'on-state-change';
      break;

    default:
      light.behavior = 'static';
      break;
  }
}

/**
 * Validate extracted lights
 */
export function validateExtractedLights(lights: DetailedLight[]): {
  valid: number;
  invalid: number;
  warnings: string[];
} {
  const warnings: string[] = [];
  let valid = 0;
  let invalid = 0;

  for (const light of lights) {
    const errors: string[] = [];

    // Position validation
    if (!Number.isFinite(light.position.x) || !Number.isFinite(light.position.y) || !Number.isFinite(light.position.z)) {
      errors.push(`Invalid position: ${JSON.stringify(light.position)}`);
    }

    // Color validation
    if (
      light.color.r < 0 || light.color.r > 1.1 ||
      light.color.g < 0 || light.color.g > 1.1 ||
      light.color.b < 0 || light.color.b > 1.1
    ) {
      errors.push(`Invalid color values: ${JSON.stringify(light.color)}`);
    }

    // Intensity validation
    if (light.intensity < 0 || light.intensity > 2.5) {
      errors.push(`Intensity ${light.intensity} out of range [0, 2.5]`);
    }

    // Falloff validation
    if (light.falloffDistance < 0.5 || light.falloffDistance > 20) {
      warnings.push(`Light ${light.id} falloff ${light.falloffDistance} unusual`);
    }

    if (errors.length > 0) {
      invalid++;
      warnings.push(`Light ${light.id}: ${errors.join('; ')}`);
    } else {
      valid++;
    }
  }

  return { valid, invalid, warnings };
}

/**
 * Generate light configuration summary
 */
export function summarizeLights(lights: DetailedLight[]): string {
  const staticCount = lights.filter(l => l.behavior === 'static').length;
  const dynamicCount = lights.filter(l => l.behavior !== 'static').length;

  const avgIntensity = lights.reduce((sum, l) => sum + l.intensity, 0) / lights.length;
  const avgFalloff = lights.reduce((sum, l) => sum + l.falloffDistance, 0) / lights.length;

  return `
Light Configuration Summary:
  Total Lights: ${lights.length}
  Static: ${staticCount} | Dynamic: ${dynamicCount}
  Average Intensity: ${avgIntensity.toFixed(2)}x
  Average Falloff: ${avgFalloff.toFixed(1)} units

Behavior Distribution:
  ${lights.filter(l => l.behavior === 'static').length} static
  ${lights.filter(l => l.behavior === 'pulse').length} pulsing
  ${lights.filter(l => l.behavior === 'flashing').length} flashing
  ${lights.filter(l => l.behavior === 'fade').length} fading
`.trim();
}
