/**
 * Object Animator — Apply keyframe animations to Three.js objects
 * Phase 13 Task 4: Animate meshes, groups, and game elements
 */

import * as THREE from 'three';
import { BaseAnimator, Keyframe } from './base-animator';

/**
 * Animates a Three.js Object3D using keyframes
 */
export class ObjectAnimator extends BaseAnimator {
  private object: THREE.Object3D;
  private targetQuaternion: THREE.Quaternion = new THREE.Quaternion();
  private currentQuaternion: THREE.Quaternion = new THREE.Quaternion();

  constructor(object: THREE.Object3D) {
    super();
    this.object = object;
    this.currentQuaternion.copy(object.quaternion);
  }

  /**
   * Apply keyframe to object
   */
  apply(keyframe: Keyframe): void {
    this.keyframe = keyframe;

    // Apply position
    this.object.position.set(keyframe.position.x, keyframe.position.y, keyframe.position.z);

    // Apply rotation (smooth quaternion interpolation)
    const quat = this.eulerToQuaternion(keyframe.rotation);
    this.targetQuaternion.set(quat.x, quat.y, quat.z, quat.w);
    this.currentQuaternion.slerpQuaternions(
      this.currentQuaternion,
      this.targetQuaternion,
      0.1
    );
    this.object.quaternion.copy(this.currentQuaternion);

    // Apply scale
    this.object.scale.set(keyframe.scale.x, keyframe.scale.y, keyframe.scale.z);
  }

  /**
   * Get object position
   */
  getPosition(): THREE.Vector3 {
    return this.object.position.clone();
  }

  /**
   * Set object position directly
   */
  setPosition(pos: { x: number; y: number; z: number }): void {
    this.object.position.set(pos.x, pos.y, pos.z);
  }

  /**
   * Get object rotation (as Euler)
   */
  getRotation(): { x: number; y: number; z: number } {
    const euler = new THREE.Euler();
    euler.setFromQuaternion(this.object.quaternion);
    return {
      x: (euler.x * 180) / Math.PI,
      y: (euler.y * 180) / Math.PI,
      z: (euler.z * 180) / Math.PI,
    };
  }

  /**
   * Get object scale
   */
  getScale(): { x: number; y: number; z: number } {
    return {
      x: this.object.scale.x,
      y: this.object.scale.y,
      z: this.object.scale.z,
    };
  }

  /**
   * Animate to keyframe over duration
   */
  animateTo(targetKeyframe: Keyframe, duration: number): void {
    const startPos = this.object.position.clone();
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(1.0, elapsed / duration);

      // Interpolate position
      const pos = this.lerpVec3(
        { x: startPos.x, y: startPos.y, z: startPos.z },
        targetKeyframe.position,
        progress
      );
      this.object.position.set(pos.x, pos.y, pos.z);

      if (progress < 1.0) {
        requestAnimationFrame(animate);
      }
    };

    animate();
  }
}
