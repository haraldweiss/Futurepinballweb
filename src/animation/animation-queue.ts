/**
 * Animation Queue — Manages queuing and blending between animations
 * Phase 13 Task 5: Smooth animation transitions and priority-based playback
 */

export interface QueuedAnimation {
  sequenceId: number | string;
  priority: number;
  transitionDuration: number;  // ms for blend-in
  onComplete?: () => void;
  onStart?: () => void;
  loopCount?: number;  // -1 = infinite
}

/**
 * Manages animation queue with smooth blending
 */
export class AnimationQueue {
  private queue: QueuedAnimation[] = [];
  private currentAnimation: QueuedAnimation | null = null;
  private isPlaying: boolean = false;
  private transitionProgress: number = 0;
  private transitionStartTime: number = 0;

  /**
   * Enqueue animation with priority
   */
  enqueue(anim: QueuedAnimation): void {
    this.queue.push(anim);
    this.sortQueue();
    console.log(`📌 Animation queued: ${anim.sequenceId} (priority ${anim.priority})`);
  }

  /**
   * Dequeue next animation
   */
  dequeue(): QueuedAnimation | null {
    if (this.queue.length === 0) return null;
    return this.queue.shift() || null;
  }

  /**
   * Play next queued animation
   */
  playNext(): boolean {
    const next = this.dequeue();
    if (!next) {
      this.currentAnimation = null;
      this.isPlaying = false;
      return false;
    }

    this.currentAnimation = next;
    this.isPlaying = true;
    this.transitionStartTime = Date.now();
    this.transitionProgress = 0;

    if (next.onStart) {
      try {
        next.onStart();
      } catch (e: any) {
        console.warn(`⚠️ Animation onStart callback error: ${e.message}`);
      }
    }

    console.log(`▶️ Playing animation: ${next.sequenceId}`);
    return true;
  }

  /**
   * Update queue state (called each frame)
   */
  update(deltaTime: number): void {
    if (!this.currentAnimation) {
      this.playNext();
      return;
    }

    // Update transition progress
    if (this.transitionProgress < 1.0) {
      const elapsed = Date.now() - this.transitionStartTime;
      this.transitionProgress = Math.min(
        1.0,
        elapsed / this.currentAnimation.transitionDuration
      );
    }
  }

  /**
   * Get current animation
   */
  getCurrent(): QueuedAnimation | null {
    return this.currentAnimation;
  }

  /**
   * Get transition blend factor (0.0 to 1.0)
   */
  getTransitionFactor(): number {
    return this.transitionProgress;
  }

  /**
   * Skip current animation and play next
   */
  skip(): boolean {
    if (this.currentAnimation?.onComplete) {
      try {
        this.currentAnimation.onComplete();
      } catch (e: any) {
        console.warn(`⚠️ Animation onComplete callback error: ${e.message}`);
      }
    }
    return this.playNext();
  }

  /**
   * Pause animation playback
   */
  pause(): void {
    this.isPlaying = false;
  }

  /**
   * Resume animation playback
   */
  resume(): void {
    if (this.currentAnimation) {
      this.isPlaying = true;
    }
  }

  /**
   * Check if currently playing
   */
  playing(): boolean {
    return this.isPlaying;
  }

  /**
   * Check if queue is empty
   */
  isEmpty(): boolean {
    return this.queue.length === 0 && this.currentAnimation === null;
  }

  /**
   * Get queue size
   */
  size(): number {
    return this.queue.length;
  }

  /**
   * Clear queue
   */
  clear(): void {
    this.queue = [];
    this.currentAnimation = null;
    this.isPlaying = false;
  }

  /**
   * Sort queue by priority and sequence ID
   */
  private sortQueue(): void {
    this.queue.sort((a, b) => {
      const priorityDiff = (b.priority ?? 0) - (a.priority ?? 0);
      if (priorityDiff !== 0) return priorityDiff;
      return String(a.sequenceId).localeCompare(String(b.sequenceId));
    });
  }

  /**
   * Get queue contents (for debugging)
   */
  getQueueContents(): QueuedAnimation[] {
    return [...this.queue];
  }
}

// ─── Global Instance ──────────────────────────────────────────────────────────

let globalAnimationQueue: AnimationQueue | null = null;

export function initializeAnimationQueue(): AnimationQueue {
  globalAnimationQueue = new AnimationQueue();
  return globalAnimationQueue;
}

export function getAnimationQueue(): AnimationQueue | null {
  return globalAnimationQueue;
}
