/**
 * Browser API Compatibility Testing — Graceful Degradation
 *
 * Tests fallback behavior for missing/limited APIs in older browsers
 * WebGL1 fallback, physics on main thread, limited audio synthesis
 * Ensures playable experience on legacy hardware & kiosks
 *
 * Run with: npm test
 */

import { describe, it, expect, beforeEach } from 'vitest';

/**
 * Browser capability detector
 */
interface BrowserCapabilities {
  hasWebGL2: boolean;
  hasWebWorkers: boolean;
  hasWebAudio: boolean;
  hasOffscreenCanvas: boolean;
  webGLVersion: 1 | 2;
  maxTextureSize: number;
  maxRenderBufferSize: number;
  audioContextSampleRate: number;
}

/**
 * Graphics renderer with fallback support
 */
class GraphicsRenderer {
  capabilities: BrowserCapabilities;
  renderMode: 'webgl2' | 'webgl1' | 'canvas2d';
  textureCache: Map<string, any> = new Map();
  drawCallCount = 0;

  constructor(capabilities: BrowserCapabilities) {
    this.capabilities = capabilities;
    this.selectRenderMode();
  }

  private selectRenderMode(): void {
    if (this.capabilities.hasWebGL2) {
      this.renderMode = 'webgl2';
    } else if (this.capabilities.webGLVersion >= 1) {
      this.renderMode = 'webgl1';
    } else {
      this.renderMode = 'canvas2d';
    }
  }

  render(): boolean {
    try {
      switch (this.renderMode) {
        case 'webgl2':
          return this.renderWebGL2();
        case 'webgl1':
          return this.renderWebGL1();
        case 'canvas2d':
          return this.renderCanvas2D();
      }
    } catch (e) {
      return false;
    }
  }

  private renderWebGL2(): boolean {
    this.drawCallCount++;
    return true;
  }

  private renderWebGL1(): boolean {
    // Fallback: fewer features, limited shader support
    this.drawCallCount++;
    return true;
  }

  private renderCanvas2D(): boolean {
    // Fallback: 2D canvas rendering, very limited
    this.drawCallCount++;
    return true;
  }

  getRenderMode(): string {
    return this.renderMode;
  }

  supportsAdvancedFeatures(): boolean {
    return this.renderMode === 'webgl2';
  }

  supportsBasicRendering(): boolean {
    return this.renderMode !== 'canvas2d';
  }

  getDrawCallCount(): number {
    return this.drawCallCount;
  }

  reset(): void {
    this.drawCallCount = 0;
    this.textureCache.clear();
  }
}

/**
 * Physics engine with worker/main-thread support
 */
class PhysicsEngine {
  capabilities: BrowserCapabilities;
  useWorker: boolean;
  frameCount = 0;
  simulationTime = 0;

  constructor(capabilities: BrowserCapabilities) {
    this.capabilities = capabilities;
    this.useWorker = capabilities.hasWebWorkers;
  }

  step(deltaTime: number = 0.016): void {
    this.frameCount++;
    this.simulationTime += deltaTime;

    if (this.useWorker) {
      this.stepWithWorker(deltaTime);
    } else {
      this.stepOnMainThread(deltaTime);
    }
  }

  private stepWithWorker(deltaTime: number): void {
    // In production, this would post to worker
    // Simulating worker response
  }

  private stepOnMainThread(deltaTime: number): void {
    // Direct physics calculation on main thread
    // Less efficient but works everywhere
  }

  isUsingWorker(): boolean {
    return this.useWorker && this.capabilities.hasWebWorkers;
  }

  getFrameCount(): number {
    return this.frameCount;
  }

  getSimulationTime(): number {
    return this.simulationTime;
  }

  reset(): void {
    this.frameCount = 0;
    this.simulationTime = 0;
  }
}

/**
 * Audio system with fallback support
 */
class AudioSystem {
  capabilities: BrowserCapabilities;
  sampleRate: number;
  oscillatorCount = 0;
  gainNodeCount = 0;
  soundsPlayed: string[] = [];
  useSimpleSynthesis: boolean;

