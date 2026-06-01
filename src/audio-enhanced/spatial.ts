// SPDX-License-Identifier: AGPL-3.0-or-later
// © 2026 Harald Weiss

import { getAudioCtx } from '../audio-system';

export function calculate3DPositioning(
  sourcePos: { x: number; y: number },
  listenerPos: { x: number; y: number }
): { pan: number; attenuation: number } {
  const dx = sourcePos.x - listenerPos.x;
  const dy = sourcePos.y - listenerPos.y;
  const distance = Math.sqrt(dx * dx + dy * dy);

  const pan = Math.max(-1, Math.min(1, dx / 5.0));
  const attenuation = Math.max(0, 1.0 - distance / 10.0);

  return { pan, attenuation };
}

export function applyStereooPanning(gainNode: GainNode, pan: number): void {
  try {
    const ctx = getAudioCtx();

    if (ctx.createStereoPanner) {
      const panner = ctx.createStereoPanner();
      panner.pan.value = pan;

      const parentGain = ctx.createGain();
      gainNode.connect(panner);
      panner.connect(parentGain);
      parentGain.connect(ctx.destination);
    } else {
      gainNode.connect(ctx.destination);
    }
  } catch (e) {
    console.warn('[audio-enhanced] Spatial audio fallback:', (e || 'unknown'));
    gainNode.connect(getAudioCtx().destination);
  }
}
