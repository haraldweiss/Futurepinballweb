// SPDX-License-Identifier: AGPL-3.0-or-later
// © 2026 Harald Weiss
/**
 * main.ts — Einstiegspunkt: Scene, Physik, Game-Loop, Input, UI, Multiscreen
 */
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass }     from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass }     from 'three/addons/postprocessing/ShaderPass.js';
import { FXAAShader }     from 'three/addons/shaders/FXAAShader.js';
import { createVolumetricLightingPass } from './graphics/volumetric-lighting';
import { SSRPass } from './graphics/ssr-pass';
import { initializeMetallicMaterials, getMetallicMaterialFactory } from './graphics/metallic-materials';
import { MotionBlurPass } from './graphics/motion-blur-pass';
import { CascadedShadowMapper, initializeCascadedShadows } from './graphics/cascaded-shadows';
import { PerLightBloomPass, initializePerLightBloom } from './graphics/per-light-bloom';
import { AdvancedParticleSystem, initializeParticleSystem, getParticleSystem } from './graphics/advanced-particle-system';
import { FilmEffectsPass, initializeFilmEffects, getFilmEffectsPass } from './graphics/film-effects-pass';
import { DepthOfFieldPass, initializeDepthOfField, getDepthOfFieldPass } from './graphics/dof-pass';
import { CascadedShadowCompositePass, initializeCascadedShadowComposite } from './graphics/cascaded-shadow-composite-pass';
import { initializeGraphicsPass } from './graphics/pass-initializer';

import {
  state, keys, fptResources, physics, currentTableConfig, plungerKnob, loadedLibrary, bamEngine,
  bumpers, extraBalls, partData, tableGroup,
  setPhysics, setFpScriptHandlers, setLoadedLibrary, setBAMEngine, cb,
} from './game';
import {
  getAudioCtx, playSound, startBGMusic, stopBGMusic, playFPTMusic, toggleMusic, initializeAudioPooling,
  getAudioSourcePool,
  initializeAudioSystem, getAudioSystem, AudioCategory,
  TARGET_HIT, FLIPPER_ACTIVATE, RAMP_COMPLETE, BALL_DRAIN, MULTIBALL_START, MILESTONE_REACHED,
  getSoundManager, disposeSoundManager,
  getMusicManager, disposeMusicManager,
} from './audio-system';
import { BAMEngine } from './bam-engine';
import { BamBridge, initializeBamBridge, getBamBridge } from './bam-bridge';
import {
  dmdState, dmdUpdate, dmdEvent, dmdRenderAttract, dmdRenderPlaying,
  dmdRenderEvent, dmdRenderGameOver, dmdCanvas, DMD_W, DMD_H,
  toggleDMDMode, dmdSolidMode, initDMDResizing,
} from './dmd';
import { getTopScores, recordScore } from './highscore';
import { TABLE_CONFIGS, buildTable, buildPhysicsTable, buildRealisticFlipper, scoreBumperHit, scoreTargetHit, scoreSlingshotHit, checkRolloverLanes, updateSpinnerPhysics, getAdvancedLighting } from './table';
import { runFPScript, callScriptFlipper, callScriptDrain } from './script-engine';
import { parseFPTFile, parseFPLFile, getBackglassArtwork } from './fpt-parser';
import { getBackglassRenderer, disposeBackglass } from './backglass';
import { getProfiler, QUALITY_PRESETS } from './profiler';
import { initializeGPUDiagnostics } from './gpu-diagnostics';
import { ScoreDisplayManager } from './score-display';
import { VisualPolishSystem, emitBallTrail, emitFlipperDust, emitMilestoneSparkles } from './visual-polish';
import { getIntegratedEditor } from './integrated-editor';
import { showTableSelector } from './table-selector';
import {
  CabinetSystem, initializeCabinetSystem, getCabinetSystem, getActiveCabinetProfile,
  setActiveCabinetProfile, rotatePlayfieldTo, CABINET_VERTICAL, CABINET_HORIZONTAL,
  CABINET_WIDE, CABINET_INVERTED,
} from './cabinet-system';
import {
  RotationEngine, initializeRotationEngine, getRotationEngine,
  applyProfileRotation, rotatePlayfieldSmooth, getFlipperOrientation,
} from './rotation-engine';
import {
  UIRotationManager, initializeUIRotation, getUIRotationManager,
  applyUIRotation, resetUIRotation,
} from './ui-rotation';
import {
  getPlayfieldCanvasSize, getDMDSize, getBackglassSize, applyRendererScaling,
  onDisplayResize, getDisplayDimensions,
} from './responsive-display';
import {
  initializeScreenRoleManager, getScreenRoleManager,
} from './screen-role-manager';
import {
  initializeScreenResolutionManager, getScreenResolutionManager,
} from './screen-resolution-manager';
import {
  InputMappingManager, initializeInputMapping, getInputMappingManager,
  applyInputMapping, resetInputMapping,
  getFlipperCorrectionAngles, getPlungerAdjustment,
} from './input-mapping';
import {
  AnimationBindingManager, initializeAnimationBinding, getAnimationBindingManager,
} from './mechanics/animation-binding';
import {
  initializeCoinSystem, showCoinScreen, closeCoinScreen, addCoin, startGame,
  isCoinScreenVisible, isGameStarted, getPlayerCount, resetCoinSystem, updateCoinDisplay,
} from './coin-system';
import {
  initializeKeyBindings, getKeyBindingManager, checkKeyBinding,
} from './keybindings';
import {
  AnimationScheduler, initializeAnimationScheduler, getAnimationScheduler,
} from './mechanics/animation-scheduler';
import {
  AnimationDebugger, initializeAnimationDebugger, getAnimationDebugger,
} from './animation/animation-debugger';
import {
  initializePhysicsWorker, getPhysicsWorker, disposePhysicsWorker,
  type PhysicsFrameData,
} from './physics-worker-bridge';
import {
  initializeGraphicsPipeline, getGraphicsPipeline,
} from './graphics/graphics-pipeline';
import {
  initializePlayfieldVisualEnhancement, getPlayfieldVisualEnhancement, disposePlayfieldVisualEnhancement,
} from './graphics/playfield-visual-enhancement';
import {
  initializeVideoManager, getVideoManager, disposeVideoManager,
  type VideoConfig, type VideoEvent,
} from './video-manager';
import {
  initializeVideoBinding, getVideoBindingManager, disposeVideoBinding,
} from './mechanics/video-binding';
import {
  FileSystemBrowser, FileInfo, FileOverview, formatFileSize, formatDate, createFileOverview,
  getFileSystemBrowser, resetFileSystemBrowser, getFileStatistics, getCompatibleLibraries,
} from './file-browser';
import {
  FileBrowserUIManager, getFileBrowserUIManager, resetFileBrowserUIManager,
} from './file-browser-ui';
import {
  AdvancedFileBrowserManager, getAdvancedFileBrowserManager, resetAdvancedFileBrowserManager,
  type FavoriteEntry, type BatchJob, type FilePreview,
} from './file-browser-advanced';
import {
  ResourceManager, initializeResourceManager, getResourceManager, resetResourceManager,
  type ResourceBudgets,
} from './resource-manager';
import {
  LibraryCache, initializeLibraryCache, getLibraryCache, resetLibraryCache,
} from './library-cache';
import { integrationTesting } from './integration-testing';
import { getPerformanceReportGenerator, generatePerformanceReport } from './performance-report-generator';
import { getTestSuite, resetTestSuite } from './test-suite';
import { DirectoryPathManager } from './directory-path-manager';
import { escapeHtml, setInnerHTMLSafe } from './utils/html-escape';
import { loadFpwConfig } from './utils/fpw-config';
import { initializeEventHandlers } from './event-handlers-init';
import { setupWindowAPI, setDevFlag, type WindowAPI } from './window-api';
import { getDefaultPhysicsConfig, logPhysicsConfig, validatePhysicsConfig } from './physics-config-enhancer';
import { getInputOptimizer, disposeInputOptimizer } from './input-optimizer';
import { getPerformanceDashboard } from './performance-dashboard';
import { initScoreAnimationManager, getScoreAnimationManager, disposeScoreAnimationManager } from './score-animation-manager';
import { initTouchControlsManager, getTouchControlsManager, disposeTouchControlsManager } from './touch-controls-manager';
import { initBallTrailManager, getBallTrailManager, disposeBallTrailManager } from './ball-trail-manager';

// ─── Phase 14: Export graphics pipeline for use in other modules ───
export { getGraphicsPipeline };

// ─── Responsive Display Helper Functions ──────────────────────────────────────
function calculateResponsiveZoom(aspectRatio: number): number {
  // Optimized for better screen space utilization
  let zoom: number;

  if (aspectRatio > 2.0) {
    // Ultra-wide (desktop ultrawide, TV): zoom in closer
    zoom = 12 + (2.0 - aspectRatio) * 2;  // 12-14 range
  } else if (aspectRatio > 1.5) {
    // Wide (16:9, 16:10, desktop): optimal range
    zoom = 14 + (aspectRatio - 1.5) * 4;  // 14-18 range
  } else if (aspectRatio > 1.0) {
    // Square-ish to slightly wide (tablets): moderate zoom
    zoom = 17 + (1.5 - aspectRatio) * 6;  // 17-20 range
  } else {
    // Tall (phones, portrait): pull back more to see full field
    zoom = 20 + (1.0 - aspectRatio) * 8;  // 20-28 range
  }

  return Math.max(12, Math.min(28, zoom));  // Clamp 12-28
}

function getResponsiveCameraTilt(aspectRatio: number): number {
  // Y offset: negative = camera lower (see more top), positive = camera higher (see more flippers)
  if (aspectRatio < 0.6) {
    return -8;   // Very tall: move UP to prioritize flippers
  } else if (aspectRatio < 0.9) {
    return -9;   // Tall phone: slightly up
  } else if (aspectRatio < 1.3) {
    return -9.5; // Tablet: balanced
  } else {
    return -10;  // Desktop: move DOWN to show more top area
  }
}

function getResponsiveFOV(): number {
  const width = window.innerWidth;

  // Smooth curve instead of discrete jumps
  if (width < 500) {
    return 65;  // Extreme mobile: keep wide FOV
  } else if (width < 768) {
    // Mobile transition: 65° → 62°
    const t = (width - 500) / 268;
    return 65 - (3 * t * t);  // Quadratic ease
  } else if (width < 1200) {
    // Tablet transition: 62° → 58°
    const t = (width - 768) / 432;
    return 62 - (4 * t * t);
  } else {
    return 58;  // Desktop: stable
  }
}

function getResponsiveFlipperX(aspectRatio: number): number {
  // Flipper width adapts to available horizontal space
  // ─── Phase 13+ Enhancement: Increased spacing for better playability ───
  const minFlipperX = 0.90;  // Narrowest (increased from 0.75 for playability)
  const maxFlipperX = 1.40;  // Widest (increased from 1.20)

  if (aspectRatio < 1.0) {
    // Tall: interpolate 0.90–1.05
    return minFlipperX + (aspectRatio - 0.5) * (1.05 - minFlipperX) / 0.5;
  } else {
    // Wide: interpolate 1.05–1.40
    return 1.05 + Math.min((aspectRatio - 1.0) * 0.18, maxFlipperX - 1.05);
  }
}

function getOptimalPixelRatio(): number {
  // Auto-detect 4K/1080p/HD and set optimal pixel ratio
  const physWidth = window.screen.width * window.devicePixelRatio;
  if (physWidth >= 3840) return Math.min(window.devicePixelRatio, 3);   // 4K
  if (physWidth >= 1920) return Math.min(window.devicePixelRatio, 2);   // 1080p/2K
  return Math.min(window.devicePixelRatio, 1.5);                        // HD/mobile
}

function calcSafeFlipperLength(flipperX: number): number {
  // Prevent flipper tips from crossing at full-up angle (35°)
  // Must ensure ball (diameter 0.44) can drain through center gap
  // Geometry: left tip at (-flipperX + len*cos(35°)), right tip at (flipperX - len*cos(35°))
  // Gap distance: 2*flipperX - 2*len*cos(35°) >= 0.44 (ball diameter)
  // → len <= (flipperX - 0.22) / cos(35°)
  const cos35 = Math.cos(35 * Math.PI / 180);  // ≈ 0.8192
  const ballRadius = 0.22;  // Ball radius (0.44 diameter)
  const maxLen = (flipperX - ballRadius) / cos35;
  return Math.min(2.1, Math.max(1.2, maxLen));  // Clamp 1.2–2.1
}

function getAutoQualityPreset(): string {
  // Auto-select quality based on display resolution
  const physWidth = window.screen.width * window.devicePixelRatio;
  if (physWidth >= 3840) return 'ultra';
  if (physWidth >= 1920) return 'high';
  if (physWidth >= 1280) return 'medium';
  return 'low';
}

// ─── Phase 13.2: Optimized Table View for Screen Size ───
function getOptimizedTableView(): { zoom: number; tilt: number; fov: number; quality: string } {
  const width = window.innerWidth;
  const height = window.innerHeight;
  const aspectRatio = width / height;
  const physWidth = window.screen.width * window.devicePixelRatio;

  return {
    zoom: calculateResponsiveZoom(aspectRatio),
    tilt: getResponsiveCameraTilt(aspectRatio),
    fov: getResponsiveFOV(),
    quality: getAutoQualityPreset(),
  };
}

function applyOptimizedTableView(): void {
  const view = getOptimizedTableView();

  // Apply camera settings
  if (camera instanceof THREE.PerspectiveCamera) {
    camera.fov = view.fov;
    camera.position.z = view.zoom;
    camera.position.y = view.tilt;
    camera.updateProjectionMatrix();
  }

  // Apply quality preset if changed
  const currentQuality = localStorage.getItem('fpw_quality_preset') || 'auto';
  if (currentQuality !== view.quality) {
    profiler.setQualityPreset(view.quality);
    applyQualityPreset();
    localStorage.setItem('fpw_quality_preset', view.quality);
  }
}


// ─── Phase 13.3: Rotation with Redraw ───
// Persists the chosen rotation so a cabinet doesn't need re-rotation on every cold start.
const ROTATION_KEY = 'fpw_playfield_rotation';
function saveRotation(deg: number): void {
  try { localStorage.setItem(ROTATION_KEY, String(deg)); } catch { /* localStorage may throw */ }
}
function loadSavedRotation(): 0 | 90 | 180 | 270 | null {
  try {
    const v = localStorage.getItem(ROTATION_KEY);
    if (v === '90' || v === '180' || v === '270' || v === '0') return Number(v) as 0 | 90 | 180 | 270;
  } catch { /* ignore */ }
  return null;
}

// Rotate the physics gravity vector to match the visual rotation. The scene
// is rotated visually around Z by `deg` clockwise; for the ball to *appear*
// to fall toward the player's bottom-of-screen, gravity in physics space
// must be the inverse rotation of (0, -9.8). Without this, after a 90°
// visual rotation the ball physically falls in the unrotated -Y direction —
// which on the rotated screen looks like sideways drift, ball goes out of
// bounds before reaching bumpers, no scoring → no animations to display.
function applyPhysicsGravityForRotation(deg: 0 | 90 | 180 | 270): void {
  const G = 9.8;
  let gx = 0, gy = -G;
  switch (deg) {
    case 0:   gx = 0;   gy = -G; break;
    case 90:  gx = -G;  gy = 0;  break;  // visual CW 90° → physics gravity left
    case 180: gx = 0;   gy = G;  break;
    case 270: gx = G;   gy = 0;  break;
  }
  // The physics worker is created lazily during table load. If we get here
  // before that (e.g. saved-rotation restore on startup) the worker call
  // throws — wrap in try/catch and rely on the next rotation pass after
  // table load to get the gravity right.
  try {
    const bridge = getPhysicsWorker();
    bridge?.setWorldGravity?.(gx, gy);
  } catch (e) {
    console.warn('[gravity] physics worker not ready yet, will retry after table load:', (e as Error).message);
  }
}

// Runtime gravity tester — call from DevTools console.
(window as any).testGravity = (x: number, y: number) => {
  const bridge = getPhysicsWorker();
  if (!bridge) {
    console.warn('[testGravity] physics worker not ready');
    return;
  }
  bridge.setWorldGravity?.(x, y);
  if (import.meta.env.DEV) { console.log(`[testGravity] world gravity set to (${x}, ${y})`); }
};

// Force-set the score to bypass the physics/bumper chain — used to isolate
// "does the cross-window state bridge work?" from "does the ball actually
// hit bumpers?". Call from playfield DevTools:
//   forceScore(123456)   // sets state.score, then dmdState.mode = 'playing'
// If after this call DMD/Backglass display 123456, the bridge is fine and
// the only remaining issue is the physics not letting the ball score.
// If they still show 0, there's a separate render bug to chase.
(window as any).forceScore = (n: number) => {
  state.score = n;
  state.ballNum = Math.max(1, state.ballNum);
  state.multiplier = Math.max(1, state.multiplier);
  // Push DMD into 'playing' so dmdRenderPlaying displays the score
  if (dmdState.mode === 'attract') dmdState.mode = 'playing';
  if (import.meta.env.DEV) { console.log(`[forceScore] state.score = ${n}, dmdState.mode = ${dmdState.mode}`); }
  if (import.meta.env.DEV) { console.log(`              expecting Backglass + DMD windows to show ${n} within 1 frame`); }
};

// Debug: dump current state diagnostics
(window as any).dumpState = () => {
  const diag = (window as any)._msDiag || {};
  if (import.meta.env.DEV) {
    console.log('=== STATE DIAGNOSTICS ===');
    console.log(`state.score = ${state.score}`);
    console.log(`state.ballNum = ${state.ballNum}`);
    console.log(`state.multiplier = ${state.multiplier}`);
    console.log(`state.bumperHits = ${state.bumperHits}`);
    console.log(`dmdState.mode = ${dmdState.mode}`);
    console.log(`dmdState.animFrame = ${dmdState.animFrame}`);
    console.log(`outgoing total = ${diag.outgoing_total}, bc=${diag.outgoing_bc_ok}, ipc=${diag.outgoing_ipc_ok}, ls=${diag.outgoing_ls_ok}`);
    console.log(`bridge_present = ${diag.bridge_present}`);
    console.log(`ipc_error = ${diag.outgoing_ipc_error}`);
  }
};

async function rotateAndRedraw(targetDegrees: 0 | 90 | 180 | 270, duration: number = 400): Promise<void> {
  // Rotate the playfield smoothly
  await rotatePlayfieldSmooth(targetDegrees, duration);
  saveRotation(targetDegrees);
  applyPhysicsGravityForRotation(targetDegrees);
  
  // After rotation completes, redraw with optimized view for new orientation
  requestAnimationFrame(() => {
    applyOptimizedTableView();

    // Force renderer update
    if (renderer) {
      renderer.render(scene, camera);
    }

    // Update composer if post-processing is active via graphics pipeline
    if (composer) {
      try {
        const pipeline = getGraphicsPipeline();
        if (pipeline) {
          pipeline.renderFrame(0);  // dt=0 for one-off renders
        } else {
          composer.render();
        }
      } catch (error) {
        composer.render();  // Fallback
      }
    }
  });
}
// ─── COMPREHENSIVE RESPONSIVE RESIZE HANDLER ───
// Adjusts all UI elements to fit the current browser window size
window.addEventListener('resize', () => {
  // Throttle resize events to avoid performance issues
  clearTimeout((window as any).resizeTimer);
  (window as any).resizeTimer = setTimeout(() => {
    try {
      // Apply optimized table view
      applyOptimizedTableView();

      // ─── Canvas Sizing ───
      // Use displayWidth/displayHeight (CSS pixels) — Three.js applies pixelRatio
      // internally. Passing canvasWidth (already pixelRatio-multiplied) here
      // would double-scale the canvas on HiDPI displays.
      const canvasSize = getPlayfieldCanvasSize();
      renderer.setPixelRatio(getOptimalPixelRatio());
      renderer.setSize(canvasSize.displayWidth, canvasSize.displayHeight);

      // Update camera aspect ratio
      camera.aspect = canvasSize.displayWidth / canvasSize.displayHeight;
      camera.updateProjectionMatrix();

      // ─── Update Post-Processing Passes ───
      // Composer/passes also expect CSS pixels — they manage their own
      // backbuffer allocation based on the renderer's pixelRatio.
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

      // ─── Reposition UI Elements for Different Viewport Sizes ───
      const isMobile = window.innerWidth < 768;
      const isSmallMobile = window.innerWidth < 480;
      const isPortrait = window.innerHeight > window.innerWidth;

      const hud = document.getElementById('hud');
      const buttons = [
        'open-loader', 'editor-btn', 'fullscreen-btn', 'multiscreen-btn',
        'hide-dmd-btn', 'install-btn', 'view-btn', 'dmd-mode-btn'
      ];

      // Adjust HUD for small screens
      if (hud && isSmallMobile) {
        hud.style.flexDirection = 'column';
        hud.style.gap = '4px';
      } else if (hud) {
        hud.style.flexDirection = 'row';
        hud.style.gap = 'clamp(8px, 2vw, 20px)';
      }

      // Hide/show buttons based on screen size
      buttons.forEach(btnId => {
        const btn = document.getElementById(btnId);
        if (btn) {
          if (isSmallMobile && ['editor-btn', 'multiscreen-btn'].includes(btnId)) {
            btn.style.display = 'none';
          } else {
            btn.style.display = btn.classList.contains('hidden') ? 'none' : 'block';
          }
        }
      });

      // Adjust dmd-wrap positioning
      const dmdWrap = document.getElementById('dmd-wrap');
      if (dmdWrap) {
        if (isPortrait) {
          dmdWrap.style.maxHeight = '60vh';
          dmdWrap.style.maxWidth = '90vw';
        } else {
          dmdWrap.style.maxHeight = '80vh';
          dmdWrap.style.maxWidth = '95vw';
        }
      }

      // Adjust modal max-height for small viewports
      const loaderModal = document.getElementById('loader-modal');
      if (loaderModal) {
        loaderModal.style.maxHeight = '100vh';
      }

      const loaderBox = document.getElementById('loader-box');
      if (loaderBox) {
        loaderBox.style.maxHeight = `${Math.min(90, window.innerHeight / 10)}vh`;
      }

      // Log resize info in debug mode (Vite exposes import.meta.env, not Node's process.env)
      if (import.meta.env.DEV) {
        console.log(`📐 Window Resized: ${window.innerWidth}x${window.innerHeight} (DPR: ${window.devicePixelRatio})`);
      }
    } catch (error) {
      console.error('Error during resize handler:', error);
    }
  }, 250);
});

function getResponsiveBackglassWidth(): string {
  const width = window.innerWidth;

  if (width < 768) {
    return '20vw';  // Mobile: minimal (80% for playfield)
  } else if (width < 1200) {
    return '25vw';  // Tablet: moderate
  } else if (width < 1800) {
    return '30vw';  // Desktop: original
  } else {
    return '35vw';  // Large desktop: more backglass space
  }
}

function detectDeviceType(): 'mobile' | 'tablet' | 'desktop' {
  const width = window.innerWidth;
  if (width < 768) return 'mobile';
  if (width < 1200) return 'tablet';
  return 'desktop';
}

// ─── Role Detection ───────────────────────────────────────────────────────────
window.FPW_MODULE_LOADED = true;  // Flag to confirm main.ts loaded
const FPW_ROLE = new URLSearchParams(location.search).get('role');
const FPW_SCREEN_INDEX = new URLSearchParams(location.search).get('screen');

// Store role info globally
window.FPW_ROLE = FPW_ROLE || 'playfield';
window.FPW_SCREEN_INDEX = FPW_SCREEN_INDEX || '0';

if (FPW_ROLE) document.body.classList.add(`role-${  FPW_ROLE}`);
window.FPW_DEVICE = detectDeviceType();

console.log(`🎮 FPW Window Started - Role: ${window.FPW_ROLE}, Screen: ${window.FPW_SCREEN_INDEX}, Size: ${window.innerWidth}x${window.innerHeight}`);

// ─── Screen Configuration from URL ────────────────────────────────────────────
// Support for startup scripts: ?screens=1|2|3|auto
const screenParam = new URLSearchParams(location.search).get('screens');
if (screenParam && ['1', '2', '3', 'auto'].includes(screenParam)) {
  const screenVal = screenParam === 'auto' ? 'auto' : parseInt(screenParam, 10);
  window._startupScreenConfig = screenVal;
}

// ─── BroadcastChannel ────────────────────────────────────────────────────────
const multiChannel: BroadcastChannel | null = typeof BroadcastChannel !== 'undefined'
  ? new BroadcastChannel('fpw-multiscreen') : null;

// Electron's IPC relay (electron-preload.cjs). Used as a fallback / parallel
// transport because BroadcastChannel does NOT cross independent BrowserWindow
// instances opened via main-process IPC — DMD/Backglass child windows therefore
// never receive playfield state updates and stay frozen. The relay always works
// in Electron and is undefined in plain browsers (where BroadcastChannel does
// the right thing). Both fire in parallel; receivers dedup naturally because
// they always overwrite local state with the latest payload.
const electronAPIRef: any = (typeof window !== 'undefined') ? window.electronAPI : null;
// Diagnostic counters reachable from any window's DevTools as `_msDiag`.
// In playfield console: `_msDiag` shows outgoing counts.
// In DMD/Backglass console: `_msStateMessages` shows incoming counts.
(window as any)._msDiag = {
  outgoing_total: 0,
  outgoing_bc_ok: 0,
  outgoing_ipc_ok: 0,
  outgoing_ls_ok: 0,
  outgoing_ipc_error: null as string | null,
  bridge_present: false,
};

// Throttle localStorage writes — every frame would be 60 writes/sec which
// thrashes IO. Once every 4 frames is plenty for DMD/Backglass animation.
const LS_KEY = 'fpw_ms_state';
let _lsThrottleCounter = 0;

function emitMultiscreenState(payload: any): void {
  const diag = (window as any)._msDiag;
  diag.outgoing_total++;
  // Transport 1: BroadcastChannel (browser tabs / same browsing context group)
  if (multiChannel) {
    try { multiChannel.postMessage(payload); diag.outgoing_bc_ok++; }
    catch { /* channel closed */ }
  }
  // Transport 2: Electron IPC (cross-window via main process)
  if (electronAPIRef?.broadcastState) {
    diag.bridge_present = true;
    try { electronAPIRef.broadcastState(payload); diag.outgoing_ipc_ok++; }
    catch (e: any) { diag.outgoing_ipc_error = String(e?.message || e); }
  }
  // Transport 3: localStorage `storage` event — fires across all same-origin
  // BrowserWindow instances in the same Electron session. Belt-and-suspenders
  // fallback in case BroadcastChannel doesn't bridge BCGs and IPC has a race.
  if (++_lsThrottleCounter >= 4) {
    _lsThrottleCounter = 0;
    try {
      // Stamp with timestamp so the value differs every write — otherwise
      // localStorage doesn't fire 'storage' for identical writes.
      localStorage.setItem(LS_KEY, JSON.stringify({ ...payload, _ts: Date.now() }));
      diag.outgoing_ls_ok++;
    } catch { /* localStorage may throw under strict mode */ }
  }
}

(window as any)._msStateMessages = { broadcastChannel: 0, electronIPC: 0, localStorage: 0 };
function subscribeMultiscreenState(handler: (data: any) => void): void {
  if (multiChannel) {
    multiChannel.onmessage = ({ data }) => {
      (window as any)._msStateMessages.broadcastChannel++;
      handler(data);
    };
  }
  if (electronAPIRef?.onStateBroadcast) {
    electronAPIRef.onStateBroadcast((data: any) => {
      (window as any)._msStateMessages.electronIPC++;
      handler(data);
    });
  }
  // localStorage `storage` event listener (transport 3)
  window.addEventListener('storage', (ev) => {
    if (ev.key !== LS_KEY || !ev.newValue) return;
    try {
      const data = JSON.parse(ev.newValue);
      (window as any)._msStateMessages.localStorage++;
      handler(data);
    } catch { /* malformed payload */ }
  });
}

// ─── Phase 5: Flipper Power Variations ────────────────────────────────────────
let leftFlipperChargeStart: number | null = null;   // Timestamp when left flipper pressed
let rightFlipperChargeStart: number | null = null;  // Timestamp when right flipper pressed
let lastLeftFlipperPower = 0.75;   // Default power level (0.5-1.0)
let lastRightFlipperPower = 0.75;  // Default power level (0.5-1.0)
let leftFlipperColliderHandle: number = -1;   // Saved for collision detection
let rightFlipperColliderHandle: number = -1;  // Saved for collision detection

// ─── Phase 25: Flipper sound tracking ───
let _lastLeftFlipperPressed = false;
let _lastRightFlipperPressed = false;

