/**
 * Phase 10.1: Complex Animation Sequences Tests
 *
 * Tests multi-object animations, keyframe interpolation accuracy, priority blending.
 * Validates complex animation scenarios for future tables with elaborate light shows
 * and synchronized flipper/camera animations.
 *
 * Test count: 12 tests
 * Effort: 10 hours
 * Status: NEW
 */

import { describe, it, expect, beforeEach } from 'vitest';

/**
 * Keyframe Interface
 * Represents a single animation keyframe with time and value
 */
interface Keyframe {
  time: number; // 0-1 normalized, or milliseconds
  value: number | { x: number; y: number; z: number } | { r: number; g: number; b: number };
  easing?: 'linear' | 'easeIn' | 'easeOut' | 'easeInOut';
}

/**
 * Animation Track
 * Represents a sequence of keyframes for a specific property
 */
interface AnimationTrack {
  id: string;
  targetId: string;
  property: string; // 'position', 'rotation', 'color', 'opacity', etc.
  keyframes: Keyframe[];
  duration: number; // milliseconds
  priority: number; // higher = more important (preempts lower priority)
  loop?: boolean;
  delay?: number;
}

/**
 * Mock Animated Object
 * Represents a game object that can be animated
 */
class AnimatedObject {
  id: string;
  position: { x: number; y: number; z: number } = { x: 0, y: 0, z: 0 };
  rotation: { x: number; y: number; z: number } = { x: 0, y: 0, z: 0 };
  color: { r: number; g: number; b: number } = { r: 255, g: 255, b: 255 };
  opacity: number = 1.0;
  scale: number = 1.0;

  constructor(id: string) {
    this.id = id;
  }

  reset(): void {
    this.position = { x: 0, y: 0, z: 0 };
    this.rotation = { x: 0, y: 0, z: 0 };
    this.color = { r: 255, g: 255, b: 255 };
    this.opacity = 1.0;
    this.scale = 1.0;
  }
}

/**
 * Easing Functions
 */
class EasingFunctions {
  static linear(t: number): number {
    return t;
  }

  static easeIn(t: number): number {
    return t * t;
  }

  static easeOut(t: number): number {
    return t * (2 - t);
  }

  static easeInOut(t: number): number {
    return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
  }

  static getFunction(type: string): (t: number) => number {
    switch (type) {
      case 'easeIn':
        return this.easeIn;
      case 'easeOut':
        return this.easeOut;
      case 'easeInOut':
        return this.easeInOut;
      case 'linear':
      default:
        return this.linear;
    }
  }
}

/**
 * Interpolation Helper
 * Interpolates between keyframes
 */
class Interpolator {
  static interpolate(
    from: number | any,
    to: number | any,
    t: number,
    easingType: string = 'linear'
  ): number | any {
    const easingFn = EasingFunctions.getFunction(easingType);
    const easeT = easingFn(Math.max(0, Math.min(1, t)));

    if (typeof from === 'number' && typeof to === 'number') {
      return from + (to - from) * easeT;
    }

    // Vector interpolation
    if (typeof from === 'object' && typeof to === 'object') {
      const result: any = {};
      for (const key in from) {
        if (key in to) {
          result[key] = from[key] + (to[key] - from[key]) * easeT;
        }
      }
      return result;
    }

    return from;
  }

  static findKeyframes(
    keyframes: Keyframe[],
    normalizedTime: number
  ): [Keyframe, Keyframe, number] | null {
    for (let i = 0; i < keyframes.length - 1; i++) {
      const current = keyframes[i];
      const next = keyframes[i + 1];

      if (normalizedTime >= current.time && normalizedTime <= next.time) {
        const interval = next.time - current.time;
        const t = interval === 0 ? 0 : (normalizedTime - current.time) / interval;
        return [current, next, t];
      }
    }

    return null;
  }
}

/**
 * Complex Animation Engine
 * Manages multiple simultaneous animations with priority and interpolation
 */
class ComplexAnimationEngine {
  private tracks: Map<string, AnimatedObject> = new Map();
  private animations: AnimationTrack[] = [];
  private playingAnimations: Map<string, { startTime: number; track: AnimationTrack }> =
    new Map();
  private currentTime: number = 0;
  private maxQueueSize: number = 100;

  addTrack(object: AnimatedObject): void {
    this.tracks.set(object.id, object);
  }

  getTrack(id: string): AnimatedObject | undefined {
    return this.tracks.get(id);
  }

