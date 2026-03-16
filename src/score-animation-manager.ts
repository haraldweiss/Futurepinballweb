/**
 * score-animation-manager.ts — Floating score numbers
 * Phase 28: Score Feedback Animations
 * 
 * Displays floating numbers when player scores points
 * Classic pinball arcade effect for immediate feedback
 */

import * as THREE from 'three';

/**
 * Score animation entry
 */
interface ScoreAnim {
  sprite: THREE.Sprite;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  lifetime: number;
  maxLifetime: number;
  canvas: HTMLCanvasElement;
  texture: THREE.CanvasTexture;
  active: boolean;
}

/**
 * Score Animation Manager
 */
export class ScoreAnimationManager {
  private scene: THREE.Scene;
  private animations: ScoreAnim[] = [];
  private maxAnimations = 50;
  private spriteMaterial: THREE.SpriteMaterial;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    
    // Reuse material for all sprites
    this.spriteMaterial = new THREE.SpriteMaterial({
      transparent: true,
      fog: false,
    });

    console.log('[Score Animation] ✓ Initialized');
  }

  /**
   * Add floating score at position
   */
  addScore(position: THREE.Vector3, score: number, color: string = '#00ff88'): void {
    // Limit active animations
    if (this.animations.length >= this.maxAnimations) {
      const oldest = this.animations.shift();
      if (oldest) {
        this.scene.remove(oldest.sprite);
        oldest.texture.dispose();
        oldest.canvas.width = 0;
        oldest.canvas.height = 0;
      }
    }

    // Create canvas for text
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 128;

    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = color;
    ctx.font = 'bold 60px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`+${score.toLocaleString()}`, 128, 64);

    // Create texture from canvas
    const texture = new THREE.CanvasTexture(canvas);
    texture.center.set(0.5, 0.5);

    // Create sprite
    const sprite = new THREE.Sprite(this.spriteMaterial.clone());
    sprite.map = texture;
    sprite.material.map = texture;
    sprite.position.copy(position);
    sprite.scale.set(0.5, 0.25, 1);

    this.scene.add(sprite);

    // Add animation
    const anim: ScoreAnim = {
      sprite,
      position: position.clone(),
      velocity: new THREE.Vector3(
        (Math.random() - 0.5) * 2,  // Random X drift
        3.0,                         // Upward velocity
        0
      ),
      lifetime: 0,
      maxLifetime: 1.5,  // 1.5 seconds
      canvas,
      texture,
      active: true,
    };

    this.animations.push(anim);
  }

  /**
   * Update all animations
   */
  update(dt: number): void {
    for (let i = this.animations.length - 1; i >= 0; i--) {
      const anim = this.animations[i];
      if (!anim.active) continue;

      anim.lifetime += dt;

      // Fade out
      const progress = anim.lifetime / anim.maxLifetime;
      anim.sprite.material.opacity = Math.max(0, 1 - progress);

      // Move up
      anim.position.add(anim.velocity.clone().multiplyScalar(dt));
      anim.sprite.position.copy(anim.position);

      // Scale down
      const scale = 0.5 * (1 - progress * 0.5);
      anim.sprite.scale.set(scale, scale * 0.5, 1);

      // Remove when done
      if (anim.lifetime >= anim.maxLifetime) {
        this.scene.remove(anim.sprite);
        anim.texture.dispose();
        (anim.sprite.material as THREE.Material).dispose();
        anim.canvas.width = 0;
        anim.canvas.height = 0;
        anim.active = false;
        this.animations.splice(i, 1);
      }
    }
  }

  /**
   * Add bumper hit animation
   */
  addBumperHit(position: THREE.Vector3, points: number): void {
    this.addScore(position, points, '#ff6600');  // Orange
  }

  /**
   * Add target hit animation
   */
  addTargetHit(position: THREE.Vector3, points: number): void {
    this.addScore(position, points, '#00ff00');  // Green
  }

  /**
   * Add slingshot hit animation
   */
  addSlingshotHit(position: THREE.Vector3, points: number): void {
    this.addScore(position, points, '#ffff00');  // Yellow
  }

  /**
   * Add multiplier animation
   */
  addMultiplier(position: THREE.Vector3, multiplier: number): void {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 128;

    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#ff00ff';
    ctx.font = 'bold 50px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`x${multiplier}`, 128, 64);

    const texture = new THREE.CanvasTexture(canvas);
    const sprite = new THREE.Sprite(this.spriteMaterial.clone());
    sprite.map = texture;
    sprite.material.map = texture;
    sprite.position.copy(position);
    sprite.scale.set(0.4, 0.2, 1);

    this.scene.add(sprite);

    const anim: ScoreAnim = {
      sprite,
      position: position.clone(),
      velocity: new THREE.Vector3(0, 2.0, 0),
      lifetime: 0,
      maxLifetime: 1.2,
      canvas,
      texture,
      active: true,
    };

    this.animations.push(anim);
  }

  /**
   * Get active animation count
   */
  getActiveCount(): number {
    return this.animations.filter(a => a.active).length;
  }

  /**
   * Dispose all resources
   */
  dispose(): void {
    for (const anim of this.animations) {
      if (anim.active) {
        this.scene.remove(anim.sprite);
        anim.texture.dispose();
        (anim.sprite.material as THREE.Material).dispose();
      }
    }
    this.animations = [];
    this.spriteMaterial.dispose();
  }
}

/**
 * Singleton instance
 */
let scoreAnimationManager: ScoreAnimationManager | null = null;

/**
 * Initialize score animation manager
 */
export function initScoreAnimationManager(scene: THREE.Scene): ScoreAnimationManager {
  if (!scoreAnimationManager) {
    scoreAnimationManager = new ScoreAnimationManager(scene);
  }
  return scoreAnimationManager;
}

/**
 * Get score animation manager
 */
export function getScoreAnimationManager(): ScoreAnimationManager | null {
  return scoreAnimationManager;
}

/**
 * Dispose score animation manager
 */
export function disposeScoreAnimationManager(): void {
  if (scoreAnimationManager) {
    scoreAnimationManager.dispose();
    scoreAnimationManager = null;
  }
}