// ─── Phase 6: Flipper Power Curve (Skill-based Gameplay) ───────────────────────
// S-curve for more realistic flipper response: quick start, smooth acceleration, plateau
// This mimics Newton physics where longer button press = more flipper power
function calculateFlipperPowerCurve(chargeTimeFraction: number): number {
  // chargeTimeFraction: 0.0 (just pressed) to 1.0 (full charge)
  const t = Math.min(Math.max(chargeTimeFraction, 0), 1);

  // S-curve: slow start, faster middle, plateaus at end
  // Formula: smooth step function (Hermite interpolation)
  const sCurve = t < 0.5
    ? 2 * t * t                              // First half: accelerating
    : 1 - Math.pow(-2 * t + 2, 2) / 2;      // Second half: decelerating to plateau

  // Map to power range: 0.5 (min) to 1.0 (max)
  // But favor higher power: 0.5 + (sCurve * 0.5)
  return 0.5 + (sCurve * 0.5);
}

// ─── Phase 2: Advanced Lighting System ─────────────────────────────────────────
let advancedLightingSystem: ReturnType<typeof getAdvancedLighting> | null = null;

// ─── Phase 4: Backglass Renderer ───────────────────────────────────────────────
let backglassRenderer: ReturnType<typeof getBackglassRenderer> | null = null;
const backglassCanvasElement: HTMLCanvasElement | null = null;

// ─── Phase 5: Performance Profiler ────────────────────────────────────────────
const profiler = getProfiler();
let showProfiler = localStorage.getItem('fpw_show_profiler') === 'true';
let lastAppliedQualityPreset = '';  // Track quality changes for application

// ─── Auto-Tuned Quality from Installer (.fpw-config.json) ─────────────────────
// `installer.js` writes a quality preset based on detected RAM, GPU, and
// resolution. Honour it on first boot — but never overwrite a preset the
// user has already chosen (the profiler's loadQualityPreset() already restored
// any saved value from localStorage by this point).
(async () => {
  const userPick = localStorage.getItem('fpw_quality_preset');
  if (userPick) {
    console.log(`[fpw-config] Using saved quality preset: ${userPick}`);
    return;
  }
  const config = await loadFpwConfig();
  if (!config) return;  // Installer hasn't run, or file is malformed — keep default.
  console.log(
    `[fpw-config] Applying installer-detected quality preset: ${config.qualityPreset} ` +
    `(${config.system.osName}, ${config.system.totalMemoryGB}GB RAM, ` +
    `${config.display.primaryResolution.width}x${config.display.primaryResolution.height})`
  );
  profiler.setQualityPreset(config.qualityPreset);
  // The animate() loop calls applyQualityPreset() on its next FPS tick, which
  // diff-checks against `lastAppliedQualityPreset` and reconfigures the
  // renderer / bloom / shadow / DMD systems automatically.
})();

// ─── THREE.js Scene ───────────────────────────────────────────────────────────
const scene    = new THREE.Scene();
scene.background = new THREE.Color(0x1a1a22);  // ─── Brightened from 0x050508: Much darker gray instead of near-black
scene.fog = new THREE.Fog(0x1a1a22, 20, 50);   // ─── Match background color, still dark but not oppressive

// ─── Phase 10+: Playground Rotation Group (für Cabinet-Rotation) ─────────────
/**
 * All playfield elements (flippers, ball, bumpers, etc.) are added to this group
 * This allows us to rotate the entire playfield for different cabinet orientations
 */
const playgroundGroup = new THREE.Group();
playgroundGroup.name = 'playground';
scene.add(playgroundGroup);

// ─── Phase 27: Ball Trail Visualization ──────────────────────────────────────
initBallTrailManager(scene);
console.log('[Ball Trail] ✓ Initialized');

// ─── Phase 28: Score Animation Manager ───────────────────────────────────────
initScoreAnimationManager(scene);
console.log('[Score Animation] ✓ Initialized');

// ─── Phase 9: Score Display Manager ──────────────────────────────────────────
let scoreDisplayManager: ScoreDisplayManager | null = null;

// ─── Phase 9: Enhanced Audio System ──────────────────────────────────────────
const enhancedAudioSystem = initializeAudioSystem();

// ─── Phase 6: Audio Source Pool (GC pressure reduction) ──────────────────────
initializeAudioPooling();
logMsg(`🎵 AudioSourcePool initialized (16 pre-allocated sources)`, 'ok');

// ─── GPU Diagnostics (Windows multi-GPU support) ───────────────────────────────
initializeGPUDiagnostics();

// ─── Coin System (Arcade Insert Coin) ────────────────────────────────────────
initializeCoinSystem();
logMsg(`💰 Coin system initialized`, 'ok');

// ─── Key Binding Manager (Configurable Controls) ────────────────────────────
initializeKeyBindings();
logMsg(`🔑 Key Bindings initialized (VPX Standard)`, 'ok');

// ─── Phase 10+: Cabinet System (Rotation & Profiles) ──────────────────────────
const cabinetSystem = initializeCabinetSystem();
const activeCabinetProfile = cabinetSystem.autoDetectProfile();
console.log(`🎮 Cabinet profile auto-detected: ${activeCabinetProfile.name}`);

// ─── Screen Role Manager (Multi-screen Assignment) ────────────────────────────
const screenRoleManager = initializeScreenRoleManager();
const screenLayout = screenRoleManager.getLayout();
console.log(`🎮 Screen roles initialized: ${screenLayout.screens.map((s) => `${s.name}: ${s.role}`).join(', ')}`);

// ─── Screen Resolution Manager (Resolution Configuration) ─────────────────────
const screenResolutionManager = initializeScreenResolutionManager();
const resolutionLayout = screenResolutionManager.getLayout();
console.log(`📺 Screen resolutions initialized: ${resolutionLayout.screens.map((s) => `Screen ${s.screenIndex + 1}: ${s.width}x${s.height}`).join(', ')}`);

// ─── Phase 4: Resource Manager (Memory Budget Management) ──────────────────────
let resourceManager = initializeResourceManager();
logMsg(`💾 ResourceManager initialized with default budgets (50MB textures, 20MB audio, 50MB models, 150MB total)`, 'ok');

// ─── Phase 5: Library Cache with TTL & Cleanup ───────────────────────────────────
let libraryCache = initializeLibraryCache();
logMsg(`📚 LibraryCache initialized with 1-hour TTL and 5-minute cleanup interval`, 'ok');

const aspectRatio = innerWidth / innerHeight;
const responsiveZoom = calculateResponsiveZoom(aspectRatio);
const responsiveFOV = getResponsiveFOV();
const responsiveTilt = getResponsiveCameraTilt(aspectRatio);

const camera = new THREE.PerspectiveCamera(responsiveFOV, aspectRatio, 0.1, 200);
camera.position.set(0, responsiveTilt, responsiveZoom);  // Auto-zoom + tilt based on aspect ratio
camera.lookAt(0, 0.5, 0);

// DEBUG: Log camera setup for diagnostics
console.log('📷 Camera Configuration:', {
  fov: responsiveFOV,
  aspect: aspectRatio.toFixed(2),
  near: 0.1, far: 200,
  position: { x: 0, y: responsiveTilt.toFixed(2), z: responsiveZoom.toFixed(2) },
  lookAt: { x: 0, y: 0.5, z: 0 }
});

const renderer = new THREE.WebGLRenderer({ antialias: true, precision: 'highp' });
renderer.domElement.id = 'playfield-canvas';
// ─── Responsive Canvas Sizing ───
// Three.js convention: setPixelRatio FIRST, then setSize with CSS pixels.
// setSize internally multiplies by pixelRatio for the backbuffer and applies
// CSS dimensions in CSS pixels — feeding pre-multiplied "device pixels" here
// would double-scale the canvas on HiDPI screens (causing oversized canvas
// that overflows the viewport).
const initialCanvasSize = getPlayfieldCanvasSize();
renderer.setPixelRatio(getOptimalPixelRatio());
renderer.setSize(initialCanvasSize.displayWidth, initialCanvasSize.displayHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type    = THREE.PCFSoftShadowMap;
renderer.toneMapping       = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.35;  // ─── Phase 2: Increased from 1.15 to compensate for SSAO, fog, and dark background

// ─── Phase 2: Output Encoding for better color accuracy ───
renderer.outputColorSpace = THREE.SRGBColorSpace;

// WebGL2 Extensions: Texture Compression (S3TC, ETC, ASTC)
const gl = renderer.getContext()!;
['WEBGL_compressed_texture_s3tc', 'WEBGL_compressed_texture_s3tc_srgb',
 'WEBGL_compressed_texture_etc1', 'WEBGL_compressed_texture_etc',
 'WEBGL_compressed_texture_astc'].forEach(ext => gl.getExtension(ext));

document.body.appendChild(renderer.domElement);

// ─── WebGL context loss / restore ────────────────────────────────────────────
// VPIN cabinets idle for hours and the GPU sometimes resets the WebGL context.
// Without these listeners the canvas turns black until the user reloads.
renderer.domElement.addEventListener('webglcontextlost', (e: Event) => {
  e.preventDefault();
  console.warn('[fpw] WebGL context lost — rendering paused until restore');
}, false);
renderer.domElement.addEventListener('webglcontextrestored', () => {
  console.warn('[fpw] WebGL context restored — re-uploading GPU resources');
  // three.js automatically rebuilds program cache on next render; textures
  // and geometry are re-uploaded lazily as they're used.
}, false);

// ─── Environment Mapping (Phase 1: PBR Enhancements) ───────────────────────────
// Create a simple environment map for metallic surface reflections
(function setupEnvironmentMap() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  // Gradient environment: darker sky, brighter ground
  const gradient = ctx.createLinearGradient(0, 0, 0, 256);
  gradient.addColorStop(0, '#1a1a2e');    // Dark top (sky)
  gradient.addColorStop(0.5, '#4a4a6a');  // Mid (horizon)
  gradient.addColorStop(1, '#2a2a3e');    // Darker bottom (ground)
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 512, 256);

  const envMap = new THREE.CanvasTexture(canvas);
  envMap.mapping = THREE.EquirectangularReflectionMapping;
  envMap.colorSpace = THREE.SRGBColorSpace;

  scene.environment = envMap;
  console.log('✓ Environment mapping applied to scene');
})();

// ─── Shader Precompilation (Warm-up) ──────────────────────────────────────────
// Precompile common materials to avoid stutter on first render
(function precompileShaders() {
  const dummyScene = new THREE.Scene();
  const dummyGeo = new THREE.BoxGeometry();

  [
    new THREE.MeshStandardMaterial({ color: 0xff0000, metalness: 0.5, roughness: 0.5 }),
    new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 1.0, roughness: 0.02 }),
    new THREE.PointsMaterial({ size: 0.1, vertexColors: true }),
  ].forEach(mat => {
    const mesh = new THREE.Mesh(dummyGeo, mat);
    dummyScene.add(mesh);
    renderer.render(dummyScene, camera);
  });
  renderer.compile(dummyScene, camera);
  console.log('✓ Shader precompilation complete');
})();

// ─── Phase 2: Initialize Advanced Lighting System ───────────────────────────────
advancedLightingSystem = getAdvancedLighting(scene);
console.log('✓ Advanced lighting system initialized');

// ─── Phase 4: Initialize Backglass Renderer ────────────────────────────────────
// Create backglass with responsive dimensions
const backglassSize = getBackglassSize();
const backglassWidth = backglassSize.displayWidth;
const backglassHeight = backglassSize.displayHeight;
backglassRenderer = getBackglassRenderer(backglassWidth, backglassHeight);
console.log('✓ Backglass renderer initialized');

// ─── Phase 9: Initialize Score Display Manager ──────────────────────────────────
scoreDisplayManager = new ScoreDisplayManager(scene);
console.log('✓ Score display manager initialized');

// ─── Phase 9: Initialize Visual Polish System ──────────────────────────────────
let visualPolishSystem: VisualPolishSystem | null = null;

requestAnimationFrame(function initViewSettingsAndVisuals() {
  visualPolishSystem = new VisualPolishSystem(scene, camera);
  console.log('✓ Visual polish system initialized');
  initViewSettings();
  
  // ─── Phase 1 Security: Initialize Event Handlers (CSP-compliant) ───
  setTimeout(async () => {
    initializeEventHandlers();
    
    // ─── Phase 25: Initialize Sound Manager for audio feedback ───
    try {
      const soundMgr = await getSoundManager();
      console.log('[Sound Manager] ✓ Initialized');
      if (soundMgr.isEnabled()) {
        setTimeout(() => soundMgr.playSound('scoreUp'), 100);
      }
    } catch (e) {
      console.warn('[Sound Manager] Failed to initialize:', e);
    }

    // ─── Phase 29: Initialize Touch Controls for Mobile Devices ───
    if (typeof window !== 'undefined' && 'ontouchstart' in window) {
      try {
        const touchCtrl = initTouchControlsManager();
        
        // Register flipper callbacks
        touchCtrl.onLeftFlipperPressCallback(() => {
          keys.left = true;
          getSoundManager().then((sm) => sm.playFlipperHit(0.8)).catch(() => {});
        });
        touchCtrl.onLeftFlipperReleaseCallback(() => {
          keys.left = false;
        });
        
        touchCtrl.onRightFlipperPressCallback(() => {
          keys.right = true;
          getSoundManager().then((sm) => sm.playFlipperHit(0.8)).catch(() => {});
        });
        touchCtrl.onRightFlipperReleaseCallback(() => {
          keys.right = false;
        });
        
        // Register plunger callback
        touchCtrl.onPlungerChangeCallback((power: number) => {
          if (power > 0) {
            state.plungerCharging = true;
            state.plungerCharge = power;
          } else {
            state.plungerCharging = false;
          }
        });
        
        console.log('[Touch Controls] ✓ Initialized & bound to game');
        showNotification('📱 Touch controls enabled');
      } catch (e) {
        console.warn('[Touch Controls] Initialization failed:', e);
      }
    }
  }, 100);  // Brief delay to ensure all DOM elements are ready
});

const composer = new EffectComposer(renderer);
const renderPass = new RenderPass(scene, camera);
composer.addPass(renderPass);

// ─── Phase 10+: Initialize Rotation Engine ────────────────────────────────────
const rotationEngine = initializeRotationEngine(playgroundGroup, camera);
// Apply initial profile rotation
applyProfileRotation(activeCabinetProfile);
console.log(`✓ Rotation engine initialized with profile: ${activeCabinetProfile.name}`);

// Restore saved rotation preference (Ctrl+Q/E or VIEW panel buttons persist
// the user's choice). Auto-detect picks 0° based on monitor aspect ratio,
// but pinball cabinets commonly need 90°/270° to align the playfield with
// the physical screen orientation — so on a real cabinet the user's saved
// choice should win. Defer until after first render so physics + scene
// graph are ready, and re-deferring also so the physics worker has had
// time to receive 'init' (otherwise setWorldGravity is sent before the
// world exists and is silently dropped).
{
  const savedRot = loadSavedRotation();
  if (savedRot !== null && savedRot !== 0) {
    setTimeout(() => {
      console.log(`🎮 Restoring saved playfield rotation: ${savedRot}°`);
      void rotateAndRedraw(savedRot, 0);
    }, 1500);
  }
}

// ─── Phase 10+: Initialize UI Rotation Manager ─────────────────────────────────
const uiRotationManager = initializeUIRotation();
// Apply initial UI rotation based on active profile
applyUIRotation(activeCabinetProfile);
console.log(`✓ UI rotation manager initialized`);

// ─── Phase 10+: Initialize Input Mapping Manager ────────────────────────────────
const inputMappingManager = initializeInputMapping();
// Apply initial input mapping based on active profile
applyInputMapping(activeCabinetProfile);
console.log(`✓ Input mapping manager initialized`);

// ─── Phase 13+: Enhanced Bloom Effect for Demo Table ───
// Improved glow on ball, bumpers, and emissive surfaces
// Increased strength for more dramatic visual impact
const bloomPass = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 1.8, 0.8, 0.20);
bloomPass.threshold = 0.25;  // Higher threshold to reduce glow on dimmer surfaces
bloomPass.strength = 0.9;    // Reduced from 1.6 for less intense bloom
bloomPass.radius = 0.6;      // Slightly narrower glow falloff for more defined edges
composer.addPass(bloomPass);

// ─── Polish Suite Initialization (Phases 18-23) ─────────────────────────────
// Get quality preset once at initialization
const initPreset = profiler.getQualityPreset();

// ─── Phase 18: Screen Space Reflections (SSR) ────────────────────────────
const ssrPass: SSRPass | null = initializeGraphicsPass(
  'SSRPass',
  initPreset.ssrEnabled,
  () => new SSRPass(renderer, scene, camera, innerWidth, innerHeight),
  (pass) => {
    pass.setIntensity(initPreset.ssrIntensity);
    pass.setParameters(initPreset.ssrSamples, initPreset.ssrMaxDistance, 0.1);
    pass.setEnabled(true);
    // Add SSR to composer as ShaderPass
    const ssrShaderPass = new ShaderPass(pass.getShaderMaterial());
    composer.addPass(ssrShaderPass);
  }
);

// ─── Phase 19: Motion Blur (Velocity-Based Blur) ────────────────────────
const motionBlurPass: MotionBlurPass | null = initializeGraphicsPass(
  'MotionBlurPass',
  initPreset.motionBlurEnabled,
  () => new MotionBlurPass(renderer, innerWidth, innerHeight),
  (pass) => {
    pass.setIntensity(initPreset.motionBlurStrength);
    pass.setSamples(initPreset.motionBlurSamples);
    pass.setEnabled(true);
    // Add Motion Blur to composer as ShaderPass
    const motionBlurShaderPass = new ShaderPass(pass.getShaderMaterial());
    composer.addPass(motionBlurShaderPass);
  }
);

// ─── Phase 20: Cascaded Shadows ────────────────────────────────────────
const cascadedShadowMapper: CascadedShadowMapper | null = initializeGraphicsPass(
  'CascadedShadows',
  initPreset.cascadeShadowsEnabled,
  () =>
    initializeCascadedShadows(renderer, scene, camera as THREE.PerspectiveCamera, {
      cascadeCount: initPreset.cascadeCount,
      shadowMapSize: initPreset.cascadeShadowMapSize,
      lightDirection: new THREE.Vector3(0.5, -1, 0.5).normalize(),
      lightIntensity: 1.0,
    })
);

// ─── Phase 20: Cascaded Shadow Composite (Apply Shadows to Scene) ──────
const cascadedShadowCompositePass: CascadedShadowCompositePass | null = initializeGraphicsPass(
  'CascadedShadowComposite',
  initPreset.cascadeShadowsEnabled && cascadedShadowMapper !== null,
  () => initializeCascadedShadowComposite(innerWidth, innerHeight),
  (pass) => {
    // Wire cascade shadow maps to composite pass
    if (cascadedShadowMapper) {
      const cascadeInfo = cascadedShadowMapper.getCascadeInfo();
      const shadowMaps = cascadeInfo.cascades.map(c => c.shadowMap.texture);
      pass.setShadowMaps(shadowMaps);
      pass.setCascadeCount(cascadeInfo.count);

      // Set quality-based parameters
      const qualityConfig = {
        low: { intensity: 0.3, samples: 2 },
        medium: { intensity: 0.5, samples: 4 },
        high: { intensity: 0.7, samples: 8 },
        ultra: { intensity: 0.9, samples: 16 },
      };
      const config = qualityConfig[initPreset.name as 'low' | 'medium' | 'high' | 'ultra'];
      pass.setShadowIntensity(config.intensity);
      pass.setPCFSamples(config.samples);
      pass.setCameraFar((camera as THREE.PerspectiveCamera).far);
    }

    // Add to composer after blur passes, before volumetric
    if (pass) {
      composer.addPass(pass);
    }
  }
);

// ─── Phase 20: Per-Light Bloom ──────────────────────────────────────────
const perLightBloomPass: PerLightBloomPass | null = initializeGraphicsPass(
  'PerLightBloom',
  initPreset.perLightBloomEnabled,
  () => initializePerLightBloom(renderer, innerWidth, innerHeight),
  (pass) => {
    pass.setBloomStrength(initPreset.perLightBloomStrength);
    pass.setBloomThreshold(initPreset.perLightBloomThreshold);
    // Add Per-Light Bloom to composer as ShaderPass
    const perLightBloomShaderPass = new ShaderPass(pass.getShaderMaterial());
    composer.addPass(perLightBloomShaderPass);
  }
);

// ─── Phase 21: Advanced Particle System ────────────────────────────────
const particleSystem: AdvancedParticleSystem | null = initializeGraphicsPass(
  'ParticleSystem',
  initPreset.advancedParticlesEnabled,
  () => initializeParticleSystem(scene, initPreset.maxParticles),
  (pass) => {
    pass.setQualityPreset(initPreset.name as 'low' | 'medium' | 'high' | 'ultra');
  }
);

// ─── Phase 15: Volumetric Lighting (God Rays) ──────────────────────────
const volumetricPass = createVolumetricLightingPass(renderer);
volumetricPass.setExposure(1.2);  // ─── Increased from 0.6: Was darkening scene by 40%
volumetricPass.setParameters(0.5, 0.4, 0.95, 32);  // ─── Reduced decay from 0.8 to 0.5: Less aggressive falloff
composer.addPass((volumetricPass as any).pass || volumetricPass);

// ─── Phase 22: Film Effects (Grain + Aberration + Distortion) ──────────
const filmEffectsPass: FilmEffectsPass | null = initializeGraphicsPass(
  'FilmEffects',
  initPreset.filmEffectsEnabled,
  () => initializeFilmEffects(renderer),
  (pass) => {
    pass.setQualityPreset(initPreset.name as 'low' | 'medium' | 'high' | 'ultra');
    const shaderPass = new ShaderPass(pass.getShaderMaterial());
    composer.addPass(shaderPass);
  }
);

// ─── Phase 23: Depth of Field (Optional, Ultra-Only) ──────────────────
const dofPass: DepthOfFieldPass | null = initializeGraphicsPass(
  'DepthOfField',
  initPreset.depthOfFieldEnabled,
  () => initializeDepthOfField(renderer, camera as THREE.PerspectiveCamera),
  (pass) => {
    if (pass.isDeviceSupported?.()) {
      pass.setQualityPreset(initPreset.name as 'low' | 'medium' | 'high' | 'ultra');
      pass.setAperture(initPreset.dofAperture);
      pass.setSamples(initPreset.dofSamples);
      pass.setEnabled(true);
      const shaderPass = new ShaderPass(pass.getShaderMaterial());
      composer.addPass(shaderPass);
    }
  }
);

// FXAA: smoother edges at high DPI, performance-friendly alternative to MSAA
const fxaaPass = new ShaderPass(FXAAShader);
fxaaPass.uniforms['resolution'].value.x = 1 / (innerWidth * renderer.getPixelRatio());
fxaaPass.uniforms['resolution'].value.y = 1 / (innerHeight * renderer.getPixelRatio());
fxaaPass.renderToScreen = true;
composer.addPass(fxaaPass);

// ─── Phase 14: Initialize Graphics Pipeline ─────────────────────────────────────
// Initialize the modular graphics pipeline system (geometry pooling, material factory, lighting)
initializeGraphicsPipeline(renderer, scene, camera, composer);
console.log('✓ Graphics pipeline initialized');

// ─── Phase 16+: Initialize Playfield Visual Enhancements ─────────────────────────
// SSAO, Enhanced Materials, Color Grading, Improved Shadows
initializePlayfieldVisualEnhancement(scene, camera, renderer, composer);
console.log('✓ Playfield visual enhancements initialized');

// ─── Phase 18+: Initialize Enhanced Metallic Materials ──────────────────────────
// Metallic materials for ball, flippers, bumpers optimized for SSR
initializeMetallicMaterials();
console.log('✓ Enhanced metallic materials initialized');

// ─── Phase 17+: Initialize Event-Driven Video System ─────────────────────────────
// Support for backglass and DMD video playback triggered by game events
initializeVideoManager();
initializeVideoBinding();
console.log('✓ Video playback system initialized');

// ─── Phase 14: Initialize Standard Pinball Lighting via LightManager ───────────────
// Declare lights at module level so applyQualityPreset() can access them
let mainSpot: THREE.SpotLight | null = null;
let ambLight: THREE.AmbientLight | null = null;
let fillLight: THREE.PointLight | null = null;
let rimLight: THREE.DirectionalLight | null = null;

// Get LightManager from pipeline and initialize standard lighting
const lightManager = getGraphicsPipeline()?.getLightManager();
if (lightManager) {
  lightManager.initialize();
  console.log('✓ Pinball lighting system initialized via LightManager');
  // Try to get lights from LightManager if it exposes them
  // For now, create fallback lights anyway for applyQualityPreset() to use
  ambLight = new THREE.AmbientLight(0xffffff, 0.55);  // ─── Increased from 0.35: Critical for overall scene brightness
  scene.add(ambLight);
  mainSpot = new THREE.SpotLight(0xffffff, 2.5, 45, Math.PI/3.0, 0.20);
  mainSpot.position.set(0, 14, 16);
  mainSpot.castShadow = true;
  mainSpot.shadow.mapSize.set(2048, 2048);
  mainSpot.shadow.bias = -0.0020;
  mainSpot.shadow.normalBias = 0.030;
  mainSpot.shadow.camera.near = 0.5;
  mainSpot.shadow.camera.far = 120;
  mainSpot.shadow.blurSamples = 16;
  scene.add(mainSpot);
  fillLight = new THREE.PointLight(0xffffdd, 1.5, 35);
  fillLight.position.set(-9, 6, 9);
  fillLight.castShadow = true;
  scene.add(fillLight);
  const accentLight = new THREE.PointLight(0xccddff, 0.8, 25);
  accentLight.position.set(9, 4, 5);
  scene.add(accentLight);
  rimLight = new THREE.DirectionalLight(0x88ccff, 0.9);
  rimLight.position.set(0, 22, -12);
  rimLight.castShadow = true;
  scene.add(rimLight);
} else {
  // Fallback: create lights manually if LightManager unavailable
  console.warn('⚠️ LightManager not available, creating lights manually');
  ambLight = new THREE.AmbientLight(0xffffff, 0.55);  // ─── Increased from 0.35: Critical for overall scene brightness
  scene.add(ambLight);
  mainSpot = new THREE.SpotLight(0xffffff, 2.5, 45, Math.PI/3.0, 0.20);
  mainSpot.position.set(0, 14, 16);
  mainSpot.castShadow = true;
  mainSpot.shadow.mapSize.set(2048, 2048);
  mainSpot.shadow.bias = -0.0020;
  mainSpot.shadow.normalBias = 0.030;
  mainSpot.shadow.camera.near = 0.5;
  mainSpot.shadow.camera.far = 120;
  mainSpot.shadow.blurSamples = 16;
  scene.add(mainSpot);
  fillLight = new THREE.PointLight(0xffffdd, 1.5, 35);
  fillLight.position.set(-9, 6, 9);
  fillLight.castShadow = true;
  scene.add(fillLight);
  const accentLight = new THREE.PointLight(0xccddff, 0.8, 25);
  accentLight.position.set(9, 4, 5);
  scene.add(accentLight);
  rimLight = new THREE.DirectionalLight(0x88ccff, 0.9);
  rimLight.position.set(0, 22, -12);
  rimLight.castShadow = true;
  scene.add(rimLight);
}

// ─── Flipper (Responsive Positioning + Collision Prevention) ────────────────────
const flipperX = getResponsiveFlipperX(aspectRatio);  // Dynamic based on aspect ratio
const safeFlipperLen = calcSafeFlipperLength(flipperX);  // Prevent crossing
let leftFlipperGroup  = buildRealisticFlipper('left', safeFlipperLen);
let rightFlipperGroup = buildRealisticFlipper('right', safeFlipperLen);
leftFlipperGroup.position.set(-flipperX, -4.6, 0.35);
rightFlipperGroup.position.set( flipperX, -4.6, 0.35);
// ─── Phase 10+: Add to playground group (for cabinet rotation) ───
playgroundGroup.add(leftFlipperGroup, rightFlipperGroup);

// ─── Ball (PBR material with Subsurface Scattering) ──────────────────────────
// Phase 2: Enhanced ball with layered SSS approximation
const ballGroup = new THREE.Group();

// Main ball: ultra-reflective chrome with enhanced glow
// ─── Phase 13+ Enhancement: Brighter, more polished ball for demo visibility ───
const ballOuterMaterial = new THREE.MeshStandardMaterial({
  color: 0xffffff,
  metalness: 1.0,
  roughness: 0.01,  // Ultra-polished for maximum shine
  emissive: 0xbbddff,
  emissiveIntensity: 0.5,  // Increased for better visibility
  envMapIntensity: 2.5,  // Increased for more reflections
});

const ballOuter = new THREE.Mesh(
  new THREE.SphereGeometry(0.22, 48, 48),  // High segments for smooth reflections
  ballOuterMaterial
);
ballOuter.castShadow = true;
ballOuter.receiveShadow = true;
ballGroup.add(ballOuter);

// Inner glow layer: enhanced subsurface scattering approximation
// ─── Phase 13+ Enhancement: Brighter inner glow for visual impact ───
const ballGlowMaterial = new THREE.MeshStandardMaterial({
  color: 0xbbddff,
  transparent: true,
  opacity: 0.18,  // Increased for more visible glow
  emissive: 0xbbddff,
  emissiveIntensity: 0.85,  // Increased from 0.6 for brighter glow
  metalness: 0.1,
  roughness: 0.7,
  depthWrite: false,  // Prevents z-fighting
});

