/**
 * table.ts — TABLE_CONFIGS, Tisch-Builder, Physik-Bodies, Scoring
 */
import * as THREE from 'three';
import RAPIER from '@dimforge/rapier2d-compat';
import type { TableConfig, BumperMesh, TargetMesh } from './types';
import {
  state, fptResources, physics, currentTableConfig, tableGroup, extraBalls,
  bumpers, targets, slingshots, ramps,
  setCurrentTableConfig, setTableGroup, setPlungerKnob,
  cb,
} from './game';
import {
  callScriptBumper, callScriptTarget, callScriptSlingshot,
} from './script-engine';
import { playBumperSoundWithIntensity } from './audio';
import { getAnimationBindingManager } from './mechanics/animation-binding';
import { getAnimationScheduler } from './mechanics/animation-scheduler';
import { getBamBridge } from './bam-bridge';
import { getGraphicsPipeline } from './main';
// Phase 15: Future imports (modules not yet integrated to main)
// import { PlayfieldMeshBuilder, BumperPosition, TargetPosition } from './geometry/playfield-mesh-builder';
// import { TextureAnalyzer } from './graphics/texture-analyzer';
// import { getNormalMapGenerator } from './graphics/normal-map-generator';

// ─── PHASE 2: Advanced Lighting & Effects System ───────────────────────────────
/**
 * Advanced lighting controller for special effects and dynamic light updates
 * Manages per-element accent lights, special effect lights, and animations
 */
class AdvancedLightingSystem {
  private effectLights: THREE.Light[] = [];
  private pulseAnimations: Array<{
    light: THREE.Light;
    targetIntensity: number;
    duration: number;
    startTime: number;
  }> = [];
  private scene: THREE.Scene;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  /**
   * Trigger multiball flash: rapid pulsing white light across playfield
   */
  multiballFlash(duration: number = 500): void {
    const flash = new THREE.PointLight(0xffffff, 3.0, 20.0);
    flash.position.set(0, 1, 5);
    flash.castShadow = true;
    this.scene.add(flash);
    this.effectLights.push(flash);

    // Pulse animation
    this.addPulseAnimation(flash, 0, duration);

    // Auto-remove after duration
    setTimeout(() => {
      this.scene.remove(flash);
      this.effectLights = this.effectLights.filter(l => l !== flash);
    }, duration);
  }

  /**
   * Trigger ramp completion effect: spotlight sweep
   */
  rampCompletionEffect(duration: number = 600): void {
    const sweep = new THREE.SpotLight(0x00ff66, 2.5, 25, Math.PI / 3, 0.5, 2);
    sweep.position.set(0, 3, 8);
    sweep.target.position.set(0, 0, 0);
    sweep.castShadow = true;
    this.scene.add(sweep);
    this.scene.add(sweep.target);
    this.effectLights.push(sweep);

    // Pulse effect
    this.addPulseAnimation(sweep, 0.5, duration);

    // Auto-remove
    setTimeout(() => {
      this.scene.remove(sweep);
      this.scene.remove(sweep.target);
      this.effectLights = this.effectLights.filter(l => l !== sweep);
    }, duration);
  }

  /**
   * Trigger ball drain warning: red pulse
   */
  ballDrainWarning(duration: number = 400): void {
    const warning = new THREE.PointLight(0xff3333, 2.0, 15.0);
    warning.position.set(0, -4, 5);
    warning.castShadow = true;
    this.scene.add(warning);
    this.effectLights.push(warning);

    // Rapid pulse
    this.addPulseAnimation(warning, 0, duration, 100);  // 100ms pulse interval

    // Auto-remove
    setTimeout(() => {
      this.scene.remove(warning);
      this.effectLights = this.effectLights.filter(l => l !== warning);
    }, duration);
  }

  /**
   * Add a pulse animation to a light
   */
  private addPulseAnimation(
    light: THREE.Light,
    minIntensity: number,
    duration: number,
    pulseInterval: number = 200
  ): void {
    const maxIntensity = (light as any).intensity || 2.0;
    const startTime = Date.now();
    const startIntensity = (light as any).intensity;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      if (elapsed > duration) return;

      // Pulse effect: rapid on/off based on pulseInterval
      const pulseCycle = (elapsed % pulseInterval) / pulseInterval;
      const isOn = pulseCycle < 0.5;
      const fadeOut = Math.max(0, 1 - elapsed / duration);  // Fade out at end

      (light as any).intensity = isOn ? maxIntensity * fadeOut : minIntensity * fadeOut;

      requestAnimationFrame(animate);
    };

    animate();
  }

  /**
   * Update all pulse animations (called each frame)
   */
  update(): void {
    const now = Date.now();

    this.pulseAnimations = this.pulseAnimations.filter(anim => {
      const elapsed = now - anim.startTime;
      if (elapsed > anim.duration) {
        return false;
      }

      const progress = elapsed / anim.duration;
      const easeOut = 1 - (progress * progress);  // Ease out curve
      (anim.light as any).intensity = anim.targetIntensity * easeOut;

      return true;
    });
  }

  /**
   * Clean up all effect lights
   */
  dispose(): void {
    this.effectLights.forEach(light => this.scene.remove(light));
    this.effectLights = [];
  }
}

// Global lighting system instance (will be initialized in buildTable)
let advancedLighting: AdvancedLightingSystem | null = null;

/**
 * Get or create the advanced lighting system
 */
export function getAdvancedLighting(scene: THREE.Scene): AdvancedLightingSystem {
  if (!advancedLighting) {
    advancedLighting = new AdvancedLightingSystem(scene);
  }
  return advancedLighting;
}

