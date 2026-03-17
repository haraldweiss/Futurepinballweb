/**
 * cabinet-system.ts — PHASE 10+: Cabinet Modus mit Rotation
 *
 * Handles arcade cabinet profiles and rotations:
 * - Vertical/Horizontal/Wide screen layouts
 * - 0°/90°/180°/270° playfield rotations
 * - Auto-detection of monitor orientation
 * - Cabinet-specific camera and flipper configurations
 */

import * as THREE from 'three';

// ─── Cabinet Profile Interface ─────────────────────────────────────────────
export interface CabinetProfile {
  id: string;
  name: string;
  rotation: 0 | 90 | 180 | 270;  // Playfield rotation in degrees
  screenRatio: 'vertical' | 'horizontal' | 'wide';
  flipperLayout: 'standard' | 'rotated';
  description: string;

  // Camera positioning (world space)
  cameraPosition: { x: number; y: number; z: number };
  cameraLookAt: { x: number; y: number; z: number };
  cameraFOV: number;

  // UI positioning (screen space, as percentages)
  scorePosition: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';
  multiplierPosition: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  ballCounterPosition: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

  // Input mapping
  leftFlipperKey: string;
  rightFlipperKey: string;
}

// ─── Cabinet Profiles ──────────────────────────────────────────────────────
/**
 * Standard upright cabinet with vertical monitor (portrait mode)
 * Perfect for authentic arcade cabinet experience
 */
export const CABINET_VERTICAL: CabinetProfile = {
  id: 'vertical',
  name: 'Vertikal Upright (Portrait)',
  rotation: 90,
  screenRatio: 'vertical',
  flipperLayout: 'rotated',
  description: 'Authentisches arcade Automaten-Layout mit vertikalem Monitor',

  cameraPosition: { x: 0, y: -8, z: 16 },
  cameraLookAt: { x: 0, y: 0, z: 0 },
  cameraFOV: 60,

  scorePosition: 'top-left',
  multiplierPosition: 'top-right',
  ballCounterPosition: 'bottom-right',

  leftFlipperKey: 'Shift',  // Left shift key
  rightFlipperKey: 'Shift',  // Right shift key
};

/**
 * Standard horizontal arcade cabinet
 * Wide playfield, typical for modern cabinets
 */
export const CABINET_HORIZONTAL: CabinetProfile = {
  id: 'horizontal',
  name: 'Horizontal Upright (Landscape)',
  rotation: 0,
  screenRatio: 'horizontal',
  flipperLayout: 'standard',
  description: 'Standard arcade Automaten-Layout mit horizontalem Monitor',

  cameraPosition: { x: 0, y: -9.5, z: 14 },
  cameraLookAt: { x: 0, y: 0.5, z: 0 },
  cameraFOV: 58,

  scorePosition: 'top-left',
  multiplierPosition: 'top-right',
  ballCounterPosition: 'bottom-left',

  leftFlipperKey: 'Shift',
  rightFlipperKey: 'Shift',
};

/**
 * Wide screen cabinet (21:9 or similar ultra-wide)
 * Extended side viewports for immersion
 */
export const CABINET_WIDE: CabinetProfile = {
  id: 'wide',
  name: 'Ultrawide (21:9+)',
  rotation: 0,
  screenRatio: 'wide',
  flipperLayout: 'standard',
  description: 'Ultrawide Monitor für immersives Spielerlebnis',

  cameraPosition: { x: 0, y: -10, z: 12 },
  cameraLookAt: { x: 0, y: 0.5, z: 0 },
  cameraFOV: 65,

  scorePosition: 'center',
  multiplierPosition: 'top-right',
  ballCounterPosition: 'top-left',

  leftFlipperKey: 'Shift',
  rightFlipperKey: 'Shift',
};

/**
 * Rotated 180° view (upside-down, for some international cabinets)
 */
export const CABINET_INVERTED: CabinetProfile = {
  id: 'inverted',
  name: 'Rotated 180° (Invertiert)',
  rotation: 180,
  screenRatio: 'horizontal',
  flipperLayout: 'rotated',
  description: '180° gedrehter Spielfeldblick',

  cameraPosition: { x: 0, y: -9.5, z: -14 },
  cameraLookAt: { x: 0, y: 0.5, z: 0 },
  cameraFOV: 58,

  scorePosition: 'bottom-right',
  multiplierPosition: 'bottom-left',
  ballCounterPosition: 'top-right',

  leftFlipperKey: 'Shift',
  rightFlipperKey: 'Shift',
};

// ─── Cabinet System ────────────────────────────────────────────────────────
export class CabinetSystem {
  private currentProfile: CabinetProfile = CABINET_HORIZONTAL;
  private rotationQuaternion: THREE.Quaternion = new THREE.Quaternion();
  private rotationAngle: number = 0;  // Current rotation in radians

  constructor() {
    console.log('✓ Cabinet System initialized');
  }

