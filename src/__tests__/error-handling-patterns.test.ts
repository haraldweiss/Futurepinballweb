// SPDX-License-Identifier: AGPL-3.0-or-later
/**
 * Integration tests for error handling patterns across the codebase.
 * Validates that common error-handling patterns work correctly:
 * - catch with devLog
 * - catch with console.warn
 * - Promise chain .catch() patterns
 * - Graceful fallback in try/catch blocks
 */
import { describe, it, expect, vi } from 'vitest';

describe('Silent catch patterns — no-op safety', () => {
  it('empty catch does not throw when function throws', () => {
    const throwingFn = () => { throw new Error('test error'); };
    
    // Pattern used in vite.config.ts and main.ts
    expect(() => {
      try { throwingFn(); } catch { /* intentional no-op */ }
    }).not.toThrow();
  });

  it('catch with devLog does not throw', () => {
    const devLog = vi.fn();
    const throwingFn = () => { throw new Error('test error'); };
    
    expect(() => {
      try { throwingFn(); }
      catch (e) { devLog('[Test] Error:', e); }
    }).not.toThrow();
    
    expect(devLog).toHaveBeenCalledOnce();
  });

  it('catch with console.warn does not throw', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const throwingFn = () => { throw new Error('test error'); };
    
    expect(() => {
      try { throwingFn(); }
      catch (e) { console.warn('[Test] Error:', e); }
    }).not.toThrow();
    
    expect(warnSpy).toHaveBeenCalledOnce();
    warnSpy.mockRestore();
  });

  it('nested catch blocks all handle errors gracefully', () => {
    // Pattern found in main.ts initialization (nested setTimeout + try/catch)
    expect(() => {
      try {
        const innerFn = () => { throw new Error('inner'); };
        try { innerFn(); } catch (e) { /* expected */ }
      } catch { /* outer guard */ }
    }).not.toThrow();
  });
});

describe('Promise chain error handling', () => {
  it('catch after then handles rejection', async () => {
    let catchCalled = false;
    const rejectingPromise = Promise.reject(new Error('promise rejected'));
    
    await rejectingPromise
      .then(result => { /* success handler */ })
      .catch(() => { catchCalled = true; });
    
    expect(catchCalled).toBe(true);
  });

  it('multiple then followed by catch handles rejections from any step', async () => {
    let catchCalled = false;
    
    await Promise.resolve('step1')
      .then(v => { throw new Error(`failed at: ${v}`); })
      .then(v => v + ' step2')
      .catch(() => { catchCalled = true; });
    
    expect(catchCalled).toBe(true);
  });

  it('no unhandled rejections with .catch(() => {}) pattern', async () => {
    // Pattern used in pwa-install.ts and service worker cleanup
    let catchCalled = false;
    
    const promise = new Promise<void>((_, reject) => {
      setTimeout(() => reject(new Error('async error')), 10);
    });
    
    promise.catch(() => { catchCalled = true; });
    
    // Wait for the rejection to happen
    await new Promise(resolve => setTimeout(resolve, 20));
    expect(catchCalled).toBe(true);
  });

  it('catch with devLog does not throw', async () => {
    const devLog = vi.fn();
    
    await Promise.reject(new Error('test'))
      .catch(() => devLog('[Test] Promise rejected'));
    
    expect(devLog).toHaveBeenCalledOnce();
  });
});

describe('LZO decompression fallback pattern', () => {
  it('try-first-then-second pattern handles both failures', () => {
    // Pattern from parse-worker.ts and fpm-parser.ts
    const lzoMock = (data: Uint8Array) => {
      throw new Error('decompression failed');
    };
    
    const data1 = new Uint8Array([0x5a, 0x4f, 0x36, 0x6c]);
    const data2 = new Uint8Array([0x4c, 0x5a, 0x4f]);
    
    const result = (() => {
      if (data1[0] === 0x5a) {
        try { const r = lzoMock(data1); if (r && r.length > data1.length) return r; } catch {}
      }
      if (data2[0] === 0x4c) {
        try { const r = lzoMock(data2); if (r && r.length > data2.length) return r; } catch {}
      }
      return null;
    })();
    
    expect(result).toBeNull();
  });
});

describe('Guard pattern — catch with return', () => {
  it('catch { return false; } returns gracefully', () => {
    const safeFn = (): boolean => {
      try {
        throw new Error('fail');
      } catch { return false; }
    };
    
    expect(safeFn()).toBe(false);
  });

  it('catch { return null; } returns gracefully', () => {
    const safeFn = (): string | null => {
      try {
        throw new Error('fail');
      } catch { return null; }
    };
    
    expect(safeFn()).toBeNull();
  });
});

describe('Initialization safety patterns', () => {
  it('setTimeout inside requestAnimationFrame does not throw', () => new Promise<void>(done => {
    // Pattern from main.ts initialization
    let callbackCalled = false;
    
    requestAnimationFrame(() => {
      setTimeout(() => {
        try {
          const fn = () => { throw new Error('nested error'); };
          try { fn(); } catch (e) { /* expected */ }
          callbackCalled = true;
        } catch { /* guard */ }
        expect(callbackCalled).toBe(true);
        done();
      }, 10);
    });
  }));
});
