// SPDX-License-Identifier: AGPL-3.0-or-later
// © 2026 Harald Weiss — Barrel re-export from src/audio-enhanced/

export { AudioCategory, AudioMixer } from './audio-enhanced/mixer';
export type { LayeredSound } from './audio-enhanced/sounds';
export { playLayeredSound, TARGET_HIT, FLIPPER_ACTIVATE, RAMP_COMPLETE, BALL_DRAIN, MULTIBALL_START, MILESTONE_REACHED } from './audio-enhanced/sounds';
export { AmbienceManager } from './audio-enhanced/ambience';
export { calculate3DPositioning, applyStereooPanning } from './audio-enhanced/spatial';
export { EnhancedAudioSystem, initializeAudioSystem, getAudioSystem } from './audio-enhanced/system';
