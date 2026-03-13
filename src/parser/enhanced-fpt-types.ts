/**
 * enhanced-fpt-types.ts — Extended FPT data structures based on fp-dump/fp-grab
 * Provides comprehensive type definitions for advanced FPT parsing
 */

// ─── Playfield Settings ────────────────────────────────────────────────────
/**
 * Core playfield configuration extracted from .fpt file
 * Affects overall game physics and behavior
 */
export interface PlayfieldSettings {
  gravity: number;                    // m/s² (typical: 9.81-10.5)
  friction: number;                  // Global friction coefficient (0.0-1.0)
  width: number;                     // Playfield width in normalized units
  height: number;                    // Playfield height in normalized units
  ballRadius: number;                // Ball physics radius (typical: 0.027)
  tableMode: 'classic' | 'modern' | 'tournament';
  tiltSensitivity: number;           // Tilt threshold (higher = easier)
  drainTimeout: number;              // Time before drain reset (seconds)
  dampening: number;                 // Air resistance (0.0-1.0)
  restitutionScalar: number;         // Global bounce multiplier (0.8-1.2)
  flipperStrengthScalar: number;     // Global flipper power (0.5-2.0)
}

// ─── Detailed Light Data ───────────────────────────────────────────────────
/**
 * Complete light definition with behavior and linking
 */
export interface DetailedLight {
  id: string;                        // Unique identifier
  name?: string;                     // Human-readable name (e.g., "Lane Light 1")
  position: { x: number; y: number; z: number };

  // Visual Properties
  color: { r: number; g: number; b: number };  // 0.0-1.0 range or 0-255
  colorHex?: number;                 // 0xRRGGBB format (alternative)
  intensity: number;                 // 0.0-2.0 (1.0 = normal)

  // Physics
  falloffDistance: number;           // How far light reaches
  falloffType: 'linear' | 'quadratic' | 'exponential';
  shadowCasting?: boolean;

  // Behavior
  behavior: 'static' | 'pulse' | 'flashing' | 'fade';
  behaviorRate?: number;             // Hz for dynamic lights (pulse/flash frequency)
  behaviorPhase?: number;            // 0.0-1.0 offset for animation
  behaviorAmplitude?: number;        // Max intensity swing (0.0-1.0)

  // Element Linking
  linkedElement?: string;            // Element ID this light is attached to
  linkType?: 'always-on' | 'on-hit' | 'on-active' | 'on-state-change';
  linkTriggerFunction?: string;      // VBScript function that triggers this

  // Advanced
  blinkPattern?: string;             // Pattern like "111010101" for complex flashing
  animationCurve?: 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out';
}

// ─── Material Definition ───────────────────────────────────────────────────
/**
 * Material properties affecting both physics and visuals
 */
export interface MaterialDefinition {
  name: string;                      // Material identifier
  displayName?: string;

  // Visual
  baseColor: number;                 // 0xRRGGBB
  roughness: number;                 // 0.0 (glossy) - 1.0 (matte)
  metallic: number;                  // 0.0 (non-metal) - 1.0 (full metal)
  normalIntensity?: number;          // Normal map strength
  emissive?: number;                 // Self-illumination color (0xRRGGBB)
  emissiveIntensity?: number;        // Glow strength

  // Physics
  surfaceProperties: {
    friction: number;                // 0.0-1.0
    restitution: number;             // Bounce (0.0-1.6)
    damping: number;                 // Velocity damping (0.0-1.0)
    angularDamping?: number;
  };

  // Material Type Classification
  type: 'rubber' | 'plastic' | 'metal' | 'wood' | 'glass' | 'composite';
}

// ─── Game Element Definition ───────────────────────────────────────────────
/**
 * Complete representation of a playfield element
 */
export interface GameElement {
  id: string;                        // Unique identifier
  name?: string;                     // Display name

  // Classification
  type: 'bumper' | 'target' | 'flipper' | 'ramp' | 'wall' | 'slingshot' |
        'spinner' | 'kickback' | 'habitrail' | 'drain' | 'plunger' | 'trough' | 'kicker';

  // Position & Orientation
  position: { x: number; y: number; z?: number };
  rotation: number;                  // Z-axis rotation in degrees (0-360)
  scale: number;                     // Size multiplier (0.5-2.0 typical)

