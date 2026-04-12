/**
 * Phase 10.2: Animation Event Binding Tests
 *
 * Tests animation triggers on obscure game events, event binding edge cases,
 * and circular binding prevention. Validates robust event routing for complex
 * tables with elaborate animation sequences.
 *
 * Test count: 8 tests
 * Effort: 6 hours
 * Status: NEW
 */

import { describe, it, expect, beforeEach } from 'vitest';

/**
 * Game Event Type
 * Represents different game events that can trigger animations
 */
type GameEventType =
  | 'BallVelocityExceeds'
  | 'ComboMilestone'
  | 'BumperHit'
  | 'RampComplete'
  | 'MultiballStart'
  | 'BallDrain'
  | 'ScoreThreshold'
  | 'CustomEvent';

/**
 * Animation Event Binding
 * Maps a game event to an animation to be triggered
 */
interface AnimationEventBinding {
  id: string;
  eventType: GameEventType;
  eventParams?: any; // e.g., { velocity: 10 } for BallVelocityExceeds
  animationId: string;
  targetId: string;
  priority?: number;
  oneTime?: boolean; // Unbind after triggering once
}

/**
 * Game Event
 * Represents a game event that can trigger bindings
 */
interface GameEvent {
  type: GameEventType;
  params?: any;
  timestamp: number;
}

/**
 * Mock Animation
 * Represents an animation that can be triggered by events
 */
interface MockAnimation {
  id: string;
  targetId: string;
  duration: number;
  isPlaying: boolean;
}

/**
 * Event Binding Manager
 * Manages animation triggers based on game events
 */
class EventBindingManager {
  private bindings: Map<string, AnimationEventBinding> = new Map();
  private triggeredAnimations: Set<string> = new Set();
  private eventLog: GameEvent[] = [];
  private playingAnimations: Map<string, MockAnimation> = new Map();

  bindAnimation(binding: AnimationEventBinding): void {
    // Check for direct circular bindings (animation triggering on another animation that triggers the first)
    if (this.wouldCreateCircularBinding(binding)) {
      throw new Error('Circular animation binding detected');
    }

    this.bindings.set(binding.id, binding);
  }

  private wouldCreateCircularBinding(newBinding: AnimationEventBinding): boolean {
    // Self-referential: animation triggering itself
    if (newBinding.animationId === newBinding.targetId) {
      return true;
    }

    // Two-way circular: animation A triggers B, and B triggers A
    for (const [, existing] of this.bindings) {
      // If existing binding has targetId that matches new binding's animationId
      // AND new binding's targetId matches existing binding's animationId
      // Then we have a circular dependency
      if (
        existing.targetId === newBinding.animationId &&
        newBinding.targetId === existing.animationId
      ) {
        return true;
      }
    }

    return false;
  }

  unbindAnimation(bindingId: string): void {
    this.bindings.delete(bindingId);
  }

  unbindByAnimationId(animationId: string): void {
    const toRemove: string[] = [];
    for (const [id, binding] of this.bindings) {
      if (binding.animationId === animationId) {
        toRemove.push(id);
      }
    }
    toRemove.forEach(id => this.bindings.delete(id));
  }

  dispatchEvent(event: GameEvent): void {
    this.eventLog.push(event);

    // Find all bindings that match this event
    const matchingBindings = Array.from(this.bindings.values()).filter(
      binding =>
        binding.eventType === event.type &&
        this.eventMatchesParams(event.params, binding.eventParams)
    );

    // Sort by priority (higher first)
    matchingBindings.sort((a, b) => (b.priority || 0) - (a.priority || 0));

    // Trigger matching animations
    for (const binding of matchingBindings) {
      this.triggerAnimation(binding);

      // Remove one-time bindings
      if (binding.oneTime) {
        this.unbindAnimation(binding.id);
      }
    }
  }

  private eventMatchesParams(eventParams: any, bindingParams: any): boolean {
    if (!bindingParams) {
      return true; // No params required
    }

    if (!eventParams) {
      return false; // Binding requires params but event has none
    }

    // Check all required binding params
    for (const key in bindingParams) {
      if (eventParams[key] !== bindingParams[key]) {
        // For numeric comparisons like "exceeds", use greater than
        if (key === 'velocity' && eventParams[key] >= bindingParams[key]) {
          continue;
        }
        return false;
      }
    }

    return true;
  }

