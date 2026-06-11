// SPDX-License-Identifier: AGPL-3.0-or-later
// © 2026 Harald Weiss
/**
 * fpt-parser.ts — Barrel that re-exports everything from ./fpt/
 *
 * All sub-module imports are preserved — importers can continue to use
 * `from './fpt-parser'` without changes.
 */
export { logMsg } from './fpt/log';
export type { ResourceLoadingCallbacks } from './fpt/log';
export { getBackglassArtwork } from './fpt/backglass';
export { suggestTableLights, extractDominantColors, extractElementColors } from './fpt/lighting';
export { getLibraryByName, detectLibraryDependencies, getMissingLibraries, formatLibraryDependencies, mergeLibraries, type LibraryDependency } from './fpt/library';

export { parseCFBResources } from './fpt/cfb-parser';
export { mapFPTSounds, populateCatalogFromFPTResources } from './fpt/io';
export { extractFPCoords, assignBumperSizes, extractFPTPhysics, extractRampCoords, extractWallPaths } from './fpt/coords';
export { parseFPTFile, parseFPLFile } from './fpt/file-parser';
export type { FPLLibrary } from './fpt/file-parser';
export { extractMS3DModelsFromCFB, extractAnimationSequencesFromCFB } from './fpt/models';
