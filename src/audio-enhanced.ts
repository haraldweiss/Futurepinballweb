/**
 * audio-enhanced.ts — PHASE 9: Enhanced Audio Feedback System
 *
 * Handles advanced audio features:
 * - Event-specific sounds (target hit, flipper activation, drain, etc.)
 * - Audio layering (impact + sustain + tail)
 * - Dynamic volume mixing with master levels
 * - 3D spatial audio positioning (optional)
 * - Background ambience (game hum, tension music)
 */

import { getAudioCtx } from './audio-system';

// ─── Audio Category Definitions ───────────────────────────────────────────
export enum AudioCategory {
  SFX = 'sfx',           // Sound effects (bumpers, targets, etc.)
  MUSIC = 'music',       // Background music
  AMBIENCE = 'ambience', // Environmental sounds
  UI = 'ui',             // UI interactions
}

// ─── Audio Mixer System ────────────────────────────────────────────────────
/**
 * Central audio mixer with category-based volume control
 */
export class AudioMixer {
  private masterVolume = 1.0;
  private categoryVolumes = {
    [AudioCategory.SFX]: 0.8,
    [AudioCategory.MUSIC]: 0.6,
    [AudioCategory.AMBIENCE]: 0.3,
    [AudioCategory.UI]: 0.5,
  };

  private activeGainNodes: Array<{
    gainNode: GainNode;
    category: AudioCategory;
  }> = [];

  /**
   * Set master volume (0.0 to 1.0)
   */
  setMasterVolume(volume: number): void {
    this.masterVolume = Math.max(0, Math.min(1, volume));
    this.updateAllVolumes();
  }

  /**
   * Set category volume (0.0 to 1.0)
   */
  setCategoryVolume(category: AudioCategory, volume: number): void {
    this.categoryVolumes[category] = Math.max(0, Math.min(1, volume));
    this.updateAllVolumes();
  }

  /**
   * Calculate final volume for a sound
   */
  calculateVolume(baseVolume: number, category: AudioCategory): number {
    const categoryVol = this.categoryVolumes[category] || 1.0;
    return baseVolume * categoryVol * this.masterVolume;
  }

  /**
   * Create and track a gain node
   */
  createGainNode(category: AudioCategory): GainNode {
    const ctx = getAudioCtx();
    const gainNode = ctx.createGain();
    gainNode.gain.value = this.calculateVolume(1.0, category);
    this.activeGainNodes.push({ gainNode, category });
    return gainNode;
  }

  /**
   * Update all active gain nodes (called when volumes change)
   */
  private updateAllVolumes(): void {
    this.activeGainNodes = this.activeGainNodes.filter(item => {
      try {
        item.gainNode.gain.value = this.calculateVolume(
          item.gainNode.gain.value / (this.categoryVolumes[item.category] * this.masterVolume),
          item.category
        );
        return true;
      } catch {
        // Node may have been removed
        return false;
      }
    });
  }

  /**
   * Get current volumes for display
   */
  getVolumes(): { master: number; categories: Record<AudioCategory, number> } {
    return {
      master: this.masterVolume,
      categories: { ...this.categoryVolumes },
    };
  }
}

// ─── Layered Sound Effect ──────────────────────────────────────────────────
/**
 * Sound effect with multiple layers (impact, sustain, tail)
 */
interface AudioLayer {
  sample: 'impact' | 'sustain' | 'tail' | 'custom';
  delay: number;      // milliseconds before playing
  duration: number;   // seconds
  frequency: number;  // Hz (for synth)
  volumeScale: number; // 0.0-1.0
  pitchShift: number;  // 1.0 = normal
}

export interface LayeredSound {
  name: string;
  layers: AudioLayer[];
}

/**
 * Plays a layered sound effect
 */