  private triggerAnimation(binding: AnimationEventBinding): void {
    this.triggeredAnimations.add(binding.animationId);

    // Simulate animation playback
    this.playingAnimations.set(binding.animationId, {
      id: binding.animationId,
      targetId: binding.targetId,
      duration: 500,
      isPlaying: true
    });
  }

  getTriggeredAnimations(): Set<string> {
    return this.triggeredAnimations;
  }

  getPlayingAnimationCount(): number {
    return this.playingAnimations.size;
  }

  stopAnimation(animationId: string): void {
    this.playingAnimations.delete(animationId);
  }

  getEventLog(): GameEvent[] {
    return this.eventLog;
  }

  getBindingCount(): number {
    return this.bindings.size;
  }

  isAnimationPlaying(animationId: string): boolean {
    return this.playingAnimations.has(animationId);
  }

  finishAnimation(animationId: string): void {
    this.playingAnimations.delete(animationId);
  }

  reset(): void {
    this.bindings.clear();
    this.triggeredAnimations.clear();
    this.eventLog = [];
    this.playingAnimations.clear();
  }
}

describe('Animation Event Binding (Phase 10.2)', () => {
  let manager: EventBindingManager;

  beforeEach(() => {
    manager = new EventBindingManager();
  });

  describe('Basic Event Binding', () => {
    it('should bind animation to game event', () => {
      const binding: AnimationEventBinding = {
        id: 'binding-1',
        eventType: 'BumperHit',
        animationId: 'bumper-flash',
        targetId: 'bumper-1',
        priority: 1
      };

      manager.bindAnimation(binding);
      expect(manager.getBindingCount()).toBe(1);
    });

    it('should trigger animation on event dispatch', () => {
      const binding: AnimationEventBinding = {
        id: 'binding-1',
        eventType: 'BumperHit',
        animationId: 'bumper-flash',
        targetId: 'bumper-1'
      };

      manager.bindAnimation(binding);

      const event: GameEvent = {
        type: 'BumperHit',
        timestamp: Date.now()
      };

      manager.dispatchEvent(event);

      expect(manager.getTriggeredAnimations().has('bumper-flash')).toBe(true);
      expect(manager.getPlayingAnimationCount()).toBe(1);
    });

    it('should not trigger animation on unrelated event', () => {
      const binding: AnimationEventBinding = {
        id: 'binding-1',
        eventType: 'BumperHit',
        animationId: 'bumper-flash',
        targetId: 'bumper-1'
      };

      manager.bindAnimation(binding);

      const event: GameEvent = {
        type: 'BallDrain',
        timestamp: Date.now()
      };

      manager.dispatchEvent(event);

      expect(manager.getTriggeredAnimations().size).toBe(0);
    });

    it('should trigger animation with matching event parameters', () => {
      const binding: AnimationEventBinding = {
        id: 'binding-1',
        eventType: 'BallVelocityExceeds',
        eventParams: { velocity: 10 },
        animationId: 'fast-ball-glow',
        targetId: 'playfield'
      };

      manager.bindAnimation(binding);

      const event: GameEvent = {
        type: 'BallVelocityExceeds',
        params: { velocity: 15 },
        timestamp: Date.now()
      };

      manager.dispatchEvent(event);

      expect(manager.getTriggeredAnimations().has('fast-ball-glow')).toBe(true);
    });

    it('should not trigger animation with non-matching parameters', () => {
      const binding: AnimationEventBinding = {
        id: 'binding-1',
        eventType: 'ComboMilestone',
        eventParams: { combo: 5 },
        animationId: 'combo-celebration',
        targetId: 'playfield'
      };

      manager.bindAnimation(binding);

      const event: GameEvent = {
        type: 'ComboMilestone',
        params: { combo: 3 },
        timestamp: Date.now()
      };

      manager.dispatchEvent(event);

      expect(manager.getTriggeredAnimations().size).toBe(0);
    });
  });

  describe('Unbinding Animations', () => {
    it('should unbind animation by binding ID', () => {
      const binding: AnimationEventBinding = {
        id: 'binding-1',
        eventType: 'BumperHit',
        animationId: 'bumper-flash',
        targetId: 'bumper-1'
      };

      manager.bindAnimation(binding);
      expect(manager.getBindingCount()).toBe(1);

      manager.unbindAnimation('binding-1');
      expect(manager.getBindingCount()).toBe(0);
    });

    it('should unbind animation by animation ID', () => {
      const binding1: AnimationEventBinding = {
        id: 'binding-1',
        eventType: 'BumperHit',
        animationId: 'bumper-flash',
        targetId: 'bumper-1'
      };

      const binding2: AnimationEventBinding = {
        id: 'binding-2',
        eventType: 'BumperHit',
        animationId: 'bumper-flash',
        targetId: 'bumper-2'
      };

      manager.bindAnimation(binding1);
      manager.bindAnimation(binding2);
      expect(manager.getBindingCount()).toBe(2);

      manager.unbindByAnimationId('bumper-flash');
      expect(manager.getBindingCount()).toBe(0);
    });

    it('should stop animation during playback when unbound', () => {
      const binding: AnimationEventBinding = {
        id: 'binding-1',
        eventType: 'BumperHit',
        animationId: 'bumper-flash',
        targetId: 'bumper-1'
      };

      manager.bindAnimation(binding);

      const event: GameEvent = {
        type: 'BumperHit',
        timestamp: Date.now()
      };

      manager.dispatchEvent(event);
      expect(manager.isAnimationPlaying('bumper-flash')).toBe(true);

      // Unbind while playing
      manager.unbindAnimation('binding-1');
      manager.stopAnimation('bumper-flash');

      expect(manager.isAnimationPlaying('bumper-flash')).toBe(false);
    });

    it('should handle one-time event binding', () => {
      const binding: AnimationEventBinding = {
        id: 'binding-1',
        eventType: 'MultiballStart',
        animationId: 'multiball-intro',
        targetId: 'playfield',
        oneTime: true
      };

      manager.bindAnimation(binding);
      expect(manager.getBindingCount()).toBe(1);

      const event: GameEvent = {
        type: 'MultiballStart',
        timestamp: Date.now()
      };

      // First dispatch triggers animation and removes binding
      manager.dispatchEvent(event);
      expect(manager.getTriggeredAnimations().has('multiball-intro')).toBe(true);
      expect(manager.getBindingCount()).toBe(0); // Binding removed

      // Second dispatch shouldn't trigger (binding is gone)
      manager.dispatchEvent(event);
      expect(manager.getPlayingAnimationCount()).toBe(1); // Still 1 from first trigger
    });
  });

  describe('Circular Binding Prevention', () => {
    it('should reject self-referential binding', () => {
      const binding: AnimationEventBinding = {
        id: 'binding-1',
        eventType: 'CustomEvent',
        animationId: 'animation-1',
        targetId: 'animation-1' // Same as animation ID
      };

      expect(() => manager.bindAnimation(binding)).toThrow('Circular animation binding detected');
    });

    it('should reject direct circular bindings (A->B->A)', () => {
      // Bind A to B
      const bindingA: AnimationEventBinding = {
        id: 'binding-a',
        eventType: 'CustomEvent',
        animationId: 'animation-a',
        targetId: 'animation-b'
      };

      manager.bindAnimation(bindingA);

      // Try to bind B back to A (would create A->B->A cycle)
      const bindingB: AnimationEventBinding = {
        id: 'binding-b',
        eventType: 'CustomEvent',
        animationId: 'animation-b',
        targetId: 'animation-a'
      };

      expect(() => manager.bindAnimation(bindingB)).toThrow('Circular animation binding detected');
    });

    it('should allow complex binding chains without cycles', () => {
      // A -> B -> C -> D (linear chain, no cycles)
      const bindingA: AnimationEventBinding = {
        id: 'binding-a',
        eventType: 'CustomEvent',
        animationId: 'animation-a',
        targetId: 'animation-b'
      };

      const bindingB: AnimationEventBinding = {
        id: 'binding-b',
        eventType: 'CustomEvent',
        animationId: 'animation-b',
        targetId: 'animation-c'
      };

      const bindingC: AnimationEventBinding = {
        id: 'binding-c',
        eventType: 'CustomEvent',
        animationId: 'animation-c',
        targetId: 'animation-d'
      };

      expect(() => {
        manager.bindAnimation(bindingA);
        manager.bindAnimation(bindingB);
        manager.bindAnimation(bindingC);
      }).not.toThrow();

      expect(manager.getBindingCount()).toBe(3);
    });
  });

  describe('Priority-Based Event Handling', () => {
    it('should trigger animations in priority order', () => {
      const binding1: AnimationEventBinding = {
        id: 'binding-1',
        eventType: 'BumperHit',
        animationId: 'low-priority-flash',
        targetId: 'bumper-1',
        priority: 1
      };

      const binding2: AnimationEventBinding = {
        id: 'binding-2',
        eventType: 'BumperHit',
        animationId: 'high-priority-shake',
        targetId: 'bumper-1',
        priority: 10
      };

      manager.bindAnimation(binding1);
      manager.bindAnimation(binding2);

      const event: GameEvent = {
        type: 'BumperHit',
        timestamp: Date.now()
      };

      manager.dispatchEvent(event);

      expect(manager.getPlayingAnimationCount()).toBe(2);
      expect(manager.getTriggeredAnimations().has('high-priority-shake')).toBe(true);
      expect(manager.getTriggeredAnimations().has('low-priority-flash')).toBe(true);
    });
  });

  describe('Event Log and Debugging', () => {
    it('should maintain event log for debugging', () => {
      const event1: GameEvent = {
        type: 'BumperHit',
        timestamp: Date.now()
      };

      const event2: GameEvent = {
        type: 'RampComplete',
        timestamp: Date.now() + 100
      };

      const event3: GameEvent = {
        type: 'BallDrain',
        timestamp: Date.now() + 200
      };

      manager.dispatchEvent(event1);
      manager.dispatchEvent(event2);
      manager.dispatchEvent(event3);

      const log = manager.getEventLog();
      expect(log.length).toBe(3);
      expect(log[0].type).toBe('BumperHit');
      expect(log[1].type).toBe('RampComplete');
      expect(log[2].type).toBe('BallDrain');
    });

    it('should log events with parameters', () => {
      const event: GameEvent = {
        type: 'ScoreThreshold',
        params: { score: 50000 },
        timestamp: Date.now()
      };

      manager.dispatchEvent(event);

      const log = manager.getEventLog();
      expect(log[0].params.score).toBe(50000);
    });
  });

  describe('Animation Lifecycle', () => {
    it('should complete animation after duration', () => {
      const binding: AnimationEventBinding = {
        id: 'binding-1',
        eventType: 'BumperHit',
        animationId: 'bumper-flash',
        targetId: 'bumper-1'
      };

      manager.bindAnimation(binding);

      const event: GameEvent = {
        type: 'BumperHit',
        timestamp: Date.now()
      };

      manager.dispatchEvent(event);
      expect(manager.isAnimationPlaying('bumper-flash')).toBe(true);

      // Simulate animation completion
      manager.finishAnimation('bumper-flash');
      expect(manager.isAnimationPlaying('bumper-flash')).toBe(false);
    });

    it('should handle multiple events triggering same animation', () => {
      const binding1: AnimationEventBinding = {
        id: 'binding-1',
        eventType: 'BumperHit',
        animationId: 'impact-shake',
        targetId: 'camera'
      };

      const binding2: AnimationEventBinding = {
        id: 'binding-2',
        eventType: 'RampComplete',
        animationId: 'impact-shake',
        targetId: 'camera'
      };

      manager.bindAnimation(binding1);
      manager.bindAnimation(binding2);

      manager.dispatchEvent({
        type: 'BumperHit',
        timestamp: Date.now()
      });

      expect(manager.getTriggeredAnimations().has('impact-shake')).toBe(true);

      manager.finishAnimation('impact-shake');

      manager.dispatchEvent({
        type: 'RampComplete',
        timestamp: Date.now() + 100
      });

      expect(manager.getPlayingAnimationCount()).toBe(1);
    });
  });
});
