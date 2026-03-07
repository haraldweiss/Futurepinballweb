/**
 * Light Animator — Apply keyframe animations to Three.js lights
 * Phase 13 Task 4: Animate light intensity, color, and position
 */

import * as THREE from 'three';
import { BaseAnimator, Keyframe } from './base-animator';

/**
 * Animates a Three.js Light using keyframes
 */
export class LightAnimator extends BaseAnimator {
  private light: THREE.Light;
  private baseIntensity: number;

  constructor(light: THREE.Light) {
    super();
    this.light = light;
    this.baseIntensity = light.intensity;
  }

  /**
   * Apply keyframe to light
   */
  apply(keyframe: Keyframe): void {
    this.keyframe = keyframe;

    // Apply intensity (use keyframe.scale.x as intensity multiplier)
    const intensityMultiplier = keyframe.scale.x;
    this.light.intensity = this.baseIntensity * intensityMultiplier;

    // Apply position if light supports it
    if ('position' in this.light) {
      const lightObj = this.light as any;
      if (lightObj.position) {
        lightObj.position.set(keyframe.position.x, keyframe.position.y, keyframe.position.z);
      }
    }

    // Apply color changes if specified (use position as color encoding: x=R, y=G, z=B in 0-1)
    if ('color' in this.light) {
      const lightObj = this.light as any;
      if (lightObj.color && keyframe.rotation.x !== 0) {
        // Use Euler angles to encode RGB values (0-360 maps to 0-1 for each channel)
        const r = (keyframe.rotation.x % 360) / 360;
        const g = (keyframe.rotation.y % 360) / 360;
        const b = (keyframe.rotation.z % 360) / 360;
        lightObj.color.setRGB(r, g, b);
      }
    }
  }

  /**
   * Get light intensity
   */
  getIntensity(): number {
    return this.light.intensity;
  }

  /**
   * Set light intensity
   */
  setIntensity(intensity: number): void {
    this.light.intensity = Math.max(0, intensity);
  }

  /**
   * Get light color
   */
  getColor(): THREE.Color | null {
    if ('color' in this.light) {
      return (this.light as any).color?.clone() || null;
    }
    return null;
  }

  /**
   * Set light color
   */
  setColor(color: number): void {
    if ('color' in this.light) {
      (this.light as any).color?.setHex(color);
    }
  }

  /**
   * Pulse light intensity
   */
  pulseLight(targetIntensity: number, duration: number): void {
    const startIntensity = this.light.intensity;
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(1.0, elapsed / duration);

      // Ease out (faster fade)
      const easeProgress = 1 - (1 - progress) * (1 - progress);
      this.light.intensity = startIntensity + (targetIntensity - startIntensity) * easeProgress;

      if (progress < 1.0) {
        requestAnimationFrame(animate);
      } else {
        this.light.intensity = startIntensity;
      }
    };

    animate();
  }
}
