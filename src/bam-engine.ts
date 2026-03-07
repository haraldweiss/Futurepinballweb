/**
 * BAM (Better Arcade Mode) Engine for Futurepinball Web
 * Implements advanced table mechanics, animation sequencing, and enhanced lighting
 * Runs parallel to Rapier2D physics for compatible physics simulation
 */

import * as THREE from 'three';

// ─── Types & Interfaces ────────────────────────────────────────────────────

export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export interface Quaternion {
  x: number;
  y: number;
  z: number;
  w: number;
}

export interface Keyframe {
  time: number;  // Milliseconds from animation start
  position: Vector3;
  rotation: Vector3;  // Euler angles in degrees
  scale: Vector3;
  duration: number;  // Time until next keyframe in ms
}

export interface AnimationSequence {
  name: string;
  frameRate: number;
  frames: Keyframe[];
  looping: boolean;
  duration: number;  // Total duration in ms
}

export interface BAMConfig {
  // Display mode
  mode: 'desktop' | 'cabinet' | 'vr';

  // Camera settings
  camera: {
    fov: number;
    near: number;
    far: number;
  };

  // Lighting
  lighting: {
    lightStrength: number;
    ambientIntensity: number;
    diffuseIntensity: number;
  };

  // Physics
  physics: {
    tiltSensitivity: number;        // 0.5-2.0, default 1.0
    gravityCompensation: boolean;   // Enable/disable tilt gravity effect
    flipperPower: number;           // Base flipper power 0-100
    multiballMode: boolean;
  };

  // Animation
  animation: {
    enabled: boolean;
    interpolation: 'linear' | 'cubic';
    autoPlay: boolean;
  };
}

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

// Cubic Hermite interpolation for smooth keyframe transitions
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
  private tiltAngleX: number = 0;  // Pitch (forward/backward)
  private tiltAngleY: number = 0;  // Roll (left/right)
  private tiltAngleZ: number = 0;  // Yaw (rotation)
  private tiltSensitivity: number = 1.0;
  private gravityCompensationEnabled: boolean = true;
  private standardGravity: number = 9.81;

  constructor(config: BAMConfig) {
    this.tiltSensitivity = config.physics.tiltSensitivity;
    this.gravityCompensationEnabled = config.physics.gravityCompensation;
  }

  /**
   * Set table tilt angles (in degrees)
   * @param x Pitch angle (-45 to 45 degrees)
   * @param y Roll angle (-45 to 45 degrees)
   * @param z Yaw angle (0 to 360 degrees)
   */
  setTableTilt(x: number, y: number, z: number): void {
    // Clamp angles to reasonable ranges
    this.tiltAngleX = Math.max(-45, Math.min(45, x));
    this.tiltAngleY = Math.max(-45, Math.min(45, y));
    this.tiltAngleZ = ((z % 360) + 360) % 360;
  }

  /**
   * Get current table tilt angles
   */
  getTiltAngles(): Vector3 {
    return {
      x: this.tiltAngleX,
      y: this.tiltAngleY,
      z: this.tiltAngleZ,
    };
  }

  /**
   * Get effective gravity vector based on table tilt
   * Returns gravity direction in 3D space accounting for table orientation
   */
  getGravityVector(): Vector3 {
    const x = degreesToRadians(this.tiltAngleX);
    const y = degreesToRadians(this.tiltAngleY);
    const z = degreesToRadians(this.tiltAngleZ);

    // Rotation matrices applied in ZYX order
    const cosX = Math.cos(x);
    const sinX = Math.sin(x);
    const cosY = Math.cos(y);
    const sinY = Math.sin(y);

    // Compute gravity components after rotation
    const gravX = this.standardGravity * (sinX * cosY);
    const gravY = -this.standardGravity * cosX;  // Down in table space
    const gravZ = this.standardGravity * (sinX * sinY);

    return {
      x: gravX * (this.gravityCompensationEnabled ? 1 : 0),
      y: gravY,
      z: gravZ * (this.gravityCompensationEnabled ? 1 : 0),
    };
  }

  /**
   * Apply impulse-based nudge to table (simulates cabinet nudging)
   */
  applyNudgeImpulse(force: Vector3): void {
    // Add nudge impulse to tilt angles
    this.setTableTilt(
      this.tiltAngleX + (force.x * this.tiltSensitivity * 0.1),
      this.tiltAngleY + (force.y * this.tiltSensitivity * 0.1),
      this.tiltAngleZ + (force.z * this.tiltSensitivity * 0.05)
    );
  }

  /**
   * Damp tilt angles back toward zero (natural settling)
   */
  dampTilt(deltaTime: number): void {
    const dampFactor = Math.pow(0.95, deltaTime * 60);  // Per-frame damping
    this.tiltAngleX *= dampFactor;
    this.tiltAngleY *= dampFactor;
    this.tiltAngleZ *= dampFactor;
  }
}

