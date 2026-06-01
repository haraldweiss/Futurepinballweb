// SPDX-License-Identifier: AGPL-3.0-or-later
// © 2026 Harald Weiss

import type { ExtendedVideoEventType } from '../table-video-events';
import type { VideoConfig } from '../video-manager';

export interface VideoEditorState {
  videos: VideoConfig[];
  bindings: Array<{
    id: string;
    videoId: string;
    trigger: ExtendedVideoEventType;
    priority: number;
    delay: number;
    allowInterrupt: boolean;
  }>;
  selectedVideoId: string | null;
  selectedBindingId: string | null;
}
