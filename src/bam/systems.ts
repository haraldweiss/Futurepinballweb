// SPDX-License-Identifier: AGPL-3.0-or-later
// © 2026 Harald Weiss

import * as THREE from 'three';
import type { Vector3, Keyframe, AnimationSequence, BAMConfig } from './types';

// ─── Utility Math Functions ────────────────────────────────────────────────

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function lerpVec3(a: Vector3, b: Vector3, t: number): Vector3 {
  return {
    x: lerp(a.x, b.x, t),
    y: lerp(a.y, b.y, t),
    z: lerp(a.z, b.z, t),
  };
}

function degreesToRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

function radiansToDegrees(radians: number): number {
  return radians * (180 / Math.PI);
}

function hermiteInterpolate(
  p0: number, p1: number, p2: number, p3: number, t: number
): number {
  const t2 = t * t;
  const t3 = t2 * t;

  const h00 = 2 * t3 - 3 * t2 + 1;
  const h10 = t3 - 2 * t2 + t;
  const h01 = -2 * t3 + 3 * t2;
  const h11 = t3 - t2;

  return h00 * p1 + h10 * (p2 - p0) * 0.5 + h01 * p2 + h11 * (p3 - p1) * 0.5;
}

// ─── Table Physics ──────────────────────────────────────────────────────

class TablePhysics {
  private tiltAngleX: number = 0;
  private tiltAngleY: number = 0;
  private tiltAngleZ: number = 0;
  private tiltSensitivity: number = 1.0;
  private gravityCompensationEnabled: boolean = true;
  private standardGravity: number = 9.81;

  constructor(config: BAMConfig) {
    this.tiltSensitivity = config.physics.tiltSensitivity;
    this.gravityCompensationEnabled = config.physics.gravityCompensation;
  }

  setTableTilt(x: number, y: number, z: number): void {
    this.tiltAngleX = Math.max(-45, Math.min(45, x));
    this.tiltAngleY = Math.max(-45, Math.min(45, y));
    this.tiltAngleZ = ((z % 360) + 360) % 360;
  }

  getTiltAngles(): Vector3 {
    return {
      x: this.tiltAngleX,
      y: this.tiltAngleY,
      z: this.tiltAngleZ,
    };
  }

  getGravityVector(): Vector3 {
    const x = degreesToRadians(this.tiltAngleX);
    const y = degreesToRadians(this.tiltAngleY);
    const _z = degreesToRadians(this.tiltAngleZ);

    const cosX = Math.cos(x);
    const sinX = Math.sin(x);
    const cosY = Math.cos(y);
    const sinY = Math.sin(y);

    const gravX = this.standardGravity * (sinX * cosY);
    const gravY = -this.standardGravity * cosX;
    const gravZ = this.standardGravity * (sinX * sinY);

    return {
      x: gravX * (this.gravityCompensationEnabled ? 1 : 0),
      y: gravY,
      z: gravZ * (this.gravityCompensationEnabled ? 1 : 0),
    };
  }

  applyNudgeImpulse(force: Vector3): void {
    this.setTableTilt(
      this.tiltAngleX + (force.x * this.tiltSensitivity * 0.1),
      this.tiltAngleY + (force.y * this.tiltSensitivity * 0.1),
      this.tiltAngleZ + (force.z * this.tiltSensitivity * 0.05)
    );
  }

  dampTilt(deltaTime: number): void {
    const dampFactor = Math.pow(0.95, deltaTime * 60);
    this.tiltAngleX *= dampFactor;
    this.tiltAngleY *= dampFactor;
    this.tiltAngleZ *= dampFactor;
  }
}

// ─── Flipper Advanced Physics ───────────────────────────────────────────

class FlipperAdvanced {
  private leftPower: number = 100;
  private rightPower: number = 100;
  private maxPowerOverloads: number = 0;
  private lastFlipTime: number = 0;

  constructor(config: BAMConfig) {
    this.leftPower = config.physics.flipperPower;
    this.rightPower = config.physics.flipperPower;
  }

  setFlipperPower(side: 'left' | 'right', power: number): void {
    const clampedPower = Math.max(0, Math.min(100, power));

    if (side === 'left') {
      this.leftPower = clampedPower;
    } else {
      this.rightPower = clampedPower;
    }

    if (clampedPower > 120) {
      this.maxPowerOverloads++;
    }
  }

