/**
 * Physics Worker Tests — Background Physics Simulation
 *
 * Tests physics worker bridge for offloading physics calculations
 * Covers message passing, state synchronization, and worker lifecycle
 *
 * Run with: npm test
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

/**
 * Mock physics worker interface
 */

interface PhysicsFrame {
  ballPosition: { x: number; y: number };
  ballVelocity: { x: number; y: number };
  ballRadius: number;
  timestamp: number;
}

interface WorkerMessage {
  type: string;
  payload?: any;
  id?: number;
}

interface WorkerResponse {
  type: string;
  payload?: any;
  id?: number;
  success: boolean;
}

/**
 * Mock physics worker
 */
class MockPhysicsWorker {
  messageQueue: WorkerMessage[] = [];
  responseHandlers: Map<number, Function> = new Map();
  state = {
    initialized: false,
    running: false,
    fps: 60,
    frameCount: 0,
    lastFrameTime: 0,
  };
  currentFrame: PhysicsFrame = {
    ballPosition: { x: 0, y: 0 },
    ballVelocity: { x: 0, y: 0 },
    ballRadius: 0.27,
    timestamp: 0,
  };
  messageId = 0;
  simulationTime = 0;

  postMessage(msg: WorkerMessage): void {
    this.messageQueue.push(msg);
    this.processMessage(msg);
  }

  processMessage(msg: WorkerMessage): void {
    let response: WorkerResponse;

    switch (msg.type) {
      case 'init':
        this.state.initialized = true;
        response = {
          type: 'init_response',
          success: true,
          id: msg.id,
          payload: { workerId: 'physics-worker-1' },
        };
        break;

      case 'start':
        this.state.running = true;
        response = {
          type: 'start_response',
          success: true,
          id: msg.id,
        };
        break;

      case 'stop':
        this.state.running = false;
        response = {
          type: 'stop_response',
          success: true,
          id: msg.id,
        };
        break;

      case 'step':
        this.stepPhysics(msg.payload?.dt || 0.016);
        response = {
          type: 'step_response',
          success: true,
          id: msg.id,
          payload: this.currentFrame,
        };
        break;

      case 'set_state':
        this.currentFrame = { ...this.currentFrame, ...msg.payload };
        response = {
          type: 'state_set',
          success: true,
          id: msg.id,
        };
        break;

      case 'get_state':
        response = {
          type: 'state_response',
          success: true,
          id: msg.id,
          payload: this.currentFrame,
        };
        break;

      case 'apply_impulse':
        this.applyImpulse(msg.payload);
        response = {
          type: 'impulse_applied',
          success: true,
          id: msg.id,
        };
        break;

      default:
        response = {
          type: 'error',
          success: false,
          id: msg.id,
          payload: { error: 'Unknown message type' },
        };
    }

    // Simulate async response
    if (this.responseHandlers.has(msg.id!)) {
      const handler = this.responseHandlers.get(msg.id!);
      handler?.(response);
    }
  }

  stepPhysics(dt: number): void {
    if (!this.state.running) return;

    // Simple physics: apply gravity
    const gravity = 9.81;
    this.currentFrame.ballVelocity.y -= gravity * dt;
    this.currentFrame.ballPosition.y += this.currentFrame.ballVelocity.y * dt;
    this.currentFrame.ballPosition.x += this.currentFrame.ballVelocity.x * dt;

    this.state.frameCount++;
    this.simulationTime += dt;
    this.currentFrame.timestamp = this.simulationTime;
  }

  applyImpulse(impulse: { vx: number; vy: number }): void {
    this.currentFrame.ballVelocity.x += impulse.vx;
    this.currentFrame.ballVelocity.y += impulse.vy;
  }

  onMessage(id: number, handler: Function): void {
    this.responseHandlers.set(id, handler);
  }

  terminate(): void {
    this.state.running = false;
    this.state.initialized = false;
  }
}

/**
 * Physics worker bridge (client-side interface)
 */
class PhysicsWorkerBridge {
  worker: MockPhysicsWorker;
  messageId = 0;
  state: PhysicsFrame = {
    ballPosition: { x: 0, y: 0 },
    ballVelocity: { x: 0, y: 0 },
    ballRadius: 0.27,
    timestamp: 0,
  };

  constructor() {
    this.worker = new MockPhysicsWorker();
  }

  async init(): Promise<void> {
    const id = ++this.messageId;
    await new Promise<void>((resolve) => {
      this.worker.onMessage(id, (response: WorkerResponse) => {
        if (response.success) {
          resolve();
        }
      });
      this.worker.postMessage({ type: 'init', id });
    });
  }