  playAnimation(track: AnimationTrack): void {
    if (this.animations.length >= this.maxQueueSize) {
      throw new Error('Animation queue exceeded max size');
    }

    this.animations.push(track);
    this.playingAnimations.set(track.id, {
      startTime: this.currentTime + (track.delay || 0),
      track
    });
  }

  stopAnimation(trackId: string): void {
    this.animations = this.animations.filter(t => t.id !== trackId);
    this.playingAnimations.delete(trackId);
  }

  update(deltaTime: number): void {
    this.currentTime += deltaTime;

    // Sort animations by priority (highest first)
    const sortedAnimations = Array.from(this.playingAnimations.values())
      .sort((a, b) => b.track.priority - a.track.priority);

    // Track which properties are being modified by high-priority animations
    const modifiedProperties = new Set<string>();

    for (const { startTime, track } of sortedAnimations) {
      const targetObject = this.tracks.get(track.targetId);
      if (!targetObject) continue;

      const propertyKey = `${track.targetId}.${track.property}`;

      // Skip if a higher-priority animation already modified this property
      if (modifiedProperties.has(propertyKey)) {
        continue;
      }

      const elapsedTime = this.currentTime - startTime;
      if (elapsedTime < 0) continue; // Animation hasn't started yet

      const normalizedTime = Math.min(1, elapsedTime / track.duration);

      // Find keyframes
      const keyframeInfo = Interpolator.findKeyframes(track.keyframes, normalizedTime);
      if (keyframeInfo) {
        const [from, to, t] = keyframeInfo;
        const easingType = to.easing || 'linear';
        const interpolated = Interpolator.interpolate(from.value, to.value, t, easingType);

        // Apply interpolated value to object
        this.applyPropertyValue(targetObject, track.property, interpolated);
        modifiedProperties.add(propertyKey);
      }

      // Handle loop
      if (normalizedTime >= 1 && track.loop) {
        this.playingAnimations.set(track.id, {
          startTime: this.currentTime,
          track
        });
      } else if (normalizedTime >= 1) {
        this.playingAnimations.delete(track.id);
      }
    }
  }

  private applyPropertyValue(object: AnimatedObject, property: string, value: any): void {
    switch (property) {
      case 'position':
        if (typeof value === 'object') {
          object.position = { ...object.position, ...value };
        }
        break;
      case 'rotation':
        if (typeof value === 'object') {
          object.rotation = { ...object.rotation, ...value };
        }
        break;
      case 'color':
        if (typeof value === 'object') {
          object.color = { ...object.color, ...value };
        }
        break;
      case 'opacity':
        if (typeof value === 'number') {
          object.opacity = Math.max(0, Math.min(1, value));
        }
        break;
      case 'scale':
        if (typeof value === 'number') {
          object.scale = Math.max(0, value);
        }
        break;
    }
  }

  getPlayingAnimationCount(): number {
    return this.playingAnimations.size;
  }

  getQueuedAnimationCount(): number {
    return this.animations.length;
  }

  getObject(id: string): AnimatedObject | undefined {
    return this.tracks.get(id);
  }

  reset(): void {
    this.tracks.clear();
    this.animations = [];
    this.playingAnimations.clear();
    this.currentTime = 0;
  }
}

