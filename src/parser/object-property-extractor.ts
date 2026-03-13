/**
 * object-property-extractor.ts — Extract and classify game elements from .fpt
 * Bumpers, targets, flippers, ramps, walls, etc. with full properties
 */

import { GameElement } from './enhanced-fpt-types';

// ─── Type Definitions ──────────────────────────────────────────────────────
export type ElementType = 'bumper' | 'target' | 'flipper' | 'ramp' | 'wall' | 'slingshot' | 'spinner' | 'kickback' | 'drain' | 'plunger' | 'trough' | 'kicker';

interface ElementClassificationScore {
  type: ElementType;
  score: number;
  confidence: number;
}

// ─── Core Extraction ───────────────────────────────────────────────────────

/**
 * Extract and classify all game elements from coordinates
 */
export function extractGameElements(
  coordinates: Array<{ x: number; y: number }>,
  physicsData?: Map<string, any>,
  colorData?: Map<number, number>,
  scriptFunctions?: string[]
): GameElement[] {
  const elements: GameElement[] = [];

  if (coordinates.length === 0) return elements;

  // Classify each coordinate
  for (let i = 0; i < coordinates.length; i++) {
    const coord = coordinates[i];
    const classification = classifyElementType(coord, coordinates, i, scriptFunctions);

    const element: GameElement = {
      id: `element_${i}`,
      name: `${classification.type.charAt(0).toUpperCase() + classification.type.slice(1)} ${i}`,
      type: classification.type,
      position: { x: coord.x, y: coord.y, z: 0 },
      rotation: 0,
      scale: 1.0,

      physics: extractElementPhysics(i, physicsData),
      visual: {
        color: colorData?.get(i) || getDefaultColorForType(classification.type),
        material: getMaterialForType(classification.type),
      },

      behavior: extractElementBehavior(i, classification.type, scriptFunctions),
    };

    // Add type-specific data
    switch (classification.type) {
      case 'ramp':
        element.rampData = extractRampData(coord, coordinates);
        break;
      case 'flipper':
        element.flipperData = extractFlipperData(coord, coordinates);
        break;
      case 'spinner':
        element.spinnerData = { maxRPM: 100, brakeForce: 0.8, sensitive: false };
        break;
      case 'wall':
        element.wallData = { isVisible: true, isPhysicsEnabled: true };
        break;
    }

    elements.push(element);
  }

  return elements;
}

/**
 * Classify element type based on position and context
 */
function classifyElementType(
  position: { x: number; y: number },
  allCoordinates: Array<{ x: number; y: number }>,
  index: number,
  scriptFunctions?: string[]
): ElementClassificationScore {
  const scores: ElementClassificationScore[] = [];

  // Score bumper (upper field, dense cluster)
  const bumperScore = scoreBumperLikelihood(position, allCoordinates);
  if (bumperScore.score > 0) scores.push(bumperScore);

  // Score target (right/left side, scattered)
  const targetScore = scoreTargetLikelihood(position, allCoordinates);
  if (targetScore.score > 0) scores.push(targetScore);

  // Score flipper (bottom corners, paired)
  const flipperScore = scoreFlipperLikelihood(position, allCoordinates);
  if (flipperScore.score > 0) scores.push(flipperScore);

  // Score ramp (diagonal path)
  const rampScore = scoreRampLikelihood(position, allCoordinates);
  if (rampScore.score > 0) scores.push(rampScore);

  // Score wall (edge position)
  const wallScore = scoreWallLikelihood(position, allCoordinates);
  if (wallScore.score > 0) scores.push(wallScore);

  // Score slingshot (corner position, pair)
  const slingScore = scoreSlingLikelihood(position, allCoordinates);
  if (slingScore.score > 0) scores.push(slingScore);

  // Score spinner (isolated center position)
  const spinnerScore = scoreSpinnerLikelihood(position, allCoordinates);
  if (spinnerScore.score > 0) scores.push(spinnerScore);

  // Check script functions for hints
  if (scriptFunctions) {
    const scriptHints = getTypeFromScriptFunctions(index, scriptFunctions);
    if (scriptHints) scores.push(scriptHints);
  }

  // Return highest scoring classification
  scores.sort((a, b) => b.score - a.score);
  return scores.length > 0 ? scores[0] : { type: 'bumper', score: 0.5, confidence: 0.3 };
}

