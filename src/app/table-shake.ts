/**
 * table-shake.ts — Camera shake effect for table impacts.
 *
 * Extracted from main.ts. State variables are module-level,
 * managed by the factory closure. Registers cb.tableShake
 * directly for script-side triggers.
 */
import * as THREE from 'three';
import { cb } from '../game';

export interface TableShakeDeps {
  camera: THREE.PerspectiveCamera;
}

export interface TableShakeApi {
  applyTableShake: () => void;
}

/**
 * Initialize the table shake system.
 * Registers cb.tableShake and returns applyTableShake for the animate loop.
 */
export function initTableShake(deps: TableShakeDeps): TableShakeApi {
  const { camera } = deps;

  let shakeStartTime = 0;
  let currentShakeMagnitude = 0;
  let currentShakeDuration = 0;

  // Register callback for scripts to trigger shake
  cb.tableShake = (magnitude: number, duration: number) => {
    shakeStartTime = Date.now();
    currentShakeMagnitude = magnitude;
    currentShakeDuration = duration;
  };

  function applyTableShake(): void {
    if (shakeStartTime === 0 || !camera) return;

    const elapsed = Date.now() - shakeStartTime;
    if (elapsed > currentShakeDuration) {
      shakeStartTime = 0;
      return;
    }

    const progress = elapsed / currentShakeDuration;
    const magnitude = currentShakeMagnitude * (1.0 - progress * progress);

    const shakeX = (Math.random() - 0.5) * magnitude;
    const shakeY = (Math.random() - 0.5) * magnitude * 0.5;

    camera.position.x += shakeX;
    camera.position.y += shakeY;
  }

  return { applyTableShake };
}
