// SPDX-License-Identifier: AGPL-3.0-or-later
const timeouts = new Set<ReturnType<typeof setTimeout>>();
const intervals = new Set<ReturnType<typeof setInterval>>();

export function scriptTimeout(callback: () => void, delay: number): ReturnType<typeof setTimeout> {
  const id = setTimeout(() => { timeouts.delete(id); callback(); }, delay);
  timeouts.add(id); return id;
}

export function scriptInterval(callback: () => void, delay: number): ReturnType<typeof setInterval> {
  const id = setInterval(callback, delay); intervals.add(id); return id;
}

export function cancelScriptTimeout(id: unknown): void {
  const handle = id as ReturnType<typeof setTimeout>;
  if (timeouts.delete(handle)) clearTimeout(handle);
}

export function cancelScriptInterval(id: unknown): void {
  const handle = id as ReturnType<typeof setInterval>;
  if (intervals.delete(handle)) clearInterval(handle);
}

export function isScriptIntervalActive(id: unknown): boolean {
  return intervals.has(id as ReturnType<typeof setInterval>);
}

export function disposeScriptTimers(): void {
  for (const id of timeouts) clearTimeout(id);
  for (const id of intervals) clearInterval(id);
  timeouts.clear(); intervals.clear();
}
