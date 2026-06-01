// SPDX-License-Identifier: AGPL-3.0-or-later
// © 2026 Harald Weiss
/**
 * editor.ts — Barrel: re-exports from editor-classic/types, state, canvas, interaction, sidebar, io
 *
 * All import paths like `import { X } from './editor'` continue working after
 * splitting the original 473-line file into sub-modules.
 */
export type * from './editor-classic/types';
export { state, COLORS, hex, snap } from './editor-classic/state';
export { canvas, ctx, GW, GH, gToC, cToG, render } from './editor-classic/canvas';
export { setTool, deleteSelected } from './editor-classic/interaction';
export { updateSidebar, updateStatus, updateColorDot } from './editor-classic/sidebar';
export type { Bumper, Target, Ramp, Elem, ToolType } from './editor-classic/types';
import './editor-classic/init';
