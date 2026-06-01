// SPDX-License-Identifier: AGPL-3.0-or-later
// © 2026 Harald Weiss

import { TouchControlsManager } from './manager';

let touchControlsManager: TouchControlsManager | null = null;

export function initTouchControlsManager(): TouchControlsManager {
  if (!touchControlsManager) {
    touchControlsManager = new TouchControlsManager();
  }
  return touchControlsManager;
}

export function getTouchControlsManager(): TouchControlsManager | null {
  return touchControlsManager;
}

export function disposeTouchControlsManager(): void {
  if (touchControlsManager) {
    touchControlsManager.setEnabled(false);
    touchControlsManager = null;
  }
}
