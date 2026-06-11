// SPDX-License-Identifier: AGPL-3.0-or-later
// © 2026 Harald Weiss

import * as THREE from 'three';
import { devLog } from '../utils/dev-log';
import { CabinetProfile, CABINET_HORIZONTAL, CABINET_VERTICAL, CABINET_WIDE, CABINET_INVERTED } from './cabinet-profile';

export class CabinetSystem {
  private currentProfile: CabinetProfile = CABINET_HORIZONTAL;
  private rotationQuaternion: THREE.Quaternion = new THREE.Quaternion();
  private rotationAngle: number = 0;

  constructor() {
    devLog('✓ Cabinet System initialized');
  }

  autoDetectProfile(): CabinetProfile {
    const screenWidth = window.screen.width;
    const screenHeight = window.screen.height;

    const availWidth = window.screen.availWidth || screenWidth;
    const availHeight = window.screen.availHeight || screenHeight;

    const width = availWidth > 0 ? availWidth : screenWidth;
    const height = availHeight > 0 ? availHeight : screenHeight;

    const aspectRatio = width / height;

    devLog(`🎮 Cabinet auto-detect:`);
    devLog(`   Monitor: ${screenWidth}x${screenHeight} | Available: ${width}x${height} | Aspect: ${aspectRatio.toFixed(2)}`);

    if (aspectRatio > 2.3) {
      devLog(`🎮 → Ultrawide detected (>2.3), using WIDE profile (0°)`);
      this.setProfile(CABINET_WIDE);
      return CABINET_WIDE;
    }

    if (aspectRatio < 0.75) {
      devLog(`🎮 → Vertical/Portrait detected (<0.75), using VERTICAL profile (90°)`);
      this.setProfile(CABINET_VERTICAL);
      return CABINET_VERTICAL;
    }

    devLog(`🎮 → Standard horizontal detected, using HORIZONTAL profile (0° - NO ROTATION)`);
    this.setProfile(CABINET_HORIZONTAL);
    return CABINET_HORIZONTAL;
  }

  setProfile(profile: CabinetProfile): void {
    this.currentProfile = profile;
    this.updateRotation(profile.rotation);
    devLog(`🎮 Cabinet profile changed to: ${profile.name} (rotation: ${profile.rotation}°)`);
  }

  private updateRotation(degrees: 0 | 90 | 180 | 270): void {
    this.rotationAngle = (degrees * Math.PI) / 180;

    const axis = new THREE.Vector3(0, 0, 1);
    this.rotationQuaternion.setFromAxisAngle(axis, this.rotationAngle);
  }

  getProfile(): CabinetProfile {
    return this.currentProfile;
  }

  getRotationQuaternion(): THREE.Quaternion {
    return this.rotationQuaternion.clone();
  }

  getRotationDegrees(): 0 | 90 | 180 | 270 {
    return this.currentProfile.rotation;
  }

  rotatePlayfield(targetDegrees: 0 | 90 | 180 | 270, duration: number = 600): Promise<void> {
    return new Promise((resolve) => {
      const startDegrees = this.currentProfile.rotation;
      const startTime = Date.now();

      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);

        const easeProgress = progress < 0.5
          ? 2 * progress * progress
          : -1 + (4 - 2 * progress) * progress;

        const currentDegrees = startDegrees + (targetDegrees - startDegrees) * easeProgress;
        this.updateRotation(Math.round(currentDegrees) as 0 | 90 | 180 | 270);

        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          this.currentProfile.rotation = targetDegrees;
          devLog(`🎮 Playfield rotated to ${targetDegrees}°`);
          resolve();
        }
      };

      animate();
    });
  }

  static getAllProfiles(): CabinetProfile[] {
    return [
      CABINET_VERTICAL,
      CABINET_HORIZONTAL,
      CABINET_WIDE,
      CABINET_INVERTED,
    ];
  }

  static getProfileById(id: string): CabinetProfile | null {
    const profiles = this.getAllProfiles();
    return profiles.find(p => p.id === id) || null;
  }

  getDiagnostics(): {
    screenWidth: number;
    screenHeight: number;
    availWidth: number;
    availHeight: number;
    windowWidth: number;
    windowHeight: number;
    devicePixelRatio: number;
    isFullscreen: boolean;
    aspectRatio: string;
    detectedProfile: string;
  } {
    return {
      screenWidth: window.screen.width,
      screenHeight: window.screen.height,
      availWidth: window.screen.availWidth || window.screen.width,
      availHeight: window.screen.availHeight || window.screen.height,
      windowWidth: window.innerWidth,
      windowHeight: window.innerHeight,
      devicePixelRatio: window.devicePixelRatio,
      isFullscreen: !!(document.fullscreenElement || document.webkitFullscreenElement),
      aspectRatio: (window.screen.availWidth / window.screen.availHeight).toFixed(2),
      detectedProfile: this.currentProfile.id,
    };
  }
}