  // Physics
  physics: {
    mass?: number;                   // kg (0 = immovable)
    restitution: number;             // Bounce coefficient
    friction: number;                // Surface friction
    angularFriction?: number;
    maxVelocity?: number;             // Speed limit
    gravityScale?: number;            // Gravity multiplier (0.5-2.0)
    isKinematic?: boolean;            // Doesn't fall/move
    isTrigger?: boolean;              // Doesn't collide, only triggers
    angularVelocity?: number;         // Spin rate
    linearDamping?: number;
    collisionGroup?: number;          // Group for collision filtering
    collisionMask?: number;           // Groups this element collides with
  };

  // Visual Properties
  visual: {
    color: number;                   // 0xRRGGBB
    material: string;                // Reference to MaterialDefinition
    emissive?: number;               // 0xRRGGBB glow color
    emissiveIntensity?: number;
    lightConfig?: DetailedLight;     // Associated light
    textureOverride?: string;        // Custom texture path
  };

  // Gameplay Behavior
  behavior: {
    scoreValue: number;              // Points for hit
    scoringMultiplier?: number;      // Multiplier progression
    soundEffect?: string;            // Sound name to play
    animationOnHit?: string;         // BAM animation trigger
    triggerMultiplier?: boolean;     // Affects multiplier system
    canMultiball?: boolean;          // Can trigger multiball
    canExtraBall?: boolean;          // Can trigger extra ball
    isProgressiveTarget?: boolean;   // Name changes per completion
    progressionLevel?: number;       // Current level if progressive
    hitSoundVolume?: number;         // 0.0-1.0
  };

  // Ramp-Specific Properties
  rampData?: {
    endPosition?: { x: number; y: number };
    trajectoryPoints?: Array<{ x: number; y: number; z?: number }>;
    difficulty: 'easy' | 'medium' | 'hard';
    shotValue?: number;              // Bonus for completing ramp
    automaticReturn?: boolean;        // Ball returns after shot
  };

  // Flipper-Specific Properties
  flipperData?: {
    strength: number;                // Launch power (0.5-2.0)
    angle: number;                   // Rest angle in degrees
    activeAngle: number;             // Activated angle in degrees
    isLeft: boolean;                 // Left vs right flipper
    activationTime?: number;         // Time to reach active angle (ms)
    autoPlunger?: boolean;           // Automatical launch
    ballHoldTime?: number;           // Trap and hold feature
  };

  // Spinner-Specific Properties
  spinnerData?: {
    maxRPM: number;                  // Maximum rotation speed
    brakeForce: number;              // How quickly it stops
    sensitive: boolean;              // Easy to activate
  };

  // Wall-Specific Properties
  wallData?: {
    isVisible: boolean;
    isPhysicsEnabled: boolean;
    points?: Array<{ x: number; y: number }>;  // Path points for curved walls
  };

  // State Tracking
  state?: {
    isActive: boolean;
    hitCount: number;
    lastHitTime: number;            // Timestamp
    onCooldown: boolean;            // Recovery period
    cooldownRemaining: number;      // ms
  };
}

// ─── Event & Trigger System ───────────────────────────────────────────────
/**
 * VBScript function bindings for game events
 */
export interface EventBinding {
  elementId: string;
  eventType: 'hit' | 'enter' | 'exit' | 'active' | 'inactive' | 'drain' | 'launch' | 'collision';
  scriptFunction: string;            // VBScript function name
  params?: Record<string, any>;
  priority?: number;                 // Execution order (higher = first)
  cooldown?: number;                 // Minimum time between triggers (ms)
  requiresMultiplier?: boolean;
  scoreOffset?: number;              // Additional points for this trigger
}

// ─── Scoring Rule System ───────────────────────────────────────────────────
/**
 * Extracted scoring rules and progression
 */
export interface ScoringRule {
  ruleName: string;
  triggerElement: string;
  baseScore: number;

  // Multipliers
  multipliers: {
    ballCount?: number;              // Multiplier per ball number
    comboChain?: number;             // Combo bonus
    progressiveLevel?: number;       // Progress bonus
    modeBonus?: number;
    rampCompletion?: number;
  };

  // Special Effects
  specialEffects: string[];          // 'multiball', 'extra-ball', 'mode-start', etc.