// ─── Flipper Advanced Physics ───────────────────────────────────────────

class FlipperAdvanced {
  private leftPower: number = 100;      // 0-100
  private rightPower: number = 100;     // 0-100
  private maxPowerOverloads: number = 0;
  private lastFlipTime: number = 0;

  constructor(config: BAMConfig) {
    this.leftPower = config.physics.flipperPower;
    this.rightPower = config.physics.flipperPower;
  }

  /**
   * Set flipper power (0-100%)
   */
  setFlipperPower(side: 'left' | 'right', power: number): void {
    const clampedPower = Math.max(0, Math.min(100, power));

    if (side === 'left') {
      this.leftPower = clampedPower;
    } else {
      this.rightPower = clampedPower;
    }

    // Detect overload (power > 120% triggers overload warning)
    if (clampedPower > 120) {
      this.maxPowerOverloads++;
    }
  }

  /**
   * Get flipper power
   */
  getFlipperPower(side: 'left' | 'right'): number {
    return side === 'left' ? this.leftPower : this.rightPower;
  }

  /**
   * Get effective flipper impulse force based on power level
   * Returns value from 1.0 (50% power) to 2.0 (200% power)
   */
  getFlipperForceMultiplier(side: 'left' | 'right'): number {
    const power = this.getFlipperPower(side);
    return 1.0 + (power - 50) / 50;  // 50% power = 1.0x, 100% = 2.0x
  }

  /**
   * Get number of power overloads (excessive power events)
   */
  getPowerOverloads(): number {
    return this.maxPowerOverloads;
  }

  /**
   * Reset overload counter
   */
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

  /**
   * Load animation sequence from parsed .seq file data
   */
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
          time: (frameNum / frameRate) * 1000,  // Convert to milliseconds
          position: { x: 0, y: 0, z: 0 },
          rotation: { x: 0, y: 0, z: 0 },
          scale: { x: 1, y: 1, z: 1 },
          duration: 0,
        };

        // Parse keyframe data from following lines
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

  /**
   * Play a loaded sequence by ID (1, 2, or 3)
   */
  playSequence(sequenceId: number): void {
    const seq = this.sequences.get(sequenceId);
    if (seq) {
      this.currentSequence = seq;
      this.currentSequenceId = sequenceId;
      this.elapsedTime = 0;
      this.isPlaying = true;
    }
  }

  /**
   * Stop current animation
   */
  stopAnimation(): void {
    this.isPlaying = false;
    this.currentSequence = null;
    this.elapsedTime = 0;
  }

  /**
   * Update animation state
   */
  update(deltaTime: number): void {
    if (!this.isPlaying || !this.currentSequence) return;

    this.elapsedTime += deltaTime * 1000;  // Convert to ms

    // Check if animation finished
    if (this.elapsedTime >= this.currentSequence.duration) {
      if (this.currentSequence.looping) {
        this.elapsedTime = this.elapsedTime % this.currentSequence.duration;
      } else {
        this.isPlaying = false;
        return;
      }
    }
  }

  /**
   * Get interpolated keyframe for current animation time
   */
  getCurrentKeyframe(): Keyframe | null {
    if (!this.currentSequence || !this.isPlaying) return null;

    const frames = this.currentSequence.frames;

    // Find surrounding keyframes
    let keyframe1 = frames[0];
    let keyframe2 = frames[Math.min(1, frames.length - 1)];

    for (let i = 0; i < frames.length - 1; i++) {
      if (this.elapsedTime >= frames[i].time && this.elapsedTime <= frames[i + 1].time) {
        keyframe1 = frames[i];
        keyframe2 = frames[i + 1];
        break;
      }
    }

    // Interpolate between keyframes
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

  /**
   * Check if animation is currently playing
   */
  isAnimationPlaying(): boolean {
    return this.isPlaying;
  }
}

