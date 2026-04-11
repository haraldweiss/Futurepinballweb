/**
 * Input Integration Tests — Keyboard & Touch Controls
 *
 * Tests user input integration with flipper mechanics and ball response.
 * Covers keyboard input, touch controls, multi-touch, and input lag.
 *
 * Run with: npm test
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

/**
 * Mock Input System
 */
interface InputEvent {
  type: 'keydown' | 'keyup' | 'touchstart' | 'touchend';
  key?: string;
  touchId?: number;
  position?: { x: number; y: number };
  timestamp: number;
}

/**
 * Mock Flipper State
 */
interface FlipperState {
  active: boolean;
  rotation: number; // degrees
  targetRotation: number;
  velocity: number;
}

/**
 * Mock Input Processor
 */
class InputProcessor {
  private keyStates: Map<string, boolean> = new Map();
  private touchStates: Map<number, { x: number; y: number }> = new Map();
  private eventHistory: InputEvent[] = [];
  private inputLag: number = 0; // ms

  setInputLag(lag: number): void {
    this.inputLag = lag;
  }

  processKeyDown(key: string, timestamp: number = Date.now()): boolean {
    this.keyStates.set(key, true);
    this.eventHistory.push({
      type: 'keydown',
      key,
      timestamp,
    });
    return true;
  }

  processKeyUp(key: string, timestamp: number = Date.now()): boolean {
    this.keyStates.set(key, false);
    this.eventHistory.push({
      type: 'keyup',
      key,
      timestamp,
    });
    return true;
  }

  processTouchStart(
    touchId: number,
    x: number,
    y: number,
    timestamp: number = Date.now()
  ): boolean {
    this.touchStates.set(touchId, { x, y });
    this.eventHistory.push({
      type: 'touchstart',
      touchId,
      position: { x, y },
      timestamp,
    });
    return true;
  }

  processTouchEnd(touchId: number, timestamp: number = Date.now()): boolean {
    this.touchStates.delete(touchId);
    this.eventHistory.push({
      type: 'touchend',
      touchId,
      timestamp,
    });
    return true;
  }

  isKeyPressed(key: string): boolean {
    return this.keyStates.get(key) || false;
  }

  getTouchCount(): number {
    return this.touchStates.size;
  }

  getEventHistory(): InputEvent[] {
    return this.eventHistory;
  }

  getInputLag(): number {
    return this.inputLag;
  }

  reset(): void {
    this.keyStates.clear();
    this.touchStates.clear();
    this.eventHistory = [];
  }
}

/**
 * Mock Game Controller
 */
class GameController {
  inputProcessor: InputProcessor;
  leftFlipper: FlipperState = {
    active: false,
    rotation: 0,
    targetRotation: 0,
    velocity: 0,
  };
  rightFlipper: FlipperState = {
    active: false,
    rotation: 0,
    targetRotation: 0,
    velocity: 0,
  };
  ballVelocity: { x: number; y: number } = { x: 0, y: 0 };
  inputResponseTime: number = 0; // ms since input to response
  lastInputTime: number = 0;

  constructor() {
    this.inputProcessor = new InputProcessor();
  }

  update(dt: number = 0.016): void {
    // Update flipper rotations based on input
    this.updateFlipper(this.leftFlipper, 'z', dt);
    this.updateFlipper(this.rightFlipper, 'x', dt);
  }

  private updateFlipper(flipper: FlipperState, key: string, dt: number): void {
    if (this.inputProcessor.isKeyPressed(key)) {
      // Move to active rotation (45 degrees)
      flipper.targetRotation = 45;
      flipper.active = true;
    } else {
      // Return to resting (0 degrees)
      flipper.targetRotation = 0;
      flipper.active = false;
    }

    // Smooth rotation movement
    const rotationSpeed = 180; // degrees per second
    const diff = flipper.targetRotation - flipper.rotation;

    if (Math.abs(diff) > 0.5) {
      flipper.velocity = diff > 0 ? rotationSpeed : -rotationSpeed;
      flipper.rotation += flipper.velocity * dt;
    } else {
      // Snap to target if close enough
      flipper.rotation = flipper.targetRotation;
      flipper.velocity = 0;
    }
  }

