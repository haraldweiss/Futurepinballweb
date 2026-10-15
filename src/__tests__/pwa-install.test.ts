import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { initPWAInstall } from '../app/pwa-install';

describe('PWA service worker registration', () => {
  let onLoad: (() => void) | undefined;
  const register = vi.fn();

  beforeEach(() => {
    vi.stubEnv('DEV', false);
    vi.stubGlobal('navigator', { serviceWorker: { register } });
    vi.stubGlobal('location', { protocol: 'https:' });
    register.mockResolvedValue({});
    onLoad = undefined;
    vi.spyOn(window, 'addEventListener').mockImplementation((type, listener) => {
      if (type === 'load') onLoad = listener as () => void;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    register.mockReset();
  });

  it('does not register a web service worker inside the file-based desktop app', () => {
    vi.stubGlobal('location', { protocol: 'file:' });
    initPWAInstall();
    onLoad?.();
    expect(register).not.toHaveBeenCalled();
  });

  it('registers the service worker for the production website', () => {
    initPWAInstall();
    onLoad?.();
    expect(register).toHaveBeenCalledWith('/sw.js');
  });

  it('reports registration rejection without an unhandled promise', async () => {
    const error = new Error('Registration unavailable');
    register.mockRejectedValue(error);
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => {});
    initPWAInstall();
    onLoad?.();
    await Promise.resolve();
    expect(warning).toHaveBeenCalledWith('[PWA] Service worker registration failed', error);
  });
});
