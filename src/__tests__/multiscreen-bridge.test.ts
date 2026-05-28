// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('../script-engine', () => ({ runFPScript: vi.fn(), resolveSoundForPlayback: vi.fn() }));
vi.mock('../audio-system', () => ({ getAudioCtx: vi.fn(), playFPTMusic: vi.fn() }));
vi.mock('cfb', () => ({}));

import { MultiScreenWindowManager } from '../multiscreen-window-manager';

describe('MultiScreenWindowManager Electron bridge', () => {
  beforeEach(() => {
    delete (window as any).electronAPI;
  });

  it('uses electronAPI.getAllDisplays when available', async () => {
    (window as any).electronAPI = {
      getAllDisplays: vi.fn().mockResolvedValue([
        { id: 1, label: 'Primary', bounds: { x: 0, y: 0, width: 1920, height: 1080 }, workArea: { x: 0, y: 0, width: 1920, height: 1040 }, scaleFactor: 1, rotation: 0, isPrimary: true, internal: false },
        { id: 2, label: 'Backglass', bounds: { x: 1920, y: 0, width: 1280, height: 1024 }, workArea: { x: 1920, y: 0, width: 1280, height: 1024 }, scaleFactor: 1, rotation: 0, isPrimary: false, internal: false },
        { id: 3, label: 'DMD', bounds: { x: 1920, y: 1024, width: 1280, height: 320 }, workArea: { x: 1920, y: 1024, width: 1280, height: 320 }, scaleFactor: 1, rotation: 0, isPrimary: false, internal: false },
      ]),
    };

    const mgr = new MultiScreenWindowManager();
    // Reset call count after constructor (which also triggers detectScreens)
    (window as any).electronAPI.getAllDisplays.mockClear();
    await mgr.detectScreens();
    expect((window as any).electronAPI.getAllDisplays).toHaveBeenCalledTimes(1);
    expect(mgr.getScreens().length).toBe(3);
  });

  it('falls back to browser API when electronAPI is not available', async () => {
    const mgr = new MultiScreenWindowManager();
    await mgr.detectScreens();
    expect(mgr.getScreens().length).toBeGreaterThanOrEqual(1);
  });
});
