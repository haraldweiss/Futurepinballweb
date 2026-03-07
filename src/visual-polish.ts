/**
 * visual-polish.ts — PHASE 9: Visual Polish & Effects
 *
 * Handles visual enhancements:
 * - Particle system improvements (impact, dust, trails, sparkles)
 * - UI element animations (score pulse, multiplier glow, ball counter)
 * - Screen effects (vignette, color tint, flash)
 * - Dynamic lighting effects (impact glow, warning lights, celebration)
 */

import * as THREE from 'three';

// ─── Screen Effects System ─────────────────────────────────────────────────
/**
 * Manages full-screen visual effects
 */
export class ScreenEffects {
  private scene: THREE.Scene;
  private camera: THREE.Camera;
  private vignetteOverlay: THREE.Mesh | null = null;
  private screenFlash: THREE.Mesh | null = null;
  private colorTint: THREE.Mesh | null = null;

  constructor(scene: THREE.Scene, camera: THREE.Camera) {
    this.scene = scene;
    this.camera = camera;
  }

  /**
   * Create vignette overlay (dark edges)
   */
  createVignette(): void {
    if (this.vignetteOverlay) return;

    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Create vignette gradient (dark edges, bright center)
    const gradient = ctx.createRadialGradient(256, 256, 100, 256, 256, 360);
    gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0.6)');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 512, 512);

    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      opacity: 0.3,
    });

    this.vignetteOverlay = new THREE.Mesh(
      new THREE.PlaneGeometry(20, 20),
      material
    );
    this.vignetteOverlay.position.z = 2;
    this.scene.add(this.vignetteOverlay);
  }

  /**
   * Trigger screen flash on high-speed impact
   */
  flashScreen(duration: number = 150, intensity: number = 0.3): void {
    if (this.screenFlash) {
      this.scene.remove(this.screenFlash);
    }

    const material = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: intensity,
    });

    this.screenFlash = new THREE.Mesh(
      new THREE.PlaneGeometry(20, 20),
      material
    );
    this.screenFlash.position.z = 3;
    this.scene.add(this.screenFlash);

    // Fade out
    const startTime = Date.now();
    const fadeOut = () => {
      const elapsed = Date.now() - startTime;
      const progress = elapsed / duration;

      if (this.screenFlash) {
        (this.screenFlash.material as THREE.MeshBasicMaterial).opacity =
          intensity * (1 - progress);

        if (progress < 1) {
          requestAnimationFrame(fadeOut);
        } else {
          this.scene.remove(this.screenFlash);
          this.screenFlash = null;
        }
      }
    };
    fadeOut();
  }

  /**
   * Apply color tint to screen (e.g., red for warning)
   */
  applyColorTint(color: number, duration: number = 200, intensity: number = 0.3): void {
    if (this.colorTint) {
      this.scene.remove(this.colorTint);
    }

    const material = new THREE.MeshBasicMaterial({
      color: color,
      transparent: true,
      opacity: intensity,
    });

    this.colorTint = new THREE.Mesh(
      new THREE.PlaneGeometry(20, 20),
      material
    );
    this.colorTint.position.z = 3;
    this.scene.add(this.colorTint);

    // Fade out
    const startTime = Date.now();
    const fadeOut = () => {
      const elapsed = Date.now() - startTime;
      const progress = elapsed / duration;

      if (this.colorTint) {
        (this.colorTint.material as THREE.MeshBasicMaterial).opacity =
          intensity * (1 - progress);

        if (progress < 1) {
          requestAnimationFrame(fadeOut);
        } else {
          this.scene.remove(this.colorTint);
          this.colorTint = null;
        }
      }
    };
    fadeOut();
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    if (this.vignetteOverlay) {
      this.scene.remove(this.vignetteOverlay);
      (this.vignetteOverlay.material as THREE.MeshBasicMaterial).map?.dispose();
      (this.vignetteOverlay.material as THREE.MeshBasicMaterial).dispose();
      this.vignetteOverlay = null;
    }
  }
}

// ─── Advanced Particle System ──────────────────────────────────────────────
/**
 * Enhanced particle effects with pooling
 */
export interface ParticleEmitterConfig {
  position: THREE.Vector3;
  color: number;
  count: number;
  speed: number;
  spread: number;  // degrees
  lifetime: number; // seconds
  size: number;
  decay: boolean;  // size decreases over lifetime
}

/**
 * Emit particles with enhanced behavior
 */
export function emitAdvancedParticles(
  config: ParticleEmitterConfig,
  particleSystem: any  // Existing particle system from main.ts
): void {
  if (!particleSystem) return;

  const r = ((config.color >> 16) & 0xff) / 255;
  const g = ((config.color >> 8) & 0xff) / 255;
  const b = (config.color & 0xff) / 255;

  for (let i = 0; i < config.count; i++) {
    const angle = (Math.random() - 0.5) * config.spread;
    const velocity = config.speed * (0.8 + Math.random() * 0.4);

    const vx = Math.cos(angle) * velocity;
    const vy = Math.sin(angle) * velocity;
    const vz = (Math.random() - 0.5) * velocity;

    particleSystem.addParticle(
      config.position.x,
      config.position.y,
      config.position.z,
      vx,
      vy,
      vz,
      r,
      g,
      b,
      config.size,
      config.lifetime,
      config.decay
    );
  }
}

