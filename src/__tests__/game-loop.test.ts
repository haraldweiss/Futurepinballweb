/**
 * Game Loop E2E Tests — Complete Game Simulation
 *
 * Tests full game lifecycle from startup → table load → ball launch →
 * bumper hit → scoring → drain → game over
 *
 * Run with: npm test
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

/**
 * Mock game state
 */
interface GameState {
  tableLoaded: boolean;
  gameStarted: boolean;
  ballInPlay: boolean;
  currentScore: number;
  ballCount: number;
  gameOver: boolean;
  multiplier: number;
}

interface PhysicsObject {
  id: string;
  type: 'ball' | 'bumper' | 'flipper' | 'target';
  position: { x: number; y: number };
  velocity: { x: number; y: number };
  active: boolean;
}

/**
 * Mock Graphics System
 */
class MockGraphics {
  initialized: boolean = false;
  scene: any = null;
  camera: any = null;
  renderer: any = null;

  initialize(): boolean {
    this.initialized = true;
    this.scene = { objects: [] };
    this.camera = { position: { z: 10 } };
    this.renderer = { size: { width: 1920, height: 1080 } };
    return true;
  }

  dispose(): void {
    this.initialized = false;
  }
}

/**
 * Mock Physics System
 */
class MockPhysicsSystem {
  objects: Map<string, PhysicsObject> = new Map();
  collisions: Array<{ a: string; b: string }> = [];
  lastFrameCollisions: Array<{ a: string; b: string }> = [];
  gravity: number = 9.81;
  running: boolean = false;

  addObject(obj: PhysicsObject): void {
    this.objects.set(obj.id, obj);
  }

  removeObject(id: string): void {
    this.objects.delete(id);
  }

  step(dt: number): void {
    if (!this.running) return;

    // Clear collisions from this frame
    this.collisions = [];

    // Simulate gravity on ball
    const ball = Array.from(this.objects.values()).find(o => o.type === 'ball');
    if (ball) {
      ball.velocity.y -= this.gravity * dt;
      ball.position.y += ball.velocity.y * dt;
      ball.position.x += ball.velocity.x * dt;

      // Check bumper collisions
      for (const obj of this.objects.values()) {
        if (obj.type === 'bumper' && this.isColliding(ball, obj)) {
          this.collisions.push({ a: ball.id, b: obj.id });
          ball.velocity.y *= -0.8; // Bounce
        }
      }

      // Check drain (y < -5)
      if (ball.position.y < -5) {
        ball.active = false;
      }
    }

    // Store for next frame access
    this.lastFrameCollisions = [...this.collisions];
  }

  isColliding(obj1: PhysicsObject, obj2: PhysicsObject): boolean {
    const dx = obj1.position.x - obj2.position.x;
    const dy = obj1.position.y - obj2.position.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    return dist < 0.5; // Collision radius
  }

  getCollisions(): Array<{ a: string; b: string }> {
    return this.lastFrameCollisions;
  }

  start(): void {
    this.running = true;
  }

  stop(): void {
    this.running = false;
  }
}

/**
 * Mock Scoring System
 */
class MockScoringSystem {
  score: number = 0;
  multiplier: number = 1;
  combos: number = 0;
  highScore: number = 0;

  addScore(points: number): void {
    this.score += points * this.multiplier;
  }

  recordBumperHit(): void {
    this.addScore(100);
    this.combos++;
    if (this.combos % 10 === 0) {
      this.multiplier++;
    }
  }

  recordTargetHit(): void {
    this.addScore(150);
  }

  reset(): void {
    this.score = 0;
    this.combos = 0;
    this.multiplier = 1;
  }

  finalizeBall(): void {
    if (this.score > this.highScore) {
      this.highScore = this.score;
    }
  }
}

/**
 * Mock Game Engine
 */
class GameEngine {
  gameState: GameState = {
    tableLoaded: false,
    gameStarted: false,
    ballInPlay: false,
    currentScore: 0,
    ballCount: 3,
    gameOver: false,
    multiplier: 1,
  };

  graphics: MockGraphics;
  physics: MockPhysicsSystem;
  scoring: MockScoringSystem;
  animationTriggered: string[] = [];
  soundTriggered: string[] = [];

  constructor() {
    this.graphics = new MockGraphics();
    this.physics = new MockPhysicsSystem();
    this.scoring = new MockScoringSystem();
  }