const ballGlow = new THREE.Mesh(
  new THREE.SphereGeometry(0.215, 32, 32),  // Slightly smaller
  ballGlowMaterial
);
ballGlow.receiveShadow = true;
ballGroup.add(ballGlow);

// Enhance main ball reference
const ball = ballOuter;  // For physics/position updates
// ─── Phase 10+: Add to playground group (for cabinet rotation) ───
playgroundGroup.add(ballGroup);

// Ball accent light: enhanced for demo visibility
// ─── Phase 13+ Enhancement: Brighter ball light for visual impact ───
const ballLight = new THREE.PointLight(0xbbddff, 3.0, 6.0);
ballLight.position.set(0.05, 0.05, 0.15);  // Slight offset for realism
ballLight.castShadow = true;
ballGroup.add(ballLight);

// ─── Partikel-System (Adaptive: Desktop=300, Tablet=200, Mobile=100) ───────────
let MAX_PARTS = 300;  // Auto-adjust based on device
if (/iPhone|iPad|Android|Mobile/.test(navigator.userAgent)) {
  MAX_PARTS = window.innerWidth < 768 ? 100 : 200;  // Mobile/Tablet
}

const partPos   = new Float32Array(MAX_PARTS * 3);
const partCol   = new Float32Array(MAX_PARTS * 3);
const partGeo   = new THREE.BufferGeometry();
partGeo.setAttribute('position', new THREE.BufferAttribute(partPos, 3));
partGeo.setAttribute('color',    new THREE.BufferAttribute(partCol, 3));

const partMat = new THREE.PointsMaterial({
  size: 0.09, vertexColors: true, transparent: true, opacity: 1.0,
  sizeAttenuation: true, depthWrite: false, fog: false,  // Disable fog for particles
  toneMapped: false,  // Skip tone mapping for particles
});
const partMesh = new THREE.Points(partGeo, partMat);
scene.add(partMesh);
console.log(`✓ Particle System: MAX_PARTS=${MAX_PARTS}`);

function spawnParticles(wx: number, wy: number, hexColor: number, count = 14): void {
  // Adaptive spawn: reduce particles on low FPS
  const adaptCount = currentFps < 45 ? Math.floor(count * 0.5) : count;

  // Use advanced particle system if enabled
  // NOTE: previously referenced a free variable `currentPreset` that only exists
  // inside applyQualityPreset() — every call here threw `ReferenceError:
  // currentPreset is not defined`. Because spawnParticles() runs inside the
  // animate loop, the throw aborted the rest of the frame work — including
  // emitMultiscreenState(), which is why DMD/Backglass child windows never
  // received state updates and stayed frozen on the cabinet.
  const preset = profiler.getQualityPreset();
  if (particleSystem && preset.advancedParticlesEnabled) {
    const color = new THREE.Color(hexColor);
    particleSystem.emit(new THREE.Vector3(wx, wy, 0.55), 'generic', adaptCount, color);
    return;
  }

  // Fallback: Basic particle system
  const r = ((hexColor >> 16) & 0xff) / 255;
  const g = ((hexColor >>  8) & 0xff) / 255;
  const b = ( hexColor        & 0xff) / 255;
  for (let i = 0; i < adaptCount; i++) {
    const angle = (i / adaptCount) * Math.PI * 2 + Math.random() * 0.4;
    const spd   = 2.5 + Math.random() * 4.5;
    partData.push({
      x:wx, y:wy, z:0.55,
      vx:Math.cos(angle)*spd, vy:Math.sin(angle)*spd,
      vz:1.5+Math.random()*3.0, life:1.0, r, g, b
    });
    if (partData.length > MAX_PARTS) partData.shift();
  }
}

function updateParticles(dt: number): void {
  let n = 0;
  for (let i = 0; i < partData.length; i++) {
    const p = partData[i]; p.life -= dt * 2.2;
    if (p.life <= 0) continue;
    p.x += p.vx*dt; p.y += p.vy*dt; p.z += p.vz*dt; p.vz -= 12*dt;
    const t = p.life;
    partPos[n*3]=p.x; partPos[n*3+1]=p.y; partPos[n*3+2]=p.z;
    partCol[n*3]=p.r*t; partCol[n*3+1]=p.g*t; partCol[n*3+2]=p.b*t;
    partData[n] = p; n++;
  }
  partData.length = n;
  partGeo.attributes.position.needsUpdate = true;
  partGeo.attributes.color.needsUpdate    = true;
  partGeo.setDrawRange(0, n);
}

// ─── Rapier2D Physik Init (lazy-loaded) ───────────────────────────────────────
let RAPIER: any = null;  // Global reference, loaded on demand

async function initPhysics(): Promise<void> {
  if (!RAPIER) RAPIER = await import('@dimforge/rapier2d-compat').then(m => m.default);
  await RAPIER.init();
  const world      = new RAPIER.World({ x: 0.0, y: -9.8 });
  const eventQueue = new RAPIER.EventQueue(true);

  const ballBody = world.createRigidBody(
    RAPIER.RigidBodyDesc.dynamic().setTranslation(2.55, -5.0).setGravityScale(0.0).setLinearDamping(0.0).setAngularDamping(0.9).setCcdEnabled(true)
  );
  const ballCollider = world.createCollider(
    RAPIER.ColliderDesc.ball(0.22).setRestitution(0.5).setFriction(0.3), ballBody
  );

  const lFlipperBody = world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(-1.15, -4.6).setCcdEnabled(true));
  const lFlipperCollider = world.createCollider(RAPIER.ColliderDesc.cuboid(1.05, 0.13).setTranslation(1.05, 0.0).setRestitution(0.5).setFriction(0.6), lFlipperBody);
  leftFlipperColliderHandle = lFlipperCollider.handle;  // Phase 5: Save handle

  const rFlipperBody = world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(1.15, -4.6).setCcdEnabled(true));
  const rFlipperCollider = world.createCollider(RAPIER.ColliderDesc.cuboid(1.05, 0.13).setTranslation(-1.05, 0.0).setRestitution(0.5).setFriction(0.6), rFlipperBody);
  rightFlipperColliderHandle = rFlipperCollider.handle;  // Phase 5: Save handle

  const addFixedBox = (x:number,y:number,hw:number,hh:number,angle=0,restitution=0.75) => {
    const body = world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(x,y).setRotation(angle));
    world.createCollider(RAPIER.ColliderDesc.cuboid(hw,hh).setRestitution(restitution).setFriction(0.2), body);
    return body;
  };
  addFixedBox(-3.15, 0.0,  0.11, 6.25);
  addFixedBox( 3.15, 0.0,  0.11, 6.25);
  addFixedBox( 0.0,  6.15, 3.27, 0.11);
  addFixedBox(2.35, 5.68, 0.60, 0.08, Math.atan2(0.56, -1.40), 0.65);

  const slingshotMap = new Map<number, string>();
  const addSlingshot = (x:number,y:number,angle:number,side:string) => {
    const body = world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(x,y).setRotation(angle));
    const col  = world.createCollider(
      RAPIER.ColliderDesc.cuboid(0.09, 0.65).setRestitution(0.85).setFriction(0.1)
        .setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS),
      body
    );
    slingshotMap.set(col.handle, side);
  };
  addSlingshot(-2.0, -1.6, -0.3, 'left');
  addSlingshot( 2.0, -1.6,  0.3, 'right');

  // Inlane guides: from below slingshot down to flipper pivot — close off the outlane pocket
  // Drain guides: slope outward below flipper pivot so ball channels cleanly to drain
  const addSeg = (x1:number,y1:number,x2:number,y2:number,res=0.65) => {
    const cx=(x1+x2)/2, cy=(y1+y2)/2, dx=x2-x1, dy=y2-y1;
    addFixedBox(cx, cy, Math.sqrt(dx*dx+dy*dy)/2, 0.07, Math.atan2(dy,dx), res);
  };
  addSeg(-1.9, -2.3, -1.15, -4.5);   // left inlane guide
  addSeg( 1.9, -2.3,  1.15, -4.5);   // right inlane guide
  addSeg(-1.15, -4.85, -2.5, -6.2);  // left drain guide
  addSeg( 1.15, -4.85,  2.5, -6.2);  // right drain guide

  setPhysics({ world, ballBody, ballCollider, eventQueue, lFlipperBody, rFlipperBody,
    bumperMap: new Map(), targetMap: new Map(), slingshotMap, tableBodies: [] });
}

// ─── Ball Reset ───────────────────────────────────────────────────────────────
function resetBall(): void {
  // Position ball ON TOP of plunger knob (knob world Y = -5.5) so plunger can push it
  // Knob top surface at -5.39, add ball radius 0.2 = -5.19 ≈ -5.2
  state.ballPos.set(2.65, -5.2, 0.3);
  state.ballVel.x = 0; state.ballVel.y = 0;
  state.inLane = true; state.tiltWarnings = 0; state.tiltActive = false;
  state.plungerCharge = 0; state.plungerCharging = false;

  // Phase 15: Update physics worker if available
  try {
    const bridge = getPhysicsWorker();
    bridge.updateBallPosition(2.65, -5.2, 0, 0);
    bridge.setBallGravityScale(0.0);
  } catch (e) {
    console.warn('[main] Falling back to direct physics:', (e || 'unknown'));
    // Fallback: Direct physics access (single-threaded)
    if (physics) {
      physics.ballBody.setGravityScale(0.0, true);
      physics.ballBody.setTranslation({ x:2.65, y:-5.2 }, true);
      physics.ballBody.setLinvel({ x:0, y:0 }, true);
      physics.ballBody.setAngvel(0, true);
    }
  }
}

// ─── Game State Reset (on table load) ──────────────────────────────────────────
function resetGameState(): void {
  state.score = 0;
  state.ballNum = 1;
  state.multiplier = 1;
  state.bumperHits = 0;
  state.inLane = true;
  state.tiltWarnings = 0;
  state.tiltActive = false;
  state.plungerCharge = 0;
  state.plungerCharging = false;
  state.ballSavesRemaining = 1;
  state.ballSaveMode = 'none';
  state.lastRank = 0;

  // ─── Arcade Mode: Initialize player/coin system ───
  state.credits = 0;
  state.numPlayers = 0;
  state.currentPlayer = 0;
  state.playerScores = [0, 0, 0, 0];

  resetBall();
  cb.updateHUD();
}

// ─── Phase 15: Initialize Physics Worker (after table build) ──────────────────────
async function setupPhysicsWorker(): Promise<void> {
  setDevFlag('SETUP_WORKER_START', Date.now());
  try {
    setDevFlag('SETUP_WORKER_INIT_START', Date.now());
    const bridge = await initializePhysicsWorker();
    if (import.meta.env.DEV) {
      setDevFlag('SETUP_WORKER_INIT_OK', Date.now());
      setDevFlag('SETUP_WORKER_INIT_TIME', (window.debugWindow?.SETUP_WORKER_INIT_OK ?? 0) - (window.debugWindow?.SETUP_WORKER_INIT_START ?? 0));
    }

    if (physics) {
      setDevFlag('SETUP_WORKER_CONFIG_START', Date.now());

      // ─── Phase 24: Use Enhanced Physics Configuration ───
      const physicsConfig = getDefaultPhysicsConfig();
      const validation = validatePhysicsConfig(physicsConfig);
      if (!validation.valid) {
        console.warn('[Physics] Config validation errors:', validation.errors);
      }
      if (validation.warnings.length > 0) {
        console.warn('[Physics] Config warnings:', validation.warnings);
      }
      logPhysicsConfig(physicsConfig, 'Table Load');

      const cleanBumperMap = new Map();
      physics.bumperMap.forEach((value: any, key: any) => {
        cleanBumperMap.set(key, { x: value.x, y: value.y, index: value.index });
      });

      const cleanTargetMap = new Map();
      physics.targetMap.forEach((value: any, key: any) => {
        cleanTargetMap.set(key, { x: value.x, y: value.y, index: value.index });
      });

      const tableBodies = [
        { type: 'box', x: 0,     y: 6.3,  width: 3.3,  height: 0.2, restitution: 0.5, friction: 0.2 },
        { type: 'box', x: -3.15, y: 0,    width: 0.15, height: 7.0, restitution: 0.5, friction: 0.2 },
        { type: 'box', x: 3.15,  y: 0,    width: 0.15, height: 7.0, restitution: 0.5, friction: 0.2 },
        { type: 'box', x: -2.2,  y: -1.5, width: 0.12, height: 0.9, rotation: -0.5,  restitution: 1.4, friction: 0.3 },
        { type: 'box', x:  2.2,  y: -1.5, width: 0.12, height: 0.9, rotation:  0.5,  restitution: 1.4, friction: 0.3 },
        { type: 'box', x: -1.15, y: -5.05, width: 0.1, height: 1.0, restitution: 0.5, friction: 0.2 },
        { type: 'box', x:  1.15, y: -5.05, width: 0.1, height: 1.0, restitution: 0.5, friction: 0.2 },
        { type: 'box', x: 0,     y: -6.0, width: 3.2, height: 0.2, restitution: 0.3, friction: 0.1 },
        { type: 'box', x: 2.10, y: -5.5, width: 0.08, height: 1.5, restitution: 0.5, friction: 0.3 },
        { type: 'box', x: 3.20, y: -5.5, width: 0.08, height: 1.5, restitution: 0.5, friction: 0.3 },
        { type: 'box', x: 2.65, y: -7.0, width: 0.55, height: 0.12, restitution: 0.5, friction: 0.5 },
        { type: 'box', x: -1.55, y: -4.4, width: 0.35, height: 0.12, rotation: -0.35, restitution: 0.5, friction: 0.5 },
        { type: 'box', x:  1.55, y: -4.4, width: 0.35, height: 0.12, rotation:  0.35, restitution: 0.5, friction: 0.5 },
      ];

      bridge.initializePhysicsWorld({
        ballInitialPos: { x: 2.65, y: -5.2 },
        ballRestitution: physicsConfig.ball.restitution,
        ballFriction: physicsConfig.ball.friction,
        leftFlipperPos: { x: -getResponsiveFlipperX(innerWidth / innerHeight), y: -4.6 },
        rightFlipperPos: { x: getResponsiveFlipperX(innerWidth / innerHeight), y: -4.6 },
        flipperLength: physicsConfig.flipper.length,
        flipperRestitution: physicsConfig.flipper.restitution,
        flipperFriction: physicsConfig.flipper.friction,
        tableBodies,
        bumperMap: cleanBumperMap,
        targetMap: cleanTargetMap,
        slingshotMap: physics.slingshotMap,
      });
      setDevFlag('SETUP_WORKER_CONFIG_OK', Date.now());

      if (import.meta.env.DEV) { setDevFlag('SETUP_WORKER_CALLBACK_START', Date.now()); }
      bridge.setFrameCallback((frame: PhysicsFrameData) => {
        handlePhysicsFrame(frame);
      });
      setDevFlag('SETUP_WORKER_CALLBACK_OK', Date.now());

      if (import.meta.env.DEV) {
        console.log('✓ Physics worker initialized and ready');
        setDevFlag('SETUP_WORKER_COMPLETE', true);
      }
    } else {
      setDevFlag('SETUP_WORKER_NO_PHYSICS', true);
    }
  } catch (error) {
    setDevFlag('SETUP_WORKER_ERROR', (error as Error).message);
    console.error('Failed to initialize physics worker:', error);
    console.warn('Falling back to single-threaded physics');
  }
  setDevFlag('SETUP_WORKER_END', Date.now());
}

// ─── Phase 15: Handle Physics Frame Updates ────────────────────────────────────
function handlePhysicsFrame(frame: PhysicsFrameData): void {
  // Update ball position and velocity from physics worker
  state.ballPos.set(frame.ballPos.x, frame.ballPos.y, frame.ballPos.z);
  state.ballVel.x = frame.ballVel.x;
  state.ballVel.y = frame.ballVel.y;

  // Handle collisions
  for (const collision of frame.collisions) {
    switch (collision.type) {
      case 'bumper': {
        const bumperData = physics?.bumperMap.get(collision.data.index);
        if (bumperData) {
          scoreBumperHit(bumperData);
          // ─── Phase 25: Play bumper sound ───
          getSoundManager().then((sm) => sm.playBumperHit()).catch(() => {});
        }
        break;
      }
      case 'target': {
        const targetData = physics?.targetMap.get(collision.data.index);
        if (targetData) {
          scoreTargetHit(targetData);
          // ─── Phase 25: Play target sound ───
          getSoundManager().then((sm) => sm.playTargetHit()).catch(() => {});
        }
        break;
      }
      case 'slingshot': {
        scoreSlingshotHit(collision.data.side);
        // ─── Phase 25: Play slingshot sound ───
        getSoundManager().then((sm) => sm.playSlingshot()).catch(() => {});
        break;
      }
      case 'flipper_left':
      case 'flipper_right': {
        // Flipper collision handled in physics engine
        break;
      }
    }
  }
}

// ─── Phase 16+: Helper function to apply enhanced visuals to playfield ────────
function applyEnhancedVisualsToTable(sceneTarget: THREE.Scene): void {
  const enhancement = getPlayfieldVisualEnhancement();
  if (!enhancement) return;

  // Traverse scene and apply enhanced materials to identified playfield elements
  sceneTarget.traverse((obj: THREE.Object3D) => {
    if (!(obj instanceof THREE.Mesh)) return;

    const mesh = obj as THREE.Mesh;
    const name = mesh.name.toLowerCase();

    // Identify element type and apply appropriate enhanced material
    if (name.includes('bumper')) {
      enhancement.applyEnhancedMaterial(mesh, 'bumper', mesh.material instanceof THREE.MeshStandardMaterial ? (mesh.material as any).color : '#ff6600');
    } else if (name.includes('target')) {
      enhancement.applyEnhancedMaterial(mesh, 'target', mesh.material instanceof THREE.MeshStandardMaterial ? (mesh.material as any).color : '#00ff00');
    } else if (name.includes('ramp')) {
      enhancement.applyEnhancedMaterial(mesh, 'ramp', mesh.material instanceof THREE.MeshStandardMaterial ? (mesh.material as any).color : '#ccb366');
    } else if (name.includes('flipper')) {
      enhancement.applyEnhancedMaterial(mesh, 'flipper', mesh.material instanceof THREE.MeshStandardMaterial ? (mesh.material as any).color : '#ff6600');
    } else if (name.includes('ball')) {
      enhancement.applyEnhancedMaterial(mesh, 'ball', '#ffffff');
    } else if (name.includes('playfield') || name.includes('table')) {
      enhancement.applyEnhancedMaterial(mesh, 'playfield', mesh.material instanceof THREE.MeshStandardMaterial ? (mesh.material as any).color : '#8b7355');
    }
  });

  console.log('✓ Enhanced visuals applied to table');
}

// ─── Phase 15: Helper function to load table with physics worker ────────────────
async function loadTableWithPhysicsWorker(tableConfig: any, sceneTarget: THREE.Scene, library?: any): Promise<void> {
  if (import.meta.env.DEV) {
    console.log('[loadTableWithPhysicsWorker] START');
    setDevFlag('BUILD_TABLE_START', Date.now());
    console.log('[loadTableWithPhysicsWorker] Building table...');
  }
  buildTable(tableConfig, sceneTarget, library, playgroundGroup);
  if (import.meta.env.DEV) {
    setDevFlag('BUILD_TABLE_OK', Date.now());
    setDevFlag('BUILD_TABLE_TIME_MS', (window.debugWindow?.BUILD_TABLE_OK ?? 0) - (window.debugWindow?.BUILD_TABLE_START ?? 0));
    console.log('[loadTableWithPhysicsWorker] Table built in', window.debugWindow?.BUILD_TABLE_TIME_MS, 'ms');
  }

  applyEnhancedVisualsToTable(sceneTarget);

  if (import.meta.env.DEV) {
    setDevFlag('PHYSICS_WORKER_START', Date.now());
    console.log('[loadTableWithPhysicsWorker] Setting up physics worker...');
  }
  try {
    await setupPhysicsWorker();
    if (import.meta.env.DEV) {
      setDevFlag('PHYSICS_WORKER_OK', Date.now());
      setDevFlag('PHYSICS_WORKER_TIME_MS', (window.debugWindow?.PHYSICS_WORKER_OK ?? 0) - (window.debugWindow?.PHYSICS_WORKER_START ?? 0));
      console.log('[loadTableWithPhysicsWorker] Physics worker setup OK in', window.debugWindow?.PHYSICS_WORKER_TIME_MS, 'ms');
      setDevFlag('LOAD_TABLE_COMPLETE', true);
    }
  } catch (error) {
    setDevFlag('PHYSICS_WORKER_ERROR', (error as Error)?.message ?? '');
    console.error('Physics worker setup failed:', error);
  }
  if (import.meta.env.DEV) { console.log('[loadTableWithPhysicsWorker] COMPLETE'); }
}

// ─── Phase 17+: Video Event Trigger System ───────────────────────────────────
// Helper functions to trigger videos based on game events
function triggerVideoEvent(eventType: string): void {
  const videoManager = getVideoManager();
  const bindingManager = getVideoBindingManager();

  if (!videoManager || !bindingManager) return;

  // Find best binding for this event trigger
  const binding = bindingManager.findBestBinding(eventType, state);

  if (binding) {
    videoManager.triggerVideoForEvent(eventType);
  }
}

// Game event video triggers
function onBumperHitVideo(): void {
  triggerVideoEvent('bumper_hit');
}

function onTargetHitVideo(): void {
  triggerVideoEvent('target_hit');
}

function onRampCompleteVideo(): void {
  triggerVideoEvent('ramp_complete');
}

function onMultiballStartVideo(): void {
  triggerVideoEvent('multiball_start');
}

function onBallDrainVideo(): void {
  triggerVideoEvent('ball_drain');
  // ─── Phase 25: Play ball drain sound ───
  getSoundManager().then((sm) => sm.playBallDrain()).catch(() => {});
}

function onFlipperHitVideo(): void {
  triggerVideoEvent('flipper_hit');
}

function onSlingshotVideo(): void {
  triggerVideoEvent('slingshot');
}

function onSpinnerVideo(): void {
  triggerVideoEvent('spinner');
}

function onComboVideo(): void {
  triggerVideoEvent('combo');
}

function onTiltVideo(): void {
  triggerVideoEvent('tilt');
}

function onGameOverVideo(): void {
  triggerVideoEvent('game_over');
  // ─── Phase 25: Play game over sound ───
  getSoundManager().then((sm) => sm.playGameOver()).catch(() => {});
}

// ─── Tilt ────────────────────────────────────────────────────────────────────
function nudgeTable(direction: number): void {
  if (state.tiltActive || state.inLane) return;
  state.tiltWarnings++;
  if (state.tiltWarnings >= 3) {
    state.tiltActive = true;

    // Phase 15: Apply tilt impulse via physics worker if available
    try {
      const bridge = getPhysicsWorker();
      // Set velocity directly for immediate tilt effect
      const currentBall = physics?.ballBody.linvel() ?? { x: 0, y: 0 };
      bridge.updateBallPosition(state.ballPos.x, state.ballPos.y, direction*1.5, -3.0);
    } catch (e) {
      console.warn('[main] Physics worker fallback (tilt):', (e || 'unknown'));
      // Fallback: Direct physics access (single-threaded)
      if (physics) physics.ballBody.setLinvel({ x:direction*1.5, y:-3.0 }, true);
      else { state.ballVel.x = direction*1.5; state.ballVel.y = -3.0; }
    }

    dmdEvent('TILT!!!'); showNotification('⚠️ TILT!'); playSound('drain');

    // ─── Phase 17+: Trigger tilt video ───
    onTiltVideo();

    setTimeout(() => { state.tiltActive = false; }, 100);
  } else {
    const force = 1.8 + state.tiltWarnings * 0.6;

    // Phase 15: Apply nudge impulse via physics worker if available
    try {
      const bridge = getPhysicsWorker();
      // For nudge, we apply velocity change to existing velocity
      const newVx = state.ballVel.x + direction * force;
      const newVy = state.ballVel.y + 0.5;
      bridge.updateBallPosition(state.ballPos.x, state.ballPos.y, newVx, newVy);
    } catch (e) {
      console.warn('[main] Physics worker fallback (nudge):', (e || 'unknown'));
      // Fallback: Direct physics access (single-threaded)
      if (physics) physics.ballBody.applyImpulse({ x:direction*force, y:0.5 }, true);
      else { state.ballVel.x += direction*force; state.ballVel.y += 0.5; }
    }

    dmdEvent(state.tiltWarnings === 2 ? 'TILT WARNING!!' : 'TILT WARNING!');
    spawnParticles(state.ballPos.x, state.ballPos.y, 0xffaa00, 6);
  }
}

// ─── Multiball ────────────────────────────────────────────────────────────────
function launchMultiBall(): void {
  if (extraBalls.length >= 2 || state.inLane) return;
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(0.22, 24, 24),
    new THREE.MeshStandardMaterial({ color:0xffcc00, metalness:1.0, roughness:0.05, emissive:0xff8800, emissiveIntensity:0.4 })
  );
  mesh.add(new THREE.PointLight(0xffaa00, 1.8, 4));
  mesh.castShadow = true; scene.add(mesh);

  const startX = (Math.random()-0.5)*1.2, startY = 2.5+Math.random();
  let rapierBody: any = null;
  if (physics && RAPIER) {
    rapierBody = physics.world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(startX,startY).setLinearDamping(0.0).setAngularDamping(0.9).setCcdEnabled(true));
    physics.world.createCollider(RAPIER.ColliderDesc.ball(0.22).setRestitution(0.5).setFriction(0.3), rapierBody);
    rapierBody.setLinvel({ x:-3+Math.random()*6, y:5+Math.random()*5 }, true);
  }
  extraBalls.push({ pos:new THREE.Vector3(startX,startY,0.5), vel:{x:0,y:0}, mesh, rapierBody });

  // ─── Phase 2: Trigger multiball flash effect ───
  cb.triggerMultiballFlash();

  // ─── Phase 9: Show Multiball Bonus Announcement ───────────────────────────────
  cb.showBonusAnnouncement('MULTIBALL!');

  // ─── Phase 9 TASK 3: Play Multiball Sound ──────────────────────────────────
  cb.playMultiballSound();

  dmdEvent('MULTIBALL!'); showNotification('🎱 MULTIBALL!'); spawnParticles(0,2,0xffcc00,30); playSound('bumper');

  // ─── Phase 13: Trigger multiball launch animations ───
  const animationBindingManager = getAnimationBindingManager();
  const animationScheduler = getAnimationScheduler();
  const bamBridge = getBamBridge();
  if (animationBindingManager && animationScheduler && bamBridge) {
    const bindings = animationBindingManager.getBindingsFor('multiball', 'on_launch');
    bindings.forEach(binding => {
      if (binding.autoPlay) {
        bamBridge.playAnimation(binding.sequenceId);
        animationBindingManager.markTriggered(binding.id);
      }
    });
  }

  // ─── Phase 17+: Trigger multiball video ───
  onMultiballStartVideo();
}

function updateExtraBalls(dt: number): void {
  for (let i = extraBalls.length-1; i >= 0; i--) {
    const b = extraBalls[i];
    if (b.rapierBody && physics) {
      const pos = b.rapierBody.translation(), vel = b.rapierBody.linvel();
      b.pos.x=pos.x; b.pos.y=pos.y; b.vel.x=vel.x; b.vel.y=vel.y;
      bumpers.forEach(bu => {
        const dx=b.pos.x-bu.x, dy=b.pos.y-bu.y, d=Math.sqrt(dx*dx+dy*dy);
        if (d<0.55&&d>0.001){
          const spd=Math.max(Math.hypot(vel.x,vel.y),5.5)*1.1;
          b.rapierBody!.setLinvel({x:(dx/d)*spd,y:(dy/d)*spd},true);
          state.score+=150*state.multiplier; spawnParticles(bu.x,bu.y,bu.mesh.userData.color,8); updateHUD();
        }
      });
      if (b.pos.y < -7.0) {
        physics.world.removeRigidBody(b.rapierBody); scene.remove(b.mesh); extraBalls.splice(i,1);
        playSound('drain'); if(extraBalls.length===0) dmdEvent('SINGLE BALL'); continue;
      }
    } else {
      b.vel.y -= 9.8*dt; b.pos.x+=b.vel.x*dt; b.pos.y+=b.vel.y*dt;
      if(b.pos.x>2.82){b.pos.x=2.82;b.vel.x*=-0.82;} if(b.pos.x<-2.82){b.pos.x=-2.82;b.vel.x*=-0.82;}
      if(b.pos.y>5.90){b.pos.y=5.90;b.vel.y*=-0.82;}
      if(b.pos.y<-7.0){scene.remove(b.mesh);extraBalls.splice(i,1);playSound('drain');if(extraBalls.length===0)dmdEvent('SINGLE BALL');continue;}
    }
    b.mesh.position.set(b.pos.x,b.pos.y,0.5);
    b.mesh.rotation.x+=b.vel.y*dt*0.6; b.mesh.rotation.z-=b.vel.x*dt*0.6;
  }
}

