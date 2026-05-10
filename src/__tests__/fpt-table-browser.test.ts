import { describe, it, expect } from 'vitest';
import { filterEntries, sortEntries, type SortKey } from '../fpt-render/fpt-table-browser';
import type { FPTFileEntry } from '../fpt-render/fpt-table-scanner';

const ENTRIES: FPTFileEntry[] = [
  { path: '/a/Willow.fpt', name: 'Willow', size: 60_000_000, mtime: 3000 },
  { path: '/a/Pharaoh.fpt', name: "Pharaoh's Gold", size: 30_000_000, mtime: 1000 },
  { path: '/a/zwillow.fpt', name: 'ZWillow', size: 5_000_000, mtime: 2000 },
];

describe('filterEntries', () => {
  it('returns all entries for empty query', () => {
    expect(filterEntries(ENTRIES, '')).toEqual(ENTRIES);
  });

  it('matches case-insensitive substring of name', () => {
    const r = filterEntries(ENTRIES, 'will');
    expect(r.map(e => e.name)).toEqual(['Willow', 'ZWillow']);
  });

  it('returns [] when nothing matches', () => {
    expect(filterEntries(ENTRIES, 'xyz')).toEqual([]);
  });

  it('trims whitespace from query', () => {
    expect(filterEntries(ENTRIES, '  will  ')).toHaveLength(2);
  });
});

describe('sortEntries', () => {
  it('sorts by name ascending', () => {
    const r = sortEntries(ENTRIES, 'name');
    expect(r.map(e => e.name)).toEqual(["Pharaoh's Gold", 'Willow', 'ZWillow']);
  });

  it('sorts by size descending', () => {
    const r = sortEntries(ENTRIES, 'size');
    expect(r.map(e => e.name)).toEqual(['Willow', "Pharaoh's Gold", 'ZWillow']);
  });

  it('sorts by mtime descending (newest first)', () => {
    const r = sortEntries(ENTRIES, 'mtime');
    expect(r.map(e => e.name)).toEqual(['Willow', 'ZWillow', "Pharaoh's Gold"]);
  });

  it('does not mutate the input', () => {
    const copy = [...ENTRIES];
    sortEntries(copy, 'name');
    expect(copy).toEqual(ENTRIES);
  });
});
