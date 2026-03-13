/**
 * playfield-extractor.ts — Extract core playfield settings from .fpt binary
 * Gravity, table dimensions, friction, tilt sensitivity, drain behavior
 */

import { PlayfieldSettings, PhysicsValidation } from './enhanced-fpt-types';

// ─── Constants & Known Values ──────────────────────────────────────────────
const GRAVITY_RANGE = { min: 5.0, max: 15.0 };
const TYPICAL_GRAVITY = 9.81;
const FRICTION_RANGE = { min: 0.0, max: 1.0 };
const TABLE_WIDTH_RANGE = { min: 800, max: 2100 };
const TABLE_HEIGHT_RANGE = { min: 4000, max: 4500 };

// Float32 bytes for common gravity values (for magic-byte detection)
const KNOWN_GRAVITY_VALUES = [
  9.81,   // Standard earth gravity
  9.8,    // Rounded standard
  10.0,   // Common FP value
  10.5,   // Higher gravity tables
  12.0,   // Very difficult tables
  5.5,    // Low gravity (rare)
];

// ─── Core Extraction Functions ────────────────────────────────────────────

/**
 * Extract complete playfield settings from FPT binary
 * Uses heuristics and validation to find gravity, dimensions, and physics config
 */
export function extractPlayfieldSettings(bytes: Uint8Array): PlayfieldSettings {
  const settings: PlayfieldSettings = {
    gravity: extractGravityValue(bytes),
    friction: extractFrictionValue(bytes),
    width: extractTableWidth(bytes),
    height: extractTableHeight(bytes),
    ballRadius: 0.027,               // Standard FP ball radius
    tableMode: 'classic',
    tiltSensitivity: extractTiltSensitivity(bytes),
    drainTimeout: extractDrainTimeout(bytes),
    dampening: extractDampening(bytes),
    restitutionScalar: extractRestitutionScalar(bytes),
    flipperStrengthScalar: extractFlipperStrengthScalar(bytes),
  };

  return settings;
}

/**
 * Extract gravity value with multiple strategies and validation
 */
export function extractGravityValue(bytes: Uint8Array): number {
  const candidates: Array<{ value: number; score: number }> = [];

  // Strategy 1: Look for known gravity values
  for (const knownValue of KNOWN_GRAVITY_VALUES) {
    const positions = findFloat32Value(bytes, knownValue, 0.001); // ±0.001 tolerance
    for (const pos of positions) {
      candidates.push({ value: knownValue, score: 0.9 });
    }
  }

  // Strategy 2: Scan entire range for likely values
  const floatValues = scanFloat32Range(bytes, GRAVITY_RANGE.min, GRAVITY_RANGE.max);
  for (const val of floatValues) {
    // Higher confidence for round numbers or close to 9.81
    let score = 0.5;
    if (Math.abs(val - TYPICAL_GRAVITY) < 0.5) score += 0.3;
    if (Number.isInteger(val * 2)) score += 0.1; // Half-integer = likely
    if (val > 0 && val < GRAVITY_RANGE.max) score += 0.1;

    candidates.push({ value: val, score });
  }

  // Strategy 3: Look for patterns (gravity often repeated)
  const patternValue = findRepeatingFloat32(bytes, GRAVITY_RANGE.min, GRAVITY_RANGE.max);
  if (patternValue !== null) {
    candidates.push({ value: patternValue, score: 0.95 });
  }

  // Return best candidate, default to standard gravity
  if (candidates.length === 0) return TYPICAL_GRAVITY;

  candidates.sort((a, b) => b.score - a.score);
  const bestValue = candidates[0].value;

  // Final validation
  if (bestValue < GRAVITY_RANGE.min || bestValue > GRAVITY_RANGE.max) {
    return TYPICAL_GRAVITY;
  }

  return bestValue;
}

/**
 * Extract friction coefficient from binary
 */
export function extractFrictionValue(bytes: Uint8Array): number {
  const candidates: Array<{ value: number; score: number }> = [];

  // Scan for typical friction values
  const floatValues = scanFloat32Range(bytes, FRICTION_RANGE.min, FRICTION_RANGE.max);

  for (const val of floatValues) {
    let score = 0.5;
    // Common FP friction values: 0.5-0.8
    if (val >= 0.4 && val <= 0.9) score += 0.3;
    if (Number.isInteger(val * 10)) score += 0.2; // Round to 0.1

    candidates.push({ value: val, score });
  }

  if (candidates.length === 0) return 0.75; // Default FP friction

  candidates.sort((a, b) => b.score - a.score);
  return candidates[0].value;
}

/**
 * Detect table width from coordinates and binary data
 */