// ─── Classification Scoring Functions ──────────────────────────────────────

function scoreBumperLikelihood(
  position: { x: number; y: number },
  coordinates: Array<{ x: number; y: number }>
): ElementClassificationScore {
  let score = 0;
  let confidence = 0;

  // Bumpers in upper field (y > 1.5)
  if (position.y > 1.5) score += 0.3;

  // Bumpers tend to cluster (within 0.5 units of neighbors)
  const neighbors = coordinates.filter(
    c => Math.abs(c.x - position.x) < 0.5 && Math.abs(c.y - position.y) < 0.5 && c !== position
  );
  if (neighbors.length > 0) {
    score += 0.3;
    confidence += 0.2;
  }

  // Center-relative position (bumpers often centered)
  if (Math.abs(position.x) < 1.5) score += 0.2;

  // Not at extreme edges
  if (Math.abs(position.x) < 2.5 && position.y < 5.0) confidence += 0.3;

  return { type: 'bumper', score, confidence };
}

function scoreTargetLikelihood(
  position: { x: number; y: number },
  coordinates: Array<{ x: number; y: number }>
): ElementClassificationScore {
  let score = 0;
  let confidence = 0;

  // Targets on right/left side (|x| > 1.2)
  if (Math.abs(position.x) > 1.2) {
    score += 0.4;
    confidence += 0.3;
  }

  // Targets scattered (not clustered)
  const nearNeighbors = coordinates.filter(
    c => Math.abs(c.x - position.x) < 0.3 && Math.abs(c.y - position.y) < 0.3
  ).length;
  if (nearNeighbors < 2) score += 0.2;

  // Middle field (1 < y < 4)
  if (position.y > 1.0 && position.y < 4.0) score += 0.2;

  confidence += 0.4;

  return { type: 'target', score, confidence };
}

function scoreFlipperLikelihood(
  position: { x: number; y: number },
  coordinates: Array<{ x: number; y: number }>
): ElementClassificationScore {
  let score = 0;
  let confidence = 0;

  // Flippers at bottom (y < -1.0)
  if (position.y < -1.0) {
    score += 0.4;
    confidence += 0.4;
  }

  // Flippers on sides (|x| > 0.8)
  if (Math.abs(position.x) > 0.8) score += 0.2;

  // Look for flipper pair (two elements close in Y, separated in X)
  const lateralPartner = coordinates.find(
    c => Math.abs(c.y - position.y) < 0.3 && Math.abs(c.x - position.x) > 0.5
  );
  if (lateralPartner) {
    score += 0.3;
    confidence += 0.2;
  }

  return { type: 'flipper', score, confidence };
}

function scoreRampLikelihood(
  position: { x: number; y: number },
  coordinates: Array<{ x: number; y: number }>
): ElementClassificationScore {
  let score = 0;
  let confidence = 0;

  // Ramps typically diagonal (varied x and y)
  const maxY = Math.max(...coordinates.map(c => c.y));
  const minY = Math.min(...coordinates.map(c => c.y));
  const rangeY = maxY - minY;

  if (rangeY > 2.0) {
    // Check if this position is part of a diagonal line
    const onDiagonal = coordinates.some(
      c => Math.abs(c.x - position.x + 0.3 * (c.y - position.y)) < 0.5 && c !== position
    );
    if (onDiagonal) {
      score += 0.4;
      confidence += 0.3;
    }
  }

  return { type: 'ramp', score, confidence };
}

