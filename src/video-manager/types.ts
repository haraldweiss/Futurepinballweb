// SPDX-License-Identifier: AGPL-3.0-or-later
// © 2026 Harald Weiss

export interface VideoConfig {
  id: string;
  name: string;
  url: string;
  type: 'backglass' | 'dmd';
  duration: number;
  autoPlay?: boolean;
  loop?: boolean;
  volume?: number;
  muted?: boolean;
  playbackRate?: number;
  quality?: 'low' | 'medium' | 'high' | 'ultra';
}

export interface VideoEvent {
  trigger: 'bumper_hit' | 'target_hit' | 'ramp_complete' | 'multiball_start' |
           'ball_drain' | 'flipper_hit' | 'slingshot' | 'spinner' | 'combo' |
           'level_complete' | 'tilt' | 'game_over' | 'custom';
  videoId: string;
  delay?: number;
  allowInterrupt?: boolean;
}

export interface VideoPlaybackState {
  currentVideoId: string | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  muted: boolean;
}
