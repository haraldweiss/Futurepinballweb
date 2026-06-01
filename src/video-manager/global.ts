// SPDX-License-Identifier: AGPL-3.0-or-later
// © 2026 Harald Weiss

import { VideoManager } from './manager';

let videoManager: VideoManager | null = null;

export function initializeVideoManager(): VideoManager {
  if (!videoManager) {
    videoManager = new VideoManager();
  }
  return videoManager;
}

export function getVideoManager(): VideoManager | null {
  return videoManager;
}

export function disposeVideoManager(): void {
  if (videoManager) {
    videoManager.dispose();
    videoManager = null;
  }
}
