// SPDX-License-Identifier: AGPL-3.0-or-later
// © 2026 Harald Weiss
/**
 * builder.ts — Table geometry builders, physics bodies, playfield lighting
 * Extracted from the original table.ts barrel.
 */
import * as THREE from 'three';
import RAPIER from '@dimforge/rapier2d-compat';
import type { TableConfig, BumperUserData, TargetUserData } from '../types';
import {
  fptResources, physics, tableGroup, extraBalls,
  bumpers, targets, slingshots, ramps,
  setCurrentTableConfig, setTableGroup, setPlungerKnob,
  globalAssetCatalog,
} from '../game';
import { devLog } from '../utils/dev-log';
import { getGraphicsPipeline } from '../graphics/graphics-pipeline';
import { populateCatalogFromFPTResources } from '../fpt-parser';

/**
 * Resolve the active playfield texture.
 * Prefers AssetCatalog (new path); returns null if not present.
 * Returning null signals "use solid color fallback".
 */
export function resolvePlayfieldTexture(): THREE.Texture | null {
  const cat = globalAssetCatalog();
  if (cat && cat.hasTexture('playfield')) {
    const tex = cat.getTexture('playfield');
    if (!cat.isPlaceholder(tex)) return tex;
  }
  return null;
}

/**
 * Resolve a 3D model by name from the AssetCatalog.
 * Returns the registered mesh or null if not present (placeholder rejected).
 * Caller decides fallback behavior (e.g., procedural geometry).
 */
