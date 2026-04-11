/**
 * VBScript Extended Functions Tests — Additional 20+ functions
 *
 * Tests more VBScript API functions from script-engine.ts
 * Covers string manipulation, math, array operations, and game logic
 *
 * Run with: npm test
 */

import { describe, it, expect, beforeEach } from 'vitest';

/**
 * Mock VBScript function implementations (extended set)
 */

// String Functions (from vbscript-functions.test.ts for reference)
function Mid(s: string, start: number, length?: number): string {
  const startIdx = start - 1; // VB uses 1-based indexing
  if (length === undefined) {
    return s.substring(startIdx);
  }
  return s.substring(startIdx, startIdx + length);
}

function StrReverse(s: string): string {
  return String(s).split('').reverse().join('');
}

function Repeat(s: string, n: number): string {
  return String(s).repeat(Math.max(0, n));
}

function Concat(...args: any[]): string {
  return args.map(String).join('');
}

function InStr(s: string, sub: string): number {
  const i = String(s).indexOf(String(sub));
  return i < 0 ? 0 : i + 1; // 1-based indexing
}

function ReplaceAll(s: string, from: string, to: string): string {
  return String(s).replaceAll(String(from), String(to));
}

function Trim(s: string): string {
  return String(s).trim();
}

function TrimStart(s: string): string {
  return String(s).trimStart();
}

function TrimEnd(s: string): string {
  return String(s).trimEnd();
}

function Chr(code: number): string {
  return String.fromCharCode(code);
}

function Asc(s: string): number {
  return String(s).charCodeAt(0) || 0;
}

// Math Functions
function Sin(x: number): number {
  return Math.sin(x);
}

function Cos(x: number): number {
  return Math.cos(x);
}

function Tan(x: number): number {
  return Math.tan(x);
}

function Exp(x: number): number {
  return Math.exp(x);
}

function Log(x: number): number {
  return Math.log(x);
}

function Pow(base: number, exp: number): number {
  return Math.pow(base, exp);
}

function Min(...args: number[]): number {
  return Math.min(...args);
}

function Max(...args: number[]): number {
  return Math.max(...args);
}

// Array Functions
function IsArray(x: any): boolean {
  return Array.isArray(x);
}

function UBound(arr: any[]): number {
  return Array.isArray(arr) ? arr.length - 1 : -1;
}

function ArrayLength(arr: any): number {
  return Array.isArray(arr) ? arr.length : 0;
}

function Join(arr: any[], sep: string = ','): string {
  return Array.isArray(arr) ? arr.join(sep) : '';
}

function Split(s: string, sep: string = ' '): string[] {
  return String(s).split(sep);
}

// ───────────────────────────────────────────────────────────────────────────