/**
 * Emit ball trail particle effect
 */
export function emitBallTrail(
  ballPos: THREE.Vector3,
  ballVel: THREE.Vector3,
  particleSystem: any
): void {
  const speed = Math.hypot(ballVel.x, ballVel.y);
  if (speed < 2) return;  // No trail for slow movement

  // Trail follows ball direction
  const color = 0x99ccff;  // Light blue
  const count = Math.floor(speed * 0.5);  // More particles at higher speed

  emitAdvancedParticles(
    {
      position: ballPos,
      color: color,
      count: Math.min(count, 5),
      speed: 1.0,
      spread: 30,
      lifetime: 0.3,
      size: 0.08,
      decay: true,
    },
    particleSystem
  );
}

/**
 * Emit flipper dust particles on activation
 */
export function emitFlipperDust(
  flipperPos: THREE.Vector3,
  particleSystem: any
): void {
  emitAdvancedParticles(
    {
      position: flipperPos,
      color: 0xbbbbbb,  // Gray dust
      count: 4,
      speed: 2.5,
      spread: 60,
      lifetime: 0.8,
      size: 0.06,
      decay: true,
    },
    particleSystem
  );
}

/**
 * Emit score milestone sparkles
 */
export function emitMilestoneSparkles(
  position: THREE.Vector3,
  particleSystem: any
): void {
  emitAdvancedParticles(
    {
      position: position,
      color: 0xffff00,  // Gold
      count: 12,
      speed: 3.0,
      spread: 360,
      lifetime: 1.0,
      size: 0.12,
      decay: true,
    },
    particleSystem
  );
}

// ─── UI Effects System ─────────────────────────────────────────────────────
/**
 * Manages animated UI elements
 */
export class UIEffects {
  private scoreElements: Array<{
    element: HTMLElement;
    startTime: number;
    duration: number;
  }> = [];

  private multiplierElement: HTMLElement | null = null;
  private multiplierGlowIntensity = 0;

  /**
   * Animate score number when it changes
   */
  animateScoreUpdate(scoreElement: HTMLElement, duration: number = 300): void {
    const originalScale = 1.0;
    const targetScale = 1.1;  // 10% larger
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1.0);

      // Scale up then down (bell curve)
      const scale = originalScale + (targetScale - originalScale) * Math.sin(progress * Math.PI);
      scoreElement.style.transform = `scale(${scale})`;

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        scoreElement.style.transform = `scale(${originalScale})`;
      }
    };

    animate();
  }

  /**
   * Update multiplier badge with pulsing glow
   */
  updateMultiplierGlow(multiplier: number, element: HTMLElement): void {
    this.multiplierElement = element;

    // Intensity increases with multiplier (max at 5x+)
    const intensity = Math.min(multiplier / 5, 1.0);
    this.multiplierGlowIntensity = intensity;

    // Apply glow effect
    const glowColor = `rgba(255, ${150 + intensity * 100}, 0, ${0.3 + intensity * 0.4})`;
    element.style.boxShadow = `0 0 ${10 + intensity * 20}px ${glowColor}`;
    element.style.borderColor = glowColor;
  }

  /**
   * Update multiplier glow animation (pulse)
   */
  updateMultiplierPulse(): void {
    if (!this.multiplierElement || this.multiplierGlowIntensity <= 0) return;

    const now = Date.now();
    const pulsePhase = (now / 500) % 1.0;  // 500ms cycle
    const pulseFactor = 0.8 + 0.2 * Math.sin(pulsePhase * Math.PI * 2);

    const intensity = this.multiplierGlowIntensity * pulseFactor;
    const glowColor = `rgba(255, ${150 + intensity * 100}, 0, ${0.3 + intensity * 0.4})`;
    this.multiplierElement.style.boxShadow = `0 0 ${10 + intensity * 20}px ${glowColor}`;
  }

  /**
   * Animate ball counter changes
   */
  animateBallCounter(ballCountElement: HTMLElement): void {
    ballCountElement.style.transform = 'scale(1.2)';
    ballCountElement.style.color = '#ffaa00';

    setTimeout(() => {
      ballCountElement.style.transform = 'scale(1.0)';
      ballCountElement.style.color = '';
    }, 200);
  }
}

// ─── Dynamic Lighting Effects ──────────────────────────────────────────────
/**
 * Manages dynamic lighting effects
 */
export class LightingEffects {
  private scene: THREE.Scene;
  private activeLights: Array<{
    light: THREE.Light;
    startTime: number;
    duration: number;
    targetIntensity: number;
  }> = [];

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  /**
   * Create pulsing light on bumper impact
   */
  addBumperImpactLight(position: THREE.Vector3, intensity: number = 1.0): void {
    const light = new THREE.PointLight(0xff8800, intensity * 2, 6);
    light.position.copy(position);
    light.position.z += 1;
    this.scene.add(light);

    this.activeLights.push({
      light,
      startTime: Date.now(),
      duration: 200,
      targetIntensity: 0,
    });
  }