// ─── Flipper Update ───────────────────────────────────────────────────────────
function updateFlippers(): void {
  // Phase 3: Enhanced flipper angles (35° active instead of 28° for better control)
  const lAngle = keys.left  ? THREE.MathUtils.degToRad(35)  : THREE.MathUtils.degToRad(-28);
  const rAngle = keys.right ? THREE.MathUtils.degToRad(-35) : THREE.MathUtils.degToRad(28);
  leftFlipperGroup.rotation.z  += (lAngle - leftFlipperGroup.rotation.z)  * 0.35;
  rightFlipperGroup.rotation.z += (rAngle - rightFlipperGroup.rotation.z) * 0.35;

  // ─── Phase 25: Play flipper sound on activation ───
  if (keys.left || keys.right) {
    getSoundManager().then((soundMgr) => {
      if (keys.left && !_lastLeftFlipperPressed) {
        soundMgr.playFlipperHit(0.8);
      }
      if (keys.right && !_lastRightFlipperPressed) {
        soundMgr.playFlipperHit(0.8);
      }
    }).catch(() => {
      // Sound unavailable, continue silently
    });
    _lastLeftFlipperPressed = keys.left;
    _lastRightFlipperPressed = keys.right;
  } else {
    _lastLeftFlipperPressed = false;
    _lastRightFlipperPressed = false;
  }

  // Phase 15: Update physics worker with flipper rotations
  try {
    const bridge = getPhysicsWorker();
    bridge.updateLeftFlipperRotation(leftFlipperGroup.rotation.z);
    bridge.updateRightFlipperRotation(rightFlipperGroup.rotation.z);
  } catch (e) {
    console.warn('[main] Flipper physics worker fallback:', (e || 'unknown'));
    // Fallback: Direct physics access (single-threaded)
    if (physics) {
      // Sync both position and rotation for kinematic bodies to prevent sticking
      const lPos = leftFlipperGroup.position;
      const rPos = rightFlipperGroup.position;
      physics.lFlipperBody.setNextKinematicTranslation({ x: lPos.x, y: lPos.y });
      physics.rFlipperBody.setNextKinematicTranslation({ x: rPos.x, y: rPos.y });
      physics.lFlipperBody.setNextKinematicRotation(leftFlipperGroup.rotation.z);
      physics.rFlipperBody.setNextKinematicRotation(rightFlipperGroup.rotation.z);
    }
  }

  const lFL = leftFlipperGroup.userData.flipperLight;
  const rFL = rightFlipperGroup.userData.flipperLight;
  if (lFL) lFL.intensity = keys.left  ? 2.0 : 0.6;
  if (rFL) rFL.intensity = keys.right ? 2.0 : 0.6;
}

// ─── Plunger Update ───────────────────────────────────────────────────────────
function updatePlunger(dt: number): void {
  if (!plungerKnob) return;
  if (state.inLane && state.plungerCharging) {
    state.plungerCharge = Math.min(1.0, state.plungerCharge + dt * 0.9);
    // Plunger group is at y=-6.3, so local y=0.8 gives world y=-5.5 (rest position)
    // When charging, move down relative to parent group
    plungerKnob.position.y = 0.8 - state.plungerCharge * 0.7;
    if (Math.floor(state.plungerCharge*10)%3===0) {
      const bars = '█'.repeat(Math.floor(state.plungerCharge*8));
      dmdState.eventText=`POWER ${bars}`; dmdState.eventTimer=3; dmdState.mode='event';
    }
  } else {
    // Return to rest position (local y=0.8) with smooth interpolation
    plungerKnob.position.y += (0.8 - plungerKnob.position.y) * 0.35;
    if (state.inLane) state.plungerCharge = 0;
  }
}

// ─── HUD ─────────────────────────────────────────────────────────────────────
function updateHUD(): void {
  (document.getElementById('score') as HTMLElement).textContent   = state.score.toLocaleString();
  (document.getElementById('ballnum') as HTMLElement).textContent = String(state.ballNum);
  (document.getElementById('multi') as HTMLElement).textContent   = String(state.multiplier);

  // Phase 6 Enhancement: Update sequence display
  const seqDisplay = document.getElementById('sequence-display') as HTMLElement;
  if (state.targetSequence && state.targetSequence.length > 0) {
    seqDisplay.style.display = 'block';
    const seqProgress = document.getElementById('seq-progress') as HTMLElement;
    seqProgress.textContent = `${state.targetsHitSequence.length}/${state.targetSequence.length}`;
  } else {
    seqDisplay.style.display = 'none';
  }

  // Show/hide editor button based on whether a table is loaded
  const editorBtn = document.getElementById('editor-btn');
  if (editorBtn) {
    editorBtn.style.display = currentTableConfig ? 'inline-block' : 'none';
  }

  // Default DMD to 'playing' on HUD updates ONLY while a game is in progress.
  // Pre-game modes (tableinfo / attract / launch) are driven from explicit
  // transitions in loadDemoTable / closeCoinScreen / plunger-release; we
  // must not yank the DMD out of them every time the HUD ticks.
  if (dmdState.mode === 'playing' || dmdState.mode === 'event' || dmdState.mode === 'gameover') {
    if (dmdState.mode !== 'event' && dmdState.mode !== 'gameover') dmdState.mode = 'playing';
  }
}