  /**
   * Auto-detect cabinet profile based on actual monitor dimensions
   * Uses window.screen (physical monitor) not window.inner (browser window)
   * Default to HORIZONTAL (0° rotation) - safest option
   */
  autoDetectProfile(): CabinetProfile {
    // Use actual monitor resolution (window.screen)
    // Not browser window size (window.inner)
    const screenWidth = window.screen.width;
    const screenHeight = window.screen.height;

    // Also try to get the actual available screen area (excludes taskbars, etc.)
    const availWidth = window.screen.availWidth || screenWidth;
    const availHeight = window.screen.availHeight || screenHeight;

    // Use available dimensions for more accurate detection
    const width = availWidth > 0 ? availWidth : screenWidth;
    const height = availHeight > 0 ? availHeight : screenHeight;

    const aspectRatio = width / height;

    console.log(`🎮 Cabinet auto-detect:`);
    console.log(`   Monitor: ${screenWidth}x${screenHeight} | Available: ${width}x${height} | Aspect: ${aspectRatio.toFixed(2)}`);

    // Ultra-wide: 21:9 or wider (>2.3) - best for ultrawide monitors
    if (aspectRatio > 2.3) {
      console.log(`🎮 → Ultrawide detected (>2.3), using WIDE profile (0°)`);
      this.setProfile(CABINET_WIDE);
      return CABINET_WIDE;
    }

    // Vertical portrait: < 0.75 ratio - true portrait displays
    if (aspectRatio < 0.75) {
      console.log(`🎮 → Vertical/Portrait detected (<0.75), using VERTICAL profile (90°)`);
      this.setProfile(CABINET_VERTICAL);
      return CABINET_VERTICAL;
    }

    // DEFAULT: Standard horizontal (0.75-2.3) - NO ROTATION
    // This is the safest default for most displays
    console.log(`🎮 → Standard horizontal detected, using HORIZONTAL profile (0° - NO ROTATION)`);
    this.setProfile(CABINET_HORIZONTAL);
    return CABINET_HORIZONTAL;
  }

  /**
   * Set active cabinet profile
   */
  setProfile(profile: CabinetProfile): void {
    this.currentProfile = profile;
    this.updateRotation(profile.rotation);
    console.log(`🎮 Cabinet profile changed to: ${profile.name} (rotation: ${profile.rotation}°)`);
  }

  /**
   * Update playfield rotation
   */
  private updateRotation(degrees: 0 | 90 | 180 | 270): void {
    // Convert degrees to radians
    this.rotationAngle = (degrees * Math.PI) / 180;

    // Create rotation quaternion (rotate around Z-axis at playfield center)
    const axis = new THREE.Vector3(0, 0, 1);  // Z-axis
    this.rotationQuaternion.setFromAxisAngle(axis, this.rotationAngle);
  }

  /**
   * Get current profile
   */
  getProfile(): CabinetProfile {
    return this.currentProfile;
  }

  /**
   * Get rotation as quaternion (for Three.js)
   */
  getRotationQuaternion(): THREE.Quaternion {
    return this.rotationQuaternion.clone();
  }

  /**
   * Get rotation in degrees
   */
  getRotationDegrees(): 0 | 90 | 180 | 270 {
    return this.currentProfile.rotation;
  }

  /**
   * Rotate playfield by specified degrees (animated transition)
   */
  rotatePlayfield(targetDegrees: 0 | 90 | 180 | 270, duration: number = 600): Promise<void> {
    return new Promise((resolve) => {
      const startDegrees = this.currentProfile.rotation;
      const startTime = Date.now();

      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);

        // Smooth easing (ease-in-out)
        const easeProgress = progress < 0.5
          ? 2 * progress * progress
          : -1 + (4 - 2 * progress) * progress;

        const currentDegrees = startDegrees + (targetDegrees - startDegrees) * easeProgress;
        this.updateRotation(Math.round(currentDegrees) as any);

        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          this.currentProfile.rotation = targetDegrees;
          console.log(`🎮 Playfield rotated to ${targetDegrees}°`);
          resolve();
        }
      };

      animate();
    });
  }

  /**
   * Get all available profiles
   */
  static getAllProfiles(): CabinetProfile[] {
    return [
      CABINET_VERTICAL,
      CABINET_HORIZONTAL,
      CABINET_WIDE,
      CABINET_INVERTED,
    ];
  }

  /**
   * Get profile by ID
   */
  static getProfileById(id: string): CabinetProfile | null {
    const profiles = this.getAllProfiles();
    return profiles.find(p => p.id === id) || null;
  }

  /**
   * Get diagnostic info for debugging display detection
   */
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
      isFullscreen: !!(document.fullscreenElement || (document as any).webkitFullscreenElement),
      aspectRatio: (window.screen.availWidth / window.screen.availHeight).toFixed(2),
      detectedProfile: this.currentProfile.id,
    };
  }
}

// ─── Public API ────────────────────────────────────────────────────────────
let cabinetSystem: CabinetSystem | null = null;

export function initializeCabinetSystem(): CabinetSystem {
  if (!cabinetSystem) {
    cabinetSystem = new CabinetSystem();
  }
  return cabinetSystem;
}

export function getCabinetSystem(): CabinetSystem | null {
  return cabinetSystem;
}

export function getActiveCabinetProfile(): CabinetProfile {
  if (!cabinetSystem) {
    cabinetSystem = new CabinetSystem();
  }
  return cabinetSystem.getProfile();
}

export function setActiveCabinetProfile(profileId: string): boolean {
  const profile = CabinetSystem.getProfileById(profileId);
  if (!profile) return false;

  if (!cabinetSystem) {
    cabinetSystem = new CabinetSystem();
  }
  cabinetSystem.setProfile(profile);
  return true;
}

export function rotatePlayfieldTo(degrees: 0 | 90 | 180 | 270, duration?: number): Promise<void> {
  if (!cabinetSystem) {
    cabinetSystem = new CabinetSystem();
  }
  return cabinetSystem.rotatePlayfield(degrees, duration);
}

export function getCabinetDiagnostics() {
  if (!cabinetSystem) {
    cabinetSystem = new CabinetSystem();
  }
  return cabinetSystem.getDiagnostics();
}
