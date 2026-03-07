/**
 * rotation-engine.ts — PHASE 10+ TASK 2: Playfield Rotation
 *
 * Handles real-time playfield rotation for different cabinet orientations:
 * - Smooth rotation of all game elements
 * - Camera position adjustment
 * - Flipper orientation correction
 * - Physics coordinate transformation
 */

import * as THREE from 'three';
import { getCabinetSystem, getActiveCabinetProfile, CabinetProfile } from './cabinet-system';

// ─── Rotation Engine ──────────────────────────────────────────────────────────
export class RotationEngine {
  private playgroundGroup: THREE.Group;
  private camera: THREE.Camera;
  private isRotating: boolean = false;
  private currentRotationDegrees: 0 | 90 | 180 | 270 = 0;

  constructor(playgroundGroup: THREE.Group, camera: THREE.Camera) {
    this.playgroundGroup = playgroundGroup;
    this.camera = camera;
    console.log('✓ Rotation Engine initialized');
  }

  /**
   * Apply cabinet profile rotation to playground
   * Updates playfield orientation and camera position
   */
  applyProfileRotation(profile: CabinetProfile): void {
    // Get rotation quaternion from cabinet system
    const cabinet = getCabinetSystem();
    if (!cabinet) return;

    const rotationQuat = cabinet.getRotationQuaternion();
    this.playgroundGroup.quaternion.copy(rotationQuat);

    // Update camera position based on profile
    this.updateCameraForProfile(profile);

    this.currentRotationDegrees = profile.rotation;
    console.log(`🎮 Applied profile rotation: ${profile.rotation}°`);
  }

  /**
   * Update camera position and look-at for given profile
   */
  private updateCameraForProfile(profile: CabinetProfile): void {
    const perpCamera = this.camera as THREE.PerspectiveCamera;

    // Use profile's camera configuration
    perpCamera.position.set(
      profile.cameraPosition.x,
      profile.cameraPosition.y,
      profile.cameraPosition.z
    );

    perpCamera.lookAt(
      profile.cameraLookAt.x,
      profile.cameraLookAt.y,
      profile.cameraLookAt.z
    );

    // Update FOV if needed
    if (perpCamera.fov !== profile.cameraFOV) {
      perpCamera.fov = profile.cameraFOV;
      perpCamera.updateProjectionMatrix();
    }
  }

  /**
   * Smoothly rotate playfield with easing
   * Returns promise that resolves when rotation completes
   */
  async rotateSmooth(targetDegrees: 0 | 90 | 180 | 270, duration: number = 600): Promise<void> {
    if (this.isRotating) return;
    this.isRotating = true;

    return new Promise((resolve) => {
      const startTime = Date.now();
      const startQuat = this.playgroundGroup.quaternion.clone();
      const cabinet = getCabinetSystem();
      if (!cabinet) {
        this.isRotating = false;
        resolve();
        return;
      }

      // Immediately get target quaternion (don't wait for cabinet animation)
      const axis = new THREE.Vector3(0, 0, 1);  // Z-axis
      const radians = (targetDegrees * Math.PI) / 180;
      const targetQuat = new THREE.Quaternion();
      targetQuat.setFromAxisAngle(axis, radians);

      // Update cabinet system state (but don't wait for its animation)
      cabinet.rotatePlayfield(targetDegrees, duration);

      // Animate playgroundGroup directly
      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);

        // Spherical linear interpolation (slerp)
        const easeProgress = progress < 0.5
          ? 2 * progress * progress
          : -1 + (4 - 2 * progress) * progress;

        THREE.Quaternion.slerp(startQuat, targetQuat, easeProgress, this.playgroundGroup.quaternion);

        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          this.currentRotationDegrees = targetDegrees;
          this.isRotating = false;
          console.log(`✓ Playfield rotation complete: ${targetDegrees}°`);
          resolve();
        }
      };

      animate();
    });
  }

  /**
   * Get flipper positions adjusted for current rotation
   * Used to correct flipper physical bodies based on playfield orientation
   */
  getFlipperOrientationForRotation(): {
    leftFlipperAngle: number;
    rightFlipperAngle: number;
  } {
    const rotation = this.currentRotationDegrees;

    // Standard positions (0°)
    let leftFlipperAngle = 0;
    let rightFlipperAngle = 0;

    // Adjust angles based on rotation
    switch (rotation) {
      case 90:
        // Vertical: flippers rotated 90°
        leftFlipperAngle = Math.PI / 2;
        rightFlipperAngle = Math.PI / 2;
        break;
      case 180:
        // Inverted: flippers rotated 180°
        leftFlipperAngle = Math.PI;
        rightFlipperAngle = Math.PI;
        break;
      case 270:
        // Rotated: flippers rotated 270°
        leftFlipperAngle = (3 * Math.PI) / 2;
        rightFlipperAngle = (3 * Math.PI) / 2;
        break;
      case 0:
      default:
        // Standard horizontal
        break;
    }

    return {
      leftFlipperAngle,
      rightFlipperAngle,
    };
  }

  /**
   * Transform world coordinates based on playfield rotation
   * Used to convert physics body positions to rotated coordinates
   */
  transformWorldCoordinates(x: number, y: number, z: number = 0): THREE.Vector3 {
    const vec = new THREE.Vector3(x, y, z);
    vec.applyQuaternion(this.playgroundGroup.quaternion);
    return vec;
  }

  /**
   * Inverse transform: rotate coordinates back to standard space
   */
  inverseTransformCoordinates(vec: THREE.Vector3): THREE.Vector3 {
    const invQuat = this.playgroundGroup.quaternion.clone().invert();
    return vec.clone().applyQuaternion(invQuat);
  }

  /**
   * Check if rotation is in progress
   */
  isRotationInProgress(): boolean {
    return this.isRotating;
  }

  /**
   * Get current rotation angle in degrees
   */
  getCurrentRotation(): 0 | 90 | 180 | 270 {
    return this.currentRotationDegrees;
  }

  /**
   * Dispose resources
   */
  dispose(): void {
    // Cleanup if needed
  }
}

// ─── Public API ────────────────────────────────────────────────────────────
let rotationEngine: RotationEngine | null = null;

export function initializeRotationEngine(
  playgroundGroup: THREE.Group,
  camera: THREE.Camera
): RotationEngine {
  if (!rotationEngine) {
    rotationEngine = new RotationEngine(playgroundGroup, camera);
  }
  return rotationEngine;
}

export function getRotationEngine(): RotationEngine | null {
  return rotationEngine;
}

export function applyProfileRotation(profile: CabinetProfile): void {
  if (rotationEngine) {
    rotationEngine.applyProfileRotation(profile);
  }
}

export function rotatePlayfieldSmooth(
  targetDegrees: 0 | 90 | 180 | 270,
  duration?: number
): Promise<void> {
  if (!rotationEngine) {
    return Promise.resolve();
  }
  return rotationEngine.rotateSmooth(targetDegrees, duration);
}

export function getFlipperOrientation(): {
  leftFlipperAngle: number;
  rightFlipperAngle: number;
} {
  if (!rotationEngine) {
    return { leftFlipperAngle: 0, rightFlipperAngle: 0 };
  }
  return rotationEngine.getFlipperOrientationForRotation();
}
