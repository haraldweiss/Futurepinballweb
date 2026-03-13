/**
 * table-builder-enhanced.ts — Integrate ExtendedFPTData with existing table building
 * Convert extracted data to TableConfig format compatible with game engine
 */

import { ExtendedFPTData, GameElement } from './enhanced-fpt-types';

// ─── Interface ───────────────────────────────────────────────────────────

/**
 * Enhanced table configuration with all extracted data
 */
export interface EnhancedTableConfig extends Record<string, any> {
  name: string;
  bumpers: any[];
  targets: any[];
  ramps: any[];
  flipper?: any;
  bumperSizes?: number[];
  walls?: any[];
  slingshots?: any[];
  playfield?: any;
  lightConfigs?: any[];
  materialsMap?: Map<string, any>;
  eventBindings?: any[];
  scoringRules?: any[];
  animationMap?: Map<string, any>;
  physicsProfile?: any;
  quality?: any;
}

// ─── Core Integration ──────────────────────────────────────────────────────

/**
 * Convert ExtendedFPTData to TableConfig
 */
export function buildTableConfigFromExtendedData(
  extendedData: ExtendedFPTData,
  tableName: string,
  existingConfig?: EnhancedTableConfig
): EnhancedTableConfig {
  const config: EnhancedTableConfig = existingConfig || {
    name: tableName,
    bumpers: [],
    targets: [],
    ramps: [],
  };

  // Apply playfield settings
  applyPlayfieldPhysics(config, extendedData.playfield);

  // Organize elements by type
  const elementsByType = organizeElementsByType(extendedData.elements);

  // Build bumpers
  config.bumpers = buildBumperConfigs(elementsByType.bumper || []);
  config.bumperSizes = calculateBumperSizes(config.bumpers);

  // Build targets
  config.targets = buildTargetConfigs(elementsByType.target || []);

  // Build ramps
  config.ramps = buildRampConfigs(elementsByType.ramp || []);

  // Build flippers
  if (elementsByType.flipper && elementsByType.flipper.length > 0) {
    config.flipper = buildFlipperConfig(elementsByType.flipper);
  }

  // Build walls
  if (elementsByType.wall && elementsByType.wall.length > 0) {
    config.walls = buildWallConfigs(elementsByType.wall);
  }

  // Build slingshots
  if (elementsByType.slingshot && elementsByType.slingshot.length > 0) {
    config.slingshots = buildSlingshotConfigs(elementsByType.slingshot);
  }

  // Add light configurations
  config.lightConfigs = convertLightsToThreeJs(extendedData.lights);

  // Store materials
  config.materialsMap = extendedData.materials;

  // Store event bindings
  config.eventBindings = extendedData.eventBindings;

  // Store scoring rules
  config.scoringRules = extendedData.scoringRules;

  // Store animations
  config.animationMap = extendedData.animations;

  // Store physics profile
  config.physicsProfile = {
    gravity: extendedData.playfield.gravity,
    friction: extendedData.playfield.friction,
    collisionGroups: extendedData.collisionGroups,
  };

  // Store quality metrics
  config.quality = extendedData.quality;

  return config;
}

// ─── Element Building Functions ────────────────────────────────────────────

/**
 * Organize elements by type
 */
function organizeElementsByType(elements: GameElement[]): Record<string, GameElement[]> {
  const organized: Record<string, GameElement[]> = {};

  for (const element of elements) {
    if (!organized[element.type]) {
      organized[element.type] = [];
    }
    organized[element.type].push(element);
  }

  return organized;
}

/**
 * Build bumper configurations
 */
function buildBumperConfigs(bumperElements: GameElement[]): any[] {
  return bumperElements.map((elem, i) => ({
    x: elem.position.x,
    y: elem.position.y,
    color: elem.visual.color,
    size: elem.scale || 1.0,
    physics: elem.physics,
    scoreValue: elem.behavior.scoreValue,
    material: elem.visual.material,
    light: elem.visual.lightConfig,
  }));
}

/**
 * Build target configurations
 */
function buildTargetConfigs(targetElements: GameElement[]): any[] {
  return targetElements.map(elem => ({
    x: elem.position.x,
    y: elem.position.y,
    color: elem.visual.color,
    physics: elem.physics,
    scoreValue: elem.behavior.scoreValue,
    material: elem.visual.material,
    isProgressiveTarget: elem.behavior.isProgressiveTarget,
  }));
}

