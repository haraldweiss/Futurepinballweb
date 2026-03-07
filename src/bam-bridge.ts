/**
 * BAM Bridge — Connects VBScript (xBAM) to the BAMEngine
 * Implements real method calls and state feedback
 *
 * Phase 13 Task 2: Complete xBAM↔BAMEngine connection
 */

import { BAMEngine } from './bam-engine';

export class BamBridge {
  private bamEngine: BAMEngine;
  private eventCallbacks: Map<string, Function[]> = new Map();

  constructor(bamEngine: BAMEngine) {
    this.bamEngine = bamEngine;
  }

  // ─── Animation Control ─────────────────────────────────────────────────────

  /**
   * Play animation by sequence ID
   */
  playAnimation(seqId: number | string): void {
    try {
      const sequencer = this.bamEngine.getAnimationSequencer();
      if (typeof seqId === 'number') {
        sequencer.playSequence(seqId);
        this.triggerEvent('AnimationStart', seqId);
      }
    } catch (e: any) {
      console.warn(`⚠️ Failed to play animation ${seqId}: ${e.message}`);
    }
  }

  /**
   * Stop current animation
   */
  stopAnimation(): void {
    try {
      const sequencer = this.bamEngine.getAnimationSequencer();
      sequencer.stopAnimation();
      this.triggerEvent('AnimationStop');
    } catch (e: any) {
      console.warn(`⚠️ Failed to stop animation: ${e.message}`);
    }
  }

  /**
   * Check if animation is currently playing
   */
  isAnimationPlaying(): boolean {
    try {
      const sequencer = this.bamEngine.getAnimationSequencer();
      return sequencer.isAnimationPlaying();
    } catch (e: any) {
      console.warn(`⚠️ Failed to check animation state: ${e.message}`);
      return false;
    }
  }

  // ─── Table Physics ─────────────────────────────────────────────────────────

  /**
   * Set table tilt (affects ball gravity)
   */
  setTableTilt(x: number, y: number, z: number): void {
    try {
      const tablePhysics = this.bamEngine.getTablePhysics();
      tablePhysics.setTableTilt(x, y, z);
      this.triggerEvent('TableTilt', x, y, z);
    } catch (e: any) {
      console.warn(`⚠️ Failed to set table tilt: ${e.message}`);
    }
  }

  /**
   * Get current table tilt angles
   */
  getTableTilt(): { x: number; y: number; z: number } {
    try {
      const tablePhysics = this.bamEngine.getTablePhysics();
      return tablePhysics.getTiltAngles();
    } catch (e: any) {
      console.warn(`⚠️ Failed to get table tilt: ${e.message}`);
      return { x: 0, y: 0, z: 0 };
    }
  }

  /**
   * Apply nudge impulse to table
   */
  applyNudgeImpulse(forceX: number, forceY: number, forceZ: number = 0): void {
    try {
      const tablePhysics = this.bamEngine.getTablePhysics();
      tablePhysics.applyNudgeImpulse({ x: forceX, y: forceY, z: forceZ });
    } catch (e: any) {
      console.warn(`⚠️ Failed to apply nudge: ${e.message}`);
    }
  }

  // ─── Flipper Control ───────────────────────────────────────────────────────

  /**
   * Set flipper power (0-100%)
   */
  setFlipperPower(side: 'left' | 'right', power: number): void {
    try {
      // Clamp power to 0-100
      const clampedPower = Math.max(0, Math.min(100, power));
      const flipperAdvanced = this.bamEngine.getFlipperAdvanced();
      flipperAdvanced.setFlipperPower(side, clampedPower);
      this.triggerEvent('FlipperPower', side, clampedPower);
    } catch (e: any) {
      console.warn(`⚠️ Failed to set flipper power: ${e.message}`);
    }
  }

  /**
   * Get flipper power (0-100%)
   */
  getFlipperPower(side: 'left' | 'right'): number {
    try {
      const flipperAdvanced = this.bamEngine.getFlipperAdvanced();
      return flipperAdvanced.getFlipperPower(side);
    } catch (e: any) {
      console.warn(`⚠️ Failed to get flipper power: ${e.message}`);
      return 50;
    }
  }

  /**
   * Get flipper force multiplier
   */
  getFlipperForceMultiplier(side: 'left' | 'right'): number {
    try {
      const flipperAdvanced = this.bamEngine.getFlipperAdvanced();
      return flipperAdvanced.getFlipperForceMultiplier(side);
    } catch (e: any) {
      console.warn(`⚠️ Failed to get flipper force multiplier: ${e.message}`);
      return 1.0;
    }
  }

  // ─── Lighting Control ──────────────────────────────────────────────────────