export function extractTableWidth(bytes: Uint8Array): number {
  // Default based on standard FP playfield
  // Will be refined with coordinate analysis in object extraction phase
  const floatValues = scanFloat32Range(bytes, TABLE_WIDTH_RANGE.min, TABLE_WIDTH_RANGE.max);

  if (floatValues.length > 0) {
    // Most tables are around 1050 units wide
    const closest = floatValues.reduce((prev, curr) =>
      Math.abs(curr - 1050) < Math.abs(prev - 1050) ? curr : prev
    );
    return closest;
  }

  return 1050; // Standard FP width
}

/**
 * Detect table height from coordinates and binary data
 */
export function extractTableHeight(bytes: Uint8Array): number {
  const floatValues = scanFloat32Range(bytes, TABLE_HEIGHT_RANGE.min, TABLE_HEIGHT_RANGE.max);

  if (floatValues.length > 0) {
    // Most tables are around 4250 units tall
    const closest = floatValues.reduce((prev, curr) =>
      Math.abs(curr - 4250) < Math.abs(prev - 4250) ? curr : prev
    );
    return closest;
  }

  return 4250; // Standard FP height
}

/**
 * Extract tilt sensitivity threshold
 */
export function extractTiltSensitivity(bytes: Uint8Array): number {
  // Tilt sensitivity typically stored as acceleration threshold
  // Range: 0.5-3.0 (higher = easier to tilt)
  const floatValues = scanFloat32Range(bytes, 0.5, 3.0);

  for (const val of floatValues) {
    // Valid tilt values are usually moderate
    if (val >= 1.0 && val <= 2.5) {
      return val;
    }
  }

  return 1.5; // Default sensitivity
}

/**
 * Extract drain timeout (time before reset)
 */
export function extractDrainTimeout(bytes: Uint8Array): number {
  // Drain timeout typically 3.5-5.0 seconds stored as float
  const floatValues = scanFloat32Range(bytes, 3.0, 6.0);

  for (const val of floatValues) {
    if (val >= 3.0 && val <= 5.5) {
      return val;
    }
  }

  return 4.0; // Default drain timeout
}

/**
 * Extract air dampening/drag coefficient
 */
export function extractDampening(bytes: Uint8Array): number {
  // Air drag: typically very small (0.01-0.05)
  const floatValues = scanFloat32Range(bytes, 0.0, 0.2);

  for (const val of floatValues) {
    if (val >= 0.01 && val <= 0.1) {
      return val;
    }
  }

  return 0.02; // Default dampening
}

/**
 * Extract global restitution scalar
 */
export function extractRestitutionScalar(bytes: Uint8Array): number {
  // Restitution multiplier: 0.8-1.2
  const floatValues = scanFloat32Range(bytes, 0.7, 1.3);

  for (const val of floatValues) {
    if (val >= 0.8 && val <= 1.2) {
      return val;
    }
  }

  return 1.0; // Default (no modification)
}

/**
 * Extract flipper strength scalar
 */
export function extractFlipperStrengthScalar(bytes: Uint8Array): number {
  // Flipper strength: 0.5-2.0 multiplier
  const floatValues = scanFloat32Range(bytes, 0.4, 2.5);

  for (const val of floatValues) {
    if (val >= 0.5 && val <= 2.0) {
      return val;
    }
  }

  return 1.0; // Default strength
}

// ─── Utility Functions for Binary Scanning ────────────────────────────────

/**
 * Find all float32 values in a specific range in binary data
 */
function scanFloat32Range(
  bytes: Uint8Array,
  minValue: number,
  maxValue: number,
  maxResults: number = 50
): number[] {
  const results: number[] = [];
  const view = new DataView(bytes.buffer, bytes.byteOffset);

  // Scan by 4-byte chunks (float32 size)
  for (let i = 0; i < bytes.length - 3; i += 4) {
    try {
      const val = view.getFloat32(i, true); // Little-endian

      if (val >= minValue && val <= maxValue && Number.isFinite(val)) {
        // Avoid duplicates
        if (results.length === 0 || Math.abs(results[results.length - 1] - val) > 0.0001) {
          results.push(val);
          if (results.length >= maxResults) break;
        }
      }
    } catch {
      // Skip invalid reads
    }
  }

  return results;
}

/**
 * Find a specific float32 value with tolerance
 */
function findFloat32Value(
  bytes: Uint8Array,
  targetValue: number,
  tolerance: number = 0.001
): number[] {
  const positions: number[] = [];
  const view = new DataView(bytes.buffer, bytes.byteOffset);

  for (let i = 0; i < bytes.length - 3; i += 4) {
    try {
      const val = view.getFloat32(i, true);
      if (Math.abs(val - targetValue) <= tolerance) {
        positions.push(i);
      }
    } catch {
      // Skip
    }
  }

  return positions;
}

/**
 * Find float32 values that appear multiple times (pattern detection)
 */
