/**
 * resize-handler.ts — Responsive resize handler for playfield window.
 *
 * Adjusts canvas size, post-processing passes, UI element positioning,
 * and applies optimized table view on window resize.
 *
 * Extracted from main.ts Phase 9.
 */
import * as THREE from 'three';
import { getPlayfieldCanvasSize } from '../responsive-display';
import { getOptimalPixelRatio, detectDeviceType } from './responsive-helpers';
import { devLog } from '../utils/dev-log';

export interface ResizeHandlerDeps {
  renderer: THREE.WebGLRenderer;
  camera: THREE.PerspectiveCamera;
  qualitySystem: { applyOptimizedTableView: () => void };
  composer: any;
  ssrPass: any;
  motionBlurPass: any;
  perLightBloomPass: any;
}

/**
 * Initialize the responsive resize handler.
 * Registers a debounced window resize listener.
 */
export function initResizeHandler(deps: ResizeHandlerDeps): void {
  const { renderer, camera, qualitySystem, composer, ssrPass, motionBlurPass, perLightBloomPass } = deps;

  window.addEventListener('resize', () => {
    clearTimeout((window as any).resizeTimer);
    (window as any).resizeTimer = setTimeout(() => {
      try {
        qualitySystem.applyOptimizedTableView();

        const canvasSize = getPlayfieldCanvasSize();
        renderer.setPixelRatio(getOptimalPixelRatio());
        renderer.setSize(canvasSize.displayWidth, canvasSize.displayHeight);

        camera.aspect = canvasSize.displayWidth / canvasSize.displayHeight;
        camera.updateProjectionMatrix();

        if (composer) {
          composer.setSize(canvasSize.displayWidth, canvasSize.displayHeight);
        }
        if (ssrPass) {
          ssrPass.setSize(canvasSize.displayWidth, canvasSize.displayHeight);
        }
        if (motionBlurPass) {
          motionBlurPass.setSize(canvasSize.displayWidth, canvasSize.displayHeight);
        }
        if (perLightBloomPass) {
          perLightBloomPass.setSize(canvasSize.displayWidth, canvasSize.displayHeight);
        }

        // Responsive UI adjustments
        const isSmallMobile = window.innerWidth < 480;
        const isPortrait = window.innerHeight > window.innerWidth;

        const hud = document.getElementById('hud');
        if (hud) {
          hud.style.flexDirection = isSmallMobile ? 'column' : 'row';
          hud.style.gap = isSmallMobile ? '4px' : 'clamp(8px, 2vw, 20px)';
        }

        const buttons = [
          'open-loader', 'editor-btn', 'fullscreen-btn', 'multiscreen-btn',
          'hide-dmd-btn', 'install-btn', 'view-btn', 'dmd-mode-btn',
        ];
        buttons.forEach(btnId => {
          const btn = document.getElementById(btnId);
          if (!btn) return;
          if (isSmallMobile && ['editor-btn', 'multiscreen-btn'].includes(btnId)) {
            btn.style.display = 'none';
          } else {
            btn.style.display = btn.classList.contains('hidden') ? 'none' : 'block';
          }
        });

        const dmdWrap = document.getElementById('dmd-wrap');
        if (dmdWrap) {
          dmdWrap.style.maxHeight = isPortrait ? '60vh' : '80vh';
          dmdWrap.style.maxWidth = isPortrait ? '90vw' : '95vw';
        }

        const loaderModal = document.getElementById('loader-modal');
        if (loaderModal) loaderModal.style.maxHeight = '100vh';

        const loaderBox = document.getElementById('loader-box');
        if (loaderBox) {
          loaderBox.style.maxHeight = `${Math.min(90, window.innerHeight / 10)}vh`;
        }

        if (import.meta.env.DEV) {
          console.log(`📐 Window Resized: ${window.innerWidth}x${window.innerHeight} (DPR: ${window.devicePixelRatio})`);
        }
      } catch (error) {
        console.error('Error during resize handler:', error);
      }
    }, 250);
  });
}
