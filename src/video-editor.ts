// SPDX-License-Identifier: AGPL-3.0-or-later
// © 2026 Harald Weiss
/**
 * video-editor.ts — Barrel: re-exports from ./video-editor/
 *
 * All import paths like `from './video-editor'` continue working after
 * splitting the original 893-line file into sub-modules.
 */
export type { VideoEditorState } from './video-editor/types';
export { VideoEditor } from './video-editor/editor';
export { getVideoEditor, initializeVideoEditor } from './video-editor/instance';