  async start(): Promise<void> {
    const id = ++this.messageId;
    await new Promise<void>((resolve) => {
      this.worker.onMessage(id, (response: WorkerResponse) => {
        if (response.success) resolve();
      });
      this.worker.postMessage({ type: 'start', id });
    });
  }

  async stop(): Promise<void> {
    const id = ++this.messageId;
    await new Promise<void>((resolve) => {
      this.worker.onMessage(id, (response: WorkerResponse) => {
        if (response.success) resolve();
      });
      this.worker.postMessage({ type: 'stop', id });
    });
  }

  async step(dt: number): Promise<PhysicsFrame> {
    const id = ++this.messageId;
    return new Promise<PhysicsFrame>((resolve) => {
      this.worker.onMessage(id, (response: WorkerResponse) => {
        if (response.success && response.payload) {
          this.state = response.payload;
          resolve(response.payload);
        }
      });
      this.worker.postMessage({ type: 'step', payload: { dt }, id });
    });
  }

  async setState(state: Partial<PhysicsFrame>): Promise<void> {
    const id = ++this.messageId;
    await new Promise<void>((resolve) => {
      this.worker.onMessage(id, (response: WorkerResponse) => {
        if (response.success) resolve();
      });
      this.worker.postMessage({ type: 'set_state', payload: state, id });
    });
  }

  async getState(): Promise<PhysicsFrame> {
    const id = ++this.messageId;
    return new Promise<PhysicsFrame>((resolve) => {
      this.worker.onMessage(id, (response: WorkerResponse) => {
        if (response.payload) {
          this.state = response.payload;
          resolve(response.payload);
        }
      });
      this.worker.postMessage({ type: 'get_state', id });
    });
  }

  async applyImpulse(vx: number, vy: number): Promise<void> {
    const id = ++this.messageId;
    await new Promise<void>((resolve) => {
      this.worker.onMessage(id, (response: WorkerResponse) => {
        if (response.success) resolve();
      });
      this.worker.postMessage({ type: 'apply_impulse', payload: { vx, vy }, id });
    });
  }

  terminate(): void {
    this.worker.terminate();
  }

  isRunning(): boolean {
    return this.worker.state.running;
  }

  getFrameCount(): number {
    return this.worker.state.frameCount;
  }
}

// ───────────────────────────────────────────────────────────────────────────

