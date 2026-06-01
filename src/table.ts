// SPDX-License-Identifier: AGPL-3.0-or-later
// © 2026 Harald Weiss
/**
 * table.ts — Barrel: re-exports from table/configs, table/scoring, table/builder
 *
 * All import paths like `from './table'` continue working after
 * splitting the original 1157-line file into sub-modules.
 */
export { TABLE_CONFIGS } from './table/configs';
export {
  checkRolloverLanes, scoreBumperHit, updateSpinnerPhysics,
  scoreSpinnerHit, scoreRampHit, updateTargetSequenceHighlights,
  scoreTargetHit, scoreSlingshotHit,
} from './table/scoring';
export {
  buildTable, buildPhysicsTable, buildRealisticFlipper,
  buildBumper, buildTarget, buildRamp,
  resolvePlayfieldTexture, resolveModel, getAdvancedLighting,
} from './table/builder';
