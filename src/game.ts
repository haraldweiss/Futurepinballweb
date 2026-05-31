// SPDX-License-Identifier: AGPL-3.0-or-later
// © 2026 Harald Weiss
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
import { AssetCatalog } from './assets/asset-catalog';

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

  credits: 0,
  numPlayers: 0,
  currentPlayer: 0,
  playerScores: [0, 0, 0, 0],

  bumperCombo:         0,
  lastBumperHitTime:   0,
  bumperComboMultiplier: 1.0,
  maxBumperCombo:      0,

  spinnerActive:       false,
  spinnerSpins:        0,
  spinnerScore:        0,
  lastSpinnerHitTime:  0,

  rampsHit:            new Set(),
  rampSequenceBonus:   0,

  flipperChargeTime:   0,
  flipperShotPower:    0,

  targetSequence:      [],
  targetsHitSequence:  [],
  sequenceProgress:    0,

  ballSavesRemaining:  1,
  ballSaveMode:        'none',

  progressiveTargetMode: 'none',
  progressiveTargets: new Map(),
  targetProgress: 0,
  targetHitCounts: new Map(),

  kickbacksRemaining: 0,
  kickbackActive: false,
  heldBalls: [],
  ballHoldTime: 0,
  magnetLocationX: 2.55,
  magnetLocationY: -5.0,

  skillShotActive: false,
  skillShotTimeout: 0,
  lastHitElement: 'none',
  lastHitTime: 0,
  comboMultiplier: 1.0,
  activeModes: new Map(),

  rampSequenceMode: 'none',
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
  models: new Map(),      // Phase 7: MS3D models (initialize empty)
  mapped: { bumper: null, flipper: null, drain: null },
};

// ── Raw FPT Bytes (for lossless write-back) ──────────────────────────────────
export const fptRawBytes = {
  textures:  {} as Record<string, Uint8Array>,
  sounds:    {} as Record<string, Uint8Array>,
  models:    {} as Record<string, Uint8Array>,
  otherStreams: [] as Array<{ name: string; data: Uint8Array }>,
  scriptOriginal: null as string | null,
};

export function resetFPTRawBytes(): void {
  fptRawBytes.textures = {};
  fptRawBytes.sounds   = {};
  fptRawBytes.models   = {};
  fptRawBytes.otherStreams = [];
  fptRawBytes.scriptOriginal = null;
}

// ── Mutable references (set via setters from main.ts / table.ts) ─────────────
export let physics:             PhysicsContext | null = null;
export let currentTableConfig:  TableConfig    | null = null;
export let tableGroup:          THREE.Group    | null = null;
export let plungerKnob:         THREE.Mesh     | null = null;
export let fpScriptHandlers:    Record<string, (...args: any[]) => any> = {};
export let loadedLibrary:       FPLLibrary     | null = null;
export let bamEngine:           BAMEngine      | null = null;

let _globalAssetCatalog: AssetCatalog | null = null;

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
export function setFpScriptHandlers(h: Record<string, (...args: any[]) => any>) { fpScriptHandlers = h; }
export function setLoadedLibrary(lib: FPLLibrary | null)    { loadedLibrary      = lib; }
export function setBAMEngine(e: BAMEngine | null)           { bamEngine          = e; }
export function globalAssetCatalog(): AssetCatalog | null { return _globalAssetCatalog; }
export function setGlobalAssetCatalog(c: AssetCatalog | null): void { _globalAssetCatalog = c; }

// ── Cross-module callbacks (registered by main.ts after scene init) ───────────
export const cb = {
  updateHUD:        (): void => {},
  showNotification: (_msg: string): void => {},
  spawnParticles:   (_x: number, _y: number, _color: number, _count: number): void => {},
  dmdEvent:         (_text: string): void => {},
  playSound:        (_type: string): void => {},
  launchMultiBall:  (): void => {},
  resetBall:        (): void => {},

  triggerBumperFlash:     (): void => {},
  triggerRampCompletion:  (): void => {},
  triggerDrainWarning:    (): void => {},
  triggerMultiballFlash:  (): void => {},

  animateBackglassScore:  (_points: number): void => {},
  updateBackglassModeInfo: (_text: string): void => {},

  tableShake: (_magnitude: number, _duration: number): void => {},

  showFloatingScore: (_position: any, _points: number): void => {},
  updateCombo: (_combo: number): void => {},
  showScoreMilestone: (_text: string): void => {},
  showBonusAnnouncement: (_text: string): void => {},

  playTargetSound: (_intensity?: number): void => {},
  playFlipperSound: (_intensity?: number): void => {},
  playRampCompleteSound: (): void => {},
  playBallDrainSound: (): void => {},
  playMultiballSound: (): void => {},
  playMilestoneSound: (): void => {},

  triggerImpactEffect: (_position: any, _intensity: number = 1.0): void => {},
  triggerDrainVisual: (): void => {},
  triggerRampVisual: (): void => {},
  triggerMultiballVisual: (): void => {},

  notifyBumperHit: (_data?: any): void => {},
  notifyTargetHit: (_data?: any): void => {},
};
