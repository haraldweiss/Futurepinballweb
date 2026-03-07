/**
 * physics-worker-bridge.ts — Bridge between main thread and physics worker
 * Manages async physics updates with proper state synchronization
 *
 * Phase 15: Physics Worker System
 * Provides clean API for physics updates while running on separate thread
 */

/**
 * Physics frame data returned from worker.
 */
export interface PhysicsFrameData {
  ballPos: { x: number; y: number; z: number };
  ballVel: { x: number; y: number };
  ballAng?: number;
  collisions: PhysicsCollisionEvent[];
  frameCount?: number;
}

/**
 * Collision event from physics world.
 */
export interface PhysicsCollisionEvent {
  type: string;  // 'bumper', 'target', 'flipper_left', 'flipper_right', 'slingshot'
  data: any;     // Type-specific data
  time: number;  // Frame number when collision occurred
}

/**
 * Callback when physics frame is ready.
 */
export type PhysicsFrameCallback = (frame: PhysicsFrameData) => void;

/**
 * PhysicsWorkerBridge manages communication with physics worker.
 *
 * Handles:
 * - Worker initialization
 * - Async message passing
 * - Frame buffering
 * - State synchronization
 * - Error handling
 */
export class PhysicsWorkerBridge {
  private worker: Worker | null = null;
  private initialized = false;
  private frameCallback: PhysicsFrameCallback | null = null;
  private pendingFrame: PhysicsFrameData | null = null;
  private lastFrameTime = 0;
  private frameCount = 0;

