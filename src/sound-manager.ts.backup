/**
 * sound-manager.ts — Sound effects for pinball gameplay
 * Phase 25: Audio feedback for arcade authenticity
 * 
 * Critical for pinball feel: Audio = Immediate feedback
 */

export interface SoundEffect {
  name: string;
  frequency: number;      // Hz for synth
  duration: number;       // milliseconds
  volume: number;         // 0.0-1.0
  waveform?: 'sine' | 'square' | 'sawtooth';
}

/**
 * Sound Manager - Procedural audio generation (no external files needed!)
 */
export class SoundManager {
  private audioContext: AudioContext | null = null;
  private masterVolume: number = 0.5;
  private enabled: boolean = true;
  private soundCount = 0;

  // Presets for pinball sounds
  private soundPresets: Record<string, SoundEffect> = {
    flipperHit: {
      name: 'Flipper Hit',
      frequency: 800,       // Mid-high tone
      duration: 80,
      volume: 0.7,
      waveform: 'square',
    },
    bumperHit: {
      name: 'Bumper Hit',
      frequency: 600,       // Lower tone
      duration: 120,
      volume: 0.8,
      waveform: 'sine',
    },
    targetHit: {
      name: 'Target Hit',
      frequency: 1200,      // High tone
      duration: 100,
      volume: 0.6,
      waveform: 'sine',
    },
    scoreUp: {
      name: 'Score Up',
      frequency: 1000,      // Ascending tone
      duration: 150,
      volume: 0.5,
      waveform: 'sine',
    },
    ballDrain: {
      name: 'Ball Drain',
      frequency: 200,       // Low warning tone
      duration: 300,
      volume: 0.7,
      waveform: 'sine',
    },
    gameOver: {
      name: 'Game Over',
      frequency: 150,       // Very low
      duration: 500,
      volume: 0.8,
      waveform: 'sine',
    },
    slingshot: {
      name: 'Slingshot',
      frequency: 900,       // Punchy
      duration: 60,
      volume: 0.75,
      waveform: 'square',
    },
  };

  /**
   * Initialize audio context
   */
  async initialize(): Promise<void> {
    if (this.audioContext) return;

    try {
      const AudioContextClass = (window as any).AudioContext || (window as any).webkitAudioContext;
      this.audioContext = new AudioContextClass();
      
      // Resume on user interaction (required by browsers)
      if (this.audioContext.state === 'suspended') {
        document.addEventListener('click', () => {
          if (this.audioContext?.state === 'suspended') {
            this.audioContext.resume();
            console.log('[Sound Manager] Audio context resumed');
          }
        }, { once: true });
      }
      
      console.log('[Sound Manager] Audio context initialized');
    } catch (e) {
      console.warn('[Sound Manager] Audio Context not available:', e);
      this.enabled = false;
    }
  }

  /**
   * Play a sound effect
   */
  async playSound(effectName: keyof typeof this.soundPresets, pitch: number = 1.0): Promise<void> {
    if (!this.enabled || !this.audioContext) return;

    const effect = this.soundPresets[effectName];
    if (!effect) {
      console.warn(`[Sound Manager] Unknown sound: ${effectName}`);
      return;
    }

    try {
      // Create oscillator
      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();

      // Set waveform
      oscillator.type = (effect.waveform || 'sine') as any;
      
      // Set frequency with pitch adjustment
      oscillator.frequency.value = effect.frequency * pitch;

      // Envelope (attack-decay style)
      const now = this.audioContext.currentTime;
      const duration = effect.duration / 1000; // Convert to seconds

      // Start at volume
      gainNode.gain.setValueAtTime(effect.volume * this.masterVolume, now);
      
      // Quick decay to silence
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + duration);

      // Connect nodes
      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);

      // Play
      oscillator.start(now);
      oscillator.stop(now + duration);

      this.soundCount++;
    } catch (e) {
      console.warn('[Sound Manager] Error playing sound:', e);
    }
  }

  /**
   * Play flipper hit sound
   */
  playFlipperHit(power: number = 1.0): void {
    // Pitch varies with power
    const pitch = 0.8 + power * 0.4;  // 0.8-1.2x
    this.playSound('flipperHit', pitch);
  }

  /**
   * Play bumper hit
   */
  playBumperHit(): void {
    this.playSound('bumperHit', 0.9 + Math.random() * 0.2);
  }

  /**
   * Play target hit
   */
  playTargetHit(): void {
    this.playSound('targetHit', 1.0 + Math.random() * 0.3);
  }

  /**
   * Play score increase
   */
  playScoreUp(): void {
    this.playSound('scoreUp');
  }

  /**
   * Play ball drain
   */
  playBallDrain(): void {
    this.playSound('ballDrain');
  }

  /**
   * Play game over
   */
  playGameOver(): void {
    this.playSound('gameOver');
  }

  /**
   * Play slingshot
   */
  playSlingshot(): void {
    this.playSound('slingshot');
  }

  /**
   * Set master volume (0.0-1.0)
   */
  setMasterVolume(volume: number): void {
    this.masterVolume = Math.max(0, Math.min(1, volume));
  }

  /**
   * Get master volume
   */
  getMasterVolume(): number {
    return this.masterVolume;
  }

  /**
   * Toggle sound on/off
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /**
   * Check if sounds are enabled
   */
  isEnabled(): boolean {
    return this.enabled && this.audioContext !== null;
  }

  /**
   * Get sound count (debug)
   */
  getSoundCount(): number {
    return this.soundCount;
  }

  /**
   * Reset counter
   */
  resetSoundCount(): void {
    this.soundCount = 0;
  }
}

/**
 * Singleton instance
 */
let soundManager: SoundManager | null = null;

/**
 * Get sound manager singleton
 */
export async function getSoundManager(): Promise<SoundManager> {
  if (!soundManager) {
    soundManager = new SoundManager();
    await soundManager.initialize();
  }
  return soundManager;
}

/**
 * Dispose sound manager
 */
export function disposeSoundManager(): void {
  if (soundManager) {
    soundManager = null;
  }
}