export function resolveModel(name: string): THREE.Mesh | null {
  const cat = globalAssetCatalog();
  if (!cat || !cat.hasModel(name)) return null;
  const mesh = cat.getModel(name);
  return cat.isPlaceholder(mesh) ? null : mesh;
}

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
    const maxIntensity = light.intensity || 2.0;
    const startTime = Date.now();
    const animate = () => {
      const elapsed = Date.now() - startTime;
      if (elapsed > duration) return;

      // Pulse effect: rapid on/off based on pulseInterval
      const pulseCycle = (elapsed % pulseInterval) / pulseInterval;
      const isOn = pulseCycle < 0.5;
      const fadeOut = Math.max(0, 1 - elapsed / duration);

      light.intensity = isOn ? maxIntensity * fadeOut : minIntensity * fadeOut;

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
      anim.light.intensity = anim.targetIntensity * easeOut;

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


// ─── Realistischer Flipper ────────────────────────────────────────────────────
export function buildRealisticFlipper(side: 'left' | 'right', length: number = 2.1, geomPool?: any): THREE.Group {
  const group = new THREE.Group();
  const len   = length;

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
  // Phase 1b: Try to use extracted MS3D model from AssetCatalog
  const cat = globalAssetCatalog();
  if (cat) {
    let bumperMesh: THREE.Mesh | null = null;
    for (const name of cat.registeredModelNames()) {
      if (name.toLowerCase().includes('bumper')) {
        bumperMesh = resolveModel(name);
        if (bumperMesh) break;
      }
    }
    if (bumperMesh) {
      try {
        const cloned = bumperMesh.clone();
        cloned.position.set(x, y, 0.125);
        cloned.scale.setScalar(size);
        cloned.castShadow = true;
        cloned.receiveShadow = true;

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
      } catch (e) {
        console.warn('[buildBumper] Failed to clone MS3D model:', e);
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
  // Phase 1b: Try to use extracted MS3D model from AssetCatalog
  const cat = globalAssetCatalog();
  if (cat) {
    let targetMesh: THREE.Mesh | null = null;
    for (const name of cat.registeredModelNames()) {
      if (name.toLowerCase().includes('target') || name.toLowerCase().includes('drop')) {
        targetMesh = resolveModel(name);
        if (targetMesh) break;
      }
    }
    if (targetMesh) {
      try {
        const cloned = targetMesh.clone();
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
      } catch (e) {
        console.warn('[buildTarget] Failed to clone MS3D model:', e);
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

  // ─── PERIMETER WALLS (Main Enclosure) ───
  // Top wall (completely seals top)
  const topWall = world.createRigidBody(
    RAPIER.RigidBodyDesc.fixed().setTranslation(0, 6.3)
  );
  phys.tableBodies.push(topWall);
  world.createCollider(
    RAPIER.ColliderDesc.cuboid(3.3, 0.2).setFriction(0.2),
    topWall
  );

  // Left wall (extended to fully seal left side from top to drain)
  const leftWall = world.createRigidBody(
    RAPIER.RigidBodyDesc.fixed().setTranslation(-3.15, 0)
  );
  phys.tableBodies.push(leftWall);
  world.createCollider(
    RAPIER.ColliderDesc.cuboid(0.15, 7.0).setFriction(0.2),
    leftWall
  );

  // Right wall (extended to fully seal right side from top to drain)
  const rightWall = world.createRigidBody(
    RAPIER.RigidBodyDesc.fixed().setTranslation(3.15, 0)
  );
  phys.tableBodies.push(rightWall);
  world.createCollider(
    RAPIER.ColliderDesc.cuboid(0.15, 7.0).setFriction(0.2),
    rightWall
  );

  // ─── CLEAR DRAIN GAP (between flippers) ───
  // Ball radius: 0.22 (diameter 0.44)
  // Flipper gap: 3.0 units wide (from -1.5 to +1.5)
  // Clearance: 3.0 - 0.44 = 2.56 units (plenty of space for ball to drain)
  // NO barriers in drain zone - ball falls straight through via gravity

  // ─── SLINGSHOT WALLS (Outer side barriers) ───
  // Left slingshot barrier (at angle, guards left flipper side)
  const leftSlingshotWall = world.createRigidBody(
    RAPIER.RigidBodyDesc.fixed().setTranslation(-2.2, -1.5).setRotation(-0.5)
  );
  phys.tableBodies.push(leftSlingshotWall);
  world.createCollider(
    RAPIER.ColliderDesc.cuboid(0.12, 0.9).setFriction(0.3),
    leftSlingshotWall
  );

  // Right slingshot barrier (at angle, guards right flipper side)
  const rightSlingshotWall = world.createRigidBody(
    RAPIER.RigidBodyDesc.fixed().setTranslation(2.2, -1.5).setRotation(0.5)
  );
  phys.tableBodies.push(rightSlingshotWall);
  world.createCollider(
    RAPIER.ColliderDesc.cuboid(0.12, 0.9).setFriction(0.3),
    rightSlingshotWall
  );

  // ─── DRAIN LANE WALLS (Guide ball straight down between flippers) ───
  // Left side of drain lane - prevents ball from escaping left
  const drainLeftWall = world.createRigidBody(
    RAPIER.RigidBodyDesc.fixed().setTranslation(-1.15, -5.05)
  );
  phys.tableBodies.push(drainLeftWall);
  world.createCollider(
    RAPIER.ColliderDesc.cuboid(0.1, 1.0).setFriction(0.2),
    drainLeftWall
  );

  // Right side of drain lane - prevents ball from escaping right
  const drainRightWall = world.createRigidBody(
    RAPIER.RigidBodyDesc.fixed().setTranslation(1.15, -5.05)
  );
  phys.tableBodies.push(drainRightWall);
  world.createCollider(
    RAPIER.ColliderDesc.cuboid(0.1, 1.0).setFriction(0.2),
    drainRightWall
  );

  // ─── DRAIN ZONE BOTTOM (Detects ball loss) ───
  // Extends below drain level to catch any escaping balls
  const drainBottom = world.createRigidBody(
    RAPIER.RigidBodyDesc.fixed().setTranslation(0, -6.0)
  );
  phys.tableBodies.push(drainBottom);
  world.createCollider(
    RAPIER.ColliderDesc.cuboid(3.2, 0.2).setFriction(0.1),
    drainBottom
  );

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
export function buildTable(config: TableConfig, scene: THREE.Scene, library?: any, playgroundGroup?: THREE.Group): void {
  devLog('[buildTable] START - config:', config.name);
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

    // Refresh catalog with merged library state (library merge happens after parser populated catalog)
    populateCatalogFromFPTResources();
  }

  // ─── Phase 14: Get Graphics Resources for optimized allocation ────────────────
  const geomPool = getGraphicsPipeline()?.getGeometryPool();
  const matFactory = getGraphicsPipeline()?.getMaterialFactory();
  devLog('[buildTable] Graphics pipeline OK - geomPool:', !!geomPool, 'matFactory:', !!matFactory);

  slingshots.length = 0;
  ramps.length      = 0;
  extraBalls.forEach(b => scene.remove(b.mesh));
  extraBalls.length = 0;

  if (tableGroup) {
    scene.remove(tableGroup);
    tableGroup.traverse((obj: THREE.Object3D) => {
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
  // Add tableGroup to playgroundGroup if provided (for rotation support), otherwise to scene
  if (playgroundGroup) {
    playgroundGroup.add(tg);
  } else {
    scene.add(tg);
  }

  // Spielfeld (mit verbesserter Texture-Anwendung)
  const tableGeom = geomPool?.getBox(6, 12, 0.25) ?? new THREE.BoxGeometry(6, 12, 0.25);
  const playfieldTex = resolvePlayfieldTexture();
  const hasFPTTex = playfieldTex !== null;

  const tableMat  = new THREE.MeshStandardMaterial({
    color:     hasFPTTex ? 0xffffff : config.tableColor,
    map:       playfieldTex,
    roughness: hasFPTTex ? 0.4 : 0.65,  // FPT-Texturen: glänzender
    metalness: hasFPTTex ? 0.15 : 0.12,  // FPT-Texturen: leicht metallisch
    emissive:  new THREE.Color(config.tableColor).multiplyScalar(hasFPTTex ? 0.08 : 0.14),
    side:      THREE.FrontSide,
  });

  // UV-Mapping optimieren für Playfield
  if (playfieldTex) {
    playfieldTex.repeat.set(1.0, 1.0);
    playfieldTex.offset.set(0, 0);
    playfieldTex.wrapS = THREE.ClampToEdgeWrapping;
    playfieldTex.wrapT = THREE.ClampToEdgeWrapping;
  }

  const tableMesh = new THREE.Mesh(tableGeom, tableMat);
  tableMesh.receiveShadow = true;
  tableMesh.castShadow = false;  // Nur Schatten empfangen, nicht werfen
  tg.add(tableMesh);
  devLog('[buildTable] Playfield mesh created');

  // Debug-Log für Texture-Status
  if (hasFPTTex) devLog('✓ FPT-Playfield-Texture wird verwendet');

  // Subtle center axis line on the playfield surface
  const axMat = new THREE.MeshStandardMaterial({ color: config.accentColor, emissive: config.accentColor, emissiveIntensity: 0.6, roughness: 0.3 });
  const axLine = new THREE.Mesh(geomPool?.getBox(0.03, 10.5, 0.01) ?? new THREE.BoxGeometry(0.03, 10.5, 0.01), axMat);
  axLine.position.set(0, 0.3, 0.135); tg.add(axLine);

  // Helper: segment-oriented guide rail
  const buildGuide = (x1:number,y1:number,x2:number,y2:number,mat:THREE.Material,w=0.16,h=0.38) => {
    const cx=(x1+x2)/2, cy=(y1+y2)/2, dx=x2-x1, dy=y2-y1;
    const len=Math.sqrt(dx*dx+dy*dy), angle=Math.atan2(dy,dx);
    const m = new THREE.Mesh(geomPool?.getBox(len,w,h) ?? new THREE.BoxGeometry(len,w,h), mat);
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
  devLog('[buildTable] Walls and edge glows created');

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
  devLog('[buildTable] Slingshots created');

  // Rollover-Lane-Markierungen
  [-1.8,-0.6,0.6,1.8].forEach(rx => {
    const rm = new THREE.Mesh(geomPool?.getBox(0.18, 0.08, 0.01) ?? new THREE.BoxGeometry(0.18, 0.08, 0.01),
      new THREE.MeshStandardMaterial({ color:config.accentColor, emissive:config.accentColor, emissiveIntensity:1.0 }));
    rm.position.set(rx, 5.4, 0.14); tg.add(rm);
  });

  // Bumper + Targets + Rampen (LOD basierend auf Entfernung)
  devLog('[buildTable] Building bumpers - count:', config.bumpers.length);
  config.bumpers.forEach(b => {
    try {
      // LOD: weiter oben (höher y) = ferner von Kamera → weniger Polys
      const lod = b.y > 3.5 ? 'low' : b.y > 2.0 ? 'med' : 'high';
      const m = buildBumper(b.x, b.y, b.color, lod, b.size, b.light, geomPool);
      if (m) {
        m.castShadow = true;
        tg.add(m);
        bumpers.push({ x:b.x, y:b.y, mesh: m as THREE.Mesh & { userData: BumperUserData } });
      } else {
        console.warn('[buildTable] buildBumper returned null/undefined for bumper at', b.x, b.y);
      }
    } catch (e) {
      console.error('[buildTable] Error building bumper at', b.x, b.y, e);
    }
  });
  devLog('[buildTable] Bumpers complete');

  devLog('[buildTable] Building targets - count:', (config.targets || []).length);
  (config.targets || []).forEach(t => {
    try {
      // Targets: simplify geometry for distant ones (y < -0.5)
      const g = buildTarget(t.x, t.y, t.color, t.light, geomPool);
      if (!g) {
        console.warn('[buildTable] buildTarget returned null/undefined for target at', t.x, t.y);
        return;
      }
      if (t.y < -0.5) {
        // Low LOD: reduce material detail
        g.traverse((obj: any) => {
          if (obj.material?.emissiveIntensity) obj.material.emissiveIntensity *= 0.8;
        });
      }
      tg.add(g);
      targets.push({ x:t.x, y:t.y, mesh: g as THREE.Group & { userData: TargetUserData } });
    } catch (e) {
      console.error('[buildTable] Error building target at', t.x, t.y, e);
    }
  });
  devLog('[buildTable] Targets complete');

  devLog('[buildTable] Building ramps - count:', (config.ramps || []).length);
  (config.ramps || []).forEach(r => buildRamp(r.x1, r.y1, r.x2, r.y2, r.color, scene, r.light, geomPool));
  devLog('[buildTable] Ramps complete');

  // Lichter
  devLog('[buildTable] Adding lights - count:', (config.lights || []).length);
  (config.lights || []).forEach(l => {
    const pl = new THREE.PointLight(l.color, l.intensity, l.dist);
    pl.position.set(l.x, l.y, l.z);
    scene.add(pl);
  });
  devLog('[buildTable] Lights complete');

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
  knob.position.y = 0.8;  // ← FIX: Initialize knob at local y=0.8 (rest position before charging)
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

  devLog('[buildTable] Building physics - physics:', !!physics);
  if (physics) buildPhysicsTable(config, physics);
  devLog('[buildTable] COMPLETE');
}
