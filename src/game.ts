/**
 * game.ts — Geteilter Mutable State + Callback-Registry
 *
 * Alle Module importieren von hier. main.ts befüllt `cb` nach dem Init.
 * Dank ESM Live-Bindings sehen importierende Module immer den aktuellen Wert.
 */
import * as THREE from 'three';
import type {
  GameState, FPTResources, TableConfig, PhysicsContext,
  BumperMesh, TargetMesh, RampData, ExtraBall, ParticleData, FPLLibrary
} from './types';
import type { BAMEngine } from './bam-engine';

// ── Game State ───────────────────────────────────────────────────────────────
export const state: GameState = {
  ballPos:         new THREE.Vector3(2.55, -5.0, 0.5),
  ballVel:         { x: 0, y: 0 },
  inLane:          true,
  score:           0,
  ballNum:         1,
  multiplier:      1,
  bumperHits:      0,
  plungerCharge:   0,
  plungerCharging: false,
  tiltWarnings:    0,
  tiltActive:      false,
  ballSaveTimer:   0,
  lastRank:        0,
  lastScore:       0,

  // ─── Enhanced Physics & Game Mechanics ───
  // Phase 1: Bumper Combo
  bumperCombo:         0,
  lastBumperHitTime:   0,
  bumperComboMultiplier: 1.0,
  maxBumperCombo:      0,

  // Phase 2: Spinner
  spinnerActive:       false,
  spinnerSpins:        0,
  spinnerScore:        0,
  lastSpinnerHitTime:  0,

  // Phase 3: Ramp Completion
  rampsHit:            new Set(),
  rampSequenceBonus:   0,

  // Phase 5: Flipper Power
  flipperChargeTime:   0,
  flipperShotPower:    0,

  // Phase 6: Target Sequences
  targetSequence:      [],
  targetsHitSequence:  [],
  sequenceProgress:    0,

  // Phase 7: Extended Ball Saves
  ballSavesRemaining:  1,
  ballSaveMode:        'none',

  // Phase 12: Progressive Target System
  progressiveTargetMode: 'none',
  progressiveTargets: new Map(),
  targetProgress: 0,
  targetHitCounts: new Map(),

  // Phase 12 Task 2: Kickback & Ball Hold Mechanics
  kickbacksRemaining: 0,
  kickbackActive: false,
  heldBalls: [],
  ballHoldTime: 0,
  magnetLocationX: 2.55,
  magnetLocationY: -5.0,

  // Phase 12 Task 3: Advanced Combo System
  skillShotActive: false,
  skillShotTimeout: 0,
  lastHitElement: 'none' as any,
  lastHitTime: 0,
  comboMultiplier: 1.0,
  activeModes: new Map(),

  // Phase 12 Task 5: Ramp Sequencing
  rampSequenceMode: 'none' as any,
  rampComboMultiplier: 1.0,
  lastRampHitTime: 0,
  rampComboCounter: 0,
  rampLockStates: new Map(),
};

export const keys = { left: false, right: false };

// ── FPT Resources ────────────────────────────────────────────────────────────
export const fptResources: FPTResources = {
  textures:  {},
  sounds:    {},
  playfield: null,
  script:    null,
  animations: new Map(),  // Phase 13: BAM animations
  mapped: { bumper: null, flipper: null, drain: null },
};

// ── Mutable references (set via setters from main.ts / table.ts) ─────────────
export let physics:             PhysicsContext | null = null;
export let currentTableConfig:  TableConfig    | null = null;
export let tableGroup:          THREE.Group    | null = null;
export let plungerKnob:         THREE.Mesh     | null = null;
export let fpScriptHandlers:    Record<string, Function> = {};
export let loadedLibrary:       FPLLibrary     | null = null;
export let bamEngine:           BAMEngine      | null = null;

export const bumpers:    BumperMesh[] = [];
export const targets:    TargetMesh[] = [];
export const slingshots: Array<{ x: number; y: number; side: string }> = [];
export const ramps:      RampData[]   = [];
export const extraBalls: ExtraBall[]  = [];
export const partData:   ParticleData[] = [];

// Setters for let-exports (ESM doesn't allow direct re-assignment from outside)
export function setPhysics(p: PhysicsContext | null)       { physics            = p; }
export function setCurrentTableConfig(c: TableConfig|null) { currentTableConfig = c; }
export function setTableGroup(g: THREE.Group | null)       { tableGroup         = g; }
export function setPlungerKnob(m: THREE.Mesh | null)       { plungerKnob        = m; }
export function setFpScriptHandlers(h: Record<string,Function>) { fpScriptHandlers = h; }
export function setLoadedLibrary(lib: FPLLibrary | null)    { loadedLibrary      = lib; }
export function setBAMEngine(e: BAMEngine | null)           { bamEngine          = e; }

// ── Cross-module callbacks (registered by main.ts after scene init) ───────────
export const cb = {
  updateHUD:        (): void => {},
  showNotification: (_msg: string): void => {},
  spawnParticles:   (_x: number, _y: number, _color: number, _count: number): void => {},
  dmdEvent:         (_text: string): void => {},
  playSound:        (_type: string): void => {},
  launchMultiBall:  (): void => {},
  resetBall:        (): void => {},

  // ── Phase 2: Advanced Lighting Effects ──
  triggerBumperFlash:     (): void => {},  // Bumper hit effect
  triggerRampCompletion:  (): void => {},  // Ramp finished effect
  triggerDrainWarning:    (): void => {},  // Ball drain warning effect
  triggerMultiballFlash:  (): void => {},  // Multiball start effect

  // ── Phase 4: Backglass Score Animations ──
  animateBackglassScore:  (_points: number): void => {},  // Score popup animation
  updateBackglassModeInfo: (_text: string): void => {},   // Update mode indicator

  // ── Phase 9: Table Shake on Impact ──
  tableShake: (_magnitude: number, _duration: number): void => {},  // Table vibration effect

  // ── Phase 9: Score Display Animations ──
  showFloatingScore: (_position: any, _points: number): void => {},  // Floating score text
  updateCombo: (_combo: number): void => {},  // Update combo counter
  showScoreMilestone: (_text: string): void => {},  // Milestone celebration
  showBonusAnnouncement: (_text: string): void => {},  // Bonus event announcement

  // ── Phase 9: Enhanced Audio Events ──
  playTargetSound: (_intensity?: number): void => {},  // Target hit sound
  playFlipperSound: (_intensity?: number): void => {},  // Flipper activation sound
  playRampCompleteSound: (): void => {},  // Ramp completion sound
  playBallDrainSound: (): void => {},  // Ball drain sound
  playMultiballSound: (): void => {},  // Multiball start sound
  playMilestoneSound: (): void => {},  // Milestone reached sound

  // ── Phase 9: Visual Polish Effects ──
  triggerImpactEffect: (_position: any, _intensity: number = 1.0): void => {},  // Bumper impact visual
  triggerDrainVisual: (): void => {},  // Drain warning visual
  triggerRampVisual: (): void => {},  // Ramp completion visual
  triggerMultiballVisual: (): void => {},  // Multiball start visual

  // ── Game Events (for script engine) ──
  notifyBumperHit: (_data?: any): void => {},  // Called by script engine
  notifyTargetHit: (_data?: any): void => {},  // Called by script engine
};
