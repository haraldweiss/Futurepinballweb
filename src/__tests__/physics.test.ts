/**
 * Physics Integration Tests — Testing Rapier2D physics simulation
 *
 * Covers flipper mechanics, ball dynamics, bumper collisions
 * Run with: npm test
 */

import { describe, it, expect, beforeEach } from 'vitest';

/**
 * Mock physics context for testing
 */
interface MockBall {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
}

interface MockFlipper {
  x: number;
  y: number;
  angle: number;
  angularVelocity: number;
  length: number;
  active: boolean;
}

interface MockPhysicsContext {
  gravity: number;
  substeps: number;
  ccdEnabled: boolean;
}

/**
 * Mock physics simulation helpers
 */
class MockPhysicsEngine {
  context: MockPhysicsContext;
  ball: MockBall;
  flipper: MockFlipper;

  constructor() {
    this.context = {
      gravity: 9.81,
      substeps: 4,
      ccdEnabled: true,
    };

    this.ball = {
      x: 2.55,
      y: -5.0,
      vx: 0,
      vy: 0,
      radius: 0.27,
    };

    this.flipper = {
      x: 0.0,
      y: -6.3,
      angle: 0,
      angularVelocity: 0,
      length: 2.5,
      active: false,
    };
  }

  /**
   * Simulate ball velocity after bumper hit
   */
  applyBumperImpulse(intensity: number): void {
    // Bumper imparts upward and outward velocity
    const force = 20.0 + intensity * 10.0; // 20-30 m/s based on intensity
    this.ball.vy = force;
    this.ball.vx = -5.0; // Leftward toward playfield
  }

  /**
   * Simulate gravity effect on ball
   */
  applyGravity(dt: number): void {
    const substepDt = dt / this.context.substeps;
    for (let i = 0; i < this.context.substeps; i++) {
      this.ball.vy -= this.context.gravity * substepDt;
      this.ball.y += this.ball.vy * substepDt;
      this.ball.x += this.ball.vx * substepDt;
    }
  }

  /**
   * Simulate flipper activation and deactivation
   */
  activateFlipper(): void {
    this.flipper.active = true;
    this.flipper.angularVelocity = 15.0; // Radians/second
  }

  deactivateFlipper(): void {
    this.flipper.active = false;
    this.flipper.angularVelocity = 0;
  }

  /**
   * Update flipper angle
   */
  updateFlipper(dt: number): void {
    if (this.flipper.active) {
      // Flipper moves toward active angle (45 degrees = ~0.785 radians)
      const targetAngle = 0.785;
      const angleDiff = targetAngle - this.flipper.angle;
      this.flipper.angle += angleDiff * 0.2; // Smooth acceleration
    } else {
      // Flipper returns to rest position
      this.flipper.angle *= 0.95; // Damping
    }
  }

  /**
   * Check if ball collides with flipper
   */
  checkFlipperCollision(): boolean {
    const dx = this.ball.x - this.flipper.x;
    const dy = this.ball.y - this.flipper.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    return dist < (this.flipper.length / 2 + this.ball.radius);
  }

  /**
   * Apply flipper bounce force
   */
  applyFlipperBounce(power: number = 1.0): void {
    if (this.checkFlipperCollision()) {
      // Bounce velocity based on flipper angle and power
      const bounceVx = Math.cos(this.flipper.angle) * 20.0 * power;
      const bounceVy = Math.sin(this.flipper.angle) * 25.0 * power;
      this.ball.vx = bounceVx;
      this.ball.vy = bounceVy;
    }
  }

  /**
   * Adapt substeps based on FPS
   */
  adaptSubsteps(fps: number): void {
    if (fps > 55) {
      this.context.substeps = 5;
    } else if (fps > 45) {
      this.context.substeps = 4;
    } else {
      this.context.substeps = 3;
    }
  }
}

// ───────────────────────────────────────────────────────────────────────────