// ─── TABLE_CONFIGS ────────────────────────────────────────────────────────────
export const TABLE_CONFIGS: Record<string, TableConfig> = {
  pharaoh: {
    name: 'Pharaoh\'s Gold', tableColor: 0x2d1810, accentColor: 0xffd700,
    bumpers: [
      { x:-0.8, y:2.5, color:0xffaa00 }, { x:0.8, y:2.5, color:0xffaa00 }, { x:0.0, y:3.8, color:0xffaa00 },
    ],
    targets: [
      { x:-1.6, y:0.8, color:0xffd700 }, { x:0.0, y:-0.2, color:0xffd700 }, { x:1.6, y:0.8, color:0xffd700 },
    ],
    ramps: [
      { x1:-2.5, y1:0.0, x2:-1.2, y2:2.0, color:0xcc8800 },
      { x1: 2.0, y1:0.0, x2: 1.2, y2:2.0, color:0xcc8800 },
    ],
    lights: [
      { color:0xffd700, intensity:0.8, dist:9, x:0,  y:3,  z:3 },
      { color:0xcc8800, intensity:0.6, dist:8, x:-2, y:2,  z:3 },
      { color:0xcc8800, intensity:0.6, dist:8, x:2,  y:2,  z:3 },
    ],
  },
  dragon: {
    name: 'Dragon\'s Castle', tableColor: 0x1a1a1a, accentColor: 0xff0000,
    bumpers: [
      { x:-1.4, y:1.5, color:0xff2020 }, { x:1.4, y:1.5, color:0xff2020 },
      { x:0.0,  y:2.8, color:0xff2020 }, { x:-0.8, y:3.8, color:0xcc0000 }, { x:0.8, y:3.8, color:0xcc0000 },
    ],
    targets: [
      { x:-1.8, y:0.8, color:0xff5500 }, { x:-1.8, y:-0.3, color:0xff5500 },
      { x:1.8, y:0.8, color:0xff5500 }, { x:1.8, y:-0.3, color:0xff5500 },
    ],
    ramps: [
      { x1:-2.6, y1:0.0, x2:-1.5, y2:2.2, color:0xaa2200 },
      { x1: 2.0, y1:0.0, x2: 1.5, y2:2.2, color:0xaa2200 },
      { x1:-0.8, y1:4.2, x2: 0.8, y2:5.0, color:0x880000 },
    ],
    lights: [
      { color:0xff2200, intensity:1.0, dist:11, x:0,  y:2,  z:4 },
      { color:0xcc0000, intensity:0.7, dist:9,  x:-2, y:3,  z:3 },
      { color:0xcc0000, intensity:0.7, dist:9,  x:2,  y:3,  z:3 },
      { color:0xff0000, intensity:0.5, dist:8,  x:0,  y:-1, z:3 },
    ],
  },
  knight: {
    name: 'Knight\'s Quest', tableColor: 0x2d2416, accentColor: 0xffff00,
    bumpers: [
      { x:-0.9, y:2.2, color:0xffdd44 }, { x:0.9, y:2.2, color:0xffdd44 },
    ],
    targets: [
      { x:-1.6, y:0.5, color:0xffee66 }, { x:0.0, y:-0.5, color:0xffee66 }, { x:1.6, y:0.5, color:0xffee66 },
    ],
    ramps: [
      { x1:-2.2, y1:0.5, x2:-1.0, y2:2.5, color:0xdd9900 },
    ],
    lights: [
      { color:0xffdd44, intensity:0.7, dist:8, x:0, y:2, z:3 },
      { color:0xffff00, intensity:0.5, dist:7, x:-2, y:0, z:3 },
    ],
  },
  cyber: {
    name: 'Cyber Nexus', tableColor: 0x0a0a1a, accentColor: 0x00ff88,
    bumpers: [
      { x:-1.2, y:1.6, color:0x00ffaa }, { x:1.2, y:1.6, color:0x00ffaa },
      { x:0.0,  y:3.0, color:0x00ffaa }, { x:-0.7, y:4.0, color:0x00dd88 }, { x:0.7, y:4.0, color:0x00dd88 },
    ],
    targets: [
      { x:-1.8, y:0.9, color:0x0088ff }, { x:-1.8, y:-0.2, color:0x0088ff },
      { x:1.8, y:0.9, color:0x0088ff }, { x:1.8, y:-0.2, color:0x0088ff },
    ],
    ramps: [
      { x1:-2.5, y1:-0.5, x2:-1.2, y2:2.2, color:0x0099dd },
      { x1: 2.0, y1:-0.5, x2: 1.2, y2:2.2, color:0x0099dd },
    ],
    lights: [
      { color:0x00ff88, intensity:0.9, dist:10, x:0,  y:2,  z:4 },
      { color:0x0088ff, intensity:0.7, dist:9,  x:-2, y:2,  z:3 },
      { color:0x0088ff, intensity:0.7, dist:9,  x:2,  y:2,  z:3 },
      { color:0x00ffff, intensity:0.5, dist:8,  x:0,  y:-2, z:3 },
    ],
  },
  neon: {
    name: 'Neon City', tableColor: 0x1a0a2e, accentColor: 0xff006e,
    bumpers: [
      { x:-0.9, y:2.3, color:0xff1493 }, { x:0.9, y:2.3, color:0xff1493 }, { x:0.0, y:3.7, color:0xdd0066 },
    ],
    targets: [
      { x:-1.6, y:0.6, color:0xff69b4 }, { x:0.0, y:-0.4, color:0xff69b4 }, { x:1.6, y:0.6, color:0xff69b4 },
    ],
    ramps: [
      { x1:-2.3, y1:0.2, x2:-1.0, y2:2.0, color:0xdd0099 },
      { x1: 2.0, y1:0.2, x2: 1.0, y2:2.0, color:0xdd0099 },
    ],
    lights: [
      { color:0xff006e, intensity:0.8, dist:9, x:0,  y:2, z:3 },
      { color:0xff1493, intensity:0.6, dist:8, x:-2, y:2, z:3 },
      { color:0xff1493, intensity:0.6, dist:8, x:2,  y:2, z:3 },
    ],
  },
  jungle: {
    name: 'Jungle Expedition', tableColor: 0x1a2d1a, accentColor: 0x00dd44,
    bumpers: [
      { x:-0.9, y:1.8, color:0x00dd44 }, { x:0.9, y:1.8, color:0x00dd44 },
      { x:0.0,  y:3.0, color:0x00cc33 }, { x:-1.4, y:3.5, color:0x22aa44 },
    ],
    targets: [
      { x:-1.6, y:0.7, color:0x11ff44 }, { x:0.0, y:-0.3, color:0x11ff44 }, { x:1.6, y:0.7, color:0x11ff44 },
    ],
    ramps: [
      { x1:-2.4, y1:0.1, x2:-1.1, y2:2.1, color:0x00aa00 },
      { x1: 2.0, y1:0.1, x2: 1.1, y2:2.1, color:0x00aa00 },
    ],
    lights: [
      { color:0x00dd44, intensity:0.8, dist:9, x:0,  y:2,  z:3 },
      { color:0x11aa22, intensity:0.6, dist:8, x:-2, y:1,  z:3 },
      { color:0x11aa22, intensity:0.6, dist:8, x:2,  y:1,  z:3 },
    ],
  },
};

// ─── PHASE 1: Enhanced Geometry & PBR Materials ────────────────────────────────
// Advanced 3D geometry builders with improved materials, normal maps, and LOD

/**
 * Enhanced geometry configuration for better visual quality
 */
interface GeometryConfig {
  useLargePolygons: boolean;  // High-detail geometry
  useNormalMaps: boolean;      // Normal map support
  useEnvMap: boolean;          // Environment mapping
  enableSSS: boolean;          // Subsurface scattering for ball
}

const geometryConfig: GeometryConfig = {
  useLargePolygons: true,
  useNormalMaps: true,
  useEnvMap: true,
  enableSSS: true,
};

/**
 * Create procedural normal map for surfaces (fallback when extracted map unavailable)
 */
function createProceduralNormalMap(width: number = 512, height: number = 512): THREE.Texture {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  // Create base purple (normal map neutral)
  ctx.fillStyle = '#8080ff';
  ctx.fillRect(0, 0, width, height);

  // Add subtle directional noise for metallic brushing effect
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;

  for (let i = 0; i < data.length; i += 4) {
    const noise = Math.random() * 10 - 5;  // -5 to +5
    data[i] = Math.max(0, Math.min(255, 128 + noise));        // R (X)
    data[i + 1] = Math.max(0, Math.min(255, 128 + noise/2));  // G (Y)
    data[i + 2] = 255;                                         // B (Z) = 1.0
  }

  ctx.putImageData(imageData, 0, 0);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/**
 * Create simple environment map (fallback)
 */
function createEnvironmentMap(): THREE.Texture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  // Gradient: darker at top, brighter at bottom
  const gradient = ctx.createLinearGradient(0, 0, 0, 256);
  gradient.addColorStop(0, '#1a1a2e');
  gradient.addColorStop(0.5, '#4a4a6a');
  gradient.addColorStop(1, '#2a2a3e');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 512, 256);

  const texture = new THREE.CanvasTexture(canvas);
  texture.mapping = THREE.EquirectangularReflectionMapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/**
 * Enhanced bumper geometry with crown detail
 */
function buildEnhancedBumper(
  x: number,
  y: number,
  color: number,
  lod: 'high' | 'med' | 'low' = 'high',
  size: number = 1.0,
  lightCfg?: { intensity: number; distance: number },
  geomPool?: any
): THREE.Group {
  const group = new THREE.Group();
  group.position.set(x, y, 0.125);

  // Segment counts based on LOD
  const baseSegs = lod === 'high' ? 32 : lod === 'med' ? 20 : 12;
  const ringTubes = lod === 'high' ? 12 : 8;
  const ringSegs = lod === 'high' ? 48 : lod === 'med' ? 32 : 20;
  const capSegs = lod === 'high' ? 24 : lod === 'med' ? 16 : 10;

  // Procedural normal map for brushed metal base
  const baseNormalMap = geometryConfig.useNormalMaps ? createProceduralNormalMap(256, 256) : undefined;

  const baseMat = new THREE.MeshStandardMaterial({
    color: 0x222233,
    metalness: 0.8,
    roughness: 0.3,
    normalMap: baseNormalMap,
    normalScale: new THREE.Vector2(0.4, 0.4),
  });

  const ringNormalMap = geometryConfig.useNormalMaps ? createProceduralNormalMap(256, 256) : undefined;
  const ringMat = new THREE.MeshStandardMaterial({
    color,
    emissive: color,
    emissiveIntensity: 1.2,
    roughness: 0.2,
    metalness: 0.5,
    normalMap: ringNormalMap,
    normalScale: new THREE.Vector2(0.3, 0.3),
  });

  // ─── Phase 14: Use geometry pool for shared geometries ───
  const pool = getGraphicsPipeline()?.getGeometryPool();

  // Base: Main cylinder (from pool or fallback)
  const baseGeom = pool?.getCylinder(0.45, 0.20, baseSegs) ?? new THREE.CylinderGeometry(0.45, 0.55, 0.20, baseSegs);
  const base = new THREE.Mesh(baseGeom, baseMat);
  base.rotation.x = Math.PI / 2;
  base.castShadow = true;
  base.receiveShadow = true;
  group.add(base);

  // Ring: Enhanced with more geometry (from pool or fallback)
  const ringGeom = pool?.getTorus(0.36, 0.10, ringTubes, ringSegs) ?? new THREE.TorusGeometry(0.36, 0.10, ringTubes, ringSegs);
  const ring = new THREE.Mesh(ringGeom, ringMat);
  ring.position.z = 0.10;
  ring.castShadow = true;
  ring.receiveShadow = true;
  group.add(ring);

  // Cap: Glass/lens with refraction
  const capMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: color,
    emissiveIntensity: 0.6,
    roughness: 0.1,
    metalness: 0.8,
  });

  // Cap: from pool or fallback
  const capGeom = pool?.getCylinder(0.24, 0.15, capSegs) ?? new THREE.CylinderGeometry(0.24, 0.28, 0.15, capSegs);
  const cap = new THREE.Mesh(capGeom, capMat);
  cap.rotation.x = Math.PI / 2;
  cap.position.z = 0.18;
  cap.castShadow = true;
  cap.receiveShadow = true;
  group.add(cap);

  // Optional: Glass lens on top (icosahedron for smooth reflections)
  if (lod === 'high' && geometryConfig.useLargePolygons) {
    const lensMat = new THREE.MeshStandardMaterial({
      color: 0xccddff,
      transparent: true,
      opacity: 0.6,
      metalness: 0.1,
      roughness: 0.05,
      emissive: color,
      emissiveIntensity: 0.3,
    });

    const lens = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.25, 3),
      lensMat
    );
    lens.position.z = 0.28;
    lens.castShadow = true;
    group.add(lens);
  }

  // Lighting
  const lightIntensity = lightCfg?.intensity ?? 0.9;
  const lightDistance = lightCfg?.distance ?? 4.5;
  const pl = new THREE.PointLight(color, lightIntensity, lightDistance);
  pl.position.set(0, 0, 0.5);
  pl.castShadow = true;
  group.add(pl);

  // Scale and mark as enhanced
  group.scale.setScalar(size);
  const mesh = group as unknown as THREE.Mesh;
  mesh.userData = {
    light: pl,
    ringMat,
    baseMat,
    color,
    hit: false,
    lod,
    size,
    enhanced: true,
  };

  return mesh as THREE.Group;
}

