// SPDX-License-Identifier: AGPL-3.0-or-later
// © 2026 Harald Weiss

import { AudioCategory, AudioMixer } from './mixer';
import { getAudioCtx } from '../audio-system';

interface AudioLayer {
  sample: 'impact' | 'sustain' | 'tail' | 'custom';
  delay: number;
  duration: number;
  frequency: number;
  volumeScale: number;
  pitchShift: number;
}

export interface LayeredSound {
  name: string;
  layers: AudioLayer[];
}

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

          const finalVolume = layer.volumeScale * intensity;
          layerGain.gain.setValueAtTime(finalVolume, now);
          layerGain.gain.exponentialRampToValueAtTime(0.001, now + layer.duration);

          osc.connect(layerGain);
          layerGain.connect(gainNode);

          osc.start(now);
          osc.stop(now + layer.duration);
        } catch (e) {
          console.debug('[audio-enhanced] Audio context may have been destroyed:', (e || 'unknown'));
        }
      }, layer.delay);
    });
  } catch (e) {
    console.debug('[audio-enhanced] Audio not available:', (e || 'unknown'));
  }
}

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