function scoreWallLikelihood(
  position: { x: number; y: number },
  coordinates: Array<{ x: number; y: number }>
): ElementClassificationScore {
  let score = 0;
  let confidence = 0;

  // Walls at edges (|x| > 2.0)
  if (Math.abs(position.x) > 2.0) {
    score += 0.3;
    confidence += 0.3;
  }

  // Walls form lines (linear arrangement)
  const onLine = coordinates.some(
    c => (Math.abs(c.x - position.x) < 0.1 || Math.abs(c.y - position.y) < 0.1) && c !== position
  );
  if (onLine) {
    score += 0.3;
    confidence += 0.3;
  }

  return { type: 'wall', score, confidence };
}

function scoreSlingLikelihood(
  position: { x: number; y: number },
  coordinates: Array<{ x: number; y: number }>
): ElementClassificationScore {
  let score = 0;
  let confidence = 0;

  // Slings in bottom corners
  if (position.y < -0.5 && Math.abs(position.x) > 1.5) {
    score += 0.3;
    confidence += 0.3;
  }

  // Look for sling pair
  const slingPair = coordinates.find(c => Math.abs(c.x + position.x) < 0.3 && Math.abs(c.y - position.y) < 0.3);
  if (slingPair) {
    score += 0.3;
    confidence += 0.2;
  }

  return { type: 'slingshot', score, confidence };
}

function scoreSpinnerLikelihood(
  position: { x: number; y: number },
  coordinates: Array<{ x: number; y: number }>
): ElementClassificationScore {
  let score = 0;
  let confidence = 0;

  // Spinners isolated (no close neighbors)
  const hasNeighbors = coordinates.some(
    c => Math.abs(c.x - position.x) < 0.4 && Math.abs(c.y - position.y) < 0.4 && c !== position
  );
  if (!hasNeighbors) score += 0.2;

  // Center position
  if (Math.abs(position.x) < 0.8 && position.y > 1.0 && position.y < 3.0) {
    score += 0.2;
    confidence += 0.3;
  }

  return { type: 'spinner', score, confidence };
}

function getTypeFromScriptFunctions(
  elementIndex: number,
  scriptFunctions: string[]
): ElementClassificationScore | null {
  const elementFunctions = scriptFunctions.filter(
    f => f.toLowerCase().includes(`_${elementIndex}`) || f.toLowerCase().endsWith(`${elementIndex}()`)
  );

  if (elementFunctions.length === 0) return null;

  // Check function names for type hints
  for (const func of elementFunctions) {
    const lower = func.toLowerCase();
    if (lower.includes('bumper')) return { type: 'bumper', score: 0.9, confidence: 0.8 };
    if (lower.includes('target')) return { type: 'target', score: 0.9, confidence: 0.8 };
    if (lower.includes('flipper')) return { type: 'flipper', score: 0.9, confidence: 0.8 };
    if (lower.includes('ramp')) return { type: 'ramp', score: 0.9, confidence: 0.8 };
  }

  return null;
}

// ─── Property Extraction ───────────────────────────────────────────────────

/**
 * Extract physics properties for element
 */
function extractElementPhysics(elementIndex: number, physicsData?: Map<string, any>) {
  const basePhysics = {
    mass: 0, // Most elements are static
    restitution: 0.8,
    friction: 0.5,
    maxVelocity: 10.0,
    gravityScale: 1.0,
  };

  if (!physicsData) return basePhysics;

  const key = `element_${elementIndex}`;
  if (physicsData.has(key)) {
    return { ...basePhysics, ...physicsData.get(key) };
  }

  return basePhysics;
}

/**
 * Extract behavior properties for element
 */
function extractElementBehavior(elementIndex: number, type: ElementType, scriptFunctions?: string[]) {
  const baseBehavior = {
    scoreValue: getDefaultScoreForType(type),
    triggerMultiplier: true,
    canMultiball: type === 'bumper',
    canExtraBall: type === 'target',
  };

  // Check script for scoring hints
  if (scriptFunctions) {
    const hitFunctions = scriptFunctions.filter(f => f.includes('Hit'));
    if (hitFunctions.length > elementIndex) {
      baseBehavior.scoreValue = 100 * (elementIndex + 1); // Rough estimate
    }
  }

  return baseBehavior;
}

