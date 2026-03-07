/**
 * Camera Animator — Apply keyframe animations to Three.js camera
 * Phase 13 Task 4: Animate camera position, rotation, and FOV
 */

import * as THREE from 'three';
import { BaseAnimator, Keyframe } from './base-animator';

/**
 * Animates a Three.js camera using keyframes
 */
export class CameraAnimator extends BaseAnimator {
  private camera: THREE.PerspectiveCamera;
  private baseFOV: number;
  private targetQuaternion: THREE.Quaternion = new THREE.Quaternion();
  private currentQuaternion: THREE.Quaternion = new THREE.Quaternion();

  constructor(camera: THREE.PerspectiveCamera) {
    super();
    this.camera = camera;
    this.baseFOV = camera.fov;
    this.currentQuaternion.copy(camera.quaternion);
  }

  /**
   * Apply keyframe to camera
   */
  apply(keyframe: Keyframe): void {
    this.keyframe = keyframe;

    // Apply position
    this.camera.position.set(keyframe.position.x, keyframe.position.y, keyframe.position.z);

    // Apply rotation (convert Euler to quaternion for smooth interpolation)
    const quat = this.eulerToQuaternion(keyframe.rotation);
    this.targetQuaternion.set(quat.x, quat.y, quat.z, quat.w);
    this.currentQuaternion.slerpQuaternions(
      this.currentQuaternion,
      this.targetQuaternion,
      0.1 // Smooth interpolation factor
    );
    this.camera.quaternion.copy(this.currentQuaternion);

    // Apply FOV scaling (if scale.x is used as FOV multiplier)
    const fovScale = keyframe.scale.x;
    this.camera.fov = this.baseFOV * fovScale;
    this.camera.updateProjectionMatrix();
  }

  /**
   * Get camera position
   */
  getPosition(): THREE.Vector3 {
    return this.camera.position.clone();
  }

  /**
   * Set camera position directly
   */
  setPosition(pos: { x: number; y: number; z: number }): void {
    this.camera.position.set(pos.x, pos.y, pos.z);
  }

  /**
   * Get camera rotation (as Euler)
   */
  getRotation(): { x: number; y: number; z: number } {
    const euler = new THREE.Euler();
    euler.setFromQuaternion(this.camera.quaternion);
    return {
      x: (euler.x * 180) / Math.PI,
      y: (euler.y * 180) / Math.PI,
      z: (euler.z * 180) / Math.PI,
    };
  }

  /**
   * Look at a target position
   */
  lookAt(target: { x: number; y: number; z: number }): void {
    this.camera.lookAt(target.x, target.y, target.z);
  }
}