// ─── Lighting Controller ────────────────────────────────────────────────

class LightingController {
  private mainLight: THREE.SpotLight | null = null;
  private baseIntensity: number = 2.0;
  private targetIntensity: number = 2.0;
  private transitionSpeed: number = 2.0;  // Intensity units per second

  constructor(light: THREE.SpotLight | null, baseIntensity: number = 2.0) {
    this.mainLight = light;
    this.baseIntensity = baseIntensity;
    this.targetIntensity = baseIntensity;
  }

  /**
   * Set target light intensity
   */
  setLightIntensity(intensity: number): void {
    this.targetIntensity = Math.max(0, intensity);
  }

  /**
   * Get current light intensity
   */
  getLightIntensity(): number {
    return this.mainLight?.intensity || this.baseIntensity;
  }

  /**
   * Pulse light (bright flash then fade)
   */
  pulseLight(duration: number, peakIntensity: number): void {
    // Set to peak immediately
    this.targetIntensity = peakIntensity;

    // Schedule fade back to base after duration
    setTimeout(() => {
      this.targetIntensity = this.baseIntensity;
    }, duration);
  }

  /**
   * Flash light multiple times
   */
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

  /**
   * Update light intensity toward target (smooth transition)
   */
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

  /**
   * Get default BAM configuration
   */
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

  /**
   * Load configuration from localStorage
   */
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

  /**
   * Save configuration to localStorage
   */
  saveToStorage(): void {
    try {
      const key = `bam_config_${this.tableName}`;
      localStorage.setItem(key, JSON.stringify(this.config));
    } catch (e) {
      // Silently fail if localStorage is unavailable
    }
  }

  /**
   * Get configuration value
   */
  get<T extends keyof BAMConfig>(key: T): BAMConfig[T] {
    return this.config[key];
  }

  /**
   * Set configuration value
   */
  set<T extends keyof BAMConfig>(key: T, value: BAMConfig[T]): void {
    this.config[key] = value;
    this.saveToStorage();
  }

  /**
   * Get entire configuration
   */
  getAll(): BAMConfig {
    return { ...this.config };
  }
}

// ─── Main BAM Engine ────────────────────────────────────────────────────

export class BAMEngine {
  private config: ConfigManager;
  private tablePhysics: TablePhysics;
  private flipperAdvanced: FlipperAdvanced;
  private animationSequencer: AnimationSequencer;
  private lightingController: LightingController;
  private enabled: boolean = true;

  constructor(tableName: string = 'default', mainLight: THREE.SpotLight | null = null) {
    const configManager = new ConfigManager(tableName);
    this.config = configManager;

    const bamConfig = configManager.getAll();
    this.tablePhysics = new TablePhysics(bamConfig);
    this.flipperAdvanced = new FlipperAdvanced(bamConfig);
    this.animationSequencer = new AnimationSequencer();
    this.lightingController = new LightingController(mainLight, bamConfig.lighting.lightStrength);
  }

  /**
   * Enable/disable BAM engine
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /**
   * Main update loop - call once per frame
   */
  step(deltaTime: number, substeps: number = 1): void {
    if (!this.enabled) return;

    const dt = deltaTime / substeps;

    for (let i = 0; i < substeps; i++) {
      // Update table physics
      this.tablePhysics.dampTilt(dt);

      // Update animations
      this.animationSequencer.update(dt);

      // Update lighting
      this.lightingController.update(dt);
    }
  }

  /**
   * Get table physics controller
   */
  getTablePhysics(): TablePhysics {
    return this.tablePhysics;
  }

  /**
   * Get flipper controller
   */
  getFlipperAdvanced(): FlipperAdvanced {
    return this.flipperAdvanced;
  }

  /**
   * Get animation sequencer
   */
  getAnimationSequencer(): AnimationSequencer {
    return this.animationSequencer;
  }

  /**
   * Get lighting controller
   */
  getLightingController(): LightingController {
    return this.lightingController;
  }

  /**
   * Get configuration manager
   */
  getConfig(): ConfigManager {
    return this.config;
  }
}

// ─── Module Exports ────────────────────────────────────────────────────

export { TablePhysics, FlipperAdvanced, AnimationSequencer, LightingController, ConfigManager };