  /**
   * Initialize the physics worker.
   */
  async initialize(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // Create worker from physics-worker.ts
        this.worker = new Worker(
          new URL('./physics-worker.ts', import.meta.url),
          { type: 'module' }
        );

        // Setup message handler
        this.worker.onmessage = this.handleWorkerMessage.bind(this);
        this.worker.onerror = (error) => {
          console.error('[Physics Bridge] Worker error:', error);
          reject(error);
        };

        // Wait for worker to be ready
        const readyTimeout = setTimeout(() => {
          reject(new Error('Physics worker initialization timeout'));
        }, 5000);

        // Custom handler for ready signal
        const originalHandler = this.worker.onmessage;
        this.worker.onmessage = (event) => {
          if (event.data.type === 'worker-ready' || event.data.type === 'ready') {
            clearTimeout(readyTimeout);
            this.initialized = true;
            this.worker!.onmessage = originalHandler?.bind(this);
            console.log('[Physics Bridge] Worker initialized');
            resolve();
          } else if (originalHandler) {
            originalHandler.call(this, event);
          }
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Setup physics world with initial configuration.
   */
  initializePhysicsWorld(config: {
    ballInitialPos: { x: number; y: number };
    ballRestitution: number;
    ballFriction: number;
    leftFlipperPos: { x: number; y: number };
    rightFlipperPos: { x: number; y: number };
    flipperLength: number;
    flipperRestitution: number;
    flipperFriction: number;
    tableBodies: any[];
    bumperMap: Map<number, any>;
    targetMap: Map<number, any>;
    slingshotMap: Map<number, string>;
  }): void {
    if (!this.worker) {
      throw new Error('Physics worker not initialized');
    }

    // Convert Maps to arrays for serialization
    const bumperMapArray = Array.from(config.bumperMap.entries());
    const targetMapArray = Array.from(config.targetMap.entries());
    const slingshotMapArray = Array.from(config.slingshotMap.entries());

    this.worker.postMessage({
      type: 'init',
      config: {
        ...config,
        bumperMap: bumperMapArray,
        targetMap: targetMapArray,
        slingshotMap: slingshotMapArray,
      },
    });

    console.log('[Physics Bridge] Physics world initialized');
  }

  /**
   * Set callback for physics frame updates.
   */
  setFrameCallback(callback: PhysicsFrameCallback): void {
    this.frameCallback = callback;
  }

  /**
   * Step physics simulation.
   * Non-blocking - result arrives via callback.
   */
  step(dt: number, substeps: number = 4): void {
    if (!this.worker) {
      throw new Error('Physics worker not initialized');
    }

    this.worker.postMessage({
      type: 'step',
      dt: Math.min(dt, 0.05),  // Cap dt to prevent instability
      substeps: Math.min(Math.max(substeps, 1), 8),  // Clamp 1-8
    });

    this.frameCount++;
  }

  /**
   * Update left flipper rotation.
   */
  updateLeftFlipperRotation(angle: number): void {
    this.postMessage({ type: 'updateFlipper', side: 'left', angle });
  }

  /**
   * Update right flipper rotation.
   */
  updateRightFlipperRotation(angle: number): void {
    this.postMessage({ type: 'updateFlipper', side: 'right', angle });
  }

  /**
   * Update ball position (for plunging, draining, etc.)
   */
  updateBallPosition(x: number, y: number, vx: number = 0, vy: number = 0): void {
    this.postMessage({ type: 'updateBall', x, y, vx, vy });
  }

  /**
   * Set ball gravity scale (0 = no gravity, for in-lane).
   */
  setBallGravityScale(scale: number): void {
    this.postMessage({ type: 'setBallGravity', scale });
  }

  /**
   * Get the last physics frame (for immediate access if needed).
   */
  getLastFrame(): PhysicsFrameData | null {
    return this.pendingFrame;
  }

  /**
   * Handle messages from worker.
   */
  private handleWorkerMessage(event: MessageEvent): void {
    const { type, data, error } = event.data;

    switch (type) {
      case 'frame': {
        this.pendingFrame = data as PhysicsFrameData;
        this.lastFrameTime = performance.now();

        // Call user callback if set
        if (this.frameCallback) {
          this.frameCallback(data as PhysicsFrameData);
        }
        break;
      }

      case 'error': {
        console.error('[Physics Bridge] Worker error:', error);
        break;
      }

      case 'worker-ready':
      case 'ready':
      case 'disposed': {
        // Handled elsewhere
        break;
      }

      default:
        console.warn(`[Physics Bridge] Unknown message type: ${type}`);
    }
  }

  /**
   * Post message to worker.
   */
  private postMessage(message: any): void {
    if (!this.worker) {
      throw new Error('Physics worker not initialized');
    }
    this.worker.postMessage(message);
  }

  /**
   * Get metrics about physics worker status.
   */
  getMetrics() {
    return {
      initialized: this.initialized,
      lastFrameTime: this.lastFrameTime,
      frameCount: this.frameCount,
      hasPendingFrame: this.pendingFrame !== null,
    };
  }

  /**
   * Dispose worker and cleanup.
   */
  dispose(): void {
    if (!this.worker) return;

    this.postMessage({ type: 'dispose' });
    this.worker.terminate();
    this.worker = null;
    this.initialized = false;
    this.frameCallback = null;
    this.pendingFrame = null;

    console.log('[Physics Bridge] Physics worker disposed');
  }
}

/**
 * Singleton instance.
 */
let physicsWorkerBridge: PhysicsWorkerBridge | null = null;

/**
 * Initialize physics worker bridge singleton.
 */
export async function initializePhysicsWorker(): Promise<PhysicsWorkerBridge> {
  if (physicsWorkerBridge) {
    return physicsWorkerBridge;
  }

  physicsWorkerBridge = new PhysicsWorkerBridge();
  await physicsWorkerBridge.initialize();
  return physicsWorkerBridge;
}

/**
 * Get physics worker bridge singleton.
 */
export function getPhysicsWorker(): PhysicsWorkerBridge {
  if (!physicsWorkerBridge) {
    throw new Error('Physics worker not initialized. Call initializePhysicsWorker() first.');
  }
  return physicsWorkerBridge;
}

/**
 * Dispose physics worker.
 */
export function disposePhysicsWorker(): void {
  if (physicsWorkerBridge) {
    physicsWorkerBridge.dispose();
    physicsWorkerBridge = null;
  }
}