/**
 * Build ramp configurations
 */
function buildRampConfigs(rampElements: GameElement[]): any[] {
  return rampElements.map(elem => ({
    x: elem.position.x,
    y: elem.position.y,
    endX: elem.rampData?.endPosition?.x || elem.position.x + 0.5,
    endY: elem.rampData?.endPosition?.y || elem.position.y + 2.0,
    trajectoryPoints: elem.rampData?.trajectoryPoints,
    physics: elem.physics,
    scoreValue: elem.rampData?.shotValue || 500,
    material: elem.visual.material,
    difficulty: elem.rampData?.difficulty,
  }));
}

/**
 * Build flipper configuration
 */
function buildFlipperConfig(flipperElements: GameElement[]): any {
  // Typically assume 2 flippers (left and right)
  const leftFlipper = flipperElements.find(f => f.flipperData?.isLeft);
  const rightFlipper = flipperElements.find(f => !f.flipperData?.isLeft);

  return {
    left: leftFlipper ? {
      x: leftFlipper.position.x,
      y: leftFlipper.position.y,
      strength: leftFlipper.flipperData?.strength || 1.0,
      angle: leftFlipper.flipperData?.angle || 0,
      activeAngle: leftFlipper.flipperData?.activeAngle || 60,
      physics: leftFlipper.physics,
    } : undefined,

    right: rightFlipper ? {
      x: rightFlipper.position.x,
      y: rightFlipper.position.y,
      strength: rightFlipper.flipperData?.strength || 1.0,
      angle: rightFlipper.flipperData?.angle || 0,
      activeAngle: rightFlipper.flipperData?.activeAngle || 60,
      physics: rightFlipper.physics,
    } : undefined,
  };
}

/**
 * Build wall configurations
 */
function buildWallConfigs(wallElements: GameElement[]): any[] {
  return wallElements.map(elem => ({
    position: elem.position,
    points: elem.wallData?.points || [elem.position],
    physics: elem.physics,
    isVisible: elem.wallData?.isVisible !== false,
    material: elem.visual.material,
  }));
}

/**
 * Build slingshot configurations
 */
function buildSlingshotConfigs(slingshotElements: GameElement[]): any[] {
  return slingshotElements.map(elem => ({
    x: elem.position.x,
    y: elem.position.y,
    physics: elem.physics,
    scoreValue: elem.behavior.scoreValue,
    material: elem.visual.material,
  }));
}

/**
 * Calculate bumper sizes for clustering
 */
function calculateBumperSizes(bumpers: any[]): number[] {
  // Group bumpers by proximity
  const sizes: number[] = [];

  for (const bumper of bumpers) {
    let nearbyCount = 0;
    for (const other of bumpers) {
      const dist = Math.sqrt(
        Math.pow(bumper.x - other.x, 2) +
        Math.pow(bumper.y - other.y, 2)
      );
      if (dist < 0.8) nearbyCount++;
    }

    // Size based on cluster density
    const size = Math.max(0.8, Math.min(1.2, 1.0 + nearbyCount * 0.05));
    sizes.push(size);
  }

  return sizes;
}

// ─── Physics Application ──────────────────────────────────────────────────

/**
 * Apply playfield physics to table config
 */
function applyPlayfieldPhysics(config: EnhancedTableConfig, playfield: any): void {
  config.gravity = playfield.gravity;
  config.friction = playfield.friction;
  config.ballRadius = playfield.ballRadius;
  config.tiltSensitivity = playfield.tiltSensitivity;
  config.drainTimeout = playfield.drainTimeout;
  config.dampening = playfield.dampening;
}

/**
 * Configure per-element physics behaviors
 */
export function configureElementPhysics(config: EnhancedTableConfig, physicsProfile: any): void {
  if (!config.bumpers || !physicsProfile) return;

  for (const bumper of config.bumpers) {
    if (physicsProfile.globalBumperPhysics) {
      bumper.physics = {
        ...bumper.physics,
        ...physicsProfile.globalBumperPhysics,
      };
    }
  }

  // Similar for targets, ramps, etc.
  if (config.targets) {
    for (const target of config.targets) {
      if (physicsProfile.globalTargetPhysics) {
        target.physics = {
          ...target.physics,
          ...physicsProfile.globalTargetPhysics,
        };
      }
    }
  }
}