/**
 * Enhanced target geometry with beveled frame and indicator light
 */
function buildEnhancedTarget(
  x: number,
  y: number,
  color: number,
  lightCfg?: { intensity: number; distance: number },
  geomPool?: any
): THREE.Group {
  const g = new THREE.Group();
  g.position.set(x, y, 0.18);

  // Face with normal map for detail
  const faceNormalMap = geometryConfig.useNormalMaps ? createProceduralNormalMap(256, 256) : undefined;
  const faceMat = new THREE.MeshStandardMaterial({
    color,
    emissive: color,
    emissiveIntensity: 0.7,
    roughness: 0.3,
    metalness: 0.2,
    normalMap: faceNormalMap,
    normalScale: new THREE.Vector2(0.3, 0.3),
  });

  const face = new THREE.Mesh(geomPool?.getBox(0.55, 0.42, 0.08) ?? new THREE.BoxGeometry(0.55, 0.42, 0.08), faceMat);
  face.position.z = 0.06;
  face.castShadow = true;
  face.receiveShadow = true;
  g.add(face);

  // Backing support structure
  const backMat = new THREE.MeshStandardMaterial({
    color: 0x333344,
    roughness: 0.6,
    metalness: 0.5,
  });

  const backing = new THREE.Mesh(geomPool?.getBox(0.65, 0.52, 0.20) ?? new THREE.BoxGeometry(0.65, 0.52, 0.20), backMat);
  backing.position.z = -0.05;
  backing.castShadow = true;
  backing.receiveShadow = true;
  g.add(backing);

  // Indicator LED on top (glows when hit)
  const indicatorMat = new THREE.MeshStandardMaterial({
    color: color,
    emissive: color,
    emissiveIntensity: 0.3,
    metalness: 0.2,
    roughness: 0.4,
  });

  const indicator = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.08, 2),
    indicatorMat
  );
  indicator.position.z = 0.15;
  indicator.castShadow = true;
  g.add(indicator);

  // Light
  const lightIntensity = lightCfg?.intensity ?? 0.7;
  const lightDistance = lightCfg?.distance ?? 2.5;
  const pl = new THREE.PointLight(color, lightIntensity, lightDistance);
  pl.position.set(0, 0, 0.2);
  pl.castShadow = true;
  g.add(pl);

  g.userData = { light: pl, faceMat, backMat, color, hit: false, enhanced: true };
  return g;
}

// ─── Rollover Lanes ───────────────────────────────────────────────────────────
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
          cb.dmdEvent('\u00d7' + state.multiplier + ' ROLLOVER BONUS!');
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

// ─── Scoring Callbacks ────────────────────────────────────────────────────────
export function scoreBumperHit(bumperData: { x:number; y:number; mesh:any; index:number }): void {
  if (!bumperData?.mesh) return;

  // ─── Phase 13 Task 3: Trigger animations on bumper hit ───
  const bindingMgr = getAnimationBindingManager();
  const scheduler = getAnimationScheduler();
  const bridge = getBamBridge();
  if (bindingMgr && scheduler && bridge) {
    const bindings = bindingMgr.getBindingsFor('bumper', 'on_hit');
    for (const binding of bindings) {
      if (binding.autoPlay) {
        bridge.playAnimation(binding.sequenceId);
        bindingMgr.markTriggered(binding.id);
      }
    }
  }

  // ─── Phase 1: Bumper Combo System ───
  const now = Date.now();
  const timeSinceLastHit = now - state.lastBumperHitTime;

  if (timeSinceLastHit < 2000) {  // Within 2 seconds = combo continues
    state.bumperCombo++;
    state.bumperComboMultiplier = Math.min(2.0, 1.0 + state.bumperCombo * 0.1);  // Cap at 2x
  } else {
    // Combo broken, reset
    if (state.bumperCombo > 2) {
      cb.dmdEvent(`COMBO x${state.bumperCombo}!`);
    }
    state.bumperCombo = 1;
    state.bumperComboMultiplier = 1.0;
  }
  state.lastBumperHitTime = now;
  state.maxBumperCombo = Math.max(state.maxBumperCombo, state.bumperCombo);

  // ─── PHASE 9 TASK 1: Calculate Impact Intensity ───────────────────────────
  // Detect hit velocity from physics engine and scale feedback accordingly
  const p = physics!.ballBody.translation();
  const dx = p.x - bumperData.x, dy = p.y - bumperData.y;
  const d  = Math.sqrt(dx*dx + dy*dy);
  let ballVelocity = 0;
  if (d > 0.001) {
    const vel = physics!.ballBody.linvel();
    ballVelocity = Math.hypot(vel.x, vel.y);
    const spd = Math.max(ballVelocity, 5.5) * 1.1;
    physics!.ballBody.setLinvel({ x:(dx/d)*spd, y:(dy/d)*spd }, true);
  }

  // Normalize velocity to intensity (0.0 = soft, 1.0 = hard)
  // Typical ball velocity: 5-15 units/s in gameplay
  const intensity = Math.min(1.0, Math.max(0.0, (ballVelocity - 4.0) / 10.0));

  // ─── PHASE 9 TASK 1: Impact-Based Visual Feedback ──────────────────────────
  const ud = bumperData.mesh.userData;

  // Flash color variations: Red (soft) → Orange (medium) → Yellow (hard)
  let flashColor: number;
  if (intensity > 0.7) {
    // Hard hit: Yellow (0xFFFF00)
    flashColor = 0xFFFF00;
  } else if (intensity > 0.4) {
    // Medium hit: Orange (0xFF8800)
    flashColor = 0xFF8800;
  } else {
    // Soft hit: Red (0xFF0000)
    flashColor = 0xFF0000;
  }

  // Flash intensity: Scale from 2.0 (soft) to 4.0 (hard)
  const flashIntensity = 2.0 + intensity * 2.0;
  const ringEmissiveIntensity = 1.0 + intensity * 0.8;

  ud.light.intensity = flashIntensity;
  ud.ringMat.emissiveIntensity = ringEmissiveIntensity;

  // Flash duration: Slightly longer for harder hits (80-130ms)
  const flashDuration = 80 + intensity * 50;
  setTimeout(() => {
    ud.light.intensity = 0.9;
    ud.ringMat.emissiveIntensity = 1.0;
  }, flashDuration);

  // ─── PHASE 9 TASK 1: Intensity-Based Particle Effects ─────────────────────
  // Spawn particles radiating from impact: 0-20 particles based on intensity
  const particleCount = Math.floor(intensity * 20);
  if (particleCount > 0) {
    cb.spawnParticles(bumperData.x, bumperData.y, flashColor, particleCount);
  } else {
    // Always at least some particles
    cb.spawnParticles(bumperData.x, bumperData.y, ud.color, 8);
  }

  // ─── PHASE 9 TASK 1: Table Shake on Hard Hits ────────────────────────────
  // Trigger table shake for impacts above 60% intensity
  if (intensity > 0.6) {
    const shakeMagnitude = 0.01 + intensity * 0.02;
    const shakeDuration = 100 + intensity * 50;
    if (cb.tableShake) {
      cb.tableShake(shakeMagnitude, shakeDuration);
    }
  }

  // ─── Phase 2: Trigger lighting effect ───
  cb.triggerBumperFlash();

  // ─── Enhanced Scoring with Combo ───
  const baseScore = 100 * state.multiplier;
  const comboBonus = Math.floor(baseScore * (state.bumperComboMultiplier - 1.0));
  const totalScore = baseScore + comboBonus;
  state.score += totalScore;
  state.bumperHits++;

  // ─── Phase 4: Trigger backglass score animation ───
  cb.animateBackglassScore(totalScore);

  // ─── PHASE 9 TASK 2: Show Floating Score Text ───────────────────────────────
  // Display "+points" text floating up from bumper impact location
  const scorePosition = new THREE.Vector3(bumperData.x, bumperData.y, 0.5);
  cb.showFloatingScore(scorePosition, totalScore);

  // ─── PHASE 9 TASK 2: Update Combo Display ────────────────────────────────────
  // Show combo counter with animation
  cb.updateCombo(state.bumperCombo);

  // Show combo in DMD if active
  if (state.bumperCombo > 1) {
    cb.dmdEvent(`HIT x${state.bumperCombo}!`);
  }

  if (state.bumperHits % 5 === 0 && state.multiplier < 5) {
    state.multiplier++;
    cb.showNotification(`🔥 ×${state.multiplier} MULTIPLIER!`);
    cb.dmdEvent(`\u00d7${state.multiplier} MULTIPLIER!`);
  }
  if (state.bumperHits % 10 === 0) cb.launchMultiBall();

  // ─── PHASE 9 TASK 1: Intensity-Based Audio ───────────────────────────────
  // Play bumper sound with pitch/volume variation based on impact intensity
  playBumperSoundWithIntensity(intensity);

  callScriptBumper(bumperData.index);
  cb.updateHUD();
}

