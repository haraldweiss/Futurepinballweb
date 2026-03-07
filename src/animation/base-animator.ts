/**
 * Base Animator — Apply keyframe transforms to 3D objects
 * Phase 13 Task 4: Foundation for all animation application
 */

export interface Keyframe {
  time: number;
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
  scale: { x: number; y: number; z: number };
  duration: number;
}

/**
 * Base class for all animators
 */
export abstract class BaseAnimator {
  protected keyframe: Keyframe | null = null;

  /**
   * Apply keyframe to target
   */
  abstract apply(keyframe: Keyframe): void;

  /**
   * Linear interpolation
   */
  protected lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
  }

  /**
   * Vector3 linear interpolation
   */
  protected lerpVec3(
    a: { x: number; y: number; z: number },
    b: { x: number; y: number; z: number },
    t: number
  ): { x: number; y: number; z: number } {
    return {
      x: this.lerp(a.x, b.x, t),
      y: this.lerp(a.y, b.y, t),
      z: this.lerp(a.z, b.z, t),
    };
  }

  /**
   * Easing function (currently linear, but extensible)
   */
  protected applyEasing(t: number, easeType: 'linear' | 'cubic' | 'ease-in' | 'ease-out' = 'linear'): number {
    switch (easeType) {
      case 'cubic':
        // Cubic ease-in-out
        return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      case 'ease-in':
        return t * t;
      case 'ease-out':
        return 1 - (1 - t) * (1 - t);
      case 'linear':
      default:
        return t;
    }
  }

  /**
   * Quaternion from Euler angles (for smooth rotation)
   */
  protected eulerToQuaternion(euler: { x: number; y: number; z: number }) {
    // Convert degrees to radians
    const x = (euler.x * Math.PI) / 180;
    const y = (euler.y * Math.PI) / 180;
    const z = (euler.z * Math.PI) / 180;

    // Compute quaternion from Euler angles (XYZ order)
    const cx = Math.cos(x * 0.5);
    const sx = Math.sin(x * 0.5);
    const cy = Math.cos(y * 0.5);
    const sy = Math.sin(y * 0.5);
    const cz = Math.cos(z * 0.5);
    const sz = Math.sin(z * 0.5);

    return {
      x: sx * cy * cz - cx * sy * sz,
      y: cx * sy * cz + sx * cy * sz,
      z: cx * cy * sz - sx * sy * cz,
      w: cx * cy * cz + sx * sy * sz,
    };
  }

  /**
   * Get current keyframe
   */
  getKeyframe(): Keyframe | null {
    return this.keyframe;
  }

  /**
   * Set current keyframe
   */
  setKeyframe(kf: Keyframe): void {
    this.keyframe = kf;
  }
}
