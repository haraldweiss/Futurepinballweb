// SPDX-License-Identifier: AGPL-3.0-or-later
// © 2026 Harald Weiss

export function createTouchIndicator(x: number, y: number, color: string): HTMLElement {
  const indicator = document.createElement('div');
  indicator.style.position = 'fixed';
  indicator.style.left = `${x - 25}px`;
  indicator.style.top = `${y - 25}px`;
  indicator.style.width = '50px';
  indicator.style.height = '50px';
  indicator.style.borderRadius = '50%';
  indicator.style.backgroundColor = color;
  indicator.style.opacity = '0.5';
  indicator.style.pointerEvents = 'none';
  indicator.style.zIndex = '10000';
  indicator.style.border = `2px solid ${color}`;
  indicator.style.boxShadow = `0 0 20px ${color}`;
  indicator.style.animation = 'fadeIn 0.2s ease-out';
  return indicator;
}

export function updateTouchPosition(indicator: HTMLElement, x: number, y: number): void {
  indicator.style.left = `${x - 25}px`;
  indicator.style.top = `${y - 25}px`;
}

export function fadeAndRemoveIndicator(indicator: HTMLElement): void {
  indicator.style.opacity = '0';
  setTimeout(() => { indicator.remove(); }, 200);
}
