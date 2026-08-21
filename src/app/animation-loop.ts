// SPDX-License-Identifier: AGPL-3.0-or-later
// © 2026 Harald Weiss

/**
 * Animation Loop — extracted from main.ts
 *
 * Factory pattern with DI for the full game-loop (physics step, render pipeline,
 * DMD state machine, post-processing, performance dashboard).
 *
 * main.ts creates the deps object once all systems are initialized and passes
 * it to createAnimationLoop(); the returned function is handed to
 * initializeBAMEngine({ ..., animate }) which starts the requestAnimationFrame loop.
 */

import * as THREE from 'three';
import { devLog } from '../utils/dev-log';
import { ParticleField } from './particle-field';

/**
 * Dependencies for the animation loop. Extends the previous in-file closure:
 * every module-level variable / getter the loop touched is now injected.
 */
export interface AnimationLoopDeps {
  // Three.js core
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  clock: THREE.Clock;

  // Game state & physics
  state: any;
  physics: any;
  bamEngine: any;
  leftFlipperColliderHandle: number;
  rightFlipperColliderHandle: number;

  // Input & controls
  gameControls: any;
  particleField: ParticleField;
  ball: THREE.Mesh;

  // Post-processing pipeline
  motionBlurPass: any;
  cascadedShadowMapper: any;
  particleSystem: any;
  filmEffectsPass: any;
  dofPass: any;

  // Systems
  advancedLightingSystem: any;
  scoreDisplayManager: any;
  visualPolishSystem: any;

  // DMD
  dmdState: any;
  dmdUpdate: () => void;

  // UI
  inlineBackglass: any;

  // Config & tables
  currentTableConfig: any;
  TABLE_CONFIGS: any;

  // Module-level getter functions
  getInputOptimizer: () => any;
  getPhysicsWorker: () => any;
  getAnimationBindingManager: () => any;
  getAnimationScheduler: () => any;
  getBamBridge: () => any;
  getGraphicsPipeline: () => any;
  getPerformanceDashboard: () => any;
  getBallTrailManager: () => any;
  getScoreAnimationManager: () => any;
  getTopScores: () => any[];
  isCoinScreenVisible: () => boolean;

  // Module-level objects
  profiler: any;
  showProfilerRef: { current: boolean };
  applyQualityPreset: () => void;
  applyTableShake: () => void;
  cb: any;
  backglassRenderer: any;

  // Functions defined in main.ts
  scoreBumperHit: (data: any) => void;
  scoreTargetHit: (data: any) => void;
  scoreSlingshotHit: (side: any) => void;
  checkRolloverLanes: () => void;
  updateSpinnerPhysics: () => void;
  resetBall: () => void;
  dmdEvent: (text: string) => void;
  showNotification: (msg: string) => void;
  playSound: (type: string) => void;
  updateHUD: () => void;
  callScriptDrain: () => void;
  recordScore: (score: number) => number;
  emitSyncFrame: (data: any) => void;

  // Mutable module-level values (read fresh each frame)
  getLastLeftFlipperPower: () => number;
  getLastRightFlipperPower: () => number;
}

/**
 * Creates the animation loop function.
 *
 * @returns A `() => void` closure that should be scheduled via
 *          requestAnimationFrame on every tick (initializeBAMEngine does this).
 */
