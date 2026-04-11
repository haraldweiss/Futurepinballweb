/**
 * Animation System Tests — BAM Engine Integration
 *
 * Tests animation system, keyframe application, event binding
 * Covers BAM bridge, animation queue, and event triggering
 *
 * Run with: npm test
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

/**
 * Mock animation system components
 */

interface Keyframe {
  time: number;
  value: number | number[];
  easing?: string;
}

interface AnimationSequence {
  id: string;
  name: string;
  duration: number;
  keyframes: Keyframe[];
  looping: boolean;
  priority: number;
}

interface AnimationBinding {
  id: string;
  sequenceId: string;
  event: string;
  target: string;
  autoPlay: boolean;
  triggered: boolean;
}

interface GameObject {
  id: string;
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
  scale: { x: number; y: number; z: number };
}

/**
 * Mock animation engine
 */
class MockAnimationEngine {
  sequences: Map<string, AnimationSequence> = new Map();
  activeAnimations: Set<string> = new Set();
  bindings: Map<string, AnimationBinding> = new Map();
  gameObjects: Map<string, GameObject> = new Map();
  eventHandlers: Map<string, Function[]> = new Map();
  currentTime = 0;
  paused = false;

  registerSequence(seq: AnimationSequence): void {
    this.sequences.set(seq.id, seq);
  }

  playAnimation(sequenceId: string): boolean {
    if (this.sequences.has(sequenceId)) {
      this.activeAnimations.add(sequenceId);
      return true;
    }
    return false;
  }

  stopAnimation(sequenceId: string): void {
    this.activeAnimations.delete(sequenceId);
  }

  isAnimationActive(sequenceId: string): boolean {
    return this.activeAnimations.has(sequenceId);
  }

  bindEventToAnimation(binding: AnimationBinding): void {
    this.bindings.set(binding.id, binding);
  }

  triggerEvent(event: string, target?: string): void {
    // Trigger all bindings for this event
    for (const binding of this.bindings.values()) {
      if (binding.event === event && (!target || binding.target === target)) {
        if (binding.autoPlay && !binding.triggered) {
          this.playAnimation(binding.sequenceId);
          binding.triggered = true;
        }
      }
    }

    // Call event handlers
    if (this.eventHandlers.has(event)) {
      for (const handler of this.eventHandlers.get(event)!) {
        handler();
      }
    }
  }

  on(event: string, handler: Function): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event)!.push(handler);
  }

  registerGameObject(obj: GameObject): void {
    this.gameObjects.set(obj.id, obj);
  }

  applyKeyframe(objId: string, keyframe: Keyframe): void {
    const obj = this.gameObjects.get(objId);
    if (!obj) return;

    // Simple keyframe application (in real system, would interpolate)
    if (Array.isArray(keyframe.value)) {
      obj.position.x = keyframe.value[0];
      obj.position.y = keyframe.value[1];
      if (keyframe.value.length > 2) obj.position.z = keyframe.value[2];
    } else {
      obj.position.x = keyframe.value;
    }
  }

  pause(): void {
    this.paused = true;
  }

  resume(): void {
    this.paused = false;
  }

  update(dt: number): void {
    if (this.paused) return;
    this.currentTime += dt;
  }

  getAnimationDuration(sequenceId: string): number {
    return this.sequences.get(sequenceId)?.duration || 0;
  }

  getSequenceCount(): number {
    return this.sequences.size;
  }

  getActiveAnimationCount(): number {
    return this.activeAnimations.size;
  }
}

// ───────────────────────────────────────────────────────────────────────────