// ─── Notification ─────────────────────────────────────────────────────────────
function showNotification(msg: string): void {
  const n = document.getElementById('notification') as HTMLElement;
  n.textContent = msg; n.style.opacity = '1';
  setTimeout(() => n.style.opacity = '0', 2500);
  // eslint-disable-next-line security/detect-unsafe-regex -- emoji codepoint ranges, no quantifiers
  const clean = msg.replace(/[\u{1F000}-\u{1FFFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '').trim();
  if (clean.length > 1) dmdEvent(clean.substring(0, 22).toUpperCase());
}
// see window-api.ts — showNotification

// ─── Library Selector ─────────────────────────────────────────────────────────
function showLibrarySelector(lib: any): void {
  const selector = document.getElementById('library-selector');
  const nameEl = document.getElementById('library-name');
  const tableEl = document.getElementById('library-tables');

  if (!selector || !nameEl || !tableEl) return;

  nameEl.textContent = `${lib.name} — ${Object.keys(lib.tableTemplates).length} tables available`;
  tableEl.innerHTML = '';

  for (const [templateName, templateConfig] of Object.entries(lib.tableTemplates)) {
    const btn = document.createElement('button');
    btn.className = 'library-table-btn';
    btn.textContent = templateName;
    btn.onclick = async () => {
      resetGameState();
      await loadTableWithPhysicsWorker(templateConfig as any, scene, lib);
      window.closeLoader();
      logMsg(`✓ Loaded: ${lib.name} / ${templateName}`);
    };
    tableEl.appendChild(btn);
  }

  selector.style.display = 'block';
}
// see window-api.ts — showLibrarySelector

// ─── Callbacks registrieren ───────────────────────────────────────────────────
cb.updateHUD        = updateHUD;
cb.showNotification = showNotification;
cb.spawnParticles   = spawnParticles;
cb.dmdEvent         = dmdEvent;
cb.playSound        = playSound;
cb.launchMultiBall  = launchMultiBall;
cb.resetBall        = resetBall;

// ─── Phase 2: Advanced Lighting Callbacks ──────────────────────────────────────
cb.triggerBumperFlash = () => {
  if (advancedLightingSystem) {
    // Bumper hit: quick flash effect
    const light = new THREE.PointLight(0xffaa00, 2.0, 8.0);
    light.position.copy(state.ballPos);
    scene.add(light);
    setTimeout(() => { scene.remove(light); }, 200);
  }
};

cb.triggerRampCompletion = () => {
  if (advancedLightingSystem) {
    advancedLightingSystem.rampCompletionEffect(600);
  }
};

cb.triggerDrainWarning = () => {
  if (advancedLightingSystem) {
    advancedLightingSystem.ballDrainWarning(400);
  }
};

cb.triggerMultiballFlash = () => {
  if (advancedLightingSystem) {
    advancedLightingSystem.multiballFlash(500);
  }
};

// ─── Phase 4: Backglass Score Animation Callbacks ──────────────────────────────
cb.animateBackglassScore = (points: number) => {
  if (backglassRenderer) {
    backglassRenderer.animateScoreIncrease(points, 500);
  }
};

cb.updateBackglassModeInfo = (text: string) => {
  if (backglassRenderer) {
    backglassRenderer.setModeIndicator(text);
  }
};

// ─── Phase 9: Table Shake on Impact ───────────────────────────────────────────
/**
 * Simulates table shake/vibration effect via camera movement
 * @param magnitude - Shake amount (0.01-0.05 typical)
 * @param duration - Shake duration in milliseconds
 */
let shakeStartTime = 0;
let currentShakeMagnitude = 0;
let currentShakeDuration = 0;

cb.tableShake = (magnitude: number, duration: number) => {
  shakeStartTime = Date.now();
  currentShakeMagnitude = magnitude;
  currentShakeDuration = duration;
};

// Apply shake effect in animation loop (integrate with camera)
function applyTableShake(): void {
  if (shakeStartTime === 0 || !camera) return;

  const elapsed = Date.now() - shakeStartTime;
  if (elapsed > currentShakeDuration) {
    shakeStartTime = 0;
    return;
  }

  // Fade out shake over duration
  const progress = elapsed / currentShakeDuration;
  const magnitude = currentShakeMagnitude * (1.0 - progress * progress);

  // Apply random shake to camera position
  const shakeX = (Math.random() - 0.5) * magnitude;
  const shakeY = (Math.random() - 0.5) * magnitude * 0.5;

  camera.position.x += shakeX;
  camera.position.y += shakeY;
}

// ─── Phase 9: Score Display Callbacks ──────────────────────────────────────────
/**
 * Show floating score text at bumper position
 */
cb.showFloatingScore = (position: THREE.Vector3, points: number) => {
  if (scoreDisplayManager) {
    scoreDisplayManager.showFloatingScore(position, points);
  }
};

/**
 * Update combo display
 */
cb.updateCombo = (combo: number) => {
  if (scoreDisplayManager) {
    scoreDisplayManager.updateCombo(combo);
  }
};

/**
 * Show score milestone celebration
 */
cb.showScoreMilestone = (text: string) => {
  if (scoreDisplayManager) {
    scoreDisplayManager.showAnnouncement(text, 1200);
  }
};

/**
 * Show bonus announcement (MULTIBALL, RAMP COMPLETE, etc.)
 */
cb.showBonusAnnouncement = (text: string) => {
  if (scoreDisplayManager) {
    scoreDisplayManager.showAnnouncement(text, 1500);
  }
};

// ─── Phase 9: Enhanced Audio Event Callbacks ───────────────────────────────────
/**
 * Play target hit sound
 */
cb.playTargetSound = (intensity: number = 1.0) => {
  const audioSystem = getAudioSystem();
  if (audioSystem) {
    audioSystem.playTargetSound(intensity);
  }
};

/**
 * Play flipper activation sound
 */
cb.playFlipperSound = (intensity: number = 1.0) => {
  const audioSystem = getAudioSystem();
  if (audioSystem) {
    audioSystem.playFlipperSound(intensity);
  }
};

/**
 * Play ramp completion sound
 */
cb.playRampCompleteSound = () => {
  const audioSystem = getAudioSystem();
  if (audioSystem) {
    audioSystem.playRampCompleteSound();
  }
};

/**
 * Play ball drain sound
 */
cb.playBallDrainSound = () => {
  const audioSystem = getAudioSystem();
  if (audioSystem) {
    audioSystem.playBallDrainSound();
  }
};

/**
 * Play multiball start sound
 */
cb.playMultiballSound = () => {
  const audioSystem = getAudioSystem();
  if (audioSystem) {
    audioSystem.playMultiballSound();
  }
};

/**
 * Play milestone reached sound
 */
cb.playMilestoneSound = () => {
  const audioSystem = getAudioSystem();
  if (audioSystem) {
    audioSystem.playMilestoneSound();
  }
};

// ─── Phase 9: Visual Polish Effect Callbacks ───────────────────────────────────

/**
 * Trigger bumper impact visual effect (flash, shake, particles)
 */
cb.triggerImpactEffect = (position: THREE.Vector3, intensity: number = 1.0) => {
  if (visualPolishSystem) {
    visualPolishSystem.triggerImpactEffect(intensity);

    // Emit particles at impact location
    spawnParticles(position.x, position.y, 0xffaa00, Math.floor(intensity * 20));
  }
};

/**
 * Trigger drain warning visual effect
 */
cb.triggerDrainVisual = () => {
  if (visualPolishSystem) {
    visualPolishSystem.triggerDrainWarning();
  }
};

/**
 * Trigger ramp completion visual effect
 */
cb.triggerRampVisual = () => {
  if (visualPolishSystem) {
    visualPolishSystem.triggerRampCompletion();

    // Emit milestone particles at center
    spawnParticles(0, 2, 0xffff00, 20);
  }
};

/**
 * Trigger multiball start visual effect
 */
cb.triggerMultiballVisual = () => {
  if (visualPolishSystem) {
    visualPolishSystem.triggerMultiballStart();
  }
};

// ─── Phase 10+: Cabinet System Callbacks ───────────────────────────────────────

/**
 * Change cabinet profile (Vertical/Horizontal/Wide/Inverted)
 */
const changeCabinetProfile = (profileId: string) => {
  const success = setActiveCabinetProfile(profileId);
  if (success) {
    const profile = getActiveCabinetProfile();
    // ─── Phase 10+ Task 3: Also rotate UI ───
    applyProfileRotation(profile);
    applyUIRotation(profile);
    // ─── Phase 10+ Task 5: Also apply input mapping ───
    applyInputMapping(profile);
    showNotification(`🎮 Cabinet profile: ${profile.name}`);
    console.log(`✓ Cabinet profile changed to: ${profile.name}`);
  } else {
    showNotification(`❌ Cabinet profile not found: ${profileId}`);
  }
};
// see window-api.ts
/**
 * Rotate playfield to specified angle (0/90/180/270)
 */
const rotatePlayfield = async (degrees: 0 | 90 | 180 | 270, animated: boolean = true) => {
  if (cabinetSystem) {
    const duration = animated ? 600 : 0;
    await rotatePlayfieldTo(degrees, duration);
    showNotification(`🎮 Playfield rotated to ${degrees}°`);
  }
};

const getCabinetProfiles = () => {
  return CabinetSystem.getAllProfiles().map(p => ({
    id: p.id,
    name: p.name,
    description: p.description,
    rotation: p.rotation,
  }));
};

const getCurrentCabinetProfile = () => {
  const profile = getActiveCabinetProfile();
  return {
    id: profile.id,
    name: profile.name,
    rotation: profile.rotation,
    screenRatio: profile.screenRatio,
  };
};

// see window-api.ts — rotatePlayfield, getCabinetProfiles, getCurrentCabinetProfile

// ─── Phase 10+: Playfield Rotation Callbacks ───────────────────────────────────

/**
 * Apply cabinet profile and update playfield rotation
 */
const applyRotationProfile = async (profileId: string) => {
  const success = setActiveCabinetProfile(profileId);
  if (success) {
    const profile = getActiveCabinetProfile();
    if (rotationEngine) {
      applyProfileRotation(profile);
      // ─── Phase 10+ Task 3: Also rotate UI ───
      applyUIRotation(profile);
      // ─── Phase 10+ Task 5: Also apply input mapping ───
      applyInputMapping(profile);
      showNotification(`🎮 Cabinet profile applied: ${profile.name}`);
    }
  }
};

const rotatePlayfieldAnimated = async (degrees: 0 | 90 | 180 | 270) => {
  if (rotationEngine) {
    showNotification(`🎮 Rotating playfield to ${degrees}°...`);
    await rotateAndRedraw(degrees, 600);
    // ─── Phase 10+ Task 3: Also update UI display ───
    if (uiRotationManager) {
      const currentProfile = getActiveCabinetProfile();
      applyUIRotation(currentProfile);
      // ─── Phase 10+ Task 5: Also apply input mapping ───
      applyInputMapping(currentProfile);
    }
    showNotification(`✓ Playfield at ${degrees}°`);
  }
};

const getCurrentPlayfieldRotation = () => {
  if (rotationEngine) {
    return rotationEngine.getCurrentRotation();
  }
  return 0;
};

// see window-api.ts — applyRotationProfile, rotatePlayfieldAnimated, getCurrentPlayfieldRotation

// ─── Input ────────────────────────────────────────────────────────────────────
document.addEventListener('keydown', e => {
  getAudioCtx();
  if (e.key === 'Shift' && e.location === 1) {
    keys.left = true;
    leftFlipperChargeStart = Date.now();  // Phase 5: Track charge time
    playSound('flipper');
    // ─── Phase 9 TASK 3: Play enhanced flipper activation sound ────────────────
    cb.playFlipperSound(0.8);
    callScriptFlipper('left', true);
  }
  if (e.key === 'Shift' && e.location === 2) {
    keys.right = true;
    rightFlipperChargeStart = Date.now();  // Phase 5: Track charge time
    playSound('flipper');
    // ─── Phase 9 TASK 3: Play enhanced flipper activation sound ────────────────
    cb.playFlipperSound(0.8);
    callScriptFlipper('right', true);
  }
  if (e.key === 'Enter' && state.inLane && !state.plungerCharging) state.plungerCharging = true;
  if (e.key === 'r' || e.key === 'R') resetBall();
  if (e.key === 'm' || e.key === 'M') {
    // ─── Phase 26: Toggle background music ───
    getMusicManager().then((musicMgr) => {
      musicMgr.toggle();
      const status = musicMgr.isPlaying() ? '🎵 Music ON' : '🔇 Music OFF';
      showNotification(status);
      console.log('[Music]', status);
    }).catch((e) => console.warn('[Music] Error:', e));
  }
  if (e.key === 'z' || e.key === 'Z') nudgeTable(-1);
  if (e.key === 'x' || e.key === 'X') nudgeTable( 1);
  if (e.key === 'p' || e.key === 'P') {
    // ─── Phase 5: Toggle profiler display ───
    showProfiler = !showProfiler;
    localStorage.setItem('fpw_show_profiler', showProfiler.toString());
    console.log(`📊 Performance profiler: ${showProfiler ? 'ON' : 'OFF'}`);
  }

  // ─── Arcade Mode: Player Start & Coin Input ───
  // Key 1: 1-Player Start
  if (e.key === '1' && !e.altKey && !e.ctrlKey && !e.shiftKey) {
    if (state.credits > 0) {
      state.credits--;
      state.numPlayers = 1;
      state.currentPlayer = 1;
      state.playerScores = [0, 0, 0, 0];
      state.score = 0;
      state.ballNum = 1;
      showNotification(`🎮 1-Player Game Started! Credits: ${state.credits}`);
    } else {
      showNotification('💰 Insert Coin');
    }
  }

  // Key 2: 2-Player Start
  if (e.key === '2' && !e.altKey && !e.ctrlKey && !e.shiftKey) {
    if (state.credits >= 2) {
      state.credits -= 2;
      state.numPlayers = 2;
      state.currentPlayer = 1;
      state.playerScores = [0, 0, 0, 0];
      state.score = 0;
      state.ballNum = 1;
      showNotification(`🎮 2-Player Game Started! Credits: ${state.credits}`);
    } else if (state.credits === 1) {
      showNotification('💰 Need 1 more coin for 2-Player');
    } else {
      showNotification('💰 Insert Coins');
    }
  }

  // Key 5: Coin Up (legacy state) — also feed coin-system so its startGame()
  // doesn't early-return with "no coins inserted" when the player then
  // presses 1-4 and the new gate at line ~2266 routes through startGame().
  // Without this the two coin systems drift apart and the DMD attract→launch
  // transition never fires (coinScreenVisible stays true).
  if (e.key === '5') {
    state.credits++;
    addCoin();
    showNotification(`💰 Coin Inserted! Credits: ${state.credits}`);
  }

  // ─── Coin System Controls (Configurable) ─────────────────────────────────────
  // Insert Coin
  if (checkKeyBinding(e, 'insertCoin') && isCoinScreenVisible() && !isGameStarted()) {
    addCoin();
    return;
  }

  // Start Game if coin screen is showing.
  // Enter is also the plunger key. If we just `return`-ed here we'd swallow
  // the keypress and the plunger would never start charging — the player
  // saw 'LAUNCH BALL' and pressed Enter, nothing happened, then on release
  // their key-up was ignored too. Instead: start the game AND fall through
  // so the plunger-charge code below also runs.
  if (checkKeyBinding(e, 'startGame') && isCoinScreenVisible() && !isGameStarted()) {
    if (getPlayerCount() > 0) {
      startGame();
      // do NOT return — let the Enter-handler below begin charging the plunger
    } else {
      dmdEvent('INSERT COIN FIRST');
      return;
    }
  }

  // Multi-player start: keys 1-4 pick the player count (capped at credits in)
  if (isCoinScreenVisible() && !isGameStarted()
      && (e.key === '1' || e.key === '2' || e.key === '3' || e.key === '4')) {
    const requested = parseInt(e.key, 10);
    startGame(requested);
    return;
  }

  // ─── Phase 13.2: Quick Rotation Controls for Cabinet Mode (Alt+Number) ───
  // Alt+1=0°, Alt+2=90°, Alt+3=180°, Alt+4=270°
  if (e.altKey && e.key === '1') {
    rotateAndRedraw(0, 400);
    showNotification('🎮 Rotated to 0°');
  }
  if (e.altKey && e.key === '2') {
    rotateAndRedraw(90, 400);
    showNotification('🎮 Rotated to 90°');
  }
  if (e.altKey && e.key === '3') {
    rotateAndRedraw(180, 400);
    showNotification('🎮 Rotated to 180°');
  }
  if (e.altKey && e.key === '4') {
    rotateAndRedraw(270, 400);
    showNotification('🎮 Rotated to 270°');
  }

  // Ctrl+Q / Ctrl+E for quick playfield rotation (90° steps).
  // The Q and E keys without modifier are reserved for cabinet hardware —
  // many pinball cabinets remap front-buttons to Q/E, so a bare Q/E hotkey
  // here causes every flipper press to rotate the playfield (the ball
  // appears to fly randomly because the world is spinning under it).
  if ((e.ctrlKey || e.metaKey) && (e.key === 'q' || e.key === 'Q')) {
    e.preventDefault();
    const rotEngine = getRotationEngine();
    const currentRotation = rotEngine?.getCurrentRotation() ?? 0;
    const nextRotation = (currentRotation + 90) % 360;
    rotateAndRedraw(nextRotation as any, 400);
    showNotification(`🎮 Rotated to ${nextRotation}°`);
  }
  if ((e.ctrlKey || e.metaKey) && (e.key === 'e' || e.key === 'E')) {
    e.preventDefault();
    const rotEngine = getRotationEngine();
    const currentRotation = rotEngine?.getCurrentRotation() ?? 0;
    const nextRotation = (currentRotation - 90 + 360) % 360;
    rotateAndRedraw(nextRotation as any, 400);
    showNotification(`🎮 Rotated to ${nextRotation}°`);
  }
});
document.addEventListener('keyup', e => {
  if (e.key === 'Shift' && e.location === 1) {
    // ─── Phase 6: Calculate flipper power with skill-based curve ───
    if (leftFlipperChargeStart !== null) {
      const chargeMs = Date.now() - leftFlipperChargeStart;
      const chargeTime = Math.min(chargeMs / 500, 1.0);  // Max 500ms = full charge
      // Use S-curve for more realistic/satisfying flipper response
      lastLeftFlipperPower = calculateFlipperPowerCurve(chargeTime);
      state.flipperChargeTime = chargeTime;
      state.flipperShotPower = lastLeftFlipperPower;
      leftFlipperChargeStart = null;
    }
    keys.left = false;
    callScriptFlipper('left', false);
  }
  if (e.key === 'Shift' && e.location === 2) {
    // ─── Phase 6: Calculate flipper power with skill-based curve ───
    if (rightFlipperChargeStart !== null) {
      const chargeMs = Date.now() - rightFlipperChargeStart;
      const chargeTime = Math.min(chargeMs / 500, 1.0);  // Max 500ms = full charge
      // Use S-curve for more realistic/satisfying flipper response
      lastRightFlipperPower = calculateFlipperPowerCurve(chargeTime);
      state.flipperChargeTime = chargeTime;
      state.flipperShotPower = lastRightFlipperPower;
      rightFlipperChargeStart = null;
    }
    keys.right = false;
    callScriptFlipper('right', false);
  }
  if (e.key === 'Enter' && state.inLane && state.plungerCharging) {
    // ─── Coin gate: only allow launching the ball if at least one coin
    // is in. If the player has inserted credits but didn't press '1' to
    // explicitly start, we auto-start now (more forgiving — the plunger
    // press is itself a clear "I want to play" signal).
    if (!isGameStarted()) {
      if (getPlayerCount() > 0) {
        startGame();
      } else {
        // No coin yet — bounce them back to the coin screen.
        dmdEvent('INSERT COIN FIRST');
        if (!isCoinScreenVisible()) showCoinScreen();
        state.plungerCharging = false;
        state.plungerCharge = 0;
        return;
      }
    }
    state.plungerCharging = false;
    const charge = state.plungerCharge;

    // ─── Phase 13 Task 3: Trigger animations on plunger launch ───
    const bindingMgr = getAnimationBindingManager();
    const bridge = getBamBridge();
    if (bindingMgr && bridge) {
      const bindings = bindingMgr.getBindingsFor('flipper', 'on_start');
      for (const binding of bindings) {
        if (binding.autoPlay) {
          bridge.playAnimation(binding.sequenceId);
          bindingMgr.markTriggered(binding.id);
        }
      }
    }

    state.inLane = false;
    state.plungerCharge = 0; state.ballSaveTimer = 3.5;

    // Phase 15: Launch ball via physics worker
    // The plunger lane's left wall (in main.ts initPhysics + worker tableBodies)
    // ends at y=-2.6. Ball starts at y=-5.0. To enter the playfield it must
    // (a) reach y > -2.6 and (b) be at x < ~2.27 (clear of the wall) at the
    // same moment. Earlier values (vx=-1.2 base) only just cleared on a full
    // charge — light taps had the ball graze the wall corner and come back
    // down into the lane. New values give every charge level enough leftward
    // bias to clear the wall edge.
    //
    // Tap vy bumped 11 → 13: with the old value a tap peaked at y≈1.2 and
    // hit the left wall at y≈-0.2 (before the upper half), so the user
    // never saw the ball cross center. vy=13 peaks at y≈3.6 and hits the
    // left wall at y≈3.1 — solidly in the upper half. Max stays at 16 to
    // preserve the existing full-charge top-wall behavior.
    const vy = 13.0 + charge * 3.0;    // 13 (tap) → 16 (full) m/s up — clears wall + reaches upper half on tap
    const vx = -3.5 - charge * 2.5;    // -3.5 (tap) → -6 (full) m/s left — clears wall edge in time

    if (import.meta.env.DEV) { console.log(`🎯 PLUNGER LAUNCH: charge=${charge.toFixed(2)}, vx=${vx.toFixed(2)}, vy=${vy.toFixed(2)}`); }

    try {
      const bridge = getPhysicsWorker();
      bridge.setBallGravityScale(1.0);
      bridge.updateBallPosition(2.65, -5.0, vx, vy);
      if (import.meta.env.DEV) { console.log('✅ Ball launched via physics worker'); }
    } catch (e) {
      // Fallback: Direct physics access (single-threaded)
      console.warn('⚠️ Physics worker error, using fallback:', e);
      if (physics) {
        physics.ballBody.setGravityScale(1.0, true);
        physics.ballBody.setTranslation({ x:2.65, y:-5.0 }, true);
        physics.ballBody.setLinvel({ x:vx, y:vy }, true);
        if (import.meta.env.DEV) { console.log('✅ Ball launched via fallback (main thread physics)'); }
      } else {
        console.error('❌ No physics system available!');
        state.ballVel.x = vx;
        state.ballVel.y = vy;
      }
    }
    playSound('bumper'); startBGMusic();
    showNotification(`⚡ LAUNCHED! (${(charge*100).toFixed(0)}%)`);
  }
});

// ─── Phase 5: Apply Quality Preset Settings ───────────────────────────────────
// This function applies the profiler's quality preset to actual rendering systems
function applyQualityPreset(): void {
  try {
    const currentPreset = profiler.getQualityPreset();
    const presetName = currentPreset.name;

    // Skip if no change
    if (lastAppliedQualityPreset === presetName) return;
    lastAppliedQualityPreset = presetName;

    logMsg(`⚙️ Applying quality preset: ${currentPreset.label}`, 'ok');

    // ─── Bloom Pass ───
    bloomPass?.setEnabled?.(currentPreset.bloomEnabled);
    if (currentPreset.bloomEnabled && bloomPass) {
      bloomPass.strength = currentPreset.bloomStrength;
      bloomPass.radius = currentPreset.bloomRadius;
      bloomPass.threshold = 0.25;
    }

    // ─── Shadow Maps ───
    if (currentPreset.shadowsEnabled) {
      mainSpot?.setProperty?.('castShadow', true);
      mainSpot?.shadow?.mapSize.set(currentPreset.shadowMapSize, currentPreset.shadowMapSize);
      renderer.shadowMap.enabled = true;
    } else {
      mainSpot?.setProperty?.('castShadow', false);
      renderer.shadowMap.enabled = false;
    }

    // ─── Lighting Intensities ───
    if (ambLight) ambLight.intensity = currentPreset.shadowsEnabled ? 0.25 : 0.35;
    if (fillLight) fillLight.intensity = currentPreset.shadowsEnabled ? 1.2 : 1.5;
    if (rimLight) rimLight.intensity = currentPreset.shadowsEnabled ? 0.7 : 0.5;

    // ─── Ball Material Emissive ───
    if (ballOuterMaterial) {
      ballOuterMaterial.emissiveIntensity = currentPreset.bloomEnabled ? 0.3 : 0.1;
    }
    if (ballGlowMaterial) {
      ballGlowMaterial.emissiveIntensity = currentPreset.bloomEnabled ? 0.6 : 0.2;
      ballGlowMaterial.opacity = currentPreset.bloomEnabled ? 0.12 : 0.06;
    }

    // ─── Particle System ───
    MAX_PARTS = currentPreset.particleCount;
    logMsg(`  └─ Particles: ${MAX_PARTS} max`, 'ok');

    // ─── Backglass Mode ───
    if (backglassRenderer) {
      if (currentPreset.backglassEnabled) {
        backglassRenderer.setEnabled(true);
        backglassRenderer.setRenderMode(currentPreset.backglass3D);
        logMsg(`  └─ Backglass: ${currentPreset.backglass3D ? '3D' : '2D'}`, 'ok');
      } else {
        backglassRenderer.setEnabled(false);
      }
    }

    // ─── Volumetric Lighting ───
    if (volumetricPass) {
      (volumetricPass as any).enabled = currentPreset.volumetricEnabled;
      if (currentPreset.volumetricEnabled) {
        volumetricPass.setExposure(currentPreset.volumetricIntensity);
        logMsg(`  └─ Volumetric: ${(currentPreset.volumetricIntensity * 100).toFixed(0)}%`, 'ok');
      }
    }

    // ─── Phase 16+: Playfield Visual Enhancements ───
    const enhancement = getPlayfieldVisualEnhancement();
    if (enhancement) {
      enhancement.setQualityPreset(currentPreset.name as 'low' | 'medium' | 'high' | 'ultra');
      logMsg(`  └─ Visual Enhancement: ${currentPreset.name}`, 'ok');
    }

    // ─── DMD Resolution ───
    if (currentPreset.dmdResolution) {
      window.setDMDResolutionOption?.(currentPreset.dmdResolution);
      window.setDMDGlow?.(currentPreset.dmdGlowEnabled, currentPreset.dmdGlowIntensity);
      logMsg(`  └─ DMD: ${currentPreset.dmdResolution} (glow: ${currentPreset.dmdGlowEnabled})`, 'ok');
    }

    // ─── Tone Mapping Exposure ───
    renderer.toneMappingExposure = currentPreset.bloomEnabled ? 1.35 : 1.30;  // ─── Increased from 1.15/1.05 to combat SSAO/fog darkening
  } catch (err) {
    logMsg(`❌ Error in applyQualityPreset: ${err instanceof Error ? err.message : String(err)}`, 'error');
  }
}

// ─── Game Loop ────────────────────────────────────────────────────────────────
const clock = new THREE.Clock();
let frameCount = 0, lastFpsUpdate = 0, currentFps = 60;
let pixelRatioTarget = Math.min(devicePixelRatio, 2);

let animateCallCount = 0;
function animate(): void {
  animateCallCount++;
  if (import.meta.env.DEV && (animateCallCount === 1 || animateCallCount % 300 === 0)) {
    console.log(`🎬 Animate loop running... (call #${animateCallCount})`);
  }
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);

  // Adaptive pixel ratio: downscale on low FPS (mobile/slow devices)
  frameCount++;
  const now = performance.now();
  if (now - lastFpsUpdate > 500) {
    currentFps = frameCount * (1000 / (now - lastFpsUpdate));
    frameCount = 0;
    lastFpsUpdate = now;

    // Auto-reduce DPI if FPS < 45
    if (currentFps < 45 && pixelRatioTarget > 1) {
      pixelRatioTarget = Math.max(1, pixelRatioTarget - 0.25);
      renderer.setPixelRatio(pixelRatioTarget);
      console.log(`⚠️ Low FPS (${currentFps.toFixed(0)}) → reducing DPI to ${pixelRatioTarget.toFixed(2)}`);
    } else if (currentFps > 55 && pixelRatioTarget < Math.min(devicePixelRatio, 2)) {
      pixelRatioTarget = Math.min(Math.min(devicePixelRatio, 2), pixelRatioTarget + 0.1);
      renderer.setPixelRatio(pixelRatioTarget);
    }

    // ─── Phase 5: Update profiler metrics ───
    profiler.updateFrame(renderer);

    // ─── Phase 5: Apply quality preset if changed ───
    applyQualityPreset();

    // Log performance every 2s
    if (now % 2000 < 500 && showProfiler) {
      console.log(`🎮 ${profiler.getMetricsDisplay()}`);
    }
  }

  // ─── Phase 24: Process low-latency input ───
  const inputOptimizer = getInputOptimizer();
  inputOptimizer.processInputQueue();

  updateFlippers();

  if (physics) {
    if (state.inLane) {
      // Phase 15: Set in-lane gravity via physics worker
      try {
        const bridge = getPhysicsWorker();
        bridge.setBallGravityScale(0.0);
      } catch (e) {
        console.warn('[main] Physics worker fallback (in-lane):', (e || 'unknown'));
        // Fallback
        physics.ballBody.setGravityScale(0.0, true);
        physics.ballBody.setLinvel({ x:0, y:0 }, true);
        physics.ballBody.setAngvel(0, true);
        physics.ballBody.setTranslation({ x:2.65, y:-5.0 }, true);
      }
    } else {
      // Phase 15: Step physics via worker (non-blocking!)
      // ─── Phase 24 Enhancement: Increased Physics Substeps for Better Accuracy ───
      try {
        const bridge = getPhysicsWorker();
        const substeps = currentFps > 55 ? 6 : (currentFps > 45 ? 5 : 4);
        bridge.step(dt, substeps);
        // Physics results arrive async via callback (handlePhysicsFrame)
      } catch (e) {
        console.warn('[main] Physics worker step fallback:', (e || 'unknown'));
        // Fallback: Single-threaded physics (original code)
        physics.world.step(physics.eventQueue);

        // ─── Phase 6: Improved B.A.M. Engine Step with Adaptive Substeps ───
        if (bamEngine) {
          // Adaptive substeps: More steps at higher FPS for smoother physics
          // This matches Newton's approach: more accurate simulation = better feel
          // ─── Phase 24 Enhancement: Increased Physics Substeps for Better Accuracy ───
          const substeps = currentFps > 55 ? 6 : (currentFps > 45 ? 5 : 4);
          bamEngine.step(dt, substeps);
        }
        const pos = physics.ballBody.translation(), vel = physics.ballBody.linvel();
        state.ballPos.x=pos.x; state.ballPos.y=pos.y;
        state.ballVel.x=vel.x; state.ballVel.y=vel.y;

        physics.eventQueue.drainCollisionEvents((h1, h2, started) => {
          if (!started) return;
          const ballH = physics!.ballCollider.handle;
          const other = h1===ballH?h2:(h2===ballH?h1:-1);
          if (other < 0) return;

          // Phase 5: Apply flipper power variations
          if (other === leftFlipperColliderHandle) {
            const vel = physics!.ballBody.linvel();
            const powerMult = lastLeftFlipperPower;  // 0.5-1.0
            physics!.ballBody.setLinvel({
              x: vel.x * powerMult,
              y: Math.max(vel.y * powerMult, 3.0),  // Ensure upward momentum
            }, true);
            return;
          }
          if (other === rightFlipperColliderHandle) {
            const vel = physics!.ballBody.linvel();
            const powerMult = lastRightFlipperPower;  // 0.5-1.0
            physics!.ballBody.setLinvel({
              x: vel.x * powerMult,
              y: Math.max(vel.y * powerMult, 3.0),  // Ensure upward momentum
            }, true);
            return;
          }

          const bumperData = physics!.bumperMap.get(other);
          if (bumperData) { scoreBumperHit(bumperData); return; }
          const targetData = physics!.targetMap.get(other);
          if (targetData) { scoreTargetHit(targetData); return; }
          const slingSide = physics!.slingshotMap.get(other);
          if (slingSide !== undefined) { scoreSlingshotHit(slingSide); return; }
        });

        checkRolloverLanes();

        // ─── Phase 2: Update Spinner Physics ───
        updateSpinnerPhysics();

        // ─── Phase 4: Enhanced Ball Physics (Friction Curve) ───
        const ballVel = physics.ballBody.linvel();
        const speed = Math.hypot(ballVel.x, ballVel.y);
        const frictionFactor = 0.97;  // 3% loss per frame
        if (speed > 0.1) {
          physics.ballBody.setLinvel({
            x: ballVel.x * frictionFactor,
            y: ballVel.y * frictionFactor,
          }, true);
        } else if (speed > 0) {
          // Stop completely below threshold
          physics.ballBody.setLinvel({ x: 0, y: 0 }, true);
        }
      }

      // ─── Phase 4: Drain Guide + Phase 7: Extended Ball Saves & Drain Logic ───
      // Phase 4: Realistic drain guides - ball flows naturally through guides
      // Plunger lane is now properly enclosed, guides ball to flippers
      //
      // Drain threshold: the drain-bottom wall sits at y=-6.0 (extent
      // y∈[-6.2,-5.8]) so a ball cannot physically reach below y≈-5.58
      // (ball-edge against wall top, ball center at -5.58). The earlier
      // y<-6.5 check was unreachable, so a ball that settled in the drain
      // channel just sat there forever — only the R-key reset recovered it.
      // -5.4 catches the resting position; the low-speed guard (|v|<1.5)
      // prevents single-frame false-positives when a fast ball briefly
      // touches the drain wall before bouncing back into the playfield.
      const ballSpeedSq = state.ballVel.x * state.ballVel.x + state.ballVel.y * state.ballVel.y;
      if (state.ballPos.y < -5.4 && ballSpeedSq < 2.25) {
        // ─── Phase 2: Trigger drain warning effect ───
        cb.triggerDrainWarning();

        if (state.ballSaveTimer > 0) {
          // Original ball save (active timer from plunger)
          state.ballSaveTimer = 0;
          state.ballSaveMode = 'active';
          dmdEvent('BALL SAVED!');
          spawnParticles(state.ballPos.x,-6.8,0x00ff88,18);
          playSound('flipper');
          resetBall();
        } else if (state.ballSavesRemaining > 0) {
          // Phase 7: Use extended ball save
          state.ballSavesRemaining--;
          state.ballSaveTimer = 3.5;  // Reset timer
          state.ballSaveMode = state.ballSavesRemaining > 0 ? 'active' : 'exhausted';
          resetBall();
          showNotification(`💾 BALL SAVED! (${state.ballSavesRemaining} left)`);
          dmdEvent(`BALL SAVED!`);
          spawnParticles(state.ballPos.x,-6.8,0x00ff88,18);
          playSound('flipper');
        } else {
          // Game over / next ball
          state.ballSaveMode = 'none';
          const bonus = Math.floor(state.bumperHits*100*state.multiplier*0.5);
          if (bonus > 0) { state.score+=bonus; dmdEvent(`BONUS +${bonus.toLocaleString()}`); updateHUD(); }
          playSound('drain'); callScriptDrain();

          // ─── Phase 13: Trigger ball drain animations ───
          const drainAnimBindings = getAnimationBindingManager();
          const drainAnimScheduler = getAnimationScheduler();
          const drainBamBridge = getBamBridge();
          if (drainAnimBindings && drainAnimScheduler && drainBamBridge) {
            const drainBindings = drainAnimBindings.getBindingsFor('drain', 'on_drain');
            drainBindings.forEach(binding => {
              if (binding.autoPlay) {
                drainBamBridge.playAnimation(binding.sequenceId);
                drainAnimBindings.markTriggered(binding.id);
              }
            });
          }

          if (state.ballNum >= 3) {
            const rank = recordScore(state.score);
            state.lastRank=rank; state.lastScore=state.score;
            state.ballNum=1; state.score=0; state.multiplier=1; state.bumperHits=0;
            // Reset extended ball saves for next game
            state.ballSavesRemaining = 1;
            state.ballSaveMode = 'none';
            dmdState.mode='gameover'; dmdState.animFrame=0; updateHUD();
            showNotification(rank===1?'🏆 NEW HIGH SCORE!':'🎮 GAME OVER — Neues Spiel!');
          } else {
            state.ballNum++; state.multiplier=1; state.bumperHits=0;
            // Grant extra ball save on new ball (every ball gets one)
            state.ballSavesRemaining = 1;
            state.ballSaveMode = 'none';
            updateHUD(); dmdEvent(`BALL ${state.ballNum}`);
          }
          resetBall();
        }
      }
    }
  }

  ball.position.set(state.ballPos.x, state.ballPos.y, state.ballPos.z);
  ball.rotation.x += state.ballVel.y*dt*0.6;
  ball.rotation.z -= state.ballVel.x*dt*0.6;

  // ─── Phase 27: Update Ball Trail ───
  const trailMgr = getBallTrailManager();
  if (trailMgr && !state.inLane) {
    trailMgr.update(ball.position);
  } else if (trailMgr && state.inLane) {
    // Clear trail when ball in lane
    trailMgr.clear();
  }

  // ─── Phase 19: Update Motion Blur Velocity Buffer ───
  // Track ball velocity for motion blur effect
  if (motionBlurPass) {
    motionBlurPass.updateVelocityBuffer(dt);
    motionBlurPass.trackObject(ball);
  }

  // ─── Phase 20: Update Cascaded Shadow Maps ───
  // Update cascade frustums based on camera position
  if (cascadedShadowMapper) {
    cascadedShadowMapper.updateCascades(camera as THREE.PerspectiveCamera);
  }

  // ─── Phase 21: Update Advanced Particle System ───
  // Physics update for all active particles
  if (particleSystem) {
    particleSystem.update(dt);
  }

  // ─── Phase 28: Update Score Animations ───
  const scoreAnimMgr = getScoreAnimationManager();
  if (scoreAnimMgr) {
    scoreAnimMgr.update(dt);
  }

  // ─── Phase 22: Update Film Effects ───
  // Update grain animation and decay aberration/distortion
  if (filmEffectsPass) {
    filmEffectsPass.update(dt);
  }

  // ─── Phase 23: Update Depth of Field ───
  // Update focus tracking on ball
  if (dofPass) {
    dofPass.setBallPosition(ball.position);
  }

  // ─── Phase 7: Ball Save Countdown with Extended Saves ───
  if (state.ballSaveTimer > 0) {
    const prev = state.ballSaveTimer; state.ballSaveTimer -= dt;
    if (Math.ceil(state.ballSaveTimer) < Math.ceil(prev) && state.ballSaveTimer > 0) {
      const saveText = state.ballSaveMode === 'active'
        ? `BALL SAVE  ${Math.ceil(state.ballSaveTimer)}`
        : `SAVES  ${Math.ceil(state.ballSaveTimer)}`;
      dmdState.eventText = saveText; dmdState.eventTimer = 8; dmdState.mode = 'event';
    }
  }
  // NOTE: previously this branch fired "SAVES READY x{n}" as an event every
  // frame whenever ballSavesRemaining > 0. That hijacked the DMD and
  // prevented tableinfo / attract / launch / score from ever showing —
  // there was always a fresh event queued. The remaining-saves count is a
  // status indicator, not an event; if we want to surface it we should add
  // it as a small badge on the HUD or a brief one-shot announcement when
  // the count actually changes, not every frame.

  updatePlunger(dt);
  updateExtraBalls(dt);
  updateParticles(dt);

  // ─── DMD state machine ───────────────────────────────────────────────────
  // tableinfo  → attract  (auto, dmdUpdate handles bootTimer countdown)
  // attract    → launch   (coin screen closed AND ball is in plunger lane)
  // launch     → playing  (ball leaves the plunger lane)
  // event      → playing  (auto, dmdUpdate handles eventTimer)
  // tableinfo is intentionally NOT in the launch transition — the boot
  // scroll always runs to completion before anything else takes over.
  if (currentTableConfig) {
    const coinVisible = isCoinScreenVisible();
    // Ball in plunger lane and coin screen closed → show launch UI. Allow this
    // from BOTH 'attract' (initial coin→start path) and 'playing' (return from
    // 'event' mode after a notification preempted the attract phase, e.g. the
    // "1-Player Game Started" toast on game start). dmd.ts:781 always sends
    // event back to 'playing', so without this we'd never reach 'launch'.
    const launchEligible = dmdState.mode === 'attract' || dmdState.mode === 'playing';
    if (launchEligible && !coinVisible && state.inLane) {
      dmdState.mode = 'launch';
      dmdState.animFrame = 0;
    } else if (dmdState.mode === 'launch' && !state.inLane) {
      dmdState.mode = 'playing';
      dmdState.animFrame = 0;
    }
  }
  dmdUpdate();

  // ─── Phase 2: Update Advanced Lighting ───
  if (advancedLightingSystem) {
    advancedLightingSystem.update();
  }

  // ─── Phase 9: Apply Table Shake Effect ───
  applyTableShake();

  // ─── Phase 9: Update Score Display ───
  if (scoreDisplayManager) {
    scoreDisplayManager.update();
  }

  // ─── Phase 9: Update Visual Polish System ───
  if (visualPolishSystem) {
    visualPolishSystem.update();
  }

  // ─── Phase 4: Update Backglass ───
  if (backglassRenderer) {
    backglassRenderer.update();
    // Update parallax effect based on camera angle
    backglassRenderer.updateParallax(camera.rotation);

    // Render backglass to texture for compositing
    backglassRenderer.render(renderer);
  }

  // ─── Phase 14: Render Frame ───
  // Render through graphics pipeline (EffectComposer) to enable Polish Suite post-processing
  if (renderer && scene && camera) {
    if (import.meta.env.DEV && (animateCallCount === 1 || animateCallCount % 300 === 0)) {
      console.log(`🎨 Rendering frame #${animateCallCount}`, {
        rendererExists: !!renderer,
        sceneChildren: scene?.children.length,
        cameraPos: camera?.position
      });
    }

    // ─── Phase 20: Update and Render Cascaded Shadows (Polish Suite) ───
    if (cascadedShadowMapper && camera instanceof THREE.PerspectiveCamera) {
      cascadedShadowMapper.updateCascades(camera);
      cascadedShadowMapper.renderShadowMaps();
    }

    // Render through graphics pipeline for post-processing (SSR, Motion Blur, Shadows, Bloom, Film Effects, DoF)
    try {
      const pipeline = getGraphicsPipeline();
      if (import.meta.env.DEV && animateCallCount === 1) {
        console.log('🔄 Pipeline status:', { exists: !!pipeline, type: pipeline?.constructor.name });
      }
      if (pipeline) {
        pipeline.renderFrame(dt);  // Use graphics pipeline for Polish Suite post-processing
      } else {
        // Fallback: direct render if pipeline unavailable
        if (animateCallCount === 1) console.warn('⚠️ Pipeline unavailable, using fallback renderer.render()');
        renderer.render(scene, camera);
      }
    } catch (error) {
      console.warn('Pipeline render failed, falling back to direct render:', error);
      renderer.render(scene, camera);
    }
  } else {
    if (animateCallCount === 1) {
      console.warn(`⚠️ Cannot render: renderer=${!!renderer}, scene=${!!scene}, camera=${!!camera}`);
    }
  }

  if (_bgPanelActive) drawInlineBackglass();

  // ─── Phase 24: Record performance metrics ───
  const dashboard = getPerformanceDashboard();
  const inputMetrics = inputOptimizer.getMetrics();
  dashboard.recordFrame({
    frameTime: dt * 1000,
    inputLatency: inputMetrics.keyDownLatency,
    ballVelocity: state.ballPos ? Math.hypot(state.ballVel.x, state.ballVel.y) : 0,
    flipperResponse: 0,  // Updated by flipper handler
  });

  emitMultiscreenState({
    type:'state', score:state.score, ballNum:state.ballNum, multiplier:state.multiplier,
    inLane:state.inLane, dmdMode:dmdState.mode, dmdEventText:dmdState.eventText,
    dmdAnimFrame:dmdState.animFrame, dmdScrollX:dmdState.scrollX,
    dmdEventTimer:dmdState.eventTimer, lastRank:state.lastRank, lastScore:state.lastScore,
    bumperHits:state.bumperHits,
    tableName:   currentTableConfig ? currentTableConfig.name : 'FUTURE PINBALL',
    tableAccent: currentTableConfig ? currentTableConfig.accentColor : 0x00ff66,
    tableColor:  currentTableConfig ? currentTableConfig.tableColor  : 0x1a4a15,
    highScores: getTopScores(),
  });
}

// ─── Inline Backglass (1-Screen) ──────────────────────────────────────────────
let _bgPanelActive = false;

function initInlineBackglass(): void {
  _bgPanelActive = true;
  document.body.classList.add('show-bg-panel');
  const canvas = document.getElementById('backglass-canvas') as HTMLCanvasElement;
  const setSize = () => {
    const bgWidthVw = parseFloat(getResponsiveBackglassWidth());
    canvas.width = Math.round(innerWidth * (bgWidthVw / 100));
    canvas.height = innerHeight;
  };
  setSize(); window.addEventListener('resize', setSize);
}

function stopInlineBackglass(): void {
  _bgPanelActive = false;
  document.body.classList.remove('show-bg-panel');
}

function drawInlineBackglass(): void {
  const canvas = document.getElementById('backglass-canvas') as HTMLCanvasElement;
  if (!canvas || !canvas.width) return;
  const ctx = canvas.getContext('2d')!;
  const W = canvas.width, H = canvas.height;
  const toHex = (n: number) => `#${  (`000000${n.toString(16)}`).slice(-6)}`;
  const accent = currentTableConfig ? toHex(currentTableConfig.accentColor) : '#00ff66';
  const tcolor = currentTableConfig ? toHex(currentTableConfig.tableColor)  : '#1a4a15';

  const bg = ctx.createLinearGradient(0,0,0,H);
  bg.addColorStop(0,'#0a0a14'); bg.addColorStop(0.5,`${tcolor}44`); bg.addColorStop(1,'#050508');
  ctx.fillStyle=bg; ctx.fillRect(0,0,W,H);

  const bw = Math.max(4,W*0.025);
  [0,W-bw].forEach(x => {
    const g=ctx.createLinearGradient(0,0,0,H);
    g.addColorStop(0,'transparent'); g.addColorStop(0.3,accent);
    g.addColorStop(0.7,accent); g.addColorStop(1,'transparent');
    ctx.fillStyle=g; ctx.fillRect(x,0,bw,H);
  });

  ctx.save(); ctx.shadowColor=accent; ctx.shadowBlur=22; ctx.fillStyle=accent;
  ctx.font=`bold ${Math.min(H*0.052,W*0.09)}px "Courier New",monospace`;
  ctx.textAlign='center'; ctx.textBaseline='top';
  ctx.fillText((currentTableConfig?.name||'FUTURE PINBALL').toUpperCase(), W/2, H*0.02);
  ctx.restore();

  ctx.save(); ctx.strokeStyle=accent; ctx.lineWidth=1.5; ctx.globalAlpha=0.45;
  ctx.beginPath(); ctx.moveTo(W*0.08,H*0.11); ctx.lineTo(W*0.92,H*0.11); ctx.stroke(); ctx.restore();

  ctx.save(); ctx.fillStyle='#553300'; ctx.font=`${H*0.030}px "Courier New",monospace`;
  ctx.textAlign='center'; ctx.textBaseline='top'; ctx.fillText('SCORE',W/2,H*0.13); ctx.restore();

  ctx.save(); ctx.shadowColor='#ff6600'; ctx.shadowBlur=28; ctx.fillStyle='#ff6600';
  ctx.font=`bold ${Math.min(H*0.12,W*0.13)}px "Courier New",monospace`;
  ctx.textAlign='center'; ctx.textBaseline='top';
  ctx.fillText(state.score.toLocaleString(),W/2,H*0.16); ctx.restore();

  const ms=Math.min(H*0.06,W*0.10);
  ctx.save(); ctx.shadowColor='#ffcc00'; ctx.shadowBlur=14; ctx.fillStyle='#ffcc00';
  ctx.font=`bold ${ms}px "Courier New",monospace`; ctx.textAlign='left'; ctx.textBaseline='top';
  ctx.fillText('MULT',W*0.08,H*0.34); ctx.restore();
  ctx.save(); ctx.shadowColor='#ffcc00'; ctx.shadowBlur=14; ctx.fillStyle='#ffcc00';
  ctx.font=`bold ${ms*1.35}px "Courier New",monospace`; ctx.textAlign='left'; ctx.textBaseline='top';
  ctx.fillText(`×${state.multiplier}`,W*0.08,H*0.375); ctx.restore();

  const ballR=Math.min(W*0.065,H*0.038), bx0=W*0.52, by0=H*0.375;
  ctx.save(); ctx.fillStyle='#334'; ctx.font=`${H*0.028}px "Courier New",monospace`;
  ctx.textAlign='left'; ctx.textBaseline='top'; ctx.fillText('BALL',bx0,H*0.344); ctx.restore();
  for (let i=0;i<3;i++) {
    ctx.save(); ctx.shadowColor=i<state.ballNum?'#00aaff':'transparent'; ctx.shadowBlur=i<state.ballNum?12:0;
    ctx.fillStyle=i<state.ballNum?'#00aaff':'#1a2a3a';
    ctx.beginPath(); ctx.arc(bx0+i*(ballR*2.3)+ballR, by0+ballR, ballR, 0, Math.PI*2); ctx.fill(); ctx.restore();
  }

  const scores = getTopScores();
  if (scores.length>0) {
    ctx.save(); ctx.fillStyle='#446'; ctx.font=`${H*0.026}px "Courier New",monospace`;
    ctx.textAlign='left'; ctx.textBaseline='top'; ctx.fillText('HIGH SCORES',W*0.08,H*0.51); ctx.restore();
    scores.slice(0,3).forEach((s,i) => {
      ctx.save(); ctx.fillStyle=i===0?'#ffcc00':'#556';
      ctx.shadowColor=i===0?'#ffcc00':'transparent'; ctx.shadowBlur=i===0?8:0;
      ctx.font=`${H*0.032}px "Courier New",monospace`; ctx.textAlign='left'; ctx.textBaseline='top';
      ctx.fillText(`#${i+1} ${s.toLocaleString()}`,W*0.08,H*(0.545+i*0.045)); ctx.restore();
    });
  }

  const dY=H*0.74, dH=H*0.23, dW=W*0.86, dX=W*0.07;
  ctx.fillStyle='#050200'; ctx.strokeStyle='#5a2200'; ctx.lineWidth=2;
  ctx.beginPath();
  if ((ctx as any).roundRect) (ctx as any).roundRect(dX,dY,dW,dH,5); else ctx.rect(dX,dY,dW,dH);
  ctx.fill(); ctx.stroke();
  if (dmdCanvas) { ctx.save(); ctx.globalAlpha=0.92; ctx.drawImage(dmdCanvas,dX+4,dY+4,dW-8,dH-8); ctx.restore(); }
}

// ─── View Settings ─────────────────────────────────────────────────────────────
const VIEW_KEY = 'fpw_view';
let viewSettings: Record<string,number> = (() => { try { return JSON.parse(localStorage.getItem(VIEW_KEY)??'{}')??{}; } catch (e) { console.debug('[main] View settings parse failed:', (e || 'unknown')); return {}; } })();

const toggleViewPanel = () => document.getElementById('view-panel')!.classList.toggle('open');

const applyViewSettings = () => {
  const zoom = parseFloat((document.getElementById('vp-zoom') as HTMLInputElement).value);
  const tilt = parseFloat((document.getElementById('vp-tilt') as HTMLInputElement).value);
  const fov  = parseFloat((document.getElementById('vp-fov')  as HTMLInputElement).value);
  (document.getElementById('vp-zoom-val') as HTMLElement).textContent = zoom.toFixed(1);
  (document.getElementById('vp-tilt-val') as HTMLElement).textContent = tilt.toFixed(2);
  (document.getElementById('vp-fov-val')  as HTMLElement).textContent = fov.toFixed(0);
  camera.position.set(0, tilt-9.5, zoom); camera.lookAt(0, tilt*0.5+0.3, 0);
  camera.fov=fov; camera.updateProjectionMatrix();
  viewSettings={zoom,tilt,fov}; localStorage.setItem(VIEW_KEY, JSON.stringify(viewSettings));
};

const resetViewSettings = () => {
  (document.getElementById('vp-zoom') as HTMLInputElement).value='16';
  (document.getElementById('vp-tilt') as HTMLInputElement).value='0.5';
  (document.getElementById('vp-fov')  as HTMLInputElement).value='58';
  applyViewSettings();
};

// see window-api.ts — toggleViewPanel, applyViewSettings, resetViewSettings

function initViewSettings(): void {
  const {zoom=16, tilt=0.5, fov=58} = viewSettings;
  const zEl=document.getElementById('vp-zoom') as HTMLInputElement;
  const tEl=document.getElementById('vp-tilt') as HTMLInputElement;
  const fEl=document.getElementById('vp-fov')  as HTMLInputElement;
  if(zEl){zEl.value=String(zoom);(document.getElementById('vp-zoom-val') as HTMLElement).textContent=String(zoom);}
  if(tEl){tEl.value=String(tilt);(document.getElementById('vp-tilt-val') as HTMLElement).textContent=String(tilt);}
  if(fEl){fEl.value=String(fov); (document.getElementById('vp-fov-val')  as HTMLElement).textContent=String(fov);}
  // Inline `oninput="applyViewSettings()"` was previously in the HTML, but
  // Electron's contextIsolation/CSP blocks inline JS handlers — sliders did
  // nothing in the packaged build. Wire via addEventListener instead.
  const onSlide = () => window.applyViewSettings?.();
  zEl?.addEventListener('input', onSlide);
  tEl?.addEventListener('input', onSlide);
  fEl?.addEventListener('input', onSlide);
  document.getElementById('vp-reset')?.addEventListener('click', () => window.resetViewSettings?.());

  // Rotation buttons inside VIEW panel — keyboardless rotation for cabinets
  // that don't have Ctrl mapped to any input. Sets the playfield to the
  // exact angle and persists it (rotateAndRedraw saves to localStorage).
  const rotValEl = document.getElementById('vp-rot-val');
  const updateRotLabel = (forced?: number) => {
    // Prefer explicit value (set immediately on click) over engine state,
    // since rotateAndRedraw is async and would leave the UI showing the
    // pre-rotation state until the animation completes.
    const cur = forced ?? (window.getCurrentRotation?.() ?? 0);
    if (rotValEl) rotValEl.textContent = `${cur}°`;
    document.querySelectorAll<HTMLElement>('.vp-rot-btn').forEach(b => {
      const isActive = Number(b.dataset.rot) === cur;
      // Use cssText so we override #view-panel button { background: ... }
      // with !important — otherwise the panel-wide rule wins on some browsers.
      b.style.setProperty('background', isActive ? 'rgba(0,220,120,0.8)' : 'rgba(0,80,40,0.3)', 'important');
      b.style.setProperty('border-color', isActive ? '#00ff88' : '#00cc66', 'important');
      b.style.setProperty('font-weight', isActive ? 'bold' : 'normal', 'important');
    });
  };
  document.querySelectorAll<HTMLElement>('.vp-rot-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const deg = Number(btn.dataset.rot) as 0 | 90 | 180 | 270;
      // Update UI immediately so the user sees feedback before the
      // 300ms rotation animation completes.
      updateRotLabel(deg);
      await rotateAndRedraw(deg, 300);
      updateRotLabel(deg);
    });
  });
  updateRotLabel();
  if(zoom!==16||tilt!==0.5||fov!==58) window.applyViewSettings();
}

