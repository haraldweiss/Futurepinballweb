// SPDX-License-Identifier: AGPL-3.0-or-later

// ─── Nuke any stale service worker from a previous session ───
// Must run before any other code because an old SW (cached from a prior
// visit) blocks Vite's HMR /@vite/client and /main.ts with TLS errors.
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(regs =>
    regs.forEach(r => r.unregister())
  );
}
// © 2026 Harald Weiss
/**
 * main.ts — Einstiegspunkt: Scene, Physik, Game-Loop, Input, UI, Multiscreen
 */
import * as THREE from 'three';
import { devLog } from './utils/dev-log';
import { saveRotation, loadSavedRotation } from './app/rotation-utils';
import { calculateFlipperPowerCurve } from './app/flipper-utils';
import { getOptimizedTableView } from './app/view-utils';
import { ParticleField } from './app/particle-field';
import { createViewSettings } from './app/view-settings';
import { initMultiscreen } from './app/multiscreen';
import { AssetCatalog } from './assets/asset-catalog';
import { globalAssetCatalog, setGlobalAssetCatalog } from './game';
import { initFileBrowser } from './app/file-browser-controller';
import { createDmdVisibility } from './app/dmd-visibility';
import { createInlineBackglass } from './app/inline-backglass';
import { applyEnhancedVisualsToTable } from './app/enhanced-visuals';
import { drawBGCanvas } from './app/backglass-canvas';
import { updateTablePathShortcuts, updateLibraryPathShortcuts } from './app/path-shortcuts';
import { initializeFPTBrowser, loadFPTFromPath } from './app/fpt-browser';
import { initializeBAMEngine } from './app/bam-init';
import { initTouchControls } from './app/touch-controls';
import { setupDMDWindow, setupBackglassWindow } from './app/secondary-windows';
import { initFileBrowserUI } from './app/file-browser-ui';
import { createLibrarySelector } from './app/library-selector';
import { handlePhysicsFrame, triggerVideoEvent, onMultiballStartVideo, onTiltVideo } from './app/physics-frame-handler';
import { applyPhysicsGravityForRotation } from './app/game-helpers';
import { resetBall, resetGameState } from './app/game-state';
import { initPWAInstall, installPWA } from './app/pwa-install';

import {
  state, keys, fptResources, physics, currentTableConfig, plungerKnob, loadedLibrary, bamEngine,
  bumpers, extraBalls,
  setPhysics, setLoadedLibrary, setBAMEngine, cb,
} from './game';
import {
  getAudioCtx, playSound, startBGMusic, initializeAudioPooling,
  getAudioSourcePool,
  initializeAudioSystem, getAudioSystem,
  getSoundManager,
  getMusicManager,
} from './audio-system';
import { BAMEngine } from './bam-engine';
import { initializeBamBridge, getBamBridge } from './bam-bridge';
import {
  dmdState, dmdUpdate, dmdEvent, dmdRenderAttract, dmdRenderPlaying,
  dmdRenderEvent, dmdRenderGameOver, dmdCanvas, DMD_W, DMD_H,
  toggleDMDMode, dmdSolidMode, initDMDResizing,
} from './dmd';
import { getTopScores, recordScore } from './highscore';
import { TABLE_CONFIGS, buildTable, buildRealisticFlipper, scoreBumperHit, scoreTargetHit, scoreSlingshotHit, checkRolloverLanes, updateSpinnerPhysics, getAdvancedLighting } from './table';
import { callScriptFlipper, callScriptDrain } from './script-engine';
import { parseFPTFile, parseFPLFile, getBackglassArtwork } from './fpt-parser';
import { getBackglassRenderer } from './backglass';
import { getProfiler, QUALITY_PRESETS } from './profiler';
import { initializeGPUDiagnostics } from './gpu-diagnostics';
import { ScoreDisplayManager } from './score-display';
import { VisualPolishSystem } from './visual-polish';
import { getIntegratedEditor } from './integrated-editor';
import { showTableSelector } from './table-selector';
import {
  CabinetSystem, initializeCabinetSystem, getActiveCabinetProfile,
  setActiveCabinetProfile, rotatePlayfieldTo,
} from './cabinet-system';
import {
  initializeRotationEngine, getRotationEngine,
  applyProfileRotation, rotatePlayfieldSmooth,
} from './rotation-engine';
import {
  initializeUIRotation,
  applyUIRotation,
} from './ui-rotation';
import {
  getPlayfieldCanvasSize, getBackglassSize,
} from './responsive-display';
import {
  initializeScreenRoleManager, getScreenRoleManager,
} from './screen-role-manager';
import {
  initializeScreenResolutionManager,
} from './screen-resolution-manager';
import {
  initializeInputMapping,
  applyInputMapping,
} from './input-mapping';
import {
  initializeAnimationBinding, getAnimationBindingManager,
} from './mechanics/animation-binding';
import {
  initializeCoinSystem, showCoinScreen, addCoin, startGame,
  isCoinScreenVisible, isGameStarted, getPlayerCount, resetCoinSystem,
} from './coin-system';
import {
  initializeKeyBindings, checkKeyBinding,
} from './keybindings';
import {
  initializeAnimationScheduler, getAnimationScheduler,
} from './mechanics/animation-scheduler';
import {
  initializeAnimationDebugger,
} from './animation/animation-debugger';
import {
  initializePhysicsWorker, getPhysicsWorker, disposePhysicsWorker,
  type PhysicsFrameData,
} from './physics-worker-bridge';
import { getGraphicsPipeline } from './graphics/graphics-pipeline';
import { getPlayfieldVisualEnhancement } from './graphics/playfield-visual-enhancement';
import { getVideoManager } from './video-manager';
import { getVideoBindingManager } from './mechanics/video-binding';
import {
  FileInfo, formatFileSize,
  getFileSystemBrowser,
  getFileBrowserUIManager,
  getAdvancedFileBrowserManager,
  type BatchJob,
} from './file-browser';
import {
  initializeResourceManager, getResourceManager, resetResourceManager,
} from './resource-manager';
import {
  initializeLibraryCache, getLibraryCache, resetLibraryCache,
} from './library-cache';
import { integrationTesting } from './integration-testing';
import { getPerformanceReportGenerator, generatePerformanceReport } from './performance-report-generator';
import { getTestSuite } from './test-suite';
import { DirectoryPathManager } from './directory-path-manager';
import { escapeHtml } from './utils/html-escape';
import { loadFpwConfig } from './utils/fpw-config';
import { initializeEventHandlers } from './event-handlers-init';
import { setupWindowAPI, setDevFlag, toggleModelViewer } from './window-api';
import { getDefaultPhysicsConfig, logPhysicsConfig, validatePhysicsConfig } from './physics-config-enhancer';
import { getInputOptimizer } from './input-optimizer';
import { getPerformanceDashboard } from './performance-dashboard';
import { initScoreAnimationManager, getScoreAnimationManager } from './score-animation-manager';
import { initTouchControlsManager } from './touch-controls-manager';
import { initBallTrailManager, getBallTrailManager } from './ball-trail-manager';
import {
  calculateResponsiveZoom, getResponsiveCameraTilt, getResponsiveFOV,
  getResponsiveFlipperX, getOptimalPixelRatio, calcSafeFlipperLength,
  detectDeviceType,
} from './app/responsive-helpers';
import { setupScene } from './app/scene-setup';
import { appendLogEntry } from './app/log-utils';
import { getAllScreensForLayout, type ScreenLike } from './app/screen-utils';
import { showNotification } from './app/notification';
import { showLoadingOverlay, hideLoadingOverlay, updateLoadingProgress } from './app/loader-ui';
import { switchTab, closeLoader, toggleFullscreen, toggleViewPanel } from './app/ui-utils';
import { setupPostProcessing } from './app/post-processing';
import { initSyncTransport, emitSyncFrame, onSyncFrame } from './app/sync-transport';

