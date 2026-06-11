import * as THREE from 'three';
import type { GameState } from '../types';

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
