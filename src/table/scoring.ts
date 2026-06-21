// SPDX-License-Identifier: AGPL-3.0-or-later
import * as THREE from 'three';
import { state, physics, currentTableConfig, cb } from '../game';
import { getScoreAnimationManager } from '../score-animation-manager';
import { callScriptBumper, callScriptTarget, callScriptSlingshot } from '../script-engine';
import { playBumperSoundWithIntensity } from '../audio-system';

const ROLLOVER_XS = [-1.8, -0.6, 0.6, 1.8];
let rolloversHit = [false, false, false, false];

export function checkRolloverLanes(): void {
  ROLLOVER_XS.forEach((rx, i) => {
    const dx = state.ballPos.x - rx, dy = state.ballPos.y - 5.4;
    if (Math.abs(dx) < 0.3 && Math.abs(dy) < 0.2) {
      if (!rolloversHit[i]) {
        rolloversHit[i] = true;
        state.score += 500 * state.multiplier;
        cb.spawnParticles(rx, 5.4, currentTableConfig?.accentColor ?? 0x00ff88, 8);
        cb.updateHUD();
        if (rolloversHit.every(Boolean)) {
          rolloversHit.fill(false);
          state.multiplier = Math.min(5, state.multiplier + 1);
          cb.dmdEvent(`×${state.multiplier} ROLLOVER BONUS!`);
          cb.showNotification(`🏆 ×${state.multiplier} ROLLOVER BONUS!`);
          cb.updateHUD();
        } else {
          cb.dmdEvent('ROLLOVER!');
        }
      }
    } else {
      rolloversHit[i] = false;
    }
  });
}

export function scoreBumperHit(bumperData: { x: number; y: number; mesh: any; index: number }): void {
  // Skip if ball is in lane (not yet launched) — prevent pre-launch scoring
  if (state.inLane) return;

  state.score += (100 + (state.bumperCombo * 25)) * state.multiplier;
  state.bumperHits++;
  state.bumperCombo++;
  state.lastBumperHitTime = performance.now();
  const multi = Math.min(state.bumperComboMultiplier + (state.bumperCombo * 0.1), 5.0);
  state.bumperComboMultiplier = multi;

  if (state.bumperCombo >= 3) {
    cb.dmdEvent(`🔥 ${state.bumperCombo}x BUMPER COMBO!`);
  } else {
    cb.dmdEvent('BUMPER!');
  }

  // Enhanced bumper hit visual effects via Phase 16+ system
  try {
    const enhancement = getScoreAnimationManager();
    if (enhancement) {
      enhancement.addBumperHit(new THREE.Vector3(bumperData.x, bumperData.y, 0.55), state.score);
    }
  } catch { /* ignore */ }

  cb.spawnParticles(bumperData.x, bumperData.y, bumperData.mesh?.material?.color?.getHex?.() ?? 0xff8800, 12);
  cb.triggerBumperFlash();
  cb.triggerImpactEffect(new THREE.Vector3(bumperData.x, bumperData.y, 0), 1.0);

  const intensity = Math.min(0.5 + state.bumperCombo * 0.1, 1.0);
  playBumperSoundWithIntensity(intensity);
  cb.playSound('bumper');
  callScriptBumper(bumperData.index);
  cb.updateHUD();
}

export function updateSpinnerPhysics(): void {
  const spinnerX = 0, spinnerY = 1.5;
  const dx = state.ballPos.x - spinnerX, dy = state.ballPos.y - spinnerY;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist < 0.5 && dist > 0.05) {
    state.spinnerActive = true;
    const hitForce = 5.0 * (1 - dist / 0.5);
    const dir = dx > 0 ? 1 : -1;
    state.ballVel.x += dir * hitForce * 0.5;
    if (physics) {
      physics.ballBody.applyImpulse({ x: dir * hitForce, y: 0.5, z: 0 }, true);
    }
    const spinAngle = (performance.now() * 0.01) % (Math.PI * 2);
    (state as unknown as Record<string, number>).spinnerAngle = spinAngle;
    state.spinnerSpins++;
  } else {
    state.spinnerActive = false;
  }
}

export function scoreSpinnerHit(): void {
  state.score += 250 * state.multiplier;
  state.lastSpinnerHitTime = performance.now();
  cb.dmdEvent('SPINNER!');
  cb.playSound('bumper');
  cb.updateHUD();
}

