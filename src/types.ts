import type * as THREE from 'three';
import type RAPIER from '@dimforge/rapier2d-compat';

export interface GameState {
  ballPos: THREE.Vector3;
  ballVel: { x: number; y: number };
  inLane: boolean;
  score: number;
  ballNum: number;
  multiplier: number;
  bumperHits: number;
  plungerCharge: number;
  plungerCharging: boolean;
  tiltWarnings: number;
  tiltActive: boolean;
  ballSaveTimer: number;
  lastRank: number;
  lastScore: number;

  // ─── Enhanced Physics & Game Mechanics ───
  // Phase 1: Bumper Combo
  bumperCombo: number;
  lastBumperHitTime: number;
  bumperComboMultiplier: number;
  maxBumperCombo: number;

  // Phase 2: Spinner Mechanics
  spinnerActive: boolean;
  spinnerSpins: number;
  spinnerScore: number;
  lastSpinnerHitTime: number;

  // Phase 3: Ramp Completion
  rampsHit: Set<number>;
  rampSequenceBonus: number;

  // Phase 5: Flipper Power
  flipperChargeTime: number;
  flipperShotPower: number;

  // Phase 6: Target Sequences
  targetSequence: number[];
  targetsHitSequence: number[];
  sequenceProgress: number;

  // Phase 7: Extended Ball Saves
  ballSavesRemaining: number;
  ballSaveMode: 'active' | 'exhausted' | 'none';

  // Phase 12: Progressive Target System
  progressiveTargetMode: '3-of-5' | 'all' | 'multi-level' | 'none';
  progressiveTargets: Map<number, { hitCount: number; required: number; completed: boolean; multiLevel: boolean }>;
  targetProgress: number;  // Current progress (0-1)
  targetHitCounts: Map<number, number>;  // Track hits per target for multi-level

  // Phase 12 Task 2: Kickback & Ball Hold Mechanics
  kickbacksRemaining: number;
  kickbackActive: boolean;
  heldBalls: number[];
  ballHoldTime: number;
  magnetLocationX: number;
  magnetLocationY: number;

  // Phase 12 Task 3: Advanced Combo System
  skillShotActive: boolean;
  skillShotTimeout: number;
  lastHitElement: 'bumper' | 'target' | 'ramp' | 'flipper' | 'none';
  lastHitTime: number;
  comboMultiplier: number;
  activeModes: Map<string, { type: string; progress: number; timeout: number }>;

  // Phase 12 Task 5: Ramp Sequencing
  rampSequenceMode: 'ordered' | 'any' | 'none';
  rampComboMultiplier: number;
  lastRampHitTime: number;
  rampComboCounter: number;
  rampLockStates: Map<number, 'unlocked' | 'lit' | 'locked' | 'completed'>;
}

export interface FPTResources {
  textures: Record<string, THREE.Texture>;
  sounds:   Record<string, AudioBuffer>;
  playfield:   THREE.Texture | null;
  script:      string | null;
  musicTrack?: AudioBuffer;
  models?: Map<string, THREE.Mesh | null>;  // Phase 7: MS3D models
  animations?: Map<string, any>;  // Phase 13: BAM animation sequences
  mapped: {
    bumper:  AudioBuffer | null;
    flipper: AudioBuffer | null;
    drain:   AudioBuffer | null;
  };
}

export interface FPLLibrary {
  name: string;
  version?: string;
  description?: string;
  tableTemplates: Record<string, TableConfig>;
  physicsPresets: Record<string, PhysicsConfig>;
  soundLibrary: Record<string, AudioBuffer>;
  textureLibrary: Record<string, THREE.Texture>;
}

export interface PhysicsConfig {
  ballRestitution?: number;      // 0.0-1.0, default 0.5
  ballFriction?: number;         // 0.0-1.0, default 0.3
  bumperRestitution?: number;    // default 0.7
  bumperFriction?: number;       // default 0.0
  targetRestitution?: number;    // default 0.7
  targetFriction?: number;       // default 0.2
  flipperRestitution?: number;   // default 0.5
  flipperFriction?: number;      // default 0.6
  rampRestitution?: number;      // default 0.8
  rampFriction?: number;         // default 0.25
  slingshotRestitution?: number; // default 0.85
}