describe('Complex Animation Sequences (Phase 10.1)', () => {
  let engine: ComplexAnimationEngine;

  beforeEach(() => {
    engine = new ComplexAnimationEngine();
  });

  describe('Multi-Object Animations', () => {
    it('should play 5 simultaneous animations on different objects', () => {
      // Create 5 animated objects
      const objects = [
        new AnimatedObject('light1'),
        new AnimatedObject('light2'),
        new AnimatedObject('flipper'),
        new AnimatedObject('camera'),
        new AnimatedObject('playfield')
      ];

      objects.forEach(obj => engine.addTrack(obj));

      // Create animations for each object
      const animations: AnimationTrack[] = [
        {
          id: 'anim-light1',
          targetId: 'light1',
          property: 'color',
          keyframes: [
            { time: 0, value: { r: 0, g: 0, b: 0 } },
            { time: 1, value: { r: 255, g: 100, b: 0 } }
          ],
          duration: 500,
          priority: 1
        },
        {
          id: 'anim-light2',
          targetId: 'light2',
          property: 'opacity',
          keyframes: [
            { time: 0, value: 0 },
            { time: 1, value: 1 }
          ],
          duration: 300,
          priority: 1
        },
        {
          id: 'anim-flipper',
          targetId: 'flipper',
          property: 'rotation',
          keyframes: [
            { time: 0, value: { x: 0, y: 0, z: 0 } },
            { time: 1, value: { x: 0, y: 0, z: 45 } }
          ],
          duration: 200,
          priority: 1
        },
        {
          id: 'anim-camera',
          targetId: 'camera',
          property: 'position',
          keyframes: [
            { time: 0, value: { x: 0, y: 0, z: 0 } },
            { time: 1, value: { x: 10, y: 5, z: -20 } }
          ],
          duration: 1000,
          priority: 1
        },
        {
          id: 'anim-playfield',
          targetId: 'playfield',
          property: 'scale',
          keyframes: [
            { time: 0, value: 1.0 },
            { time: 1, value: 1.2 }
          ],
          duration: 400,
          priority: 1
        }
      ];

      // Play all animations
      animations.forEach(anim => engine.playAnimation(anim));

      expect(engine.getQueuedAnimationCount()).toBe(5);
      expect(engine.getPlayingAnimationCount()).toBe(5);

      // Update and verify all are playing
      engine.update(100);
      expect(engine.getPlayingAnimationCount()).toBe(5);
    });

    it('should handle animations finishing at different times', () => {
      const obj1 = new AnimatedObject('obj1');
      const obj2 = new AnimatedObject('obj2');
      engine.addTrack(obj1);
      engine.addTrack(obj2);

      // Short animation
      const anim1: AnimationTrack = {
        id: 'short',
        targetId: 'obj1',
        property: 'opacity',
        keyframes: [
          { time: 0, value: 0 },
          { time: 1, value: 1 }
        ],
        duration: 100,
        priority: 1
      };

      // Long animation
      const anim2: AnimationTrack = {
        id: 'long',
        targetId: 'obj2',
        property: 'opacity',
        keyframes: [
          { time: 0, value: 0 },
          { time: 1, value: 1 }
        ],
        duration: 500,
        priority: 1
      };

      engine.playAnimation(anim1);
      engine.playAnimation(anim2);

      expect(engine.getPlayingAnimationCount()).toBe(2);

      // Update past short animation
      engine.update(150);
      expect(engine.getPlayingAnimationCount()).toBe(1);

      // Update past long animation
      engine.update(400);
      expect(engine.getPlayingAnimationCount()).toBe(0);
    });
  });

  describe('Keyframe Interpolation', () => {
    it('should interpolate linearly between keyframes', () => {
      const obj = new AnimatedObject('test');
      engine.addTrack(obj);

      const anim: AnimationTrack = {
        id: 'linear-test',
        targetId: 'test',
        property: 'opacity',
        keyframes: [
          { time: 0, value: 0, easing: 'linear' },
          { time: 1, value: 1, easing: 'linear' }
        ],
        duration: 1000,
        priority: 1
      };

      engine.playAnimation(anim);

      // At 50% time, should be at 50% value
      engine.update(500);
      const obj50 = engine.getObject('test');
      expect(obj50?.opacity).toBeCloseTo(0.5, 1);
    });

    it('should interpolate with easeIn easing', () => {
      const obj = new AnimatedObject('test');
      engine.addTrack(obj);

      const anim: AnimationTrack = {
        id: 'easeIn-test',
        targetId: 'test',
        property: 'opacity',
        keyframes: [
          { time: 0, value: 0, easing: 'easeIn' },
          { time: 1, value: 1, easing: 'easeIn' }
        ],
        duration: 1000,
        priority: 1
      };

      engine.playAnimation(anim);

      // At 50% time with easeIn, should be less than 50% value (slow start)
      engine.update(500);
      const obj50 = engine.getObject('test');
      expect(obj50?.opacity).toBeLessThan(0.5);
      expect(obj50?.opacity).toBeGreaterThan(0);
    });

    it('should interpolate with easeOut easing', () => {
      const obj = new AnimatedObject('test');
      engine.addTrack(obj);

      const anim: AnimationTrack = {
        id: 'easeOut-test',
        targetId: 'test',
        property: 'opacity',
        keyframes: [
          { time: 0, value: 0, easing: 'easeOut' },
          { time: 1, value: 1, easing: 'easeOut' }
        ],
        duration: 1000,
        priority: 1
      };

      engine.playAnimation(anim);

      // At 50% time with easeOut, should be more than 50% value (fast start)
      engine.update(500);
      const obj50 = engine.getObject('test');
      expect(obj50?.opacity).toBeGreaterThan(0.5);
      expect(obj50?.opacity).toBeLessThan(1);
    });

    it('should interpolate vector values correctly', () => {
      const obj = new AnimatedObject('test');
      engine.addTrack(obj);

      const anim: AnimationTrack = {
        id: 'vector-test',
        targetId: 'test',
        property: 'position',
        keyframes: [
          { time: 0, value: { x: 0, y: 0, z: 0 } },
          { time: 1, value: { x: 100, y: 50, z: -30 } }
        ],
        duration: 1000,
        priority: 1
      };

      engine.playAnimation(anim);

      // At 50% time, should be at 50% position
      engine.update(500);
      const objHalf = engine.getObject('test');
      expect(objHalf?.position.x).toBeCloseTo(50, 1);
      expect(objHalf?.position.y).toBeCloseTo(25, 1);
      expect(objHalf?.position.z).toBeCloseTo(-15, 1);
    });

    it('should interpolate color values correctly', () => {
      const obj = new AnimatedObject('test');
      engine.addTrack(obj);

      const anim: AnimationTrack = {
        id: 'color-test',
        targetId: 'test',
        property: 'color',
        keyframes: [
          { time: 0, value: { r: 0, g: 0, b: 0 } },
          { time: 1, value: { r: 255, g: 128, b: 64 } }
        ],
        duration: 1000,
        priority: 1
      };

      engine.playAnimation(anim);

      // At 50% time, should be at 50% color
      engine.update(500);
      const objHalf = engine.getObject('test');
      expect(objHalf?.color.r).toBeCloseTo(127.5, 0);
      expect(objHalf?.color.g).toBeCloseTo(64, 0);
      expect(objHalf?.color.b).toBeCloseTo(32, 0);
    });
  });

  describe('Priority System', () => {
    it('should preempt low-priority with high-priority animation', () => {
      const obj = new AnimatedObject('test');
      engine.addTrack(obj);

      // Start low-priority animation
      const lowPriorityAnim: AnimationTrack = {
        id: 'low-priority',
        targetId: 'test',
        property: 'opacity',
        keyframes: [
          { time: 0, value: 0 },
          { time: 1, value: 1 }
        ],
        duration: 1000,
        priority: 1
      };

      engine.playAnimation(lowPriorityAnim);
      engine.update(500);

      let obj50 = engine.getObject('test');
      expect(obj50?.opacity).toBeCloseTo(0.5, 1);

      // Start high-priority animation on same property
      const highPriorityAnim: AnimationTrack = {
        id: 'high-priority',
        targetId: 'test',
        property: 'opacity',
        keyframes: [
          { time: 0, value: 1 },
          { time: 1, value: 0 }
        ],
        duration: 1000,
        priority: 10 // Higher priority
      };

      engine.playAnimation(highPriorityAnim);
      engine.update(500);

      // High-priority should override low-priority
      obj50 = engine.getObject('test');
      expect(obj50?.opacity).toBeCloseTo(0.5, 1);
      // With high-priority playing, should see its value (1 → 0 at 50%)
    });

    it('should allow simultaneous animations on different properties', () => {
      const obj = new AnimatedObject('test');
      engine.addTrack(obj);

      // Animation 1: opacity
      const anim1: AnimationTrack = {
        id: 'opacity-anim',
        targetId: 'test',
        property: 'opacity',
        keyframes: [
          { time: 0, value: 0 },
          { time: 1, value: 1 }
        ],
        duration: 500,
        priority: 1
      };

      // Animation 2: scale (different property)
      const anim2: AnimationTrack = {
        id: 'scale-anim',
        targetId: 'test',
        property: 'scale',
        keyframes: [
          { time: 0, value: 1 },
          { time: 1, value: 2 }
        ],
        duration: 500,
        priority: 1
      };

      engine.playAnimation(anim1);
      engine.playAnimation(anim2);

      engine.update(250);

      const objHalf = engine.getObject('test');
      expect(objHalf?.opacity).toBeCloseTo(0.5, 1);
      expect(objHalf?.scale).toBeCloseTo(1.5, 1);
    });
  });

  describe('Animation Queue Management', () => {
    it('should track animation count up to limit', () => {
      for (let i = 0; i < 50; i++) {
        const obj = new AnimatedObject(`obj-${i}`);
        engine.addTrack(obj);

        const anim: AnimationTrack = {
          id: `anim-${i}`,
          targetId: `obj-${i}`,
          property: 'opacity',
          keyframes: [
            { time: 0, value: 0 },
            { time: 1, value: 1 }
          ],
          duration: 1000,
          priority: 1
        };

        engine.playAnimation(anim);
      }

      expect(engine.getQueuedAnimationCount()).toBe(50);
    });

    it('should reject animations exceeding queue limit', () => {
      // Queue 100 animations (the limit)
      for (let i = 0; i < 100; i++) {
        const obj = new AnimatedObject(`obj-${i}`);
        engine.addTrack(obj);

        const anim: AnimationTrack = {
          id: `anim-${i}`,
          targetId: `obj-${i}`,
          property: 'opacity',
          keyframes: [
            { time: 0, value: 0 },
            { time: 1, value: 1 }
          ],
          duration: 1000,
          priority: 1
        };

        engine.playAnimation(anim);
      }

      // 101st animation should fail
      const obj101 = new AnimatedObject('obj-101');
      engine.addTrack(obj101);

      const anim101: AnimationTrack = {
        id: 'anim-101',
        targetId: 'obj-101',
        property: 'opacity',
        keyframes: [
          { time: 0, value: 0 },
          { time: 1, value: 1 }
        ],
        duration: 1000,
        priority: 1
      };

      expect(() => engine.playAnimation(anim101)).toThrow();
    });

    it('should allow stopping animations to make room', () => {
      // Queue 100 animations
      for (let i = 0; i < 100; i++) {
        const obj = new AnimatedObject(`obj-${i}`);
        engine.addTrack(obj);

        const anim: AnimationTrack = {
          id: `anim-${i}`,
          targetId: `obj-${i}`,
          property: 'opacity',
          keyframes: [
            { time: 0, value: 0 },
            { time: 1, value: 1 }
          ],
          duration: 1000,
          priority: 1
        };

        engine.playAnimation(anim);
      }

      expect(engine.getQueuedAnimationCount()).toBe(100);

      // Stop one animation
      engine.stopAnimation('anim-50');

      // Should be able to add a new one
      const objNew = new AnimatedObject('obj-new');
      engine.addTrack(objNew);

      const animNew: AnimationTrack = {
        id: 'anim-new',
        targetId: 'obj-new',
        property: 'opacity',
        keyframes: [
          { time: 0, value: 0 },
          { time: 1, value: 1 }
        ],
        duration: 1000,
        priority: 1
      };

      expect(() => engine.playAnimation(animNew)).not.toThrow();
      expect(engine.getQueuedAnimationCount()).toBe(100);
    });
  });

  describe('Animation Looping', () => {
    it('should loop animation when loop flag is set', () => {
      const obj = new AnimatedObject('test');
      engine.addTrack(obj);

      const anim: AnimationTrack = {
        id: 'loop-test',
        targetId: 'test',
        property: 'opacity',
        keyframes: [
          { time: 0, value: 0 },
          { time: 1, value: 100 }
        ],
        duration: 100,
        priority: 1,
        loop: true
      };

      engine.playAnimation(anim);
      expect(engine.getPlayingAnimationCount()).toBe(1);

      // Complete first loop
      engine.update(150);
      expect(engine.getPlayingAnimationCount()).toBe(1); // Still playing (looped)

      // Complete second loop
      engine.update(150);
      expect(engine.getPlayingAnimationCount()).toBe(1); // Still playing
    });

    it('should stop looping when loop flag is not set', () => {
      const obj = new AnimatedObject('test');
      engine.addTrack(obj);

      const anim: AnimationTrack = {
        id: 'no-loop-test',
        targetId: 'test',
        property: 'opacity',
        keyframes: [
          { time: 0, value: 0 },
          { time: 1, value: 100 }
        ],
        duration: 100,
        priority: 1,
        loop: false
      };

      engine.playAnimation(anim);
      expect(engine.getPlayingAnimationCount()).toBe(1);

      // Complete animation
      engine.update(150);
      expect(engine.getPlayingAnimationCount()).toBe(0); // Stopped
    });
  });

  describe('Animation Delay', () => {
    it('should delay animation start', () => {
      const obj = new AnimatedObject('test');
      engine.addTrack(obj);

      const anim: AnimationTrack = {
        id: 'delayed-test',
        targetId: 'test',
        property: 'opacity',
        keyframes: [
          { time: 0, value: 0 },
          { time: 1, value: 1 }
        ],
        duration: 100,
        priority: 1,
        delay: 500 // 500ms delay
      };

      engine.playAnimation(anim);

      // At 250ms, animation shouldn't have started
      engine.update(250);
      let objTest = engine.getObject('test');
      expect(objTest?.opacity).toBe(1); // Still at initial value (not animating yet)

      // At 550ms, animation should be half-way
      engine.update(300);
      objTest = engine.getObject('test');
      expect(objTest?.opacity).toBeCloseTo(0.5, 1);
    });
  });
});
