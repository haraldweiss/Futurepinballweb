/**
 * ball-trail-manager.ts — Visual trail behind ball
 * Phase 27: Ball Movement Visualization
 * 
 * Renders a glowing trail that follows the ball's path
 * Creates arcade atmosphere and helps track ball movement
 */

import * as THREE from 'three';

/**
 * Ball Trail Manager - Glow trail following ball
 */
export class BallTrailManager {
  private lineGeometry: THREE.BufferGeometry;
  private lineMaterial: THREE.LineBasicMaterial;
  private trail: THREE.Line;
  private positions: number[] = [];
  private maxTrailLength = 120;  // ~2 seconds at 60 FPS
  private updateCounter = 0;
  private updateFrequency = 2;  // Update every 2 frames (30 Hz)
  private scene: THREE.Scene;
  private enabled: boolean = true;

  constructor(scene: THREE.Scene) {
    this.scene = scene;

    // ─── Create line geometry ───
    this.lineGeometry = new THREE.BufferGeometry();
    
    // Create line material with glow
    this.lineMaterial = new THREE.LineBasicMaterial({
      color: 0x00ff88,        // Neon green
      linewidth: 2,
      transparent: true,
      fog: false,
    });

    // Create line mesh
    this.trail = new THREE.Line(this.lineGeometry, this.lineMaterial);
    this.trail.frustumCulled = false;
    scene.add(this.trail);

    console.log('[Ball Trail] ✓ Initialized');
  }

  /**
   * Update trail with ball position
   */
  update(ballPos: THREE.Vector3): void {
    if (!this.enabled || this.updateCounter++ % this.updateFrequency !== 0) return;

    // Add position to trail
    this.positions.push(ballPos.x, ballPos.y, ballPos.z);

    // Limit trail length
    if (this.positions.length > this.maxTrailLength * 3) {
      this.positions.splice(0, 3); // Remove oldest point
    }

    // Update geometry
    this.updateGeometry();
  }

  /**
   * Update line geometry with current positions
   */
  private updateGeometry(): void {
    this.lineGeometry.setAttribute(
      'position',
      new THREE.BufferAttribute(new Float32Array(this.positions), 3)
    );
    this.lineGeometry.attributes.position.needsUpdate = true;

    // Compute bounding sphere for frustum culling
    this.lineGeometry.computeBoundingSphere();

    // Create fade-out effect
    this.updateColors();
  }

  /**
   * Apply fade-out to trail
   */
  private updateColors(): void {
    const count = this.positions.length / 3;
    const colors: number[] = [];

    for (let i = 0; i < count; i++) {
      // Fade from opaque (tail) to transparent (head)
      const alpha = i / count;
      const r = 0;
      const g = 1;
      const b = 0.5;
      
      colors.push(r, g, b);
    }

    this.lineGeometry.setAttribute(
      'color',
      new THREE.BufferAttribute(new Float32Array(colors), 3)
    );

    // Update material to use vertex colors
    this.lineMaterial.vertexColors = true;
    (this.lineMaterial as any).linewidth = 2;
  }

  /**
   * Clear trail
   */
  clear(): void {
    this.positions = [];
    this.lineGeometry.attributes.position?.array.fill(0);
    if (this.lineGeometry.attributes.position) {
      this.lineGeometry.attributes.position.needsUpdate = true;
    }
  }

  /**
   * Set enabled state
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    this.trail.visible = enabled;
    if (!enabled) {
      this.clear();
    }
  }

  /**
   * Toggle enabled state
   */
  toggle(): void {
    this.setEnabled(!this.enabled);
  }

  /**
   * Get enabled state
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Get trail length
   */
  getTrailLength(): number {
    return this.positions.length / 3;
  }

  /**
   * Set trail color
   */
  setColor(color: number): void {
    this.lineMaterial.color.setHex(color);
  }

  /**
   * Dispose resources
   */
  dispose(): void {
    this.clear();
    this.lineGeometry.dispose();
    this.lineMaterial.dispose();
    this.scene.remove(this.trail);
  }
}

/**
 * Singleton instance
 */
let ballTrailManager: BallTrailManager | null = null;

/**
 * Initialize ball trail manager
 */
export function initBallTrailManager(scene: THREE.Scene): BallTrailManager {
  if (!ballTrailManager) {
    ballTrailManager = new BallTrailManager(scene);
  }
  return ballTrailManager;
}

/**
 * Get ball trail manager
 */
export function getBallTrailManager(): BallTrailManager | null {
  return ballTrailManager;
}

/**
 * Dispose ball trail manager
 */
export function disposeBallTrailManager(): void {
  if (ballTrailManager) {
    ballTrailManager.dispose();
    ballTrailManager = null;
  }
}