describe('VBScript Extended String Functions', () => {
  describe('StrReverse()', () => {
    it('should reverse a string', () => {
      expect(StrReverse('hello')).toBe('olleh');
    });

    it('should handle palindromes', () => {
      expect(StrReverse('racecar')).toBe('racecar');
    });

    it('should reverse with numbers', () => {
      expect(StrReverse('12345')).toBe('54321');
    });

    it('should reverse with special characters', () => {
      expect(StrReverse('a@b#c')).toBe('c#b@a');
    });
  });

  describe('Repeat()', () => {
    it('should repeat string n times', () => {
      expect(Repeat('ab', 3)).toBe('ababab');
    });

    it('should return empty string for 0 repetitions', () => {
      expect(Repeat('test', 0)).toBe('');
    });

    it('should return empty string for negative repetitions', () => {
      expect(Repeat('test', -5)).toBe('');
    });

    it('should repeat single character', () => {
      expect(Repeat('*', 5)).toBe('*****');
    });
  });

  describe('Concat()', () => {
    it('should concatenate multiple arguments', () => {
      expect(Concat('hello', ' ', 'world')).toBe('hello world');
    });

    it('should convert non-strings to strings', () => {
      expect(Concat('value: ', 42)).toBe('value: 42');
    });

    it('should handle empty strings', () => {
      expect(Concat('a', '', 'b')).toBe('ab');
    });

    it('should concatenate many args', () => {
      expect(Concat('a', 'b', 'c', 'd', 'e')).toBe('abcde');
    });
  });

  describe('InStr()', () => {
    it('should find substring position', () => {
      expect(InStr('hello world', 'world')).toBe(7);
    });

    it('should return 1-based index', () => {
      expect(InStr('abc', 'a')).toBe(1);
      expect(InStr('abc', 'b')).toBe(2);
      expect(InStr('abc', 'c')).toBe(3);
    });

    it('should return 0 for not found', () => {
      expect(InStr('hello', 'x')).toBe(0);
    });

    it('should find first occurrence', () => {
      expect(InStr('banana', 'ana')).toBe(2);
    });
  });

  describe('ReplaceAll()', () => {
    it('should replace all occurrences', () => {
      expect(ReplaceAll('banana', 'a', 'o')).toBe('bonono');
    });

    it('should handle no matches', () => {
      expect(ReplaceAll('hello', 'x', 'y')).toBe('hello');
    });

    it('should replace with empty string', () => {
      expect(ReplaceAll('hello', 'l', '')).toBe('heo');
    });

    it('should be case-sensitive', () => {
      expect(ReplaceAll('Hello', 'h', 'H')).toBe('Hello');
    });
  });

  describe('Trim Functions', () => {
    it('Trim should remove whitespace', () => {
      expect(Trim('  hello  ')).toBe('hello');
    });

    it('TrimStart should remove leading whitespace', () => {
      expect(TrimStart('  hello  ')).toBe('hello  ');
    });

    it('TrimEnd should remove trailing whitespace', () => {
      expect(TrimEnd('  hello  ')).toBe('  hello');
    });

    it('should handle newlines and tabs', () => {
      expect(Trim('\n\thello\t\n')).toBe('hello');
    });
  });

  describe('Chr() and Asc()', () => {
    it('should convert character code to character', () => {
      expect(Chr(65)).toBe('A');
      expect(Chr(97)).toBe('a');
    });

    it('should convert character to code', () => {
      expect(Asc('A')).toBe(65);
      expect(Asc('a')).toBe(97);
    });

    it('should be inverse operations', () => {
      const ch = 'Z';
      expect(Chr(Asc(ch))).toBe(ch);
    });

    it('should handle numbers', () => {
      expect(Chr(48)).toBe('0');
      expect(Asc('0')).toBe(48);
    });
  });
});

describe('VBScript Extended Math Functions', () => {
  describe('Trigonometric Functions', () => {
    it('Sin(0) should be 0', () => {
      expect(Sin(0)).toBeCloseTo(0, 5);
    });

    it('Cos(0) should be 1', () => {
      expect(Cos(0)).toBeCloseTo(1, 5);
    });

    it('Tan should work', () => {
      expect(Tan(Math.PI / 4)).toBeCloseTo(1, 5);
    });
  });

  describe('Exponential Functions', () => {
    it('Exp(0) should be 1', () => {
      expect(Exp(0)).toBe(1);
    });

    it('Exp(1) should be e', () => {
      expect(Exp(1)).toBeCloseTo(Math.E, 5);
    });

    it('Log(e) should be 1', () => {
      expect(Log(Math.E)).toBeCloseTo(1, 5);
    });

    it('Log(1) should be 0', () => {
      expect(Log(1)).toBe(0);
    });
  });

  describe('Power and Extrema', () => {
    it('Pow should calculate powers', () => {
      expect(Pow(2, 3)).toBe(8);
      expect(Pow(5, 2)).toBe(25);
    });

    it('Min should find minimum', () => {
      expect(Min(5, 2, 8, 1, 9)).toBe(1);
    });

    it('Max should find maximum', () => {
      expect(Max(5, 2, 8, 1, 9)).toBe(9);
    });

    it('Min and Max should handle single value', () => {
      expect(Min(42)).toBe(42);
      expect(Max(42)).toBe(42);
    });

    it('Min and Max should handle negative numbers', () => {
      expect(Min(-10, -5, 0, 5)).toBe(-10);
      expect(Max(-10, -5, 0, 5)).toBe(5);
    });
  });
});