  // Conditions
  conditions?: {
    minMultiplier?: number;
    maxMultiplier?: number;
    requiresMode?: string;
    requiresRamp?: boolean;
  };
}

// ─── Keyframe Animation Data ───────────────────────────────────────────────
/**
 * Animation keyframe for element state changes
 */
export interface KeyframeData {
  time: number;                      // Milliseconds from animation start

  // Transform
  position?: { x: number; y: number; z: number };
  rotation?: number;                 // Z-axis rotation
  scale?: number;

  // Visual
  opacity?: number;                  // 0.0-1.0
  color?: number;                    // 0xRRGGBB
  emissive?: number;

  // Physics
  velocity?: { x: number; y: number };
  angularVelocity?: number;

  // Interpolation to next frame
  interpolation: 'linear' | 'ease' | 'ease-in' | 'ease-out' | 'ease-in-out' | 'cubic' | 'step';
  easeAmount?: number;               // 0.0-1.0 for custom easing
}

// ─── Animation Sequence ────────────────────────────────────────────────────
/**
 * Complete animation sequence with metadata
 */
export interface AnimationSequence {
  id: string;
  name: string;
  duration: number;                  // Total duration in ms
  loop: boolean;
  loopCount?: number;               // -1 = infinite

  keyframes: KeyframeData[];

  // Linking
  triggeredBy?: string;              // Element ID that triggers
  triggerEvent?: string;            // 'hit', 'active', etc.

  // Timing
  startDelay?: number;              // ms before animation starts
  endDelay?: number;                // ms before next animation

  // Interaction
  canInterrupt?: boolean;
  interruptionType?: 'stop' | 'reverse' | 'next';
}

// ─── Collision & Physics Groups ────────────────────────────────────────────
/**
 * Collision group definitions for element interaction
 */
export interface CollisionGroup {
  id: number;
  name: string;
  elementsInGroup: string[];        // Element IDs
  collisionResponse: {
    bounceMultiplier: number;       // How much bounce
    stickiness: number;             // Tendency to stick
    soundIntensity: number;         // Hit sound loudness
  };
}

// ─── Complete Extracted FPT Data ───────────────────────────────────────────
/**
 * Full result of enhanced FPT extraction
 * Union of all extractable data from .fpt file
 */
export interface ExtendedFPTData {
  // Core Settings
  playfield: PlayfieldSettings;

  // Elements
  elements: GameElement[];
  lights: DetailedLight[];
  materials: Map<string, MaterialDefinition>;
  collisionGroups: CollisionGroup[];

  // Behavior & Scripting
  eventBindings: EventBinding[];
  scoringRules: ScoringRule[];
  animations: Map<string, AnimationSequence>;

  // Metadata
  tableMetadata: {
    author?: string;
    description?: string;
    difficulty?: number;             // 1-10 rating
    year?: number;
    theme?: string;
    theme_color?: number;            // 0xRRGGBB
    backglass?: string;              // Resource path
    playfield_image?: string;        // Resource path
  };

  // Extraction Quality Metrics
  quality: {
    gravityConfidence: number;       // 0.0-1.0 how certain we are
    physicsConfidence: number;
    elementClassificationConfidence: number;
    completeness: number;            // Percentage of data extracted
    warnings: string[];
  };
}

// ─── Physics Validation ────────────────────────────────────────────────────
/**
 * Helper interface for physics validation
 */
export interface PhysicsValidation {
  isValid: boolean;
  confidence: number;               // 0.0-1.0
  errors: string[];
  warnings: string[];
  suggestions?: string[];
}

// ─── Extraction Options ────────────────────────────────────────────────────
/**
 * Configuration for extraction process
 */
export interface ExtractionOptions {
  enablePhysicsExtraction?: boolean;
  enableLightExtraction?: boolean;
  enableAnimationExtraction?: boolean;
  enableScriptDataExtraction?: boolean;
  enableMaterialExtraction?: boolean;

  // Confidence thresholds
  minConfidenceThreshold?: number;  // 0.0-1.0
  allowHeuristics?: boolean;        // Use guesses for missing data

  // Logging
  verbose?: boolean;
  logExtraction?: (message: string) => void;
}

// ─── Export default type for convenience ───────────────────────────────────
export type FPTExtractionResult = ExtendedFPTData | null;
