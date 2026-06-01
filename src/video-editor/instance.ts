// SPDX-License-Identifier: AGPL-3.0-or-later
// © 2026 Harald Weiss

import { VideoEditor } from './editor';
import type { TableConfig } from '../types';

/**
 * Global instance
 */
let videoEditorInstance: VideoEditor | null = null;

export function getVideoEditor(): VideoEditor | null {
  return videoEditorInstance;
}

export function initializeVideoEditor(tableConfig: TableConfig): VideoEditor {
  videoEditorInstance = new VideoEditor(tableConfig);
  return videoEditorInstance;
}
