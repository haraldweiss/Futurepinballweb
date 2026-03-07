/**
 * main.ts — Einstiegspunkt: Scene, Physik, Game-Loop, Input, UI, Multiscreen
 */
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass }     from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass }     from 'three/addons/postprocessing/ShaderPass.js';
import { FXAAShader }     from 'three/addons/shaders/FXAAShader.js';

import {
  state, keys, fptResources, physics, currentTableConfig, plungerKnob, loadedLibrary, bamEngine,
  bumpers, extraBalls, partData,
  setPhysics, setFpScriptHandlers, setLoadedLibrary, setBAMEngine, cb,
} from './game';
import { getAudioCtx, playSound, startBGMusic, stopBGMusic, playFPTMusic, toggleMusic } from './audio';
import { BAMEngine } from './bam-engine';
import { BamBridge, initializeBamBridge, getBamBridge } from './bam-bridge';
import {
  dmdState, dmdUpdate, dmdEvent, dmdRenderAttract, dmdRenderPlaying,
  dmdRenderEvent, dmdRenderGameOver, dmdCanvas, DMD_W, DMD_H,
  toggleDMDMode, dmdSolidMode,
} from './dmd';
import { getTopScores, recordScore } from './highscore';
import { TABLE_CONFIGS, buildTable, buildPhysicsTable, buildRealisticFlipper, scoreBumperHit, scoreTargetHit, scoreSlingshotHit, checkRolloverLanes, updateSpinnerPhysics, getAdvancedLighting } from './table';
import { runFPScript, callScriptFlipper, callScriptDrain } from './script-engine';
import { parseFPTFile, parseFPLFile, logMsg, getBackglassArtwork } from './fpt-parser';
import { getBackglassRenderer, disposeBackglass } from './backglass';
import { getProfiler, QUALITY_PRESETS } from './profiler';
import { ScoreDisplayManager } from './score-display';
import {
  initializeAudioSystem, getAudioSystem, AudioCategory,
  TARGET_HIT, FLIPPER_ACTIVATE, RAMP_COMPLETE, BALL_DRAIN, MULTIBALL_START, MILESTONE_REACHED,
} from './audio-enhanced';
import { VisualPolishSystem, emitBallTrail, emitFlipperDust, emitMilestoneSparkles } from './visual-polish';
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
  InputMappingManager, initializeInputMapping, getInputMappingManager,
  applyInputMapping, resetInputMapping,
  getFlipperCorrectionAngles, getPlungerAdjustment,
} from './input-mapping';
import {
  AnimationBindingManager, initializeAnimationBinding, getAnimationBindingManager,
} from './mechanics/animation-binding';
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
  GraphicsPipeline, initializeGraphicsPipeline, getGraphicsPipeline, QUALITY_PRESETS,
} from './graphics/graphics-pipeline';

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
    applyQualityPreset(view.quality);
    localStorage.setItem('fpw_quality_preset', view.quality);
  }
}