// ─── Phase 14: Export graphics pipeline for use in other modules ───
export { getGraphicsPipeline };

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


// applyPhysicsGravityForRotation — moved to src/app/game-helpers.ts

// DEV debug helpers (testGravity, forceScore, dumpState) — moved to src/app/game-helpers.ts

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
  clearTimeout(window.resizeTimer);
  window.resizeTimer = setTimeout(() => {
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


// ─── Role Detection ───────────────────────────────────────────────────────────
window.FPW_MODULE_LOADED = true;  // Flag to confirm main.ts loaded
const FPW_ROLE = new URLSearchParams(location.search).get('role');
const FPW_SCREEN_INDEX = new URLSearchParams(location.search).get('screen');

// Store role info globally
window.FPW_ROLE = FPW_ROLE || 'playfield';
window.FPW_SCREEN_INDEX = FPW_SCREEN_INDEX || '0';

if (FPW_ROLE) document.body.classList.add(`role-${  FPW_ROLE}`);
window.FPW_DEVICE = detectDeviceType();

if (import.meta.env.DEV) console.log(`🎮 FPW Window Started - Role: ${window.FPW_ROLE}, Screen: ${window.FPW_SCREEN_INDEX}, Size: ${window.innerWidth}x${window.innerHeight}`);

// ─── Screen Configuration from URL ────────────────────────────────────────────
// Support for startup scripts: ?screens=1|2|3|auto
const screenParam = new URLSearchParams(location.search).get('screens');
if (screenParam && ['1', '2', '3', 'auto'].includes(screenParam)) {
  const screenVal = screenParam === 'auto' ? 'auto' : parseInt(screenParam, 10);
  window._startupScreenConfig = screenVal;
}

// ─── Sync Transport (unified, frame-paced) ───────────────────────────────────
initSyncTransport();

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

// ─── Phase 2: Advanced Lighting System ─────────────────────────────────────────
let advancedLightingSystem: ReturnType<typeof getAdvancedLighting> | null = null;

// ─── Phase 4: Backglass Renderer ───────────────────────────────────────────────
let backglassRenderer: ReturnType<typeof getBackglassRenderer> | null = null;

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
    if (import.meta.env.DEV) console.log(`[fpw-config] Using saved quality preset: ${userPick}`);
    return;
  }
  const config = await loadFpwConfig();
  if (!config) return;  // Installer hasn't run, or file is malformed — keep default.
  if (import.meta.env.DEV) {
    console.log(
      `[fpw-config] Applying installer-detected quality preset: ${config.qualityPreset} ` +
      `(${config.system.osName}, ${config.system.totalMemoryGB}GB RAM, ` +
      `${config.display.primaryResolution.width}x${config.display.primaryResolution.height})`
    );
  }
  profiler.setQualityPreset(config.qualityPreset);
  // The animate() loop calls applyQualityPreset() on its next FPS tick, which
  // diff-checks against `lastAppliedQualityPreset` and reconfigures the
  // renderer / bloom / shadow / DMD systems automatically.
})();

