/**
 * ui-rotation.ts — PHASE 10+ TASK 3: Adaptive UI Rotation
 *
 * Handles UI element rotation and repositioning based on cabinet orientation:
 * - HUD element rotation (Score, Multiplier, Ball Counter)
 * - Controls text rotation
 * - DMD repositioning
 * - Responsive layout adjustments per rotation
 */

import { CabinetProfile } from './cabinet-system';

// ─── UI Rotation Manager ──────────────────────────────────────────────────────
export class UIRotationManager {
  private currentRotation: 0 | 90 | 180 | 270 = 0;
  private hudElement: HTMLElement | null = null;
  private controlsElement: HTMLElement | null = null;
  private dmdWrap: HTMLElement | null = null;
  private scoreDisplay: HTMLElement | null = null;
  private multiplierDisplay: HTMLElement | null = null;
  private ballDisplay: HTMLElement | null = null;

  constructor() {
    this.cacheElements();
    console.log('✓ UI Rotation Manager initialized');
  }

  /**
   * Cache DOM elements for quick access
   */
  private cacheElements(): void {
    this.hudElement = document.getElementById('hud');
    this.controlsElement = document.getElementById('controls');
    this.dmdWrap = document.getElementById('dmd-wrap');
    this.scoreDisplay = document.getElementById('score-display');
    this.multiplierDisplay = document.getElementById('multiplier');
    this.ballDisplay = document.getElementById('ball-display');
  }

  /**
   * Apply UI rotation based on cabinet profile
   */
  applyProfileRotation(profile: CabinetProfile): void {
    this.currentRotation = profile.rotation;

    // Rotate HUD container
    this.rotateHUD(profile.rotation);

    // Reposition UI elements based on profile
    this.repositionElements(profile);

    // Adjust DMD position
    this.repositionDMD(profile);

    console.log(`🎨 UI rotated to ${profile.rotation}°`);
  }

  /**
   * Rotate main HUD container
   */
  private rotateHUD(rotation: 0 | 90 | 180 | 270): void {
    if (!this.hudElement) return;

    // Apply CSS transform rotation
    this.hudElement.style.transform = `rotate(${rotation}deg)`;
    this.hudElement.style.transition = 'transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)';

    // Adjust HUD layout for vertical orientation
    if (rotation === 90 || rotation === 270) {
      this.hudElement.style.flexDirection = 'column';
      this.hudElement.style.width = '100vh';
      this.hudElement.style.height = '100vw';
      this.hudElement.style.top = '50%';
      this.hudElement.style.left = '50%';
      this.hudElement.style.transformOrigin = 'center center';
    } else {
      this.hudElement.style.flexDirection = 'row';
      this.hudElement.style.width = '100vw';
      this.hudElement.style.height = 'auto';
      this.hudElement.style.top = '178px';
      this.hudElement.style.left = '0';
      this.hudElement.style.transformOrigin = 'top center';
    }
  }

  /**
   * Reposition UI elements based on cabinet profile
   */
  private repositionElements(profile: CabinetProfile): void {
    const rotation = profile.rotation;

    switch (rotation) {
      case 0:
        // Standard horizontal layout
        this.positionStandard();
        break;
      case 90:
        // Vertical cabinet (portrait) - rotated left
        this.positionVertical();
        break;
      case 180:
        // Inverted layout
        this.positionInverted();
        break;
      case 270:
        // Vertical cabinet (portrait) - rotated right
        this.positionVertical270();
        break;
    }

    // Apply profile-specific positions
    this.applyProfilePositioning(profile);
  }

  /**
   * Standard horizontal layout (0°)
   */
  private positionStandard(): void {
    if (this.scoreDisplay) {
      this.scoreDisplay.style.order = '0';
    }
    if (this.multiplierDisplay) {
      this.multiplierDisplay.style.order = '2';
    }
    if (this.ballDisplay) {
      this.ballDisplay.style.order = '3';
    }
  }

  /**
   * Vertical layout (90°)
   */
  private positionVertical(): void {
    if (this.scoreDisplay) {
      this.scoreDisplay.style.order = '1';
      this.scoreDisplay.style.transform = 'rotate(-90deg)';
    }
    if (this.multiplierDisplay) {
      this.multiplierDisplay.style.order = '0';
      this.multiplierDisplay.style.transform = 'rotate(-90deg)';
    }
    if (this.ballDisplay) {
      this.ballDisplay.style.order = '2';
      this.ballDisplay.style.transform = 'rotate(-90deg)';
    }
  }

  /**
   * Inverted layout (180°)
   */
  private positionInverted(): void {
    if (this.scoreDisplay) {
      this.scoreDisplay.style.order = '3';
      this.scoreDisplay.style.transform = 'rotate(180deg)';
    }
    if (this.multiplierDisplay) {
      this.multiplierDisplay.style.order = '1';
      this.multiplierDisplay.style.transform = 'rotate(180deg)';
    }
    if (this.ballDisplay) {
      this.ballDisplay.style.order = '0';
      this.ballDisplay.style.transform = 'rotate(180deg)';
    }
  }