// ─── Phase 13.3: Rotation with Redraw ───
async function rotateAndRedraw(targetDegrees: 0 | 90 | 180 | 270, duration: number = 400): Promise<void> {
  // Rotate the playfield smoothly
  await rotatePlayfieldSmooth(targetDegrees, duration);
  
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
// Auto-apply when window resizes
window.addEventListener('resize', () => {
  // Throttle resize events
  clearTimeout((window as any).resizeTimer);
  (window as any).resizeTimer = setTimeout(() => {
    applyOptimizedTableView();
    renderer.setSize(window.innerWidth, window.innerHeight);
    if (composer) {
      composer.setSize(window.innerWidth, window.innerHeight);
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
const FPW_ROLE = new URLSearchParams(location.search).get('role');
if (FPW_ROLE) document.body.classList.add('role-' + FPW_ROLE);
(window as any).FPW_DEVICE = detectDeviceType();

// ─── BroadcastChannel ────────────────────────────────────────────────────────
const multiChannel: BroadcastChannel | null = typeof BroadcastChannel !== 'undefined'
  ? new BroadcastChannel('fpw-multiscreen') : null;

// ─── Phase 5: Flipper Power Variations ────────────────────────────────────────
let leftFlipperChargeStart: number | null = null;   // Timestamp when left flipper pressed
let rightFlipperChargeStart: number | null = null;  // Timestamp when right flipper pressed
let lastLeftFlipperPower = 0.75;   // Default power level (0.5-1.0)
let lastRightFlipperPower = 0.75;  // Default power level (0.5-1.0)
let leftFlipperColliderHandle: number = -1;   // Saved for collision detection
let rightFlipperColliderHandle: number = -1;  // Saved for collision detection

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
let backglassCanvasElement: HTMLCanvasElement | null = null;

// ─── Phase 5: Performance Profiler ────────────────────────────────────────────
const profiler = getProfiler();
let showProfiler = localStorage.getItem('fpw_show_profiler') === 'true';
let lastAppliedQualityPreset = '';  // Track quality changes for application

// ─── THREE.js Scene ───────────────────────────────────────────────────────────
const scene    = new THREE.Scene();
scene.background = new THREE.Color(0x050508);
scene.fog = new THREE.Fog(0x050508, 20, 50);

// ─── Phase 10+: Playground Rotation Group (für Cabinet-Rotation) ─────────────
/**
 * All playfield elements (flippers, ball, bumpers, etc.) are added to this group
 * This allows us to rotate the entire playfield for different cabinet orientations
 */
const playgroundGroup = new THREE.Group();
playgroundGroup.name = 'playground';
scene.add(playgroundGroup);

// ─── Phase 9: Score Display Manager ──────────────────────────────────────────
let scoreDisplayManager: ScoreDisplayManager | null = null;

// ─── Phase 9: Enhanced Audio System ──────────────────────────────────────────
let enhancedAudioSystem = initializeAudioSystem();

// ─── Phase 10+: Cabinet System (Rotation & Profiles) ──────────────────────────
let cabinetSystem = initializeCabinetSystem();
const activeCabinetProfile = cabinetSystem.autoDetectProfile();
console.log(`🎮 Cabinet profile auto-detected: ${activeCabinetProfile.name}`);

const aspectRatio = innerWidth / innerHeight;
const responsiveZoom = calculateResponsiveZoom(aspectRatio);
const responsiveFOV = getResponsiveFOV();
const responsiveTilt = getResponsiveCameraTilt(aspectRatio);

const camera = new THREE.PerspectiveCamera(responsiveFOV, aspectRatio, 0.1, 200);
camera.position.set(0, responsiveTilt, responsiveZoom);  // Auto-zoom + tilt based on aspect ratio
camera.lookAt(0, 0.5, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true, precision: 'highp' });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(getOptimalPixelRatio());
renderer.shadowMap.enabled = true;
renderer.shadowMap.type    = THREE.PCFSoftShadowMap;
renderer.toneMapping       = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;  // ─── Phase 2: Enhanced for better color vibrancy

// ─── Phase 2: Output Encoding for better color accuracy ───
renderer.outputColorSpace = THREE.SRGBColorSpace;

// WebGL2 Extensions: Texture Compression (S3TC, ETC, ASTC)
const gl = renderer.getContext()!;
['WEBGL_compressed_texture_s3tc', 'WEBGL_compressed_texture_s3tc_srgb',
 'WEBGL_compressed_texture_etc1', 'WEBGL_compressed_texture_etc',
 'WEBGL_compressed_texture_astc'].forEach(ext => gl.getExtension(ext));

document.body.appendChild(renderer.domElement);

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
// Create backglass with dimensions matching the aspect ratio
const backglassWidth = 400;
const backglassHeight = 600;
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
});

const composer = new EffectComposer(renderer);
const renderPass = new RenderPass(scene, camera);
composer.addPass(renderPass);

// ─── Phase 10+: Initialize Rotation Engine ────────────────────────────────────
let rotationEngine = initializeRotationEngine(playgroundGroup, camera);
// Apply initial profile rotation
applyProfileRotation(activeCabinetProfile);
console.log(`✓ Rotation engine initialized with profile: ${activeCabinetProfile.name}`);

// ─── Phase 10+: Initialize UI Rotation Manager ─────────────────────────────────
let uiRotationManager = initializeUIRotation();
// Apply initial UI rotation based on active profile
applyUIRotation(activeCabinetProfile);
console.log(`✓ UI rotation manager initialized`);

// ─── Phase 10+: Initialize Input Mapping Manager ────────────────────────────────
let inputMappingManager = initializeInputMapping();
// Apply initial input mapping based on active profile
applyInputMapping(activeCabinetProfile);
console.log(`✓ Input mapping manager initialized`);

// ─── Phase 13+: Enhanced Bloom Effect for Demo Table ───
// Improved glow on ball, bumpers, and emissive surfaces
// Increased strength for more dramatic visual impact
const bloomPass = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 1.8, 0.8, 0.20);
bloomPass.threshold = 0.15;  // Lower threshold for more bloom (more surfaces glow)
bloomPass.strength = 1.6;    // Increased from 1.1 for more dramatic effect
bloomPass.radius = 0.75;     // Wider glow falloff for softer bloom edges
composer.addPass(bloomPass);

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

// ─── Phase 14: Initialize Standard Pinball Lighting via LightManager ───────────────
// Get LightManager from pipeline and initialize standard lighting
const lightManager = getGraphicsPipeline()?.getLightManager();
if (lightManager) {
  lightManager.initialize();
  console.log('✓ Pinball lighting system initialized via LightManager');
} else {
  // Fallback: create lights manually if LightManager unavailable
  console.warn('⚠️ LightManager not available, creating lights manually');
  const ambLight = new THREE.AmbientLight(0xffffff, 0.35);
  scene.add(ambLight);
  const mainSpot = new THREE.SpotLight(0xffffff, 2.5, 45, Math.PI/3.0, 0.20);
  mainSpot.position.set(0, 14, 16);
  mainSpot.castShadow = true;
  mainSpot.shadow.mapSize.set(2048, 2048);
  mainSpot.shadow.bias = -0.0020;
  mainSpot.shadow.normalBias = 0.030;
  mainSpot.shadow.camera.near = 0.5;
  mainSpot.shadow.camera.far = 120;
  mainSpot.shadow.blurSamples = 16;
  scene.add(mainSpot);
  const fillLight = new THREE.PointLight(0xffffdd, 1.5, 35);
  fillLight.position.set(-9, 6, 9);
  fillLight.castShadow = true;
  scene.add(fillLight);
  const accentLight = new THREE.PointLight(0xccddff, 0.8, 25);
  accentLight.position.set(9, 4, 5);
  scene.add(accentLight);
  const rimLight = new THREE.DirectionalLight(0x88ccff, 0.9);
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
    RAPIER.RigidBodyDesc.dynamic().setTranslation(2.55, -5.0).setGravityScale(0.0).setLinearDamping(0.0).setAngularDamping(0.9)
  );
  const ballCollider = world.createCollider(
    RAPIER.ColliderDesc.ball(0.22).setRestitution(0.5).setFriction(0.3), ballBody
  );

  const lFlipperBody = world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(-1.15, -4.6));
  const lFlipperCollider = world.createCollider(RAPIER.ColliderDesc.cuboid(1.05, 0.13).setTranslation(1.05, 0.0).setRestitution(0.5).setFriction(0.6).setCcdEnabled(true), lFlipperBody);
  leftFlipperColliderHandle = lFlipperCollider.handle;  // Phase 5: Save handle

  const rFlipperBody = world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(1.15, -4.6));
  const rFlipperCollider = world.createCollider(RAPIER.ColliderDesc.cuboid(1.05, 0.13).setTranslation(-1.05, 0.0).setRestitution(0.5).setFriction(0.6).setCcdEnabled(true), rFlipperBody);
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
    bumperMap: new Map(), targetMap: new Map(), slingshotMap, tableBodies: [], tableBodyConfigs: [] }); // ✓ NEW: For worker serialization
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
  } catch {
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
  resetBall();
  cb.updateHUD();
}