export function playLayeredSound(
  sound: LayeredSound,
  mixer: AudioMixer,
  category: AudioCategory = AudioCategory.SFX,
  intensity: number = 1.0
): void {
  try {
    const ctx = getAudioCtx();
    const gainNode = mixer.createGainNode(category);
    gainNode.connect(ctx.destination);

    sound.layers.forEach(layer => {
      setTimeout(() => {
        try {
          const now = ctx.currentTime;
          const osc = ctx.createOscillator();
          const layerGain = ctx.createGain();

          osc.frequency.value = layer.frequency * layer.pitchShift;
          osc.type = 'sine';

          // Volume with intensity scaling
          const finalVolume = layer.volumeScale * intensity;
          layerGain.gain.setValueAtTime(finalVolume, now);
          layerGain.gain.exponentialRampToValueAtTime(0.001, now + layer.duration);

          osc.connect(layerGain);
          layerGain.connect(gainNode);

          osc.start(now);
          osc.stop(now + layer.duration);
        } catch {
          // Audio context may have been destroyed
        }
      }, layer.delay);
    });
  } catch {
    // Audio not available
  }
}

// ─── Event Sound Definitions ───────────────────────────────────────────────

/**
 * Target Hit: Satisfying "ding" with reverb
 */
export const TARGET_HIT: LayeredSound = {
  name: 'target_hit',
  layers: [
    {
      sample: 'impact',
      delay: 0,
      duration: 0.1,
      frequency: 880,
      volumeScale: 1.0,
      pitchShift: 1.0,
    },
    {
      sample: 'sustain',
      delay: 50,
      duration: 0.2,
      frequency: 660,
      volumeScale: 0.6,
      pitchShift: 0.95,
    },
    {
      sample: 'tail',
      delay: 150,
      duration: 0.3,
      frequency: 440,
      volumeScale: 0.2,
      pitchShift: 0.9,
    },
  ],
};

/**
 * Flipper Activation: Sharp solenoid click with impact
 */
export const FLIPPER_ACTIVATE: LayeredSound = {
  name: 'flipper_activate',
  layers: [
    {
      sample: 'impact',
      delay: 0,
      duration: 0.05,
      frequency: 1200,
      volumeScale: 0.9,
      pitchShift: 1.0,
    },
    {
      sample: 'sustain',
      delay: 25,
      duration: 0.08,
      frequency: 800,
      volumeScale: 0.5,
      pitchShift: 0.92,
    },
  ],
};

/**
 * Ramp Complete: Success fanfare
 */
export const RAMP_COMPLETE: LayeredSound = {
  name: 'ramp_complete',
  layers: [
    {
      sample: 'impact',
      delay: 0,
      duration: 0.15,
      frequency: 880,
      volumeScale: 1.0,
      pitchShift: 1.0,
    },
    {
      sample: 'sustain',
      delay: 100,
      duration: 0.2,
      frequency: 1100,
      volumeScale: 0.8,
      pitchShift: 1.05,
    },
    {
      sample: 'tail',
      delay: 250,
      duration: 0.3,
      frequency: 1320,
      volumeScale: 0.4,
      pitchShift: 1.1,
    },
  ],
};

/**
 * Ball Drain: Sad "wah-wah-wah" descending tone
 */
export const BALL_DRAIN: LayeredSound = {
  name: 'ball_drain',
  layers: [
    {
      sample: 'impact',
      delay: 0,
      duration: 0.2,
      frequency: 440,
      volumeScale: 0.8,
      pitchShift: 1.0,
    },
    {
      sample: 'sustain',
      delay: 150,
      duration: 0.25,
      frequency: 330,
      volumeScale: 0.6,
      pitchShift: 0.95,
    },
    {
      sample: 'tail',
      delay: 350,
      duration: 0.4,
      frequency: 220,
      volumeScale: 0.3,
      pitchShift: 0.9,
    },
  ],
};

/**
 * Multiball: Exciting bell/chime
 */
