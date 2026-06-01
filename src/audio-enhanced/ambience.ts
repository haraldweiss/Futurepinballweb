// SPDX-License-Identifier: AGPL-3.0-or-later
// © 2026 Harald Weiss

import { getAudioCtx } from '../audio-system';

export class AmbienceManager {
  private ambienceGain: GainNode | null = null;
  private ambienceActive = false;
  private tensionLevel = 0;

  startGameAmbience(): void {
    if (this.ambienceActive) return;

    try {
      const ctx = getAudioCtx();
      this.ambienceGain = ctx.createGain();
      this.ambienceGain.gain.value = 0.08;
      this.ambienceGain.connect(ctx.destination);

      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = 55;

      osc.connect(this.ambienceGain);
      osc.start();

      this.ambienceActive = true;
    } catch (e) {
      console.debug('[audio-enhanced] Audio not available:', (e || 'unknown'));
    }
  }

  stopGameAmbience(): void {
    if (this.ambienceGain) {
      this.ambienceGain.gain.setTargetAtTime(0, getAudioCtx().currentTime, 0.2);
      this.ambienceActive = false;
    }
  }

  setTensionLevel(level: number): void {
    this.tensionLevel = Math.max(0, Math.min(1, level));
  }

  getTensionLevel(): number {
    return this.tensionLevel;
  }
}