// ─── Phase 15: Initialize Physics Worker (after table build) ──────────────────────
async function setupPhysicsWorker(): Promise<void> {
  try {
    const bridge = await initializePhysicsWorker();

    // Configure physics world with current table settings
    if (physics) {
      bridge.initializePhysicsWorld({
        ballInitialPos: { x: 2.65, y: -5.2 },
        ballRestitution: 0.5,
        ballFriction: 0.3,
        leftFlipperPos: { x: -getResponsiveFlipperX(innerWidth / innerHeight), y: -4.6 },
        rightFlipperPos: { x: getResponsiveFlipperX(innerWidth / innerHeight), y: -4.6 },
        flipperLength: 2.1,
        flipperRestitution: 0.5,
        flipperFriction: 0.6,
        tableBodies: physics.tableBodyConfigs || [],  // ✓ FIXED: Pass serialized configs instead of RigidBody objects
        bumperMap: physics.bumperMap,
        targetMap: physics.targetMap,
        slingshotMap: physics.slingshotMap,
      });

      // Setup callback for physics frame updates
      bridge.setFrameCallback((frame: PhysicsFrameData) => {
        handlePhysicsFrame(frame);
      });

      console.log('✓ Physics worker initialized and ready');
    }
  } catch (error) {
    console.error('Failed to initialize physics worker:', error);
    console.warn('Falling back to single-threaded physics');
  }
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
        if (bumperData) scoreBumperHit(bumperData);
        break;
      }
      case 'target': {
        const targetData = physics?.targetMap.get(collision.data.index);
        if (targetData) scoreTargetHit(targetData);
        break;
      }
      case 'slingshot': {
        scoreSlingshotHit(collision.data.side);
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

// ─── Phase 15: Helper function to load table with physics worker ────────────────
async function loadTableWithPhysicsWorker(tableConfig: any, sceneTarget: THREE.Scene, library?: any): Promise<void> {
  // Build the table geometry (this internally calls buildPhysicsTable at the end)
  buildTable(tableConfig, sceneTarget, library);

  // Initialize physics worker after table is built
  try {
    await setupPhysicsWorker();
  } catch (error) {
    console.error('Physics worker setup failed:', error);
    // Continue with single-threaded physics fallback
  }
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
    } catch {
      // Fallback: Direct physics access (single-threaded)
      if (physics) physics.ballBody.setLinvel({ x:direction*1.5, y:-3.0 }, true);
      else { state.ballVel.x = direction*1.5; state.ballVel.y = -3.0; }
    }

    dmdEvent('TILT!!!'); showNotification('⚠️ TILT!'); playSound('drain');
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
    } catch {
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
  let rapierBody = null;
  if (physics && RAPIER) {
    rapierBody = physics.world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(startX,startY).setLinearDamping(0.0).setAngularDamping(0.9));
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

  // Phase 15: Update physics worker with flipper rotations
  try {
    const bridge = getPhysicsWorker();
    bridge.updateLeftFlipperRotation(leftFlipperGroup.rotation.z);
    bridge.updateRightFlipperRotation(rightFlipperGroup.rotation.z);
  } catch {
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
      dmdState.eventText='POWER '+bars; dmdState.eventTimer=3; dmdState.mode='event';
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

  if (dmdState.mode !== 'event' && dmdState.mode !== 'gameover') dmdState.mode = 'playing';
}

// ─── Notification ─────────────────────────────────────────────────────────────
function showNotification(msg: string): void {
  const n = document.getElementById('notification') as HTMLElement;
  n.textContent = msg; n.style.opacity = '1';
  setTimeout(() => n.style.opacity = '0', 2500);
  const clean = msg.replace(/[\u{1F000}-\u{1FFFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '').trim();
  if (clean.length > 1) dmdEvent(clean.substring(0, 22).toUpperCase());
}
(window as any).showNotification = showNotification;

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
      (window as any).closeLoader();
      logMsg(`✓ Loaded: ${lib.name} / ${templateName}`);
    };
    tableEl.appendChild(btn);
  }

  selector.style.display = 'block';
}
(window as any).showLibrarySelector = showLibrarySelector;

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
(window as any).changeCabinetProfile = (profileId: string) => {
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

/**
 * Rotate playfield to specified angle (0/90/180/270)
 */
(window as any).rotatePlayfield = async (degrees: 0 | 90 | 180 | 270, animated: boolean = true) => {
  if (cabinetSystem) {
    const duration = animated ? 600 : 0;
    await rotatePlayfieldTo(degrees, duration);
    showNotification(`🎮 Playfield rotated to ${degrees}°`);
  }
};

/**
 * Get all available cabinet profiles for UI selection
 */
(window as any).getCabinetProfiles = () => {
  return CabinetSystem.getAllProfiles().map(p => ({
    id: p.id,
    name: p.name,
    description: p.description,
    rotation: p.rotation,
  }));
};

/**
 * Get current cabinet profile
 */
(window as any).getCurrentCabinetProfile = () => {
  const profile = getActiveCabinetProfile();
  return {
    id: profile.id,
    name: profile.name,
    rotation: profile.rotation,
    screenRatio: profile.screenRatio,
  };
};

// ─── Phase 10+: Playfield Rotation Callbacks ───────────────────────────────────

/**
 * Apply cabinet profile and update playfield rotation
 */
(window as any).applyRotationProfile = async (profileId: string) => {
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

/**
 * Rotate playfield with smooth animation
 */
(window as any).rotatePlayfieldAnimated = async (degrees: 0 | 90 | 180 | 270) => {
  if (rotationEngine) {
    showNotification(`🎮 Rotating playfield to ${degrees}°...`);
    await rotateAndRedraw(degrees, 600);
    // ─── Phase 10+ Task 3: Also update UI display ───
    if (uiRotationManager) {
      // Create a temporary profile-like object for UI rotation
      const currentProfile = getActiveCabinetProfile();
      applyUIRotation(currentProfile);
      // ─── Phase 10+ Task 5: Also apply input mapping ───
      applyInputMapping(currentProfile);
    }
    showNotification(`✓ Playfield at ${degrees}°`);
  }
};

/**
 * Get current playfield rotation
 */
(window as any).getCurrentPlayfieldRotation = () => {
  if (rotationEngine) {
    return rotationEngine.getCurrentRotation();
  }
  return 0;
};

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
  if (e.key === 'm' || e.key === 'M') toggleMusic();
  if (e.key === 'z' || e.key === 'Z') nudgeTable(-1);
  if (e.key === 'x' || e.key === 'X') nudgeTable( 1);
  if (e.key === 'p' || e.key === 'P') {
    // ─── Phase 5: Toggle profiler display ───
    showProfiler = !showProfiler;
    localStorage.setItem('fpw_show_profiler', showProfiler.toString());
    console.log(`📊 Performance profiler: ${showProfiler ? 'ON' : 'OFF'}`);
  }

  // ─── Phase 13.2: Quick Rotation Controls for Cabinet Mode ───
  // Number keys: 1=0°, 2=90°, 3=180°, 4=270°
  if (e.key === '1') {
    rotateAndRedraw(0, 400);
    showNotification('🎮 Rotated to 0°');
  }
  if (e.key === '2') {
    rotateAndRedraw(90, 400);
    showNotification('🎮 Rotated to 90°');
  }
  if (e.key === '3') {
    rotateAndRedraw(180, 400);
    showNotification('🎮 Rotated to 180°');
  }
  if (e.key === '4') {
    rotateAndRedraw(270, 400);
    showNotification('🎮 Rotated to 270°');
  }

  // Q/E for quick rotation in either direction
  if (e.key === 'q' || e.key === 'Q') {
    const currentRotation = playgroundGroup.rotation.z * (180 / Math.PI);
    const normalizedRot = ((currentRotation % 360) + 360) % 360;
    const nextRotation = (normalizedRot + 90) % 360;
    rotateAndRedraw(nextRotation as any, 400);
    showNotification(`🎮 Rotated to ${nextRotation}°`);
  }
  if (e.key === 'e' || e.key === 'E') {
    const currentRotation = playgroundGroup.rotation.z * (180 / Math.PI);
    const normalizedRot = ((currentRotation % 360) + 360) % 360;
    const nextRotation = (normalizedRot - 90 + 360) % 360;
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
    try {
      const bridge = getPhysicsWorker();
      const vy = 16.0 + charge * 14.0;  // Min 16, max 30 m/s for playfield reach
      bridge.setBallGravityScale(1.0);
      bridge.updateBallPosition(2.65, -5.0, 0, vy);
    } catch {
      // Fallback: Direct physics access (single-threaded)
      if (physics) {
        physics.ballBody.setGravityScale(1.0, true);
        physics.ballBody.setTranslation({ x:2.65, y:-5.0 }, true);
        physics.ballBody.setLinvel({ x:0, y:16.0+charge*14.0 }, true);  // Min 16, max 30 m/s for playfield reach
      }
    }
    playSound('bumper'); startBGMusic();
  }
});

