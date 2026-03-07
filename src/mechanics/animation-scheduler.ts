/**
 * Animation Scheduler — Manages animation playback queuing
 * Phase 13 Task 3: Queue and schedule animations with priority
 */

export interface ScheduledAnimation {
  sequenceId: number | string;
  startTime: number;                // When to start (relative to now)
  priority: number;                 // Higher = plays first
  autoStart: boolean;               // Auto-play immediately
  onComplete?: () => void;          // Callback when done
  bindingId?: string;               // Source binding ID (for tracking)
}

/**
 * Manages animation queue and playback scheduling
 */
export class AnimationScheduler {
  private queue: ScheduledAnimation[] = [];
  private currentAnimation: ScheduledAnimation | null = null;
  private playStartTime: number = 0;
  private paused: boolean = false;

  /**
   * Schedule an animation for playback
   */
  schedule(anim: ScheduledAnimation): void {
    this.queue.push(anim);
    // Re-sort queue by priority and startTime
    this.queue.sort((a, b) => {
      const timeDiff = a.startTime - b.startTime;
      if (timeDiff !== 0) return timeDiff;
      return (b.priority ?? 0) - (a.priority ?? 0);
    });
  }

  /**
   * Schedule multiple animations
   */
  scheduleMultiple(anims: ScheduledAnimation[]): void {
    for (const anim of anims) {
      this.schedule(anim);
    }
  }

  /**
   * Start playing the next queued animation
   */
  playNext(): void {
    if (this.queue.length === 0) {
      this.currentAnimation = null;
      return;
    }

    const now = Date.now();
    let nextIdx = -1;

    // Find first animation that's ready to play
    for (let i = 0; i < this.queue.length; i++) {
      if (this.queue[i].startTime <= now) {
        nextIdx = i;
        break;
      }
    }

    if (nextIdx >= 0) {
      this.currentAnimation = this.queue.splice(nextIdx, 1)[0];
      this.playStartTime = now;
      console.log(`▶️  Animation queued: ${this.currentAnimation.sequenceId} (priority ${this.currentAnimation.priority})`);
    }
  }

  /**
   * Update scheduler (call each frame to trigger playNext when ready)
   */
  update(currentTime: number): void {
    if (this.paused) return;

    // If no current animation, try to start next
    if (!this.currentAnimation || currentTime - this.playStartTime > 5000) {  // Assume max 5s per animation
      this.playNext();
    }
  }

  /**
   * Get current animation being scheduled
   */
  getCurrent(): ScheduledAnimation | null {
    return this.currentAnimation;
  }

  /**
   * Clear current animation
   */
  clearCurrent(): void {
    if (this.currentAnimation?.onComplete) {
      this.currentAnimation.onComplete();
    }
    this.currentAnimation = null;
  }

  /**
   * Skip current animation and play next
   */
  skipCurrent(): void {
    this.clearCurrent();
    this.playNext();
  }

  /**
   * Check if queue is empty
   */
  isQueueEmpty(): boolean {
    return this.queue.length === 0 && this.currentAnimation === null;
  }

  /**
   * Pause/resume scheduling
   */
  setPaused(paused: boolean): void {
    this.paused = paused;
  }

  /**
   * Get queue size
   */
  getQueueSize(): number {
    return this.queue.length;
  }

  /**
   * Clear entire queue
   */
  clear(): void {
    this.queue = [];
    this.currentAnimation = null;
  }

  /**
   * Get all queued animations (for debugging)
   */
  getQueuedAnimations(): ScheduledAnimation[] {
    return [...this.queue];
  }
}

// ─── Global Instance ──────────────────────────────────────────────────────────

let globalScheduler: AnimationScheduler | null = null;

export function initializeAnimationScheduler(): AnimationScheduler {
  globalScheduler = new AnimationScheduler();
  return globalScheduler;
}

export function getAnimationScheduler(): AnimationScheduler | null {
  return globalScheduler;
}