// ─── Phase 2: Spinner Mechanics ───────────────────────────────────────────────
export function updateSpinnerPhysics(): void {
  if (!physics || !state.spinnerActive) return;

  const now = Date.now();
  const ballVel = physics.ballBody.linvel();
  const ballSpeed = Math.hypot(ballVel.x, ballVel.y);

  // If ball is still moving (not stalled), count spins
  if (ballSpeed > 0.5) {
    state.spinnerSpins += ballSpeed * 0.01;  // Continuous rotation count

    // Award points every full rotation (every 1.0 spins)
    const completeSpins = Math.floor(state.spinnerSpins);
    if (completeSpins > Math.floor(state.spinnerSpins - ballSpeed * 0.01)) {
      const spinPoints = Math.floor(50 * state.multiplier);
      state.score += spinPoints;
      cb.showNotification(`💫 SPIN +${spinPoints}`);
    }
  } else {
    // Ball stalled, spinner ends
    state.spinnerActive = false;
    const totalSpinBonus = Math.floor(state.spinnerSpins * 25 * state.multiplier);
    if (state.spinnerSpins > 0.5) {
      state.score += totalSpinBonus;
      cb.dmdEvent(`SPINNER BONUS +${totalSpinBonus}!`);
      cb.showNotification(`⭐ SPINNER x${Math.floor(state.spinnerSpins)}`);
    }
    state.spinnerSpins = 0;
  }

  // Timeout if spinning too long (10 seconds)
  if (now - state.lastSpinnerHitTime > 10000) {
    state.spinnerActive = false;
    state.spinnerSpins = 0;
  }
}

// Called when spinner target is hit
export function scoreSpinnerHit(): void {
  state.spinnerActive = true;
  state.spinnerSpins = 0;
  state.lastSpinnerHitTime = Date.now();
  state.spinnerScore = 0;
  cb.dmdEvent('SPINNER!');
  cb.playSound('bumper');
  cb.updateHUD();
}

// ─── Phase 3: Ramp Completion Bonus ─────────────────────────────────────────
export function scoreRampHit(rampData: any, index: number): void {
  // ─── Phase 13 Task 3: Trigger animations on ramp hit ───
  const bindingMgr = getAnimationBindingManager();
  const scheduler = getAnimationScheduler();
  const bridge = getBamBridge();
  if (bindingMgr && scheduler && bridge) {
    const bindings = bindingMgr.getBindingsFor('ramp', 'on_hit');
    for (const binding of bindings) {
      if (binding.autoPlay) {
        bridge.playAnimation(binding.sequenceId);
        bindingMgr.markTriggered(binding.id);
      }
    }
  }

  const now = Date.now();
  const timeSinceLastRamp = now - state.lastRampHitTime;

  // ─── PHASE 12 TASK 5: Ramp Combo Multiplier ───
  if (timeSinceLastRamp < 5000) {  // 5-second window
    state.rampComboCounter++;
    state.rampComboMultiplier = Math.min(3.0, 1.0 + state.rampComboCounter * 0.5);
  } else {
    state.rampComboCounter = 1;
    state.rampComboMultiplier = 1.0;
  }
  state.lastRampHitTime = now;

  const baseScore = Math.floor(500 * state.multiplier * state.rampComboMultiplier);
  state.score += baseScore;
  state.rampsHit.add(index);

  cb.dmdEvent(`RAMP ${state.rampComboCounter}× +${baseScore}!`);
  cb.playSound('bumper');

  // Check if all ramps completed
  const totalRamps = (currentTableConfig?.ramps || []).length;
  if (state.rampsHit.size === totalRamps && totalRamps > 0) {
    const completionBonus = Math.floor(1000 * state.multiplier);
    state.score += completionBonus;
    state.rampsHit.clear();
    state.rampSequenceBonus++;

    cb.showNotification(`🎯 RAMP SEQUENCE COMPLETE! +${completionBonus}`);
    cb.dmdEvent(`RAMP SEQUENCE x${state.rampSequenceBonus}!`);

    // ─── PHASE 9 TASK 2: Show Ramp Completion Bonus Announcement ──────────────
    cb.showBonusAnnouncement('RAMP COMPLETE!');

    // ─── PHASE 9 TASK 3: Play Ramp Completion Sound ──────────────────────────
    cb.playRampCompleteSound();
  }

  cb.updateHUD();
}

// Phase 6 Enhancement: Highlight the next target in sequence
export function updateTargetSequenceHighlights(): void {
  targets.forEach(t => {
    const ud = t.mesh.userData;
    ud.light.intensity = 0.7;  // Default intensity
  });

  if (state.targetSequence && state.targetSequence.length > 0 && state.targetsHitSequence.length < state.targetSequence.length) {
    const nextIndex = state.targetSequence[state.targetsHitSequence.length];
    const nextTarget = targets[nextIndex];
    if (nextTarget && nextTarget.mesh) {
      nextTarget.mesh.userData.light.intensity = 2.5;  // Highlight next target
    }
  }
}