  async loadTable(tableName: string): Promise<boolean> {
    // Initialize graphics
    if (!this.graphics.initialize()) return false;

    // Create playfield objects
    this.physics.addObject({
      id: 'bumper-1',
      type: 'bumper',
      position: { x: 0, y: 3 },
      velocity: { x: 0, y: 0 },
      active: true,
    });

    this.physics.addObject({
      id: 'flipper-left',
      type: 'flipper',
      position: { x: -1, y: -2 },
      velocity: { x: 0, y: 0 },
      active: true,
    });

    this.gameState.tableLoaded = true;
    return true;
  }

  startGame(): void {
    if (!this.gameState.tableLoaded) return;
    this.gameState.gameStarted = true;
    this.physics.start();
  }

  launchBall(): void {
    if (!this.gameState.gameStarted) return;

    // Create ball
    this.physics.addObject({
      id: 'ball-1',
      type: 'ball',
      position: { x: 0, y: -4 },
      velocity: { x: 0, y: 5 }, // Upward velocity
      active: true,
    });

    this.gameState.ballInPlay = true;
  }

  simulateFrame(): void {
    this.physics.step(0.016);

    // Process collisions from this frame
    const collisions = this.physics.lastFrameCollisions;
    for (const collision of collisions) {
      if (collision.b === 'bumper-1') {
        this.scoring.recordBumperHit();
        this.animationTriggered.push('bumper-flash');
        this.soundTriggered.push('bumper-hit');
      }
    }

    // Update game state after processing collisions
    this.gameState.currentScore = this.scoring.score;
    this.gameState.multiplier = this.scoring.multiplier;

    // Check ball drain
    const ball = this.physics.objects.get('ball-1');
    if (ball && !ball.active) {
      this.gameState.ballInPlay = false;
    }
  }

  drainBall(): void {
    const ball = this.physics.objects.get('ball-1');
    if (ball) {
      ball.active = false;
    }
    this.gameState.ballInPlay = false;
    this.gameState.ballCount--;

    // Finalize scoring
    this.scoring.finalizeBall();

    if (this.gameState.ballCount <= 0) {
      this.endGame();
    } else {
      this.scoring.reset();
      // Update game state after reset
      this.gameState.currentScore = this.scoring.score;
      this.gameState.multiplier = this.scoring.multiplier;
    }
  }

  endGame(): void {
    this.physics.stop();
    this.gameState.gameOver = true;
    this.gameState.gameStarted = false;
  }

  dispose(): void {
    this.graphics.dispose();
    this.physics.stop();
  }
}

// ───────────────────────────────────────────────────────────────────────────

