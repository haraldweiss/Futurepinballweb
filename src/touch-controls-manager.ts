// SPDX-License-Identifier: AGPL-3.0-or-later
// © 2026 Harald Weiss
// Barrel — re-exports from ./touch-controls/
// Existing import paths like `import { X } from './touch-controls-manager'` continue working.

export { TouchControlsManager } from './touch-controls/manager';
export { initTouchControlsManager, getTouchControlsManager, disposeTouchControlsManager } from './touch-controls/singleton';

export type { TouchZone } from './touch-controls/types';
