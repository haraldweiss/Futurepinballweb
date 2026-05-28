import { describe, it, expect, beforeEach } from 'vitest';
import { getFPTPath, setFPTPath, clearFPTPath, FPT_PATH_KEY } from '../fpt-render/fpt-path-config';

describe('fpt-path-config', () => {
  beforeEach(() => {
    localStorage.removeItem(FPT_PATH_KEY);
  });

  it('returns null when no path is saved', () => {
    expect(getFPTPath()).toBeNull();
  });

  it('persists a path via setFPTPath + getFPTPath', () => {
    setFPTPath('/Users/me/Tables');
    expect(getFPTPath()).toBe('/Users/me/Tables');
  });

  it('clearFPTPath removes the saved value', () => {
    setFPTPath('/x');
    clearFPTPath();
    expect(getFPTPath()).toBeNull();
  });

  it('rejects empty paths', () => {
    setFPTPath('');
    expect(getFPTPath()).toBeNull();
  });

  it('rejects whitespace-only paths', () => {
    setFPTPath('   ');
    expect(getFPTPath()).toBeNull();
  });
});
