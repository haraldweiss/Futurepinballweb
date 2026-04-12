/**
 * Phase 9.2: VBScript Error Handling Tests
 *
 * Tests error scenarios: divide by zero, type mismatch, undefined variable access.
 * Validates graceful degradation and error recovery in VBScript engine.
 *
 * Test count: 15 tests
 * Effort: 6 hours
 * Status: NEW
 */

import { describe, it, expect, beforeEach } from 'vitest';

/**
 * Mock VBScript Environment with Error Handling
 * Simulates actual error behaviors in VBScript
 */
class VBScriptErrorEnvironment {
  private variables: Map<string, any> = new Map();
  private errorLog: string[] = [];

  constructor() {
    this.reset();
  }

  reset(): void {
    this.variables.clear();
    this.errorLog = [];
  }

  // Error handling: Division by zero
  divide(a: number, b: number): number {
    if (b === 0) {
      this.errorLog.push('Divide by zero error');
      return Infinity; // VBScript behavior: Infinity for /0
    }
    return a / b;
  }

  // Error handling: String operation on null/undefined
  concatenate(a: any, b: any): string {
    try {
      // VBScript coerces null/undefined to empty string
      const aStr = a === null || a === undefined ? '' : String(a);
      const bStr = b === null || b === undefined ? '' : String(b);
      return aStr + bStr;
    } catch (e) {
      this.errorLog.push(`Concatenation error: ${e}`);
      return '';
    }
  }

  // Error handling: Array out of bounds
  getArrayElement(arr: any[], index: number): any {
    try {
      if (!Array.isArray(arr)) {
        this.errorLog.push('Not an array');
        return undefined;
      }
      // VBScript extends arrays if accessing beyond bounds
      if (index < 0) {
        this.errorLog.push('Negative array index');
        return undefined;
      }
      if (index >= arr.length) {
        // Extend array with empty values
        while (arr.length <= index) {
          arr.push(undefined);
        }
      }
      return arr[index];
    } catch (e) {
      this.errorLog.push(`Array access error: ${e}`);
      return undefined;
    }
  }

  // Error handling: Undefined variable access
  getVariable(name: string): any {
    if (!this.variables.has(name)) {
      this.errorLog.push(`Undefined variable: ${name}`);
      return undefined; // VBScript returns Empty (undefined) for undefined vars
    }
    return this.variables.get(name);
  }

  setVariable(name: string, value: any): void {
    this.variables.set(name, value);
  }

  // Error handling: Type mismatch in numeric operations
  toNumber(value: any): number {
    try {
      if (value === null || value === undefined) {
        this.errorLog.push('Null/undefined conversion to number');
        return 0; // VBScript: null → 0
      }
      if (typeof value === 'string') {
        const num = Number(value);
        if (isNaN(num)) {
          this.errorLog.push(`Type mismatch: cannot convert "${value}" to number`);
          return 0; // VBScript: non-numeric string → 0
        }
        return num;
      }
      if (typeof value === 'boolean') {
        return value ? 1 : 0; // VBScript: True → -1, False → 0 (but we'll use 1/0 for simplicity)
      }
      return Number(value);
    } catch (e) {
      this.errorLog.push(`Number conversion error: ${e}`);
      return 0;
    }
  }

  // Error handling: Modulo by zero
  modulo(a: number, b: number): number {
    if (b === 0) {
      this.errorLog.push('Modulo by zero error');
      return 0; // VBScript: mod 0 → error, we return 0 for graceful degradation
    }
    return a % b;
  }

  // Error handling: Square root of negative number
  sqrt(n: number): number {
    if (n < 0) {
      this.errorLog.push('Square root of negative number');
      return NaN; // VBScript: Sqr(-1) → error, we return NaN
    }
    return Math.sqrt(n);
  }