// ─── Global UI Callbacks ───────────────────────────────────────────────────────
const switchTab = (tab: string) => {
  document.querySelectorAll('.tab-btn').forEach((b,i) => b.classList.toggle('active', ['demo','import','browser','info','script'][i]===tab));
  document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
  (document.getElementById(`tab-${tab}`) as HTMLElement)?.classList.add('active');
};
// see window-api.ts — switchTab

// ─── Phase 4: Setup Backglass After Table Load ──────────────────────────────────
function setupBackglassForTable(): void {
  if (backglassRenderer) {
    // Extract and set artwork from FPT resources
    const artwork = getBackglassArtwork();
    backglassRenderer.setArtwork(artwork);

    // Set mode indicator
    const modeName = currentTableConfig?.name || 'UNKNOWN';
    backglassRenderer.setModeIndicator(`BALL ${state.ballNum}/3`);
  }
}

const loadDemoTable = async (key: string) => {
  resetGameState();
  resetCoinSystem();
  await loadTableWithPhysicsWorker(TABLE_CONFIGS[key], scene);
  setupBackglassForTable();
  closeLoader();

  dmdState.mode = 'tableinfo';
  dmdState.bootTimer = 300;
  dmdState.animFrame = 0;

  setTimeout(() => {
    showCoinScreen();
  }, 300);
};
// see window-api.ts — loadDemoTable

const closeLoader = async () => {
  (document.getElementById('loader-modal') as HTMLElement).style.display='none';
};
// see window-api.ts — closeLoader

(document.getElementById('open-loader') as HTMLElement).onclick = () => {
  (document.getElementById('loader-modal') as HTMLElement).style.display='flex';
};

// ─── Phase 2: Loading Overlay Management ─────────────────────────────────────────
const currentLoadingState = {
  isLoading: false,
  resourcesLoaded: 0,
  totalResources: 0,
  currentPhase: '',
};

function showLoadingOverlay(): void {
  const overlay = document.getElementById('loading-overlay')!;
  overlay.style.display = 'flex';
  currentLoadingState.isLoading = true;

  // Setup ESC to cancel
  const handleEsc = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      hideLoadingOverlay();
      document.removeEventListener('keydown', handleEsc);
    }
  };
  document.addEventListener('keydown', handleEsc);
}

function hideLoadingOverlay(): void {
  const overlay = document.getElementById('loading-overlay')!;
  overlay.style.display = 'none';
  currentLoadingState.isLoading = false;
  currentLoadingState.resourcesLoaded = 0;
  currentLoadingState.totalResources = 0;
}

function updateLoadingProgress(phase: string, current: number, total: number): void {
  if (!currentLoadingState.isLoading) return;

  currentLoadingState.resourcesLoaded = current;
  currentLoadingState.totalResources = total;
  currentLoadingState.currentPhase = phase;

  // Update phase name
  const phaseNameEl = document.getElementById('phase-name')!;
  const phaseText = phase === 'images' ? '🖼️ Loading Textures'
                   : phase === 'audio' ? '🎵 Loading Audio'
                   : phase === 'scripts' ? '📜 Loading Scripts'
                   : 'Processing...';
  phaseNameEl.textContent = phaseText;
  phaseNameEl.style.color = phase === 'images' ? '#00ff88'
                           : phase === 'audio' ? '#ffaa00'
                           : '#0088ff';

  // Calculate total progress (weighted: textures 40%, audio 40%, scripts 20%)
  const imageWeight = 0.4;
  const audioWeight = 0.4;
  const scriptWeight = 0.2;

  let totalProgress = 0;
  if (currentLoadingState.currentPhase === 'images' && total > 0) {
    totalProgress = (current / total) * imageWeight * 100;
  } else if (currentLoadingState.currentPhase === 'audio' && total > 0) {
    totalProgress = imageWeight * 100 + (current / total) * audioWeight * 100;
  } else if (currentLoadingState.currentPhase === 'scripts') {
    totalProgress = (imageWeight + audioWeight) * 100;
  }

  // Update progress bar
  const progressBar = document.getElementById('progress-bar')!;
  progressBar.style.width = `${Math.min(totalProgress, 100)  }%`;

  // Update progress text
  const progressText = document.getElementById('progress-text')!;
  progressText.textContent = `${Math.floor(Math.min(totalProgress, 100))  }%`;

  // Update details
  const detailsEl = document.getElementById('loading-details')!;
  // eslint-disable-next-line no-unsanitized/property -- loading-state values are internal counters and phase enum
  detailsEl.innerHTML = `
    <div style="color:#00ff88;">🖼️ Textures:</div>
    <div style="margin-left:10px;color:#556;margin-bottom:8px;">${currentLoadingState.currentPhase === 'images' ? currentLoadingState.resourcesLoaded : currentLoadingState.totalResources} / ${currentLoadingState.totalResources} loaded</div>
    <div style="color:#ffaa00;">🎵 Audio:</div>
    <div style="margin-left:10px;color:#556;margin-bottom:8px;">${currentLoadingState.currentPhase === 'audio' ? currentLoadingState.resourcesLoaded : currentLoadingState.totalResources} / ${currentLoadingState.totalResources} loaded</div>
    <div style="color:#0088ff;">⏱️ Phase: ${currentLoadingState.currentPhase}</div>
  `;
}

// ─── Phase 7: File Browser Integration ──────────────────────────────────────────
const fileBrowserState = {
  selectedTableFile: null as FileInfo | null,
  selectedLibraryFiles: [] as FileInfo[],
  tableDirectory: null as FileSystemDirectoryHandle | null,
  libraryDirectory: null as FileSystemDirectoryHandle | null,
};

function updateFileBrowserUI(): void {
  const tableDir = fileBrowserState.tableDirectory;
  const libDir = fileBrowserState.libraryDirectory;

  // Update status
  const tableCount = fileBrowserState.selectedTableFile ? 1 : 0;
  const libCount = fileBrowserState.selectedLibraryFiles.length;
  const tableSize = fileBrowserState.selectedTableFile ? fileBrowserState.selectedTableFile.size : 0;
  const libSize = fileBrowserState.selectedLibraryFiles.reduce((sum, lib) => sum + lib.size, 0);
  const totalSize = tableSize + libSize;

  const statusEl = document.getElementById('browser-status')!;
  // eslint-disable-next-line no-unsanitized/property -- browser status uses internal counts and formatFileSize() output
  statusEl.innerHTML = `
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 10px;">
      <div style="background: rgba(0, 150, 100, 0.1); border: 1px solid #00ff88; border-radius: 4px; padding: 8px;">
        <div style="color: #667; font-size: 9px; margin-bottom: 3px;">📚 TISCH</div>
        <div style="color: #00ff88; font-size: 13px; font-weight: bold;">${tableCount}</div>
        <div style="color: #556; font-size: 9px; margin-top: 2px;">${formatFileSize(tableSize)}</div>
      </div>
      <div style="background: rgba(0, 100, 180, 0.1); border: 1px solid #0088ff; border-radius: 4px; padding: 8px;">
        <div style="color: #667; font-size: 9px; margin-bottom: 3px;">📦 BIBLIOTHEKEN</div>
        <div style="color: #0088ff; font-size: 13px; font-weight: bold;">${libCount}</div>
        <div style="color: #556; font-size: 9px; margin-top: 2px;">${formatFileSize(libSize)}</div>
      </div>
    </div>
    <div style="color: #667; font-size: 9px; padding-top: 8px; border-top: 1px solid #334;">
      <div style="color: #ffaa00;">💾 Gesamt: ${formatFileSize(totalSize)}</div>
    </div>
  `;

  // Show/hide load button
  const loadBtn = document.getElementById('load-selected-btn')!;
  if (fileBrowserState.selectedTableFile) {
    loadBtn.style.display = 'block';
    // eslint-disable-next-line no-unsanitized/property -- filename is escapeHtml'd inline
    loadBtn.innerHTML = `▶ ${escapeHtml(fileBrowserState.selectedTableFile.name)} LADEN`;
  } else {
    loadBtn.style.display = 'none';
  }
}

const browseTableDirectoryFS = async () => {
  try {
    const browser = getFileSystemBrowser();
    const uiManager = getFileBrowserUIManager();
    const tables = await browser.selectTableDirectory();

    fileBrowserState.tableDirectory = browser.getSelectedDirectories().tableDirectory;
    fileBrowserState.selectedTableFile = null;
    fileBrowserState.selectedLibraryFiles = [];

    const tablesList = document.getElementById('tables-list')!;
    const tablesEmpty = document.getElementById('tables-empty')!;

    if (tables.length === 0) {
      tablesList.style.display = 'none';
      return;
    }

    tablesList.style.display = 'block';
    tablesList.innerHTML = '';

    const filterContainer = document.createElement('div');
    filterContainer.style.cssText = 'margin-bottom: 8px;';
    const filterInput = document.createElement('input');
    filterInput.type = 'text';
    filterInput.placeholder = '🔍 Tisch durchsuchen...';
    filterInput.style.cssText = `
      width: 100%;
      padding: 4px 6px;
      background: rgba(0, 20, 40, 0.5);
      border: 1px solid #334;
      border-radius: 4px;
      color: #aab;
      font-size: 10px;
      font-family: 'Courier New', monospace;
      box-sizing: border-box;
    `;

    filterContainer.appendChild(filterInput);
    tablesList.parentElement?.insertBefore(filterContainer, tablesList);

    const renderRows = (filesToRender: FileInfo[]) => {
      tablesList.innerHTML = '';
      for (const table of filesToRender) {
        const row = uiManager.createFileRow(table, false, (file) => selectTableFile(file));
        tablesList.appendChild(row);
      }
    };

    renderRows(tables);

    filterInput.oninput = () => {
      const filtered = uiManager.filterFiles(tables, filterInput.value);
      renderRows(filtered);
    };

    updateFileBrowserUI();
  } catch (error) {
    console.error('❌ Failed to browse table directory:', error);
  }
};
// see window-api.ts — browseTableDirectory

const browseLibraryDirectoryFS = async () => {
  try {
    const browser = getFileSystemBrowser();
    const uiManager = getFileBrowserUIManager();
    const libraries = await browser.selectLibraryDirectory();

    fileBrowserState.libraryDirectory = browser.getSelectedDirectories().libraryDirectory;
    fileBrowserState.selectedLibraryFiles = [...libraries];

    const libsList = document.getElementById('libraries-list')!;
    const libsEmpty = document.getElementById('libraries-empty')!;

    if (libraries.length === 0) {
      libsList.style.display = 'none';
      return;
    }

    libsList.style.display = 'block';
    libsList.innerHTML = '';

    const filterContainer = document.createElement('div');
    filterContainer.style.cssText = 'margin-bottom: 8px;';
    const filterInput = document.createElement('input');
    filterInput.type = 'text';
    filterInput.placeholder = '🔍 Bibliothek durchsuchen...';
    filterInput.style.cssText = `
      width: 100%;
      padding: 4px 6px;
      background: rgba(0, 20, 40, 0.5);
      border: 1px solid #334;
      border-radius: 4px;
      color: #aab;
      font-size: 10px;
      font-family: 'Courier New', monospace;
      box-sizing: border-box;
    `;

    filterContainer.appendChild(filterInput);
    libsList.parentElement?.insertBefore(filterContainer, libsList);

    const renderRows = (filesToRender: FileInfo[]) => {
      libsList.innerHTML = '';
      for (const lib of filesToRender) {
        const isSelected = fileBrowserState.selectedLibraryFiles.some(l => l.name === lib.name);
        const row = uiManager.createLibraryCheckbox(lib, isSelected, (file, selected) => {
          if (selected) {
            if (!fileBrowserState.selectedLibraryFiles.some(l => l.name === file.name)) {
              fileBrowserState.selectedLibraryFiles.push(file);
            }
          } else {
            fileBrowserState.selectedLibraryFiles = fileBrowserState.selectedLibraryFiles.filter(l => l.name !== file.name);
          }
          updateFileBrowserUI();
        });
        libsList.appendChild(row);
      }
    };

    renderRows(libraries);

    // Filter on input
    filterInput.oninput = () => {
      const filtered = uiManager.filterFiles(libraries, filterInput.value);
      renderRows(filtered);
    };

    updateFileBrowserUI();
  } catch (error) {
    console.error('❌ Failed to browse library directory:', error);
  }
};
// see window-api.ts — browseLibraryDirectory

function selectTableFile(fileInfo: FileInfo): void {
  fileBrowserState.selectedTableFile = fileInfo;

  // Update visual selection
  const tablesList = document.getElementById('tables-list')!;
  for (const row of tablesList.querySelectorAll('div[style*="border-bottom"]')) {
    (row as HTMLElement).style.background = '';
  }

  // Find and highlight selected row
  for (const row of tablesList.querySelectorAll('div[style*="border-bottom"]')) {
    const nameEl = (row as HTMLElement).querySelector('div') as HTMLElement;
    if (nameEl && nameEl.textContent?.includes(fileInfo.name)) {
      (row as HTMLElement).style.background = 'rgba(0,200,100,0.2)';
      (row as HTMLElement).style.borderLeft = '3px solid #00ff88';
    }
  }

  updateFileBrowserUI();
}

const loadSelectedTable = async () => {
  if (!fileBrowserState.selectedTableFile) {
    console.warn('⚠️ No table file selected');
    return;
  }

  try {
    const browser = getFileSystemBrowser();
    const fileHandle = fileBrowserState.selectedTableFile.handle as FileSystemFileHandle;
    const file = await browser.getFile(fileHandle);

    logMsg(`Loading FPT: ${file.name} (${formatFileSize(file.size)})...`);

    showLoadingOverlay();

    const loadingCallbacks = {
      onPhaseStart: (phase: string) => {
        updateLoadingProgress(phase, 0, 1);
      },
      onResourceLoaded: (type: string, name: string, progress: { current: number; total: number }) => {
        updateLoadingProgress(type, progress.current, progress.total);
      },
      onPhaseComplete: (phase: string, duration: number) => {
        logMsg(`✓ ${phase.toUpperCase()} phase complete: ${duration.toFixed(0)}ms`);
      }
    };

    resetGameState();
    await parseFPTFile(
      file,
      async (cfg: any) => {
        await loadTableWithPhysicsWorker(cfg, scene);
        setupBackglassForTable();
      },
      () => {
        hideLoadingOverlay();
        closeLoader();
      },
      (tab: string) => {
        switchTab(tab);
      },
      loadingCallbacks
    );

    logMsg(`✓ Loaded: ${file.name}`, 'ok');
    hideLoadingOverlay();
  } catch (error) {
    console.error('❌ Error loading table:', error);
    hideLoadingOverlay();
    logMsg(`❌ Error: ${error instanceof Error ? error.message : String(error)}`, 'error');
  }
};
// see window-api.ts — loadSelectedTable

function logMsg(msg: string, className: string = 'log-info'): void {
  const parseLog = document.getElementById('parse-log');
  if (parseLog) {
    const span = document.createElement('span');
    span.className = className;
    span.textContent = `${msg  }\n`;
    parseLog.appendChild(span);
    parseLog.scrollTop = parseLog.scrollHeight;
  }
}

// ─── Advanced File Browser Features (Option A) ──────────────────────────────────
const addToFavorites = (filename: string, type: 'table' | 'library') => {
  const advancedMgr = getAdvancedFileBrowserManager();
  const targetList = type === 'table' ? fileBrowserState.selectedTableFile : fileBrowserState.selectedLibraryFiles.find(f => f.name === filename);

  if (targetList) {
    advancedMgr.addFavorite(targetList, type);
    logMsg(`⭐ Added to favorites: ${filename}`, 'log-ok');
  } else {
    console.warn('File not found in current selection');
  }
};

const getAdvancedFavoritesCount = (): number => {
  const advancedMgr = getAdvancedFileBrowserManager();
  return advancedMgr.getFavorites().length;
};

const getRecentTables = (): FileInfo[] => {
  const advancedMgr = getAdvancedFileBrowserManager();
  return advancedMgr.getRecent();
};

const createBatchLoadJob = (tableNames: string[]): string => {
  const advancedMgr = getAdvancedFileBrowserManager();
  const files = fileBrowserState.selectedTableFile
    ? [fileBrowserState.selectedTableFile]
    : [];

  const job = advancedMgr.createBatchJob(files, fileBrowserState.selectedLibraryFiles);
  logMsg(`📋 Created batch job: ${job.id}`, 'log-info');
  return job.id;
};

const getBatchJobStatus = (jobId: string): BatchJob | undefined => {
  const advancedMgr = getAdvancedFileBrowserManager();
  return advancedMgr.getBatchJob(jobId);
};

const setupTableDragDrop = () => {
  const advancedMgr = getAdvancedFileBrowserManager();
  const dropZone = document.getElementById('game-canvas');

  if (dropZone) {
    advancedMgr.setupDragDrop(dropZone, async (files: File[], type: 'table' | 'library') => {
      logMsg(`📂 Dropped ${files.length} ${type} file${files.length !== 1 ? 's' : ''}`, 'log-info');
    });
    logMsg('✓ Drag & drop enabled for game canvas', 'log-ok');
  }
};

const sortTableFiles = (field: string, files?: FileInfo[]): FileInfo[] => {
  const advancedMgr = getAdvancedFileBrowserManager();
  const filesToSort = files || (fileBrowserState.selectedTableFile ? [fileBrowserState.selectedTableFile] : []);
  return advancedMgr.sortFiles(filesToSort, field);
};

// ─── Option B: Testing & Validation ────────────────────────────────────────────
const runFullTestSuite = async (): Promise<any> => {
  const testSuite = getTestSuite();
  return await testSuite.runAllTests();
};

const toggleFullscreen = () => {
  if (!document.fullscreenElement) document.documentElement.requestFullscreen?.().catch(()=>{});
  else document.exitFullscreen?.();
};

// see window-api.ts — toggleDMDMode (direct import reference)

let _dmdHidden = false;

// ─── Auto-hide DMD on playfield when using multi-screen mode ───
// Check if we're in a multi-screen setup with dedicated DMD screen
const initDMDVisibility = () => {
  const screenRoleMgr = getScreenRoleManager();
  const layout = screenRoleMgr.getLayout();
  const hasDedicatedDMD = layout.screens.some(s => s.role === 'dmd');

  // If multi-screen mode with dedicated DMD, and this is NOT the DMD window, hide it
  if (layout.screenCount > 1 && hasDedicatedDMD && FPW_ROLE !== 'dmd') {
    _dmdHidden = true;
    console.log(`🎮 Multi-screen mode detected: DMD hidden on ${FPW_ROLE || 'playfield'} window`);
  }
};

const toggleHideDMD = () => {
  _dmdHidden = !_dmdHidden;
  const wrap=document.getElementById('dmd-wrap')!, btn=document.getElementById('hide-dmd-btn')!;
  wrap.style.display=_dmdHidden?'none':'';
  btn.classList.toggle('dmd-hidden',_dmdHidden);
};
// see window-api.ts — toggleHideDMD

// ─── Initialize DMD visibility based on multi-screen configuration ───
document.addEventListener('DOMContentLoaded', () => {
  initDMDVisibility();
  // Apply DMD visibility to the UI
  const wrap = document.getElementById('dmd-wrap');
  const btn = document.getElementById('hide-dmd-btn');
  if (wrap) wrap.style.display = _dmdHidden ? 'none' : '';
  if (btn) btn.classList.toggle('dmd-hidden', _dmdHidden);
}, { once: true });

// Fallback for if DOMContentLoaded already fired
setTimeout(() => {
  if (!document.readyState.includes('loading')) {
    initDMDVisibility();
    const wrap = document.getElementById('dmd-wrap');
    const btn = document.getElementById('hide-dmd-btn');
    if (wrap) wrap.style.display = _dmdHidden ? 'none' : '';
    if (btn) btn.classList.toggle('dmd-hidden', _dmdHidden);
  }
}, 100);

// ─── Resize (with Responsive Adjustments) ─────────────────────────────────────
window.addEventListener('resize', () => {
  try {
  // Calculate all responsive parameters
  const newAspect = innerWidth / innerHeight;
  const newZoom = calculateResponsiveZoom(newAspect);
  const newTilt = getResponsiveCameraTilt(newAspect);
  const newFOV = getResponsiveFOV();
  const newFlipperX = getResponsiveFlipperX(newAspect);
  const newSafeFlipperLen = calcSafeFlipperLength(newFlipperX);
  const currentLen = leftFlipperGroup.userData.flipperLength || 2.1;

  // Rebuild flippers if length changed (to prevent crossing)
  if (Math.abs(newSafeFlipperLen - currentLen) > 0.05) {
    scene.remove(leftFlipperGroup, rightFlipperGroup);
    leftFlipperGroup = buildRealisticFlipper('left', newSafeFlipperLen);
    rightFlipperGroup = buildRealisticFlipper('right', newSafeFlipperLen);
    leftFlipperGroup.position.set(-newFlipperX, -4.6, 0.35);
    rightFlipperGroup.position.set(newFlipperX, -4.6, 0.35);
    scene.add(leftFlipperGroup, rightFlipperGroup);
  } else {
    // Apply to flippers (position only)
    leftFlipperGroup.position.x = -newFlipperX;
    rightFlipperGroup.position.x = newFlipperX;
  }

  // Apply to camera (position/fov only — aspect ratio is handled by primary
  // handler which uses canvasSize.displayWidth/displayHeight consistently.)
  camera.position.set(0, newTilt, newZoom);
  camera.fov = newFOV;
  camera.updateProjectionMatrix();

  // NOTE: renderer.setSize / renderer.setPixelRatio / composer.setSize are
  // intentionally NOT called here. The primary resize handler (debounced
  // 250ms) does that with canvas-size-aware values. Calling setSize again
  // here with raw innerWidth/innerHeight conflicts with the primary's HiDPI
  // logic and was the cause of the table disappearing on resize.

  // Update FXAA resolution to match current renderer state
  fxaaPass.uniforms['resolution'].value.x = 1 / (innerWidth * renderer.getPixelRatio());
  fxaaPass.uniforms['resolution'].value.y = 1 / (innerHeight * renderer.getPixelRatio());

  // Update inline backglass if active
  if (_bgPanelActive) {
    const bgWidthVw = parseFloat(getResponsiveBackglassWidth());
    const canvas = document.getElementById('backglass-canvas') as HTMLCanvasElement;
    if (canvas) {
      canvas.width = Math.round(innerWidth * (bgWidthVw / 100));
      canvas.height = innerHeight;
    }
  }

  // Update device detection
  window.FPW_DEVICE = detectDeviceType();
  } catch (error) {
    console.error('Error during secondary resize handler:', error);
  }
});

// ─── Touch Controls ────────────────────────────────────────────────────────────
(function setupTouch() {
  if (!('ontouchstart' in window) && navigator.maxTouchPoints<1) return;
  ['touch-left','touch-right','touch-plunger'].forEach(id => {
    const el=document.getElementById(id); if(el) el.style.display='flex';
  });
  const bindFlipper = (id: string, side: 'left'|'right') => {
    const el=document.getElementById(id); if(!el) return;
    el.addEventListener('touchstart',e=>{e.preventDefault();keys[side]=true;getAudioCtx();playSound('flipper');},{passive:false});
    el.addEventListener('touchend',  e=>{e.preventDefault();keys[side]=false;},{passive:false});
  };
  bindFlipper('touch-left','left'); bindFlipper('touch-right','right');
  const plBtn=document.getElementById('touch-plunger');
  if(plBtn){
    plBtn.addEventListener('touchstart',e=>{e.preventDefault();getAudioCtx();if(state.inLane&&!state.plungerCharging)state.plungerCharging=true;},{passive:false});
    plBtn.addEventListener('touchend',  e=>{
      e.preventDefault();
      if(state.inLane&&state.plungerCharging){
        state.plungerCharging=false; const charge=state.plungerCharge;
        state.inLane=false; state.plungerCharge=0; state.ballSaveTimer=3.5;
        if(physics){
          physics.ballBody.setGravityScale(1.0, true);
          physics.ballBody.setTranslation({ x:2.65, y:-5.0 }, true);
          physics.ballBody.setLinvel({ x:0, y:16.0+charge*14.0 }, true);
        }
        playSound('bumper'); startBGMusic();
      }
    },{passive:false});
  }
})();

// ─── Multi-Screen ─────────────────────────────────────────────────────────────
let _msLayout = 1;
const _msWindows: Record<string,Window|null> = {};
const _msWindowStatus: Record<string,{opened: boolean; verified: boolean}> = {};