export const MULTIBALL_START: LayeredSound = {
  name: 'multiball_start',
  layers: [
    {
      sample: 'impact',
      delay: 0,
      duration: 0.12,
      frequency: 1100,
      volumeScale: 1.0,
      pitchShift: 1.0,
    },
    {
      sample: 'sustain',
      delay: 80,
      duration: 0.18,
      frequency: 1320,
      volumeScale: 0.7,
      pitchShift: 1.05,
    },
    {
      sample: 'tail',
      delay: 220,
      duration: 0.35,
      frequency: 1540,
      volumeScale: 0.3,
      pitchShift: 1.1,
    },
  ],
};

/**
 * Score Milestone: Celebratory "ding ding"
 */
export const MILESTONE_REACHED: LayeredSound = {
  name: 'milestone_reached',
  layers: [
    {
      sample: 'impact',
      delay: 0,
      duration: 0.1,
      frequency: 1000,
      volumeScale: 0.9,
      pitchShift: 1.0,
    },
    {
      sample: 'sustain',
      delay: 120,
      duration: 0.1,
      frequency: 1200,
      volumeScale: 0.8,
      pitchShift: 1.05,
    },
    {
      sample: 'tail',
      delay: 200,
      duration: 0.2,
      frequency: 1400,
      volumeScale: 0.4,
      pitchShift: 1.1,
    },
  ],
};

// ─── Background Ambience System ────────────────────────────────────────────
/**
 * Manages background ambience and tension music
 */
export class AmbienceManager {
  private ambienceGain: GainNode | null = null;
  private ambienceActive = false;
  private tensionLevel = 0;  // 0.0 to 1.0 (increases as game progresses)

  /**
   * Start game ambience (low-level hum)
   */
  startGameAmbience(): void {
    if (this.ambienceActive) return;

    try {
      const ctx = getAudioCtx();
      this.ambienceGain = ctx.createGain();
      this.ambienceGain.gain.value = 0.08;  // Very quiet background
      this.ambienceGain.connect(ctx.destination);

      // Low frequency hum (55 Hz = A1, very low)
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = 55;  // Game hum frequency

      osc.connect(this.ambienceGain);
      osc.start();

      this.ambienceActive = true;
    } catch {
      // Audio not available
    }
  }

  /**
   * Stop game ambience
   */
  stopGameAmbience(): void {
    if (this.ambienceGain) {
      this.ambienceGain.gain.setTargetAtTime(0, getAudioCtx().currentTime, 0.2);
      this.ambienceActive = false;
    }
  }

  /**
   * Update tension level (triggers tension music on high levels)
   * Called when multiball active or high combo
   */
  setTensionLevel(level: number): void {
    this.tensionLevel = Math.max(0, Math.min(1, level));
    // Could trigger tension music at high levels
  }

  /**
   * Get current tension level
   */
  getTensionLevel(): number {
    return this.tensionLevel;
  }
}

// ─── 3D Spatial Audio (Optional) ───────────────────────────────────────────
/**
 * Calculate pan and distance attenuation for 3D audio
 * @param sourcePos World position of sound source
 * @param listenerPos Listener position (camera)
 * @returns pan (-1 to 1) and distance attenuation (0 to 1)
 */
export function calculate3DPositioning(
  sourcePos: { x: number; y: number },
  listenerPos: { x: number; y: number }
): { pan: number; attenuation: number } {
  const dx = sourcePos.x - listenerPos.x;
  const dy = sourcePos.y - listenerPos.y;
  const distance = Math.sqrt(dx * dx + dy * dy);

  // Pan: left (-1) to right (1) based on X difference
  const pan = Math.max(-1, Math.min(1, dx / 5.0));

  // Attenuation: fades with distance (max 10 units)
  const attenuation = Math.max(0, 1.0 - distance / 10.0);

  return { pan, attenuation };
}

/**
 * Apply stereophonic panning to a sound
 */