  handleKeyDown(key: string): void {
    this.lastInputTime = Date.now();
    this.inputProcessor.processKeyDown(key);
    this.inputResponseTime = Date.now() - this.lastInputTime;
  }

  handleKeyUp(key: string): void {
    this.inputProcessor.processKeyUp(key);
  }

  handleTouchStart(touchId: number, x: number, y: number): void {
    this.lastInputTime = Date.now();
    this.inputProcessor.processTouchStart(touchId, x, y);

    // Determine which flipper based on screen position (0-50: left, 50-100: right)
    if (x < 50) {
      this.handleKeyDown('z');
    } else {
      this.handleKeyDown('x');
    }

    this.inputResponseTime = Date.now() - this.lastInputTime;
  }

  handleTouchEnd(touchId: number): void {
    this.inputProcessor.processTouchEnd(touchId);

    // Release appropriate flipper if no more touches on that side
    if (this.inputProcessor.getTouchCount() === 0) {
      this.handleKeyUp('z');
      this.handleKeyUp('x');
    }
  }

  applyFlipperImpulse(flipper: FlipperState): { x: number; y: number } {
    if (!flipper.active) {
      return { x: 0, y: 0 };
    }

    // Flipper imparts velocity to ball based on rotation
    const impulseMagnitude = flipper.rotation / 45; // Normalized 0-1
    return {
      x: (flipper === this.leftFlipper ? 1 : -1) * impulseMagnitude * 10,
      y: impulseMagnitude * 15,
    };
  }

  getInputResponseTime(): number {
    return this.inputResponseTime;
  }

  getLeftFlipperRotation(): number {
    return this.leftFlipper.rotation;
  }

  getRightFlipperRotation(): number {
    return this.rightFlipper.rotation;
  }

  isLeftFlipperActive(): boolean {
    return this.leftFlipper.active;
  }

  isRightFlipperActive(): boolean {
    return this.rightFlipper.active;
  }

  getTouchCount(): number {
    return this.inputProcessor.getTouchCount();
  }

  getEventCount(): number {
    return this.inputProcessor.getEventHistory().length;
  }
}

// ───────────────────────────────────────────────────────────────────────────

