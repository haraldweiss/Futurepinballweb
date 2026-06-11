// SPDX-License-Identifier: AGPL-3.0-or-later
// © 2026 Harald Weiss

import { AudioMixer } from './mixer';
import { playLayeredSound, TARGET_HIT, FLIPPER_ACTIVATE, RAMP_COMPLETE, BALL_DRAIN, MULTIBALL_START, MILESTONE_REACHED } from './sounds';
import { AmbienceManager } from './ambience';
import { calculate3DPositioning } from './spatial';
import type { LayeredSound } from './sounds';
import { AudioCategory } from './mixer';

export class EnhancedAudioSystem {
  private mixer: AudioMixer;
  private ambience: AmbienceManager;

  constructor() {
    this.mixer = new AudioMixer();
    this.ambience = new AmbienceManager();
  }

  playEventSound(
    sound: LayeredSound,
    category: AudioCategory = AudioCategory.SFX,
    intensity: number = 1.0,
    position?: { x: number; y: number },
    listenerPos?: { x: number; y: number }
  ): void {
    playLayeredSound(sound, this.mixer, category, intensity);

    if (position && listenerPos) {
      calculate3DPositioning(position, listenerPos);
    }
  }

  playFlipperSound(intensity: number = 1.0): void {
    playLayeredSound(FLIPPER_ACTIVATE, this.mixer, AudioCategory.SFX, intensity);
  }

  playTargetSound(intensity: number = 1.0): void {
    playLayeredSound(TARGET_HIT, this.mixer, AudioCategory.SFX, intensity);
  }

  playRampCompleteSound(): void {
    playLayeredSound(RAMP_COMPLETE, this.mixer, AudioCategory.SFX, 1.0);
  }

  playBallDrainSound(): void {
    playLayeredSound(BALL_DRAIN, this.mixer, AudioCategory.SFX, 1.0);
  }

  playMultiballSound(): void {
    playLayeredSound(MULTIBALL_START, this.mixer, AudioCategory.SFX, 1.0);
  }

  playMilestoneSound(): void {
    playLayeredSound(MILESTONE_REACHED, this.mixer, AudioCategory.SFX, 1.0);
  }

  startAmbience(): void {
    this.ambience.startGameAmbience();
  }

  stopAmbience(): void {
    this.ambience.stopGameAmbience();
  }

  setTensionLevel(level: number): void {
    this.ambience.setTensionLevel(level);
  }

  setMasterVolume(volume: number): void {
    this.mixer.setMasterVolume(volume);
  }

  setCategoryVolume(category: AudioCategory, volume: number): void {
    this.mixer.setCategoryVolume(category, volume);
  }

  getMixerSettings() {
    return this.mixer.getVolumes();
  }
}

export let globalAudioSystem: EnhancedAudioSystem | null = null;

export function initializeAudioSystem(): EnhancedAudioSystem {
  globalAudioSystem = new EnhancedAudioSystem();
  return globalAudioSystem;
}

export function getAudioSystem(): EnhancedAudioSystem | null {
  return globalAudioSystem;
}