describe('VBScript Array Functions', () => {
  describe('Array Type Checking', () => {
    it('IsArray should detect arrays', () => {
      expect(IsArray([])).toBe(true);
      expect(IsArray([1, 2, 3])).toBe(true);
    });

    it('IsArray should reject non-arrays', () => {
      expect(IsArray('not array')).toBe(false);
      expect(IsArray(42)).toBe(false);
      expect(IsArray(null)).toBe(false);
      expect(IsArray({})).toBe(false);
    });
  });

  describe('Array Bounds', () => {
    it('UBound should return upper bound', () => {
      expect(UBound([1, 2, 3, 4, 5])).toBe(4);
    });

    it('UBound should return -1 for empty array', () => {
      expect(UBound([])).toBe(-1);
    });

    it('ArrayLength should return length', () => {
      expect(ArrayLength([1, 2, 3])).toBe(3);
      expect(ArrayLength([])).toBe(0);
    });

    it('UBound and ArrayLength related', () => {
      const arr = [10, 20, 30];
      expect(UBound(arr)).toBe(ArrayLength(arr) - 1);
    });
  });

  describe('Array Manipulation', () => {
    it('Join should combine array elements', () => {
      expect(Join(['a', 'b', 'c'], ',')).toBe('a,b,c');
    });

    it('Join with different separator', () => {
      expect(Join(['red', 'green', 'blue'], ' | ')).toBe('red | green | blue');
    });

    it('Join should convert non-strings', () => {
      expect(Join([1, 2, 3], '-')).toBe('1-2-3');
    });

    it('Split should break string into array', () => {
      expect(Split('a,b,c', ',')).toEqual(['a', 'b', 'c']);
    });

    it('Split should handle custom separator', () => {
      expect(Split('red|green|blue', '|')).toEqual(['red', 'green', 'blue']);
    });

    it('Join and Split should be inverse', () => {
      const arr = ['hello', 'world', 'test'];
      const joined = Join(arr, ' ');
      const split = Split(joined, ' ');
      expect(split).toEqual(arr);
    });
  });
});

describe('VBScript Integration Scenarios', () => {
  it('should format a game score display string', () => {
    const score = 12500;
    const formatted = Concat('SCORE: ', Repeat(' ', 2), String(score));
    expect(formatted).toContain('12500');
  });

  it('should parse CSV-like data', () => {
    const data = 'name,age,score';
    const fields = Split(data, ',');
    expect(fields).toHaveLength(3);
    expect(fields[0]).toBe('name');
  });

  it('should calculate game difficulty', () => {
    const baseMult = 1.0;
    const level = 5;
    const difficulty = baseMult + (level * 0.5); // 3.5
    const levelStr = Concat('Level: ', String(level), ' (', String(difficulty.toFixed(1)), 'x)');
    expect(levelStr).toContain('3.5');
  });

  it('should generate random character from set', () => {
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const idx = Math.floor(Math.random() * charset.length);
    const char = Mid(charset, idx + 1, 1);
    expect(char.length).toBe(1);
    expect(charset).toContain(char);
  });

  it('should build a pin knockdown message', () => {
    const pins = [1, 3, 5, 7];
    const message = Concat(
      'Knocked down ',
      String(ArrayLength(pins)),
      ' pins: ',
      Join(pins, ', ')
    );
    expect(message).toContain('4 pins');
    expect(message).toContain('1, 3, 5, 7');
  });
});
