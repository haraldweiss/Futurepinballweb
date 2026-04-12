# Test Architecture Guide — Future Pinball Web

**Version**: 1.0 | **Status**: Complete | **Coverage**: 563 tests across 19 files

## Overview

This guide explains the test infrastructure, mock patterns, and best practices for adding tests to the Future Pinball Web project. The test suite uses **Vitest** as the test runner with comprehensive mock-based testing strategies.

## Table of Contents

1. [Quick Start](#quick-start)
2. [Test Framework & Setup](#test-framework--setup)
3. [Mock Patterns by Component](#mock-patterns-by-component)
4. [Assertion Best Practices](#assertion-best-practices)
5. [Test File Organization](#test-file-organization)
6. [Running Tests](#running-tests)
7. [Common Patterns](#common-patterns)
8. [Debugging Failed Tests](#debugging-failed-tests)
9. [Performance Testing](#performance-testing)
10. [Contributing New Tests](#contributing-new-tests)

---

## Quick Start

### Create a New Test File

```typescript
import { describe, it, expect, beforeEach } from 'vitest';

describe('Feature Name', () => {
  let component: ComponentType;

  beforeEach(() => {
    component = new ComponentType();
  });

  it('should do something', () => {
    const result = component.doSomething();
    expect(result).toBe(expectedValue);
  });
});
```

### Run Tests

```bash
# Run all tests
npm test

# Run specific test file
npm test -- physics.test.ts

# Run tests matching pattern
npm test -- --grep "should handle collision"

# Watch mode (re-run on changes)
npm test -- --watch
```

---

## Test Framework & Setup

### Vitest Configuration

The project uses **Vitest 4.1.4** configured in `vitest.config.ts`:

```typescript
// Key features:
- TypeScript support (5.4)
- Isolation: each test runs independently
- Globals: describe, it, expect available without imports
- Coverage: statement, line, function, branch coverage
```

### Test Structure

Every test file follows this pattern:

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

describe('ComponentName', () => {
  // Setup before each test
  beforeEach(() => {
    // Initialize mocks, create instances
  });

  // Cleanup after each test
  afterEach(() => {
    // Reset state, clear mocks
  });

  // Test groups
  describe('Feature Area', () => {
    it('should behavior A', () => {
      // Arrange
      const input = createInput();

      // Act
      const result = component.method(input);

      // Assert
      expect(result).toMatchExpectation();
    });
  });
});
```

---

## Mock Patterns by Component

### Physics System Mocking

```typescript
class MockPhysicsEngine {
  private bodies: Map<string, PhysicsBody> = new Map();
  private collisions: Collision[] = [];
  private frameCount: number = 0;

  addBody(id: string, config: BodyConfig): PhysicsBody {
    const body = {
      id,
      position: { x: config.x, y: config.y },
      velocity: { x: 0, y: 0 },
      mass: config.mass,
      isKinematic: config.isKinematic
    };
    this.bodies.set(id, body);
    return body;
  }

  step(deltaTime: number): void {
    // Simulate one frame
    this.frameCount++;
    // Update positions, detect collisions
    this.detectCollisions();
  }

  getCollisions(): Collision[] {
    return this.collisions;
  }

  private detectCollisions(): void {
    // Simple AABB collision detection
    const bodyArray = Array.from(this.bodies.values());
    for (let i = 0; i < bodyArray.length; i++) {
      for (let j = i + 1; j < bodyArray.length; j++) {
        if (this.checkCollision(bodyArray[i], bodyArray[j])) {
          this.collisions.push({
            body1: bodyArray[i].id,
            body2: bodyArray[j].id,
            timestamp: this.frameCount
          });
        }
      }
    }
  }
}
```

**Usage in Tests:**

```typescript
it('should detect bumper collision', () => {
  const physics = new MockPhysicsEngine();
  physics.addBody('ball', { x: 0, y: 0, mass: 1 });
  physics.addBody('bumper', { x: 0.5, y: 0 });

  physics.step(0.016);

  const collisions = physics.getCollisions();
  expect(collisions).toHaveLength(1);
  expect(collisions[0].body1).toBe('ball');
});
```

### Graphics System Mocking

```typescript
class MockGraphicsRenderer {
  private drawCalls: DrawCall[] = [];
  private lights: Light[] = [];

  render(): void {
    this.drawCalls = [];
    // Simulate rendering
    this.drawCalls.push({
      type: 'clear',
      color: { r: 0, g: 0, b: 0 }
    });
  }

  addLight(light: Light): void {
    this.lights.push(light);
  }

  getDrawCallCount(): number {
    return this.drawCalls.length;
  }

  getLightCount(): number {
    return this.lights.length;
  }
}
```

**Usage in Tests:**

```typescript
it('should render with 3 lights', () => {
  const graphics = new MockGraphicsRenderer();
  graphics.addLight({ type: 'point', position: { x: 0, y: 0, z: 5 } });
  graphics.addLight({ type: 'directional', direction: { x: 0, y: 1, z: 0 } });
  graphics.addLight({ type: 'spot', position: { x: 5, y: 5, z: 5 } });

  graphics.render();

  expect(graphics.getLightCount()).toBe(3);
  expect(graphics.getDrawCallCount()).toBeGreaterThan(0);
});
```

### Audio System Mocking

```typescript
class MockAudioSystem {
  private soundQueue: string[] = [];
  private isPlayingSound: boolean = false;

  playSound(soundName: string): void {
    this.soundQueue.push(soundName);
    this.isPlayingSound = true;
  }

  getSoundCount(): number {
    return this.soundQueue.length;
  }

  stopAllSounds(): void {
    this.soundQueue = [];
    this.isPlayingSound = false;
  }
}
```

### VBScript Environment Mocking

```typescript
class MockVBScriptEnvironment {
  private variables: Map<string, any> = new Map();
  private errors: string[] = [];

  setVariable(name: string, value: any): void {
    this.variables.set(name, value);
  }

  getVariable(name: string): any {
    if (!this.variables.has(name)) {
      this.errors.push(`Undefined variable: ${name}`);
      return undefined;
    }
    return this.variables.get(name);
  }

  callFunction(funcName: string, ...args: any[]): any {
    switch (funcName) {
      case 'Len':
        return String(args[0]).length;
      case 'UCase':
        return String(args[0]).toUpperCase();
      case 'LCase':
        return String(args[0]).toLowerCase();
      default:
        this.errors.push(`Unknown function: ${funcName}`);
        return undefined;
    }
  }

  getErrors(): string[] {
    return this.errors;
  }
}
```

---

## Assertion Best Practices

### Numeric Assertions

**For floating-point values, use `toBeCloseTo()`:**

```typescript
// ❌ BAD: Exact equality fails due to floating-point precision
expect(0.1 + 0.2).toBe(0.3);  // Fails: 0.30000000000000004

// ✅ GOOD: Allows small precision differences
expect(0.1 + 0.2).toBeCloseTo(0.3, 5);  // Passes
expect(fps).toBeCloseTo(60, 1);  // Passes if within ±0.1
```

### Array & Object Assertions

```typescript
// Check array length
expect(array).toHaveLength(5);

// Check array contents
expect(array).toContain('value');
expect(array).toEqual([1, 2, 3]);

// Check object properties
expect(obj).toHaveProperty('name');
expect(obj).toEqual({ name: 'John', age: 30 });

// Check object structure partially
expect(obj).toMatchObject({ name: 'John' });
```

### String Assertions

```typescript
// Exact match
expect(text).toBe('exact string');

// Pattern matching
expect(text).toMatch(/pattern/);
expect(text).toContain('substring');

// Case-insensitive matching
expect(text.toLowerCase()).toContain('substring');
```

### Boolean & Existence Assertions

```typescript
// Check truthiness
expect(value).toBeTruthy();
expect(value).toBeFalsy();

// Check existence
expect(value).toBeDefined();
expect(value).not.toBeUndefined();
expect(value).not.toBeNull();

// Check type
expect(typeof value).toBe('number');
expect(Array.isArray(value)).toBe(true);
```

### Comparison Assertions

```typescript
// Numeric comparisons
expect(value).toBeGreaterThan(50);
expect(value).toBeLessThanOrEqual(100);
expect(value).toBeGreaterThanOrEqual(0);

// Range assertions (custom helper)
function expectInRange(value: number, min: number, max: number) {
  expect(value).toBeGreaterThanOrEqual(min);
  expect(value).toBeLessThanOrEqual(max);
}
expectInRange(fps, 45, 60);
```

---

## Test File Organization

### Recommended Structure

```
src/__tests__/
├── physics.test.ts              (41 tests) - Collision, gravity, friction
├── scoring.test.ts              (11 tests) - Score calculation, multipliers
├── vbscript-functions.test.ts   (37 tests) - Core VBScript API
├── vbscript-extended.test.ts    (57 tests) - Extended VBScript functions
├── animation.test.ts            (30 tests) - BAM engine, keyframes
├── graphics.test.ts             (19 tests) - Renderer, quality presets
├── physics-worker.test.ts       (14 tests) - Worker lifecycle, sync
├── game-loop.test.ts            (20 tests) - E2E game flow
├── table-compatibility.test.ts  (15 tests) - Multi-table loading
├── input-integration.test.ts    (29 tests) - Keyboard/touch input
├── memory-profile.test.ts       (22 tests) - Memory leaks, 24/7 ops
├── mobile-compatibility.test.ts (36 tests) - Device profiles
├── stress-physics.test.ts       (19 tests) - High-load physics
├── stress-graphics.test.ts      (27 tests) - High-load graphics
├── vbscript-complete.test.ts    (50 tests) - VBScript coverage
├── browser-compatibility.test.ts(35 tests) - API fallbacks
├── vbscript-errors.test.ts      (43 tests) - Error handling
├── animation-advanced.test.ts   (15 tests) - Multi-object animation
└── animation-events.test.ts     (17 tests) - Event binding
```

### File Naming Convention

- Test files: `feature.test.ts` (not `feature-test.ts` or `test-feature.ts`)
- One test file per feature area
- Co-locate tests with source code logically

### Test Organization Within Files

```typescript
describe('ComponentName', () => {
  describe('Feature Area 1', () => {
    // Related tests for feature 1
    it('should...', () => {});
  });

  describe('Feature Area 2', () => {
    // Related tests for feature 2
    it('should...', () => {});
  });
});
```

---

## Running Tests

### Basic Commands

```bash
# Run all tests once
npm test

# Run in watch mode (re-runs on file changes)
npm test -- --watch

# Run specific test file
npm test -- physics.test.ts

# Run tests matching pattern
npm test -- --grep "should detect collision"

# Run with coverage report
npm test -- --coverage
```

### Watch Mode Workflow

```bash
# Terminal 1: Start watch mode
npm test -- --watch

# Terminal 2: Edit code and save
# Tests automatically re-run

# In watch mode, you can press:
# - 'p' to filter by filename
# - 't' to filter by test name
# - 'q' to quit
```

---

## Common Patterns

### Testing State Changes

```typescript
it('should update score when bumper hit', () => {
  const game = new GameEngine();

  // Initial state
  expect(game.score).toBe(0);

  // Action
  game.hitBumper('bumper-1');

  // State change
  expect(game.score).toBeGreaterThan(0);
});
```

### Testing Error Handling

```typescript
it('should throw error on invalid input', () => {
  const component = new Component();

  expect(() => {
    component.invalidMethod(null);
  }).toThrow('Error message');

  // Or check specific error properties
  expect(() => {
    component.invalidMethod(null);
  }).toThrow(TypeError);
});
```

### Testing Asynchronous Operations

```typescript
// With async/await
it('should load table asynchronously', async () => {
  const loader = new TableLoader();
  const table = await loader.loadTable('test.fpt');

  expect(table).toBeDefined();
  expect(table.name).toBe('test');
});

// With Promise.then()
it('should handle promise resolution', () => {
  const promise = component.asyncMethod();

  return promise.then(result => {
    expect(result).toBe(expectedValue);
  });
});
```

### Testing Collections

```typescript
it('should manage animation queue', () => {
  const engine = new AnimationEngine();

  engine.queueAnimation('anim-1');
  engine.queueAnimation('anim-2');
  engine.queueAnimation('anim-3');

  expect(engine.getQueueSize()).toBe(3);

  // Test filtering
  const playing = engine.getPlayingAnimations();
  expect(playing).toHaveLength(1);

  // Test removal
  engine.stopAnimation('anim-1');
  expect(engine.getQueueSize()).toBe(2);
});
```

### Testing Multiple Objects

```typescript
it('should handle 10 simultaneous bumpers', () => {
  const physics = new PhysicsEngine();

  // Create 10 bumpers
  for (let i = 0; i < 10; i++) {
    physics.addBody(`bumper-${i}`, {
      x: Math.random() * 10,
      y: Math.random() * 10
    });
  }

  physics.step(0.016);

  const bodies = physics.getBodies();
  expect(bodies.size).toBe(10);

  // Verify all bodies exist
  for (let i = 0; i < 10; i++) {
    expect(bodies.has(`bumper-${i}`)).toBe(true);
  }
});
```

---

## Debugging Failed Tests

### Understanding Error Messages

```
AssertionError: expected 5 to equal 10

- Expected
+ Received

- 10
+ 5
```

**How to read**: Expected value 10, but got 5.

### Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| Float precision errors | Use `toBeCloseTo()` instead of `toBe()` |
| Async timing issues | Use `async/await` or return Promise |
| Mock not resetting | Add `reset()` call in `beforeEach()` |
| Test isolation failures | Check for shared state between tests |
| Null/undefined errors | Add null checks in mock implementations |

### Debugging Techniques

```typescript
// 1. Log intermediate values
it('should calculate score', () => {
  const result = calculator.compute(10);
  console.log('Result:', result);  // Check console output
  expect(result).toBe(expectedValue);
});

// 2. Use conditional assertions
it('should process array', () => {
  const result = processor.handle([1, 2, 3]);

  if (!result) {
    console.log('Result is falsy!');
  }

  expect(result).toBeDefined();
  expect(result).toHaveLength(3);
});

// 3. Break into smaller tests
// Instead of testing multiple behaviors in one test,
// create separate tests for each behavior
```

### Running Single Test for Debugging

```typescript
// Add .only to run just this test
it.only('should...', () => {
  // This test runs
});

// All other tests are skipped
// Remove .only before committing
```

---

## Performance Testing

### FPS & Frame Time

```typescript
it('should maintain 60 FPS', () => {
  const engine = new GameEngine();
  const frameTime = 0.016; // 60 FPS = 16.67ms per frame

  engine.update(frameTime);

  const metrics = engine.getMetrics();
  expect(metrics.fps).toBeGreaterThanOrEqual(55);  // Allow 5% variance
});
```

### Memory Usage

```typescript
it('should not leak memory', () => {
  const profiler = new MemoryProfiler();
  const baseline = profiler.captureHeap();

  // Simulate 1000 frames
  for (let i = 0; i < 1000; i++) {
    engine.step(0.016);
  }

  const final = profiler.captureHeap();
  const growth = (final.heapUsed - baseline.heapUsed) / baseline.heapUsed;

  expect(growth).toBeLessThan(0.1);  // Less than 10% growth
});
```

### Stress Testing

```typescript
it('should handle 100 particles', () => {
  const graphics = new GraphicsEngine();

  // Add 100 particles
  for (let i = 0; i < 100; i++) {
    graphics.addParticle({ x: 0, y: 0, z: 0 });
  }

  // Measure performance
  const start = performance.now();
  graphics.render();
  const elapsed = performance.now() - start;

  expect(elapsed).toBeLessThan(16.67);  // Less than 16.67ms (60 FPS)
});
```

---

## Contributing New Tests

### Checklist Before Committing

- [ ] All new tests pass (`npm test`)
- [ ] No existing tests are broken
- [ ] Test file is organized with `describe()` blocks
- [ ] Tests use descriptive names (not "test1", "test2")
- [ ] Mocks are properly reset in `beforeEach()`
- [ ] Floating-point assertions use `toBeCloseTo()`
- [ ] No console.log() or debug code left
- [ ] No `.only` or `.skip` modifiers
- [ ] Test file follows naming convention: `feature.test.ts`

### Pull Request Template

```markdown
## Test Addition: [Feature Name]

### What tests were added?
- [test 1 description]
- [test 2 description]

### Why are these tests needed?
[Explain coverage gap or new feature]

### Test Coverage
- Total new tests: [number]
- Files modified: [list]

### Verification
- [ ] All 563+ tests pass
- [ ] No existing tests broken
- [ ] New tests follow project patterns
```

### Example: Adding Tests for New Feature

```typescript
// New feature: Ball velocity tracking

describe('Ball Velocity Tracking', () => {
  let physics: MockPhysicsEngine;
  let ball: PhysicsBody;

  beforeEach(() => {
    physics = new MockPhysicsEngine();
    ball = physics.addBody('ball', { x: 0, y: 0, mass: 1 });
  });

  it('should track initial velocity as zero', () => {
    expect(ball.velocity.x).toBe(0);
    expect(ball.velocity.y).toBe(0);
  });

  it('should update velocity after force applied', () => {
    physics.applyForce('ball', { x: 10, y: 0 });
    physics.step(0.016);

    expect(ball.velocity.x).toBeGreaterThan(0);
  });

  it('should apply friction and slow down', () => {
    physics.applyForce('ball', { x: 10, y: 0 });
    physics.step(0.016);
    const velocityAfterForce = ball.velocity.x;

    // Multiple steps without force
    for (let i = 0; i < 10; i++) {
      physics.step(0.016);
    }

    expect(ball.velocity.x).toBeLessThan(velocityAfterForce);
  });
});
```

---

## Best Practices Summary

### DO ✅

- ✅ Use descriptive test names
- ✅ Follow Arrange-Act-Assert pattern
- ✅ Keep tests isolated and independent
- ✅ Reset mocks between tests
- ✅ Use `toBeCloseTo()` for floats
- ✅ Test one thing per test
- ✅ Group related tests with `describe()`
- ✅ Name mocks clearly (MockPhysicsEngine, etc.)

### DON'T ❌

- ❌ Test implementation details, test behavior
- ❌ Create dependencies between tests
- ❌ Use vague test names ("test1", "works")
- ❌ Leave `console.log()` in code
- ❌ Use exact equality for floats (`toBe()`)
- ❌ Test too many behaviors in one test
- ❌ Share state between tests
- ❌ Commit code with `.only` or `.skip`

---

## Quick Reference

```bash
# Run all tests
npm test

# Run specific file
npm test -- physics.test.ts

# Run matching pattern
npm test -- --grep "collision"

# Watch mode
npm test -- --watch

# With coverage
npm test -- --coverage
```

```typescript
// Common assertions
expect(value).toBe(5);
expect(value).toBeCloseTo(5, 1);
expect(value).toEqual([1, 2, 3]);
expect(value).toBeDefined();
expect(value).toThrow();
expect(array).toHaveLength(3);
expect(text).toContain('substring');
expect(value).toBeGreaterThan(10);
```

---

## Resources

- **Vitest Documentation**: https://vitest.dev/
- **Project Test Files**: `src/__tests__/`
- **Test Configuration**: `vitest.config.ts`
- **Package Configuration**: `package.json` (test scripts)

---

**Document Version**: 1.0 | **Last Updated**: 2026-04-12 | **Status**: Complete