export function scoreTargetHit(targetData: { x:number; y:number; mesh:any; index:number }): void {
  if (!targetData?.mesh) return;

  // ─── Phase 13 Task 3: Trigger animations on target hit ───
  const bindingMgr = getAnimationBindingManager();
  const scheduler = getAnimationScheduler();
  const bridge = getBamBridge();
  if (bindingMgr && scheduler && bridge) {
    const bindings = bindingMgr.getBindingsFor('target', 'on_hit');
    for (const binding of bindings) {
      if (binding.autoPlay) {
        bridge.playAnimation(binding.sequenceId);
        bindingMgr.markTriggered(binding.id);
      }
    }
  }

  const baseScore = 200 * state.multiplier;
  state.score += baseScore;

  // ─── PHASE 12 TASK 1: Progressive Target System ───
  if (state.progressiveTargetMode !== 'none') {
    const targetIdx = targetData.index;

    // Track hit count for this target
    const currentHits = state.targetHitCounts.get(targetIdx) || 0;
    state.targetHitCounts.set(targetIdx, currentHits + 1);

    if (state.progressiveTargetMode === '3-of-5') {
      // ─── 3-of-5 Mode: Hit any 3 out of 5 targets (any order) ───
      const uniqueTargetsHit = state.targetHitCounts.size;
      const requiredCount = 3;
      state.targetProgress = Math.min(1.0, uniqueTargetsHit / requiredCount);

      if (uniqueTargetsHit >= requiredCount && !state.progressiveTargets.get(targetIdx)?.completed) {
        // Mark this target as part of completion
        state.progressiveTargets.set(targetIdx, {
          hitCount: currentHits + 1,
          required: requiredCount,
          completed: true,
          multiLevel: false,
        });

        if (uniqueTargetsHit === requiredCount) {
          // Completion achieved!
          const completionBonus = Math.floor(1000 * state.multiplier);
          state.score += completionBonus;
          state.multiplier = Math.min(10, state.multiplier + 1);

          cb.showNotification(`🎯 3-OF-5 COMPLETE! +${completionBonus} | ×${state.multiplier}!`);
          cb.dmdEvent(`3-OF-5 COMPLETE! ×${state.multiplier}!`);
          cb.triggerRampCompletion();

          // Reset for next sequence
          state.targetHitCounts.clear();
          state.progressiveTargets.clear();
          state.targetProgress = 0;
        } else {
          cb.dmdEvent(`TARGET ${uniqueTargetsHit}/3`);
        }
      } else if (uniqueTargetsHit < requiredCount) {
        cb.dmdEvent(`TARGET ${uniqueTargetsHit}/3`);
      }

    } else if (state.progressiveTargetMode === 'all') {
      // ─── All-Targets Mode: Hit all targets (in any order) ───
      const uniqueTargetsHit = state.targetHitCounts.size;
      const totalTargets = 5; // or get from table config
      state.targetProgress = uniqueTargetsHit / totalTargets;

      state.progressiveTargets.set(targetIdx, {
        hitCount: currentHits + 1,
        required: totalTargets,
        completed: false,
        multiLevel: false,
      });

      if (uniqueTargetsHit === totalTargets) {
        // All targets hit!
        const completionBonus = Math.floor(2000 * state.multiplier);
        state.score += completionBonus;
        state.multiplier = Math.min(10, state.multiplier + 1);

        cb.showNotification(`🏆 ALL TARGETS HIT! +${completionBonus} | ×${state.multiplier}!`);
        cb.dmdEvent(`ALL TARGETS! ×${state.multiplier}!`);
        cb.triggerRampCompletion();

        // Reset
        state.targetHitCounts.clear();
        state.progressiveTargets.clear();
        state.targetProgress = 0;
      } else {
        cb.dmdEvent(`TARGET ${uniqueTargetsHit}/${totalTargets}`);
      }

    } else if (state.progressiveTargetMode === 'multi-level') {
      // ─── Multi-Level Mode: Each target must be hit multiple times ───
      const hitsNeeded = 3; // Configurable
      const isCompleted = currentHits + 1 >= hitsNeeded;

      state.progressiveTargets.set(targetIdx, {
        hitCount: currentHits + 1,
        required: hitsNeeded,
        completed: isCompleted,
        multiLevel: true,
      });

      if (isCompleted && currentHits + 1 === hitsNeeded) {
        // Target completed!
        const targetBonus = Math.floor(500 * state.multiplier);
        state.score += targetBonus;

        cb.showNotification(`✨ TARGET ${targetIdx} LEVEL ${hitsNeeded}!`);
        cb.dmdEvent(`LVL ${hitsNeeded} COMPLETE!`);

        // Check if all targets completed
        const allCompleted = Array.from(state.progressiveTargets.values())
          .every(t => t.completed);

        if (allCompleted) {
          const allBonus = Math.floor(3000 * state.multiplier);
          state.score += allBonus;
          state.multiplier = Math.min(10, state.multiplier + 1);
          cb.showNotification(`🌟 ALL LEVELS COMPLETE! +${allBonus} | ×${state.multiplier}!`);
          cb.dmdEvent(`MASTER! ×${state.multiplier}!`);
          cb.triggerRampCompletion();

          // Reset
          state.targetHitCounts.clear();
          state.progressiveTargets.clear();
          state.targetProgress = 0;
        }
      } else {
        cb.dmdEvent(`TARGET ${targetIdx}: ${currentHits + 1}/${hitsNeeded}`);
      }
    }

    // ─── Phase 6: Target Sequence Bonuses (fallback if no progressive mode) ───
    return; // Exit early for progressive modes
  }

  // ─── Phase 6: Target Sequence Bonuses ───
  if (!state.targetSequence || state.targetSequence.length === 0) {
    // Initialize random sequence (4 targets)
    const numTargets = 4;
    state.targetSequence = Array.from({length: numTargets}, (_, i) => i).sort(() => Math.random() - 0.5);
    state.targetsHitSequence = [];
    state.sequenceProgress = 0;
    updateTargetSequenceHighlights();  // Highlight first target
  }

  const expectedIndex = state.targetSequence[state.targetsHitSequence.length];
  const isCorrectSequence = targetData.index === expectedIndex;

  if (isCorrectSequence) {
    state.targetsHitSequence.push(targetData.index);
    state.sequenceProgress = state.targetsHitSequence.length / state.targetSequence.length;
    const sequenceBonus = Math.floor(500 * state.multiplier);
    state.score += sequenceBonus;

    // ─── Phase 4: Trigger backglass score animation ───
    cb.animateBackglassScore(sequenceBonus);

    if (state.sequenceProgress === 1.0) {
      // Sequence complete!
      const completionBonus = Math.floor(2000 * state.multiplier);
      state.score += completionBonus;

      // ─── Phase 4: Animate the completion bonus ───
      cb.animateBackglassScore(completionBonus);

      // Phase 6 Enhancement: Increase multiplier on sequence completion
      state.multiplier = Math.min(10, state.multiplier + 1);

      cb.showNotification(`🎖️ TARGET SEQUENCE COMPLETE! +${completionBonus} | ×${state.multiplier}!`);
      cb.dmdEvent(`SEQUENCE PERFECT! ×${state.multiplier}!`);

      // ─── Phase 2: Trigger ramp completion effect ───
      cb.triggerRampCompletion();

      state.targetSequence = [];  // Reset for next sequence
      state.targetsHitSequence = [];
      updateTargetSequenceHighlights();  // Reset highlights
    } else {
      cb.dmdEvent(`TARGET ${state.targetsHitSequence.length}/${state.targetSequence.length}`);
      updateTargetSequenceHighlights();  // Update next target highlight
    }
  } else {
    cb.dmdEvent('TARGET!');
    state.targetsHitSequence = [];  // Reset sequence on wrong target
    state.sequenceProgress = 0;
    updateTargetSequenceHighlights();  // Reset highlights
  }

  const ud = targetData.mesh.userData;
  ud.faceMat.emissiveIntensity = 2.0; ud.light.intensity = 3.0;
  setTimeout(() => { ud.faceMat.emissiveIntensity = 0.6; ud.light.intensity = 0.7; }, 150);
  cb.spawnParticles(targetData.x, targetData.y, ud.color, 10);

  // ─── PHASE 9 TASK 2: Show Floating Score Text for Targets ───────────────────
  const scorePosition = new THREE.Vector3(targetData.x, targetData.y, 0.5);
  cb.showFloatingScore(scorePosition, baseScore);

  // ─── PHASE 9 TASK 3: Play Enhanced Target Hit Sound ─────────────────────────
  cb.playTargetSound(0.9);  // Slightly quieter than bumper

  cb.playSound('bumper');
  callScriptTarget(targetData.index);
  cb.updateHUD();
}

export function scoreSlingshotHit(side: string): void {
  const dir = side === 'left' ? 1 : -1;
  physics!.ballBody.applyImpulse({ x: dir * 3.0, y: 2.5 }, true);
  const slingshotScore = 50 * state.multiplier;
  state.score += slingshotScore;

  // ─── PHASE 9 TASK 2: Show Floating Score for Slingshots ────────────────────
  const slingshotPos = new THREE.Vector3(dir * 2.5, -2.0, 0.5);
  cb.showFloatingScore(slingshotPos, slingshotScore);

  cb.playSound('bumper');
  callScriptSlingshot(side);
  cb.updateHUD();
}

// ─── Realistischer Flipper ────────────────────────────────────────────────────
export function buildRealisticFlipper(side: 'left' | 'right', length: number = 2.1, geomPool?: any): THREE.Group {
  const group = new THREE.Group();
  const len   = length;
  const scale = len / 2.1;  // Normalize to original length

  const bodyMat = new THREE.MeshStandardMaterial({
    color: 0xddddee, metalness: 0.95, roughness: 0.08,
    emissive: 0x223366, emissiveIntensity: 0.15,
  });
  const shape = new THREE.Shape();
  shape.moveTo(0, 0.14); shape.lineTo(len, 0.26); shape.lineTo(len, -0.10); shape.lineTo(0.05, -0.10);
  shape.closePath();
  const bodyGeom = new THREE.ExtrudeGeometry(shape, { depth:0.18, bevelEnabled:true, bevelThickness:0.03, bevelSize:0.03, bevelSegments:3 });
  bodyGeom.translate(0, -0.07, -0.09);
  const body = new THREE.Mesh(bodyGeom, bodyMat);
  body.castShadow = true;
  group.add(body);

  const rubberMat = new THREE.MeshStandardMaterial({ color:0xcc5500, roughness:0.85, metalness:0.02, emissive:0x441100, emissiveIntensity:0.2 });
  const tip = new THREE.Mesh(geomPool?.getCylinder(0.16, 0.22, 16) ?? new THREE.CylinderGeometry(0.16, 0.10, 0.22, 16), rubberMat);
  tip.rotation.z = Math.PI/2; tip.position.set(len, 0.02, 0);
  group.add(tip);

  const pivotMat = new THREE.MeshStandardMaterial({ color:0xaaaacc, metalness:1.0, roughness:0.05 });
  const pivot = new THREE.Mesh(geomPool?.getCylinder(0.12, 0.30, 12) ?? new THREE.CylinderGeometry(0.12, 0.12, 0.30, 12), pivotMat);
  pivot.rotation.x = Math.PI/2;
  group.add(pivot);

  const rubberLine = new THREE.Mesh(geomPool?.getBox(len*0.9, 0.07, 0.06) ?? new THREE.BoxGeometry(len*0.9, 0.07, 0.06), rubberMat);
  rubberLine.position.set(len*0.5+0.05, 0.165, 0.05);
  group.add(rubberLine);

  const fLight = new THREE.PointLight(0x8899ff, 0.6, 4);
  fLight.position.set(len*0.5, 0, 0.5);
  group.add(fLight);
  group.userData.flipperLight = fLight;
  group.userData.flipperLength = len;

  if (side === 'right') group.scale.x = -1;
  return group;
}

