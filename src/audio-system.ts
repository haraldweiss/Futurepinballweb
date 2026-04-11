/**
 * audio-system.ts — Unified Audio System Facade
 *
 * Consolidates all audio functionality under a single import point:
 * - Basic audio (context, sound playback)
 * - Enhanced audio (AudioMixer, LayeredSounds, AmbienceManager)
 * - Sound effects management
 * - Music management
 * - Audio source pooling
 *
 * This module acts as the single source of truth for audio in the application.
 * Internally, it re-exports from specialized modules but provides a unified API.
 */

// ─── Core Audio Context & Pooling ─────────────────────────────────────────
export {
  getAudioCtx,
  initializeAudioPooling,
  playSound,
  playBumperSoundWithIntensity,
  startBGMusic,
  stopBGMusic,
  playFPTMusic,
  toggleMusic,
} from './audio';

// ─── Audio Source Pool (internal management) ──────────────────────────────
export {
  AudioSourcePool,
  initializeAudioSourcePool,
  getAudioSourcePool,
  resetAudioSourcePool,
  playAudioBufferPooled,
} from './audio-source-pool';

// ─── Enhanced Audio System (Mixer, Categories, Layering) ─────────────────
export {
  AudioCategory,
  AudioMixer,
  type LayeredSound,
  playLayeredSound,
  TARGET_HIT,
  FLIPPER_ACTIVATE,
  RAMP_COMPLETE,
  BALL_DRAIN,
  MULTIBALL_START,
  MILESTONE_REACHED,
  AmbienceManager,
  calculate3DPositioning,
  applyStereooPanning,
  EnhancedAudioSystem,
  initializeAudioSystem,
  getAudioSystem,
} from './audio-enhanced';

// ─── Music Management ────────────────────────────────────────────────────
export {
  MusicManager,
  getMusicManager,
  disposeMusicManager,
} from './music-manager';

// ─── Sound Effects Management ───────────────────────────────────────────
export {
  type SoundEffect,
  SoundManager,
  getSoundManager,
  disposeSoundManager,
} from './sound-manager';

// ─── Unified Type Exports ───────────────────────────────────────────────
export type { AudioContext, GainNode, OscillatorNode } from './audio';
