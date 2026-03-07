/**
 * Material Group System — Newton-style Material Interactions
 *
 * Implements physics properties based on material pair interactions.
 * Different materials (ball, bumper, flipper, ramp, wall, etc.) have
 * different friction and restitution values when they interact.
 *
 * Based on Newton Game Engine material pair system.
 */

// Note: RAPIER types used in this file (RAPIER.ColliderDesc)
// These are for type hints only; actual Rapier usage happens in main.ts

/**
 * Material types in the game
 */
export enum MaterialType {
  BALL = 'ball',
  BUMPER = 'bumper',
  FLIPPER = 'flipper',
  RAMP = 'ramp',
  WALL = 'wall',
  DRAIN = 'drain',
  TARGET = 'target',
  SLINGSHOT = 'slingshot',
  PLASTIC = 'plastic',
}

/**
 * Physics properties for a single material
 */
export interface MaterialDefinition {
  id: MaterialType | string;
  name: string;
  friction: number;          // 0.0-1.0, higher = more friction
  restitution: number;       // 0.0-1.0, higher = more bouncy
  density?: number;          // For mass calculations
  color?: number;            // Hex color for visual feedback
  description?: string;
}

/**
 * Interaction properties between two materials
 */
export interface MaterialInteraction {
  material1: MaterialType | string;
  material2: MaterialType | string;
  friction: number;          // 0.0-1.0
  restitution: number;       // 0.0-1.0
  description?: string;
}

/**
 * Material definitions - base properties for each material type
 */
export const MATERIAL_DEFINITIONS: Record<string, MaterialDefinition> = {
  [MaterialType.BALL]: {
    id: MaterialType.BALL,
    name: 'Ball',
    friction: 0.1,
    restitution: 0.8,
    density: 1.0,
    color: 0xffffff,
    description: 'Pinball - smooth, bouncy',
  },

  [MaterialType.BUMPER]: {
    id: MaterialType.BUMPER,
    name: 'Bumper',
    friction: 0.2,
    restitution: 0.9,
    density: 10.0,
    color: 0xff2200,
    description: 'Pop bumper - high elasticity',
  },

  [MaterialType.FLIPPER]: {
    id: MaterialType.FLIPPER,
    name: 'Flipper',
    friction: 0.6,
    restitution: 0.7,
    density: 8.0,
    color: 0xffaa00,
    description: 'Flipper rubber - high friction',
  },

  [MaterialType.RAMP]: {
    id: MaterialType.RAMP,
    name: 'Ramp',
    friction: 0.4,
    restitution: 0.6,
    density: 15.0,
    color: 0x00ff88,
    description: 'Metal ramp - balanced friction',
  },

  [MaterialType.WALL]: {
    id: MaterialType.WALL,
    name: 'Wall',
    friction: 0.2,
    restitution: 0.7,
    density: 100.0,
    color: 0x1a2233,
    description: 'Playfield wall - bouncy',
  },

  [MaterialType.DRAIN]: {
    id: MaterialType.DRAIN,
    name: 'Drain',
    friction: 0.8,
    restitution: 0.1,
    density: 20.0,
    color: 0x000000,
    description: 'Drain hole - high friction, no bounce',
  },

  [MaterialType.TARGET]: {
    id: MaterialType.TARGET,
    name: 'Target',
    friction: 0.3,
    restitution: 0.65,
    density: 12.0,
    color: 0x0099ff,
    description: 'Drop target - balanced',
  },

  [MaterialType.SLINGSHOT]: {
    id: MaterialType.SLINGSHOT,
    name: 'Slingshot',
    friction: 0.4,
    restitution: 0.85,
    density: 6.0,
    color: 0xff00ff,
    description: 'Slingshot - high energy transfer',
  },

  [MaterialType.PLASTIC]: {
    id: MaterialType.PLASTIC,
    name: 'Plastic',
    friction: 0.35,
    restitution: 0.5,
    density: 5.0,
    color: 0xcccccc,
    description: 'Generic plastic - low bounce',
  },
};

/**
 * Material interaction matrix - overrides defaults for specific pairs
 * If not specified, uses average of individual material properties
 */
export const MATERIAL_INTERACTIONS: MaterialInteraction[] = [
  // Ball interactions (most important for gameplay)
  {
    material1: MaterialType.BALL,
    material2: MaterialType.BUMPER,
    friction: 0.2,
    restitution: 0.95,  // Extra bouncy from bumper
    description: 'Ball-bumper: high energy release',
  },

  {
    material1: MaterialType.BALL,
    material2: MaterialType.FLIPPER,
    friction: 0.6,
    restitution: 0.75,  // Good controlled bounce
    description: 'Ball-flipper: controlled shot',
  },

  {
    material1: MaterialType.BALL,
    material2: MaterialType.RAMP,
    friction: 0.35,
    restitution: 0.5,  // Some bounce, mostly slides
    description: 'Ball-ramp: smooth sliding',
  },

  {
    material1: MaterialType.BALL,
    material2: MaterialType.WALL,
    friction: 0.15,
    restitution: 0.75,  // Good bounce off walls
    description: 'Ball-wall: reflective',
  },

  {
    material1: MaterialType.BALL,
    material2: MaterialType.DRAIN,
    friction: 0.9,
    restitution: 0.05,  // Absorb ball energy
    description: 'Ball-drain: game over',
  },

  {
    material1: MaterialType.BALL,
    material2: MaterialType.TARGET,
    friction: 0.25,
    restitution: 0.7,  // Solid hit
    description: 'Ball-target: satisfying impact',
  },

  {
    material1: MaterialType.BALL,
    material2: MaterialType.SLINGSHOT,
    friction: 0.3,
    restitution: 0.9,  // Launch energy
    description: 'Ball-slingshot: catapult effect',
  },

  // Other interactions
  {
    material1: MaterialType.BUMPER,
    material2: MaterialType.WALL,
    friction: 0.5,
    restitution: 0.8,
    description: 'Bumper-wall: rigid contact',
  },

  {
    material1: MaterialType.FLIPPER,
    material2: MaterialType.RAMP,
    friction: 0.4,
    restitution: 0.6,
    description: 'Flipper-ramp: mechanical',
  },

  {
    material1: MaterialType.RAMP,
    material2: MaterialType.WALL,
    friction: 0.4,
    restitution: 0.7,
    description: 'Ramp-wall: structural',
  },
];

