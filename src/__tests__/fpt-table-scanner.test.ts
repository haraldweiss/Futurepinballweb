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