// ─── Phase 5: Apply Quality Preset Settings ───────────────────────────────────
// This function applies the profiler's quality preset to actual rendering systems
function applyQualityPreset(): void {
  const currentPreset = profiler.getQualityPreset();
  const presetName = currentPreset.name;

  // Skip if no change
  if (lastAppliedQualityPreset === presetName) return;
  lastAppliedQualityPreset = presetName;

  console.log(`⚙️ Applying quality preset: ${currentPreset.label}`);

  // ─── Bloom Pass ───
  if (currentPreset.bloomEnabled) {
    bloomPass.enabled = true;
    bloomPass.strength = currentPreset.bloomStrength;
    bloomPass.radius = currentPreset.bloomRadius;
    bloomPass.threshold = 0.25;  // Fixed threshold
  } else {
    bloomPass.enabled = false;
  }

  // ─── Shadow Maps ───
  if (currentPreset.shadowsEnabled) {
    mainSpot.castShadow = true;
    mainSpot.shadow.mapSize.set(currentPreset.shadowMapSize, currentPreset.shadowMapSize);
    mainSpot.shadow.blurSamples = 16;
    renderer.shadowMap.enabled = true;
  } else {
    mainSpot.castShadow = false;
    renderer.shadowMap.enabled = false;
  }

  // ─── Lighting Intensities ───
  ambLight.intensity = currentPreset.shadowsEnabled ? 0.25 : 0.35;  // Brighter if no shadows
  fillLight.intensity = currentPreset.shadowsEnabled ? 1.2 : 1.5;
  rimLight.intensity = currentPreset.shadowsEnabled ? 0.7 : 0.5;

  // ─── Ball Material Emissive ───
  ballOuterMaterial.emissiveIntensity = currentPreset.bloomEnabled ? 0.3 : 0.1;
  ballGlowMaterial.emissiveIntensity = currentPreset.bloomEnabled ? 0.6 : 0.2;
  ballGlowMaterial.opacity = currentPreset.bloomEnabled ? 0.12 : 0.06;

  // ─── Particle System ───
  MAX_PARTS = currentPreset.particleCount;
  console.log(`  └─ Particles: ${MAX_PARTS} max`);

  // ─── Backglass Mode ───
  if (backglassRenderer && currentPreset.backglassEnabled) {
    backglassRenderer.setEnabled(true);
    backglassRenderer.setRenderMode(currentPreset.backglass3D);
    console.log(`  └─ Backglass: ${currentPreset.backglass3D ? '3D' : '2D'}`);
  } else if (backglassRenderer) {
    backglassRenderer.setEnabled(false);
  }

  // ─── DMD Resolution ───
  if (currentPreset.dmdResolution) {
    const dmdConfig = { resolution: currentPreset.dmdResolution, glowIntensity: currentPreset.dmdGlowIntensity };
    (window as any).setDMDResolutionOption?.(currentPreset.dmdResolution);
    (window as any).setDMDGlow?.(currentPreset.dmdGlowEnabled, currentPreset.dmdGlowIntensity);
    console.log(`  └─ DMD: ${currentPreset.dmdResolution} (glow: ${currentPreset.dmdGlowEnabled})`);
  }

  // ─── Tone Mapping Exposure ───
  // Increase exposure slightly for low quality (darker scenes), reduce for high quality
  renderer.toneMappingExposure = currentPreset.bloomEnabled ? 1.15 : 1.05;
}

// ─── Game Loop ────────────────────────────────────────────────────────────────
const clock = new THREE.Clock();
let frameCount = 0, lastFpsUpdate = 0, currentFps = 60;
let pixelRatioTarget = Math.min(devicePixelRatio, 2);

