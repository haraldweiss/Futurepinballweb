/**
 * music-manager.ts — Background music & ambient audio
 * Phase 26: Audio Ambiance for Arcade Feel
 * 
 * Uses Web Audio API for procedural looping music
 * M key to toggle on/off
 */

/**
 * Music Manager - Procedural ambient music generation
 */
export class MusicManager {
  private audioContext: AudioContext | null = null;
  private masterVolume: number = 0.3;  // Lower than effects
  private enabled: boolean = true;
  private playing: boolean = false;
  private musicNodes: { oscillator: OscillatorNode; gainNode: GainNode }[] = [];
  private nextNoteTime: number = 0;
  private noteLength: number = 0.5;  // seconds
  private schedule: number[] = [];  // MIDI notes
  private scheduleIndex = 0;

  /**
   * Arcade-style background music (looping pentatonic scale)
   * Em pentatonic - E, G, A, B, D (arcade vibe)
   */
  private musicSequence: number[] = [
    329.63, 329.63, 392.00, 329.63, 329.63, 392.00,  // Em Em G Em Em G
    329.63, 329.63, 392.00, 392.00, 329.63,          // Em Em G G Em
    392.00, 392.00, 440.00, 392.00, 329.63,          // G G A G Em
    392.00, 392.00, 329.63, 392.00,                  // G G Em G
  ];

  /**
   * Initialize audio context
   */
  async initialize(): Promise<void> {
    if (this.audioContext) return;

    try {
      const AudioContextClass = (window as any).AudioContext || (window as any).webkitAudioContext;
      this.audioContext = new AudioContextClass();

      if (this.audioContext.state === 'suspended') {
        document.addEventListener('click', () => {
          if (this.audioContext?.state === 'suspended') {
            this.audioContext.resume();
            console.log('[Music Manager] Audio context resumed');
          }
        }, { once: true });
      }

      console.log('[Music Manager] ✓ Initialized');
      return;
    } catch (e) {
      console.warn('[Music Manager] Audio Context not available:', e);
      this.enabled = false;
    }
  }

  /**
   * Start background music
   */
  play(): void {
    if (!this.enabled || !this.audioContext || this.playing) return;

    console.log('[Music Manager] ▶ Playing');
    this.playing = true;
    this.scheduleIndex = 0;
    this.nextNoteTime = this.audioContext.currentTime;
    this.scheduleNotes();
  }

  /**
   * Stop background music
   */
  stop(): void {
    if (!this.playing) return;

    console.log('[Music Manager] ⏹ Stopped');
    this.playing = false;
    this.musicNodes.forEach(({ oscillator }) => {
      try {
        oscillator.stop();
      } catch (e) {
        // Already stopped
      }
    });
    this.musicNodes = [];
  }

  /**
   * Toggle music on/off
   */
  toggle(): void {
    if (this.playing) {
      this.stop();
    } else {
      this.play();
    }
  }

  /**
   * Schedule notes for playback
   */
  private scheduleNotes(): void {
    if (!this.playing || !this.audioContext) return;

    const scheduleAheadTime = 0.1; // 100ms ahead
    const now = this.audioContext.currentTime;

    // Schedule notes
    while (this.nextNoteTime < now + scheduleAheadTime) {
      const frequency = this.musicSequence[this.scheduleIndex % this.musicSequence.length];
      this.scheduleNote(frequency, this.nextNoteTime, this.noteLength);

      this.nextNoteTime += this.noteLength;
      this.scheduleIndex++;
    }

    // Reschedule
    setTimeout(() => this.scheduleNotes(), 25);
  }

  /**
   * Schedule a single note
   */
  private scheduleNote(frequency: number, time: number, duration: number): void {
    if (!this.audioContext) return;

    try {
      const osc = this.audioContext.createOscillator();
      const gain = this.audioContext.createGain();

      osc.type = 'sine';
      osc.frequency.value = frequency;

      // Envelope
      gain.gain.setValueAtTime(0, time);
      gain.gain.linearRampToValueAtTime(this.masterVolume * 0.5, time + 0.05);
      gain.gain.linearRampToValueAtTime(this.masterVolume * 0.3, time + duration * 0.7);
      gain.gain.linearRampToValueAtTime(0, time + duration);

      osc.connect(gain);
      gain.connect(this.audioContext.destination);

      osc.start(time);
      osc.stop(time + duration);

      this.musicNodes.push({ oscillator: osc, gainNode: gain });
    } catch (e) {
      console.warn('[Music Manager] Error scheduling note:', e);
    }
  }

  /**
   * Set master volume
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
   * Check if playing
   */
  isPlaying(): boolean {
    return this.playing;
  }

  /**
   * Set enabled
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled && this.playing) {
      this.stop();
    }
  }
}

/**
 * Singleton instance
 */
let musicManager: MusicManager | null = null;

/**
 * Get music manager singleton
 */
export async function getMusicManager(): Promise<MusicManager> {
  if (!musicManager) {
    musicManager = new MusicManager();
    await musicManager.initialize();
  }
  return musicManager;
}

/**
 * Dispose music manager
 */
export function disposeMusicManager(): void {
  if (musicManager) {
    musicManager.stop();
    musicManager = null;
  }
}