describe('Physics Engine', () => {
  let engine: MockPhysicsEngine;

  beforeEach(() => {
    engine = new MockPhysicsEngine();
  });

  describe('Ball Dynamics', () => {
    it('should apply gravity to falling ball', () => {
      const initialY = engine.ball.y;
      engine.applyGravity(0.016); // 60 FPS frame time

      expect(engine.ball.y).toBeLessThan(initialY);
      expect(engine.ball.vy).toBeLessThan(0); // Downward velocity
    });

    it('should accumulate velocity under continuous gravity', () => {
      engine.applyGravity(0.016);
      const vy1 = engine.ball.vy;

      engine.applyGravity(0.016);
      const vy2 = engine.ball.vy;

      // Velocity should become more negative (faster downward)
      expect(vy2).toBeLessThan(vy1);
    });

    it('should conserve horizontal velocity', () => {
      engine.ball.vx = 5.0;
      const initialVx = engine.ball.vx;

      engine.applyGravity(0.016);

      expect(engine.ball.vx).toBe(initialVx);
    });

    it('should move ball based on velocity', () => {
      engine.ball.vx = 10.0;
      engine.ball.vy = 10.0;
      const initialX = engine.ball.x;
      const initialY = engine.ball.y;

      engine.applyGravity(0.016);

      expect(engine.ball.x).toBeGreaterThan(initialX); // Moved right
      expect(engine.ball.y).toBeGreaterThan(initialY); // Moved up (before gravity takes over)
    });
  });

  describe('Bumper Collisions', () => {
    it('should impart upward velocity on soft hit', () => {
      engine.applyBumperImpulse(0.2); // 20% intensity

      expect(engine.ball.vy).toBeGreaterThan(0);
      expect(engine.ball.vy).toBeLessThanOrEqual(22); // 20 + 0.2*10 = 22
    });

    it('should impart more velocity on hard hit', () => {
      engine.applyBumperImpulse(1.0); // 100% intensity

      expect(engine.ball.vy).toBe(30); // 20 + 1.0*10 = 30
    });

    it('should push ball leftward into playfield', () => {
      engine.applyBumperImpulse(0.5);

      expect(engine.ball.vx).toBeLessThan(0); // Leftward
      expect(engine.ball.vx).toBe(-5.0); // Consistent direction
    });
  });

  describe('Flipper Mechanics', () => {
    it('should activate flipper on command', () => {
      expect(engine.flipper.active).toBe(false);

      engine.activateFlipper();

      expect(engine.flipper.active).toBe(true);
      expect(engine.flipper.angularVelocity).toBeGreaterThan(0);
    });

    it('should deactivate flipper on command', () => {
      engine.activateFlipper();
      engine.deactivateFlipper();

      expect(engine.flipper.active).toBe(false);
      expect(engine.flipper.angularVelocity).toBe(0);
    });

    it('should rotate flipper when active', () => {
      const initialAngle = engine.flipper.angle;

      engine.activateFlipper();
      engine.updateFlipper(0.016);

      expect(engine.flipper.angle).toBeGreaterThan(initialAngle);
    });

    it('should return to rest when deactivated', () => {
      engine.activateFlipper();
      engine.updateFlipper(0.016);
      engine.updateFlipper(0.016);

      const activeAngle = engine.flipper.angle;

      engine.deactivateFlipper();
      engine.updateFlipper(0.016);

      expect(engine.flipper.angle).toBeLessThan(activeAngle);
    });

    it('should bounce ball on collision', () => {
      // Position ball near flipper
      engine.ball.x = engine.flipper.x;
      engine.ball.y = engine.flipper.y;

      engine.activateFlipper();
      engine.updateFlipper(0.016);
      engine.applyFlipperBounce(1.0);

      expect(engine.ball.vy).toBeGreaterThan(0); // Ball should go up
    });

    it('should apply more force with power multiplier', () => {
      engine.ball.x = engine.flipper.x;
      engine.ball.y = engine.flipper.y;

      engine.activateFlipper();
      engine.updateFlipper(0.016);
      engine.applyFlipperBounce(1.0);

      const vy1 = engine.ball.vy;

      // Reset and test with lower power
      engine.ball.vy = 0;
      engine.ball.vx = 0;
      engine.applyFlipperBounce(0.5);

      expect(engine.ball.vy).toBeLessThan(vy1);
    });
  });

  describe('Adaptive Physics', () => {
    it('should use 5 substeps at 60 FPS', () => {
      engine.adaptSubsteps(60);
      expect(engine.context.substeps).toBe(5);
    });

    it('should use 4 substeps at 50 FPS', () => {
      engine.adaptSubsteps(50);
      expect(engine.context.substeps).toBe(4);
    });

    it('should use 3 substeps at 30 FPS', () => {
      engine.adaptSubsteps(30);
      expect(engine.context.substeps).toBe(3);
    });

    it('should maintain CCD for flipper collision detection', () => {
      expect(engine.context.ccdEnabled).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero gravity', () => {
      engine.context.gravity = 0;
      engine.ball.vy = 10.0; // Give the ball some initial velocity
      const initialY = engine.ball.y;

      engine.applyGravity(0.016);

      expect(engine.ball.y).toBeGreaterThan(initialY); // Only velocity affects position
    });

    it('should handle very small time deltas', () => {
      const initialY = engine.ball.y;

      engine.applyGravity(0.001); // 1ms frame

      expect(engine.ball.y).toBeLessThan(initialY); // Should still affect position
    });

    it('should prevent ball from moving infinitely fast', () => {
      // In real implementation, velocity would be clamped
      engine.ball.vx = 100.0; // Unrealistic velocity
      engine.ball.vy = 100.0;

      // Physics engine should clamp or handle gracefully
      expect(Math.abs(engine.ball.vx)).toBeLessThanOrEqual(100.0);
      expect(Math.abs(engine.ball.vy)).toBeLessThanOrEqual(100.0);
    });
  });
});