// ─── Bumper bauen (mit Enhanced Geometry + LOD + Variable Size + Custom Light) ──
export function buildBumper(x: number, y: number, color: number, lod: 'high'|'med'|'low' = 'high', size: number = 1.0, lightCfg?: { intensity: number; distance: number }, geomPool?: any): THREE.Mesh | THREE.Group {
  // Phase 7: Try to use extracted MS3D model first
  const fptRes = fptResources as any;
  if (fptRes.models && fptRes.models instanceof Map) {
    for (const [modelName, mesh] of fptRes.models) {
      if (modelName.toLowerCase().includes('bumper') && mesh) {
        const cloned = mesh.clone();
        cloned.position.set(x, y, 0.125);
        cloned.scale.setScalar(size);
        cloned.castShadow = true;
        cloned.receiveShadow = true;

        // Add light for aesthetic
        const lightIntensity = lightCfg?.intensity ?? 0.9;
        const lightDistance = lightCfg?.distance ?? 4.5;
        const pl = new THREE.PointLight(color, lightIntensity, lightDistance);
        pl.position.set(x, y, 0.625);
        pl.castShadow = true;

        const group = new THREE.Group();
        group.add(cloned);
        group.add(pl);
        group.userData = { light: pl, color, hit: false, lod, size, modelBased: true };
        return group;
      }
    }
  }

  // Use enhanced geometry for high-quality rendering when available
  if (geometryConfig.useLargePolygons && lod === 'high') {
    return buildEnhancedBumper(x, y, color, lod, size, lightCfg, geomPool);
  }

  // Fallback to basic geometry
  const baseMat = new THREE.MeshStandardMaterial({ color: 0x222233, metalness: 0.8, roughness: 0.3 });
  const ringMat = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 1.2, roughness: 0.2, metalness: 0.5 });
  const capMat  = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: color, emissiveIntensity: 0.6, roughness: 0.1, metalness: 0.8 });

  const group = new THREE.Group();
  group.position.set(x, y, 0.125);
  group.scale.setScalar(size);  // Skaliere ganzen Bumper

  // LOD: High=24, Med=16, Low=8 segments
  const baseSegs = lod === 'high' ? 24 : lod === 'med' ? 16 : 8;
  const ringTubes = lod === 'high' ? 10 : 6;
  const ringSegs = lod === 'high' ? 32 : lod === 'med' ? 20 : 12;
  const capSegs = lod === 'high' ? 20 : lod === 'med' ? 12 : 6;

  // Get geometry pool for optimization
  const pool = getGraphicsPipeline()?.getGeometryPool();

  const base = new THREE.Mesh(pool?.getCylinder(0.45, 0.20, baseSegs) ?? new THREE.CylinderGeometry(0.45, 0.55, 0.20, baseSegs), baseMat);
  base.rotation.x = Math.PI/2;
  base.castShadow = true;
  base.receiveShadow = true;
  group.add(base);

  const ring = new THREE.Mesh(pool?.getTorus(0.36, 0.08, ringTubes, ringSegs) ?? new THREE.TorusGeometry(0.36, 0.08, ringTubes, ringSegs), ringMat);
  ring.position.z = 0.10;
  ring.castShadow = true;
  ring.receiveShadow = true;
  group.add(ring);

  const cap = new THREE.Mesh(pool?.getCylinder(0.24, 0.15, capSegs) ?? new THREE.CylinderGeometry(0.24, 0.28, 0.15, capSegs), capMat);
  cap.rotation.x = Math.PI/2; cap.position.z = 0.18;
  cap.castShadow = true;
  cap.receiveShadow = true;
  group.add(cap);

  const lightIntensity = lightCfg?.intensity ?? 0.9;
  const lightDistance = lightCfg?.distance ?? 4.5;
  const pl = new THREE.PointLight(color, lightIntensity, lightDistance);
  pl.position.set(0, 0, 0.5);
  pl.castShadow = true;
  group.add(pl);

  const mesh = group as unknown as THREE.Mesh;
  mesh.userData = { light: pl, ringMat, color, hit: false, lod, size, enhanced: false };
  return mesh;
}

// ─── Target bauen (mit Enhanced Geometry + Custom Light) ────────────────────────
export function buildTarget(x: number, y: number, color: number, lightCfg?: { intensity: number; distance: number }, geomPool?: any): THREE.Group {
  // Phase 7: Try to use extracted MS3D model first
  const fptRes = fptResources as any;
  if (fptRes.models && fptRes.models instanceof Map) {
    for (const [modelName, mesh] of fptRes.models) {
      if ((modelName.toLowerCase().includes('target') || modelName.toLowerCase().includes('drop')) && mesh) {
        const cloned = mesh.clone();
        cloned.position.set(x, y, 0.18);
        cloned.castShadow = true;
        cloned.receiveShadow = true;

        // Add light for aesthetic
        const lightIntensity = lightCfg?.intensity ?? 0.9;
        const lightDistance = lightCfg?.distance ?? 4.5;
        const pl = new THREE.PointLight(color, lightIntensity, lightDistance);
        pl.position.set(x, y, 0.5);
        pl.castShadow = true;

        const group = new THREE.Group();
        group.add(cloned);
        group.add(pl);
        group.userData = { light: pl, color, hit: false, modelBased: true };
        return group;
      }
    }
  }

  // Use enhanced geometry for high-quality rendering when available
  if (geometryConfig.useLargePolygons) {
    return buildEnhancedTarget(x, y, color, lightCfg, geomPool);
  }

  // Fallback to basic geometry
  const g = new THREE.Group();
  g.position.set(x, y, 0.18);

  const faceMat = new THREE.MeshStandardMaterial({ color, emissive:color, emissiveIntensity:0.7, roughness:0.3, metalness:0.2 });
  const backMat = new THREE.MeshStandardMaterial({ color:0x333344, roughness:0.6, metalness:0.5 });

  const face = new THREE.Mesh(geomPool?.getBox(0.55, 0.42, 0.05) ?? new THREE.BoxGeometry(0.55, 0.42, 0.05), faceMat);
  face.position.z = 0.06;
  face.castShadow = true;
  face.receiveShadow = true;
  g.add(face);

  const back = new THREE.Mesh(geomPool?.getBox(0.62, 0.50, 0.12) ?? new THREE.BoxGeometry(0.62, 0.50, 0.12), backMat);
  back.castShadow = true;
  back.receiveShadow = true;
  g.add(back);

  const lightIntensity = lightCfg?.intensity ?? 0.7;
  const lightDistance = lightCfg?.distance ?? 2.5;
  const pl = new THREE.PointLight(color, lightIntensity, lightDistance);
  pl.position.z = 0.3;
  pl.castShadow = true;
  g.add(pl);

  g.userData = { light: pl, faceMat, color, hit: false, enhanced: false };
  return g;
}

// ─── Rampe bauen (mit Custom Light) ───────────────────────────────────────────
export function buildRamp(x1: number, y1: number, x2: number, y2: number, color: number, scene: THREE.Scene, lightCfg?: { intensity: number; distance: number }, geomPool?: any): void {
  const cx=(x1+x2)/2, cy=(y1+y2)/2;
  const dx=x2-x1, dy=y2-y1;
  const len=Math.sqrt(dx*dx+dy*dy), angle=Math.atan2(dy,dx);
  const mat = new THREE.MeshStandardMaterial({ color, emissive:color, emissiveIntensity:0.3, roughness:0.5, metalness:0.4, transparent:true, opacity:0.7 });
  const mesh = new THREE.Mesh(geomPool?.getBox(len, 0.12, 0.18) ?? new THREE.BoxGeometry(len, 0.12, 0.18), mat);
  mesh.position.set(cx, cy, 0.25);
  mesh.rotation.z = angle;
  scene.add(mesh);

  // Optional light für Rampe
  if (lightCfg) {
    const pl = new THREE.PointLight(color, lightCfg.intensity, lightCfg.distance);
    pl.position.set(cx, cy, 1.0);
    scene.add(pl);
  }

  const nx=-(dy/len), ny=(dx/len);
  ramps.push({ x1, y1, x2, y2, nx, ny });
}

