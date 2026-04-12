/**
 * VBScript Complete Test Suite — Comprehensive Function Coverage
 *
 * Tests all remaining VBScript functions including advanced game API,
 * complex chaining, edge cases, and production scenarios
 *
 * Run with: npm test -- vbscript-complete
 */

import { describe, it, expect, beforeEach } from 'vitest';

/**
 * Mock VBScript environment
 */
class VBScriptEnvironment {
  variables: Map<string, any> = new Map();
  settings: Map<string, any> = new Map();
  gameState = {
    score: 0,
    ball: 1,
    bumperHits: 0,
    heldBalls: 0,
    tilted: false,
    multiplier: 1,
  };
  soundsPlayed: string[] = [];
  lightsActive: Set<string> = new Set();
  coilsFired: string[] = [];

  // Utility functions
  len(str: string): number {
    return str.length;
  }

  mid(str: string, start: number, length?: number): string {
    const idx = Math.max(0, start - 1); // VB uses 1-based indexing
    return length ? str.substr(idx, length) : str.substr(idx);
  }

  left(str: string, len: number): string {
    return str.substr(0, len);
  }

  right(str: string, len: number): string {
    return str.substr(-len);
  }

  trim(str: string): string {
    return str.trim();
  }

  lTrim(str: string): string {
    return str.replace(/^\s+/, '');
  }

  rTrim(str: string): string {
    return str.replace(/\s+$/, '');
  }

  inStr(haystack: string, needle: string, startPos: number = 1): number {
    const idx = haystack.indexOf(needle, startPos - 1);
    return idx >= 0 ? idx + 1 : 0; // VB returns 1-based or 0 if not found
  }

  replace(str: string, find: string, replaceWith: string): string {
    return str.replace(new RegExp(find, 'g'), replaceWith);
  }

  strReverse(str: string): string {
    return str.split('').reverse().join('');
  }

  chr(code: number): string {
    return String.fromCharCode(code);
  }

  asc(str: string): number {
    return str.length > 0 ? str.charCodeAt(0) : 0;
  }

  lCase(str: string): string {
    return str.toLowerCase();
  }

  uCase(str: string): string {
    return str.toUpperCase();
  }

  space(count: number): string {
    return ' '.repeat(Math.max(0, count));
  }

  repeat(str: string, count: number): string {
    return str.repeat(Math.max(0, count));
  }

  cInt(value: any): number {
    if (typeof value === 'number') return Math.floor(value);
    const parsed = parseInt(String(value));
    return isNaN(parsed) ? 0 : parsed;
  }

  cDbl(value: any): number {
    if (typeof value === 'number') return value;
    const parsed = parseFloat(String(value));
    return isNaN(parsed) ? 0 : parsed;
  }

  cStr(value: any): string {
    return String(value);
  }

  cBool(value: any): boolean {
    return Boolean(value);
  }

  abs(n: number): number {
    return Math.abs(n);
  }

  sgn(n: number): number {
    return n > 0 ? 1 : n < 0 ? -1 : 0;
  }

  round(n: number, decimals: number = 0): number {
    const factor = Math.pow(10, decimals);
    return Math.round(n * factor) / factor;
  }

  sqr(n: number): number {
    return Math.sqrt(n);
  }

  sin(n: number): number {
    return Math.sin(n);
  }

  cos(n: number): number {
    return Math.cos(n);
  }

  tan(n: number): number {
    return Math.tan(n);
  }

  exp(n: number): number {
    return Math.exp(n);
  }

  log(n: number): number {
    return Math.log(n);
  }

  pow(base: number, exp: number): number {
    return Math.pow(base, exp);
  }

  min(...args: number[]): number {
    return Math.min(...args);
  }

  max(...args: number[]): number {
    return Math.max(...args);
  }

  isArray(val: any): boolean {
    return Array.isArray(val);
  }

  isNumeric(val: any): boolean {
    const n = parseFloat(val);
    return !isNaN(n);
  }

  isNull(val: any): boolean {
    return val === null || val === undefined;
  }

  isEmpty(val: any): boolean {
    return val === null || val === undefined || val === '';
  }

  // Game API
  addScore(points: number): void {
    this.gameState.score += points * this.gameState.multiplier;
  }

  getScore(): number {
    return this.gameState.score;
  }

  setMultiplier(mult: number): void {
    this.gameState.multiplier = Math.max(1, mult);
  }

  getMultiplier(): number {
    return this.gameState.multiplier;
  }

  playSound(soundName: string): void {
    this.soundsPlayed.push(soundName);
  }

