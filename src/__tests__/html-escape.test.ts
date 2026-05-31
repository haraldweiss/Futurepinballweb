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