export interface ElementPhysics {
  bumpers?: Record<number, { restitution?: number; friction?: number }>;
  targets?: Record<number, { restitution?: number; friction?: number }>;
  ramps?:   Record<number, { restitution?: number; friction?: number }>;
}

export interface TableConfig {
  name:        string;
  tableColor:  number;
  accentColor: number;
  bumpers:  Array<{ x: number; y: number; color: number; size?: number; light?: { intensity: number; distance: number } }>;
  targets?: Array<{ x: number; y: number; color: number; light?: { intensity: number; distance: number } }>;
  ramps?:   Array<{ x1: number; y1: number; x2: number; y2: number; color: number; light?: { intensity: number; distance: number } }>;
  lights?:  Array<{ color: number; intensity: number; dist: number; x: number; y: number; z: number }>;
  physics?: PhysicsConfig;
  elementPhysics?: ElementPhysics;
}

export interface BumperMesh {
  x: number;
  y: number;
  mesh: THREE.Mesh & { userData: BumperUserData };
}

export interface BumperUserData {
  light:   THREE.PointLight;
  ringMat: THREE.MeshStandardMaterial;
  color:   number;
  lod:     'high' | 'med' | 'low';
  size:    number;
  hit:     boolean;
}

export interface TargetMesh {
  x: number;
  y: number;
  mesh: THREE.Group & { userData: TargetUserData };
}

export interface TargetUserData {
  light:   THREE.PointLight;
  faceMat: THREE.MeshStandardMaterial;
  color:   number;
  hit:     boolean;
}

export interface RampData {
  x1: number; y1: number;
  x2: number; y2: number;
  nx: number; ny: number;
}

export interface ParticleData {
  x: number; y: number; z: number;
  vx: number; vy: number; vz: number;
  life: number;
  r: number; g: number; b: number;
}

export interface ExtraBall {
  pos:        THREE.Vector3;
  vel:        { x: number; y: number };
  mesh:       THREE.Mesh;
  rapierBody: RAPIER.RigidBody | null;
}

export interface PhysicsContext {
  world:        RAPIER.World;
  ballBody:     RAPIER.RigidBody;
  ballCollider: RAPIER.Collider;
  eventQueue:   RAPIER.EventQueue;
  lFlipperBody: RAPIER.RigidBody;
  rFlipperBody: RAPIER.RigidBody;
  bumperMap:    Map<number, { x: number; y: number; mesh: any; index: number }>;
  targetMap:    Map<number, { x: number; y: number; mesh: any; index: number }>;
  slingshotMap: Map<number, string>;
  tableBodies:  RAPIER.RigidBody[];
}

// ─── B.A.M. (Better Arcade Mode) Types (Session 20.3) ───

export interface BAMVector3 {
  x: number;
  y: number;
  z: number;
}

export interface BAMKeyframe {
  time: number;
  position: BAMVector3;
  rotation: BAMVector3;
  scale: BAMVector3;
  duration: number;
}

export interface BAMAnimationSequence {
  name: string;
  frameRate: number;
  frames: BAMKeyframe[];
  looping: boolean;
  duration: number;
}

export interface BAMConfig {
  mode: 'desktop' | 'cabinet' | 'vr';
  camera: {
    fov: number;
    near: number;
    far: number;
  };
  lighting: {
    lightStrength: number;
    ambientIntensity: number;
    diffuseIntensity: number;
  };
  physics: {
    tiltSensitivity: number;
    gravityCompensation: boolean;
    flipperPower: number;
    multiballMode: boolean;
  };
  animation: {
    enabled: boolean;
    interpolation: 'linear' | 'cubic';
    autoPlay: boolean;
  };
}
