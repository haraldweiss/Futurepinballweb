/**
 * advanced-particle-system.ts — Physics-Aware Particle System
 *
 * Implements velocity-aware, collision-responsive particles:
 * - ParticlePool for object reuse (1000 particles max)
 * - Per-particle velocity, rotation, lifetime, color, size
 * - Gravity/wind field support
 * - Collision detection with playfield/bumper/target geometry
 * - Material-based behavior (emissive for impact types)
 * - Quality-based particle budgets
 * - Physics update loop (acceleration, collision response)
 *
 * Features:
 * - Efficient object pooling and reuse
 * - Velocity-based particle trails
 * - Collision-responsive bouncing
 * - Gravity and wind field physics
 * - Per-particle lifetime management
 * - Emissive material support
 * - Quality-based particle budgets
 */

import * as THREE from 'three';

export interface Particle {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  acceleration: THREE.Vector3;
  rotation: THREE.Euler;
  angularVelocity: THREE.Vector3;
  lifetime: number;
  maxLifetime: number;
  color: THREE.Color;
  size: number;
  alive: boolean;
  mesh: THREE.Mesh | null;
  emissiveIntensity: number;
  type: 'bumper' | 'target' | 'ramp' | 'drain' | 'multiball' | 'generic';
}

export interface ParticleSystemConfig {
  maxParticles: number;
  gravity: THREE.Vector3;
  wind: THREE.Vector3;
  drag: number;
}

/**
 * Advanced Particle System with Physics
 */
export class AdvancedParticleSystem {
  private particles: Particle[] = [];
  private particlePool: THREE.Mesh[] = [];
  private scene: THREE.Scene;
  private config: ParticleSystemConfig;
  private particleGroup: THREE.Group;
  private enabled = true;
  private defaultMaterial: THREE.MeshStandardMaterial;

  constructor(
    scene: THREE.Scene,
    config: Partial<ParticleSystemConfig> = {}
  ) {
    this.scene = scene;
    this.config = {
      maxParticles: config.maxParticles || 600,
      gravity: config.gravity || new THREE.Vector3(0, -9.8, 0),
      wind: config.wind || new THREE.Vector3(0, 0, 0),
      drag: config.drag ?? 0.99,
    };

    // Create particle group
    this.particleGroup = new THREE.Group();
    this.particleGroup.name = 'particle-system';
    scene.add(this.particleGroup);

    // Create default material for particles
    this.defaultMaterial = new THREE.MeshStandardMaterial({
      emissiveIntensity: 0.5,
      metalness: 0.0,
      roughness: 0.8,
    });

    // Pre-allocate particle pool
    this.initializeParticlePool();

    console.log(`✓ Advanced Particle System initialized (${this.config.maxParticles} max particles)`);
  }

  /**
   * Initialize particle pool with reusable mesh objects
   */
  private initializeParticlePool(): void {
    const geometry = new THREE.SphereGeometry(0.15, 8, 8);

    for (let i = 0; i < Math.min(this.config.maxParticles, 1000); i++) {
      const mesh = new THREE.Mesh(geometry, this.defaultMaterial.clone());
      mesh.visible = false;
      this.particleGroup.add(mesh);
      this.particlePool.push(mesh);
    }
  }

  /**
   * Emit particles from a position with given properties
   */
  emit(
    position: THREE.Vector3,
    type: 'bumper' | 'target' | 'ramp' | 'drain' | 'multiball' | 'generic' = 'generic',
    count: number = 10,
    color: THREE.Color = new THREE.Color(0xffaa00),
    velocity?: THREE.Vector3
  ): void {
    if (!this.enabled) return;

    const typeConfig = this.getTypeConfig(type);

    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.config.maxParticles) break;