// ─── Physics: Per-Tisch Bodies ────────────────────────────────────────────────
export function buildPhysicsTable(config: TableConfig, phys: any): void {
  const { world } = phys;
  phys.tableBodies.forEach((b: any) => { try { world.removeRigidBody(b); } catch { /* ignore */ } });
  phys.tableBodies = [];
  phys.bumperMap.clear();
  phys.targetMap.clear();

  // Physics-Parameter aus Config oder Fallback zu Defaults
  const physCfg = config.physics ?? {};
  const bumperRest = physCfg.bumperRestitution ?? 0.7;
  const bumperFric = physCfg.bumperFriction ?? 0.0;
  const targetRest = physCfg.targetRestitution ?? 0.7;
  const targetFric = physCfg.targetFriction ?? 0.2;
  const rampRest = physCfg.rampRestitution ?? 0.8;
  const rampFric = physCfg.rampFriction ?? 0.25;
  const elemPhys = config.elementPhysics ?? {};

  config.bumpers.forEach((b, i) => {
    const body = world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(b.x, b.y));
    phys.tableBodies.push(body);
    // Per-element physics override
    const elemOvr = elemPhys.bumpers?.[i] ?? {};
    const rest = elemOvr.restitution ?? bumperRest;
    const fric = elemOvr.friction ?? bumperFric;
    // Scale physics collider by bumper size
    const sizeScale = b.size ?? 1.0;
    const collider = world.createCollider(
      RAPIER.ColliderDesc.ball(0.42 * sizeScale).setRestitution(rest).setFriction(fric)
        .setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS),
      body
    );
    phys.bumperMap.set(collider.handle, { x:b.x, y:b.y, mesh:bumpers[i]?.mesh??null, index:i });
  });

  (config.targets || []).forEach((t, i) => {
    const body = world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(t.x, t.y));
    phys.tableBodies.push(body);
    // Per-element physics override
    const elemOvr = elemPhys.targets?.[i] ?? {};
    const rest = elemOvr.restitution ?? targetRest;
    const fric = elemOvr.friction ?? targetFric;
    const collider = world.createCollider(
      RAPIER.ColliderDesc.cuboid(0.28, 0.21).setRestitution(rest).setFriction(fric)
        .setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS),
      body
    );
    phys.targetMap.set(collider.handle, { x:t.x, y:t.y, mesh:targets[i]?.mesh??null, index:i });
  });

  (config.ramps || []).forEach((r, i) => {
    const cx=(r.x1+r.x2)/2, cy=(r.y1+r.y2)/2;
    const dx=r.x2-r.x1, dy=r.y2-r.y1;
    const len=Math.sqrt(dx*dx+dy*dy);
    // Per-element physics override
    const elemOvr = elemPhys.ramps?.[i] ?? {};
    const rest = elemOvr.restitution ?? rampRest;
    const fric = elemOvr.friction ?? rampFric;
    const body = world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(cx,cy).setRotation(Math.atan2(dy,dx)));
    phys.tableBodies.push(body);
    world.createCollider(RAPIER.ColliderDesc.cuboid(len/2, 0.07).setRestitution(rest).setFriction(fric), body);
  });

  // ─── Phase 1: PLUNGER PHYSICS ───
  // Left wall of plunger lane
  const plungerLaneLeft = world.createRigidBody(
    RAPIER.RigidBodyDesc.fixed().setTranslation(2.35, -4.8)
  );
  phys.tableBodies.push(plungerLaneLeft);
  world.createCollider(
    RAPIER.ColliderDesc.cuboid(0.08, 2.2).setFriction(0.3),
    plungerLaneLeft
  );

  // Right wall of plunger lane
  const plungerLaneRight = world.createRigidBody(
    RAPIER.RigidBodyDesc.fixed().setTranslation(2.95, -4.8)
  );
  phys.tableBodies.push(plungerLaneRight);
  world.createCollider(
    RAPIER.ColliderDesc.cuboid(0.08, 2.2).setFriction(0.3),
    plungerLaneRight
  );

  // Bottom plunger guide (prevent ball escape)
  const plungerGuide = world.createRigidBody(
    RAPIER.RigidBodyDesc.fixed().setTranslation(2.65, -6.3)
  );
  phys.tableBodies.push(plungerGuide);
  world.createCollider(
    RAPIER.ColliderDesc.cuboid(0.35, 0.12).setFriction(0.5),
    plungerGuide
  );
}

