/**
 * touch-controls.ts — On-screen touch button bindings for mobile/tablet play.
 *
 * Shows touch-left, touch-right, and touch-plunger buttons on touch-capable
 * devices and wires their touchstart/touchend events to game input.
 *
 * Extracted from main.ts IIFE (Phase 8).
 */
import { keys, state, physics } from '../game';
import { getAudioCtx, playSound, startBGMusic } from '../audio-system';

/**
 * Initialize touch controls for mobile/tablet devices.
 * Idempotent — safe to call multiple times.
 */
export function initTouchControls(): void {
  if (!('ontouchstart' in window) && navigator.maxTouchPoints < 1) return;

  // Show touch buttons
  ['touch-left', 'touch-right', 'touch-plunger'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = 'flex';
  });

  // Wire flipper buttons
  const bindFlipper = (id: string, side: 'left' | 'right') => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('touchstart', e => {
      e.preventDefault();
      keys[side] = true;
      getAudioCtx();
      playSound('flipper');
    }, { passive: false });
    el.addEventListener('touchend', e => {
      e.preventDefault();
      keys[side] = false;
    }, { passive: false });
  };

  bindFlipper('touch-left', 'left');
  bindFlipper('touch-right', 'right');

  // Wire plunger button
  const plBtn = document.getElementById('touch-plunger');
  if (!plBtn) return;

  plBtn.addEventListener('touchstart', e => {
    e.preventDefault();
    getAudioCtx();
    if (state.inLane && !state.plungerCharging) state.plungerCharging = true;
  }, { passive: false });

  plBtn.addEventListener('touchend', e => {
    e.preventDefault();
    if (state.inLane && state.plungerCharging) {
      state.plungerCharging = false;
      const charge = state.plungerCharge;
      state.inLane = false;
      state.plungerCharge = 0;
      state.ballSaveTimer = 3.5;
      if (physics) {
        physics.ballBody.setGravityScale(1.0, true);
        physics.ballBody.setTranslation({ x: 2.65, y: -5.0, z: 0 }, true);
        physics.ballBody.setLinvel({ x: 0, y: 16.0 + charge * 14.0, z: 0 }, true);
      }
      playSound('bumper');
      startBGMusic();
    }
  }, { passive: false });
}