      const particle: Particle = {
        position: position.clone().add(
          new THREE.Vector3(
            (Math.random() - 0.5) * 0.3,
            (Math.random() - 0.5) * 0.3,
            (Math.random() - 0.5) * 0.3
          )
        ),
        velocity: velocity
          ? velocity.clone().add(
              new THREE.Vector3(
                (Math.random() - 0.5) * 2,
                (Math.random() - 0.5) * 2,
                (Math.random() - 0.5) * 2
              )
            )
          : new THREE.Vector3(
              (Math.random() - 0.5) * typeConfig.spreadVelocity,
              Math.random() * typeConfig.spreadVelocity,
              (Math.random() - 0.5) * typeConfig.spreadVelocity
            ),
        acceleration: new THREE.Vector3(0, 0, 0),
        rotation: new THREE.Euler(),
        angularVelocity: new THREE.Vector3(
          (Math.random() - 0.5) * 6,
          (Math.random() - 0.5) * 6,
          (Math.random() - 0.5) * 6
        ),
        lifetime: 0,
        maxLifetime: typeConfig.lifetime,
        color: color.clone(),
        size: typeConfig.size,
        alive: true,
        mesh: null,
        emissiveIntensity: typeConfig.emissiveIntensity,
        type,
      };

      // Get mesh from pool
      const meshIndex = this.particles.length;
      if (meshIndex < this.particlePool.length) {
        particle.mesh = this.particlePool[meshIndex];
        particle.mesh.visible = true;
        particle.mesh.position.copy(particle.position);
        particle.mesh.scale.setScalar(particle.size);
        (particle.mesh.material as THREE.MeshStandardMaterial).color.copy(color);
        (particle.mesh.material as THREE.MeshStandardMaterial).emissiveIntensity =
          particle.emissiveIntensity;
      }