// ─── Tisch bauen ─────────────────────────────────────────────────────────────
export function buildTable(config: TableConfig, scene: THREE.Scene, library?: any): void {
  console.log('[buildTable] START - config:', config.name);
  // Merge library resources if provided
  if (library) {
    // Texture inheritance: library textures available for fallback
    Object.assign(fptResources.textures, library.textureLibrary);

    // Sound inheritance: library sounds available for fallback
    Object.assign(fptResources.sounds, library.soundLibrary);

    // Use first library texture as playfield if not already set
    if (!fptResources.playfield) {
      const textureNames = Object.keys(library.textureLibrary);
      if (textureNames.length > 0) {
        fptResources.playfield = library.textureLibrary[textureNames[0]];
      }
    }
  }

  // ─── Phase 14: Get Graphics Resources for optimized allocation ────────────────
  const geomPool = getGraphicsPipeline()?.getGeometryPool();
  const matFactory = getGraphicsPipeline()?.getMaterialFactory();
  console.log('[buildTable] Graphics pipeline OK - geomPool:', !!geomPool, 'matFactory:', !!matFactory);

  slingshots.length = 0;
  ramps.length      = 0;
  extraBalls.forEach(b => scene.remove(b.mesh));
  extraBalls.length = 0;

  if (tableGroup) {
    scene.remove(tableGroup);
    tableGroup.traverse(obj => {
      if ((obj as THREE.Mesh).geometry) (obj as THREE.Mesh).geometry.dispose();
      if ((obj as THREE.Mesh).material) {
        const m = (obj as THREE.Mesh).material;
        if (Array.isArray(m)) m.forEach(x => x.dispose()); else m.dispose();
      }
    });
  }
  bumpers.length = 0; targets.length = 0;
  const tg = new THREE.Group();
  setTableGroup(tg);
  scene.add(tg);

  // Spielfeld (mit verbesserter Texture-Anwendung)
  const tableGeom = geomPool?.getBox(6, 12, 0.25) ?? new THREE.BoxGeometry(6, 12, 0.25);
  const hasFPTTex = !!fptResources.playfield;

  const tableMat  = new THREE.MeshStandardMaterial({
    color:     hasFPTTex ? 0xffffff : config.tableColor,
    map:       hasFPTTex ? fptResources.playfield : null,
    roughness: hasFPTTex ? 0.4 : 0.65,  // FPT-Texturen: glänzender
    metalness: hasFPTTex ? 0.15 : 0.12,  // FPT-Texturen: leicht metallisch
    emissive:  new THREE.Color(config.tableColor).multiplyScalar(hasFPTTex ? 0.08 : 0.14),
    side:      THREE.FrontSide,
  });

  // UV-Mapping optimieren für Playfield
  if (hasFPTTex && fptResources.playfield) {
    fptResources.playfield.repeat.set(1.0, 1.0);
    fptResources.playfield.offset.set(0, 0);
    fptResources.playfield.wrapS = THREE.ClampToEdgeWrapping;
    fptResources.playfield.wrapT = THREE.ClampToEdgeWrapping;
  }

  const tableMesh = new THREE.Mesh(tableGeom, tableMat);
  tableMesh.receiveShadow = true;
  tableMesh.castShadow = false;  // Nur Schatten empfangen, nicht werfen
  tg.add(tableMesh);
  console.log('[buildTable] Playfield mesh created');

  // Debug-Log für Texture-Status
  if (hasFPTTex) console.log('✓ FPT-Playfield-Texture wird verwendet');

  // Subtle center axis line on the playfield surface
  const axMat = new THREE.MeshStandardMaterial({ color: config.accentColor, emissive: config.accentColor, emissiveIntensity: 0.6, roughness: 0.3 });
  const axLine = new THREE.Mesh(geomPool?.getBox(0.03, 10.5, 0.01) ?? new THREE.BoxGeometry(0.03, 10.5, 0.01), axMat);
  axLine.position.set(0, 0.3, 0.135); tg.add(axLine);

  // Helper: segment-oriented guide rail
  const buildGuide = (x1:number,y1:number,x2:number,y2:number,mat:THREE.Material,w=0.16,h=0.38) => {
    const cx=(x1+x2)/2, cy=(y1+y2)/2, dx=x2-x1, dy=y2-y1;
    const len=Math.sqrt(dx*dx+dy*dy), angle=Math.atan2(dy,dx);
    const m = new THREE.Mesh(geomPool?.getBox(len,w,h) ?? new THREE.BoxGeometry(len,w,h), mat as any);
    m.position.set(cx,cy,0.32); m.rotation.z=angle; m.castShadow=true; tg.add(m);
  };

  // Wände
  const wallMat = new THREE.MeshStandardMaterial({ color:0x1a2233, metalness:0.8, roughness:0.25, emissive:0x050a14, emissiveIntensity:1.0 });
  const addWall = (x:number,y:number,w:number,h:number,z=0.3) => {
    const m = new THREE.Mesh(geomPool?.getBox(w,h,z) ?? new THREE.BoxGeometry(w,h,z), wallMat);
    m.position.set(x,y,0.26); m.castShadow = true; tg.add(m);
  };
  addWall(0, 6.05, 6.2, 0.2, 0.5);
  addWall(-3.05, 0, 0.22, 12.5);
  addWall( 3.05, 0, 0.22, 12.5);

  // Wall inner-edge neon glow strips
  const glowMat = new THREE.MeshStandardMaterial({
    color: config.accentColor, emissive: config.accentColor, emissiveIntensity: 1.5, roughness: 0.2,  // Reduced from 3.0
  });
  const addEdgeGlow = (x:number, len:number, vertical=true) => {
    const geo = vertical
      ? (geomPool?.getBox(0.05, len, 0.05) ?? new THREE.BoxGeometry(0.05, len, 0.05))
      : (geomPool?.getBox(len, 0.05, 0.05) ?? new THREE.BoxGeometry(len, 0.05, 0.05));
    const m = new THREE.Mesh(geo, glowMat);
    m.position.set(x, 0, 0.47); tg.add(m);
  };
  addEdgeGlow(-2.94, 12.5); addEdgeGlow(2.94, 12.5);
  console.log('[buildTable] Walls and edge glows created');

  // Lane-Trennwand
  const laneMat = new THREE.MeshStandardMaterial({ color:0x334455, metalness:0.5, roughness:0.5 });
  const laneDiv = new THREE.Mesh(geomPool?.getBox(0.15, 4.0, 0.4) ?? new THREE.BoxGeometry(0.15, 4.0, 0.4), laneMat);
  laneDiv.position.set(2.2, -3.0, 0.3); tg.add(laneDiv);

  // Guide rail material (dark metal)
  const guideMat = new THREE.MeshStandardMaterial({ color:0x1e2a3a, metalness:0.85, roughness:0.2, emissive:0x050d18, emissiveIntensity:1.0 });
  const guideGlowMat = new THREE.MeshStandardMaterial({ color: config.accentColor, emissive: config.accentColor, emissiveIntensity: 1.8, roughness: 0.3 });

  // Inlane guides (match physics: slingshot bottom → flipper pivot)
  buildGuide(-1.9, -2.3, -1.15, -4.5, guideMat);
  buildGuide( 1.9, -2.3,  1.15, -4.5, guideMat);
  // Inlane guide inner glow face (thin strip on playfield-facing side)
  buildGuide(-1.9, -2.3, -1.15, -4.5, guideGlowMat, 0.04, 0.30);
  buildGuide( 1.9, -2.3,  1.15, -4.5, guideGlowMat, 0.04, 0.30);

  // Drain guides (match physics: flipper pivot → bottom corner)
  buildGuide(-1.15, -4.85, -2.5, -6.2, guideMat);
  buildGuide( 1.15, -4.85,  2.5, -6.2, guideMat);
  buildGuide(-1.15, -4.85, -2.5, -6.2, guideGlowMat, 0.04, 0.28);
  buildGuide( 1.15, -4.85,  2.5, -6.2, guideGlowMat, 0.04, 0.28);

  // Slingshots — dark metal body + bright inner glow face
  const slBodyMat = new THREE.MeshStandardMaterial({ color:0x1a2233, metalness:0.85, roughness:0.25, emissive:0x040810, emissiveIntensity:1.0 });
  const slGlowMat = new THREE.MeshStandardMaterial({ color:0xffcc00, emissive:0xff8800, emissiveIntensity:3.0, roughness:0.2 });
  [
    { x:-2.0, y:-1.6, r:-0.3, side:'left',  gx: 0.12 },
    { x: 2.0, y:-1.6, r: 0.3, side:'right', gx:-0.12 },
  ].forEach(s => {
    const slG = new THREE.Group();
    slG.position.set(s.x, s.y, 0.3); slG.rotation.z = s.r;
    slG.add(new THREE.Mesh(geomPool?.getBox(0.24, 1.32, 0.42) ?? new THREE.BoxGeometry(0.24, 1.32, 0.42), slBodyMat));
    const glow = new THREE.Mesh(geomPool?.getBox(0.06, 1.28, 0.36) ?? new THREE.BoxGeometry(0.06, 1.28, 0.36), slGlowMat);
    glow.position.x = s.gx;
    slG.add(glow);
    tg.add(slG);
    slingshots.push({ x:s.x, y:s.y, side:s.side });
  });
  console.log('[buildTable] Slingshots created');

  // Rollover-Lane-Markierungen
  [-1.8,-0.6,0.6,1.8].forEach(rx => {
    const rm = new THREE.Mesh(geomPool?.getBox(0.18, 0.08, 0.01) ?? new THREE.BoxGeometry(0.18, 0.08, 0.01),
      new THREE.MeshStandardMaterial({ color:config.accentColor, emissive:config.accentColor, emissiveIntensity:1.0 }));
    rm.position.set(rx, 5.4, 0.14); tg.add(rm);
  });

  // Bumper + Targets + Rampen (LOD basierend auf Entfernung)
  console.log('[buildTable] Building bumpers - count:', config.bumpers.length);
  config.bumpers.forEach(b => {
    // LOD: weiter oben (höher y) = ferner von Kamera → weniger Polys
    const lod = b.y > 3.5 ? 'low' : b.y > 2.0 ? 'med' : 'high';
    const m = buildBumper(b.x, b.y, b.color, lod, b.size, b.light, geomPool);
    (m as any).castShadow = true;
    tg.add(m);
    bumpers.push({ x:b.x, y:b.y, mesh:m as any });
  });
  console.log('[buildTable] Bumpers complete');

  console.log('[buildTable] Building targets - count:', (config.targets || []).length);
  (config.targets || []).forEach(t => {
    // Targets: simplify geometry for distant ones (y < -0.5)
    const g = buildTarget(t.x, t.y, t.color, t.light, geomPool);
    if (t.y < -0.5) {
      // Low LOD: reduce material detail
      g.traverse((obj: any) => {
        if (obj.material?.emissiveIntensity) obj.material.emissiveIntensity *= 0.8;
      });
    }
    tg.add(g);
    targets.push({ x:t.x, y:t.y, mesh:g as any });
  });
  console.log('[buildTable] Targets complete');

  console.log('[buildTable] Building ramps - count:', (config.ramps || []).length);
  (config.ramps || []).forEach(r => buildRamp(r.x1, r.y1, r.x2, r.y2, r.color, scene, r.light, geomPool));
  console.log('[buildTable] Ramps complete');

  // Lichter
  console.log('[buildTable] Adding lights - count:', (config.lights || []).length);
  (config.lights || []).forEach(l => {
    const pl = new THREE.PointLight(l.color, l.intensity, l.dist);
    pl.position.set(l.x, l.y, l.z);
    scene.add(pl);
  });
  console.log('[buildTable] Lights complete');

  // Flipper-area accent fill lights (illuminate lower table in theme color)
  const faL = new THREE.PointLight(config.accentColor, 0.55, 7.0);
  faL.position.set(-1.5, -3.8, 2.5); tg.add(faL);
  const faR = new THREE.PointLight(config.accentColor, 0.55, 7.0);
  faR.position.set( 1.5, -3.8, 2.5); tg.add(faR);

  // Plunger (Phase 2: Realistic positioning - right side, deeper)
  const plungerGroup = new THREE.Group();
  plungerGroup.position.set(2.65, -6.3, 0.3);
  const knobMat  = new THREE.MeshStandardMaterial({ color:0xcc3300, metalness:0.3, roughness:0.6, emissive:0x440000, emissiveIntensity:0.2 });
  const knob = new THREE.Mesh(geomPool?.getCylinder(0.16, 0.22, 16) ?? new THREE.CylinderGeometry(0.16, 0.18, 0.22, 16), knobMat);
  knob.rotation.x = Math.PI/2;
  plungerGroup.add(knob);
  const rod  = new THREE.Mesh(geomPool?.getCylinder(0.06, 1.0, 10) ?? new THREE.CylinderGeometry(0.06, 0.06, 1.0, 10),
    new THREE.MeshStandardMaterial({ color:0xaaaacc, metalness:1.0, roughness:0.1 }));
  rod.rotation.x = Math.PI/2; rod.position.z = 0.6;
  plungerGroup.add(rod);
  const base = new THREE.Mesh(geomPool?.getBox(0.5, 0.5, 0.15) ?? new THREE.BoxGeometry(0.5, 0.5, 0.15),
    new THREE.MeshStandardMaterial({ color:0x333344, metalness:0.7, roughness:0.4 }));
  base.position.z = 1.15;
  plungerGroup.add(base);
  tg.add(plungerGroup);
  setPlungerKnob(knob);

  // Tisch-Label Dekoration
  const accentMat = new THREE.LineBasicMaterial({ color: config.accentColor });
  const pts = [new THREE.Vector3(-2.8, -6.1, 0.15), new THREE.Vector3(2.8, -6.1, 0.15)];
  const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), accentMat);
  tg.add(line);

  setCurrentTableConfig(config);
  rolloversHit = [false, false, false, false];

  console.log('[buildTable] Building physics - physics:', !!physics);
  if (physics) buildPhysicsTable(config, physics);
  console.log('[buildTable] COMPLETE');
}
