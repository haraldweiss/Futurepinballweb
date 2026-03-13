/**
 * enhanced-fpt-parser.ts — Main orchestration pipeline for comprehensive FPT extraction
 * Coordinates all extraction modules to produce complete ExtendedFPTData
 */

import { ExtendedFPTData, ExtractionOptions } from './enhanced-fpt-types';
import { extractPlayfieldSettings, validatePlayfieldSettings, summarizePlayfieldSettings } from './playfield-extractor';
import { extractDetailedLights, validateExtractedLights, summarizeLights } from './light-extractor';
import { extractGameElements, validateExtractedElements, summarizeElements } from './object-property-extractor';
import { extractEnhancedPhysicsData, extractMaterialPhysics, extractCollisionGroups, extractVelocityProfile, summarizePhysicsExtraction } from './physics-parameters-extractor';
import { extractEventBindings, extractScoringRules, extractTriggerConditions, extractAnimationTriggers, validateEventBindings, summarizeScriptExtraction } from './script-data-extractor';
import { extractMaterials, mapElementsToMaterials, validateMaterials, summarizeMaterials } from './material-extractor';
import { extractDetailedKeyframes, buildAnimationSequence, synchronizeAnimationsWithEvents, validateKeyframes, summarizeAnimations } from './animation-keyframe-extractor';

// ─── Main Extraction Pipeline ──────────────────────────────────────────────

/**
 * Main entry point: Extract comprehensive FPT data
 * Orchestrates all extraction modules with error handling and logging
 */