// ─── THREE.js Scene ───────────────────────────────────────────────────────────
const { scene, camera, renderer, playgroundGroup } = setupScene();

// ─── Ball Trail Visualization ────────────────────────────────────────────────
initBallTrailManager(scene);

// ─── Score Animation Manager ─────────────────────────────────────────────────
initScoreAnimationManager(scene);

// ─── Phase 9: Score Display Manager ──────────────────────────────────────────
let scoreDisplayManager: ScoreDisplayManager | null = null;

// ─── Phase 9: Enhanced Audio System ──────────────────────────────────────────
initializeAudioSystem();

// ─── Phase 6: Audio Source Pool (GC pressure reduction) ──────────────────────
initializeAudioPooling();

// ─── GPU Diagnostics (Windows multi-GPU support) ───────────────────────────────
initializeGPUDiagnostics();

// ─── Coin System (Arcade Insert Coin) ────────────────────────────────────────
initializeCoinSystem();

// ─── Key Binding Manager (Configurable Controls) ────────────────────────────
initializeKeyBindings();

// ─── Phase 10+: Cabinet System (Rotation & Profiles) ──────────────────────────
const cabinetSystem = initializeCabinetSystem();
const activeCabinetProfile = cabinetSystem.autoDetectProfile();

// ─── Screen Role Manager (Multi-screen Assignment) ────────────────────────────
const screenRoleManager = initializeScreenRoleManager();
screenRoleManager.getLayout();

// ─── Screen Resolution Manager (Resolution Configuration) ─────────────────────
const screenResolutionManager = initializeScreenResolutionManager();
screenResolutionManager.getLayout();

// ─── Phase 4: Resource Manager (Memory Budget Management) ──────────────────────
initializeResourceManager();

// ─── Phase 5: Library Cache with TTL & Cleanup ───────────────────────────────────
initializeLibraryCache();

const aspectRatio = innerWidth / innerHeight;

// ─── Phase 2: Initialize Advanced Lighting System ───────────────────────────────
advancedLightingSystem = getAdvancedLighting(scene);
devLog('✓ Advanced lighting system initialized');

// ─── Phase 4: Initialize Backglass Renderer ────────────────────────────────────
// Create backglass with responsive dimensions
const backglassSize = getBackglassSize();
const backglassWidth = backglassSize.displayWidth;
const backglassHeight = backglassSize.displayHeight;
backglassRenderer = getBackglassRenderer(backglassWidth, backglassHeight);
devLog('✓ Backglass renderer initialized');

// ─── Phase 9: Initialize Score Display Manager ──────────────────────────────────
scoreDisplayManager = new ScoreDisplayManager(scene);
devLog('✓ Score display manager initialized');

// ─── Phase 9: Initialize Visual Polish System ──────────────────────────────────
let visualPolishSystem: VisualPolishSystem | null = null;

requestAnimationFrame(function initViewSettingsAndVisuals() {
  visualPolishSystem = new VisualPolishSystem(scene, camera);
  devLog('✓ Visual polish system initialized');
  initViewSettings();
  
  // ─── Phase 1 Security: Initialize Event Handlers (CSP-compliant) ───
  setTimeout(async () => {
    initializeEventHandlers();
    
    // ─── Phase 25: Initialize Sound Manager for audio feedback ───
    try {
      const soundMgr = await getSoundManager();
      devLog('[Sound Manager] ✓ Initialized');
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
        
        devLog('[Touch Controls] ✓ Initialized & bound to game');
        showNotification('📱 Touch controls enabled');
      } catch (e) {
        console.warn('[Touch Controls] Initialization failed:', e);
      }
    }
  }, 100);  // Brief delay to ensure all DOM elements are ready
});

// ─── Post-Processing + Graphics Pipeline + Lighting ─────────────────────────
const {
  composer, bloomPass, ssrPass, motionBlurPass,
  cascadedShadowMapper, perLightBloomPass,
  particleSystem, volumetricPass, filmEffectsPass, dofPass, smaaPass,
  mainSpot, ambLight, fillLight, rimLight,
} = setupPostProcessing(scene, camera, renderer, profiler);

// ─── Phase 10+: Initialize Rotation Engine ────────────────────────────────────
const rotationEngine = initializeRotationEngine(playgroundGroup, camera);
// Apply initial profile rotation
applyProfileRotation(activeCabinetProfile);

// Restore saved rotation preference
{
  const savedRot = loadSavedRotation();
  if (savedRot !== null && savedRot !== 0) {
    setTimeout(() => {
      devLog(`🎮 Restoring saved playfield rotation: ${savedRot}°`);
      void rotateAndRedraw(savedRot, 0);
    }, 1500);
  }
}

// ─── Phase 10+: Initialize UI Rotation Manager ─────────────────────────────────
const uiRotationManager = initializeUIRotation();
applyUIRotation(activeCabinetProfile);

// ─── Phase 10+: Initialize Input Mapping Manager ────────────────────────────────
initializeInputMapping();
applyInputMapping(activeCabinetProfile);

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
// Ball light shadow casting disabled — the light follows the ball and covers
// a tiny radius (6 units). Shadow-mapping a moving point light at 3.0 intensity
// costs GPU time for negligible visual benefit on such a small, fast object.
ballGroup.add(ballLight);

// ─── Partikel-System (Adaptive: Desktop=300, Tablet=200, Mobile=100) ───────────
const particleField = new ParticleField(scene, profiler, particleSystem);