  getFlipperPower(side: 'left' | 'right'): number {
    return side === 'left' ? this.leftPower : this.rightPower;
  }

  getFlipperForceMultiplier(side: 'left' | 'right'): number {
    const power = this.getFlipperPower(side);
    return 1.0 + (power - 50) / 50;
  }

  getPowerOverloads(): number {
    return this.maxPowerOverloads;
  }

  resetOverloads(): void {
    this.maxPowerOverloads = 0;
  }
}

// ─── Animation Sequencer ────────────────────────────────────────────────

class AnimationSequencer {
  private sequences: Map<number, AnimationSequence> = new Map();
  private currentSequence: AnimationSequence | null = null;
  private currentSequenceId: number = 0;
  private elapsedTime: number = 0;
  private isPlaying: boolean = false;

  loadSequence(sequenceId: number, seqData: string): void {
    const lines = seqData.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#'));

    let name = `Sequence_${sequenceId}`;
    let frameRate = 60;
    const frames: Keyframe[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (line.startsWith('NAME')) {
        name = line.split(/\s+/, 2)[1] || name;
      } else if (line.startsWith('FRAMERATE')) {
        frameRate = parseInt(lines[i].split(/\s+/)[1]) || 60;
      } else if (line.startsWith('FRAME')) {
        const frameNum = parseInt(lines[i].split(/\s+/)[1]) || 0;
        const keyframe: Keyframe = {
          time: (frameNum / frameRate) * 1000,
          position: { x: 0, y: 0, z: 0 },
          rotation: { x: 0, y: 0, z: 0 },
          scale: { x: 1, y: 1, z: 1 },
          duration: 0,
        };

        while (i + 1 < lines.length && !lines[i + 1].startsWith('FRAME')) {
          i++;
          const dataLine = lines[i];

          if (dataLine.startsWith('POS')) {
            const parts = dataLine.split(/\s+/);
            keyframe.position = {
              x: parseFloat(parts[1]) || 0,
              y: parseFloat(parts[2]) || 0,
              z: parseFloat(parts[3]) || 0,
            };
          } else if (dataLine.startsWith('ROT')) {
            const parts = dataLine.split(/\s+/);
            keyframe.rotation = {
              x: parseFloat(parts[1]) || 0,
              y: parseFloat(parts[2]) || 0,
              z: parseFloat(parts[3]) || 0,
            };
          } else if (dataLine.startsWith('SCALE')) {
            const parts = dataLine.split(/\s+/);
            keyframe.scale = {
              x: parseFloat(parts[1]) || 1,
              y: parseFloat(parts[2]) || 1,
              z: parseFloat(parts[3]) || 1,
            };
          } else if (dataLine.startsWith('DURATION')) {
            keyframe.duration = parseFloat(dataLine.split(/\s+/)[1]) || 0;
          }
        }

        frames.push(keyframe);
      }
    }

    if (frames.length > 0) {
      const totalDuration = frames[frames.length - 1].time + frames[frames.length - 1].duration;
      const sequence: AnimationSequence = {
        name,
        frameRate,
        frames,
        looping: false,
        duration: totalDuration,
      };
      this.sequences.set(sequenceId, sequence);
    }
  }

  playSequence(sequenceId: number): void {
    const seq = this.sequences.get(sequenceId);
    if (seq) {
      this.currentSequence = seq;
      this.currentSequenceId = sequenceId;
      this.elapsedTime = 0;
      this.isPlaying = true;
    }
  }

  stopAnimation(): void {
    this.isPlaying = false;
    this.currentSequence = null;
    this.elapsedTime = 0;
  }

  update(deltaTime: number): void {
    if (!this.isPlaying || !this.currentSequence) return;

    this.elapsedTime += deltaTime * 1000;

    if (this.elapsedTime >= this.currentSequence.duration) {
      if (this.currentSequence.looping) {
        this.elapsedTime = this.elapsedTime % this.currentSequence.duration;
      } else {
        this.isPlaying = false;
        return;
      }
    }
  }

