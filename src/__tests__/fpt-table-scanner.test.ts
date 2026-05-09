// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { scanFPTDirectory, type FPTFileEntry } from '../fpt-render/fpt-table-scanner';

describe('scanFPTDirectory', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    delete (window as any).electronAPI;
  });

  it('returns an empty array when electronAPI is unavailable', async () => {
    const result = await scanFPTDirectory('/some/path');
    expect(result).toEqual([]);
  });
});

describe('scanFPTDirectory with electronAPI', () => {
  beforeEach(() => {
    (window as any).electronAPI = {
      scanFPTDirectory: vi.fn().mockResolvedValue([
        { path: '/a/Willow.fpt', name: 'Willow', size: 12345, mtime: 1000 },
        { path: '/a/Pharaoh.fpt', name: 'Pharaoh', size: 6789, mtime: 2000 },
      ]),
    };
  });

  it('returns entries from electronAPI', async () => {
    const result = await scanFPTDirectory('/a');
    expect(result).toHaveLength(2);
    expect(result[0].name).toBe('Willow');
  });

  it('returns [] when IPC throws', async () => {
    (window as any).electronAPI.scanFPTDirectory = vi.fn().mockRejectedValue(new Error('EACCES'));
    const result = await scanFPTDirectory('/a');
    expect(result).toEqual([]);
  });

  it('returns [] when IPC returns non-array', async () => {
    (window as any).electronAPI.scanFPTDirectory = vi.fn().mockResolvedValue(null);
    const result = await scanFPTDirectory('/a');
    expect(result).toEqual([]);
  });
});