/**
 * Extract ramp-specific data
 */
function extractRampData(
  position: { x: number; y: number },
  coordinates: Array<{ x: number; y: number }>
) {
  // Find ramp trajectory points
  const trajectoryPoints: Array<{ x: number; y: number }> = [position];

  // Look for points on similar trajectory
  const slope = 0.2; // Approximate ramp slope
  for (const coord of coordinates) {
    if (
      coord !== position &&
      Math.abs((coord.y - position.y) - slope * (coord.x - position.x)) < 0.5
    ) {
      trajectoryPoints.push(coord);
    }
  }

  return {
    endPosition: trajectoryPoints.length > 1 ? trajectoryPoints[trajectoryPoints.length - 1] : undefined,
    trajectoryPoints: trajectoryPoints.sort((a, b) => a.y - b.y),
    difficulty: 'medium' as const,
  };
}

/**
 * Extract flipper-specific data
 */
function extractFlipperData(
  position: { x: number; y: number },
  coordinates: Array<{ x: number; y: number }>
) {
  // Determine if left or right flipper
  const isLeft = position.x < 0;

  // Default flipper angles (rest 0°, active 60°)
  return {
    strength: 1.0,
    angle: 0,
    activeAngle: 60,
    isLeft,
  };
}

// ─── Utility Functions ────────────────────────────────────────────────────

function getDefaultColorForType(type: ElementType): number {
  switch (type) {
    case 'bumper':
      return 0xff2200; // Red
    case 'target':
      return 0x00aaff; // Blue
    case 'flipper':
      return 0xffaa00; // Orange
    case 'ramp':
      return 0xff00cc; // Magenta
    case 'wall':
      return 0x888888; // Gray
    case 'slingshot':
      return 0xff0088; // Pink
    case 'spinner':
      return 0x00ff88; // Green
    default:
      return 0xffffff; // White
  }
}

function getMaterialForType(type: ElementType): string {
  switch (type) {
    case 'bumper':
      return 'rubber';
    case 'target':
      return 'plastic';
    case 'flipper':
      return 'rubber';
    case 'ramp':
      return 'plastic';
    case 'wall':
      return 'wood';
    default:
      return 'composite';
  }
}

function getDefaultScoreForType(type: ElementType): number {
  switch (type) {
    case 'bumper':
      return 100;
    case 'target':
      return 150;
    case 'ramp':
      return 500;
    case 'slingshot':
      return 300;
    case 'spinner':
      return 250;
    default:
      return 50;
  }
}

/**
 * Validate extracted elements
 */
export function validateExtractedElements(elements: GameElement[]): {
  valid: number;
  invalid: number;
  warnings: string[];
} {
  const warnings: string[] = [];
  let valid = 0;
  let invalid = 0;

  for (const element of elements) {
    const errors: string[] = [];

    if (!Number.isFinite(element.position.x) || !Number.isFinite(element.position.y)) {
      errors.push('Invalid position');
    }

    if (element.visual.color < 0 || element.visual.color > 0xffffff) {
      errors.push('Invalid color');
    }

    if (errors.length === 0) {
      valid++;
    } else {
      invalid++;
      warnings.push(`Element ${element.id}: ${errors.join('; ')}`);
    }
  }

  return { valid, invalid, warnings };
}

/**
 * Generate element summary
 */
export function summarizeElements(elements: GameElement[]): string {
  const typeCounts = new Map<ElementType, number>();

  for (const elem of elements) {
    typeCounts.set(elem.type, (typeCounts.get(elem.type) || 0) + 1);
  }

  let summary = `Extracted ${elements.length} elements:\n`;
  for (const [type, count] of typeCounts) {
    summary += `  ${type}: ${count}\n`;
  }

  return summary;
}