const selectMsLayout = (n: number) => {
  _msLayout=n;
  [1,2,3].forEach(i => document.getElementById(`ms-card-${i}`)?.classList.toggle('selected',i===n));

  // ─── Update Screen Role Configuration UI ───
  const roleConfig = document.getElementById('screen-role-config')!;
  const roleList = document.getElementById('screen-role-list')!;

  if (n > 1) {
    roleConfig.style.display = 'block';
    roleList.innerHTML = '';

    // Create role assignment controls for each screen
    const mgr = getScreenRoleManager();
    const layout = mgr.getLayout();

    for (let i = 0; i < n; i++) {
      const currentRole = layout.screens[i]?.role || 'none';
      const screenDiv = document.createElement('div');
      screenDiv.style.display = 'flex';
      screenDiv.style.gap = '8px';
      screenDiv.style.alignItems = 'center';

      const label = document.createElement('label');
      label.style.flex = '0 0 80px';
      label.style.color = '#00aaff';
      label.style.fontSize = '12px';
      label.textContent = `Screen ${i + 1}:`;

      const select = document.createElement('select');
      select.style.flex = '1';
      select.style.padding = '6px';
      select.style.background = '#1a1a2e';
      select.style.color = '#aaa';
      select.style.border = '1px solid #667';
      select.style.borderRadius = '4px';
      select.onchange = (e: any) => {
        mgr.setRoleForScreen(i, e.target.value);
      };

      const options = [
        { value: 'playfield', text: '▶ Playfield (Main Game)' },
        { value: 'backglass', text: '🎪 Backglass (Cabinet Art)' },
        { value: 'dmd', text: '🔢 DMD (Score Display)' },
      ];

      options.forEach(opt => {
        const option = document.createElement('option');
        option.value = opt.value;
        option.textContent = opt.text;
        option.selected = currentRole === opt.value;
        select.appendChild(option);
      });

      screenDiv.appendChild(label);
      screenDiv.appendChild(select);
      roleList.appendChild(screenDiv);
    }
  } else {
    roleConfig.style.display = 'none';
  }
};
// Wire the multi-screen modal's click handlers exactly once. The HTML
// (index.html) declares the cards / buttons but never had click listeners
// attached — so clicking "3 SCREENS" or "APPLY LAYOUT" was a no-op,
// which made the modal feel completely broken on the cabinet.
let _msModalWired = false;
function wireMultiscreenModalOnce() {
  if (_msModalWired) return;
  const modal = document.getElementById('multiscreen-modal');
  if (!modal) return; // DOM not ready yet
  for (const n of [1, 2, 3] as const) {
    document.getElementById(`ms-card-${n}`)?.addEventListener('click', () => {
      window.selectMsLayout?.(n);
    });
  }
  document.getElementById('ms-apply')?.addEventListener('click', () => {
    void window.applyMsLayout?.();
  });
  document.getElementById('ms-autodetect')?.addEventListener('click', () => {
    void window.autoDetectScreens?.();
  });
  document.getElementById('ms-close')?.addEventListener('click', () => {
    window.closeMultiscreenModal?.();
  });
  _msModalWired = true;
}

const openMultiscreenModal = () => {
  wireMultiscreenModalOnce();
  document.getElementById('multiscreen-modal')!.classList.add('open');
};
const closeMultiscreenModal = () => document.getElementById('multiscreen-modal')!.classList.remove('open');
// see window-api.ts — openMultiscreenModal, closeMultiscreenModal

// ─── Multi-Screen helpers (Phase 4: prefer Electron IPC over browser APIs) ───
interface ScreenLike {
  availLeft: number;
  availTop: number;
  availWidth: number;
  availHeight: number;
  isPrimary?: boolean;
  label?: string;
}

// Stable, position-aware ordering: primary at index 0, remaining screens
// sorted by horizontal position (then vertical, as a tiebreaker). This
// matches typical pinball cabinet layouts where the Playfield (primary)
// is at the bottom/center and Backglass + DMD are stacked or arranged
// to the right. Without sorting, Electron returns displays in OS registration
// order (HDMI in 3 before HDMI in 2 in the user's setup), which made
// screens[1] the *furthest* display and swapped Backglass/DMD on the cabinet.
function sortScreensByPosition(arr: ScreenLike[]): ScreenLike[] {
  const primaryIdx = arr.findIndex(s => s.isPrimary);
  const primary = primaryIdx >= 0 ? arr[primaryIdx] : null;
  const rest = arr.filter((_, i) => i !== primaryIdx);
  // Sort by x ascending, then y ascending — predictable left-to-right ordering.
  rest.sort((a, b) => (a.availLeft - b.availLeft) || (a.availTop - b.availTop));
  return primary ? [primary, ...rest] : rest;
}

async function getAllScreensForLayout(): Promise<ScreenLike[]> {
  const api = window.electronAPI;
  if (api?.getAllDisplays) {
    try {
      const displays = await api.getAllDisplays();
      if (Array.isArray(displays) && displays.length > 0) {
        const mapped: ScreenLike[] = displays.map((d: any) => ({
          availLeft: d.workArea?.x ?? d.bounds?.x ?? 0,
          availTop: d.workArea?.y ?? d.bounds?.y ?? 0,
          availWidth: d.workArea?.width ?? d.bounds?.width ?? 1920,
          availHeight: d.workArea?.height ?? d.bounds?.height ?? 1080,
          isPrimary: !!d.isPrimary,
          label: d.label,
        }));
        return sortScreensByPosition(mapped);
      }
    } catch (e) {
      console.warn('[multiscreen] electronAPI.getAllDisplays failed:', e);
    }
  }
  if ('getScreenDetails' in window) {
    try {
      const details = await window.getScreenDetails!();
      const mapped: ScreenLike[] = (details.screens || []).map((s: any) => ({
        availLeft: s.availLeft,
        availTop: s.availTop,
        availWidth: s.availWidth,
        availHeight: s.availHeight,
        isPrimary: s.isPrimary,
        label: s.label,
      }));
      return sortScreensByPosition(mapped);
    } catch { /* fall through */ }
  }
  // Single-screen fallback
  return [{
    availLeft: 0,
    availTop: 0,
    availWidth: window.screen.availWidth,
    availHeight: window.screen.availHeight,
    isPrimary: true,
  }];
}

async function openMultiscreenWindow(
  url: string,
  name: string,
  x: number,
  y: number,
  w: number,
  h: number,
  role: string
): Promise<Window | null> {
  const api = window.electronAPI;
  if (api?.openWindow) {
    try {
      await api.openWindow({
        url,
        x: Math.round(x),
        y: Math.round(y),
        width: Math.round(w),
        height: Math.round(h),
        role,
      });
      // Electron child windows aren't a renderer-accessible Window object.
      // Return a stub the existing code can store/test for non-null.
      return { closed: false, close: () => { /* main-process handles close */ } } as unknown as Window;
    } catch (e) {
      console.warn(`[multiscreen] electronAPI.openWindow failed for ${role}, falling back:`, e);
    }
  }
  const features = `width=${Math.round(w)},height=${Math.round(h)},left=${Math.round(x)},top=${Math.round(y)},toolbar=no,menubar=no,scrollbars=no,resizable=yes`;
  return window.open(url, name, features);
}

// ─── Helper function to open windows with verification ───
function openMultiScreenWindow(url: string, name: string, features: string, role: string): Window | null {
  console.log(`🪟 Opening ${role} window: ${url}`);
  try {
    const win = window.open(url, name, features);
    if (win) {
      _msWindowStatus[role] = { opened: true, verified: false };
      console.log(`✓ ${role} window opened successfully`);

      // Verify window loaded after delay
      setTimeout(() => {
        try {
          if (!win.closed && win.document && win.document.readyState === 'complete') {
            _msWindowStatus[role].verified = true;
            console.log(`✓ ${role} window verified - fully loaded`);
          } else {
            console.warn(`⚠ ${role} window opened but may not be fully loaded yet`);
          }
        } catch (e) {
          console.warn(`⚠ Cannot verify ${role} window (cross-origin):`, e);
        }
      }, 2000);

      return win;
    } else {
      _msWindowStatus[role] = { opened: false, verified: false };
      console.error(`✗ ${role} window failed to open - likely blocked by browser`);
      showNotification(`⚠ ${role} window blocked. Enable popups for localhost`);
      return null;
    }
  } catch (err) {
    _msWindowStatus[role] = { opened: false, verified: false };
    console.error(`✗ ${role} window error:`, err);
    return null;
  }
}

// ─── Screen Role Management ───
const resetScreenRoles = (screenCount?: number) => {
  const count = screenCount || _msLayout;
  getScreenRoleManager().resetToDefault(count);
  selectMsLayout(count);
};

const swapScreenRoles = (screen1: number, screen2: number) => {
  getScreenRoleManager().swapRoles(screen1, screen2);
  selectMsLayout(_msLayout);
};

// see window-api.ts — resetScreenRoles, swapScreenRoles

const autoDetectScreens = async () => {
  const info=document.getElementById('ms-detect-info')!; info.classList.add('visible'); info.textContent='Scanning...';
  const screensList = await getAllScreensForLayout();
  const screenCount = screensList.length;
  if(screenCount>=3){info.textContent=`✓ ${screenCount} screens — 3-screen empfohlen`;selectMsLayout(3);}
  else if(screenCount===2){info.textContent=`✓ 2 screens — 2-screen empfohlen`;selectMsLayout(2);}
  else {info.textContent=`1 screen`;selectMsLayout(1);}
};

const applyStartupScreenConfig = async () => {
  const config = window._startupScreenConfig;
  const tableParam = new URLSearchParams(location.search).get('table');

  if (!config) return;

  if (tableParam) {
    const demoTable = tableParam;
    loadDemoTable(demoTable);
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  if (config === 'auto') {
    await autoDetectScreens();
    setTimeout(() => applyMsLayout(), 500);
  } else if ([1, 2, 3].includes(config)) {
    selectMsLayout(config);
    setTimeout(() => applyMsLayout(), 300);
  }
};

// see window-api.ts — autoDetectScreens, applyStartupScreenConfig

function _winSpec(role: string, dw: number, dh: number, screenIdx?: number): string {
  // Try to use saved position first
  try { const s=JSON.parse(localStorage.getItem(`fpw_winpos_${role}`)??'null'); if(s?.w>100) return `width=${s.w},height=${s.h},left=${s.x},top=${s.y}`; } catch { /* ignore */ void 0; }

  // If screen index provided, use that screen's position
  if (screenIdx !== undefined) {
    try {
      if ('getScreenDetails' in window) {
        const screens = window.screens || [];
        if (screens.length > screenIdx) {
          const scr = screens[screenIdx];
          return `width=${dw},height=${dh},left=${scr.availLeft},top=${scr.availTop}`;
        }
      }
    } catch (e) { console.warn('[main] Screen detection fallback:', (e || 'unknown')); /* fallback */ }
  }

  return `width=${dw},height=${dh}`;
}

const applyMsLayout = async () => {
  closeMultiscreenModal();
  ['dmd','backglass'].forEach(role=>{ if(_msWindows[role]&&!(_msWindows[role] as Window).closed)(_msWindows[role] as Window).close(); delete _msWindows[role]; });
  stopInlineBackglass();
  const btn=document.getElementById('multiscreen-btn')!, hdBtn=document.getElementById('hide-dmd-btn')!;
  const base=location.origin+location.pathname, sw=screen.width, sh=screen.height;

  // ─── Get screen role assignments ───
  const screenRoleMgr = getScreenRoleManager();
  const roleLayout = screenRoleMgr.getLayout();

  // Try to get available screens (Phase 4: uses Electron IPC if available)
  const screens: ScreenLike[] = await getAllScreensForLayout();
  console.log(`📺 Screen API detected: ${screens.length} screens found`);
  screens.forEach((s, i) => {
    console.log(`  Screen ${i}: ${s.availWidth}x${s.availHeight} @ (${s.availLeft},${s.availTop})${s.isPrimary ? ' [PRIMARY]' : ''}`);
  });

  if(_msLayout===1){
    initInlineBackglass(); btn.classList.add('active-multi');
  } else if(_msLayout===2){
    // ─── 2-Screen: Use role assignments ───
    // Find which screen should be backglass/dmd
    const bgScreen = roleLayout.screens.find(s => s.role === 'backglass' || s.role === 'dmd');
    const screenIdx = bgScreen?.screenIndex || 1; // Default to screen 2

    if(screens.length > screenIdx) {
      const screen2 = screens[screenIdx];
      const x = screen2.availLeft, y = screen2.availTop, w = screen2.availWidth, h = screen2.availHeight;
      _msWindows['backglass']=await openMultiscreenWindow(`${base}?role=backglass`,'fpw_backglass', x, y, w, h, 'backglass');
      showNotification(`2-Screen: Backglass auf Screen ${screenIdx + 1} geöffnet`);
    } else {
      _msWindows['backglass']=await openMultiscreenWindow(`${base}?role=backglass`,'fpw_backglass', 0, 0, sw, sh, 'backglass');
      showNotification('2-Screen: Bitte Backglass-Fenster auf zweiten Monitor ziehen');
    }
    if(hdBtn){hdBtn.style.display='block';} btn.classList.add('active-multi');
  } else if(_msLayout===3){
    // ─── 3-Screen: Use individual role assignments ───
    const bgConfig = roleLayout.screens.find(s => s.role === 'backglass');
    const dmdConfig = roleLayout.screens.find(s => s.role === 'dmd');

    const bgScreenIdx = bgConfig?.screenIndex ?? 1;
    const dmdScreenIdx = dmdConfig?.screenIndex ?? 2;

    console.log(`🎮 3-Screen Mode: Backglass on screen ${bgScreenIdx + 1}, DMD on screen ${dmdScreenIdx + 1}. Detected ${screens.length} physical screens`);

    if(screens.length >= 3) {
      // Backglass on assigned screen
      if (bgScreenIdx < screens.length) {
        const bgScreen = screens[bgScreenIdx];
        const xbg = bgScreen.availLeft, ybg = bgScreen.availTop, wbg = bgScreen.availWidth, hbg = bgScreen.availHeight;
        _msWindows['backglass']=await openMultiscreenWindow(`${base}?role=backglass&nodmd=1`,'fpw_backglass', xbg, ybg, wbg, hbg, 'backglass');
      }

      // DMD on assigned screen
      if (dmdScreenIdx < screens.length) {
        const dmdScreen = screens[dmdScreenIdx];
        const xdmd = dmdScreen.availLeft, ydmd = dmdScreen.availTop, wdmd = dmdScreen.availWidth, hdmd = dmdScreen.availHeight;
        console.log(`✓ Opening DMD on Screen ${dmdScreenIdx + 1}: ${wdmd}x${hdmd} at (${xdmd},${ydmd})`);
        _msWindows['dmd']=await openMultiscreenWindow(`${base}?role=dmd`,'fpw_dmd', xdmd, ydmd, wdmd, hdmd, 'dmd');
        if (!_msWindows['dmd']) {
          console.warn('⚠ Detailed positioning failed, trying basic openMultiscreenWindow()');
          _msWindows['dmd']=await openMultiscreenWindow(`${base}?role=dmd`,'fpw_dmd', 0, 0, 1024, 256, 'dmd');
        }
        if (!_msWindows['dmd']) console.error('⚠ DMD window failed to open - may be blocked by browser or popups disabled');
      } else {
        console.warn(`⚠ DMD screen index ${dmdScreenIdx} >= total screens ${screens.length}, falling back`);
      }

      showNotification(`3-Screen: Backglass auf Screen ${bgScreenIdx + 1}, DMD auf Screen ${dmdScreenIdx + 1} geöffnet`);
    } else if(screens.length === 2) {
      // Fallback for 2 physical screens: backglass on screen 2, DMD on screen 2 (split layout)
      console.warn('⚠ Only 2 screens detected, opening Backglass+DMD both on Screen 2');
      const screen2 = screens[1];
      const x = screen2.availLeft, y = screen2.availTop, w = screen2.availWidth, h = screen2.availHeight;
      _msWindows['backglass']=await openMultiscreenWindow(`${base}?role=backglass&nodmd=1`,'fpw_backglass', x, y, w, h, 'backglass');
      console.log(`✓ Backglass opened on Screen 2`);
      _msWindows['dmd']=await openMultiscreenWindow(`${base}?role=dmd`,'fpw_dmd', x, y, w, h, 'dmd');
      console.log(`✓ DMD opened on Screen 2`);
      showNotification('3-Screen-Modus mit 2 Bildschirmen: Backglass+DMD auf Screen 2');
    } else {
      // Fallback for single screen: manual arrangement
      _msWindows['backglass']=await openMultiscreenWindow(`${base}?role=backglass&nodmd=1`,'fpw_backglass', 0, 0, Math.round(sw*0.75), Math.round(sh*0.75), 'backglass');
      _msWindows['dmd']=await openMultiscreenWindow(`${base}?role=dmd`,'fpw_dmd', 0, 0, Math.round(sw*0.55), Math.round(sh*0.28), 'dmd');
      showNotification('3-Screen: Fenster auf gewünschte Bildschirme ziehen');
    }
    if(hdBtn) hdBtn.style.display='block'; btn.classList.add('active-multi');
  }

  // Re-apply DMD visibility based on the new multi-screen layout
  setTimeout(() => {
    initDMDVisibility();
    const wrap = document.getElementById('dmd-wrap');
    const btn = document.getElementById('hide-dmd-btn');
    if (wrap) wrap.style.display = _dmdHidden ? 'none' : '';
    if (btn) btn.classList.toggle('dmd-hidden', _dmdHidden);
  }, 200);
};
// see window-api.ts — applyMsLayout

// ─── Secondary Windows ────────────────────────────────────────────────────────
function setupDMDWindow(): void {
  document.title='FPW — DMD';
  window.addEventListener('beforeunload',()=>{
    try{localStorage.setItem('fpw_winpos_dmd',JSON.stringify({x:window.screenX,y:window.screenY,w:window.outerWidth,h:window.outerHeight}));}catch{ /* localStorage can throw, ignore */ void 0; }
    disposePhysicsWorker();
  });
  const wrap=document.getElementById('dmd-wrap')!, canvas=document.getElementById('dmd') as HTMLCanvasElement;

  // Frameless Electron child windows aren't draggable by default. Mark the
  // entire body as a drag region so the user can grab any part of the DMD
  // window with the mouse and reposition it freely across monitors.
  // `app-region: no-drag` on resize handles preserves drag-to-resize.
  document.body.style.setProperty('-webkit-app-region', 'drag');
  document.body.style.setProperty('app-region', 'drag');

  // ─── DMD sizing for standalone window ───
  // The DMD content is 4:1 aspect (128×32 dots). On a 16:9 1920×1080 monitor
  // we maximize the *width* (full 1920px) which gives a 1920×480 strip — the
  // largest the DMD content can be without distortion. Black bars above/below
  // are the classic cabinet DMD look. (If the user later wants the DMD to
  // share the screen with score panels / table info, this is where to do it.)
  const resizeDMD=()=>{
    const a = DMD_W / DMD_H;  // 4:1
    const ww = innerWidth, wh = innerHeight;
    // Fit-to-width first; if that overflows height, fall back to fit-to-height.
    let w = ww, h = ww / a;
    if (h > wh) { h = wh; w = h * a; }
    // CSS display size
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    // Bitmap (drawing buffer) size — was missing before, leaving canvas
    // empty on the standalone DMD window. dmdFlush() does
    // `drawImage(dmdOff, 0, 0, canvas.width, canvas.height)` so we need
    // these to be non-zero for anything to render.
    canvas.width = Math.max(256, Math.floor(w));
    canvas.height = Math.max(64, Math.floor(h));

    if (window.updateResponsiveDMDScale) {
      window.updateResponsiveDMDScale();
    }
  };

  resizeDMD();
  window.addEventListener('resize', resizeDMD);
  window.addEventListener('orientationchange', resizeDMD);

  // Initialize drag-to-resize functionality
  initDMDResizing(canvas, wrap);

  // On-canvas diagnostic — visible WITHOUT DevTools. Shows in top-left:
  //   F:1234 M:567
  // F = render frame counter (proves DMD render loop runs)
  // M = state messages received from playfield (any of BC/IPC/LS)
  // If F grows but M stays 0 → playfield→DMD bridge is the problem.
  // If both grow but score doesn't update → render-side issue.
  // If neither grows → DMD render loop itself is dead.
  let dmdRenderFrames = 0;
  const dmdCtx = canvas.getContext('2d');
  const drawDmdDiag = () => {
    if (!dmdCtx) return;
    const m = (window as any)._msStateMessages || {};
    const total = (m.broadcastChannel || 0) + (m.electronIPC || 0) + (m.localStorage || 0);
    dmdCtx.save();
    dmdCtx.fillStyle = 'rgba(0,0,0,0.6)';
    dmdCtx.fillRect(2, 2, 110, 14);
    dmdCtx.fillStyle = '#0f0';
    dmdCtx.font = '10px monospace';
    dmdCtx.fillText(`F:${dmdRenderFrames} M:${total}`, 4, 12);
    dmdCtx.restore();
  };

  const dmdLoop = () => {
    requestAnimationFrame(dmdLoop);
    dmdRenderFrames++;
    dmdState.animFrame++;
    switch (dmdState.mode) {
      case 'attract': dmdRenderAttract(); break;
      case 'playing': dmdRenderPlaying(); break;
      case 'event': dmdRenderEvent(); break;
      case 'gameover': dmdRenderGameOver(); break;
    }
    if (dmdState.mode === 'event') {
      dmdState.eventTimer--;
      if (dmdState.eventTimer <= 0) dmdState.mode = 'playing';
    }
    drawDmdDiag();
  };
  dmdLoop();
  subscribeMultiscreenState((data: any) => {
    if (data.type !== 'state') return;
    Object.assign(dmdState, {
      mode: data.dmdMode, eventText: data.dmdEventText, animFrame: data.dmdAnimFrame,
      scrollX: data.dmdScrollX, eventTimer: data.dmdEventTimer,
    });
    state.score = data.score; state.ballNum = data.ballNum;
    state.multiplier = data.multiplier; state.lastRank = data.lastRank;
    state.lastScore = data.lastScore;
  });
}

function setupBackglassWindow(): void {
  document.title='FPW — Backglass';
  window.addEventListener('beforeunload',()=>{try{localStorage.setItem('fpw_winpos_backglass',JSON.stringify({x:window.screenX,y:window.screenY,w:window.outerWidth,h:window.outerHeight}));}catch{ /* localStorage can throw, ignore */ void 0; }
disposePhysicsWorker();});
  // Frameless Electron child window — make whole body a drag region so the
  // Backglass can be repositioned freely across monitors.
  document.body.style.setProperty('-webkit-app-region', 'drag');
  document.body.style.setProperty('app-region', 'drag');
  const canvas=document.getElementById('backglass-canvas') as HTMLCanvasElement;
  const showEmbedDMD=!new URLSearchParams(location.search).has('nodmd');
  const bgState:any={score:0,ballNum:1,multiplier:1,tableName:'FUTURE PINBALL',tableAccent:0x00ff66,tableColor:0x1a4a15,dmdMode:'attract',dmdEventText:'',dmdAnimFrame:0,dmdScrollX:0,dmdEventTimer:0,lastRank:0,lastScore:0,highScores:[]};

  const setSize=()=>{canvas.width=innerWidth;canvas.height=innerHeight;};
  setSize(); window.addEventListener('resize',setSize);

  // On-canvas diagnostic for Backglass (see DMD comment for meaning).
  let bgRenderFrames = 0;
  const bgCtx = canvas.getContext('2d');
  const drawBgDiag = () => {
    if (!bgCtx) return;
    const m = (window as any)._msStateMessages || {};
    const total = (m.broadcastChannel || 0) + (m.electronIPC || 0) + (m.localStorage || 0);
    bgCtx.save();
    bgCtx.fillStyle = 'rgba(0,0,0,0.6)';
    bgCtx.fillRect(2, 2, 130, 16);
    bgCtx.fillStyle = '#0f0';
    bgCtx.font = '11px monospace';
    bgCtx.fillText(`F:${bgRenderFrames} M:${total}`, 4, 13);
    bgCtx.restore();
  };

  const bgLoop = () => {
    requestAnimationFrame(bgLoop);
    bgRenderFrames++;
    bgState.dmdAnimFrame++;
    if (bgState.dmdEventTimer > 0) { bgState.dmdEventTimer--; bgState.dmdMode = 'event'; }
    else if (bgState.dmdMode === 'event') bgState.dmdMode = 'playing';
    Object.assign(state, { score: bgState.score, ballNum: bgState.ballNum, multiplier: bgState.multiplier, lastRank: bgState.lastRank, lastScore: bgState.lastScore });
    Object.assign(dmdState, { mode: bgState.dmdMode, eventText: bgState.dmdEventText, animFrame: bgState.dmdAnimFrame, scrollX: bgState.dmdScrollX, eventTimer: bgState.dmdEventTimer });
    drawBGCanvas(canvas, bgState, showEmbedDMD);
    drawBgDiag();
  };
  bgLoop();
  subscribeMultiscreenState((data: any) => {
    if (data.type !== 'state') return;
    Object.assign(bgState, {
      score: data.score, ballNum: data.ballNum, multiplier: data.multiplier,
      tableName: data.tableName, tableAccent: data.tableAccent, tableColor: data.tableColor,
      dmdMode: data.dmdMode, dmdEventText: data.dmdEventText, dmdAnimFrame: data.dmdAnimFrame,
      dmdScrollX: data.dmdScrollX, dmdEventTimer: data.dmdEventTimer,
      lastRank: data.lastRank, lastScore: data.lastScore,
      highScores: data.highScores || [],
    });
  });
}

function drawBGCanvas(canvas: HTMLCanvasElement, bgState: any, showEmbedDMD: boolean): void {
  const ctx=canvas.getContext('2d')!; if(!canvas.width)return;
  const W=canvas.width,H=canvas.height;
  const toHex=(n:number)=>`#${(`000000${n.toString(16)}`).slice(-6)}`;
  const accent=toHex(bgState.tableAccent||0x00ff66), tcolor=toHex(bgState.tableColor||0x1a4a15);
  const bg=ctx.createLinearGradient(0,0,0,H);
  bg.addColorStop(0,'#0a0a14');bg.addColorStop(0.5,`${tcolor}44`);bg.addColorStop(1,'#050508');
  ctx.fillStyle=bg; ctx.fillRect(0,0,W,H);
  ctx.save();ctx.shadowColor=accent;ctx.shadowBlur=25;ctx.fillStyle=accent;
  ctx.font=`bold ${Math.min(H*0.06,W*0.07)}px "Courier New",monospace`;ctx.textAlign='center';ctx.textBaseline='top';
  ctx.fillText((bgState.tableName||'FUTURE PINBALL').toUpperCase(),W/2,H*0.03);ctx.restore();
  ctx.save();ctx.shadowColor='#ff6600';ctx.shadowBlur=30;ctx.fillStyle='#ff6600';
  ctx.font=`bold ${Math.min(H*0.14,W*0.12)}px "Courier New",monospace`;ctx.textAlign='center';ctx.textBaseline='top';
  ctx.fillText((bgState.score||0).toLocaleString(),W/2,H*0.15);ctx.restore();
  ctx.save();ctx.fillStyle='#ffcc00';ctx.font=`bold ${Math.min(H*0.07,W*0.06)}px "Courier New",monospace`;ctx.textAlign='left';ctx.textBaseline='top';
  ctx.fillText(`×${bgState.multiplier||1}`,W*0.08,H*0.38);ctx.restore();
  if(showEmbedDMD&&dmdCanvas){
    const dY=H*0.72,dH=H*0.25,dW=W*0.86,dX=W*0.07;
    ctx.fillStyle='#050200';ctx.strokeStyle='#5a2200';ctx.lineWidth=2;
    ctx.beginPath();if((ctx as any).roundRect)(ctx as any).roundRect(dX,dY,dW,dH,6);else ctx.rect(dX,dY,dW,dH);
    ctx.fill();ctx.stroke();ctx.save();ctx.globalAlpha=0.92;ctx.drawImage(dmdCanvas,dX+4,dY+4,dW-8,dH-8);ctx.restore();
  }
}

// ─── File Input ────────────────────────────────────────────────────────────────
const fileInput = document.getElementById('file-input') as HTMLInputElement;
const dropZone  = document.getElementById('drop-zone') as HTMLElement;

const handleFile = async (f: File) => {
  if (f.name.endsWith('.fpl')) {
    // Handle FPL library file
    await parseFPLFile(
      f,
      (lib: any) => {
        setLoadedLibrary(lib);
        window.showLibrarySelector(lib);
        logMsg(`📚 Library loaded: ${lib.name} (${Object.keys(lib.tableTemplates).length} tables)`);
      },
      (err) => logMsg(`❌ FPL Error: ${err}`, 'error')
    );
  } else if (f.name.endsWith('.fpt')) {
    // Handle FPT table file (apply loaded library if available)
    resetGameState();
    parseFPTFile(f,
      cfg => loadTableWithPhysicsWorker(cfg, scene, loadedLibrary),
      () => window.closeLoader(),
      (t: string) => window.switchTab(t)
    );
  }
};

// ─── Table Directory Browser ────────────────────────────────────────────────────
async function browseTableDirectory(): Promise<void> {
  const dirPathInput = document.getElementById('table-dir-path') as HTMLInputElement;
  const tableInput = document.getElementById('table-dir-input') as HTMLInputElement;

  logMsg('📂 Verzeichnis wird ausgewählt...', 'info');

  if ('showDirectoryPicker' in window) {
    // Modern API: showDirectoryPicker (Chrome/Edge)
    try {
      const dirHandle = await window.showDirectoryPicker!();
      dirPathInput.value = dirHandle.name || 'Tabellenverzeichnis';

      // Pfad speichern
      DirectoryPathManager.saveTablePath(dirHandle.name || 'Tabellenverzeichnis');
      updateTablePathShortcuts();

      const files: File[] = [];
      for await (const [name, handle] of dirHandle.entries()) {
        if (name.endsWith('.fpt') || name.endsWith('.fp')) {
          try {
            const file = await (handle as any).getFile();
            files.push(file);
          } catch (e) {
            console.warn(`⚠ Fehler beim Lesen der Datei ${name}:`, e);
          }
        }
      }

      logMsg(`✅ ${files.length} Tabellen-Dateien gefunden`, 'ok');
      renderTableFileGrid(files);
    } catch (e: any) {
      if (e.name === 'AbortError') {
        logMsg('❌ Verzeichnis-Auswahl abgebrochen', 'warn');
      } else {
        logMsg(`❌ Fehler beim Verzeichnis-Picker: ${e.message}`, 'error');
      }
      return;
    }
  } else if (tableInput) {
    // Fallback: use webkitdirectory (Firefox/Safari)
    tableInput.onchange = (e) => {
      const input = e.target as HTMLInputElement;
      if (input.files && input.files.length > 0) {
        const files: File[] = [];
        Array.from(input.files).forEach(f => {
          if (f.name.endsWith('.fpt') || f.name.endsWith('.fp')) {
            files.push(f);
          }
        });

        dirPathInput.value = 'Tabellenverzeichnis';
        DirectoryPathManager.saveTablePath('Tabellenverzeichnis');
        updateTablePathShortcuts();

        logMsg(`✅ ${files.length} Tabellen-Dateien gefunden`, 'ok');
        renderTableFileGrid(files);
      } else {
        logMsg('❌ Keine Dateien ausgewählt', 'warn');
      }
    };
    tableInput.click();
    return;
  } else {
    logMsg('❌ Verzeichnis-Auswahl wird in diesem Browser nicht unterstützt', 'error');
  }
}

function renderTableFileGrid(files: File[]): void {
  const grid = document.getElementById('table-file-grid')!;
  grid.innerHTML = '';
  if (files.length === 0) {
    grid.innerHTML = '<p style="color:#667; font-size:12px; text-align:center;">Keine .fpt Dateien gefunden.</p>';
    return;
  }

  files.sort((a, b) => a.name.localeCompare(b.name));
  for (const f of files) {
    const card = document.createElement('div');
    card.className = 'table-card';
    const sizeMB = (f.size / 1024 / 1024).toFixed(2);
    const displayName = escapeHtml(f.name.replace(/\.fpt$/i, ''));
    // eslint-disable-next-line no-unsanitized/property -- displayName is escapeHtml'd; sizeMB is numeric
    card.innerHTML = `<div class="preview">🎱</div><h3>${displayName}</h3><span>${sizeMB} MB</span>`;
    card.style.cursor = 'pointer';
    card.onclick = () => {
      resetGameState();
      parseFPTFile(f,
        cfg => loadTableWithPhysicsWorker(cfg, scene, loadedLibrary),
        () => window.closeLoader(),
        (t: string) => window.switchTab(t)
      );
    };
    grid.appendChild(card);
  }
}

// ─── Phase B0: FPT Browser Init ───────────────────────────────────────────────

// Phase B0: FPT auto-scan + browser. Only runs when running under Electron
// (electronAPI present); in plain browsers the section stays empty and the
// user falls back to the existing drag-drop / file-picker UI.
async function initializeFPTBrowser(): Promise<void> {
  const api = window.electronAPI;
  if (!api?.scanFPTDirectory) {
    // No Electron — hide the FPT section entirely
    const section = document.getElementById('qm-fpt-section');
    if (section) section.style.display = 'none';
    return;
  }

  const { scanFPTDirectory } = await import('./fpt-render/fpt-table-scanner');
  const { filterEntries, sortEntries, renderTableList } = await import('./fpt-render/fpt-table-browser');
  type SortKey = 'name' | 'size' | 'mtime';
  const { getFPTPath, setFPTPath } = await import('./fpt-render/fpt-path-config');

  const listEl = document.getElementById('qm-fpt-list')!;
  const searchEl = document.getElementById('qm-fpt-search') as HTMLInputElement;
  const sortEl = document.getElementById('qm-fpt-sort') as HTMLSelectElement;
  const pathBtn = document.getElementById('qm-fpt-set-path') as HTMLButtonElement;

  let allEntries: import('./fpt-render/fpt-table-scanner').FPTFileEntry[] = [];

  const refreshList = () => {
    const filtered = filterEntries(allEntries, searchEl.value);
    const sorted = sortEntries(filtered, sortEl.value as SortKey);
    renderTableList(listEl, sorted, (entry) => {
      void loadFPTFromPath(entry.path).catch((e) => {
        console.error('[fpt-browser] load failed:', e);
        showNotification(`Failed to load ${entry.name}: ${e.message}`);
      });
    });
  };

  const scan = async (path: string | null) => {
    if (!path) { allEntries = []; refreshList(); return; }
    allEntries = await scanFPTDirectory(path);
    console.log(`[fpt-browser] scanned ${allEntries.length} files in ${path}`);
    refreshList();
  };

  // Initial scan from saved path
  await scan(getFPTPath());

  // Wire controls
  searchEl.addEventListener('input', refreshList);
  sortEl.addEventListener('change', refreshList);
  pathBtn.addEventListener('click', async () => {
    const picked = await api.pickFPTDirectory?.();
    if (picked) {
      setFPTPath(picked);
      await scan(picked);
    }
  });
}

async function loadFPTFromPath(filePath: string): Promise<void> {
  const api = window.electronAPI;
  if (!api?.readFPTFile) throw new Error('not running in Electron');
  const buf: ArrayBuffer = await api.readFPTFile(filePath);
  const filename = filePath.split(/[\\/]/).pop() ?? 'table.fpt';
  // parseFPTFile expects a File. Wrap the ArrayBuffer in one — the parser
  // only uses .name, .size, and .arrayBuffer(), all of which a File provides.
  const file = new File([buf], filename, { type: 'application/octet-stream' });
  // Use the static import (parseFPTFile is already imported at the top of
  // this file; redundant dynamic import was removed).
  await parseFPTFile(file);
  showNotification(`Loaded ${filename} — rendering polish in upcoming phases`);
}

// ─── Library Directory Browser ──────────────────────────────────────────────────
async function browseLibraryDirectory(): Promise<void> {
  const dirPathInput = document.getElementById('lib-dir-path') as HTMLInputElement;
  const libInput = document.getElementById('lib-dir-input') as HTMLInputElement;

  logMsg('📚 Bibliotheksverzeichnis wird ausgewählt...', 'info');

  if ('showDirectoryPicker' in window) {
    // Modern API: showDirectoryPicker (Chrome/Edge)
    try {
      const dirHandle = await window.showDirectoryPicker!();
      dirPathInput.value = dirHandle.name || 'Bibliotheksverzeichnis';

      // Pfad speichern
      DirectoryPathManager.saveLibraryPath(dirHandle.name || 'Bibliotheksverzeichnis');
      updateLibraryPathShortcuts();

      const files: File[] = [];
      for await (const [name, handle] of dirHandle.entries()) {
        if (name.endsWith('.fpl')) {
          try {
            const file = await (handle as any).getFile();
            files.push(file);
          } catch (e) {
            console.warn(`⚠ Fehler beim Lesen der Datei ${name}:`, e);
          }
        }
      }

      logMsg(`✅ ${files.length} Bibliotheks-Dateien gefunden`, 'ok');
      renderLibraryFileList(files);
    } catch (e: any) {
      if (e.name === 'AbortError') {
        logMsg('❌ Verzeichnis-Auswahl abgebrochen', 'warn');
      } else {
        logMsg(`❌ Fehler beim Verzeichnis-Picker: ${e.message}`, 'error');
      }
      return;
    }
  } else if (libInput) {
    // Fallback: use webkitdirectory (Firefox/Safari)
    libInput.onchange = (e) => {
      const input = e.target as HTMLInputElement;
      if (input.files && input.files.length > 0) {
        const files: File[] = [];
        Array.from(input.files).forEach(f => {
          if (f.name.endsWith('.fpl')) {
            files.push(f);
          }
        });

        dirPathInput.value = 'Bibliotheksverzeichnis';
        DirectoryPathManager.saveLibraryPath('Bibliotheksverzeichnis');
        updateLibraryPathShortcuts();

        logMsg(`✅ ${files.length} Bibliotheks-Dateien gefunden`, 'ok');
        renderLibraryFileList(files);
      } else {
        logMsg('❌ Keine Dateien ausgewählt', 'warn');
      }
    };
    libInput.click();
    return;
  } else {
    logMsg('❌ Verzeichnis-Auswahl wird in diesem Browser nicht unterstützt', 'error');
  }
}

function renderLibraryFileList(files: File[]): void {
  const list = document.getElementById('lib-file-list')!;
  list.innerHTML = '';

  if (files.length === 0) {
    list.innerHTML = '<p style="color:#667; font-size:12px;">Keine .fpl Dateien gefunden.</p>';
    return;
  }

  for (const f of files) {
    const btn = document.createElement('button');
    btn.className = 'tab-btn';
    btn.style.display = 'block';
    btn.style.marginBottom = '6px';
    btn.style.width = '100%';
    btn.style.textAlign = 'left';
    btn.textContent = `📚 ${f.name.replace(/\.fpl$/i, '')} (${(f.size / 1024).toFixed(0)} KB)`;
    btn.onclick = async () => {
      await parseFPLFile(f,
        (lib: any) => {
          setLoadedLibrary(lib);
          (document.getElementById('lib-status') as HTMLElement).textContent =
            `✅ ${lib.name} geladen (${Object.keys(lib.tableTemplates || {}).length} Tabellen)`;
          logMsg(`📚 Library: ${lib.name}`);
        },
        (err: string) => logMsg(`❌ FPL Error: ${err}`, 'error')
      );
    };
    list.appendChild(btn);
  }
}

// ─── Path Shortcuts Manager ────────────────────────────────────────────────────
/**
 * Aktualisiert die Quick-Access-Buttons für zuletzt geöffnete Tabellen-Verzeichnisse
 */
function updateTablePathShortcuts(): void {
  const container = document.getElementById('table-shortcuts-container');
  if (!container) return;

  const paths = DirectoryPathManager.getTablePaths();
  if (paths.length === 0) {
    container.innerHTML = '<p style="color:#999; font-size:11px;">Keine Verlauf</p>';
    return;
  }

  container.innerHTML = '<p style="color:#667; font-size:10px; margin-bottom:4px;">📋 Zuletzt geöffnet:</p>';
  paths.forEach((path, idx) => {
    const btn = document.createElement('button');
    btn.className = 'tab-btn';
    btn.style.fontSize = '11px';
    btn.style.padding = '4px 8px';
    btn.style.marginBottom = '3px';
    btn.style.width = '100%';
    btn.style.textAlign = 'left';
    btn.style.opacity = (1 - idx * 0.1).toString();
    // eslint-disable-next-line no-unsanitized/property -- path.name is escapeHtml'd inline
    btn.innerHTML = `🔄 ${escapeHtml(path.name)}`;
    btn.title = new Date(path.timestamp).toLocaleDateString();
    btn.onclick = () => browseTableDirectory();
    container.appendChild(btn);
  });

  // Clear-Button
  const clearBtn = document.createElement('button');
  clearBtn.style.fontSize = '10px';
  clearBtn.style.padding = '3px 6px';
  clearBtn.style.marginTop = '6px';
  clearBtn.style.color = '#999';
  clearBtn.style.cursor = 'pointer';
  clearBtn.textContent = '✕ Löschen';
  clearBtn.onclick = () => {
    DirectoryPathManager.clearAllPaths('table');
    updateTablePathShortcuts();
  };
  container.appendChild(clearBtn);
}

/**
 * Aktualisiert die Quick-Access-Buttons für zuletzt geöffnete Bibliotheks-Verzeichnisse
 */
function updateLibraryPathShortcuts(): void {
  const container = document.getElementById('library-shortcuts-container');
  if (!container) return;

  const paths = DirectoryPathManager.getLibraryPaths();
  if (paths.length === 0) {
    container.innerHTML = '<p style="color:#999; font-size:11px;">Keine Verlauf</p>';
    return;
  }

  container.innerHTML = '<p style="color:#667; font-size:10px; margin-bottom:4px;">📋 Zuletzt geöffnet:</p>';
  paths.forEach((path, idx) => {
    const btn = document.createElement('button');
    btn.className = 'tab-btn';
    btn.style.fontSize = '11px';
    btn.style.padding = '4px 8px';
    btn.style.marginBottom = '3px';
    btn.style.width = '100%';
    btn.style.textAlign = 'left';
    btn.style.opacity = (1 - idx * 0.1).toString();
    // eslint-disable-next-line no-unsanitized/property -- path.name is escapeHtml'd inline
    btn.innerHTML = `🔄 ${escapeHtml(path.name)}`;
    btn.title = new Date(path.timestamp).toLocaleDateString();
    btn.onclick = () => browseLibraryDirectory();
    container.appendChild(btn);
  });

  // Clear-Button
  const clearBtn = document.createElement('button');
  clearBtn.style.fontSize = '10px';
  clearBtn.style.padding = '3px 6px';
  clearBtn.style.marginTop = '6px';
  clearBtn.style.color = '#999';
  clearBtn.style.cursor = 'pointer';
  clearBtn.textContent = '✕ Löschen';
  clearBtn.onclick = () => {
    DirectoryPathManager.clearAllPaths('library');
    updateLibraryPathShortcuts();
  };
  container.appendChild(clearBtn);
}

fileInput.addEventListener('change', e => { const f=(e.target as HTMLInputElement).files?.[0]; if(f) handleFile(f); });
dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('drag-over'); });
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
dropZone.addEventListener('drop', e => { e.preventDefault(); dropZone.classList.remove('drag-over'); const f=e.dataTransfer?.files[0]; if(f) handleFile(f); });