export function createAnimationLoop(deps: AnimationLoopDeps): () => void {
  // Validate required dependencies at construction time.
  const missing: string[] = [];
  (Object.keys(deps) as (keyof AnimationLoopDeps)[]).forEach((key) => {
    if (deps[key] === undefined || deps[key] === null) missing.push(key);
  });
  if (missing.length > 0) {
    devLog(`❌ Animation loop missing deps: ${missing.join(', ')}`);
    throw new Error(`Animation loop missing required dependencies: ${missing.join(', ')}`);
  }

  let animateCallCount = 0;
  let pixelRatioTarget = Math.min(devicePixelRatio, 2);
  let lastFpsUpdate = performance.now();
  let frameCount = 0;
  let currentFps = 60;

  return function animateLoop(): void {
    animateCallCount++;

    if (import.meta.env.DEV && (animateCallCount === 1 || animateCallCount % 300 === 0)) {
      devLog(`🎬 Animate loop running... (call #${animateCallCount})`);
    }

    requestAnimationFrame(animateLoop);

    const dt = Math.min(deps.clock.getDelta(), 0.05);

    // Adaptive pixel ratio: downscale on low FPS (mobile/slow devices)
    frameCount++;
    const now = performance.now();
    if (now - lastFpsUpdate > 500) {
      currentFps = frameCount * (1000 / (now - lastFpsUpdate));
      frameCount = 0;
      lastFpsUpdate = now;

      // Auto-reduce DPI if FPS < 45
      if (currentFps < 45 && pixelRatioTarget > 1) {
        pixelRatioTarget = Math.max(1, pixelRatioTarget - 0.25);
        deps.renderer.setPixelRatio(pixelRatioTarget);
        if (import.meta.env.DEV) devLog(`⚠️ Low FPS (${currentFps.toFixed(0)}) → reducing DPI to ${pixelRatioTarget.toFixed(2)}`);
      } else if (currentFps > 55 && pixelRatioTarget < Math.min(devicePixelRatio, 2)) {
        pixelRatioTarget = Math.min(Math.min(devicePixelRatio, 2), pixelRatioTarget + 0.1);
        deps.renderer.setPixelRatio(pixelRatioTarget);
      }

      // ─── Phase 5: Update profiler metrics ───
      deps.profiler.updateFrame(deps.renderer);

      // ─── Phase 5: Apply quality preset if changed ───
      deps.applyQualityPreset();

      // Log performance every 2s
      if (now % 2000 < 500 && deps.showProfilerRef.current) {
        if (import.meta.env.DEV) devLog(`🎮 ${deps.profiler.getMetricsDisplay()}`);
      }
    }

    // ─── Phase 24: Process low-latency input ───
    const inputOptimizer = deps.getInputOptimizer();
    inputOptimizer.processInputQueue();

    deps.gameControls.updateFlippers();

    if (deps.physics) {
      if (deps.state.inLane) {
        try {
          const bridge = deps.getPhysicsWorker();
          bridge.setBallGravityScale(0.0);
        } catch { /* physics worker not ready */ }
      } else {
        try {
          const bridge = deps.getPhysicsWorker();
          const substeps = currentFps > 55 ? 6 : (currentFps > 45 ? 5 : 4);
          bridge.step(dt, substeps);
        } catch { /* physics worker not ready — skipping frame */ }

        if (deps.bamEngine) {
          const substeps = currentFps > 55 ? 6 : (currentFps > 45 ? 5 : 4);
          deps.bamEngine.step(dt, substeps);
        }
        if (deps.physics) {
          const pos = deps.physics.ballBody.translation(), vel = deps.physics.ballBody.linvel();
          deps.state.ballPos.x = pos.x; deps.state.ballPos.y = pos.y;
          deps.state.ballVel.x = vel.x; deps.state.ballVel.y = vel.y;

          deps.physics.eventQueue.drainCollisionEvents((h1: number, h2: number, started: boolean) => {
            if (!started) return;
            const ballH = deps.physics!.ballCollider.handle;
            const other = h1 === ballH ? h2 : (h2 === ballH ? h1 : -1);
            if (other < 0) return;

            // Phase 5: Apply flipper power variations
            if (other === deps.leftFlipperColliderHandle) {
              const v = deps.physics!.ballBody.linvel();
              const powerMult = deps.getLastLeftFlipperPower();  // 0.5-1.0
              deps.physics!.ballBody.setLinvel({
                x: v.x * powerMult,
                y: Math.max(v.y * powerMult, 3.0),  // Ensure upward momentum
                z: 0,
              }, true);
              return;
            }
            if (other === deps.rightFlipperColliderHandle) {
              const v = deps.physics!.ballBody.linvel();
              const powerMult = deps.getLastRightFlipperPower();  // 0.5-1.0
              deps.physics!.ballBody.setLinvel({
                x: v.x * powerMult,
                y: Math.max(v.y * powerMult, 3.0),  // Ensure upward momentum
                z: 0,
              }, true);
              return;
            }

            const bumperData = deps.physics!.bumperMap.get(other);
            if (bumperData) { deps.scoreBumperHit(bumperData); return; }
            const targetData = deps.physics!.targetMap.get(other);
            if (targetData) { deps.scoreTargetHit(targetData); return; }
            const slingSide = deps.physics!.slingshotMap.get(other);
            if (slingSide !== undefined) { deps.scoreSlingshotHit(slingSide); return; }
          });

          deps.checkRolloverLanes();

          // ─── Phase 2: Update Spinner Physics ───
          deps.updateSpinnerPhysics();

          // ─── Phase 4: Enhanced Ball Physics (Friction Curve) ───
          const ballVel = deps.physics.ballBody.linvel();
          const speed = Math.hypot(ballVel.x, ballVel.y);
          const frictionFactor = 0.97;  // 3% loss per frame
          if (speed > 0.1) {
            deps.physics.ballBody.setLinvel({
              x: ballVel.x * frictionFactor,
              y: ballVel.y * frictionFactor,
              z: 0,
            }, true);
          } else if (speed > 0) {
            // Stop completely below threshold
            deps.physics.ballBody.setLinvel({ x: 0, y: 0, z: 0 }, true);
          }
        }

        // ─── Phase 4: Drain Guide + Phase 7: Extended Ball Saves & Drain Logic ───
        const ballSpeedSq = deps.state.ballVel.x * deps.state.ballVel.x + deps.state.ballVel.y * deps.state.ballVel.y;
        if (deps.state.ballPos.y < -5.4 && ballSpeedSq < 2.25) {
          // ─── Phase 2: Trigger drain warning effect ───
          deps.cb.triggerDrainWarning();

          if (deps.state.ballSaveTimer > 0) {
            deps.state.ballSaveTimer = 0;
            deps.state.ballSaveMode = 'active';
            deps.dmdEvent('BALL SAVED!');
            deps.particleField.spawn(deps.state.ballPos.x, -6.8, 0x00ff88, 18, currentFps);
            deps.playSound('flipper');
            deps.resetBall();
          } else if (deps.state.ballSavesRemaining > 0) {
            deps.state.ballSavesRemaining--;
            deps.state.ballSaveTimer = 3.5;  // Reset timer
            deps.state.ballSaveMode = deps.state.ballSavesRemaining > 0 ? 'active' : 'exhausted';
            deps.resetBall();
            deps.showNotification(`💾 BALL SAVED! (${deps.state.ballSavesRemaining} left)`);
            deps.dmdEvent(`BALL SAVED!`);
            deps.particleField.spawn(deps.state.ballPos.x, -6.8, 0x00ff88, 18, currentFps);
            deps.playSound('flipper');
          } else {
            // Game over / next ball
            deps.state.ballSaveMode = 'none';
            const bonus = Math.floor(deps.state.bumperHits * 100 * deps.state.multiplier * 0.5);
            if (bonus > 0) { deps.state.score += bonus; deps.dmdEvent(`BONUS +${bonus.toLocaleString()}`); deps.updateHUD(); }
            deps.playSound('drain'); deps.callScriptDrain();

            const drainAnimBindings = deps.getAnimationBindingManager();
            const drainAnimScheduler = deps.getAnimationScheduler();
            const drainBamBridge = deps.getBamBridge();
            if (drainAnimBindings && drainAnimScheduler && drainBamBridge) {
              const drainBindings = drainAnimBindings.getBindingsFor('drain', 'on_drain');
              drainBindings.forEach((binding: any) => {
                if (binding.autoPlay) {
                  drainBamBridge.playAnimation(binding.sequenceId);
                  drainAnimBindings.markTriggered(binding.id);
                }
              });
            }

            if (deps.state.ballNum >= 3) {
              const rank = deps.recordScore(deps.state.score);
              deps.state.lastRank = rank; deps.state.lastScore = deps.state.score;
              deps.state.ballNum = 1; deps.state.score = 0; deps.state.multiplier = 1; deps.state.bumperHits = 0;
              // Reset extended ball saves for next game
              deps.state.ballSavesRemaining = 1;
              deps.state.ballSaveMode = 'none';
              deps.dmdState.mode = 'gameover'; deps.dmdState.animFrame = 0; deps.updateHUD();
              deps.showNotification(rank === 1 ? '🏆 NEW HIGH SCORE!' : '🎮 GAME OVER — Neues Spiel!');
            } else {
              deps.state.ballNum++; deps.state.multiplier = 1; deps.state.bumperHits = 0;
              // Grant extra ball save on new ball (every ball gets one)
              deps.state.ballSavesRemaining = 1;
              deps.state.ballSaveMode = 'none';
              deps.updateHUD(); deps.dmdEvent(`BALL ${deps.state.ballNum}`);
            }
            deps.resetBall();
          }
        }
      }
    }

    deps.ball.position.set(deps.state.ballPos.x, deps.state.ballPos.y, deps.state.ballPos.z);
    deps.ball.rotation.x += deps.state.ballVel.y * dt * 0.6;
    deps.ball.rotation.z -= deps.state.ballVel.x * dt * 0.6;

    // ─── Phase 27: Update Ball Trail ───
    const trailMgr = deps.getBallTrailManager();
    if (trailMgr && !deps.state.inLane) {
      trailMgr.update(deps.ball.position);
    } else if (trailMgr && deps.state.inLane) {
      // Clear trail when ball in lane
      trailMgr.clear();
    }

    // ─── Phase 19: Update Motion Blur Velocity Buffer ───
    if (deps.motionBlurPass) {
      deps.motionBlurPass.updateVelocityBuffer(dt);
      deps.motionBlurPass.trackObject(deps.ball);
    }

    // ─── Phase 20: Update Cascaded Shadow Maps ───
    if (deps.cascadedShadowMapper) {
      deps.cascadedShadowMapper.updateCascades(deps.camera as THREE.PerspectiveCamera);
      deps.cascadedShadowMapper.renderShadowMaps();
    }

    // ─── Phase 21: Update Advanced Particle System ───
    if (deps.particleSystem) {
      deps.particleSystem.update(dt);
    }

    // ─── Phase 28: Update Score Animations ───
    const scoreAnimMgr = deps.getScoreAnimationManager();
    if (scoreAnimMgr) {
      scoreAnimMgr.update(dt);
    }

    // ─── Phase 22: Update Film Effects ───
    if (deps.filmEffectsPass) {
      deps.filmEffectsPass.update(dt);
    }

    // ─── Phase 23: Update Depth of Field ───
    if (deps.dofPass) {
      deps.dofPass.setBallPosition(deps.ball.position);
    }

    // ─── Phase 7: Ball Save Countdown with Extended Saves ───
    if (deps.state.ballSaveTimer > 0) {
      const prev = deps.state.ballSaveTimer; deps.state.ballSaveTimer -= dt;
      if (Math.ceil(deps.state.ballSaveTimer) < Math.ceil(prev) && deps.state.ballSaveTimer > 0) {
        const saveText = deps.state.ballSaveMode === 'active'
          ? `BALL SAVE  ${Math.ceil(deps.state.ballSaveTimer)}`
          : `SAVES  ${Math.ceil(deps.state.ballSaveTimer)}`;
        deps.dmdState.eventText = saveText; deps.dmdState.eventTimer = 8; deps.dmdState.mode = 'event';
      }
    }

    // ─── Phase 2: Update Plunger & Extra Balls ───
    deps.gameControls.updatePlunger(dt);
    deps.gameControls.updateExtraBalls(dt);
    deps.particleField.update(dt);

    // ─── DMD state machine ───
    if (deps.currentTableConfig) {
      const coinVisible = deps.isCoinScreenVisible();
      const launchEligible = deps.dmdState.mode === 'attract' || deps.dmdState.mode === 'playing';
      if (launchEligible && !coinVisible && deps.state.inLane) {
        deps.dmdState.mode = 'launch';
        deps.dmdState.animFrame = 0;
      } else if (deps.dmdState.mode === 'launch' && !deps.state.inLane) {
        deps.dmdState.mode = 'playing';
        deps.dmdState.animFrame = 0;
      }
    }
    deps.dmdUpdate();

    // ─── Phase 2: Update Advanced Lighting ───
    if (deps.advancedLightingSystem) {
      deps.advancedLightingSystem.update();
    }

    // ─── Phase 9: Apply Table Shake Effect ───
    deps.applyTableShake();

    // ─── Phase 9: Update Score Display ───
    if (deps.scoreDisplayManager) {
      deps.scoreDisplayManager.update();
    }

    // ─── Phase 9: Update Visual Polish System ───
    if (deps.visualPolishSystem) {
      deps.visualPolishSystem.update();
    }

    // ─── Phase 4: Update Backglass ───
    if (deps.backglassRenderer) {
      deps.backglassRenderer.update();
      // Update parallax effect based on camera angle
      deps.backglassRenderer.updateParallax(deps.camera.rotation);
      // Render backglass to texture for compositing
      deps.backglassRenderer.render(deps.renderer);
    }

    // ─── Phase 14: Render Frame ───
    if (deps.renderer && deps.scene && deps.camera) {
      if (import.meta.env.DEV && (animateCallCount === 1 || animateCallCount % 300 === 0)) {
        devLog(`🎨 Rendering frame #${animateCallCount}`, {
          rendererExists: !!deps.renderer,
          sceneChildren: deps.scene?.children.length,
          cameraPos: deps.camera?.position
        });
      }

      // ─── Phase 20: Update and Render Cascaded Shadows (Polish Suite) ───
      if (deps.cascadedShadowMapper && deps.camera instanceof THREE.PerspectiveCamera) {
        deps.cascadedShadowMapper.updateCascades(deps.camera);
        deps.cascadedShadowMapper.renderShadowMaps();
      }

      // Render through graphics pipeline for post-processing
      try {
        const pipeline = deps.getGraphicsPipeline();
        if (import.meta.env.DEV && animateCallCount === 1) {
          devLog('🔄 Pipeline status:', { exists: !!pipeline, type: pipeline?.constructor.name });
        }
        if (pipeline) {
          pipeline.renderFrame(dt);  // Use graphics pipeline for Polish Suite post-processing
        } else {
          // Fallback: direct render if pipeline unavailable
          if (animateCallCount === 1) devLog('⚠️ Pipeline unavailable, using fallback renderer.render()');
          deps.renderer.render(deps.scene, deps.camera);
        }
      } catch (error) {
        devLog('Pipeline render failed, falling back to direct render:', error);
        deps.renderer.render(deps.scene, deps.camera);
      }
    } else {
      if (animateCallCount === 1) {
        devLog(`⚠️ Cannot render: renderer=${!!deps.renderer}, scene=${!!deps.scene}, camera=${!!deps.camera}`);
      }
    }

    deps.inlineBackglass.draw();

    // ─── Phase 24: Record performance metrics ───
    const dashboard = deps.getPerformanceDashboard();
    const inputMetrics = inputOptimizer.getMetrics();
    dashboard.recordFrame({
      frameTime: dt * 1000,
      inputLatency: inputMetrics.keyDownLatency,
      ballVelocity: deps.state.ballPos ? Math.hypot(deps.state.ballVel.x, deps.state.ballVel.y) : 0,
      flipperResponse: 0,  // Updated by flipper handler
    });

    deps.emitSyncFrame({
      type: 'state', score: deps.state.score, ballNum: deps.state.ballNum, multiplier: deps.state.multiplier,
      inLane: deps.state.inLane, dmdMode: deps.dmdState.mode, dmdEventText: deps.dmdState.eventText,
      dmdAnimFrame: deps.dmdState.animFrame, dmdScrollX: deps.dmdState.scrollX,
      dmdEventTimer: deps.dmdState.eventTimer, lastRank: deps.state.lastRank, lastScore: deps.state.lastScore,
      bumperHits: deps.state.bumperHits,
      tableName:   deps.currentTableConfig ? deps.currentTableConfig.name : 'FUTURE PINBALL',
      tableAccent: deps.currentTableConfig ? deps.currentTableConfig.accentColor : 0x00ff66,
      tableColor:  deps.currentTableConfig ? deps.currentTableConfig.tableColor : 0x1a4a15,
      highScores: deps.getTopScores(),
    });
  };
}

