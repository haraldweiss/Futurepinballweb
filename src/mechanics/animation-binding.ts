/**
 * Animation Binding System — Connects animations to game events
 * Phase 13 Task 3: Enable animations to trigger on bumper hits, ramp completions, etc.
 */

/**
 * Animation binding: Associates an animation with a trigger event
 */
export interface AnimationBinding {
  id: string;                                           // Unique identifier
  elementType: 'bumper' | 'target' | 'ramp' | 'flipper' | 'drain' | 'multiball' | 'mode';
  elementName?: string;                                 // Optional element name/index
  triggerEvent: 'on_hit' | 'on_complete' | 'on_start' | 'on_release' | 'on_drain';
  sequenceId: number | string;                          // Animation sequence ID/name
  autoPlay: boolean;                                    // Auto-play or wait for script trigger
  delay: number;                                        // Milliseconds to delay before playing
  priority: number;                                     // Higher = plays first
  oneShot: boolean;                                     // Only trigger once per table load
  maxTriggersPerBall?: number;                          // Max times to trigger per ball (optional)
}

/**
 * Manager for animation bindings
 */
export class AnimationBindingManager {
  private bindings: Map<string, AnimationBinding> = new Map();
  private triggeredCount: Map<string, number> = new Map();  // Track one-shot triggers

  /**
   * Register a new animation binding
   */
  registerBinding(binding: AnimationBinding): void {
    if (!binding.id) {
      binding.id = `binding_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    this.bindings.set(binding.id, binding);
    this.triggeredCount.set(binding.id, 0);
  }

  /**
   * Unregister a binding by ID
   */
  unregisterBinding(id: string): void {
    this.bindings.delete(id);
    this.triggeredCount.delete(id);
  }

  /**
   * Get all bindings for an element type and event
   */
  getBindingsFor(elementType: string, event: string): AnimationBinding[] {
    const matches: AnimationBinding[] = [];
    for (const binding of this.bindings.values()) {
      if (binding.elementType === elementType && binding.triggerEvent === event) {
        // Check one-shot constraint
        if (binding.oneShot && (this.triggeredCount.get(binding.id) ?? 0) > 0) {
          continue;
        }
        matches.push(binding);
      }
    }
    // Sort by priority (higher first)
    return matches.sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
  }

  /**
   * Get all bindings for an element type
   */
  getBindingsForElement(elementType: string): AnimationBinding[] {
    const matches: AnimationBinding[] = [];
    for (const binding of this.bindings.values()) {
      if (binding.elementType === elementType) {
        matches.push(binding);
      }
    }
    return matches;
  }

  /**
   * Mark binding as triggered (for one-shot tracking)
   */
  markTriggered(bindingId: string): void {
    const current = this.triggeredCount.get(bindingId) ?? 0;
    this.triggeredCount.set(bindingId, current + 1);
  }

  /**
   * Reset trigger counts (e.g., on new ball)
   */
  resetTriggerCounts(): void {
    for (const key of this.triggeredCount.keys()) {
      this.triggeredCount.set(key, 0);
    }
  }

  /**
   * Clear all bindings
   */
  clear(): void {
    this.bindings.clear();
    this.triggeredCount.clear();
  }

  /**
   * Get all bindings (for debugging)
   */
  getAllBindings(): AnimationBinding[] {
    return Array.from(this.bindings.values());
  }

  /**
   * Get binding count
   */
  getCount(): number {
    return this.bindings.size;
  }

  /**
   * Create a default binding for an element type
   */
  static createDefaultBinding(
    elementType: string,
    sequenceId: number,
    event: string = 'on_hit'
  ): AnimationBinding {
    return {
      id: `default_${elementType}_${sequenceId}`,
      elementType: elementType as any,
      triggerEvent: event as any,
      sequenceId,
      autoPlay: true,
      delay: 0,
      priority: 1,
      oneShot: false,
    };
  }
}

// ─── Global Instance ──────────────────────────────────────────────────────────

let globalBindingManager: AnimationBindingManager | null = null;

export function initializeAnimationBinding(): AnimationBindingManager {
  globalBindingManager = new AnimationBindingManager();
  return globalBindingManager;
}

export function getAnimationBindingManager(): AnimationBindingManager | null {
  return globalBindingManager;
}