export async function extractEnhancedFPTData(
  buffer: ArrayBuffer,
  coordinates?: Array<{ x: number; y: number }>,
  colors?: Map<number, number>,
  scriptCode?: string,
  textures?: Map<string, any>,
  animationData?: Map<string, any>,
  options?: ExtractionOptions
): Promise<ExtendedFPTData | null> {
  const startTime = performance.now();
  const bytes = new Uint8Array(buffer);
  const log = options?.logExtraction || console.log;

  try {
    log('🚀 Starting enhanced FPT extraction...');

    // ─── Phase 1: Playfield Settings ──────────────────────────────────────
    log('📊 Extracting playfield settings...');
    const playfield = extractPlayfieldSettings(bytes);
    const playfieldValidation = validatePlayfieldSettings(playfield);

    if (!playfieldValidation.isValid) {
      log(`⚠️  Playfield validation warnings: ${playfieldValidation.errors.join(', ')}`);
    }
    log(`✅ Playfield settings: gravity=${playfield.gravity.toFixed(2)} m/s², friction=${playfield.friction.toFixed(2)}`);

    // Refine with coordinates if available
    if (coordinates && coordinates.length > 0) {
      const refined = refinePlayfieldWithCoordinates(playfield, coordinates);
      Object.assign(playfield, refined);
      log(`📍 Refined playfield with ${coordinates.length} coordinates`);
    }

    // ─── Phase 2: Game Elements ───────────────────────────────────────────
    log('🎮 Classifying game elements...');
    let elements: any[] = [];
    if (coordinates && coordinates.length > 0) {
      const scriptFunctions = scriptCode ? extractScriptFunctionNames(scriptCode) : undefined;
      elements = extractGameElements(coordinates, undefined, colors, scriptFunctions);
      const elementValidation = validateExtractedElements(elements);
      log(`✅ ${elementValidation.valid} valid elements, ${elementValidation.invalid} invalid`);
      if (elementValidation.warnings.length > 0) {
        log(`⚠️  Element warnings: ${elementValidation.warnings.slice(0, 3).join('; ')}`);
      }
    }

    // ─── Phase 3: Detailed Lights ─────────────────────────────────────────
    log('💡 Extracting light definitions...');
    const lights = extractDetailedLights(buffer, coordinates);
    const lightValidation = validateExtractedLights(lights);
    log(`✅ ${lights.length} lights extracted (${lightValidation.valid} valid)`);

    // ─── Phase 4: Physics Parameters ───────────────────────────────────────
    log('⚙️  Extracting physics parameters...');
    const physicsMap = extractEnhancedPhysicsData(bytes, elements.length);
    applyPhysicsToElements(elements, physicsMap);
    log(`✅ Physics applied to ${physicsMap.size} element(s)`);

    // Extract collision groups and velocity profiles
    const collisionGroups = extractCollisionGroups(bytes, elements.length);
    const velocityProfile = extractVelocityProfile(bytes);
    log(`✅ ${collisionGroups.length} collision group(s) configured`);

    // ─── Phase 5: Materials ────────────────────────────────────────────────
    log('🎨 Extracting material definitions...');
    const materialDefinitions = extractMaterials(buffer, textures);
    const materialPhysics = extractMaterialPhysics(bytes);

    // Merge material definitions
    for (const [name, material] of materialPhysics) {
      if (!materialDefinitions.has(name)) {
        materialDefinitions.set(name, material);
      }
    }

    // Map elements to materials
    const elementMaterialMap = mapElementsToMaterials(elements, materialDefinitions);
    applyMaterialsToElements(elements, elementMaterialMap, materialDefinitions);

    const materialValidation = validateMaterials(materialDefinitions);
    log(`✅ ${materialValidation.valid} valid materials`);

    // ─── Phase 6: Script Data (Events, Scoring) ───────────────────────────
    log('📝 Extracting script data...');
    const eventBindings = scriptCode ? extractEventBindings(scriptCode) : [];
    const scoringRules = scriptCode ? extractScoringRules(scriptCode) : [];
    const triggerConditions = scriptCode ? extractTriggerConditions(scriptCode) : [];
    const animTriggerMap = scriptCode ? extractAnimationTriggers(scriptCode) : new Map();

    const bindingValidation = validateEventBindings(eventBindings);
    log(`✅ ${bindingValidation.valid} event binding(s), ${scoringRules.length} scoring rule(s)`);

    // ─── Phase 7: Animations ──────────────────────────────────────────────
    log('🎬 Extracting animations...');
    const animations = new Map<string, any>();

    if (animationData) {
      for (const [name, data] of animationData) {
        const keyframes = extractDetailedKeyframes(data);
        if (keyframes.length > 0) {
          const keyframeValidation = validateKeyframes(keyframes);

          // Find trigger for this animation
          const triggers = animTriggerMap.get(name);
          const triggerEvent = triggers && triggers.length > 0 ? triggers[0] : undefined;

          const sequence = buildAnimationSequence(name, name, keyframes, {
            loop: false,
            triggeredBy: undefined,
            triggerEvent: triggerEvent as any,
          });

          animations.set(name, sequence);
        }
      }
    }

    // Synchronize animations with events
    synchronizeAnimationsWithEvents(animations, eventBindings);
    log(`✅ ${animations.size} animation(s) configured`);

    // ─── Assembly: Create ExtendedFPTData ──────────────────────────────────
    log('📦 Assembling complete FPT data structure...');

    const extendedData: ExtendedFPTData = {
      playfield,
      elements,
      lights,
      materials: materialDefinitions,
      collisionGroups,
      eventBindings,
      scoringRules,
      animations,

      tableMetadata: {
        difficulty: calculateTableDifficulty(elements.length, scoringRules.length),
      },

      quality: {
        gravityConfidence: playfieldValidation.confidence,
        physicsConfidence: 0.7, // Default confidence
        elementClassificationConfidence: 0.75,
        completeness: calculateCompleteness(elements, lights, eventBindings, animations),
        warnings: [
          ...playfieldValidation.warnings,
          ...lightValidation.warnings,
          ...elementValidation.warnings || [],
          ...bindingValidation.warnings,
          ...materialValidation.warnings,
        ].slice(0, 10), // Keep first 10 warnings
      },
    };

    // ─── Final Logging & Summary ──────────────────────────────────────────
    const duration = performance.now() - startTime;
    log(`\n✨ Extraction complete in ${duration.toFixed(0)}ms`);
    log(`\n${generateExtractedDataSummary(extendedData)}`);

    return extendedData;
  } catch (error: any) {
    log(`❌ Extraction failed: ${error.message}`);
    console.error(error);
    return null;
  }
}

// ─── Helper Functions ──────────────────────────────────────────────────────

/**
 * Extract script function names for element classification hints
 */