  constructor(capabilities: BrowserCapabilities) {
    this.capabilities = capabilities;
    this.sampleRate = capabilities.audioContextSampleRate;
    this.useSimpleSynthesis = !capabilities.hasWebAudio;
  }

  playSound(soundName: string): boolean {
    try {
      if (this.useSimpleSynthesis) {
        return this.playWithSimpleSynthesis(soundName);
      } else {
        return this.playWithWebAudio(soundName);
      }
    } catch (e) {
      return false;
    }
  }

  private playWithWebAudio(soundName: string): boolean {
    this.oscillatorCount++;
    this.gainNodeCount++;
    this.soundsPlayed.push(soundName);
    return true;
  }

  private playWithSimpleSynthesis(soundName: string): boolean {
    // Fallback: very basic beep synthesis
    this.soundsPlayed.push(`${soundName}_simple`);
    return true;
  }

  createOscillator(): boolean {
    if (!this.capabilities.hasWebAudio) {
      return false;
    }
    this.oscillatorCount++;
    return true;
  }

  getSoundCount(): number {
    return this.soundsPlayed.length;
  }

  isUsingSimpleSynthesis(): boolean {
    return this.useSimpleSynthesis;
  }

  reset(): void {
    this.soundsPlayed = [];
    this.oscillatorCount = 0;
    this.gainNodeCount = 0;
  }
}

/**
 * Helper to create browser capability profiles
 */
function createBrowserProfile(
  hasWebGL2: boolean,
  hasWebWorkers: boolean,
  hasWebAudio: boolean,
  hasOffscreenCanvas: boolean = false
): BrowserCapabilities {
  return {
    hasWebGL2,
    hasWebWorkers,
    hasWebAudio,
    hasOffscreenCanvas,
    webGLVersion: hasWebGL2 ? 2 : 1,
    maxTextureSize: hasWebGL2 ? 16384 : 4096,
    maxRenderBufferSize: hasWebGL2 ? 16384 : 4096,
    audioContextSampleRate: hasWebAudio ? 48000 : 8000,
  };
}

// ───────────────────────────────────────────────────────────────────────────

