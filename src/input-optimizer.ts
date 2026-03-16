/**
 * input-optimizer.ts — Low-latency input handling for flipper response
 * Phase 24: Arcade-grade input responsiveness
 * 
 * Critical for pinball: Input lag = dead game
 */

export interface InputState {
  flipperLeft: boolean;
  flipperRight: boolean;
  plungerActive: boolean;
  plungerPower: number;  // 0.0 to 1.0
  nudgeX: number;        // -1, 0, or 1
  nudgeY: number;        // -1, 0, or 1
}

export interface InputMetrics {
  keyDownLatency: number;      // ms from press to detection
  flipperResponseTime: number; // ms from input to physics update
  inputQueueSize: number;
  lastInputTime: number;
}

/**
 * Low-latency input handler with frame skipping prevention
 */
export class InputOptimizer {
  private state: InputState = {
    flipperLeft: false,
    flipperRight: false,
    plungerActive: false,
    plungerPower: 0,
    nudgeX: 0,
    nudgeY: 0,
  };

  private lastState: InputState = { ...this.state };
  private inputQueue: Array<{ key: string; pressed: boolean; time: number }> = [];
  private metrics: InputMetrics = {
    keyDownLatency: 0,
    flipperResponseTime: 0,
    inputQueueSize: 0,
    lastInputTime: 0,
  };

  private keyMap = {
    'ShiftLeft': 'flipperLeft',
    'ShiftRight': 'flipperRight',
    'Enter': 'plungerActive',
    'KeyZ': 'nudgeLeft',
    'KeyX': 'nudgeRight',
  };

  /**
   * Initialize input handler
   */
  initialize(): void {
    // Use capture phase for fastest input detection
    document.addEventListener('keydown', this.handleKeyDown.bind(this), true);
    document.addEventListener('keyup', this.handleKeyUp.bind(this), true);
    
    console.log('[Input Optimizer] Initialized with capture phase listeners');
  }

  /**
   * Get current input state (read-only copy)
   */
  getState(): Readonly<InputState> {
    return Object.freeze({ ...this.state });
  }

  /**
   * Get state delta (what changed)
   */
  getStateDelta(): Partial<InputState> {
    const delta: Partial<InputState> = {};

    if (this.state.flipperLeft !== this.lastState.flipperLeft) {
      delta.flipperLeft = this.state.flipperLeft;
    }
    if (this.state.flipperRight !== this.lastState.flipperRight) {
      delta.flipperRight = this.state.flipperRight;
    }
    if (this.state.plungerActive !== this.lastState.plungerActive) {
      delta.plungerActive = this.state.plungerActive;
    }
    if (this.state.plungerPower !== this.lastState.plungerPower) {
      delta.plungerPower = this.state.plungerPower;
    }

    return delta;
  }

  /**
   * Update state from queue (call once per frame)
   */
  processInputQueue(): number {
    let processed = 0;
    const now = performance.now();

    while (this.inputQueue.length > 0) {
      const input = this.inputQueue.shift();
      if (!input) break;

      this.metrics.keyDownLatency = now - input.time;

      // Process input
      this.processKeyInput(input.key, input.pressed);
      processed++;
    }

    this.metrics.inputQueueSize = this.inputQueue.length;
    return processed;
  }

  /**
   * Process individual key input
   */
  private processKeyInput(key: string, pressed: boolean): void {
    const mappedKey = (this.keyMap as any)[key];
    if (!mappedKey) return;

    if (mappedKey === 'nudgeLeft') {
      this.state.nudgeX = pressed ? -1 : 0;
    } else if (mappedKey === 'nudgeRight') {
      this.state.nudgeX = pressed ? 1 : 0;
    } else if (mappedKey === 'flipperLeft') {
      this.state.flipperLeft = pressed;
    } else if (mappedKey === 'flipperRight') {
      this.state.flipperRight = pressed;
    } else if (mappedKey === 'plungerActive') {
      this.state.plungerActive = pressed;
      if (!pressed) {
        // Plunger released - use power
        this.state.plungerPower = 1.0;
      }
    }
  }

  /**
   * Handle keydown with ultra-low latency
   */
  private handleKeyDown(event: KeyboardEvent): void {
    const now = performance.now();
    this.metrics.lastInputTime = now;

    // Queue input for next frame
    this.inputQueue.push({
      key: event.code,
      pressed: true,
      time: now,
    });

    // Prevent browser defaults for game keys
    if (this.isGameKey(event.code)) {
      event.preventDefault();
    }
  }

  /**
   * Handle keyup
   */
  private handleKeyUp(event: KeyboardEvent): void {
    const now = performance.now();
    this.metrics.lastInputTime = now;

    this.inputQueue.push({
      key: event.code,
      pressed: false,
      time: now,
    });

    if (this.isGameKey(event.code)) {
      event.preventDefault();
    }
  }

  /**
   * Check if key is a game control
   */
  private isGameKey(code: string): boolean {
    return [
      'ShiftLeft', 'ShiftRight', 'Enter',
      'KeyZ', 'KeyX', 'KeyM', 'KeyR'
    ].includes(code);
  }

  /**
   * Update plunger power (for analog control)
   */
  updatePlungerPower(power: number): void {
    this.state.plungerPower = Math.max(0, Math.min(1, power));
  }

  /**
   * Set nudge force
   */
  setNudge(x: number, y: number): void {
    this.state.nudgeX = Math.max(-1, Math.min(1, x));
    this.state.nudgeY = Math.max(-1, Math.min(1, y));
  }

  /**
   * Get performance metrics
   */
  getMetrics(): InputMetrics {
    return { ...this.metrics };
  }

  /**
   * Reset input state
   */
  reset(): void {
    this.lastState = { ...this.state };
    this.state = {
      flipperLeft: false,
      flipperRight: false,
      plungerActive: false,
      plungerPower: 0,
      nudgeX: 0,
      nudgeY: 0,
    };
    this.inputQueue = [];
  }

  /**
   * Cleanup
   */
  dispose(): void {
    document.removeEventListener('keydown', this.handleKeyDown.bind(this), true);
    document.removeEventListener('keyup', this.handleKeyUp.bind(this), true);
  }
}

/**
 * Singleton instance
 */
let inputOptimizer: InputOptimizer | null = null;

/**
 * Get input optimizer instance
 */
export function getInputOptimizer(): InputOptimizer {
  if (!inputOptimizer) {
    inputOptimizer = new InputOptimizer();
    inputOptimizer.initialize();
  }
  return inputOptimizer;
}

/**
 * Dispose input optimizer
 */
export function disposeInputOptimizer(): void {
  if (inputOptimizer) {
    inputOptimizer.dispose();
    inputOptimizer = null;
  }
}