// ─── Light Integration ────────────────────────────────────────────────────

/**
 * Convert detailed lights to Three.js light configurations
 */
function convertLightsToThreeJs(lights: any[]): any[] {
  return lights.map(light => ({
    type: 'point',
    position: [light.position.x, light.position.z || 1.5, light.position.y],
    color: `rgb(${Math.floor(light.color.r * 255)}, ${Math.floor(light.color.g * 255)}, ${Math.floor(light.color.b * 255)})`,
    intensity: light.intensity,
    distance: light.falloffDistance,
    decay: light.falloffType === 'quadratic' ? 2 : 1,
    castShadow: false,
    behavior: light.behavior,
    behaviorRate: light.behaviorRate,
  }));
}

// ─── Event & Animation Integration ────────────────────────────────────────

/**
 * Register event bindings with script engine
 */
export function registerEventBindingsWithScriptEngine(
  config: EnhancedTableConfig,
  scriptEngine: any
): void {
  if (!config.eventBindings) return;

  for (const binding of config.eventBindings) {
    // Register binding with script engine
    if (scriptEngine.registerEventBinding) {
      scriptEngine.registerEventBinding(binding.elementId, binding.eventType, binding.scriptFunction);
    }
  }
}

/**
 * Setup animation event triggers
 */
export function setupAnimationTriggers(
  config: EnhancedTableConfig,
  animationEngine: any
): void {
  if (!config.animationMap) return;

  for (const [animName, animation] of config.animationMap) {
    if (animation.triggeredBy && animation.triggerEvent) {
      if (animationEngine.registerAnimationTrigger) {
        animationEngine.registerAnimationTrigger(
          animation.triggeredBy,
          animation.triggerEvent,
          animName
        );
      }
    }
  }
}

// ─── Validation & Quality Checks ──────────────────────────────────────────

/**
 * Validate integrated table configuration
 */
export function validateEnhancedTableConfig(config: EnhancedTableConfig): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!config.name) errors.push('Missing table name');
  if (!config.bumpers || config.bumpers.length === 0) warnings.push('No bumpers configured');
  if (!config.flipper) warnings.push('No flippers configured');

  if (config.gravity && (config.gravity < 5 || config.gravity > 15)) {
    warnings.push(`Unusual gravity: ${config.gravity}`);
  }

  // Check for reasonable bumper count
  if (config.bumpers && config.bumpers.length > 20) {
    warnings.push('Unusually high bumper count');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Generate integration summary
 */
export function summarizeTableIntegration(config: EnhancedTableConfig): string {
  return `
═══ TABLE INTEGRATION SUMMARY ═══
🎮 Table: ${config.name}
📊 Physics: gravity=${config.gravity?.toFixed(2)}m/s², friction=${config.friction?.toFixed(2)}
🎯 Elements:
   ${config.bumpers?.length || 0} bumpers
   ${config.targets?.length || 0} targets
   ${config.ramps?.length || 0} ramps
   ${config.flipper ? 'Flippers configured' : 'No flippers'}
💡 Lights: ${config.lightConfigs?.length || 0}
🎨 Materials: ${config.materialsMap?.size || 0}
🔗 Event Bindings: ${config.eventBindings?.length || 0}
🎬 Animations: ${config.animationMap?.size || 0}
`;
}

// ─── Export for Table Building System ──────────────────────────────────────

/**
 * Get standard table config compatible with existing game engine
 * Converts enhanced data back to familiar format
 */
export function getCompatibleTableConfig(config: EnhancedTableConfig): Record<string, any> {
  return {
    name: config.name,
    bumpers: config.bumpers || [],
    targets: config.targets || [],
    ramps: config.ramps || [],
    flipper: config.flipper,
    tableColor: 0x1a4a15,
    playfield: config.playfield,
    physics: {
      gravity: config.gravity,
      friction: config.friction,
    },
    // Extended data available via config.quality, config.eventBindings, etc.
  };
}