function animate(): void {
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

  updateFlippers();

  if (physics) {
    if (state.inLane) {
      // Phase 15: Set in-lane gravity via physics worker
      try {
        const bridge = getPhysicsWorker();
        bridge.setBallGravityScale(0.0);
      } catch {
        // Fallback
        physics.ballBody.setGravityScale(0.0, true);
        physics.ballBody.setLinvel({ x:0, y:0 }, true);
        physics.ballBody.setAngvel(0, true);
        physics.ballBody.setTranslation({ x:2.65, y:-5.0 }, true);
      }
    } else {
      // Phase 15: Step physics via worker (non-blocking!)
      try {
        const bridge = getPhysicsWorker();
        const substeps = currentFps > 55 ? 5 : (currentFps > 45 ? 4 : 3);
        bridge.step(dt, substeps);
        // Physics results arrive async via callback (handlePhysicsFrame)
      } catch {
        // Fallback: Single-threaded physics (original code)
        physics.world.step(physics.eventQueue);

        // ─── Phase 6: Improved B.A.M. Engine Step with Adaptive Substeps ───
        if (bamEngine) {
          // Adaptive substeps: More steps at higher FPS for smoother physics
          // This matches Newton's approach: more accurate simulation = better feel
          const substeps = currentFps > 55 ? 5 : (currentFps > 45 ? 4 : 3);
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
      if (state.ballPos.y < -6.5) {
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
          if (bonus > 0) { state.score+=bonus; dmdEvent('BONUS +'+bonus.toLocaleString()); updateHUD(); }
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

  // ─── Phase 7: Ball Save Countdown with Extended Saves ───
  if (state.ballSaveTimer > 0) {
    const prev = state.ballSaveTimer; state.ballSaveTimer -= dt;
    if (Math.ceil(state.ballSaveTimer) < Math.ceil(prev) && state.ballSaveTimer > 0) {
      const saveText = state.ballSaveMode === 'active'
        ? `BALL SAVE  ${Math.ceil(state.ballSaveTimer)}`
        : `SAVES  ${Math.ceil(state.ballSaveTimer)}`;
      dmdState.eventText = saveText; dmdState.eventTimer = 8; dmdState.mode = 'event';
    }
  } else if (state.ballSavesRemaining > 0 && state.ballSaveMode !== 'exhausted') {
    // Show available extended saves when not in countdown
    dmdState.eventText = `SAVES READY x${state.ballSavesRemaining}`;
    dmdState.eventTimer = 10;
    dmdState.mode = 'event';
  }

  updatePlunger(dt);
  updateExtraBalls(dt);
  updateParticles(dt);
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

  // ─── Phase 14: Use Graphics Pipeline for Rendering ───
  try {
    const pipeline = getGraphicsPipeline();
    if (pipeline) {
      pipeline.renderFrame(dt);
    } else {
      composer.render();  // Fallback if pipeline not initialized
    }
  } catch (error) {
    console.warn('Graphics pipeline render failed, falling back to composer:', error);
    composer.render();
  }

  if (_bgPanelActive) drawInlineBackglass();

  if (multiChannel) {
    multiChannel.postMessage({
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
  const toHex = (n: number) => '#' + ('000000'+n.toString(16)).slice(-6);
  const accent = currentTableConfig ? toHex(currentTableConfig.accentColor) : '#00ff66';
  const tcolor = currentTableConfig ? toHex(currentTableConfig.tableColor)  : '#1a4a15';

  const bg = ctx.createLinearGradient(0,0,0,H);
  bg.addColorStop(0,'#0a0a14'); bg.addColorStop(0.5,tcolor+'44'); bg.addColorStop(1,'#050508');
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
  ctx.fillText('×'+state.multiplier,W*0.08,H*0.375); ctx.restore();

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
let viewSettings: Record<string,number> = (() => { try { return JSON.parse(localStorage.getItem(VIEW_KEY)??'{}')??{}; } catch { return {}; } })();

window.toggleViewPanel = () => document.getElementById('view-panel')!.classList.toggle('open');

window.applyViewSettings = () => {
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

window.resetViewSettings = () => {
  (document.getElementById('vp-zoom') as HTMLInputElement).value='16';
  (document.getElementById('vp-tilt') as HTMLInputElement).value='0.5';
  (document.getElementById('vp-fov')  as HTMLInputElement).value='58';
  window.applyViewSettings();
};

function initViewSettings(): void {
  const {zoom=16, tilt=0.5, fov=58} = viewSettings;
  const zEl=document.getElementById('vp-zoom') as HTMLInputElement;
  const tEl=document.getElementById('vp-tilt') as HTMLInputElement;
  const fEl=document.getElementById('vp-fov')  as HTMLInputElement;
  if(zEl){zEl.value=String(zoom);(document.getElementById('vp-zoom-val') as HTMLElement).textContent=String(zoom);}
  if(tEl){tEl.value=String(tilt);(document.getElementById('vp-tilt-val') as HTMLElement).textContent=String(tilt);}
  if(fEl){fEl.value=String(fov); (document.getElementById('vp-fov-val')  as HTMLElement).textContent=String(fov);}
  if(zoom!==16||tilt!==0.5||fov!==58) window.applyViewSettings();
}

// ─── Global UI Callbacks ───────────────────────────────────────────────────────
window.switchTab = (tab: string) => {
  document.querySelectorAll('.tab-btn').forEach((b,i) => b.classList.toggle('active', ['demo','import','info','script'][i]===tab));
  document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
  (document.getElementById('tab-'+tab) as HTMLElement)?.classList.add('active');
};

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

window.loadDemoTable = async (key: string) => {
  resetGameState();
  try {
    await loadTableWithPhysicsWorker(TABLE_CONFIGS[key], scene);
    setupBackglassForTable();
  } catch (error) {
    console.error('Demo table load failed:', error);
    // Even on error, ensure modal is closed so user can interact with game
  }
  window.closeLoader();
};

window.closeLoader = async function closeLoader() {
  (document.getElementById('loader-modal') as HTMLElement).style.display='none';
  if (!currentTableConfig) {
    try {
      await loadTableWithPhysicsWorker(TABLE_CONFIGS['classic'], scene);
      setupBackglassForTable();
    } catch (error) {
      console.error('Classic table load failed in closeLoader:', error);
    }
  }
};

(document.getElementById('open-loader') as HTMLElement).onclick = () => {
  (document.getElementById('loader-modal') as HTMLElement).style.display='flex';
};

window.toggleFullscreen = () => {
  if (!document.fullscreenElement) document.documentElement.requestFullscreen?.().catch(()=>{});
  else document.exitFullscreen?.();
};

window.toggleDMDMode = toggleDMDMode;

let _dmdHidden = false;
window.toggleHideDMD = () => {
  _dmdHidden = !_dmdHidden;
  const wrap=document.getElementById('dmd-wrap')!, btn=document.getElementById('hide-dmd-btn')!;
  wrap.style.display=_dmdHidden?'none':'';
  btn.classList.toggle('dmd-hidden',_dmdHidden);
};

// ─── Resize (with Responsive Adjustments) ─────────────────────────────────────
window.addEventListener('resize', () => {
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

  // Apply to camera
  camera.aspect = newAspect;
  camera.position.set(0, newTilt, newZoom);
  camera.fov = newFOV;
  camera.updateProjectionMatrix();

  // Update renderer + composer + pixel ratio
  renderer.setSize(innerWidth, innerHeight);
  renderer.setPixelRatio(getOptimalPixelRatio());
  composer.setSize(innerWidth, innerHeight);

  // Update FXAA resolution
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
  (window as any).FPW_DEVICE = detectDeviceType();
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

window.selectMsLayout = (n: number) => {
  _msLayout=n; [1,2,3].forEach(i => document.getElementById('ms-card-'+i)?.classList.toggle('selected',i===n));
};
window.openMultiscreenModal  = () => document.getElementById('multiscreen-modal')!.classList.add('open');
window.closeMultiscreenModal = () => document.getElementById('multiscreen-modal')!.classList.remove('open');

window.autoDetectScreens = async () => {
  const info=document.getElementById('ms-detect-info')!; info.classList.add('visible'); info.innerHTML='<span>Scanning...</span>';
  let screenCount=1;
  try {
    if ('getScreenDetails' in window) { const d=await (window as any).getScreenDetails(); screenCount=d.screens.length; }
    else if ((window.screen as any).isExtended) screenCount=2;
  } catch { /* ignore */ }
  if(screenCount>=3){info.innerHTML=`<span>✓ ${screenCount} screens</span> — 3-screen empfohlen`;window.selectMsLayout(3);}
  else if(screenCount===2){info.innerHTML=`<span>✓ 2 screens</span> — 2-screen empfohlen`;window.selectMsLayout(2);}
  else {info.innerHTML=`<span>1 screen</span>`;window.selectMsLayout(1);}
};

function _winSpec(role: string, dw: number, dh: number): string {
  try { const s=JSON.parse(localStorage.getItem('fpw_winpos_'+role)??'null'); if(s?.w>100) return `width=${s.w},height=${s.h},left=${s.x},top=${s.y}`; } catch { /* ignore */ }
  return `width=${dw},height=${dh}`;
}

window.applyMsLayout = () => {
  window.closeMultiscreenModal?.();
  ['dmd','backglass'].forEach(role=>{ if(_msWindows[role]&&!(_msWindows[role] as Window).closed)(_msWindows[role] as Window).close(); delete _msWindows[role]; });
  stopInlineBackglass();
  const btn=document.getElementById('multiscreen-btn')!, hdBtn=document.getElementById('hide-dmd-btn')!;
  const base=location.origin+location.pathname, sw=screen.width, sh=screen.height;
  if(_msLayout===1){
    initInlineBackglass(); btn.classList.add('active-multi');
  } else if(_msLayout===2){
    _msWindows['backglass']=window.open(base+'?role=backglass','fpw_backglass',_winSpec('backglass',sw,sh)+',toolbar=no,menubar=no,scrollbars=no,resizable=yes');
    if(hdBtn){hdBtn.style.display='block';} btn.classList.add('active-multi');
    showNotification('2-Screen: Backglass-Fenster auf zweiten Monitor ziehen');
  } else if(_msLayout===3){
    _msWindows['backglass']=window.open(base+'?role=backglass&nodmd=1','fpw_backglass',_winSpec('backglass',Math.round(sw*0.75),Math.round(sh*0.75))+',toolbar=no,menubar=no,scrollbars=no,resizable=yes');
    _msWindows['dmd']      =window.open(base+'?role=dmd','fpw_dmd',_winSpec('dmd',Math.round(sw*0.55),Math.round(sh*0.28))+',toolbar=no,menubar=no,scrollbars=no,resizable=yes');
    if(hdBtn) hdBtn.style.display='block'; btn.classList.add('active-multi');
    showNotification('3-Screen: Fenster auf gewünschte Bildschirme ziehen');
  }
};

// ─── Secondary Windows ────────────────────────────────────────────────────────
function setupDMDWindow(): void {
  document.title='FPW — DMD';
  window.addEventListener('beforeunload',()=>{
    try{localStorage.setItem('fpw_winpos_dmd',JSON.stringify({x:window.screenX,y:window.screenY,w:window.outerWidth,h:window.outerHeight}));}catch{}
    disposePhysicsWorker();
  });
  const wrap=document.getElementById('dmd-wrap')!, canvas=document.getElementById('dmd') as HTMLCanvasElement;
  const resizeDMD=()=>{const a=DMD_W/DMD_H,ww=innerWidth-60,wh=innerHeight-40;let w=ww,h=ww/a;if(h>wh){h=wh;w=h*a;}canvas.style.width=w+'px';canvas.style.height=h+'px';};
  resizeDMD(); window.addEventListener('resize',resizeDMD);
  const dmdLoop=()=>{requestAnimationFrame(dmdLoop);dmdState.animFrame++;
    switch(dmdState.mode){case'attract':dmdRenderAttract();break;case'playing':dmdRenderPlaying();break;case'event':dmdRenderEvent();break;case'gameover':dmdRenderGameOver();break;}
    if(dmdState.mode==='event'){dmdState.eventTimer--;if(dmdState.eventTimer<=0)dmdState.mode='playing';}
  };
  dmdLoop();
  if(multiChannel) multiChannel.onmessage=({data})=>{if(data.type!=='state')return;Object.assign(dmdState,{mode:data.dmdMode,eventText:data.dmdEventText,animFrame:data.dmdAnimFrame,scrollX:data.dmdScrollX,eventTimer:data.dmdEventTimer});state.score=data.score;state.ballNum=data.ballNum;state.multiplier=data.multiplier;state.lastRank=data.lastRank;state.lastScore=data.lastScore;};
}

function setupBackglassWindow(): void {
  document.title='FPW — Backglass';
  window.addEventListener('beforeunload',()=>{try{localStorage.setItem('fpw_winpos_backglass',JSON.stringify({x:window.screenX,y:window.screenY,w:window.outerWidth,h:window.outerHeight}));}catch{}disposePhysicsWorker();});
  const canvas=document.getElementById('backglass-canvas') as HTMLCanvasElement;
  const showEmbedDMD=!new URLSearchParams(location.search).has('nodmd');
  let bgState:any={score:0,ballNum:1,multiplier:1,tableName:'FUTURE PINBALL',tableAccent:0x00ff66,tableColor:0x1a4a15,dmdMode:'attract',dmdEventText:'',dmdAnimFrame:0,dmdScrollX:0,dmdEventTimer:0,lastRank:0,lastScore:0,highScores:[]};

  const setSize=()=>{canvas.width=innerWidth;canvas.height=innerHeight;};
  setSize(); window.addEventListener('resize',setSize);

  const bgLoop=()=>{
    requestAnimationFrame(bgLoop);
    bgState.dmdAnimFrame++;
    if(bgState.dmdEventTimer>0){bgState.dmdEventTimer--;bgState.dmdMode='event';}
    else if(bgState.dmdMode==='event') bgState.dmdMode='playing';
    Object.assign(state,{score:bgState.score,ballNum:bgState.ballNum,multiplier:bgState.multiplier,lastRank:bgState.lastRank,lastScore:bgState.lastScore});
    Object.assign(dmdState,{mode:bgState.dmdMode,eventText:bgState.dmdEventText,animFrame:bgState.dmdAnimFrame,scrollX:bgState.dmdScrollX,eventTimer:bgState.dmdEventTimer});
    drawBGCanvas(canvas,bgState,showEmbedDMD);
  };
  bgLoop();
  if(multiChannel) multiChannel.onmessage=({data})=>{if(data.type!=='state')return;Object.assign(bgState,{score:data.score,ballNum:data.ballNum,multiplier:data.multiplier,tableName:data.tableName,tableAccent:data.tableAccent,tableColor:data.tableColor,dmdMode:data.dmdMode,dmdEventText:data.dmdEventText,dmdAnimFrame:data.dmdAnimFrame,dmdScrollX:data.dmdScrollX,dmdEventTimer:data.dmdEventTimer,lastRank:data.lastRank,lastScore:data.lastScore,highScores:data.highScores||[]});};
}

function drawBGCanvas(canvas: HTMLCanvasElement, bgState: any, showEmbedDMD: boolean): void {
  const ctx=canvas.getContext('2d')!; if(!canvas.width)return;
  const W=canvas.width,H=canvas.height;
  const toHex=(n:number)=>'#'+('000000'+n.toString(16)).slice(-6);
  const accent=toHex(bgState.tableAccent||0x00ff66), tcolor=toHex(bgState.tableColor||0x1a4a15);
  const bg=ctx.createLinearGradient(0,0,0,H);
  bg.addColorStop(0,'#0a0a14');bg.addColorStop(0.5,tcolor+'44');bg.addColorStop(1,'#050508');
  ctx.fillStyle=bg; ctx.fillRect(0,0,W,H);
  ctx.save();ctx.shadowColor=accent;ctx.shadowBlur=25;ctx.fillStyle=accent;
  ctx.font=`bold ${Math.min(H*0.06,W*0.07)}px "Courier New",monospace`;ctx.textAlign='center';ctx.textBaseline='top';
  ctx.fillText((bgState.tableName||'FUTURE PINBALL').toUpperCase(),W/2,H*0.03);ctx.restore();
  ctx.save();ctx.shadowColor='#ff6600';ctx.shadowBlur=30;ctx.fillStyle='#ff6600';
  ctx.font=`bold ${Math.min(H*0.14,W*0.12)}px "Courier New",monospace`;ctx.textAlign='center';ctx.textBaseline='top';
  ctx.fillText((bgState.score||0).toLocaleString(),W/2,H*0.15);ctx.restore();
  ctx.save();ctx.fillStyle='#ffcc00';ctx.font=`bold ${Math.min(H*0.07,W*0.06)}px "Courier New",monospace`;ctx.textAlign='left';ctx.textBaseline='top';
  ctx.fillText('×'+(bgState.multiplier||1),W*0.08,H*0.38);ctx.restore();
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
        (window as any).showLibrarySelector(lib);
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
  let files: File[] = [];
  const dirPathInput = document.getElementById('table-dir-path') as HTMLInputElement;

  if ('showDirectoryPicker' in window) {
    try {
      const dirHandle = await (window as any).showDirectoryPicker();
      dirPathInput.value = dirHandle.name;
      for await (const [name, handle] of dirHandle.entries()) {
        if (name.endsWith('.fpt') || name.endsWith('.fp')) {
          files.push(await (handle as any).getFile());
        }
      }
    } catch (e) {
      logMsg(`❌ Directory picker error: ${e}`, 'error');
      return;
    }
  } else {
    // Fallback: use webkitdirectory
    const tableInput = document.getElementById('table-dir-input') as HTMLInputElement;
    tableInput.onchange = (e) => {
      const input = e.target as HTMLInputElement;
      if (input.files) {
        Array.from(input.files).forEach(f => {
          if (f.name.endsWith('.fpt') || f.name.endsWith('.fp')) {
            files.push(f);
          }
        });
        dirPathInput.value = 'Tabellenverzeichnis';
        renderTableFileGrid(files);
      }
    };
    tableInput.click();
    return;
  }
  renderTableFileGrid(files);
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
    card.innerHTML = `<div class="preview">🎱</div><h3>${f.name.replace(/\.fpt$/i, '')}</h3><span>${sizeMB} MB</span>`;
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

// ─── Library Directory Browser ──────────────────────────────────────────────────
async function browseLibraryDirectory(): Promise<void> {
  let files: File[] = [];
  const dirPathInput = document.getElementById('lib-dir-path') as HTMLInputElement;

  if ('showDirectoryPicker' in window) {
    try {
      const dirHandle = await (window as any).showDirectoryPicker();
      dirPathInput.value = dirHandle.name;
      for await (const [name, handle] of dirHandle.entries()) {
        if (name.endsWith('.fpl')) {
          files.push(await (handle as any).getFile());
        }
      }
    } catch (e) {
      logMsg(`❌ Directory picker error: ${e}`, 'error');
      return;
    }
  } else {
    // Fallback: use webkitdirectory
    const libInput = document.getElementById('lib-dir-input') as HTMLInputElement;
    libInput.onchange = (e) => {
      const input = e.target as HTMLInputElement;
      if (input.files) {
        Array.from(input.files).forEach(f => {
          if (f.name.endsWith('.fpl')) {
            files.push(f);
          }
        });
        dirPathInput.value = 'Bibliotheksverzeichnis';
        renderLibraryFileList(files);
      }
    };
    libInput.click();
    return;
  }
  renderLibraryFileList(files);
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
});

// ─── Phase 15: Cleanup Physics Worker on Exit ──────────────────────────────────
window.addEventListener('beforeunload', () => {
  disposePhysicsWorker();
});

// ─── Start ────────────────────────────────────────────────────────────────────
if (FPW_ROLE === 'dmd') {
  renderer.domElement.remove();
  setupDMDWindow();
} else if (FPW_ROLE === 'backglass') {
  renderer.domElement.remove();
  setupBackglassWindow();
} else {
  (async () => {
    try { await initPhysics(); } catch(e) { console.warn('Rapier init fehlgeschlagen:', e); }

    // Custom-Tisch aus Editor laden (wenn ?load=custom gesetzt)
    const loadCustom = new URLSearchParams(location.search).get('load') === 'custom';
    if (loadCustom) {
      try {
        const cfg = JSON.parse(localStorage.getItem('fpw_custom_table') ?? 'null');
        if (cfg?.name && cfg?.bumpers) {
          await loadTableWithPhysicsWorker(cfg, scene);
          (document.getElementById('loader-modal') as HTMLElement).style.display = 'none';
          showNotification('✅ Custom-Tisch geladen!');
        } else { await loadTableWithPhysicsWorker(TABLE_CONFIGS['classic'], scene); }
      } catch { await loadTableWithPhysicsWorker(TABLE_CONFIGS['classic'], scene); }
    } else {
      try {
        await loadTableWithPhysicsWorker(TABLE_CONFIGS['classic'], scene);
      } catch (error) {
        console.error('Initial classic table load failed:', error);
      }
    }

    // Initialize B.A.M. Engine (after table is loaded and currentTableConfig is set)
    const bam = new BAMEngine(currentTableConfig?.name || 'classic', mainSpot);
    setBAMEngine(bam);
    console.log('✅ B.A.M. Engine initialized');

    // Phase 13 Task 2: Initialize BAM Bridge (connects VBScript to BAMEngine)
    const bamBridge = initializeBamBridge(bam);
    console.log('✅ B.A.M. Bridge initialized');

    // Phase 13: Load animations from FPT resources into BAM engine
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

    // Phase 13 Task 3: Initialize animation binding system
    const animationBindingMgr = initializeAnimationBinding();
    const animationScheduler = initializeAnimationScheduler();
    console.log('✅ Animation binding system initialized');

    // Phase 13 Task 5: Initialize animation debugger (Ctrl+D to toggle)
    const animationDebugger = initializeAnimationDebugger();
    if (bamEngine) {
      animationDebugger.setBamEngine(bamEngine);
    }
    console.log('✅ Animation debugger initialized (Ctrl+D to toggle)');

    // ─── Phase 5: Apply initial quality preset ───
    applyQualityPreset();

    animate();
    initInlineBackglass();
    document.getElementById('multiscreen-btn')?.classList.add('active-multi');
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
(window as any).installPWA = installPWA;

// ─── Phase 5: Quality System Exports ──────────────────────────────────────────
// Public API for quality and performance management
(window as any).setQualityPreset = (name: string) => {
  profiler.setQualityPreset(name);
  applyQualityPreset();
  console.log(`✅ Quality preset changed to: ${name}`);
};

(window as any).getQualityPreset = () => profiler.getQualityPreset();
(window as any).getAvailableQualityPresets = () => Object.keys(QUALITY_PRESETS);
(window as any).toggleAutoQuality = () => {
  const current = profiler.isAutoAdjusting();
  profiler.setAutoAdjust(!current);
  console.log(`🎯 Auto-quality adjustment: ${!current ? 'ON' : 'OFF'}`);
};

(window as any).getPerformanceMetrics = () => profiler.getMetrics();
(window as any).togglePerformanceMonitor = () => {
  showProfiler = !showProfiler;
  localStorage.setItem('fpw_show_profiler', showProfiler.toString());
  console.log(`📊 Performance monitor: ${showProfiler ? 'ON' : 'OFF'}`);
};

// ─── Phase 14: Graphics Pipeline System Exports ──────────────────────────────────
// Public API for graphics system management (geometry pooling, materials, lighting)
(window as any).getGraphicsPipeline = getGraphicsPipeline;
(window as any).getGeometryPool = () => getGraphicsPipeline()?.getGeometryPool?.();
(window as any).getMaterialFactory = () => getGraphicsPipeline()?.getMaterialFactory?.();
(window as any).getLightManager = () => getGraphicsPipeline()?.getLightManager?.();

// TypeScript: globale Funktionen
declare global {
  interface Window {
    switchTab:           (tab: string) => void;
    loadDemoTable:       (key: string) => void;
    closeLoader:         () => void;
    toggleFullscreen:    () => void;
    toggleDMDMode:       () => void;
    toggleHideDMD:       () => void;
    toggleViewPanel:     () => void;
    applyViewSettings:   () => void;
    resetViewSettings:   () => void;
    showNotification:    (msg: string) => void;
    openMultiscreenModal:  () => void;
    closeMultiscreenModal: () => void;
    autoDetectScreens:     () => Promise<void>;
    selectMsLayout:        (n: number) => void;
    applyMsLayout:         () => void;
    setQualityPreset:      (name: string) => void;
    getQualityPreset:      () => any;
    getAvailableQualityPresets: () => string[];
    toggleAutoQuality:     () => void;
    getPerformanceMetrics: () => any;
    togglePerformanceMonitor: () => void;
    getGraphicsPipeline:   () => any;
    getGeometryPool:       () => any;
    getMaterialFactory:    () => any;
    getLightManager:       () => any;
  }
}

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