// ─── Rapier2D Physik Init (lazy-loaded) ───────────────────────────────────────
let RAPIER: any = null;  // Global reference, loaded on demand

async function initPhysics(): Promise<void> {
  if (!RAPIER) RAPIER = await import('@dimforge/rapier3d').then(m => m.default);
  /*RAPIER3D auto-inits*/;
  const world      = new RAPIER.World({ x: 0.0, y: -9.8, z: 0.0 });
  const eventQueue = new RAPIER.EventQueue(true);

  const ballBody = world.createRigidBody(
    RAPIER.RigidBodyDesc.dynamic().setTranslation(2.55, -5.0, 0.0).setGravityScale(0.0).setLinearDamping(0.0).setAngularDamping(0.9).setCcdEnabled(true)
  );
  const ballCollider = world.createCollider(
    RAPIER.ColliderDesc.ball(0.22).setRestitution(0.5).setFriction(0.3), ballBody
  );

  const lFlipperBody = world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(-1.15, -4.6, 0.0).setCcdEnabled(true));
  const lFlipperCollider = world.createCollider(RAPIER.ColliderDesc.cuboid(1.05, 0.13, 0.15).setTranslation(1.05, 0.0, 0.0).setRestitution(0.5).setFriction(0.6), lFlipperBody);
  leftFlipperColliderHandle = lFlipperCollider.handle;  // Phase 5: Save handle

  const rFlipperBody = world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(1.15, -4.6, 0.0).setCcdEnabled(true));
  const rFlipperCollider = world.createCollider(RAPIER.ColliderDesc.cuboid(1.05, 0.13, 0.15).setTranslation(-1.05, 0.0, 0.0).setRestitution(0.5).setFriction(0.6), rFlipperBody);
  rightFlipperColliderHandle = rFlipperCollider.handle;  // Phase 5: Save handle

  const addFixedBox = (x:number,y:number,hw:number,hh:number,angle=0,restitution=0.75) => {
    const body = world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(x, y, 0.0).setRotation({ x: 0, y: 0, z: Math.sin(angle/2), w: Math.cos(angle/2) }));
    world.createCollider(RAPIER.ColliderDesc.cuboid(hw, hh, 0.15).setRestitution(restitution).setFriction(0.2), body);
    return body;
  };
  addFixedBox(-3.15, 0.0,  0.11, 6.25);
  addFixedBox( 3.15, 0.0,  0.11, 6.25);
  addFixedBox( 0.0,  6.15, 3.27, 0.11);
  addFixedBox(2.35, 5.68, 0.60, 0.08, Math.atan2(0.56, -1.40), 0.65);

  const slingshotMap = new Map<number, string>();
  const addSlingshot = (x:number,y:number,angle:number,side:string) => {
    const body = world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(x, y, 0.0).setRotation({ x: 0, y: 0, z: Math.sin(angle/2), w: Math.cos(angle/2) }));
    const col  = world.createCollider(
      RAPIER.ColliderDesc.cuboid(0.09, 0.65, 0.1).setRestitution(0.85).setFriction(0.1)
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

// resetBall + resetGameState — moved to src/app/game-state.ts

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
        ballInitialPos: { x: 2.65, y: -5.2, z: 0 },
        ballRestitution: physicsConfig.ball.restitution,
        ballFriction: physicsConfig.ball.friction,
        leftFlipperPos: { x: -getResponsiveFlipperX(innerWidth / innerHeight), y: -4.6, z: 0 },
        rightFlipperPos: { x: getResponsiveFlipperX(innerWidth / innerHeight), y: -4.6, z: 0 },
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
// handlePhysicsFrame — moved to src/app/physics-frame-handler.ts

// ─── Phase 16+: Helper function to apply enhanced visuals to playfield ────────
// applyEnhancedVisualsToTable moved to src/app/enhanced-visuals.ts

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

// triggerVideoEvent / onMultiballStartVideo / onTiltVideo — moved to src/app/physics-frame-handler.ts

// ─── Tilt ────────────────────────────────────────────────────────────────────
function nudgeTable(direction: number): void {
  if (state.tiltActive || state.inLane) return;
  state.tiltWarnings++;
  if (state.tiltWarnings >= 3) {
    state.tiltActive = true;

    try {
      const bridge = getPhysicsWorker();
      bridge.updateBallPosition(state.ballPos.x, state.ballPos.y, direction*1.5, -3.0);
    } catch { /* physics worker not ready */ }

    dmdEvent('TILT!!!'); showNotification('⚠️ TILT!'); playSound('drain');

    // ─── Phase 17+: Trigger tilt video ───
    onTiltVideo();

    setTimeout(() => { state.tiltActive = false; }, 100);
  } else {
    const force = 1.8 + state.tiltWarnings * 0.6;

    try {
      const bridge = getPhysicsWorker();
      const newVx = state.ballVel.x + direction * force;
      const newVy = state.ballVel.y + 0.5;
      bridge.updateBallPosition(state.ballPos.x, state.ballPos.y, newVx, newVy);
    } catch { /* physics worker not ready */ }

    dmdEvent(state.tiltWarnings === 2 ? 'TILT WARNING!!' : 'TILT WARNING!');
    particleField.spawn(state.ballPos.x, state.ballPos.y, 0xffaa00, 6, currentFps);
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
    rapierBody = physics.world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(startX, startY, 0.0).setLinearDamping(0.0).setAngularDamping(0.9).setCcdEnabled(true));
    physics.world.createCollider(RAPIER.ColliderDesc.ball(0.22).setRestitution(0.5).setFriction(0.3), rapierBody);
    rapierBody.setLinvel({ x:-3+Math.random()*6, y:5+Math.random()*5, z: 0 }, true);
  }
  extraBalls.push({ pos:new THREE.Vector3(startX,startY,0.5), vel:{x:0,y:0}, mesh, rapierBody });

  // ─── Phase 2: Trigger multiball flash effect ───
  cb.triggerMultiballFlash();

  // ─── Phase 9: Show Multiball Bonus Announcement ───────────────────────────────
  cb.showBonusAnnouncement('MULTIBALL!');

  // ─── Phase 9 TASK 3: Play Multiball Sound ──────────────────────────────────
  cb.playMultiballSound();

  dmdEvent('MULTIBALL!'); showNotification('🎱 MULTIBALL!'); particleField.spawn(0,2,0xffcc00,30,currentFps); playSound('bumper');

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
          b.rapierBody!.setLinvel({x:(dx/d)*spd,y:(dy/d)*spd,z:0},true);
          state.score+=150*state.multiplier; particleField.spawn(bu.x,bu.y,bu.mesh.userData.color,8,currentFps); updateHUD();
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
      physics.lFlipperBody.setNextKinematicTranslation({ x: lPos.x, y: lPos.y, z: 0 });
      physics.rFlipperBody.setNextKinematicTranslation({ x: rPos.x, y: rPos.y, z: 0 });
      physics.lFlipperBody.setNextKinematicRotation({ x: 0, y: 0, z: Math.sin(leftFlipperGroup.rotation.z/2), w: Math.cos(leftFlipperGroup.rotation.z/2) });
      physics.rFlipperBody.setNextKinematicRotation({ x: 0, y: 0, z: Math.sin(rightFlipperGroup.rotation.z/2), w: Math.cos(rightFlipperGroup.rotation.z/2) });
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
// ─── Library Selector — moved to src/app/library-selector.ts ─────────────────
const showLibrarySelector = createLibrarySelector({
  loadTableWithPhysicsWorker, resetGameState, scene,
});

// ─── Callbacks registrieren ───────────────────────────────────────────────────
cb.updateHUD        = updateHUD;
cb.showNotification = showNotification;
cb.spawnParticles   = (x, y, c, n) => particleField.spawn(x, y, c, n, currentFps);
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
    particleField.spawn(position.x, position.y, 0xffaa00, Math.floor(intensity * 20), currentFps);
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
    particleField.spawn(0, 2, 0xffff00, 20, currentFps);
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
    devLog(`✓ Cabinet profile changed to: ${profile.name}`);
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
  if (e.key === 'F12') {
    if (import.meta.env.DEV) {
      import('./app/model-viewer').then(m => m.initModelViewer({ allowDrop: true })?.toggle());
    }
  }
  if (e.key === 'm' || e.key === 'M') {
    // ─── Phase 26: Toggle background music ───
    getMusicManager().then((musicMgr) => {
      musicMgr.toggle();
      const status = musicMgr.isPlaying() ? '🎵 Music ON' : '🔇 Music OFF';
      showNotification(status);
      if (import.meta.env.DEV) console.log('[Music]', status);
    }).catch((e) => console.warn('[Music] Error:', e));
  }
  if (e.key === 'z' || e.key === 'Z') nudgeTable(-1);
  if (e.key === 'x' || e.key === 'X') nudgeTable( 1);
  if (e.key === 'p' || e.key === 'P') {
    // ─── Phase 5: Toggle profiler display ───
    showProfiler = !showProfiler;
    localStorage.setItem('fpw_show_profiler', showProfiler.toString());
    devLog(`📊 Performance profiler: ${showProfiler ? 'ON' : 'OFF'}`);
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
    rotateAndRedraw(nextRotation as 0 | 90 | 180 | 270, 400);
    showNotification(`🎮 Rotated to ${nextRotation}°`);
  }
  if ((e.ctrlKey || e.metaKey) && (e.key === 'e' || e.key === 'E')) {
    e.preventDefault();
    const rotEngine = getRotationEngine();
    const currentRotation = rotEngine?.getCurrentRotation() ?? 0;
    const nextRotation = (currentRotation - 90 + 360) % 360;
    rotateAndRedraw(nextRotation as 0 | 90 | 180 | 270, 400);
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
        physics.ballBody.setTranslation({ x:2.65, y:-5.0, z: 0 }, true);
        physics.ballBody.setLinvel({ x:vx, y:vy, z: 0 }, true);
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
    // Check name first (string compare, no object copy). Only fetch the full
    // preset object when a change is actually detected.
    const presetName = profiler.getCurrentPresetName();
    if (lastAppliedQualityPreset === presetName) return;
    lastAppliedQualityPreset = presetName;

    const currentPreset = profiler.getQualityPreset();
    appendLogEntry(`⚙️ Applying quality preset: ${currentPreset.label}`, 'ok');

    // ─── Bloom Pass ───
    // UnrealBloomPass has no setEnabled(); toggle the inherited Pass.enabled flag.
    if (bloomPass) {
      bloomPass.enabled = currentPreset.bloomEnabled;
      if (currentPreset.bloomEnabled) {
        bloomPass.strength = currentPreset.bloomStrength;
        bloomPass.radius = currentPreset.bloomRadius;
        bloomPass.threshold = 0.25;
      }
    }

    // ─── Shadow Maps ───
    // THREE.SpotLight has no setProperty(); set castShadow directly.
    if (currentPreset.shadowsEnabled) {
      if (mainSpot) {
        mainSpot.castShadow = true;
        mainSpot.shadow.mapSize.set(currentPreset.shadowMapSize, currentPreset.shadowMapSize);
        // Scale shadow blur quality with preset: lower presets use fewer samples
        const blurSamplesMap: Record<string, number> = {
          low: 4, medium: 8, high: 16, ultra: 16
        };
        mainSpot.shadow.blurSamples = blurSamplesMap[currentPreset.name] ?? 16;
      }
      renderer.shadowMap.enabled = true;
    } else {
      if (mainSpot) mainSpot.castShadow = false;
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
    particleField.setMaxParts(currentPreset.particleCount);
    appendLogEntry(`  └─ Particles: ${particleField.maxParts} max`, 'ok');

    // ─── Backglass Mode ───
    if (backglassRenderer) {
      if (currentPreset.backglassEnabled) {
        backglassRenderer.setEnabled(true);
        backglassRenderer.setRenderMode(currentPreset.backglass3D);
        appendLogEntry(`  └─ Backglass: ${currentPreset.backglass3D ? '3D' : '2D'}`, 'ok');
      } else {
        backglassRenderer.setEnabled(false);
      }
    }

    // ─── Volumetric Lighting ───
    if (volumetricPass) {
      volumetricPass.enabled = currentPreset.volumetricEnabled;
      if (currentPreset.volumetricEnabled) {
        volumetricPass.setExposure(currentPreset.volumetricIntensity);
        appendLogEntry(`  └─ Volumetric: ${(currentPreset.volumetricIntensity * 100).toFixed(0)}%`, 'ok');
      }
    }

    // ─── Phase 16+: Playfield Visual Enhancements ───
    const enhancement = getPlayfieldVisualEnhancement();
    if (enhancement) {
      enhancement.setQualityPreset(currentPreset.name as 'low' | 'medium' | 'high' | 'ultra');
      appendLogEntry(`  └─ Visual Enhancement: ${currentPreset.name}`, 'ok');
    }

    // ─── DMD Resolution ───
    if (currentPreset.dmdResolution) {
      window.setDMDResolutionOption?.(currentPreset.dmdResolution);
      window.setDMDGlow?.(currentPreset.dmdGlowEnabled, currentPreset.dmdGlowIntensity);
      appendLogEntry(`  └─ DMD: ${currentPreset.dmdResolution} (glow: ${currentPreset.dmdGlowEnabled})`, 'ok');
    }

    // ─── Tone Mapping Exposure ───
    renderer.toneMappingExposure = currentPreset.bloomEnabled ? 1.35 : 1.30;  // ─── Increased from 1.15/1.05 to combat SSAO/fog darkening
  } catch (err) {
    appendLogEntry(`❌ Error in applyQualityPreset: ${err instanceof Error ? err.message : String(err)}`, 'error');
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
      if (import.meta.env.DEV) console.log(`⚠️ Low FPS (${currentFps.toFixed(0)}) → reducing DPI to ${pixelRatioTarget.toFixed(2)}`);
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
      if (import.meta.env.DEV) console.log(`🎮 ${profiler.getMetricsDisplay()}`);
    }
  }

  // ─── Phase 24: Process low-latency input ───
  const inputOptimizer = getInputOptimizer();
  inputOptimizer.processInputQueue();

  updateFlippers();

  if (physics) {
    if (state.inLane) {
      try {
        const bridge = getPhysicsWorker();
        bridge.setBallGravityScale(0.0);
      } catch { /* physics worker not ready */ }
    } else {
      try {
        const bridge = getPhysicsWorker();
        const substeps = currentFps > 55 ? 6 : (currentFps > 45 ? 5 : 4);
        bridge.step(dt, substeps);
      } catch { /* physics worker not ready — skipping frame */ }

      if (bamEngine) {
        const substeps = currentFps > 55 ? 6 : (currentFps > 45 ? 5 : 4);
        bamEngine.step(dt, substeps);
      }
      if (physics) {
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
              z: 0,
            }, true);
            return;
          }
          if (other === rightFlipperColliderHandle) {
            const vel = physics!.ballBody.linvel();
            const powerMult = lastRightFlipperPower;  // 0.5-1.0
            physics!.ballBody.setLinvel({
              x: vel.x * powerMult,
              y: Math.max(vel.y * powerMult, 3.0),  // Ensure upward momentum
              z: 0,
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
            z: 0,
          }, true);
        } else if (speed > 0) {
          // Stop completely below threshold
          physics.ballBody.setLinvel({ x: 0, y: 0, z: 0 }, true);
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
          particleField.spawn(state.ballPos.x,-6.8,0x00ff88,18,currentFps);
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
          particleField.spawn(state.ballPos.x,-6.8,0x00ff88,18,currentFps);
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
  particleField.update(dt);

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

  inlineBackglass.draw();

  // ─── Phase 24: Record performance metrics ───
  const dashboard = getPerformanceDashboard();
  const inputMetrics = inputOptimizer.getMetrics();
  dashboard.recordFrame({
    frameTime: dt * 1000,
    inputLatency: inputMetrics.keyDownLatency,
    ballVelocity: state.ballPos ? Math.hypot(state.ballVel.x, state.ballVel.y) : 0,
    flipperResponse: 0,  // Updated by flipper handler
  });

  emitSyncFrame({
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

// ─── Inline Backglass (1-Screen) — see createInlineBackglass ────────────────
const inlineBackglass = createInlineBackglass();

// ─── View Settings ─────────────────────────────────────────────────────────────
// see window-api.ts — toggleViewPanel, applyViewSettings, resetViewSettings
const { applyViewSettings, resetViewSettings, initViewSettings } = createViewSettings(camera, rotateAndRedraw);

// ─── Phase 4: Setup Backglass After Table Load ──────────────────────────────────
// ─── Phase 4: Setup Backglass After Table Load ──────────────────────────────────
function setupBackglassForTable(): void {
  if (backglassRenderer) {
    // Extract and set artwork from FPT resources
    const artwork = getBackglassArtwork();
    backglassRenderer.setArtwork(artwork);

    // Set mode indicator
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


(document.getElementById('open-loader') as HTMLElement).onclick = () => {
  (document.getElementById('loader-modal') as HTMLElement).style.display='flex';
};

// ─── Phase 7: File Browser Integration ──────────────────────────────────────────
// see window-api.ts — browseTableDirectory / browseLibraryDirectory / loadSelectedTable /
// addToFavorites / getAdvancedFavoritesCount / getRecentTables / createBatchLoadJob /
// getBatchJobStatus / setupTableDragDrop / sortTableFiles
const {
  browseTableDirectoryFS, browseLibraryDirectoryFS, loadSelectedTable,
  addToFavorites, getAdvancedFavoritesCount, getRecentTables,
  createBatchLoadJob, getBatchJobStatus, setupTableDragDrop, sortTableFiles,
} = initFileBrowser({
  resetGameState,
  loadTableConfig: async (cfg) => {
    // Physics-worker table build + backglass wiring stay on the entry point (§3.3).
    await loadTableWithPhysicsWorker(cfg, scene);
    setupBackglassForTable();
  },
});

// ─── Option B: Testing & Validation ────────────────────────────────────────────
const runFullTestSuite = async (): Promise<any> => {
  const testSuite = getTestSuite();
  return await testSuite.runAllTests();
};

// see window-api.ts — toggleDMDMode (direct import reference)

// ─── DMD on-screen visibility ───
// see window-api.ts — toggleHideDMD
const { initDMDVisibility, toggleHideDMD, getDmdHidden } = createDmdVisibility(FPW_ROLE);

// ─── Initialize DMD visibility based on multi-screen configuration ───
document.addEventListener('DOMContentLoaded', () => {
  initDMDVisibility();
  // Apply DMD visibility to the UI
  const wrap = document.getElementById('dmd-wrap');
  const btn = document.getElementById('hide-dmd-btn');
  if (wrap) wrap.style.display = getDmdHidden() ? 'none' : '';
  if (btn) btn.classList.toggle('dmd-hidden', getDmdHidden());
}, { once: true });

// Fallback for if DOMContentLoaded already fired
setTimeout(() => {
  if (!document.readyState.includes('loading')) {
    initDMDVisibility();
    const wrap = document.getElementById('dmd-wrap');
    const btn = document.getElementById('hide-dmd-btn');
    if (wrap) wrap.style.display = getDmdHidden() ? 'none' : '';
    if (btn) btn.classList.toggle('dmd-hidden', getDmdHidden());
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

  // Update SMAA internal render targets to match current renderer state
  const aaPixelRatio = renderer.getPixelRatio();
  smaaPass.setSize(innerWidth * aaPixelRatio, innerHeight * aaPixelRatio);

  // Update inline backglass if active
  inlineBackglass.resize();

  // Update device detection
  window.FPW_DEVICE = detectDeviceType();
  } catch (error) {
    console.error('Error during secondary resize handler:', error);
  }
});

// ─── Touch Controls ────────────────────────────────────────────────────────────
initTouchControls();

// ─── Multi-Screen ─────────────────────────────────────────────────────────────
// see window-api.ts — selectMsLayout / openMultiscreenModal / closeMultiscreenModal /
// applyMsLayout / resetScreenRoles / swapScreenRoles / autoDetectScreens / applyStartupScreenConfig
const {
  selectMsLayout, openMultiscreenModal, closeMultiscreenModal, applyMsLayout,
  resetScreenRoles, swapScreenRoles, autoDetectScreens, applyStartupScreenConfig,
} = initMultiscreen({
  initInlineBackglass: inlineBackglass.init,
  stopInlineBackglass: inlineBackglass.stop,
  initDMDVisibility,
  getDmdHidden,
  loadDemoTable,
});

// ─── Secondary Windows — moved to src/app/secondary-windows.ts ───────────────

// ─── File Input ────────────────────────────────────────────────────────────────
// ─── File Browser UI — moved to src/app/file-browser-ui.ts ───────────────────
const { browseTableDirectory, browseLibraryDirectory } = initFileBrowserUI({
  loadTableWithPhysicsWorker,
  resetGameState,
  scene,
});

// ─── DMD Init-Label ───────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded',()=>{
  const btn=document.getElementById('dmd-mode-btn');
  if(btn) btn.textContent=dmdSolidMode?'SOLID':'DOT';

  // Initialize path shortcuts (browseTableDirectory/browseLibraryDirectory from initFileBrowserUI)
  if (typeof browseTableDirectory === 'function') updateTablePathShortcuts(browseTableDirectory as () => Promise<void>);
  if (typeof browseLibraryDirectory === 'function') updateLibraryPathShortcuts(browseLibraryDirectory as () => Promise<void>);

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

    // Warm up physics worker thread early (no table config yet — just spawns the worker)
    setDevFlag('INIT_PHYSICS_WORKER_START', true);
    initializePhysicsWorker().catch(() => {});
    setDevFlag('INIT_PHYSICS_WORKER_OK', true);

    // Pre-create AssetCatalog so dev models and 3D fixtures are available
    if (!globalAssetCatalog()) {
      setGlobalAssetCatalog(new AssetCatalog());
    }

    // Register dev-mode 3D model fixtures (before table loads)
    if (import.meta.env.DEV) {
      try {
        const { registerDevModels } = await import('./app/dev-models');
        registerDevModels();
      } catch {}
    }

    // Auto-load a demo table on startup (Pharaoh's Gold — medium difficulty)
    setDevFlag('INIT_TABLE_LOAD_START', true);
    await loadDemoTable('pharaoh');
    setDevFlag('INIT_TABLE_LOAD_OK', true);

    // Initialize B.A.M. Engine + animation systems + animate loop
    initializeBAMEngine({ mainSpot, applyQualityPreset, animate, inlineBackglass });
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
            devLog(`🚀 Auto-multiscreen on startup: ${n} displays detected → applying ${target}-screen layout (disable via localStorage.setItem('fpw_ms_autostart','off'))`);
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

// ─── PWA Install — moved to src/app/pwa-install.ts ───────────────────────────
initPWAInstall();

// ─── Phase 5: Quality System Exports ──────────────────────────────────────────
const setQualityPreset = (name: string) => {
  profiler.setQualityPreset(name);
  applyQualityPreset();
  devLog(`✅ Quality preset changed to: ${name}`);
};

const getQualityPreset = () => profiler.getQualityPreset();
const getAvailableQualityPresets = () => Object.keys(QUALITY_PRESETS);
const toggleAutoQuality = () => {
  const current = profiler.isAutoAdjusting();
  profiler.setAutoAdjust(!current);
  devLog(`🎯 Auto-quality adjustment: ${!current ? 'ON' : 'OFF'}`);
};

const getPerformanceMetrics = () => profiler.getMetrics();
const togglePerformanceMonitor = () => {
  showProfiler = !showProfiler;
  localStorage.setItem('fpw_show_profiler', showProfiler.toString());
  devLog(`📊 Performance monitor: ${showProfiler ? 'ON' : 'OFF'}`);
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
  initializeResourceManager();
  appendLogEntry(`💾 ResourceManager reset with fresh budget`, 'ok');
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
  appendLogEntry(`🧹 Manual cache cleanup: removed ${removed} expired entries`, 'ok');
};
const resetLibraryCacheWrap = () => {
  resetLibraryCache();
  initializeLibraryCache();
  appendLogEntry(`📚 LibraryCache reset with fresh TTL`, 'ok');
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
// ─── NAS source ────────────────────────────────────────────────────────────
// Enable loading FPL/FPT files from local NAS file server
window.connectNAS = async () => {
  try {
    const { connectNAS, showNASBrowser } = await import('./app/nas-source');
    const ok = await connectNAS();
    if (ok) showNASBrowser();
    return ok;
  } catch { return false; }
};
try {
  // Auto-detect NAS server (non-blocking)
  import('./app/nas-source').then(m => {
    m.checkNASConnection().then(connected => {
      if (connected) {
        if (import.meta.env.DEV) console.log('[NAS] Ready — call connectNAS() to browse');
      }
    });
  });
} catch {}

// Handle files loaded from NAS browser
window.addEventListener('fpl-file-loaded', async (e: Event) => {
  const detail = (e as CustomEvent).detail;
  if (!detail?.file) return;
  const file = detail.file as File;
  try {
    if (file.name.endsWith('.fpl')) {
      const { parseFPLFile } = await import('./fpt-parser');
      await parseFPLFile(
        file,
        (lib: any) => {
          setLoadedLibrary(lib);
          window.showLibrarySelector(lib);
          appendLogEntry('[NAS] Library loaded: ' + lib.name);
        },
        (err: string) => appendLogEntry('[NAS] FPL Error: ' + err, 'error')
      );
    } else if (file.name.endsWith('.fpt')) {
      resetGameState();
      const { parseFPTFile } = await import('./fpt-parser');
      await parseFPTFile(
        file,
        async (cfg: any) => {
          await loadTableWithPhysicsWorker(cfg, scene);
          setupBackglassForTable();
        },
        () => {},
        (tab: string) => {}
      );
    }
  } catch (err) {
    appendLogEntry('[NAS] Error loading ' + file.name + ': ' + err, 'error');
  }
});

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
  toggleModelViewer,
});

// ─── Guaranteed Event Handler Initialization ───
// Module scripts are deferred, so DOM is ready when this runs.
// setupWindowAPI() above has already set window.loadDemoTable etc.
// initializeEventHandlers is idempotent, so calling it multiple times is safe.
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => initializeEventHandlers());
} else {
  // Run synchronously (DOM + window API ready)
  initializeEventHandlers();
}
// Macrotask safety net: RAF+setTimeout(0) can fire before the module's
// synchronous tail completes in some bundlers. Re-initialize here ensures
// handlers are attached even if the earlier call raced.
setTimeout(() => initializeEventHandlers(), 50);