describe('Physics Worker', () => {
  let bridge: PhysicsWorkerBridge;

  beforeEach(() => {
    bridge = new PhysicsWorkerBridge();
  });

  describe('Worker Lifecycle', () => {
    it('should initialize worker', async () => {
      await bridge.init();

      expect(bridge.worker.state.initialized).toBe(true);
    });

    it('should start simulation', async () => {
      await bridge.init();
      await bridge.start();

      expect(bridge.isRunning()).toBe(true);
    });

    it('should stop simulation', async () => {
      await bridge.init();
      await bridge.start();
      await bridge.stop();

      expect(bridge.isRunning()).toBe(false);
    });

    it('should not step when stopped', async () => {
      await bridge.init();
      const initialFrame = bridge.worker.state.frameCount;

      // Don't start simulation
      await bridge.step(0.016);

      expect(bridge.worker.state.frameCount).toBe(initialFrame);
    });
  });

  describe('Physics Simulation', () => {
    beforeEach(async () => {
      await bridge.init();
      await bridge.start();
    });

    it('should step physics simulation', async () => {
      const frame1 = await bridge.step(0.016);

      expect(frame1.timestamp).toBeCloseTo(0.016, 3);
      expect(bridge.getFrameCount()).toBe(1);
    });

    it('should accumulate time steps', async () => {
      await bridge.step(0.016);
      await bridge.step(0.016);
      await bridge.step(0.016);

      const frame = await bridge.getState();
      expect(frame.timestamp).toBeCloseTo(0.048, 3);
      expect(bridge.getFrameCount()).toBe(3);
    });

    it('should apply gravity to ball', async () => {
      await bridge.setState({
        ballPosition: { x: 0, y: 0 },
        ballVelocity: { x: 0, y: 0 },
        ballRadius: 0.27,
        timestamp: 0,
      });

      await bridge.step(0.016);
      const frame = await bridge.getState();

      expect(frame.ballVelocity.y).toBeLessThan(0); // Downward
      expect(frame.ballPosition.y).toBeLessThan(0); // Fell
    });

    it('should preserve horizontal velocity', async () => {
      await bridge.setState({
        ballPosition: { x: 0, y: 0 },
        ballVelocity: { x: 10, y: 0 },
        ballRadius: 0.27,
        timestamp: 0,
      });

      await bridge.step(0.016);
      const frame = await bridge.getState();

      expect(frame.ballVelocity.x).toBe(10);
    });
  });

  describe('State Management', () => {
    beforeEach(async () => {
      await bridge.init();
    });

    it('should set ball position', async () => {
      await bridge.setState({ ballPosition: { x: 5, y: 10 } });
      const frame = await bridge.getState();

      expect(frame.ballPosition.x).toBe(5);
      expect(frame.ballPosition.y).toBe(10);
    });

    it('should set ball velocity', async () => {
      await bridge.setState({ ballVelocity: { x: 15, y: 20 } });
      const frame = await bridge.getState();

      expect(frame.ballVelocity.x).toBe(15);
      expect(frame.ballVelocity.y).toBe(20);
    });

    it('should set multiple state properties', async () => {
      await bridge.setState({
        ballPosition: { x: 3, y: 4 },
        ballVelocity: { x: 5, y: 6 },
      });
      const frame = await bridge.getState();

      expect(frame.ballPosition.x).toBe(3);
      expect(frame.ballVelocity.y).toBe(6);
    });

    it('should get current state', async () => {
      await bridge.setState({ ballPosition: { x: 7, y: 8 } });
      const frame = await bridge.getState();

      expect(frame).toBeDefined();
      expect(frame.ballPosition.x).toBe(7);
    });
  });

  describe('Impulse Application', () => {
    beforeEach(async () => {
      await bridge.init();
      await bridge.start();
    });

    it('should apply impulse to ball', async () => {
      // Set known initial state
      await bridge.setState({ ballVelocity: { x: 0, y: 0 } });

      await bridge.applyImpulse(5, 10);
      const after = (await bridge.getState()).ballVelocity;

      // Impulse should increase velocity
      expect(after.x).toBeGreaterThan(0);
      expect(after.y).toBeGreaterThan(0);
    });

    it('should apply positive impulse', async () => {
      await bridge.applyImpulse(20, 25);
      const frame = await bridge.getState();

      expect(frame.ballVelocity.x).toBe(20);
      expect(frame.ballVelocity.y).toBe(25);
    });

    it('should apply negative impulse', async () => {
      await bridge.setState({ ballVelocity: { x: 10, y: 10 } });
      await bridge.applyImpulse(-5, -5);
      const frame = await bridge.getState();

      expect(frame.ballVelocity.x).toBe(5);
      expect(frame.ballVelocity.y).toBe(5);
    });
  });

  describe('Performance', () => {
    beforeEach(async () => {
      await bridge.init();
      await bridge.start();
    });

    it('should handle multiple rapid steps', async () => {
      for (let i = 0; i < 60; i++) {
        await bridge.step(0.016);
      }

      expect(bridge.getFrameCount()).toBe(60);
    });

    it('should maintain simulation time', async () => {
      const stepsPerSecond = 60;
      for (let i = 0; i < stepsPerSecond; i++) {
        await bridge.step(1 / stepsPerSecond);
      }

      const frame = await bridge.getState();
      expect(frame.timestamp).toBeCloseTo(1.0, 2);
    });

    it('should handle variable timestep', async () => {
      await bridge.step(0.01);
      await bridge.step(0.02);
      await bridge.step(0.015);

      const frame = await bridge.getState();
      expect(frame.timestamp).toBeCloseTo(0.045, 3);
    });
  });

  describe('Synchronization', () => {
    it('should sync state with main thread', async () => {
      await bridge.init();
      await bridge.setState({ ballPosition: { x: 2, y: 3 } });

      const state = await bridge.getState();

      expect(bridge.state.ballPosition.x).toBe(state.ballPosition.x);
      expect(bridge.state.ballPosition.y).toBe(state.ballPosition.y);
    });

    it('should track frame count', async () => {
      await bridge.init();
      await bridge.start();

      expect(bridge.getFrameCount()).toBe(0);

      await bridge.step(0.016);
      expect(bridge.getFrameCount()).toBe(1);

      await bridge.step(0.016);
      expect(bridge.getFrameCount()).toBe(2);
    });
  });

  describe('Game Scenario', () => {
    it('should simulate bumper hit sequence', async () => {
      await bridge.init();
      await bridge.start();

      // Set initial state
      await bridge.setState({
        ballPosition: { x: 0, y: 0 },
        ballVelocity: { x: 0, y: 0 },
        ballRadius: 0.27,
        timestamp: 0,
      });

      // Bumper imparts upward velocity
      await bridge.applyImpulse(-5, 25);

      // Simulate 10 frames
      for (let i = 0; i < 10; i++) {
        await bridge.step(0.016);
      }

      const frame = await bridge.getState();

      // Ball should have moved up (initially) but gravity pulled down
      expect(frame.ballVelocity.y).toBeLessThan(25); // Gravity reduced velocity
      expect(bridge.getFrameCount()).toBe(10);
    });
  });
});
