/**
 * rotation.ts — Playfield rotation with redraw.
 *
 * createRotateAndRedraw() returns a bound function with the original
 * (degrees, duration) signature so all call sites work unchanged.
 *
 * Extracted from main.ts.
 */
import * as THREE from 'three';
import { rotatePlayfieldSmooth } from '../rotation-engine';
import { saveRotation } from './rotation-utils';
import { applyPhysicsGravityForRotation } from './game-helpers';
import { getGraphicsPipeline } from '../graphics/graphics-pipeline';

export interface RotationDeps {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  composer: any | null;
  qualitySystem: { applyOptimizedTableView: () => void };
}

export type RotateAndRedrawFn = (
  targetDegrees: 0 | 90 | 180 | 270,
  duration?: number,
) => Promise<void>;

/**
 * Create a bound rotateAndRedraw function.
 * The returned function preserves the original (degrees, duration) signature.
 */
export function createRotateAndRedraw(deps: RotationDeps): RotateAndRedrawFn {
  const { scene, camera, renderer, composer, qualitySystem } = deps;

  return async (targetDegrees, duration = 400) => {
    await rotatePlayfieldSmooth(targetDegrees, duration);
    saveRotation(targetDegrees);
    applyPhysicsGravityForRotation(targetDegrees);

    requestAnimationFrame(() => {
      qualitySystem.applyOptimizedTableView();

      if (renderer) {
        renderer.render(scene, camera);
      }

      if (composer) {
        try {
          const pipeline = getGraphicsPipeline();
          if (pipeline) {
            pipeline.renderFrame(0);
          } else {
            composer.render();
          }
        } catch {
          composer.render();
        }
      }
    });
  };
}