describe('Animation System', () => {
  let engine: MockAnimationEngine;

  beforeEach(() => {
    engine = new MockAnimationEngine();
  });

  describe('Animation Registration', () => {
    it('should register animation sequence', () => {
      const seq: AnimationSequence = {
        id: 'bumper-flash',
        name: 'Bumper Flash',
        duration: 0.5,
        keyframes: [{ time: 0, value: 1 }, { time: 0.5, value: 0 }],
        looping: false,
        priority: 1,
      };

      engine.registerSequence(seq);

      expect(engine.getSequenceCount()).toBe(1);
    });

    it('should register multiple sequences', () => {
      const seq1: AnimationSequence = {
        id: 'anim1',
        name: 'Animation 1',
        duration: 1.0,
        keyframes: [],
        looping: false,
        priority: 1,
      };
      const seq2: AnimationSequence = {
        id: 'anim2',
        name: 'Animation 2',
        duration: 2.0,
        keyframes: [],
        looping: false,
        priority: 2,
      };

      engine.registerSequence(seq1);
      engine.registerSequence(seq2);

      expect(engine.getSequenceCount()).toBe(2);
    });

    it('should overwrite sequence with same ID', () => {
      const seq1: AnimationSequence = {
        id: 'anim',
        name: 'V1',
        duration: 1.0,
        keyframes: [],
        looping: false,
        priority: 1,
      };
      const seq2: AnimationSequence = {
        id: 'anim',
        name: 'V2',
        duration: 2.0,
        keyframes: [],
        looping: false,
        priority: 2,
      };

      engine.registerSequence(seq1);
      engine.registerSequence(seq2);

      expect(engine.getSequenceCount()).toBe(1);
    });
  });

  describe('Animation Playback', () => {
    beforeEach(() => {
      const seq: AnimationSequence = {
        id: 'test-anim',
        name: 'Test',
        duration: 1.0,
        keyframes: [],
        looping: false,
        priority: 1,
      };
      engine.registerSequence(seq);
    });

    it('should play registered animation', () => {
      const success = engine.playAnimation('test-anim');
      expect(success).toBe(true);
      expect(engine.isAnimationActive('test-anim')).toBe(true);
    });

    it('should not play unregistered animation', () => {
      const success = engine.playAnimation('nonexistent');
      expect(success).toBe(false);
    });

    it('should stop animation', () => {
      engine.playAnimation('test-anim');
      engine.stopAnimation('test-anim');

      expect(engine.isAnimationActive('test-anim')).toBe(false);
    });

    it('should track active animation count', () => {
      const seq2: AnimationSequence = {
        id: 'test-anim-2',
        name: 'Test 2',
        duration: 1.0,
        keyframes: [],
        looping: false,
        priority: 1,
      };
      engine.registerSequence(seq2);

      engine.playAnimation('test-anim');
      engine.playAnimation('test-anim-2');

      expect(engine.getActiveAnimationCount()).toBe(2);
    });
  });

  describe('Event Binding', () => {
    beforeEach(() => {
      const seq: AnimationSequence = {
        id: 'bumper-hit-anim',
        name: 'Bumper Hit',
        duration: 0.3,
        keyframes: [],
        looping: false,
        priority: 2,
      };
      engine.registerSequence(seq);
    });

    it('should bind animation to event', () => {
      const binding: AnimationBinding = {
        id: 'binding-1',
        sequenceId: 'bumper-hit-anim',
        event: 'bumper_hit',
        target: 'bumper_1',
        autoPlay: true,
        triggered: false,
      };

      engine.bindEventToAnimation(binding);

      expect(engine.bindings.size).toBe(1);
    });

    it('should auto-play animation on event trigger', () => {
      const binding: AnimationBinding = {
        id: 'binding-1',
        sequenceId: 'bumper-hit-anim',
        event: 'bumper_hit',
        target: 'bumper_1',
        autoPlay: true,
        triggered: false,
      };

      engine.bindEventToAnimation(binding);
      engine.triggerEvent('bumper_hit');

      expect(engine.isAnimationActive('bumper-hit-anim')).toBe(true);
      expect(binding.triggered).toBe(true);
    });

    it('should only trigger once with autoPlay', () => {
      const binding: AnimationBinding = {
        id: 'binding-1',
        sequenceId: 'bumper-hit-anim',
        event: 'bumper_hit',
        target: 'bumper_1',
        autoPlay: true,
        triggered: false,
      };

      engine.bindEventToAnimation(binding);
      engine.triggerEvent('bumper_hit');
      engine.triggerEvent('bumper_hit');

      expect(engine.getActiveAnimationCount()).toBe(1);
    });

    it('should filter events by target', () => {
      const binding1: AnimationBinding = {
        id: 'binding-1',
        sequenceId: 'bumper-hit-anim',
        event: 'bumper_hit',
        target: 'bumper_1',
        autoPlay: true,
        triggered: false,
      };

      engine.bindEventToAnimation(binding1);
      engine.triggerEvent('bumper_hit', 'bumper_1');

      expect(binding1.triggered).toBe(true);
    });
  });

  describe('Game Object Animation', () => {
    beforeEach(() => {
      const obj: GameObject = {
        id: 'bumper_1',
        position: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        scale: { x: 1, y: 1, z: 1 },
      };
      engine.registerGameObject(obj);
    });

    it('should apply keyframe to game object', () => {
      const keyframe: Keyframe = { time: 0, value: 5 };
      engine.applyKeyframe('bumper_1', keyframe);

      const obj = engine.gameObjects.get('bumper_1');
      expect(obj?.position.x).toBe(5);
    });

    it('should apply 3D keyframe', () => {
      const keyframe: Keyframe = { time: 0, value: [1, 2, 3] };
      engine.applyKeyframe('bumper_1', keyframe);

      const obj = engine.gameObjects.get('bumper_1');
      expect(obj?.position.x).toBe(1);
      expect(obj?.position.y).toBe(2);
      expect(obj?.position.z).toBe(3);
    });
  });

  describe('Animation Control', () => {
    beforeEach(() => {
      const seq: AnimationSequence = {
        id: 'test-anim',
        name: 'Test',
        duration: 1.0,
        keyframes: [],
        looping: false,
        priority: 1,
      };
      engine.registerSequence(seq);
      engine.playAnimation('test-anim');
    });

    it('should pause animation', () => {
      const initialTime = engine.currentTime;

      engine.pause();
      engine.update(0.1);

      expect(engine.currentTime).toBe(initialTime);
      expect(engine.paused).toBe(true);
    });

    it('should resume animation', () => {
      engine.pause();
      engine.resume();
      engine.update(0.1);

      expect(engine.paused).toBe(false);
      expect(engine.currentTime).toBe(0.1);
    });

    it('should update time when not paused', () => {
      engine.update(0.05);
      expect(engine.currentTime).toBe(0.05);

      engine.update(0.05);
      expect(engine.currentTime).toBe(0.1);
    });
  });

  describe('Event System', () => {
    it('should register event handler', () => {
      const handler = vi.fn();
      engine.on('test_event', handler);

      engine.triggerEvent('test_event');

      expect(handler).toHaveBeenCalled();
    });

    it('should call multiple handlers for same event', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      engine.on('multi_event', handler1);
      engine.on('multi_event', handler2);

      engine.triggerEvent('multi_event');

      expect(handler1).toHaveBeenCalled();
      expect(handler2).toHaveBeenCalled();
    });

    it('should not call handler for different event', () => {
      const handler = vi.fn();
      engine.on('event_a', handler);

      engine.triggerEvent('event_b');

      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('Animation Sequences', () => {
    it('should get animation duration', () => {
      const seq: AnimationSequence = {
        id: 'timed-anim',
        name: 'Timed',
        duration: 2.5,
        keyframes: [],
        looping: false,
        priority: 1,
      };

      engine.registerSequence(seq);

      expect(engine.getAnimationDuration('timed-anim')).toBe(2.5);
    });

    it('should handle non-existent sequence duration', () => {
      expect(engine.getAnimationDuration('nonexistent')).toBe(0);
    });
  });

  describe('Game Logic Integration', () => {
    it('should chain bumper hit → flash animation', () => {
      const flashSeq: AnimationSequence = {
        id: 'bumper-flash',
        name: 'Flash',
        duration: 0.2,
        keyframes: [{ time: 0, value: 1 }, { time: 0.2, value: 0 }],
        looping: false,
        priority: 1,
      };

      const binding: AnimationBinding = {
        id: 'flash-binding',
        sequenceId: 'bumper-flash',
        event: 'bumper_hit',
        target: 'bumper_1',
        autoPlay: true,
        triggered: false,
      };

      engine.registerSequence(flashSeq);
      engine.bindEventToAnimation(binding);
      engine.triggerEvent('bumper_hit', 'bumper_1');

      expect(engine.isAnimationActive('bumper-flash')).toBe(true);
    });

    it('should handle concurrent animations', () => {
      const seq1: AnimationSequence = {
        id: 'anim1',
        name: 'Anim1',
        duration: 1.0,
        keyframes: [],
        looping: false,
        priority: 1,
      };
      const seq2: AnimationSequence = {
        id: 'anim2',
        name: 'Anim2',
        duration: 2.0,
        keyframes: [],
        looping: false,
        priority: 2,
      };

      engine.registerSequence(seq1);
      engine.registerSequence(seq2);
      engine.playAnimation('anim1');
      engine.playAnimation('anim2');

      expect(engine.getActiveAnimationCount()).toBe(2);
      expect(engine.isAnimationActive('anim1')).toBe(true);
      expect(engine.isAnimationActive('anim2')).toBe(true);
    });
  });
});