  /**
   * Create warning red glow on drain
   */
  addDrainWarningLight(): void {
    const light = new THREE.PointLight(0xff3333, 2.0, 12);
    light.position.set(0, -4, 5);
    light.castShadow = true;
    this.scene.add(light);

    this.activeLights.push({
      light,
      startTime: Date.now(),
      duration: 500,
      targetIntensity: 0,
    });
  }

  /**
   * Create green glow on ramp completion
   */
  addRampCompletionLight(): void {
    const light = new THREE.PointLight(0x00ff66, 2.0, 12);
    light.position.set(0, 2, 8);
    light.castShadow = true;
    this.scene.add(light);

    this.activeLights.push({
      light,
      startTime: Date.now(),
      duration: 400,
      targetIntensity: 0,
    });
  }

  /**
   * Create pulsing light for multiball
   */
  addMultiballLight(): void {
    const light = new THREE.PointLight(0xffcc00, 3.0, 15);
    light.position.set(0, 1, 6);
    light.castShadow = true;
    this.scene.add(light);

    this.activeLights.push({
      light,
      startTime: Date.now(),
      duration: 1000,
      targetIntensity: 0,
    });
  }

  /**
   * Update all dynamic lights
   */
  update(): void {
    const now = Date.now();

    this.activeLights = this.activeLights.filter(item => {
      const elapsed = now - item.startTime;
      if (elapsed > item.duration) {
        this.scene.remove(item.light);
        return false;
      }

      const progress = elapsed / item.duration;

      // Fade out (exponential curve for smooth decay)
      const fade = Math.pow(1 - progress, 2);
      const currentIntensity = item.light.intensity;
      const maxIntensity = currentIntensity / Math.pow(1, 2);  // Initial intensity

      // For multiball, add pulse
      if (item.duration === 1000) {
        const pulse = 0.5 + 0.5 * Math.sin(progress * Math.PI * 4);
        item.light.intensity = maxIntensity * fade * pulse;
      } else {
        item.light.intensity = maxIntensity * fade;
      }

      return true;
    });
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    this.activeLights.forEach(item => {
      this.scene.remove(item.light);
    });
    this.activeLights = [];
  }
}

// ─── Master Visual Effects Controller ──────────────────────────────────────
/**
 * Central manager for all visual polish effects
 */
export class VisualPolishSystem {
  private screenEffects: ScreenEffects;
  private uiEffects: UIEffects;
  private lightingEffects: LightingEffects;

  constructor(scene: THREE.Scene, camera: THREE.Camera) {
    this.screenEffects = new ScreenEffects(scene, camera);
    this.uiEffects = new UIEffects();
    this.lightingEffects = new LightingEffects(scene);

    // Create vignette on init
    this.screenEffects.createVignette();
  }

  /**
   * High-speed impact vignette and flash
   */
  triggerImpactEffect(intensity: number = 1.0): void {
    this.screenEffects.flashScreen(150, 0.2 * intensity);
  }

  /**
   * Drain warning: red tint and light
   */
  triggerDrainWarning(): void {
    this.screenEffects.applyColorTint(0xff3333, 300, 0.2);
    this.lightingEffects.addDrainWarningLight();
  }

  /**
   * Ramp completion: green tint and light
   */
  triggerRampCompletion(): void {
    this.screenEffects.applyColorTint(0x00ff66, 300, 0.2);
    this.lightingEffects.addRampCompletionLight();
  }

  /**
   * Multiball start: bright flash and pulsing light
   */
  triggerMultiballStart(): void {
    this.screenEffects.flashScreen(200, 0.4);
    this.lightingEffects.addMultiballLight();
  }

  /**
   * Bumper impact: flash and light
   */
  triggerBumperImpact(position: THREE.Vector3, intensity: number = 1.0): void {
    this.screenEffects.flashScreen(100, 0.15 * intensity);
    this.lightingEffects.addBumperImpactLight(position, intensity);
  }

  /**
   * Update all visual effects (call once per frame)
   */
  update(): void {
    this.lightingEffects.update();
    this.uiEffects.updateMultiplierPulse();
  }

  /**
   * Animate score update in UI
   */
  animateScoreUpdate(scoreElement: HTMLElement): void {
    this.uiEffects.animateScoreUpdate(scoreElement);
  }

  /**
   * Update multiplier glow
   */
  updateMultiplierGlow(multiplier: number, element: HTMLElement): void {
    this.uiEffects.updateMultiplierGlow(multiplier, element);
  }

  /**
   * Animate ball counter
   */
  animateBallCounter(element: HTMLElement): void {
    this.uiEffects.animateBallCounter(element);
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    this.screenEffects.dispose();
    this.lightingEffects.dispose();
  }
}
