import { describe, it, expect, vi, beforeEach } from 'vitest';
import { filterEntries, sortEntries, renderTableList, type SortKey } from '../fpt-render/fpt-table-browser';
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

describe('renderTableList', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  it('renders one card per entry', () => {
    renderTableList(container, ENTRIES, () => {});
    const cards = container.querySelectorAll('.qm-fpt-card');
    expect(cards).toHaveLength(3);
  });

  it('shows the table name on each card', () => {
    renderTableList(container, ENTRIES, () => {});
    const names = Array.from(container.querySelectorAll('.qm-fpt-name')).map(el => el.textContent);
    expect(names).toEqual(['Willow', "Pharaoh's Gold", 'ZWillow']);
  });

  it('escapes user-controlled text (no HTML injection)', () => {
    const evil = [{ path: '/x.fpt', name: '<img src=x onerror=alert(1)>', size: 1, mtime: 1 }];
    renderTableList(container, evil, () => {});
    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('.qm-fpt-name')!.textContent).toContain('<img');
  });

  it('clears previous content before rendering', () => {
    const stale = document.createElement('span');
    stale.className = 'leftover';
    stale.textContent = 'x';
    container.appendChild(stale);
    renderTableList(container, ENTRIES, () => {});
    expect(container.querySelector('.leftover')).toBeNull();
  });

  it('calls onClick with the entry when card is clicked', () => {
    const handler = vi.fn();
    renderTableList(container, ENTRIES, handler);
    (container.querySelector('.qm-fpt-card') as HTMLElement).click();
    expect(handler).toHaveBeenCalledWith(ENTRIES[0]);
  });
});