  getCurrentKeyframe(): Keyframe | null {
    if (!this.currentSequence || !this.isPlaying) return null;

    const frames = this.currentSequence.frames;

    let keyframe1 = frames[0];
    let keyframe2 = frames[Math.min(1, frames.length - 1)];

    for (let i = 0; i < frames.length - 1; i++) {
      if (this.elapsedTime >= frames[i].time && this.elapsedTime <= frames[i + 1].time) {
        keyframe1 = frames[i];
        keyframe2 = frames[i + 1];
        break;
      }
    }

    const duration = keyframe2.time - keyframe1.time;
    const alpha = duration > 0 ? (this.elapsedTime - keyframe1.time) / duration : 0;

    return {
      time: this.elapsedTime,
      position: lerpVec3(keyframe1.position, keyframe2.position, alpha),
      rotation: lerpVec3(keyframe1.rotation, keyframe2.rotation, alpha),
      scale: lerpVec3(keyframe1.scale, keyframe2.scale, alpha),
      duration: 0,
    };
  }

  isAnimationPlaying(): boolean {
    return this.isPlaying;
  }
}

// ─── Lighting Controller ────────────────────────────────────────────────

class LightingController {
  private mainLight: THREE.SpotLight | null = null;
  private baseIntensity: number = 2.0;
  private targetIntensity: number = 2.0;
  private transitionSpeed: number = 2.0;

  constructor(light: THREE.SpotLight | null, baseIntensity: number = 2.0) {
    this.mainLight = light;
    this.baseIntensity = baseIntensity;
    this.targetIntensity = baseIntensity;
  }

  setLightIntensity(intensity: number): void {
    this.targetIntensity = Math.max(0, intensity);
  }

  getLightIntensity(): number {
    return this.mainLight?.intensity || this.baseIntensity;
  }

  pulseLight(duration: number, peakIntensity: number): void {
    this.targetIntensity = peakIntensity;

    setTimeout(() => {
      this.targetIntensity = this.baseIntensity;
    }, duration);
  }

  flashLight(count: number, flashDuration: number, interval: number): void {
    for (let i = 0; i < count; i++) {
      setTimeout(() => {
        this.setLightIntensity(this.baseIntensity * 2);
        setTimeout(() => {
          this.setLightIntensity(this.baseIntensity);
        }, flashDuration);
      }, i * interval);
    }
  }

  update(deltaTime: number): void {
    if (!this.mainLight) return;

    const current = this.mainLight.intensity;
    const diff = this.targetIntensity - current;
    const change = Math.max(-this.transitionSpeed * deltaTime, Math.min(this.transitionSpeed * deltaTime, diff));

    this.mainLight.intensity = Math.max(0, current + change);
  }
}

// ─── Configuration Manager ──────────────────────────────────────────────

class ConfigManager {
  private config: BAMConfig;
  private tableName: string = 'default';

  constructor(tableName: string = 'default') {
    this.tableName = tableName;
    this.config = this.getDefaultConfig();
    this.loadFromStorage();
  }

  private getDefaultConfig(): BAMConfig {
    return {
      mode: 'desktop',
      camera: {
        fov: 60,
        near: 0.1,
        far: 200,
      },
      lighting: {
        lightStrength: 2.0,
        ambientIntensity: 0.25,
        diffuseIntensity: 1.0,
      },
      physics: {
        tiltSensitivity: 1.0,
        gravityCompensation: true,
        flipperPower: 100,
        multiballMode: false,
      },
      animation: {
        enabled: true,
        interpolation: 'cubic',
        autoPlay: true,
      },
    };
  }

  private loadFromStorage(): void {
    try {
      const key = `bam_config_${this.tableName}`;
      const stored = localStorage.getItem(key);
      if (stored) {
        const loaded = JSON.parse(stored);
        this.config = { ...this.config, ...loaded };
      }
    } catch (e) {
      // Silently fail if localStorage is unavailable
    }
  }

  saveToStorage(): void {
    try {
      const key = `bam_config_${this.tableName}`;
      localStorage.setItem(key, JSON.stringify(this.config));
    } catch (e) {
      // Silently fail if localStorage is unavailable
    }
  }

  get<T extends keyof BAMConfig>(key: T): BAMConfig[T] {
    return this.config[key];
  }

  set<T extends keyof BAMConfig>(key: T, value: BAMConfig[T]): void {
    this.config[key] = value;
    this.saveToStorage();
  }

  getAll(): BAMConfig {
    return { ...this.config };
  }
}

export { TablePhysics, FlipperAdvanced, AnimationSequencer, LightingController, ConfigManager };
