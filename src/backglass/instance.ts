// SPDX-License-Identifier: AGPL-3.0-or-later
// © 2026 Harald Weiss

import { BackglassRenderer } from './renderer';

let backglassRenderer: BackglassRenderer | null = null;

export function getBackglassRenderer(width: number, height: number): BackglassRenderer {
  if (!backglassRenderer) {
    backglassRenderer = new BackglassRenderer(width, height);
  }
  return backglassRenderer;
}

export function disposeBackglass(): void {
  if (backglassRenderer) {
    backglassRenderer.dispose();
    backglassRenderer = null;
  }
}