function extractScriptFunctionNames(scriptCode: string): string[] {
  const functions: string[] = [];
  const regex = /Sub\s+(\w+)\s*\(/gi;
  let match;

  while ((match = regex.exec(scriptCode)) !== null) {
    functions.push(match[1]);
  }

  return functions;
}

/**
 * Refine playfield settings using coordinate bounds
 */
function refinePlayfieldWithCoordinates(
  playfield: any,
  coordinates: Array<{ x: number; y: number }>
): Partial<any> {
  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;

  for (const coord of coordinates) {
    minX = Math.min(minX, coord.x);
    maxX = Math.max(maxX, coord.x);
    minY = Math.min(minY, coord.y);
    maxY = Math.max(maxY, coord.y);
  }

  const boundWidth = maxX - minX;
  const boundHeight = maxY - minY;

  return {
    width: Math.max(playfield.width, boundWidth * 500),
    height: Math.max(playfield.height, boundHeight * 750),
  };
}

/**
 * Apply physics to elements
 */
function applyPhysicsToElements(elements: any[], physicsMap: Map<string, any>): void {
  for (const element of elements) {
    const physics = physicsMap.get(element.id);
    if (physics) {
      element.physics = { ...element.physics, ...physics };
    }
  }
}

/**
 * Apply materials to elements
 */
function applyMaterialsToElements(
  elements: any[],
  materialMap: Map<string, string>,
  materials: Map<string, any>
): void {
  for (const element of elements) {
    const materialName = materialMap.get(element.id);
    if (materialName && materials.has(materialName)) {
      element.visual.material = materialName;
      const materialDef = materials.get(materialName);
      if (materialDef) {
        element.physics.friction = materialDef.surfaceProperties.friction;
        element.physics.restitution = materialDef.surfaceProperties.restitution;
      }
    }
  }
}

/**
 * Calculate table difficulty (1-10)
 */
function calculateTableDifficulty(elementCount: number, ruleCount: number): number {
  // More elements and complex rules = higher difficulty
  const score = Math.min(10, Math.floor((elementCount / 5 + ruleCount / 10) / 2) + 3);
  return Math.max(1, Math.min(10, score));
}

/**
 * Calculate extraction completeness percentage
 */
function calculateCompleteness(
  elements: any[],
  lights: any[],
  events: any[],
  animations: Map<string, any>
): number {
  const maxScore = 5;
  let score = 0;

  if (elements.length > 5) score++;
  if (lights.length > 10) score++;
  if (events.length > 5) score++;
  if (animations.size > 3) score++;
  score++; // Playfield always counted

  return (score / maxScore) * 100;
}

/**
 * Generate summary of extracted data
 */
function generateExtractedDataSummary(data: ExtendedFPTData): string {
  return `
═══ FPT EXTRACTION SUMMARY ═══
📊 Playfield: ${data.playfield.width.toFixed(0)}×${data.playfield.height.toFixed(0)} | Gravity: ${data.playfield.gravity.toFixed(2)}
🎮 Elements: ${data.elements.length}
  ${data.elements.filter(e => e.type === 'bumper').length} bumpers, ${data.elements.filter(e => e.type === 'target').length} targets, ${data.elements.filter(e => e.type === 'flipper').length} flippers
💡 Lights: ${data.lights.length}
🎨 Materials: ${data.materials.size}
🔗 Event Bindings: ${data.eventBindings.length}
🎯 Scoring Rules: ${data.scoringRules.length}
🎬 Animations: ${data.animations.size}
📈 Completeness: ${data.quality.completeness.toFixed(0)}%
`;
}

// ─── Export Utilities ──────────────────────────────────────────────────────

/**
 * Get human-readable extraction report
 */
export function getExtractionReport(data: ExtendedFPTData): string {
  let report = `\n╔═══ EXTENDED FPT DATA EXTRACTION REPORT ═══╗\n`;

  report += `\n📊 PLAYFIELD SETTINGS:\n`;
  report += `   ${summarizePlayfieldSettings(data.playfield)}\n`;

  report += `\n🎮 GAME ELEMENTS:\n`;
  report += `   ${summarizeElements(data.elements)}\n`;

  report += `\n💡 LIGHTING:\n`;
  report += `   ${summarizeLights(data.lights)}\n`;

  report += `\n⚙️  PHYSICS:\n`;
  report += `   ${summarizePhysicsExtraction(new Map())}\n`;

  report += `\n🎨 MATERIALS:\n`;
  report += `   ${summarizeMaterials(data.materials)}\n`;

  report += `\n📝 SCRIPT DATA:\n`;
  report += `   ${summarizeScriptExtraction(data.eventBindings, data.scoringRules, [])}\n`;

  report += `\n🎬 ANIMATIONS:\n`;
  report += `   ${summarizeAnimations(data.animations)}\n`;

  report += `\n📈 QUALITY METRICS:\n`;
  report += `   Gravity Confidence: ${(data.quality.gravityConfidence * 100).toFixed(0)}%\n`;
  report += `   Physics Confidence: ${(data.quality.physicsConfidence * 100).toFixed(0)}%\n`;
  report += `   Element Classification: ${(data.quality.elementClassificationConfidence * 100).toFixed(0)}%\n`;
  report += `   Overall Completeness: ${data.quality.completeness.toFixed(0)}%\n`;

  if (data.quality.warnings.length > 0) {
    report += `\n⚠️  WARNINGS (${data.quality.warnings.length}):\n`;
    for (const warning of data.quality.warnings.slice(0, 5)) {
      report += `   • ${warning}\n`;
    }
  }

  report += `\n╚════════════════════════════════════════════╝\n`;
  return report;
}
