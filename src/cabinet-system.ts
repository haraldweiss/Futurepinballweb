// SPDX-License-Identifier: AGPL-3.0-or-later
// © 2026 Harald Weiss
/**
 * cabinet-system.ts — BARREL
 *
 * Re-exports everything from the cabinet-system/ sub-modules.
 * All existing import paths like `import { X } from './cabinet-system'`
 * continue to work.
 */
export type { CabinetProfile } from './cabinet-system/cabinet-profile';
export { CabinetSystem } from './cabinet-system/cabinet-system-class';
export {
  initializeCabinetSystem,
  getCabinetSystem,
  getActiveCabinetProfile,
  setActiveCabinetProfile,
  rotatePlayfieldTo,
} from './cabinet-system/cabinet-api';