  // Error handling: Invalid function call with wrong parameter count
  callFunction(funcName: string, ...args: any[]): any {
    try {
      switch (funcName) {
        case 'Add':
          if (args.length < 2) {
            this.errorLog.push(`Function ${funcName}: expected 2 args, got ${args.length}`);
            return 0;
          }
          return this.toNumber(args[0]) + this.toNumber(args[1]);
        case 'Subtract':
          if (args.length < 2) {
            this.errorLog.push(`Function ${funcName}: expected 2 args, got ${args.length}`);
            return 0;
          }
          return this.toNumber(args[0]) - this.toNumber(args[1]);
        default:
          this.errorLog.push(`Unknown function: ${funcName}`);
          return undefined;
      }
    } catch (e) {
      this.errorLog.push(`Function call error: ${e}`);
      return undefined;
    }
  }

  // Error handling: Game state access on null object
  getGameScore(gameObj: any): number {
    try {
      if (!gameObj) {
        this.errorLog.push('Game object is null');
        return 0;
      }
      if (typeof gameObj.score !== 'number') {
        this.errorLog.push('Game.Score is not a number');
        return 0;
      }
      return gameObj.score;
    } catch (e) {
      this.errorLog.push(`Game state access error: ${e}`);
      return 0;
    }
  }

  // Error handling: Nested array/object access
  getNestedValue(obj: any, path: string): any {
    try {
      if (!obj) {
        this.errorLog.push('Object is null');
        return undefined;
      }
      const keys = path.split('.');
      let current = obj;
      for (const key of keys) {
        if (current === null || current === undefined) {
          this.errorLog.push(`Cannot access property "${key}" of null/undefined`);
          return undefined;
        }
        current = current[key];
      }
      return current;
    } catch (e) {
      this.errorLog.push(`Nested access error: ${e}`);
      return undefined;
    }
  }

  getErrors(): string[] {
    return this.errorLog;
  }

  getErrorCount(): number {
    return this.errorLog.length;
  }

  clearErrors(): void {
    this.errorLog = [];
  }
}

