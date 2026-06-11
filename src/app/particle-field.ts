// SPDX-License-Identifier: AGPL-3.0-or-later
import * as THREE from 'three';
import { partData } from '../game';
import type { PerformanceProfiler } from '../profiler';
import type { AdvancedParticleSystem } from '../graphics/advanced-particle-system';
import { devLog } from '../utils/dev-log';

/**
 * Basic GPU-points particle field (impact sparks, launch bursts).
 *
 * Extracted from main.ts. Holds its own geometry/material/mesh and mutates the
 * shared `partData` buffer from ./game. When the active quality preset enables
 * the advanced particle system, spawn() delegates to it instead.
 *
 * Behaviour preserved exactly from the original: the position/colour Float32Array
 * buffers are sized once from the *initial* MAX_PARTS and are NOT reallocated when
 * setMaxParts() changes the cap later — writes past the buffer are silent no-ops,
 * so the rendered count stays bounded by the initial allocation by design.
 */
export class ParticleField {
  private readonly partPos: Float32Array;
  private readonly partCol: Float32Array;
  private readonly partGeo: THREE.BufferGeometry;
  private readonly partMat: THREE.PointsMaterial;
  private readonly partMesh: THREE.Points;
  private _maxParts: number;

  constructor(
    scene: THREE.Scene,
    private readonly profiler: PerformanceProfiler,
    private readonly particleSystem: AdvancedParticleSystem | null,
  ) {
    let maxParts = 300; // Auto-adjust based on device
    if (/iPhone|iPad|Android|Mobile/.test(navigator.userAgent)) {
      maxParts = window.innerWidth < 768 ? 100 : 200; // Mobile/Tablet
    }
    this._maxParts = maxParts;

    this.partPos = new Float32Array(maxParts * 3);
    this.partCol = new Float32Array(maxParts * 3);
    this.partGeo = new THREE.BufferGeometry();
    this.partGeo.setAttribute('position', new THREE.BufferAttribute(this.partPos, 3));
    this.partGeo.setAttribute('color', new THREE.BufferAttribute(this.partCol, 3));

    this.partMat = new THREE.PointsMaterial({
      size: 0.09, vertexColors: true, transparent: true, opacity: 1.0,
      sizeAttenuation: true, depthWrite: false, fog: false,  // Disable fog for particles
      toneMapped: false,  // Skip tone mapping for particles
    });
    this.partMesh = new THREE.Points(this.partGeo, this.partMat);
    scene.add(this.partMesh);
    devLog(`✓ Particle System: MAX_PARTS=${maxParts}`);
  }

  get maxParts(): number {
    return this._maxParts;
  }

  /** Update the spawn cap (called from applyQualityPreset). Buffers are not resized — see class note. */
  setMaxParts(n: number): void {
    this._maxParts = n;
  }

  spawn(wx: number, wy: number, hexColor: number, count = 14, currentFps = 60): void {
    // Adaptive spawn: reduce particles on low FPS
    const adaptCount = currentFps < 45 ? Math.floor(count * 0.5) : count;

    // Use advanced particle system if enabled.
    // NOTE: the original free-standing spawnParticles() once referenced a
    // `currentPreset` free variable that only existed inside applyQualityPreset(),
    // throwing inside the animate loop and freezing DMD/Backglass child windows.
    // The preset is now read locally via the injected profiler.
    const preset = this.profiler.getQualityPreset();
    if (this.particleSystem && preset.advancedParticlesEnabled) {
      const color = new THREE.Color(hexColor);
      this.particleSystem.emit(new THREE.Vector3(wx, wy, 0.55), 'generic', adaptCount, color);
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
        x: wx, y: wy, z: 0.55,
        vx: Math.cos(angle) * spd, vy: Math.sin(angle) * spd,
        vz: 1.5 + Math.random() * 3.0, life: 1.0, r, g, b,
      });
      if (partData.length > this._maxParts) partData.shift();
    }
  }

  update(dt: number): void {
    let n = 0;
    for (let i = 0; i < partData.length; i++) {
      const p = partData[i]; p.life -= dt * 2.2;
      if (p.life <= 0) continue;
      p.x += p.vx*dt; p.y += p.vy*dt; p.z += p.vz*dt; p.vz -= 12*dt;
      const t = p.life;
      this.partPos[n*3]=p.x; this.partPos[n*3+1]=p.y; this.partPos[n*3+2]=p.z;
      this.partCol[n*3]=p.r*t; this.partCol[n*3+1]=p.g*t; this.partCol[n*3+2]=p.b*t;
      partData[n] = p; n++;
    }
    partData.length = n;
    this.partGeo.attributes.position.needsUpdate = true;
    this.partGeo.attributes.color.needsUpdate    = true;
    this.partGeo.setDrawRange(0, n);
  }
}