// ─── Directory Browser Button Event Listeners ──────────────────────────────────
const btnBrowseTables = document.getElementById('btn-browse-tables');
if (btnBrowseTables) btnBrowseTables.addEventListener('click', () => browseTableDirectory());

const btnBrowseLibrary = document.getElementById('btn-browse-library');
if (btnBrowseLibrary) btnBrowseLibrary.addEventListener('click', () => browseLibraryDirectory());

// ─── DMD Init-Label ───────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded',()=>{
  const btn=document.getElementById('dmd-mode-btn');
  if(btn) btn.textContent=dmdSolidMode?'SOLID':'DOT';

  // Initialize path shortcuts
  updateTablePathShortcuts();
  updateLibraryPathShortcuts();

  // Show table selector if no table is loaded
  if (!currentTableConfig) {
    showTableSelector((tableKey: string) => {
      // Call existing loadDemoTable function
      window.loadDemoTable(tableKey);
    });

    // Apply startup screen configuration from URL parameter (if present)
    setTimeout(() => window.applyStartupScreenConfig?.(), 100);
  }

  void initializeFPTBrowser();
});

// ─── Phase 15: Cleanup Physics Worker on Exit ──────────────────────────────────
window.addEventListener('beforeunload', () => {
  disposePhysicsWorker();
});

// ─── Integrated Editor: Open Editor Function ─────────────────────────────────
const openIntegratedEditor = () => {
  if (currentTableConfig) {
    getIntegratedEditor().open(currentTableConfig);
  } else {
    showNotification('Load a table first!');
  }
};
// see window-api.ts — openIntegratedEditor

// ─── Integrated Editor: Apply Changes Event ──────────────────────────────────
window.addEventListener('editor:apply-changes', (event: any) => {
  const newConfig = event.detail;
  if (!newConfig || !scene || !physics) return;

  // Update current table config
  const prevConfig = currentTableConfig;
  if (currentTableConfig) {
    currentTableConfig.name = newConfig.name;
    currentTableConfig.tableColor = newConfig.tableColor;
    currentTableConfig.accentColor = newConfig.accentColor;
    currentTableConfig.bumpers = newConfig.bumpers || [];
    currentTableConfig.targets = newConfig.targets || [];
    currentTableConfig.ramps = newConfig.ramps || [];
  }

  // Rebuild the table in the scene
  scene.children = scene.children.filter((child: THREE.Object3D) => {
    if (child.userData && child.userData.isTableElement) {
      return false;  // Remove old table elements
    }
    return true;
  });

  // Build new table
  if (currentTableConfig) {
    buildTable(currentTableConfig, scene, loadedLibrary, playgroundGroup);
    // ─── Phase 16+: Apply enhanced visuals after table construction ─────────────────
    applyEnhancedVisualsToTable(scene);
    showNotification('✅ Table updated!');
  }
});

// ─── Start ────────────────────────────────────────────────────────────────────
if (import.meta.env.DEV) { console.log('[INIT] FPW_ROLE:', FPW_ROLE, '- Starting main initialization'); }
if (FPW_ROLE === 'dmd') {
  if (import.meta.env.DEV) { console.log('[INIT] DMD role detected'); }
  renderer.domElement.remove();
  setupDMDWindow();
} else if (FPW_ROLE === 'backglass') {
  if (import.meta.env.DEV) { console.log('[INIT] Backglass role detected'); }
  renderer.domElement.remove();
  setupBackglassWindow();
} else {
  if (import.meta.env.DEV) { console.log('[INIT] Main window role - starting async IIFE'); }
  setDevFlag('INIT_ASYNC_IIFE_STARTED', true);
  (async () => {
    setDevFlag('INIT_IN_ASYNC_IIFE', true);
    try {
      setDevFlag('INIT_PHYSICS_START', true);
      await initPhysics();
      setDevFlag('INIT_PHYSICS_OK', true);
    } catch(e) {
      if (import.meta.env.DEV) {
        setDevFlag('INIT_PHYSICS_ERROR', (e as Error).message);
        console.warn('Rapier init fehlgeschlagen:', e);
      }
    }

    // Skip initial table load during startup - let user select from loader
    if (import.meta.env.DEV) {
      console.log('[INIT] Skipping initial table load - showing loader');
      setDevFlag('INIT_TABLE_LOAD_OK', true);
    }

    // Initialize B.A.M. Engine (after table is loaded and currentTableConfig is set)
    if (import.meta.env.DEV) {
      setDevFlag('INIT_BAM_ENGINE_START', true);
      console.log('🔄 About to initialize B.A.M. Engine...');
    }
    const bam = new BAMEngine(currentTableConfig?.name || 'classic', mainSpot);
    setBAMEngine(bam);
    if (import.meta.env.DEV) {
      console.log('✅ B.A.M. Engine initialized');
      setDevFlag('INIT_BAM_ENGINE_OK', true);
    }

    // Phase 13 Task 2: Initialize BAM Bridge (connects VBScript to BAMEngine)
    setDevFlag('INIT_BAM_BRIDGE_START', true);
    const bamBridge = initializeBamBridge(bam);
    if (import.meta.env.DEV) {
      console.log('✅ B.A.M. Bridge initialized');
      setDevFlag('INIT_BAM_BRIDGE_OK', true);
    }

    // Phase 13: Load animations from FPT resources into BAM engine
    setDevFlag('INIT_ANIM_LOAD_START', true);
    if (fptResources.animations && fptResources.animations.size > 0) {
      const bamSequencer = bam.getAnimationSequencer();
      let loadedCount = 0;
      for (const [name, sequence] of fptResources.animations) {
        try {
          // Use sequence name as ID (fallback to index)
          const seqId = loadedCount + 1;
          bamSequencer.loadSequence(seqId, JSON.stringify(sequence));
          loadedCount++;
          console.log(`📽️ Animation loaded: "${name}" (ID: ${seqId})`);
        } catch (e: any) {
          console.warn(`⚠️ Failed to load animation "${name}": ${e.message}`);
        }
      }
      if (loadedCount > 0) {
        console.log(`✅ ${loadedCount} animation(s) loaded into BAM engine`);
      }
    }
    setDevFlag('INIT_ANIM_LOAD_OK', true);

    // Phase 13 Task 3: Initialize animation binding system
    if (import.meta.env.DEV) {
      setDevFlag('INIT_ANIM_BINDING_START', true);
      console.log('🔄 About to initialize animation binding...');
    }
    const animationBindingMgr = initializeAnimationBinding();
    const animationScheduler = initializeAnimationScheduler();
    if (import.meta.env.DEV) {
      console.log('✅ Animation binding system initialized');
      setDevFlag('INIT_ANIM_BINDING_OK', true);
    }

    // Phase 13 Task 5: Initialize animation debugger (Ctrl+D to toggle)
    setDevFlag('INIT_ANIM_DEBUGGER_START', true);
    const animationDebugger = initializeAnimationDebugger();
    if (bamEngine) {
      animationDebugger.setBamEngine(bamEngine);
    }
    if (import.meta.env.DEV) {
      console.log('✅ Animation debugger initialized (Ctrl+D to toggle)');
      setDevFlag('INIT_ANIM_DEBUGGER_OK', true);
    }

    // ─── Phase 5: Apply initial quality preset ───
    setDevFlag('INIT_BEFORE_QUALITY_PRESET', true);
    try {
      applyQualityPreset();
      if (import.meta.env.DEV) {
        console.log('✅ Quality preset applied successfully');
        setDevFlag('INIT_QUALITY_PRESET_OK', true);
      }
    } catch (err) {
      console.error('❌ Error in applyQualityPreset:', err);
      setDevFlag('INIT_QUALITY_PRESET_ERROR', (err as Error).message);
    }

    setDevFlag('INIT_BEFORE_ANIMATE_CALL', true);
    try {
      if (import.meta.env.DEV) { console.log('🎬 Starting animate loop...'); }
      animate();
      if (import.meta.env.DEV) {
        setDevFlag('INIT_ANIMATE_CALLED', true);
        console.log('✅ Animate loop started');
      }
    } catch (err) {
      console.error('❌ Error starting animate:', err);
      setDevFlag('INIT_ANIMATE_ERROR', (err as Error).message);
    }
    initInlineBackglass();
    document.getElementById('multiscreen-btn')?.classList.add('active-multi');

    // ─── Auto-apply multi-screen layout on startup (Electron only) ───────────
    // On a cabinet with 2 or 3 physical displays we want the matching layout
    // to come up immediately, without the user having to open the modal and
    // pick "3 SCREENS" every cold start. Behavior is opt-out via localStorage
    // ("fpw_ms_autostart" = "off") so a dev laptop in 1-screen mode can disable it.
    // We delay slightly so the renderer is fully up before opening child windows.
    try {
      const autostart = localStorage.getItem('fpw_ms_autostart');
      const electronAvailable = !!window.electronAPI?.getAllDisplays;
      const startupConfig = window._startupScreenConfig; // URL ?screen=... override
      if (electronAvailable && autostart !== 'off' && startupConfig === undefined) {
        setTimeout(async () => {
          try {
            const screens = await getAllScreensForLayout();
            const n = screens.length;
            const target = n >= 3 ? 3 : n === 2 ? 2 : 1;
            console.log(`🚀 Auto-multiscreen on startup: ${n} displays detected → applying ${target}-screen layout (disable via localStorage.setItem('fpw_ms_autostart','off'))`);
            window.selectMsLayout?.(target);
            if (target > 1) {
              await window.applyMsLayout?.();
            }
          } catch (e) {
            console.warn('[multiscreen] startup auto-detect failed:', e);
          }
        }, 800);
      }
    } catch { /* localStorage may throw in restricted contexts */ }
  })();
}

// ─── PWA: Service Worker + Install Prompt ─────────────────────────────────────
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {/* ignore in dev */});
  });
}

let _installPrompt: BeforeInstallPromptEvent | null = null;
const _installBtn = document.getElementById('install-btn') as HTMLButtonElement | null;

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  _installPrompt = e as BeforeInstallPromptEvent;
  _installBtn?.classList.add('visible');
});

window.addEventListener('appinstalled', () => {
  _installBtn?.classList.remove('visible');
  _installPrompt = null;
});

function installPWA() {
  if (!_installPrompt) return;
  _installPrompt.prompt();
  _installPrompt.userChoice.then(() => { _installPrompt = null; });
}
// see window-api.ts — installPWA

// ─── Phase 5: Quality System Exports ──────────────────────────────────────────
const setQualityPreset = (name: string) => {
  profiler.setQualityPreset(name);
  applyQualityPreset();
  console.log(`✅ Quality preset changed to: ${name}`);
};

const getQualityPreset = () => profiler.getQualityPreset();
const getAvailableQualityPresets = () => Object.keys(QUALITY_PRESETS);
const toggleAutoQuality = () => {
  const current = profiler.isAutoAdjusting();
  profiler.setAutoAdjust(!current);
  console.log(`🎯 Auto-quality adjustment: ${!current ? 'ON' : 'OFF'}`);
};

const getPerformanceMetrics = () => profiler.getMetrics();
const togglePerformanceMonitor = () => {
  showProfiler = !showProfiler;
  localStorage.setItem('fpw_show_profiler', showProfiler.toString());
  console.log(`📊 Performance monitor: ${showProfiler ? 'ON' : 'OFF'}`);
};

// ─── Phase 14: Graphics Pipeline System Exports ──────────────────────────────────
const getGeometryPool = () => getGraphicsPipeline()?.getGeometryPool?.();
const getMaterialFactory = () => getGraphicsPipeline()?.getMaterialFactory?.();
const getLightManager = () => getGraphicsPipeline()?.getLightManager?.();

// ─── Phase 4: Resource Manager System Exports ───────────────────────────────────
const getResourceStats = () => {
  const mgr = getResourceManager();
  return mgr.getStats();
};
const logResourceStats = () => {
  const mgr = getResourceManager();
  mgr.logStats();
};
const resetResourceManagerWrap = () => {
  resetResourceManager();
  resourceManager = initializeResourceManager();
  logMsg(`💾 ResourceManager reset with fresh budget`, 'ok');
};

// ─── Phase 5: Library Cache System Exports ──────────────────────────────────────
const getLibraryCacheStats = () => {
  const cache = getLibraryCache();
  return cache.getStats();
};
const logLibraryCacheStats = () => {
  const cache = getLibraryCache();
  cache.logStats();
};
const cleanupLibraryCache = () => {
  const cache = getLibraryCache();
  const removed = cache.cleanup();
  logMsg(`🧹 Manual cache cleanup: removed ${removed} expired entries`, 'ok');
};
const resetLibraryCacheWrap = () => {
  resetLibraryCache();
  libraryCache = initializeLibraryCache();
  logMsg(`📚 LibraryCache reset with fresh TTL`, 'ok');
};

// ─── Phase 6: Audio Source Pool System Exports ───────────────────────────────
const getAudioSourcePoolStats = () => {
  const pool = getAudioSourcePool();
  return pool.getStats();
};
const logAudioSourcePoolStats = () => {
  const pool = getAudioSourcePool();
  pool.logStats();
};

// ─── Integration Testing Framework ──────────────────────────────────────────
const runIntegrationTests = () => integrationTesting.runTests();
const benchmark = integrationTesting.benchmark;
const memoryProfiler = integrationTesting.memory;

// ─── Performance Report Generator ───────────────────────────────────────────
const wrapGeneratePerformanceReport = async () => {
  const report = await generatePerformanceReport();
  const generator = getPerformanceReportGenerator();
  generator.printReport(report);
  return report;
};
const comparePerformanceReports = (report1: any, report2: any) => {
  const generator = getPerformanceReportGenerator();
  return generator.compareReports(report1, report2);
};

// ─── Register all public API on window ─────────────────────────────────────────
setupWindowAPI(window, {
  showNotification,
  showLibrarySelector,
  switchTab,
  loadDemoTable,
  closeLoader,
  toggleViewPanel,
  applyViewSettings,
  resetViewSettings,
  toggleFullscreen,
  toggleDMDMode,
  toggleHideDMD,
  browseTableDirectory: browseTableDirectoryFS,
  browseLibraryDirectory: browseLibraryDirectoryFS,
  loadSelectedTable,
  selectMsLayout,
  openMultiscreenModal,
  closeMultiscreenModal,
  applyMsLayout,
  resetScreenRoles,
  swapScreenRoles,
  autoDetectScreens,
  applyStartupScreenConfig,
  changeCabinetProfile,
  rotatePlayfield,
  getCabinetProfiles,
  getCurrentCabinetProfile,
  applyRotationProfile,
  rotatePlayfieldAnimated,
  getCurrentPlayfieldRotation,
  openIntegratedEditor,
  installPWA,
  setQualityPreset,
  getQualityPreset,
  getAvailableQualityPresets,
  toggleAutoQuality,
  getPerformanceMetrics,
  togglePerformanceMonitor,
  getGraphicsPipeline,
  getGeometryPool,
  getMaterialFactory,
  getLightManager,
  getResourceManager,
  getResourceStats,
  logResourceStats,
  resetResourceManager: resetResourceManagerWrap,
  getLibraryCache,
  getLibraryCacheStats,
  logLibraryCacheStats,
  cleanupLibraryCache,
  resetLibraryCache: resetLibraryCacheWrap,
  getAudioSourcePool,
  getAudioSourcePoolStats,
  logAudioSourcePoolStats,
  runIntegrationTests,
  benchmark,
  memoryProfiler,
  generatePerformanceReport: wrapGeneratePerformanceReport,
  getPerformanceReportGenerator,
  comparePerformanceReports,
  addToFavorites,
  getAdvancedFavoritesCount,
  getRecentTables,
  createBatchLoadJob,
  getBatchJobStatus,
  setupTableDragDrop,
  sortTableFiles,
  runFullTestSuite,
});

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

// ─── Guaranteed Event Handler Initialization ───
// The deferred init via requestAnimationFrame can fail silently if any prior
// step crashes. Module scripts have implicit `defer`, so DOM is ready here.
// initializeEventHandlers is idempotent, so calling it twice is safe.
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => initializeEventHandlers());
} else {
  initializeEventHandlers();
}