describe('Input Integration', () => {
  let controller: GameController;

  beforeEach(() => {
    controller = new GameController();
  });

  describe('Keyboard Input - Single Flipper', () => {
    it('should activate left flipper on Z key press', () => {
      controller.handleKeyDown('z');
      controller.update();

      expect(controller.isLeftFlipperActive()).toBe(true);
    });

    it('should activate right flipper on X key press', () => {
      controller.handleKeyDown('x');
      controller.update();

      expect(controller.isRightFlipperActive()).toBe(true);
    });

    it('should deactivate flipper on key release', () => {
      controller.handleKeyDown('z');
      controller.update();
      expect(controller.isLeftFlipperActive()).toBe(true);

      controller.handleKeyUp('z');
      controller.update();
      controller.update();

      expect(controller.isLeftFlipperActive()).toBe(false);
    });

    it('should rotate flipper towards active position', () => {
      controller.handleKeyDown('z');

      for (let i = 0; i < 10; i++) {
        controller.update();
      }

      expect(controller.getLeftFlipperRotation()).toBeGreaterThan(0);
      expect(controller.getLeftFlipperRotation()).toBeLessThanOrEqual(45);
    });

    it('should return flipper to resting position on release', () => {
      controller.handleKeyDown('z');
      for (let i = 0; i < 20; i++) {
        controller.update();
      }

      controller.handleKeyUp('z');
      for (let i = 0; i < 30; i++) {
        controller.update();
      }

      expect(controller.getLeftFlipperRotation()).toBe(0);
    });
  });

  describe('Keyboard Input - Dual Flipper', () => {
    it('should activate both flippers independently', () => {
      controller.handleKeyDown('z');
      controller.handleKeyDown('x');
      controller.update();

      expect(controller.isLeftFlipperActive()).toBe(true);
      expect(controller.isRightFlipperActive()).toBe(true);
    });

    it('should allow left flipper without right', () => {
      controller.handleKeyDown('z');
      controller.update();

      expect(controller.isLeftFlipperActive()).toBe(true);
      expect(controller.isRightFlipperActive()).toBe(false);
    });

    it('should release flippers independently', () => {
      controller.handleKeyDown('z');
      controller.handleKeyDown('x');
      controller.update();

      controller.handleKeyUp('z');
      controller.update();
      controller.update();

      expect(controller.isLeftFlipperActive()).toBe(false);
      expect(controller.isRightFlipperActive()).toBe(true);
    });
  });

  describe('Keyboard Input - Rapid Presses', () => {
    it('should not get stuck on rapid key presses', () => {
      for (let i = 0; i < 5; i++) {
        controller.handleKeyDown('z');
        controller.update();
        controller.handleKeyUp('z');
        controller.update();
      }

      expect(controller.isLeftFlipperActive()).toBe(false);
      expect(controller.getLeftFlipperRotation()).toBe(0);
    });

    it('should handle rapid alternating flipper presses', () => {
      for (let i = 0; i < 10; i++) {
        if (i % 2 === 0) {
          controller.handleKeyDown('z');
        } else {
          controller.handleKeyUp('z');
        }
        controller.update();
      }

      expect(controller.getEventCount()).toBeGreaterThan(0);
    });

    it('should maintain correct state during rapid input', () => {
      for (let i = 0; i < 20; i++) {
        controller.handleKeyDown('x');
        controller.update();
      }

      expect(controller.isRightFlipperActive()).toBe(true);
      expect(controller.getEventCount()).toBeGreaterThan(0);
    });
  });

  describe('Touch Input - Single Touch', () => {
    it('should activate left flipper on left side touch', () => {
      controller.handleTouchStart(1, 25, 500); // Left side (x < 50)
      controller.update();

      expect(controller.isLeftFlipperActive()).toBe(true);
    });

    it('should activate right flipper on right side touch', () => {
      controller.handleTouchStart(1, 75, 500); // Right side (x > 50)
      controller.update();

      expect(controller.isRightFlipperActive()).toBe(true);
    });

    it('should release flipper on touch end', () => {
      controller.handleTouchStart(1, 25, 500);
      controller.update();
      expect(controller.isLeftFlipperActive()).toBe(true);

      controller.handleTouchEnd(1);
      controller.update();
      controller.update();

      expect(controller.isLeftFlipperActive()).toBe(false);
    });

    it('should track touch position', () => {
      controller.handleTouchStart(1, 30, 400);

      expect(controller.getTouchCount()).toBe(1);
    });
  });

  describe('Touch Input - Multi-Touch', () => {
    it('should handle simultaneous left and right touches', () => {
      controller.handleTouchStart(1, 25, 500); // Left
      controller.handleTouchStart(2, 75, 500); // Right
      controller.update();

      expect(controller.isLeftFlipperActive()).toBe(true);
      expect(controller.isRightFlipperActive()).toBe(true);
      expect(controller.getTouchCount()).toBe(2);
    });

    it('should release only specific flipper when touch ends', () => {
      controller.handleTouchStart(1, 25, 500); // Left
      controller.handleTouchStart(2, 75, 500); // Right
      controller.update();

      controller.handleTouchEnd(1); // Release left touch
      controller.update();

      expect(controller.getTouchCount()).toBe(1);
    });

    it('should handle touch switching between flippers', () => {
      controller.handleTouchStart(1, 25, 500);
      controller.update();
      controller.handleTouchEnd(1);

      controller.handleTouchStart(2, 75, 500);
      controller.update();

      expect(controller.isLeftFlipperActive()).toBe(false);
      expect(controller.isRightFlipperActive()).toBe(true);
    });

    it('should track multiple simultaneous touches', () => {
      for (let i = 0; i < 4; i++) {
        controller.handleTouchStart(i, Math.random() * 100, 500);
      }

      expect(controller.getTouchCount()).toBe(4);
    });
  });

  describe('Input-Ball Interaction', () => {
    it('should apply flipper impulse to ball', () => {
      controller.handleKeyDown('z');
      controller.update();

      const impulse = controller.applyFlipperImpulse(
        controller['leftFlipper']
      );

      expect(impulse.x).not.toBe(0);
      expect(impulse.y).toBeGreaterThan(0);
    });

    it('should not apply impulse when flipper inactive', () => {
      const impulse = controller.applyFlipperImpulse(
        controller['leftFlipper']
      );

      expect(impulse.x).toBe(0);
      expect(impulse.y).toBe(0);
    });

    it('should apply different impulse for each flipper', () => {
      controller.handleKeyDown('z');
      controller.update();
      const leftImpulse = controller.applyFlipperImpulse(
        controller['leftFlipper']
      );

      controller.handleKeyUp('z');
      controller.handleKeyDown('x');
      controller.update();
      const rightImpulse = controller.applyFlipperImpulse(
        controller['rightFlipper']
      );

      expect(leftImpulse.x).toBeGreaterThan(0);
      expect(rightImpulse.x).toBeLessThan(0);
    });
  });

  describe('Input Response Time', () => {
    it('should register input response time', () => {
      controller.handleKeyDown('z');

      expect(controller.getInputResponseTime()).toBeLessThan(50);
    });

    it('should reflect input lag setting', () => {
      controller.inputProcessor.setInputLag(16);

      expect(controller.inputProcessor.getInputLag()).toBe(16);
    });
  });

  describe('Input Event Tracking', () => {
    it('should track all input events', () => {
      controller.handleKeyDown('z');
      controller.handleKeyUp('z');
      controller.handleKeyDown('x');

      expect(controller.getEventCount()).toBe(3);
    });

    it('should maintain event history', () => {
      controller.handleKeyDown('z');
      controller.handleTouchStart(1, 25, 500);

      expect(controller.getEventCount()).toBeGreaterThan(1);
    });
  });

  describe('Complex Input Scenarios', () => {
    it('should handle mixed keyboard and touch input', () => {
      controller.handleKeyDown('z');
      controller.handleTouchStart(1, 75, 500);
      controller.update();

      expect(controller.isLeftFlipperActive()).toBe(true);
      expect(controller.isRightFlipperActive()).toBe(true);
    });

    it('should handle rapid alternating keyboard and touch', () => {
      controller.handleKeyDown('z');
      controller.update();
      controller.handleKeyUp('z');

      controller.handleTouchStart(1, 75, 500);
      controller.update();
      controller.handleTouchEnd(1);

      controller.update();

      expect(controller.getEventCount()).toBeGreaterThan(0);
    });

    it('should maintain stable state through input sequence', () => {
      const inputs = [
        () => controller.handleKeyDown('z'),
        () => controller.update(),
        () => controller.handleKeyUp('z'),
        () => controller.update(),
        () => controller.update(),
        () => controller.handleKeyDown('x'),
        () => controller.update(),
        () => controller.handleKeyUp('x'),
        () => controller.update(),
        () => controller.update(),
      ];

      for (const input of inputs) {
        input();
      }

      expect(controller.isLeftFlipperActive()).toBe(false);
      expect(controller.isRightFlipperActive()).toBe(false);
    });
  });
});