/**
 * Material System Manager
 * Manages physics properties for material pairs
 */
export class MaterialSystem {
  private materialMap: Map<string, MaterialDefinition> = new Map();
  private interactionMap: Map<string, MaterialInteraction> = new Map();

  constructor() {
    this.initializeMaterials();
    this.initializeInteractions();
  }

  /**
   * Initialize material definitions
   */
  private initializeMaterials(): void {
    Object.values(MATERIAL_DEFINITIONS).forEach(mat => {
      this.materialMap.set(mat.id, mat);
    });
  }

  /**
   * Initialize interaction matrix
   */
  private initializeInteractions(): void {
    MATERIAL_INTERACTIONS.forEach(interaction => {
      const key = this.getInteractionKey(interaction.material1, interaction.material2);
      this.interactionMap.set(key, interaction);
    });
  }

  /**
   * Get physics properties for a material pair
   */
  getInteraction(mat1: MaterialType | string, mat2: MaterialType | string): {
    friction: number;
    restitution: number;
  } {
    // Try exact match
    const key1 = this.getInteractionKey(mat1, mat2);
    const interaction1 = this.interactionMap.get(key1);
    if (interaction1) {
      return {
        friction: interaction1.friction,
        restitution: interaction1.restitution,
      };
    }

    // Try reverse match
    const key2 = this.getInteractionKey(mat2, mat1);
    const interaction2 = this.interactionMap.get(key2);
    if (interaction2) {
      return {
        friction: interaction2.friction,
        restitution: interaction2.restitution,
      };
    }

    // Default: average the individual materials
    const def1 = this.materialMap.get(mat1);
    const def2 = this.materialMap.get(mat2);

    if (!def1 || !def2) {
      console.warn(`Unknown material pair: ${mat1} <-> ${mat2}`);
      return { friction: 0.3, restitution: 0.6 };  // Safe defaults
    }

    return {
      friction: (def1.friction + def2.friction) / 2,
      restitution: (def1.restitution + def2.restitution) / 2,
    };
  }

  /**
   * Get single material definition
   */
  getMaterial(matType: MaterialType | string): MaterialDefinition | undefined {
    return this.materialMap.get(matType);
  }

  /**
   * Register custom material
   */
  registerMaterial(def: MaterialDefinition): void {
    this.materialMap.set(def.id, def);
  }

  /**
   * Register custom interaction
   */
  registerInteraction(interaction: MaterialInteraction): void {
    const key = this.getInteractionKey(interaction.material1, interaction.material2);
    this.interactionMap.set(key, interaction);
  }

  /**
   * Apply material physics to collider
   */
  applyMaterialToCollider(
    collider: any,  // RAPIER.ColliderDesc
    material: MaterialType | string
  ): any {
    const mat = this.getMaterial(material);
    if (!mat) {
      console.warn(`Unknown material: ${material}`);
      return collider;
    }

    return collider
      .setFriction(mat.friction)
      .setRestitution(mat.restitution);
  }

  /**
   * Get all materials
   */
  getAllMaterials(): MaterialDefinition[] {
    return Array.from(this.materialMap.values());
  }

  /**
   * Get all interactions
   */
  getAllInteractions(): MaterialInteraction[] {
    return Array.from(this.interactionMap.values());
  }

  /**
   * Generate interaction key (order-independent)
   */
  private getInteractionKey(mat1: string, mat2: string): string {
    const [a, b] = [mat1, mat2].sort();
    return `${a}|${b}`;
  }

  /**
   * Get debug info
   */
  getDebugInfo(): string {
    const materialCount = this.materialMap.size;
    const interactionCount = this.interactionMap.size;
    return `Materials: ${materialCount}, Interactions: ${interactionCount}`;
  }
}

/**
 * Global material system instance
 */
export const materialSystem = new MaterialSystem();

/**
 * Helper: Apply material to collision between elements
 */
export function applyMaterialInteraction(
  element1: { material: MaterialType | string },
  element2: { material: MaterialType | string },
  collider: any  // RAPIER.ColliderDesc
): any {
  const interaction = materialSystem.getInteraction(element1.material, element2.material);
  return collider
    .setFriction(interaction.friction)
    .setRestitution(interaction.restitution);
}

/**
 * Helper: Get color for material (for visual feedback)
 */
export function getMaterialColor(matType: MaterialType | string): number {
  const mat = materialSystem.getMaterial(matType);
  return mat?.color ?? 0xcccccc;
}

/**
 * Helper: Get name for material (for UI display)
 */
export function getMaterialName(matType: MaterialType | string): string {
  const mat = materialSystem.getMaterial(matType);
  return mat?.name ?? 'Unknown';
}