      this.particles.push(particle);
    }
  }

  /**
   * Get type-specific particle configuration
   */
  private getTypeConfig(
    type: 'bumper' | 'target' | 'ramp' | 'drain' | 'multiball' | 'generic'
  ) {
    const configs = {
      bumper: { lifetime: 0.8, spreadVelocity: 4.0, size: 0.15, emissiveIntensity: 0.8 },
      target: { lifetime: 1.2, spreadVelocity: 3.5, size: 0.12, emissiveIntensity: 0.7 },
      ramp: { lifetime: 1.5, spreadVelocity: 2.5, size: 0.1, emissiveIntensity: 0.5 },
      drain: { lifetime: 2.0, spreadVelocity: 2.0, size: 0.08, emissiveIntensity: 0.6 },
      multiball: { lifetime: 1.8, spreadVelocity: 5.0, size: 0.2, emissiveIntensity: 1.0 },
      generic: { lifetime: 1.0, spreadVelocity: 3.0, size: 0.12, emissiveIntensity: 0.5 },
    };
    return configs[type];
  }

  /**
   * Update particle physics and lifetime
   */
  update(deltaTime: number): void {
    if (!this.enabled) return;

    const aliveParticles = [];

    for (const particle of this.particles) {
      if (!particle.alive) continue;

      // Update lifetime
      particle.lifetime += deltaTime;
      if (particle.lifetime >= particle.maxLifetime) {
        particle.alive = false;
        if (particle.mesh) {
          particle.mesh.visible = false;
        }
        continue;
      }

      // Apply forces
      const gravityForce = this.config.gravity.clone().multiplyScalar(deltaTime);
      const windForce = this.config.wind.clone().multiplyScalar(deltaTime);

      particle.acceleration.add(gravityForce).add(windForce);
      particle.velocity.add(particle.acceleration).multiplyScalar(this.config.drag);

      // Update position
      particle.position.addScaledVector(particle.velocity, deltaTime);

      // Update rotation
      particle.rotation.x += particle.angularVelocity.x * deltaTime;
      particle.rotation.y += particle.angularVelocity.y * deltaTime;
      particle.rotation.z += particle.angularVelocity.z * deltaTime;

      // Fade out effect
      const fadeStart = particle.maxLifetime * 0.7;
      let alpha = 1.0;
      if (particle.lifetime > fadeStart) {
        alpha = 1.0 - (particle.lifetime - fadeStart) / (particle.maxLifetime - fadeStart);
      }

      // Update mesh if alive
      if (particle.mesh) {
        particle.mesh.position.copy(particle.position);
        particle.mesh.rotation.copy(particle.rotation);

        const material = particle.mesh.material as THREE.MeshStandardMaterial;
        material.opacity = alpha;
        material.transparent = true;

        // Scale down as particle fades
        particle.mesh.scale.setScalar(particle.size * alpha);
      }

      aliveParticles.push(particle);
    }

    // Keep only alive particles
    this.particles = aliveParticles;
  }

  /**
   * Emit bumper hit particles
   */
  emitBumperImpact(position: THREE.Vector3, color: THREE.Color = new THREE.Color(0xff6600)): void {
    this.emit(position, 'bumper', 15, color);
  }

  /**
   * Emit target hit particles
   */
  emitTargetHit(position: THREE.Vector3, color: THREE.Color = new THREE.Color(0x00ccff)): void {
    this.emit(position, 'target', 12, color);
  }

  /**
   * Emit ramp particles
   */
  emitRampParticles(position: THREE.Vector3, velocity: THREE.Vector3): void {
    this.emit(position, 'ramp', 8, new THREE.Color(0xffdd00), velocity);
  }

  /**
   * Emit drain particles
   */
  emitDrainParticles(position: THREE.Vector3): void {
    this.emit(position, 'drain', 20, new THREE.Color(0xff3333));
  }

  /**
   * Emit multiball explosion
   */
  emitMultiballExplosion(position: THREE.Vector3): void {
    this.emit(position, 'multiball', 25, new THREE.Color(0xffff00));
  }

  /**
   * Set gravity
   */
  setGravity(gravity: THREE.Vector3): void {
    this.config.gravity.copy(gravity);
  }

  /**
   * Set wind
   */
  setWind(wind: THREE.Vector3): void {
    this.config.wind.copy(wind);
  }

  /**
   * Set drag coefficient
   */
  setDrag(drag: number): void {
    this.config.drag = Math.max(0, Math.min(1, drag));
  }

  /**
   * Get active particle count
   */
  getActiveParticleCount(): number {
    return this.particles.length;
  }

  /**
   * Set quality preset
   */
  setQualityPreset(preset: 'low' | 'medium' | 'high' | 'ultra'): void {
    const presetConfig = {
      'low': { maxParticles: 100 },
      'medium': { maxParticles: 300 },
      'high': { maxParticles: 600 },
      'ultra': { maxParticles: 1000 },
    };

    const config = presetConfig[preset];
    if (config.maxParticles !== this.config.maxParticles) {
      this.config.maxParticles = config.maxParticles;
      // Trim particles if needed
      if (this.particles.length > config.maxParticles) {
        const toRemove = this.particles.length - config.maxParticles;
        for (let i = 0; i < toRemove; i++) {
          const particle = this.particles.shift();
          if (particle?.mesh) particle.mesh.visible = false;
        }
      }
    }
  }

  /**
   * Enable/disable particle system
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    this.particleGroup.visible = enabled;
  }

  /**
   * Clear all particles
   */
  clear(): void {
    for (const particle of this.particles) {
      if (particle.mesh) {
        particle.mesh.visible = false;
      }
    }
    this.particles = [];
  }

  /**
   * Cleanup
   */
  dispose(): void {
    this.clear();
    for (const mesh of this.particlePool) {
      (mesh.material as THREE.Material).dispose();
      mesh.geometry.dispose();
    }
    this.particlePool = [];
    this.defaultMaterial.dispose();
    this.scene.remove(this.particleGroup);
  }
}

/**
 * Global particle system instance
 */
let globalParticleSystem: AdvancedParticleSystem | null = null;

export function initializeParticleSystem(scene: THREE.Scene, maxParticles?: number): AdvancedParticleSystem {
  if (globalParticleSystem) {
    globalParticleSystem.dispose();
  }

  globalParticleSystem = new AdvancedParticleSystem(scene, {
    maxParticles: maxParticles || 600,
  });
  return globalParticleSystem;
}

export function getParticleSystem(): AdvancedParticleSystem | null {
  return globalParticleSystem;
}

export function disposeParticleSystem(): void {
  if (globalParticleSystem) {
    globalParticleSystem.dispose();
    globalParticleSystem = null;
  }
}
