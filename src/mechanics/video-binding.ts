/**
 * video-binding.ts — Video Event Binding System
 *
 * Manages associations between game events and video playback.
 * Similar to animation-binding.ts but for video triggers.
 *
 * Supports:
 * - Dynamic binding creation at runtime
 * - Event-driven playback
 * - Priority and ordering
 * - Conditional triggers
 */

import type { VideoEvent, VideoConfig } from '../video-manager';

export interface VideoBinding {
  id: string;
  videoId: string;
  trigger: string;  // bumper_hit, target_hit, ramp_complete, etc.
  priority: number; // Higher = plays first
  autoPlay: boolean;
  allowInterrupt: boolean;
  delay: number;    // ms before playback
  condition?: (state: any) => boolean; // Optional condition function
  metadata?: Record<string, any>;
}

/**
 * VideoBindingManager — Manages video/event associations
 */
export class VideoBindingManager {
  private bindings: Map<string, VideoBinding[]> = new Map();
  private bindingMap: Map<string, VideoBinding> = new Map();
  private nextId: number = 0;

  constructor() {
    console.log('✓ VideoBindingManager initialized');
  }

  /**
   * Create a new video binding
   */
  createBinding(videoId: string, trigger: string, options: Partial<VideoBinding> = {}): VideoBinding {
    const binding: VideoBinding = {
      id: `vbind_${this.nextId++}`,
      videoId,
      trigger,
      priority: options.priority ?? 0,
      autoPlay: options.autoPlay ?? true,
      allowInterrupt: options.allowInterrupt ?? true,
      delay: options.delay ?? 0,
      condition: options.condition,
      metadata: options.metadata,
    };

    // Store in trigger map
    if (!this.bindings.has(trigger)) {
      this.bindings.set(trigger, []);
    }

    // Add binding (maintain priority order)
    const triggerBindings = this.bindings.get(trigger)!;
    triggerBindings.push(binding);
    triggerBindings.sort((a, b) => b.priority - a.priority);

    // Store in ID map for quick lookup
    this.bindingMap.set(binding.id, binding);

    console.log(`✓ Created video binding: ${binding.id} (${trigger} → ${videoId})`);
    return binding;
  }

  /**
   * Get bindings for a specific trigger
   */
  getBindingsForTrigger(trigger: string): VideoBinding[] {
    return this.bindings.get(trigger) || [];
  }

  /**
   * Get a binding by ID
   */
  getBinding(bindingId: string): VideoBinding | undefined {
    return this.bindingMap.get(bindingId);
  }

  /**
   * Get all bindings
   */
  getAllBindings(): VideoBinding[] {
    return Array.from(this.bindingMap.values());
  }

  /**
   * Remove a binding
   */
  removeBinding(bindingId: string): boolean {
    const binding = this.bindingMap.get(bindingId);
    if (!binding) return false;

    // Remove from trigger map
    const triggerBindings = this.bindings.get(binding.trigger);
    if (triggerBindings) {
      const index = triggerBindings.findIndex(b => b.id === bindingId);
      if (index >= 0) {
        triggerBindings.splice(index, 1);
      }
    }

    // Remove from ID map
    this.bindingMap.delete(bindingId);

    console.log(`✓ Removed video binding: ${bindingId}`);
    return true;
  }

  /**
   * Remove all bindings for a trigger
   */
  removeBindingsForTrigger(trigger: string): number {
    const bindings = this.bindings.get(trigger) || [];
    const count = bindings.length;

    for (const binding of bindings) {
      this.bindingMap.delete(binding.id);
    }

    this.bindings.delete(trigger);
    console.log(`✓ Removed ${count} video bindings for trigger: ${trigger}`);
    return count;
  }

  /**
   * Update binding priority
   */
  updatePriority(bindingId: string, priority: number): boolean {
    const binding = this.bindingMap.get(bindingId);
    if (!binding) return false;

    binding.priority = priority;

    // Re-sort trigger bindings
    const triggerBindings = this.bindings.get(binding.trigger);
    if (triggerBindings) {
      triggerBindings.sort((a, b) => b.priority - a.priority);
    }

    return true;
  }

  /**
   * Update binding condition
   */
  updateCondition(bindingId: string, condition: (state: any) => boolean): boolean {
    const binding = this.bindingMap.get(bindingId);
    if (!binding) return false;

    binding.condition = condition;
    return true;
  }

  /**
   * Find best binding for trigger (respects conditions)
   */
  findBestBinding(trigger: string, gameState?: any): VideoBinding | undefined {
    const bindings = this.getBindingsForTrigger(trigger);

    for (const binding of bindings) {
      // Check if binding has a condition and if it passes
      if (binding.condition && gameState) {
        if (!binding.condition(gameState)) {
          continue;
        }
      }

      // If no condition or condition passed, return this binding
      if (binding.autoPlay) {
        return binding;
      }
    }

    return undefined;
  }

  /**
   * Clear all bindings
   */
  clear(): void {
    this.bindings.clear();
    this.bindingMap.clear();
    console.log('✓ VideoBindingManager cleared');
  }

  /**
   * Get statistics
   */
  getStats() {
    return {
      totalBindings: this.bindingMap.size,
      triggersCount: this.bindings.size,
      triggers: Array.from(this.bindings.keys()),
    };
  }
}

// Global instance
let videoBindingManager: VideoBindingManager | null = null;

export function initializeVideoBinding(): VideoBindingManager {
  if (!videoBindingManager) {
    videoBindingManager = new VideoBindingManager();
  }
  return videoBindingManager;
}

export function getVideoBindingManager(): VideoBindingManager | null {
  return videoBindingManager;
}

export function disposeVideoBinding(): void {
  if (videoBindingManager) {
    videoBindingManager.clear();
    videoBindingManager = null;
  }
}
