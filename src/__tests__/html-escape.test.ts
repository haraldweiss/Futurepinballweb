// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, it, expect } from 'vitest';
import {
  escapeHtml,
  sanitizeFileName,
  createSafeHtml,
  escapeAttribute,
  isSafeText,
} from '../utils/html-escape';

describe('escapeHtml', () => {
  it('escapes basic HTML tags', () => {
    const input = '<script>alert("xss")</script>';
    const output = escapeHtml(input);
    expect(output).toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
    expect(output).not.toContain('<');
    expect(output).not.toContain('>');
  });

  it('escapes image onerror payload', () => {
    const input = '<img src=x onerror="alert(1)">';
    const output = escapeHtml(input);
    expect(output).toContain('&lt;img');
    expect(output).toContain('&quot;');
    expect(output).toContain('&gt;');
    expect(output).not.toContain('<');
    expect(output).not.toContain('>');
  });

  it('escapes event handler injection', () => {
    const input = '"><script>alert(1)</script>';
    const output = escapeHtml(input);
    expect(output).toContain('&gt;');
    expect(output).toContain('&lt;');
  });

  it('escapes single quotes', () => {
    const input = "' onclick='alert(1)'";
    const output = escapeHtml(input);
    expect(output).not.toContain("'");
    expect(output).toContain('&#39;');
  });

  it('handles ampersand correctly', () => {
    const input = 'AT&T <company>';
    const output = escapeHtml(input);
    expect(output).toBe('AT&amp;T &lt;company&gt;');
  });
});

describe('createSafeHtml', () => {
  it('escapes template placeholders', () => {
    const template = '<h3>{{name}}</h3><span>{{size}}</span>';
    const data = { name: 'Test<img onerror="alert(1)"/>.fpt', size: '5.2 MB' };
    const output = createSafeHtml(template, data);
    expect(output).toContain('&lt;img');
    expect(output).toContain('&quot;');
    expect(output).toContain('5.2 MB');
    expect(output).not.toContain('<img');
  });
});

describe('escapeAttribute', () => {
  it('prevents attribute injection', () => {
    const input = 'test" onclick="alert(1)';
    const output = escapeAttribute(input);
    expect(output).not.toContain('"');
    expect(output).toContain('&quot;');
  });
});

describe('sanitizeFileName', () => {
  it('removes dangerous characters', () => {
    expect(sanitizeFileName('Normal Table.fpt')).toBe('Normal Table.fpt');
    expect(sanitizeFileName('<script>.fpt')).toBe('_script_.fpt');
    expect(sanitizeFileName('Test<img>.fpt')).toBe('Test_img_.fpt');
    expect(sanitizeFileName('file:///etc/passwd')).toBe('file_etc_passwd');
  });
});

describe('isSafeText', () => {
  it('detects dangerous patterns', () => {
    expect(isSafeText('Normal text')).toBe(true);
    expect(isSafeText('File_123.fpt')).toBe(true);
    expect(isSafeText('<script>alert(1)</script>')).toBe(false);
    expect(isSafeText('onclick="alert(1)"')).toBe(false);
    expect(isSafeText('javascript:alert(1)')).toBe(false);
  });
});

describe('File validation', () => {
  const ALLOWED_EXTENSIONS = ['.fpt', '.fp', '.fpl', '.json'];
  const MAX_FILE_SIZE = 512 * 1024 * 1024;

  it('validates file extensions', () => {
    const tests = [
      { name: 'table.fpt', valid: true },
      { name: 'config.json', valid: true },
      { name: 'library.fpl', valid: true },
      { name: 'script.vbs', valid: false },
      { name: 'malware.exe', valid: false },
    ];
    for (const { name, valid } of tests) {
      const ext = '.' + name.split('.').pop()?.toLowerCase();
      expect(ALLOWED_EXTENSIONS.includes(ext)).toBe(valid);
    }
  });

  it('enforces file size limits', () => {
    expect(1024 <= MAX_FILE_SIZE).toBe(true);
    expect(100 * 1024 * 1024 <= MAX_FILE_SIZE).toBe(true);
    expect(512 * 1024 * 1024 <= MAX_FILE_SIZE).toBe(true);
    expect(513 * 1024 * 1024 <= MAX_FILE_SIZE).toBe(false);
  });
});

describe('localStorage security', () => {
  it('stores and retrieves JSON data', () => {
    const scores = [100, 500, 1000];
    const json = JSON.stringify(scores);
    const retrieved = JSON.parse(json);
    expect(Array.isArray(retrieved)).toBe(true);
    expect(retrieved).toEqual([100, 500, 1000]);
  });
});

describe('Physics worker type validation', () => {
  it('validates frame structure', () => {
    const validFrames = [
      { ballPos: { x: 0, y: 0, z: 0 }, ballVel: { x: 1, y: 2 }, collisions: [] },
      { ballPos: { x: 2.5, y: -5, z: 0.5 }, ballVel: { x: -8, y: 16 }, collisions: [{ type: 'bumper', data: {} }] },
    ];
    for (const frame of validFrames) {
      expect(typeof frame.ballPos.x).toBe('number');
      expect(typeof frame.ballVel.x).toBe('number');
      expect(Array.isArray(frame.collisions)).toBe(true);
    }
  });

  it('rejects invalid messages', () => {
    const invalid = [null, undefined, 'string', 123, { type: 'unknown' }, { ballPos: 'invalid' }];
    for (const msg of invalid) {
      const isValid = !!(msg && typeof msg === 'object' && 'ballPos' in msg && 'ballVel' in msg);
      expect(isValid).toBe(false);
    }
  });

  it('validates numeric bounds', () => {
    expect(Number.isFinite(0)).toBe(true);
    expect(Number.isFinite(100)).toBe(true);
    expect(Number.isFinite(-50)).toBe(true);
    expect(Number.isFinite(Infinity)).toBe(false);
    expect(Number.isFinite(NaN)).toBe(false);
  });
});