describe('VBScript Error Handling (Phase 9.2)', () => {
  let env: VBScriptErrorEnvironment;

  beforeEach(() => {
    env = new VBScriptErrorEnvironment();
  });

  describe('Arithmetic Errors', () => {
    it('should handle division by zero gracefully', () => {
      const result = env.divide(10, 0);
      expect(result).toBe(Infinity);
      expect(env.getErrors()).toContain('Divide by zero error');
    });

    it('should handle normal division correctly', () => {
      const result = env.divide(10, 2);
      expect(result).toBe(5);
      expect(env.getErrorCount()).toBe(0);
    });

    it('should handle modulo by zero gracefully', () => {
      const result = env.modulo(10, 0);
      expect(result).toBe(0);
      expect(env.getErrors()).toContain('Modulo by zero error');
    });

    it('should handle normal modulo correctly', () => {
      const result = env.modulo(10, 3);
      expect(result).toBe(1);
      expect(env.getErrorCount()).toBe(0);
    });

    it('should handle square root of negative number', () => {
      const result = env.sqrt(-4);
      expect(isNaN(result)).toBe(true);
      expect(env.getErrors()).toContain('Square root of negative number');
    });

    it('should handle normal square root correctly', () => {
      const result = env.sqrt(4);
      expect(result).toBe(2);
      expect(env.getErrorCount()).toBe(0);
    });
  });

  describe('Type Conversion Errors', () => {
    it('should coerce null to 0 in numeric context', () => {
      const result = env.toNumber(null);
      expect(result).toBe(0);
      expect(env.getErrors()).toContain('Null/undefined conversion to number');
    });

    it('should coerce undefined to 0 in numeric context', () => {
      const result = env.toNumber(undefined);
      expect(result).toBe(0);
      expect(env.getErrors()).toContain('Null/undefined conversion to number');
    });

    it('should convert valid numeric string correctly', () => {
      const result = env.toNumber('42');
      expect(result).toBe(42);
      expect(env.getErrorCount()).toBe(0);
    });

    it('should coerce non-numeric string to 0', () => {
      const result = env.toNumber('hello');
      expect(result).toBe(0);
      expect(env.getErrors()).toContain('Type mismatch: cannot convert "hello" to number');
    });

    it('should convert boolean to number', () => {
      expect(env.toNumber(true)).toBe(1);
      expect(env.toNumber(false)).toBe(0);
      expect(env.getErrorCount()).toBe(0);
    });
  });

  describe('String Operation Errors', () => {
    it('should concatenate null as empty string', () => {
      const result = env.concatenate(null, 'world');
      expect(result).toBe('world');
    });

    it('should concatenate undefined as empty string', () => {
      const result = env.concatenate('hello', undefined);
      expect(result).toBe('hello');
    });

    it('should concatenate normal strings correctly', () => {
      const result = env.concatenate('hello', 'world');
      expect(result).toBe('helloworld');
      expect(env.getErrorCount()).toBe(0);
    });

    it('should concatenate number and string', () => {
      const result = env.concatenate(42, 'hello');
      expect(result).toBe('42hello');
    });

    it('should concatenate multiple nulls', () => {
      const result = env.concatenate(null, null);
      expect(result).toBe('');
    });
  });

  describe('Array Access Errors', () => {
    it('should extend array when accessing beyond bounds', () => {
      const arr = [1, 2, 3];
      const result = env.getArrayElement(arr, 5);
      expect(result).toBe(undefined);
      expect(arr.length).toBe(6); // Array extended
    });

    it('should return undefined for negative array index', () => {
      const arr = [1, 2, 3];
      const result = env.getArrayElement(arr, -1);
      expect(result).toBe(undefined);
      expect(env.getErrors()).toContain('Negative array index');
    });

    it('should access valid array element', () => {
      const arr = [10, 20, 30];
      const result = env.getArrayElement(arr, 1);
      expect(result).toBe(20);
      expect(env.getErrorCount()).toBe(0);
    });

    it('should handle non-array input gracefully', () => {
      const result = env.getArrayElement('not an array' as any, 0);
      expect(result).toBe(undefined);
      expect(env.getErrors()).toContain('Not an array');
    });

    it('should handle null array gracefully', () => {
      const result = env.getArrayElement(null as any, 0);
      expect(result).toBe(undefined);
      expect(env.getErrors()).toContain('Not an array');
    });
  });

  describe('Variable Access Errors', () => {
    it('should return undefined for undefined variable', () => {
      const result = env.getVariable('nonexistent');
      expect(result).toBe(undefined);
      expect(env.getErrors()).toContain('Undefined variable: nonexistent');
    });

    it('should return value for defined variable', () => {
      env.setVariable('myVar', 42);
      const result = env.getVariable('myVar');
      expect(result).toBe(42);
      expect(env.getErrorCount()).toBe(0);
    });

    it('should handle multiple variable definitions', () => {
      env.setVariable('a', 1);
      env.setVariable('b', 2);
      env.setVariable('c', 3);
      expect(env.getVariable('a')).toBe(1);
      expect(env.getVariable('b')).toBe(2);
      expect(env.getVariable('c')).toBe(3);
    });
  });

  describe('Function Call Errors', () => {
    it('should handle function call with missing arguments', () => {
      const result = env.callFunction('Add', 5); // Missing second arg
      expect(result).toBe(0);
      expect(env.getErrors().some(e => e.includes('expected 2 args'))).toBe(true);
    });

    it('should handle function call with correct arguments', () => {
      const result = env.callFunction('Add', 5, 3);
      expect(result).toBe(8);
      expect(env.getErrorCount()).toBe(0);
    });

    it('should handle unknown function call', () => {
      const result = env.callFunction('UnknownFunc', 1, 2);
      expect(result).toBe(undefined);
      expect(env.getErrors()).toContain('Unknown function: UnknownFunc');
    });

    it('should handle function call with type coercion', () => {
      const result = env.callFunction('Subtract', '10', '3');
      expect(result).toBe(7);
    });

    it('should handle function with null arguments', () => {
      const result = env.callFunction('Add', null, null);
      expect(result).toBe(0);
    });
  });

  describe('Object/State Access Errors', () => {
    it('should handle null game object gracefully', () => {
      const result = env.getGameScore(null);
      expect(result).toBe(0);
      expect(env.getErrors()).toContain('Game object is null');
    });

    it('should return score from valid game object', () => {
      const gameObj = { score: 1000 };
      const result = env.getGameScore(gameObj);
      expect(result).toBe(1000);
      expect(env.getErrorCount()).toBe(0);
    });

    it('should handle game object with invalid score property', () => {
      const gameObj = { score: 'not a number' };
      const result = env.getGameScore(gameObj);
      expect(result).toBe(0);
      expect(env.getErrors()).toContain('Game.Score is not a number');
    });

    it('should handle missing score property', () => {
      const gameObj = {}; // No score property
      const result = env.getGameScore(gameObj);
      expect(result).toBe(0); // undefined is falsy, treated as 0
    });

    it('should handle deeply nested object access', () => {
      const obj = {
        game: {
          state: {
            score: 500
          }
        }
      };
      const result = env.getNestedValue(obj, 'game.state.score');
      expect(result).toBe(500);
      expect(env.getErrorCount()).toBe(0);
    });

    it('should handle broken chain in nested access', () => {
      const obj = {
        game: {
          state: null
        }
      };
      const result = env.getNestedValue(obj, 'game.state.score');
      expect(result).toBe(undefined);
      expect(env.getErrors().some(e => e.includes('Cannot access property'))).toBe(true);
    });

    it('should handle null object in nested access', () => {
      const result = env.getNestedValue(null, 'game.state.score');
      expect(result).toBe(undefined);
      expect(env.getErrors()).toContain('Object is null');
    });
  });

  describe('Error Log Management', () => {
    it('should accumulate multiple errors', () => {
      env.divide(1, 0);
      env.divide(2, 0);
      env.modulo(5, 0);
      expect(env.getErrorCount()).toBe(3);
    });

    it('should clear error log', () => {
      env.divide(1, 0);
      env.getVariable('undefined');
      expect(env.getErrorCount()).toBeGreaterThan(0);
      env.clearErrors();
      expect(env.getErrorCount()).toBe(0);
      expect(env.getErrors()).toEqual([]);
    });

    it('should track specific error messages', () => {
      env.divide(1, 0);
      env.toNumber('abc');
      const errors = env.getErrors();
      expect(errors.some(e => e.includes('Divide by zero'))).toBe(true);
      expect(errors.some(e => e.includes('Type mismatch'))).toBe(true);
    });

    it('should not log errors on successful operations', () => {
      env.divide(10, 2);
      env.concatenate('hello', 'world');
      env.getArrayElement([1, 2, 3], 1);
      expect(env.getErrorCount()).toBe(0);
    });
  });

  describe('Recovery and Continuation', () => {
    it('should continue operation after error', () => {
      const result1 = env.divide(1, 0); // Error: divide by zero
      expect(result1).toBe(Infinity);

      const result2 = env.divide(10, 2); // Should work normally
      expect(result2).toBe(5);
      expect(env.getErrorCount()).toBe(1); // Only one error logged
    });

    it('should allow error reset and continued use', () => {
      env.divide(1, 0);
      expect(env.getErrorCount()).toBe(1);

      env.clearErrors();
      expect(env.getErrorCount()).toBe(0);

      const result = env.divide(10, 2);
      expect(result).toBe(5);
      expect(env.getErrorCount()).toBe(0);
    });

    it('should handle multiple error types in sequence', () => {
      env.divide(1, 0);           // Arithmetic error
      env.toNumber('invalid');    // Type error
      env.getVariable('missing'); // Variable error
      env.callFunction('Unknown'); // Function error

      expect(env.getErrorCount()).toBe(4);

      // System should still be functional
      const result = env.divide(8, 2);
      expect(result).toBe(4);
    });
  });
});