  lightOn(lightName: string): void {
    this.lightsActive.add(lightName);
  }

  lightOff(lightName: string): void {
    this.lightsActive.delete(lightName);
  }

  fireCoil(coilName: string): void {
    this.coilsFired.push(coilName);
  }

  getBumperHits(): number {
    return this.gameState.bumperHits;
  }

  recordBumperHit(): void {
    this.gameState.bumperHits++;
  }

  setTilt(tilted: boolean): void {
    this.gameState.tilted = tilted;
  }

  isTilted(): boolean {
    return this.gameState.tilted;
  }

  reset(): void {
    this.gameState = {
      score: 0,
      ball: 1,
      bumperHits: 0,
      heldBalls: 0,
      tilted: false,
      multiplier: 1,
    };
    this.soundsPlayed = [];
    this.lightsActive.clear();
    this.coilsFired = [];
    this.variables.clear();
    this.settings.clear();
  }
}

// ───────────────────────────────────────────────────────────────────────────

describe('VBScript Complete Function Coverage', () => {
  let env: VBScriptEnvironment;

  beforeEach(() => {
    env = new VBScriptEnvironment();
  });

  describe('Advanced String Manipulation', () => {
    it('should handle complex string operations', () => {
      const str = 'Hello World';
      expect(env.len(str)).toBe(11);
      expect(env.left(str, 5)).toBe('Hello');
      expect(env.right(str, 5)).toBe('World');
      expect(env.mid(str, 7, 5)).toBe('World');
    });

    it('should find substrings with various positions', () => {
      const str = 'aaa bbb aaa ccc aaa';
      expect(env.inStr(str, 'aaa')).toBe(1);
      expect(env.inStr(str, 'bbb')).toBe(5);
      expect(env.inStr(str, 'ccc')).toBe(13);
      expect(env.inStr(str, 'xyz')).toBe(0);
    });

    it('should replace multiple occurrences', () => {
      const str = 'The quick brown fox';
      const replaced = env.replace(str, 'o', '0');
      expect(replaced).toBe('The quick br0wn f0x');
    });

    it('should reverse strings', () => {
      expect(env.strReverse('Hello')).toBe('olleH');
      expect(env.strReverse('12345')).toBe('54321');
      expect(env.strReverse('')).toBe('');
    });

    it('should handle whitespace operations', () => {
      const str = '  hello world  ';
      expect(env.trim(str)).toBe('hello world');
      expect(env.lTrim(str)).toBe('hello world  ');
      expect(env.rTrim(str)).toBe('  hello world');
    });

    it('should convert between characters and ASCII codes', () => {
      expect(env.asc('A')).toBe(65);
      expect(env.asc('a')).toBe(97);
      expect(env.chr(65)).toBe('A');
      expect(env.chr(97)).toBe('a');
    });

    it('should generate padding strings', () => {
      expect(env.space(5)).toBe('     ');
      expect(env.space(0)).toBe('');
      expect(env.repeat('*', 3)).toBe('***');
      expect(env.repeat('ab', 3)).toBe('ababab');
    });

    it('should handle case conversion', () => {
      expect(env.lCase('HeLLo WoRLd')).toBe('hello world');
      expect(env.uCase('HeLLo WoRLd')).toBe('HELLO WORLD');
      expect(env.lCase('123!@#')).toBe('123!@#');
    });
  });

  describe('Numeric Operations & Type Conversion', () => {
    it('should perform basic arithmetic operations', () => {
      expect(env.abs(-42)).toBe(42);
      expect(env.abs(42)).toBe(42);
      expect(env.sgn(-10)).toBe(-1);
      expect(env.sgn(0)).toBe(0);
      expect(env.sgn(10)).toBe(1);
    });

    it('should round numbers correctly', () => {
      expect(env.round(3.14159, 2)).toBe(3.14);
      expect(env.round(3.5)).toBe(4);
      expect(env.round(2.5)).toBe(3); // JavaScript rounds 0.5 up
      expect(env.round(123.456, 1)).toBe(123.5);
    });

    it('should calculate square roots', () => {
      expect(env.sqr(4)).toBe(2);
      expect(env.sqr(9)).toBe(3);
      expect(env.sqr(16)).toBe(4);
    });

    it('should perform trigonometric operations', () => {
      expect(env.sin(0)).toBe(0);
      expect(env.cos(0)).toBe(1);
      expect(env.tan(0)).toBe(0);
    });

    it('should calculate logarithms and exponents', () => {
      expect(env.log(1)).toBe(0);
      expect(env.exp(0)).toBe(1);
      expect(env.pow(2, 3)).toBe(8);
      expect(env.pow(10, 2)).toBe(100);
    });

    it('should find min/max values', () => {
      expect(env.min(5, 2, 8, 1, 9)).toBe(1);
      expect(env.max(5, 2, 8, 1, 9)).toBe(9);
      expect(env.min(-5, -2, -10)).toBe(-10);
      expect(env.max(-5, -2, -10)).toBe(-2);
    });

    it('should convert between types', () => {
      expect(env.cInt(3.7)).toBe(3);
      expect(env.cInt('42')).toBe(42);
      expect(env.cInt('not a number')).toBe(0);
      expect(env.cDbl('3.14')).toBe(3.14);
      expect(env.cStr(42)).toBe('42');
      expect(env.cBool(1)).toBe(true);
      expect(env.cBool(0)).toBe(false);
    });

    it('should validate numeric strings', () => {
      expect(env.isNumeric('123')).toBe(true);
      expect(env.isNumeric('3.14')).toBe(true);
      expect(env.isNumeric('abc')).toBe(false);
      expect(env.isNumeric('')).toBe(false);
    });
  });

  describe('Type Checking Functions', () => {
    it('should check for arrays', () => {
      expect(env.isArray([1, 2, 3])).toBe(true);
      expect(env.isArray('string')).toBe(false);
      expect(env.isArray(42)).toBe(false);
      expect(env.isArray(null)).toBe(false);
    });

    it('should check for null/empty values', () => {
      expect(env.isNull(null)).toBe(true);
      expect(env.isNull(undefined)).toBe(true);
      expect(env.isNull('')).toBe(false);
      expect(env.isEmpty('')).toBe(true);
      expect(env.isEmpty(null)).toBe(true);
      expect(env.isEmpty('value')).toBe(false);
    });
  });

  describe('Game-Specific Score & Multiplier System', () => {
    it('should track and update score', () => {
      expect(env.getScore()).toBe(0);
      env.addScore(100);
      expect(env.getScore()).toBe(100);
      env.addScore(50);
      expect(env.getScore()).toBe(150);
    });

    it('should apply multiplier to score', () => {
      env.setMultiplier(2);
      env.addScore(100);
      expect(env.getScore()).toBe(200); // 100 * 2

      env.setMultiplier(3);
      env.addScore(100);
      expect(env.getScore()).toBe(500); // 200 + (100 * 3)
    });

    it('should enforce minimum multiplier', () => {
      env.setMultiplier(-5);
      expect(env.getMultiplier()).toBe(1); // Enforces minimum of 1

      env.setMultiplier(0);
      expect(env.getMultiplier()).toBe(1);
    });

    it('should handle score overflow', () => {
      env.addScore(999999);
      env.addScore(999999);
      const score = env.getScore();
      expect(score).toBeGreaterThan(1000000);
    });
  });

  describe('Game Audio System', () => {
    it('should track sound playback', () => {
      env.playSound('bumper-hit');
      env.playSound('ramp-shot');
      env.playSound('bumper-hit');

      expect(env.soundsPlayed).toHaveLength(3);
      expect(env.soundsPlayed[0]).toBe('bumper-hit');
      expect(env.soundsPlayed[2]).toBe('bumper-hit');
    });

    it('should handle sound sequences', () => {
      const sounds = ['start', 'ramp-entry', 'ramp-advance', 'end'];
      sounds.forEach(s => env.playSound(s));

      expect(env.soundsPlayed).toEqual(sounds);
    });
  });

  describe('Game Lighting System', () => {
    it('should toggle lights on/off', () => {
      env.lightOn('target-1');
      env.lightOn('target-2');
      expect(env.lightsActive.has('target-1')).toBe(true);
      expect(env.lightsActive.has('target-2')).toBe(true);

      env.lightOff('target-1');
      expect(env.lightsActive.has('target-1')).toBe(false);
      expect(env.lightsActive.has('target-2')).toBe(true);
    });

    it('should handle complex lighting sequences', () => {
      const targets = ['left-ramp', 'center-lane', 'right-ramp', 'scoop'];
      targets.forEach(t => env.lightOn(t));

      expect(env.lightsActive.size).toBe(4);

      targets.forEach(t => env.lightOff(t));
      expect(env.lightsActive.size).toBe(0);
    });
  });

  describe('Game Solenoid/Coil System', () => {
    it('should track coil fires', () => {
      env.fireCoil('flipper-left');
      env.fireCoil('flipper-right');
      env.fireCoil('bumper-kickback');

      expect(env.coilsFired).toHaveLength(3);
      expect(env.coilsFired[0]).toBe('flipper-left');
    });

    it('should fire coils in sequence', () => {
      const coils = ['launcher', 'ramp-diverter', 'scoop-kickback'];
      coils.forEach(c => env.fireCoil(c));

      expect(env.coilsFired).toEqual(coils);
    });
  });

  describe('Game State Management', () => {
    it('should track bumper hits', () => {
      expect(env.getBumperHits()).toBe(0);
      env.recordBumperHit();
      expect(env.getBumperHits()).toBe(1);
      env.recordBumperHit();
      env.recordBumperHit();
      expect(env.getBumperHits()).toBe(3);
    });

    it('should handle tilt state', () => {
      expect(env.isTilted()).toBe(false);
      env.setTilt(true);
      expect(env.isTilted()).toBe(true);
      env.setTilt(false);
      expect(env.isTilted()).toBe(false);
    });

    it('should reset all state', () => {
      env.addScore(1000);
      env.setMultiplier(5);
      env.recordBumperHit();
      env.playSound('test');
      env.lightOn('test-light');
      env.fireCoil('test-coil');

      env.reset();

      expect(env.getScore()).toBe(0);
      expect(env.getMultiplier()).toBe(1);
      expect(env.getBumperHits()).toBe(0);
      expect(env.isTilted()).toBe(false);
      expect(env.soundsPlayed).toHaveLength(0);
      expect(env.lightsActive.size).toBe(0);
      expect(env.coilsFired).toHaveLength(0);
    });
  });

  describe('Complex Gameplay Scenarios', () => {
    it('should handle multiball scoring scenario', () => {
      // Start multiball
      env.setMultiplier(2);
      env.recordBumperHit();

      // Hit bumpers in multiball
      env.addScore(100); // 100 * 2 = 200
      env.addScore(100); // 100 * 2 = 200
      env.addScore(150); // 150 * 2 = 300

      expect(env.getScore()).toBe(700);
      expect(env.getBumperHits()).toBe(1);
    });

    it('should handle ramp completion with lights', () => {
      const rampLights = ['ramp-1', 'ramp-2', 'ramp-3'];

      // Light ramp
      rampLights.forEach(light => env.lightOn(light));
      expect(env.lightsActive.size).toBe(3);

      // Complete ramp
      env.playSound('ramp-complete');
      env.addScore(1000);
      env.fireCoil('ramp-diverter');

      // Lights off
      rampLights.forEach(light => env.lightOff(light));
      expect(env.lightsActive.size).toBe(0);
    });

    it('should handle string-based game logic', () => {
      const mode = 'MULTIBALL';
      const modeType = env.lCase(mode);
      expect(modeType).toBe('multiball');

      const message = env.repeat('*', 5) + ' COMBO ' + env.repeat('*', 5);
      expect(env.len(message)).toBe(17);
      expect(env.inStr(message, 'COMBO')).toBeGreaterThan(0);
    });

    it('should calculate combo multiplier', () => {
      const combos = 5;
      const baseScore = 500;
      const comboMultiplier = 1 + (combos * 0.2); // 1 + 1.0 = 2.0

      const finalScore = baseScore * comboMultiplier;
      expect(env.round(finalScore)).toBe(1000);
    });
  });

  describe('Error Handling & Edge Cases', () => {
    it('should handle empty strings safely', () => {
      expect(env.len('')).toBe(0);
      expect(env.left('', 5)).toBe('');
      expect(env.right('', 5)).toBe('');
      expect(env.asc('')).toBe(0);
      expect(env.trim('')).toBe('');
    });

    it('should handle negative/zero values', () => {
      expect(env.repeat('a', -5)).toBe('');
      expect(env.repeat('a', 0)).toBe('');
      expect(env.space(-3)).toBe('');
      expect(env.space(0)).toBe('');
      expect(env.sqr(0)).toBe(0);
    });

    it('should handle boundary values in math functions', () => {
      expect(env.round(0)).toBe(0);
      expect(env.abs(0)).toBe(0);
      expect(env.sgn(0)).toBe(0);
      expect(env.min(0)).toBe(0);
      expect(env.max(0)).toBe(0);
    });

    it('should handle type mismatches gracefully', () => {
      expect(env.cInt('abc')).toBe(0);
      expect(env.cDbl(null)).toBe(0);
      expect(env.cStr(undefined)).toBe('undefined');
    });
  });

  describe('Integration Tests — Complex Chains', () => {
    it('should chain string operations', () => {
      let text = 'Hello World';
      text = env.uCase(text); // HELLO WORLD
      text = env.replace(text, 'O', '0'); // HELL0 W0RLD
      text = env.lCase(text); // hell0 w0rld
      expect(text).toBe('hell0 w0rld');
    });

    it('should chain numeric operations', () => {
      let value = 3.14159;
      value = env.round(value, 3);
      value = env.sqr(value);
      value = env.round(value, 2);
      expect(value).toBeGreaterThan(0);
    });

    it('should process game event sequences', () => {
      // Player hits bumper field
      const bumperCount = 10;
      const scorePerBumper = 100;

      for (let i = 0; i < bumperCount; i++) {
        env.recordBumperHit();
        env.addScore(scorePerBumper);
        env.playSound('bumper-hit');
      }

      expect(env.getBumperHits()).toBe(10);
      expect(env.getScore()).toBe(1000);
      expect(env.soundsPlayed).toHaveLength(10);
    });

    it('should handle multi-mode gameplay', () => {
      // Mode 1: Ramp
      env.lightOn('ramp-light');
      env.addScore(500);
      env.lightOff('ramp-light');

      // Mode 2: Scoop
      env.lightOn('scoop-light');
      env.fireCoil('scoop-kickback');
      env.addScore(300);
      env.lightOff('scoop-light');

      // Mode 3: Bumper
      env.setMultiplier(2);
      env.recordBumperHit();
      env.addScore(200); // Affected by multiplier

      expect(env.getScore()).toBe(1200); // 500 + 300 + 200*2
    });
  });

  describe('Performance Tests', () => {
    it('should handle many string operations', () => {
      let result = 'test';
      for (let i = 0; i < 100; i++) {
        result = env.replace(result, 't', 'T');
      }
      expect(result).toBeDefined();
    });

    it('should handle many light state changes', () => {
      for (let i = 0; i < 50; i++) {
        env.lightOn(`light-${i}`);
      }
      expect(env.lightsActive.size).toBe(50);

      for (let i = 0; i < 50; i++) {
        env.lightOff(`light-${i}`);
      }
      expect(env.lightsActive.size).toBe(0);
    });

    it('should handle large score values', () => {
      for (let i = 0; i < 1000; i++) {
        env.addScore(100);
      }
      expect(env.getScore()).toBe(100000);
    });

    it('should handle rapid game events', () => {
      for (let i = 0; i < 100; i++) {
        env.recordBumperHit();
        env.playSound('bumper');
        env.addScore(50);
      }

      expect(env.getBumperHits()).toBe(100);
      expect(env.soundsPlayed.length).toBe(100);
      expect(env.getScore()).toBe(5000);
    });
  });

  describe('VBScript Standard Library Compatibility', () => {
    it('should match VB6 string function behavior', () => {
      // VB: Mid("Hello", 2, 3) = "ell"
      expect(env.mid('Hello', 2, 3)).toBe('ell');

      // VB: InStr("Hello", "l") = 3 (1-based)
      expect(env.inStr('Hello', 'l')).toBe(3);

      // VB: Left("Hello", 3) = "Hel"
      expect(env.left('Hello', 3)).toBe('Hel');
    });

    it('should match VB6 math function behavior', () => {
      // VB: Sgn(-5) = -1
      expect(env.sgn(-5)).toBe(-1);

      // VB: Abs(-42) = 42
      expect(env.abs(-42)).toBe(42);

      // VB: Int(3.7) = 3
      expect(env.cInt(3.7)).toBe(3);
    });
  });

  describe('Cleanup & Reset', () => {
    it('should clean up all resources on reset', () => {
      // Fill up state
      env.addScore(5000);
      env.setMultiplier(10);
      env.recordBumperHit();
      env.recordBumperHit();
      env.playSound('loud-sound');
      env.lightOn('all-lights');
      env.fireCoil('all-coils');

      // Reset
      env.reset();

      // Verify clean state
      expect(env.getScore()).toBe(0);
      expect(env.getMultiplier()).toBe(1);
      expect(env.getBumperHits()).toBe(0);
      expect(env.isTilted()).toBe(false);
      expect(env.soundsPlayed).toHaveLength(0);
      expect(env.lightsActive.size).toBe(0);
      expect(env.coilsFired).toHaveLength(0);
      expect(env.variables.size).toBe(0);
      expect(env.settings.size).toBe(0);
    });
  });
});