describe('Browser API Compatibility & Graceful Degradation', () => {
  describe('Modern Browser (Chrome, Firefox, Safari current)', () => {
    let graphics: GraphicsRenderer;
    let physics: PhysicsEngine;
    let audio: AudioSystem;

    beforeEach(() => {
      const modern = createBrowserProfile(true, true, true, true);
      graphics = new GraphicsRenderer(modern);
      physics = new PhysicsEngine(modern);
      audio = new AudioSystem(modern);
    });

    it('should use WebGL2 rendering', () => {
      expect(graphics.getRenderMode()).toBe('webgl2');
      expect(graphics.supportsAdvancedFeatures()).toBe(true);
    });

    it('should use WebWorkers for physics', () => {
      expect(physics.isUsingWorker()).toBe(true);
    });

    it('should use Web Audio API', () => {
      expect(audio.isUsingSimpleSynthesis()).toBe(false);
      expect(audio.createOscillator()).toBe(true);
    });

    it('should render and simulate efficiently', () => {
      graphics.render();
      expect(graphics.getDrawCallCount()).toBe(1);

      physics.step(0.016);
      expect(physics.getFrameCount()).toBe(1);

      audio.playSound('test');
      expect(audio.getSoundCount()).toBe(1);
    });
  });

  describe('Older Browser with WebGL1 (IE 11, older Safari)', () => {
    let graphics: GraphicsRenderer;
    let physics: PhysicsEngine;
    let audio: AudioSystem;

    beforeEach(() => {
      const webgl1 = createBrowserProfile(false, true, true, false);
      graphics = new GraphicsRenderer(webgl1);
      physics = new PhysicsEngine(webgl1);
      audio = new AudioSystem(webgl1);
    });

    it('should fallback to WebGL1 rendering', () => {
      expect(graphics.getRenderMode()).toBe('webgl1');
      expect(graphics.supportsAdvancedFeatures()).toBe(false);
      expect(graphics.supportsBasicRendering()).toBe(true);
    });

    it('should render with WebGL1 limitations', () => {
      graphics.render();
      expect(graphics.getDrawCallCount()).toBe(1);
      expect(graphics.getRenderMode()).toBe('webgl1');
    });

    it('should still use WebWorkers if available', () => {
      expect(physics.isUsingWorker()).toBe(true);
      physics.step(0.016);
      expect(physics.getFrameCount()).toBe(1);
    });

    it('should use Web Audio despite WebGL1 limitation', () => {
      expect(audio.isUsingSimpleSynthesis()).toBe(false);
      audio.playSound('test');
      expect(audio.getSoundCount()).toBe(1);
    });
  });

  describe('Very Old Browser without WebWorkers (Old Android, IE)', () => {
    let graphics: GraphicsRenderer;
    let physics: PhysicsEngine;
    let audio: AudioSystem;

    beforeEach(() => {
      const noWorkers = createBrowserProfile(false, false, true, false);
      graphics = new GraphicsRenderer(noWorkers);
      physics = new PhysicsEngine(noWorkers);
      audio = new AudioSystem(noWorkers);
    });

    it('should fallback to main-thread physics', () => {
      expect(physics.isUsingWorker()).toBe(false);
    });

    it('should simulate physics on main thread', () => {
      for (let i = 0; i < 100; i++) {
        physics.step(0.016);
      }
      expect(physics.getFrameCount()).toBe(100);
      expect(physics.getSimulationTime()).toBeCloseTo(1.6, 1);
    });

    it('should still render with WebGL1', () => {
      expect(graphics.getRenderMode()).toBe('webgl1');
      graphics.render();
      expect(graphics.getDrawCallCount()).toBeGreaterThan(0);
    });

    it('should still play audio', () => {
      expect(audio.isUsingSimpleSynthesis()).toBe(false);
      audio.playSound('test');
      expect(audio.getSoundCount()).toBe(1);
    });
  });

  describe('Minimal Browser without Web Audio (Old tablets, Kiosks)', () => {
    let graphics: GraphicsRenderer;
    let physics: PhysicsEngine;
    let audio: AudioSystem;

    beforeEach(() => {
      const minimal = createBrowserProfile(false, false, false, false);
      graphics = new GraphicsRenderer(minimal);
      physics = new PhysicsEngine(minimal);
      audio = new AudioSystem(minimal);
    });

    it('should fallback to simple audio synthesis', () => {
      expect(audio.isUsingSimpleSynthesis()).toBe(true);
    });

    it('should still play sounds via simple synthesis', () => {
      audio.playSound('beep');
      expect(audio.getSoundCount()).toBe(1);
      expect(audio.soundsPlayed[0]).toContain('simple');
    });

    it('should handle multiple sounds', () => {
      audio.playSound('sound1');
      audio.playSound('sound2');
      audio.playSound('sound3');
      expect(audio.getSoundCount()).toBe(3);
    });

    it('should not create Web Audio nodes', () => {
      const result = audio.createOscillator();
      expect(result).toBe(false);
    });

    it('should still run physics', () => {
      physics.step(0.016);
      expect(physics.getFrameCount()).toBe(1);
    });

    it('should still render', () => {
      graphics.render();
      expect(graphics.getDrawCallCount()).toBeGreaterThan(0);
    });
  });

  describe('Canvas2D Fallback (No WebGL at all)', () => {
    let graphics: GraphicsRenderer;

    beforeEach(() => {
      // Simulate browser with no WebGL support at all
      const noWebGL: BrowserCapabilities = {
        hasWebGL2: false,
        hasWebWorkers: true,
        hasWebAudio: true,
        hasOffscreenCanvas: false,
        webGLVersion: 1, // But returns null when trying to create context
        maxTextureSize: 2048,
        maxRenderBufferSize: 2048,
        audioContextSampleRate: 48000,
      };
      // Force canvas2d fallback
      graphics = new GraphicsRenderer(noWebGL);
      graphics.renderMode = 'canvas2d'; // Simulate WebGL init failure
    });

    it('should fallback to 2D Canvas rendering', () => {
      expect(graphics.getRenderMode()).toBe('canvas2d');
      expect(graphics.supportsAdvancedFeatures()).toBe(false);
      expect(graphics.supportsBasicRendering()).toBe(false);
    });

    it('should still render with Canvas2D', () => {
      const result = graphics.render();
      expect(result).toBe(true);
      expect(graphics.getDrawCallCount()).toBe(1);
    });

    it('should handle multiple frames', () => {
      for (let i = 0; i < 60; i++) {
        graphics.render();
      }
      expect(graphics.getDrawCallCount()).toBe(60);
    });
  });

  describe('Performance Under Constraints', () => {
    it('should handle 60 frames at 16ms intervals on minimal browser', () => {
      const minimal = createBrowserProfile(false, false, false, false);
      const physics = new PhysicsEngine(minimal);

      const startTime = Date.now();
      for (let i = 0; i < 60; i++) {
        physics.step(0.016);
      }
      const elapsed = Date.now() - startTime;

      expect(physics.getFrameCount()).toBe(60);
      expect(physics.getSimulationTime()).toBeCloseTo(0.96, 1);
    });

    it('should handle high-frequency audio on minimal browser', () => {
      const minimal = createBrowserProfile(false, false, false, false);
      const audio = new AudioSystem(minimal);

      for (let i = 0; i < 100; i++) {
        audio.playSound(`sound-${i}`);
      }

      expect(audio.getSoundCount()).toBe(100);
    });

    it('should render frequently with Canvas2D', () => {
      const minimal = createBrowserProfile(false, false, false, false);
      const graphics = new GraphicsRenderer(minimal);
      graphics.renderMode = 'canvas2d';

      for (let i = 0; i < 120; i++) {
        graphics.render();
      }

      expect(graphics.getDrawCallCount()).toBe(120);
    });
  });

  describe('Mixed Feature Support', () => {
    it('should handle WebGL2 + no WebWorkers combo', () => {
      const combo1 = createBrowserProfile(true, false, true, false);
      const graphics = new GraphicsRenderer(combo1);
      const physics = new PhysicsEngine(combo1);

      expect(graphics.getRenderMode()).toBe('webgl2');
      expect(physics.isUsingWorker()).toBe(false);
    });

    it('should handle WebGL1 + WebWorkers + no Web Audio', () => {
      const combo2 = createBrowserProfile(false, true, false, false);
      const graphics = new GraphicsRenderer(combo2);
      const physics = new PhysicsEngine(combo2);
      const audio = new AudioSystem(combo2);

      expect(graphics.getRenderMode()).toBe('webgl1');
      expect(physics.isUsingWorker()).toBe(true);
      expect(audio.isUsingSimpleSynthesis()).toBe(true);
    });

    it('should handle all fallbacks simultaneously', () => {
      const minimal = createBrowserProfile(false, false, false, false);
      const graphics = new GraphicsRenderer(minimal);
      const physics = new PhysicsEngine(minimal);
      const audio = new AudioSystem(minimal);

      graphics.renderMode = 'canvas2d'; // Force canvas fallback

      // Run for 100 frames
      for (let i = 0; i < 100; i++) {
        graphics.render();
        physics.step(0.016);
        if (i % 10 === 0) {
          audio.playSound(`frame-${i}`);
        }
      }

      expect(graphics.getDrawCallCount()).toBe(100);
      expect(physics.getFrameCount()).toBe(100);
      expect(audio.getSoundCount()).toBe(10); // 100/10
    });
  });

  describe('Graceful Degradation Scenarios', () => {
    it('should be playable even with all APIs missing', () => {
      const bareMinimum = createBrowserProfile(false, false, false, false);
      const graphics = new GraphicsRenderer(bareMinimum);
      const physics = new PhysicsEngine(bareMinimum);
      const audio = new AudioSystem(bareMinimum);
      graphics.renderMode = 'canvas2d';

      let isPlayable = true;
      try {
        for (let i = 0; i < 30; i++) {
          isPlayable = graphics.render() && isPlayable;
          physics.step(0.016);
          if (i % 5 === 0) {
            audio.playSound('event');
          }
        }
      } catch (e) {
        isPlayable = false;
      }

      expect(isPlayable).toBe(true);
      expect(graphics.getDrawCallCount()).toBe(30);
      expect(physics.getFrameCount()).toBe(30);
      expect(audio.getSoundCount()).toBeGreaterThan(0);
    });

    it('should detect capability degradation path', () => {
      const profiles = [
        createBrowserProfile(true, true, true, true),   // Modern
        createBrowserProfile(false, true, true, false),  // WebGL1
        createBrowserProfile(false, false, true, false), // No workers
        createBrowserProfile(false, false, false, false) // Minimal
      ];

      const graphics = profiles.map(p => new GraphicsRenderer(p));
      const physics = profiles.map(p => new PhysicsEngine(p));
      const audio = profiles.map(p => new AudioSystem(p));

      expect(graphics[0].getRenderMode()).toBe('webgl2');
      expect(graphics[1].getRenderMode()).toBe('webgl1');
      expect(graphics[2].getRenderMode()).toBe('webgl1');
      expect(graphics[3].getRenderMode()).toBe('webgl1'); // Default before canvas2d

      expect(physics[0].isUsingWorker()).toBe(true);
      expect(physics[1].isUsingWorker()).toBe(true);
      expect(physics[2].isUsingWorker()).toBe(false);
      expect(physics[3].isUsingWorker()).toBe(false);

      expect(audio[0].isUsingSimpleSynthesis()).toBe(false);
      expect(audio[1].isUsingSimpleSynthesis()).toBe(false);
      expect(audio[2].isUsingSimpleSynthesis()).toBe(false);
      expect(audio[3].isUsingSimpleSynthesis()).toBe(true);
    });
  });

  describe('API Feature Detection', () => {
    it('should accurately report WebGL capabilities', () => {
      const webgl2 = createBrowserProfile(true, true, true, true);
      const webgl1 = createBrowserProfile(false, true, true, false);

      expect(webgl2.webGLVersion).toBe(2);
      expect(webgl1.webGLVersion).toBe(1);

      expect(webgl2.maxTextureSize).toBe(16384);
      expect(webgl1.maxTextureSize).toBe(4096);
    });

    it('should accurately report audio capabilities', () => {
      const modern = createBrowserProfile(true, true, true, true);
      const minimal = createBrowserProfile(false, false, false, false);

      expect(modern.audioContextSampleRate).toBe(48000);
      expect(minimal.audioContextSampleRate).toBe(8000);
    });

    it('should accurately report worker support', () => {
      const withWorkers = createBrowserProfile(true, true, true, true);
      const noWorkers = createBrowserProfile(true, false, true, false);

      expect(withWorkers.hasWebWorkers).toBe(true);
      expect(noWorkers.hasWebWorkers).toBe(false);
    });
  });

  describe('Cleanup & State Management', () => {
    it('should reset graphics state', () => {
      const modern = createBrowserProfile(true, true, true, true);
      const graphics = new GraphicsRenderer(modern);

      graphics.render();
      graphics.render();
      expect(graphics.getDrawCallCount()).toBe(2);

      graphics.reset();
      expect(graphics.getDrawCallCount()).toBe(0);
    });

    it('should reset physics state', () => {
      const modern = createBrowserProfile(true, true, true, true);
      const physics = new PhysicsEngine(modern);

      physics.step(0.016);
      physics.step(0.016);
      expect(physics.getFrameCount()).toBe(2);

      physics.reset();
      expect(physics.getFrameCount()).toBe(0);
      expect(physics.getSimulationTime()).toBe(0);
    });

    it('should reset audio state', () => {
      const modern = createBrowserProfile(true, true, true, true);
      const audio = new AudioSystem(modern);

      audio.playSound('sound1');
      audio.playSound('sound2');
      expect(audio.getSoundCount()).toBe(2);

      audio.reset();
      expect(audio.getSoundCount()).toBe(0);
    });
  });
});