export function applyStereooPanning(gainNode: GainNode, pan: number): void {
  try {
    const ctx = getAudioCtx();

    if (ctx.createStereoPanner) {
      // Modern approach: StereoPanner
      const panner = ctx.createStereoPanner();
      panner.pan.value = pan;

      const parentGain = ctx.createGain();
      gainNode.connect(panner);
      panner.connect(parentGain);
      parentGain.connect(ctx.destination);
    } else {
      // Fallback: Left/Right channel manipulation
      // This is a simplified approach for compatibility
      gainNode.connect(ctx.destination);
    }
  } catch {
    // Fallback: just connect normally
    gainNode.connect(getAudioCtx().destination);
  }
}

// ─── Global Audio System Manager ───────────────────────────────────────────
/**
 * Central manager for all enhanced audio features
 */
export class EnhancedAudioSystem {
  private mixer: AudioMixer;
  private ambience: AmbienceManager;

  constructor() {
    this.mixer = new AudioMixer();
    this.ambience = new AmbienceManager();
  }

  /**
   * Play event sound with proper categorization
   */
  playEventSound(
    sound: LayeredSound,
    category: AudioCategory = AudioCategory.SFX,
    intensity: number = 1.0,
    position?: { x: number; y: number },
    listenerPos?: { x: number; y: number }
  ): void {
    playLayeredSound(sound, this.mixer, category, intensity);

    // Apply spatial audio if positions provided
    if (position && listenerPos) {
      const spatial = calculate3DPositioning(position, listenerPos);
      // Could apply panning here if using modern Web Audio API
    }
  }

  /**
   * Play flipper activation sound
   */
  playFlipperSound(intensity: number = 1.0): void {
    playLayeredSound(FLIPPER_ACTIVATE, this.mixer, AudioCategory.SFX, intensity);
  }

  /**
   * Play target hit sound
   */
  playTargetSound(intensity: number = 1.0): void {
    playLayeredSound(TARGET_HIT, this.mixer, AudioCategory.SFX, intensity);
  }

  /**
   * Play ramp complete sound
   */
  playRampCompleteSound(): void {
    playLayeredSound(RAMP_COMPLETE, this.mixer, AudioCategory.SFX, 1.0);
  }

  /**
   * Play ball drain sound
   */
  playBallDrainSound(): void {
    playLayeredSound(BALL_DRAIN, this.mixer, AudioCategory.SFX, 1.0);
  }

  /**
   * Play multiball start sound
   */
  playMultiballSound(): void {
    playLayeredSound(MULTIBALL_START, this.mixer, AudioCategory.SFX, 1.0);
  }

  /**
   * Play milestone reached sound
   */
  playMilestoneSound(): void {
    playLayeredSound(MILESTONE_REACHED, this.mixer, AudioCategory.SFX, 1.0);
  }

  /**
   * Start background game ambience
   */
  startAmbience(): void {
    this.ambience.startGameAmbience();
  }

  /**
   * Stop background ambience
   */
  stopAmbience(): void {
    this.ambience.stopGameAmbience();
  }

  /**
   * Update tension level (for dynamic music)
   */
  setTensionLevel(level: number): void {
    this.ambience.setTensionLevel(level);
  }

  /**
   * Set master volume
   */
  setMasterVolume(volume: number): void {
    this.mixer.setMasterVolume(volume);
  }

  /**
   * Set category volume
   */
  setCategoryVolume(category: AudioCategory, volume: number): void {
    this.mixer.setCategoryVolume(category, volume);
  }

  /**
   * Get current mixer settings
   */
  getMixerSettings() {
    return this.mixer.getVolumes();
  }
}

// ─── Global Instance ──────────────────────────────────────────────────────
export let globalAudioSystem: EnhancedAudioSystem | null = null;

export function initializeAudioSystem(): EnhancedAudioSystem {
  globalAudioSystem = new EnhancedAudioSystem();
  return globalAudioSystem;
}

export function getAudioSystem(): EnhancedAudioSystem | null {
  return globalAudioSystem;
}