  /**
   * Set main light intensity
   */
  setLightIntensity(intensity: number): void {
    try {
      const lighting = this.bamEngine.getLightingController();
      lighting.setLightIntensity(Math.max(0, intensity));
      this.triggerEvent('LightIntensity', intensity);
    } catch (e: any) {
      console.warn(`⚠️ Failed to set light intensity: ${e.message}`);
    }
  }

  /**
   * Get current light intensity
   */
  getLightIntensity(): number {
    try {
      const lighting = this.bamEngine.getLightingController();
      return lighting.getLightIntensity();
    } catch (e: any) {
      console.warn(`⚠️ Failed to get light intensity: ${e.message}`);
      return 2.0;
    }
  }

  /**
   * Pulse light (bright flash then fade)
   */
  pulseLight(duration: number, peakIntensity: number): void {
    try {
      const lighting = this.bamEngine.getLightingController();
      lighting.pulseLight(duration, peakIntensity);
      this.triggerEvent('LightPulse', duration, peakIntensity);
    } catch (e: any) {
      console.warn(`⚠️ Failed to pulse light: ${e.message}`);
    }
  }

  /**
   * Flash light multiple times
   */
  flashLight(count: number, flashDuration: number, interval: number): void {
    try {
      const lighting = this.bamEngine.getLightingController();
      lighting.flashLight(count, flashDuration, interval);
      this.triggerEvent('LightFlash', count, flashDuration, interval);
    } catch (e: any) {
      console.warn(`⚠️ Failed to flash light: ${e.message}`);
    }
  }

  // ─── Configuration Management ──────────────────────────────────────────────

  /**
   * Save configuration setting
   */
  saveConfig(key: string, value: any): void {
    try {
      const config = this.bamEngine.getConfig();
      config.set(key, value);
      config.save();
      this.triggerEvent('ConfigSaved', key, value);
    } catch (e: any) {
      console.warn(`⚠️ Failed to save config: ${e.message}`);
    }
  }

  /**
   * Load configuration setting
   */
  loadConfig(key: string, defaultValue?: any): any {
    try {
      const config = this.bamEngine.getConfig();
      return config.get(key) ?? defaultValue;
    } catch (e: any) {
      console.warn(`⚠️ Failed to load config: ${e.message}`);
      return defaultValue;
    }
  }

  /**
   * Get all configuration
   */
  getAllConfig(): any {
    try {
      const config = this.bamEngine.getConfig();
      return config.getAll();
    } catch (e: any) {
      console.warn(`⚠️ Failed to get all config: ${e.message}`);
      return {};
    }
  }

  // ─── Event System ─────────────────────────────────────────────────────────

  /**
   * Register event callback
   */
  on(eventName: string, callback: Function): void {
    if (!this.eventCallbacks.has(eventName)) {
      this.eventCallbacks.set(eventName, []);
    }
    this.eventCallbacks.get(eventName)!.push(callback);
  }

  /**
   * Unregister event callback
   */
  off(eventName: string, callback: Function): void {
    const callbacks = this.eventCallbacks.get(eventName);
    if (callbacks) {
      const idx = callbacks.indexOf(callback);
      if (idx >= 0) callbacks.splice(idx, 1);
    }
  }

  /**
   * Trigger event and call VBScript callback if it exists
   */
  triggerEvent(eventName: string, ...args: any[]): void {
    // Call registered callbacks
    const callbacks = this.eventCallbacks.get(eventName);
    if (callbacks) {
      for (const cb of callbacks) {
        try {
          cb(...args);
        } catch (e: any) {
          console.warn(`⚠️ Event callback error: ${e.message}`);
        }
      }
    }

    // Call VBScript function if it exists
    this.callScriptEvent(eventName, ...args);
  }

  /**
   * Call VBScript event handler if it exists
   * Looks for Sub BAM_<EventName>(...) in the table script
   */
  private callScriptEvent(eventName: string, ...args: any[]): void {
    try {
      const fnName = `BAM_${eventName}`;
      const fn = (window as any)[fnName];
      if (typeof fn === 'function') {
        fn(...args);
      }
    } catch (e: any) {
      // Silently fail if VBScript function doesn't exist
    }
  }

  // ─── Debug Info ───────────────────────────────────────────────────────────

  /**
   * Get BAM engine status for debugging
   */
  getStatus(): any {
    return {
      engine: this.bamEngine,
      animationPlaying: this.isAnimationPlaying(),
      lightIntensity: this.getLightIntensity(),
      tablePhysics: {
        tilt: this.getTableTilt(),
      },
      flipperPower: {
        left: this.getFlipperPower('left'),
        right: this.getFlipperPower('right'),
      },
    };
  }
}

// ─── Global Instance ──────────────────────────────────────────────────────────

let globalBamBridge: BamBridge | null = null;

export function initializeBamBridge(bamEngine: BAMEngine): BamBridge {
  globalBamBridge = new BamBridge(bamEngine);
  return globalBamBridge;
}

export function getBamBridge(): BamBridge | null {
  return globalBamBridge;
}