export function scoreRampHit(rampData: any, index: number): void {
  state.score += (500 + (state.rampComboCounter * 100)) * state.multiplier;
  state.rampsHit.add(index);

  const now = performance.now();
  if (now - state.lastRampHitTime < 3000) {
    state.rampComboCounter++;
    state.rampComboMultiplier = Math.min(1 + state.rampComboCounter * 0.5, 5.0);
  } else {
    state.rampComboCounter = 1;
    state.rampComboMultiplier = 1.0;
  }
  state.lastRampHitTime = now;

  cb.dmdEvent(state.rampComboCounter > 1 ? `🔥 RAMP COMBO x${state.rampComboCounter}!` : 'RAMP COMPLETE!');
  cb.triggerRampCompletion();
  cb.triggerRampVisual();
  cb.showFloatingScore(new THREE.Vector3(rampData.x1, rampData.y1, 0.5), 500 * state.multiplier);
  cb.playSound('bumper');
  cb.updateHUD();
}

export function updateTargetSequenceHighlights(): void {
  // Phase 6: Update which targets are highlighted based on sequence
  if (state.targetSequence.length === 0) return;
  const currentTargetIdx = state.targetSequence[state.sequenceProgress];
  if (currentTargetIdx === undefined) {
    state.sequenceProgress = 0;
  }
}

export function scoreTargetHit(targetData: { x: number; y: number; mesh: any; index: number }): void {
  state.score += (500 + (state.targetProgress * 100)) * state.multiplier;
  state.targetHitCounts.set(targetData.index, (state.targetHitCounts.get(targetData.index) || 0) + 1);

  let targetMsg = 'TARGET!';
  const pMode: string = state.progressiveTargetMode;
  if (pMode === 'sequence') {
    if (targetData.index === state.targetSequence[state.sequenceProgress]) {
      state.sequenceProgress++;
      state.targetProgress++;
      if (state.sequenceProgress >= state.targetSequence.length) {
        state.score += 5000 * state.multiplier;
        targetMsg = '🏆 SEQUENCE COMPLETE! +5000!';
        state.sequenceProgress = 0;
        state.targetProgress = 0;
        state.progressiveTargetMode = 'none';
      } else {
        targetMsg = `🎯 TARGET ${state.sequenceProgress}/${state.targetSequence.length}`;
      }
    } else {
      state.sequenceProgress = 0;
      targetMsg = '❌ SEQUENCE BROKEN!';
    }
  } else if (pMode === 'countdown') {
    state.targetProgress++;
    const targetMax = (state as unknown as Record<string, number>).targetProgressMax ?? 5;
    if (state.targetProgress >= targetMax) {
      state.score += 3000 * state.multiplier;
      targetMsg = '🏆 COUNTDOWN BONUS! +3000!';
      state.targetProgress = 0;
    } else {
      targetMsg = `🎯 ${state.targetProgress}/${targetMax}`;
    }
  }

  cb.dmdEvent(targetMsg);
  cb.triggerBumperFlash();
  cb.showFloatingScore(new THREE.Vector3(targetData.x, targetData.y, 0.5), 500 * state.multiplier);
  cb.playTargetSound(0.9);
  cb.playSound('bumper');
  callScriptTarget(targetData.index);
  cb.updateHUD();
}

export function scoreSlingshotHit(side: string): void {
  const dir = side === 'left' ? 1 : -1;
  physics!.ballBody.applyImpulse({ x: dir * 3.0, y: 2.5, z: 0 }, true);
  const slingshotScore = 50 * state.multiplier;
  state.score += slingshotScore;

  const scoreAnimMgr = getScoreAnimationManager();
  if (scoreAnimMgr) {
    const slingshotPos = new THREE.Vector3(dir * 2.5, -2.0, 0.5);
    scoreAnimMgr.addSlingshotHit(slingshotPos, slingshotScore);
  }

  const slingshotPos = new THREE.Vector3(dir * 2.5, -2.0, 0.5);
  cb.showFloatingScore(slingshotPos, slingshotScore);
  cb.playSound('bumper');
  callScriptSlingshot(side);
  cb.updateHUD();
}