describe('Game Loop E2E', () => {
  let engine: GameEngine;

  beforeEach(() => {
    engine = new GameEngine();
  });

  describe('Table Loading & Initialization', () => {
    it('should load table successfully', async () => {
      const success = await engine.loadTable('demo-table');
      expect(success).toBe(true);
    });

    it('should initialize graphics on table load', async () => {
      await engine.loadTable('demo-table');
      expect(engine.graphics.initialized).toBe(true);
      expect(engine.graphics.scene).toBeDefined();
      expect(engine.graphics.camera).toBeDefined();
      expect(engine.graphics.renderer).toBeDefined();
    });

    it('should create playfield objects on table load', async () => {
      await engine.loadTable('demo-table');
      expect(engine.physics.objects.size).toBeGreaterThan(0);
      expect(engine.physics.objects.has('bumper-1')).toBe(true);
      expect(engine.physics.objects.has('flipper-left')).toBe(true);
    });

    it('should set table loaded flag', async () => {
      await engine.loadTable('demo-table');
      expect(engine.gameState.tableLoaded).toBe(true);
    });

    it('should handle failed table load', async () => {
      engine.graphics.initialize = () => false; // Simulate failure
      const success = await engine.loadTable('bad-table');
      expect(success).toBe(false);
    });
  });

  describe('Game Start & Ball Launch', () => {
    beforeEach(async () => {
      await engine.loadTable('demo-table');
    });

    it('should start game after table load', () => {
      engine.startGame();
      expect(engine.gameState.gameStarted).toBe(true);
    });

    it('should not start game without table load', () => {
      const newEngine = new GameEngine();
      newEngine.startGame();
      expect(newEngine.gameState.gameStarted).toBe(false);
    });

    it('should activate physics on game start', () => {
      engine.startGame();
      expect(engine.physics.running).toBe(true);
    });

    it('should launch ball into play', () => {
      engine.startGame();
      engine.launchBall();

      expect(engine.gameState.ballInPlay).toBe(true);
      expect(engine.physics.objects.has('ball-1')).toBe(true);

      const ball = engine.physics.objects.get('ball-1');
      expect(ball?.velocity.y).toBeGreaterThan(0); // Moving upward
    });

    it('should not launch without game start', () => {
      engine.launchBall();
      expect(engine.gameState.ballInPlay).toBe(false);
    });
  });

  describe('Physics Simulation & Gravity', () => {
    beforeEach(async () => {
      await engine.loadTable('demo-table');
      engine.startGame();
      engine.launchBall();
    });

    it('should apply gravity to ball', () => {
      const ball = engine.physics.objects.get('ball-1');
      const initialVelocity = ball!.velocity.y;

      engine.simulateFrame();

      expect(ball!.velocity.y).toBeLessThan(initialVelocity); // Gravity reduces upward velocity
    });

    it('should update ball position each frame', () => {
      const ball = engine.physics.objects.get('ball-1');
      const initialY = ball!.position.y;

      engine.simulateFrame();

      expect(ball!.position.y).not.toBe(initialY); // Position changed
    });

    it('should simulate multiple frames', () => {
      for (let i = 0; i < 10; i++) {
        engine.simulateFrame();
      }

      const ball = engine.physics.objects.get('ball-1');
      expect(ball).toBeDefined();
    });
  });

  describe('Collision Detection & Scoring', () => {
    beforeEach(async () => {
      await engine.loadTable('demo-table');
      engine.startGame();
      engine.launchBall();
    });

    it('should detect ball-bumper collision', () => {
      const ball = engine.physics.objects.get('ball-1');
      const bumper = engine.physics.objects.get('bumper-1');

      // Position ball to collide with bumper (within collision radius of 0.5)
      ball!.position = { x: 0, y: 3.1 };
      ball!.velocity = { x: 0, y: 0 }; // Stop movement for reliable collision
      bumper!.position = { x: 0, y: 3 };

      engine.simulateFrame();

      const collisions = engine.physics.getCollisions();
      expect(collisions.some(c => c.b === 'bumper-1')).toBe(true);
    });

    it('should update score on bumper hit', () => {
      const ball = engine.physics.objects.get('ball-1');
      ball!.position = { x: 0, y: 3.1 };
      ball!.velocity = { x: 0, y: 0 }; // Stop movement for reliable collision
      engine.physics.objects.get('bumper-1')!.position = { x: 0, y: 3 };

      const initialScore = engine.gameState.currentScore;
      engine.simulateFrame();

      expect(engine.gameState.currentScore).toBeGreaterThan(initialScore);
    });

    it('should trigger animation on bumper hit', () => {
      const ball = engine.physics.objects.get('ball-1');
      ball!.position = { x: 0, y: 3.1 };
      ball!.velocity = { x: 0, y: 0 };
      engine.physics.objects.get('bumper-1')!.position = { x: 0, y: 3 };

      engine.simulateFrame();

      expect(engine.animationTriggered).toContain('bumper-flash');
    });

    it('should trigger sound on bumper hit', () => {
      const ball = engine.physics.objects.get('ball-1');
      ball!.position = { x: 0, y: 3.1 };
      ball!.velocity = { x: 0, y: 0 };
      engine.physics.objects.get('bumper-1')!.position = { x: 0, y: 3 };

      engine.simulateFrame();

      expect(engine.soundTriggered).toContain('bumper-hit');
    });

    it('should track combo multiplier', () => {
      const ball = engine.physics.objects.get('ball-1');
      const bumper = engine.physics.objects.get('bumper-1');

      // Hit bumper 10 times
      for (let i = 0; i < 10; i++) {
        ball!.position = { x: 0, y: 3.1 };
        ball!.velocity = { x: 0, y: 0 }; // Keep velocity at zero for reliable collision
        bumper!.position = { x: 0, y: 3 };
        engine.simulateFrame();
      }

      expect(engine.gameState.multiplier).toBeGreaterThan(1);
    });
  });

  describe('Ball Drain & Reset', () => {
    beforeEach(async () => {
      await engine.loadTable('demo-table');
      engine.startGame();
      engine.launchBall();
    });

    it('should drain ball when y < -5', () => {
      const ball = engine.physics.objects.get('ball-1');
      ball!.position.y = -6; // Below drain line

      engine.simulateFrame();

      expect(engine.gameState.ballInPlay).toBe(false);
    });

    it('should decrement ball count on drain', () => {
      const initialCount = engine.gameState.ballCount;
      const ball = engine.physics.objects.get('ball-1');
      ball!.position.y = -6;

      engine.simulateFrame();
      engine.drainBall();

      expect(engine.gameState.ballCount).toBe(initialCount - 1);
    });

    it('should finalize score on drain', () => {
      engine.scoring.recordBumperHit();
      const ballScore = engine.gameState.currentScore;

      const ball = engine.physics.objects.get('ball-1');
      ball!.position.y = -6;
      engine.simulateFrame();
      engine.drainBall();

      expect(engine.scoring.highScore).toBeGreaterThanOrEqual(ballScore);
    });

    it('should reset score for next ball', () => {
      engine.scoring.recordBumperHit();
      const ball = engine.physics.objects.get('ball-1');
      ball!.position.y = -6;
      engine.simulateFrame();
      engine.drainBall();

      expect(engine.gameState.currentScore).toBe(0);
    });

    it('should not end game if balls remain', () => {
      engine.gameState.ballCount = 2;
      const ball = engine.physics.objects.get('ball-1');
      ball!.position.y = -6;
      engine.simulateFrame();
      engine.drainBall();

      expect(engine.gameState.gameOver).toBe(false);
      expect(engine.gameState.gameStarted).toBe(true);
    });
  });

  describe('Game Over', () => {
    beforeEach(async () => {
      await engine.loadTable('demo-table');
      engine.startGame();
      engine.launchBall();
      engine.gameState.ballCount = 1; // Last ball
    });

    it('should end game when balls exhausted', () => {
      const ball = engine.physics.objects.get('ball-1');
      ball!.position.y = -6;
      engine.simulateFrame();
      engine.drainBall();

      expect(engine.gameState.gameOver).toBe(true);
    });

    it('should stop physics on game over', () => {
      const ball = engine.physics.objects.get('ball-1');
      ball!.position.y = -6;
      engine.simulateFrame();
      engine.drainBall();

      expect(engine.physics.running).toBe(false);
    });

    it('should preserve high score after game over', () => {
      engine.scoring.recordBumperHit();
      engine.scoring.recordBumperHit();
      const expectedHighScore = engine.scoring.score; // Capture from scoring system

      const ball = engine.physics.objects.get('ball-1');
      ball!.position.y = -6;
      engine.simulateFrame();
      engine.drainBall();

      expect(engine.scoring.highScore).toBe(expectedHighScore);
    });

    it('should allow game restart after game over', async () => {
      const ball = engine.physics.objects.get('ball-1');
      ball!.position.y = -6;
      engine.simulateFrame();
      engine.drainBall();

      // Restart
      engine.gameState.ballCount = 3;
      engine.gameState.gameOver = false;
      engine.startGame();

      expect(engine.gameState.gameStarted).toBe(true);
    });
  });

  describe('Resource Cleanup', () => {
    it('should dispose graphics', async () => {
      await engine.loadTable('demo-table');
      engine.dispose();

      expect(engine.graphics.initialized).toBe(false);
    });

    it('should stop physics on dispose', async () => {
      await engine.loadTable('demo-table');
      engine.startGame();
      engine.dispose();

      expect(engine.physics.running).toBe(false);
    });

    it('should handle dispose without cleanup errors', async () => {
      await engine.loadTable('demo-table');
      engine.startGame();

      expect(() => engine.dispose()).not.toThrow();
    });
  });

  describe('Complete Game Scenario', () => {
    it('should complete full game loop: load → launch → play → drain → gameover', async () => {
      // Load
      const loaded = await engine.loadTable('demo-table');
      expect(loaded).toBe(true);

      // Start
      engine.startGame();
      expect(engine.gameState.gameStarted).toBe(true);

      // Launch
      engine.launchBall();
      expect(engine.gameState.ballInPlay).toBe(true);

      // Simulate hits
      const ball = engine.physics.objects.get('ball-1');
      for (let i = 0; i < 5; i++) {
        ball!.position = { x: 0, y: 3.2 };
        engine.simulateFrame();
      }
      expect(engine.gameState.currentScore).toBeGreaterThan(0);

      // Drain
      ball!.position.y = -6;
      engine.simulateFrame();
      engine.drainBall();
      expect(engine.gameState.ballInPlay).toBe(false);

      // Game over (last ball)
      engine.gameState.ballCount = 1;
      engine.drainBall();
      expect(engine.gameState.gameOver).toBe(true);
    });
  });
});