function findRepeatingFloat32(
  bytes: Uint8Array,
  minValue: number,
  maxValue: number,
  minOccurrences: number = 2
): number | null {
  const frequency: Map<string, number> = new Map();
  const view = new DataView(bytes.buffer, bytes.byteOffset);

  for (let i = 0; i < bytes.length - 3; i += 4) {
    try {
      const val = view.getFloat32(i, true);
      if (val >= minValue && val <= maxValue && Number.isFinite(val)) {
        // Round to avoid floating point precision issues
        const key = val.toFixed(3);
        frequency.set(key, (frequency.get(key) || 0) + 1);
      }
    } catch {
      // Skip
    }
  }

  // Find most repeated value
  let bestValue: number | null = null;
  let maxCount = 0;

  for (const [key, count] of frequency) {
    if (count >= minOccurrences && count > maxCount) {
      bestValue = parseFloat(key);
      maxCount = count;
    }
  }

  return bestValue;
}

// ─── Validation & Quality Metrics ────────────────────────────────────────

/**
 * Validate extracted playfield settings
 */
export function validatePlayfieldSettings(settings: PlayfieldSettings): PhysicsValidation {
  const errors: string[] = [];
  const warnings: string[] = [];
  let confidence = 1.0;

  // Gravity validation
  if (settings.gravity < GRAVITY_RANGE.min || settings.gravity > GRAVITY_RANGE.max) {
    errors.push(`Gravity ${settings.gravity} outside valid range [${GRAVITY_RANGE.min}, ${GRAVITY_RANGE.max}]`);
    confidence -= 0.3;
  } else if (Math.abs(settings.gravity - TYPICAL_GRAVITY) > 1.0) {
    warnings.push(`Gravity ${settings.gravity.toFixed(2)} differs from standard ${TYPICAL_GRAVITY}`);
  }

  // Friction validation
  if (settings.friction < FRICTION_RANGE.min || settings.friction > FRICTION_RANGE.max) {
    errors.push(`Friction ${settings.friction} outside valid range [0.0, 1.0]`);
    confidence -= 0.2;
  }

  // Table dimensions validation
  if (settings.width < TABLE_WIDTH_RANGE.min || settings.width > TABLE_WIDTH_RANGE.max) {
    warnings.push(`Table width ${settings.width} outside typical range`);
  }

  if (settings.height < TABLE_HEIGHT_RANGE.min || settings.height > TABLE_HEIGHT_RANGE.max) {
    warnings.push(`Table height ${settings.height} outside typical range`);
  }

  // Ball radius validation
  if (settings.ballRadius <= 0 || settings.ballRadius > 0.1) {
    warnings.push(`Ball radius ${settings.ballRadius} seems unusual`);
  }

  return {
    isValid: errors.length === 0,
    confidence: Math.max(0, confidence),
    errors,
    warnings,
  };
}

/**
 * Refine playfield settings using coordinate data
 * Called after coordinate extraction in later phases
 */
export function refinePlayfieldSettingsWithCoordinates(
  settings: PlayfieldSettings,
  coordinates: Array<{ x: number; y: number }>
): PlayfieldSettings {
  if (coordinates.length < 3) return settings; // Not enough data

  // Find bounding box
  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;

  for (const coord of coordinates) {
    minX = Math.min(minX, coord.x);
    maxX = Math.max(maxX, coord.x);
    minY = Math.min(minY, coord.y);
    maxY = Math.max(maxY, coord.y);
  }

  const boundingWidth = maxX - minX;
  const boundingHeight = maxY - minY;

  // Refine dimensions if coordinates span significant area
  if (boundingWidth > 1.0 && boundingWidth < 3.0) {
    // Update width estimation
    settings.width = Math.max(settings.width, boundingWidth * 500);
  }

  if (boundingHeight > 2.0 && boundingHeight < 6.0) {
    // Update height estimation
    settings.height = Math.max(settings.height, boundingHeight * 750);
  }

  return settings;
}

/**
 * Generate summary of extracted playfield settings
 */
export function summarizePlayfieldSettings(settings: PlayfieldSettings): string {
  return `
Playfield Settings:
  Gravity: ${settings.gravity.toFixed(2)} m/s²
  Friction: ${settings.friction.toFixed(2)}
  Dimensions: ${settings.width.toFixed(0)} × ${settings.height.toFixed(0)} units
  Ball Radius: ${settings.ballRadius.toFixed(3)}
  Tilt Sensitivity: ${settings.tiltSensitivity.toFixed(2)}
  Drain Timeout: ${settings.drainTimeout.toFixed(1)}s
  Dampening: ${settings.dampening.toFixed(3)}
  Restitution Scalar: ${settings.restitutionScalar.toFixed(2)}x
  Flipper Strength: ${settings.flipperStrengthScalar.toFixed(2)}x
`.trim();
}