  /**
   * Vertical layout rotated right (270°)
   */
  private positionVertical270(): void {
    if (this.scoreDisplay) {
      this.scoreDisplay.style.order = '2';
      this.scoreDisplay.style.transform = 'rotate(90deg)';
    }
    if (this.multiplierDisplay) {
      this.multiplierDisplay.style.order = '3';
      this.multiplierDisplay.style.transform = 'rotate(90deg)';
    }
    if (this.ballDisplay) {
      this.ballDisplay.style.order = '0';
      this.ballDisplay.style.transform = 'rotate(90deg)';
    }
  }

  /**
   * Apply profile-specific positioning
   */
  private applyProfilePositioning(profile: CabinetProfile): void {
    // Apply profile's specific UI positioning preferences
    switch (profile.scorePosition) {
      case 'top-left':
        if (this.scoreDisplay) {
          this.scoreDisplay.style.position = 'absolute';
          this.scoreDisplay.style.left = '20px';
          this.scoreDisplay.style.top = '10px';
        }
        break;
      case 'top-right':
        if (this.scoreDisplay) {
          this.scoreDisplay.style.position = 'absolute';
          this.scoreDisplay.style.right = '20px';
          this.scoreDisplay.style.top = '10px';
        }
        break;
      case 'bottom-left':
        if (this.scoreDisplay) {
          this.scoreDisplay.style.position = 'absolute';
          this.scoreDisplay.style.left = '20px';
          this.scoreDisplay.style.bottom = '10px';
        }
        break;
      case 'bottom-right':
        if (this.scoreDisplay) {
          this.scoreDisplay.style.position = 'absolute';
          this.scoreDisplay.style.right = '20px';
          this.scoreDisplay.style.bottom = '10px';
        }
        break;
      case 'center':
        if (this.scoreDisplay) {
          this.scoreDisplay.style.position = 'absolute';
          this.scoreDisplay.style.left = '50%';
          this.scoreDisplay.style.top = '50%';
          this.scoreDisplay.style.transform = 'translate(-50%, -50%)';
        }
        break;
    }
  }

  /**
   * Reposition DMD (LED Display) based on orientation
   */
  private repositionDMD(profile: CabinetProfile): void {
    if (!this.dmdWrap) return;

    const rotation = profile.rotation;

    switch (rotation) {
      case 0:
        // Standard top-center
        this.dmdWrap.style.top = '8px';
        this.dmdWrap.style.left = '50%';
        this.dmdWrap.style.transform = 'translateX(-50%)';
        break;
      case 90:
        // Left side, vertically centered
        this.dmdWrap.style.top = '50%';
        this.dmdWrap.style.left = '8px';
        this.dmdWrap.style.transform = 'translateY(-50%) rotate(90deg)';
        break;
      case 180:
        // Bottom-center, inverted
        this.dmdWrap.style.top = 'auto';
        this.dmdWrap.style.bottom = '8px';
        this.dmdWrap.style.left = '50%';
        this.dmdWrap.style.transform = 'translateX(-50%) rotate(180deg)';
        break;
      case 270:
        // Right side, vertically centered
        this.dmdWrap.style.top = '50%';
        this.dmdWrap.style.left = 'auto';
        this.dmdWrap.style.right = '8px';
        this.dmdWrap.style.transform = 'translateY(-50%) rotate(270deg)';
        break;
    }
  }

  /**
   * Rotate controls text
   */
  rotateControls(rotation: 0 | 90 | 180 | 270): void {
    if (!this.controlsElement) return;

    this.controlsElement.style.transform = `rotate(${rotation}deg)`;
    this.controlsElement.style.transition = 'transform 0.6s ease-in-out';
  }

  /**
   * Get current rotation
   */
  getCurrentRotation(): 0 | 90 | 180 | 270 {
    return this.currentRotation;
  }

  /**
   * Reset UI to default state
   */
  reset(): void {
    if (this.hudElement) {
      this.hudElement.style.transform = 'rotate(0deg)';
      this.hudElement.style.flexDirection = 'row';
    }
    if (this.controlsElement) {
      this.controlsElement.style.transform = 'rotate(0deg)';
    }
    if (this.dmdWrap) {
      this.dmdWrap.style.transform = 'translateX(-50%)';
      this.dmdWrap.style.left = '50%';
      this.dmdWrap.style.top = '8px';
    }
    this.currentRotation = 0;
  }

  /**
   * Dispose resources
   */
  dispose(): void {
    this.cacheElements();
  }
}

// ─── Public API ────────────────────────────────────────────────────────────
let uiRotationManager: UIRotationManager | null = null;

export function initializeUIRotation(): UIRotationManager {
  if (!uiRotationManager) {
    uiRotationManager = new UIRotationManager();
  }
  return uiRotationManager;
}

export function getUIRotationManager(): UIRotationManager | null {
  return uiRotationManager;
}

export function applyUIRotation(profile: CabinetProfile): void {
  if (!uiRotationManager) {
    uiRotationManager = new UIRotationManager();
  }
  uiRotationManager.applyProfileRotation(profile);
}

export function resetUIRotation(): void {
  if (uiRotationManager) {
    uiRotationManager.reset();
  }
}
