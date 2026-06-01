// SPDX-License-Identifier: AGPL-3.0-or-later
// © 2026 Harald Weiss
// Barrel — re-exports everything from ./video-manager/

export type { VideoConfig, VideoEvent, VideoPlaybackState } from './video-manager/types';
export { VideoManager } from './video-manager/manager';
export { initializeVideoManager, getVideoManager, disposeVideoManager } from './video-manager/global';
