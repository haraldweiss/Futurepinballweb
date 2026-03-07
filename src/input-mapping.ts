/**
 * input-mapping.ts — PHASE 10+ TASK 5: Flipper & Input Mapping
 *
 * Handles input remapping based on playfield rotation:
 * - Keyboard input mapping (LEFT/RIGHT Shift)
 * - Touch controls repositioning
 * - Flipper physics body orientation correction
 * - Plunger mechanics adaptation
 */

import { CabinetProfile } from './cabinet-system';

// ─── Input Mapping Manager ────────────────────────────────────────────────────
export class InputMappingManager {
  private currentRotation: 0 | 90 | 180 | 270 = 0;
  private currentProfile: CabinetProfile | null = null;

  // Touch element references
  private touchLeftBtn: HTMLElement | null = null;
  private touchRightBtn: HTMLElement | null = null;
  private touchPlungerBtn: HTMLElement | null = null;

  constructor() {
    this.cacheTouchElements();
    console.log('✓ Input Mapping Manager initialized');
  }

  /**
   * Cache touch control elements
   */
  private cacheTouchElements(): void {
    this.touchLeftBtn = document.getElementById('touch-left');
    this.touchRightBtn = document.getElementById('touch-right');
    this.touchPlungerBtn = document.getElementById('touch-plunger');
  }

  /**
   * Apply input mapping for cabinet profile
   */
  applyProfileMapping(profile: CabinetProfile): void {
    this.currentProfile = profile;
    this.currentRotation = profile.rotation;

    // Update touch controls positioning
    this.repositionTouchControls(profile.rotation);

    console.log(`🎮 Input mapping applied for rotation ${profile.rotation}°`);
  }

  /**
   * Reposition touch controls based on rotation
   */
  private repositionTouchControls(rotation: 0 | 90 | 180 | 270): void {
    switch (rotation) {
      case 0:
        // Standard: Left on bottom-left, Right on bottom-right
        this.repositionTouchStandard();
        break;
      case 90:
        // Vertical: Flippers on sides, adjusted for portrait
        this.repositionTouchVertical();
        break;
      case 180:
        // Inverted: Swapped positions
        this.repositionTouchInverted();
        break;
      case 270:
        // Vertical rotated: Right side controls
        this.repositionTouchVertical270();
        break;
    }
  }

  /**
   * Standard horizontal layout (0°)
   */
  private repositionTouchStandard(): void {
    if (this.touchLeftBtn) {
      this.touchLeftBtn.style.left = '16px';
      this.touchLeftBtn.style.right = 'auto';
      this.touchLeftBtn.style.bottom = '30px';
      this.touchLeftBtn.style.transform = 'rotate(0deg)';
    }
    if (this.touchRightBtn) {
      this.touchRightBtn.style.right = '16px';
      this.touchRightBtn.style.left = 'auto';
      this.touchRightBtn.style.bottom = '30px';
      this.touchRightBtn.style.transform = 'rotate(0deg)';
    }
    if (this.touchPlungerBtn) {
      this.touchPlungerBtn.style.left = '50%';
      this.touchPlungerBtn.style.bottom = '30px';
      this.touchPlungerBtn.style.transform = 'translateX(-50%)';
    }
  }

  /**
   * Vertical layout (90°)
   */
  private repositionTouchVertical(): void {
    if (this.touchLeftBtn) {
      this.touchLeftBtn.style.left = '16px';
      this.touchLeftBtn.style.top = '50%';
      this.touchLeftBtn.style.bottom = 'auto';
      this.touchLeftBtn.style.transform = 'translateY(-50%) rotate(90deg)';
    }
    if (this.touchRightBtn) {
      this.touchRightBtn.style.right = '16px';
      this.touchRightBtn.style.left = 'auto';
      this.touchRightBtn.style.top = '50%';
      this.touchRightBtn.style.bottom = 'auto';
      this.touchRightBtn.style.transform = 'translateY(-50%) rotate(90deg)';
    }
    if (this.touchPlungerBtn) {
      this.touchPlungerBtn.style.left = '50%';
      this.touchPlungerBtn.style.top = '16px';
      this.touchPlungerBtn.style.bottom = 'auto';
      this.touchPlungerBtn.style.transform = 'translateX(-50%) rotate(90deg)';
    }
  }

  /**
   * Inverted layout (180°)
   */
  private repositionTouchInverted(): void {
    if (this.touchLeftBtn) {
      this.touchLeftBtn.style.left = 'auto';
      this.touchLeftBtn.style.right = '16px';
      this.touchLeftBtn.style.bottom = '30px';
      this.touchLeftBtn.style.transform = 'rotate(180deg)';
    }
    if (this.touchRightBtn) {
      this.touchRightBtn.style.left = '16px';
      this.touchRightBtn.style.right = 'auto';
      this.touchRightBtn.style.bottom = '30px';
      this.touchRightBtn.style.transform = 'rotate(180deg)';
    }
    if (this.touchPlungerBtn) {
      this.touchPlungerBtn.style.left = '50%';
      this.touchPlungerBtn.style.bottom = '30px';
      this.touchPlungerBtn.style.transform = 'translateX(-50%) rotate(180deg)';
    }
  }

  /**
   * Vertical layout rotated right (270°)
   */
  private repositionTouchVertical270(): void {
    if (this.touchLeftBtn) {
      this.touchLeftBtn.style.left = 'auto';
      this.touchLeftBtn.style.right = '16px';
      this.touchLeftBtn.style.top = '50%';
      this.touchLeftBtn.style.bottom = 'auto';
      this.touchLeftBtn.style.transform = 'translateY(-50%) rotate(270deg)';
    }
    if (this.touchRightBtn) {
      this.touchRightBtn.style.left = '16px';
      this.touchRightBtn.style.right = 'auto';
      this.touchRightBtn.style.top = '50%';
      this.touchRightBtn.style.bottom = 'auto';
      this.touchRightBtn.style.transform = 'translateY(-50%) rotate(270deg)';
    }
    if (this.touchPlungerBtn) {
      this.touchPlungerBtn.style.left = '50%';
      this.touchPlungerBtn.style.top = 'auto';
      this.touchPlungerBtn.style.bottom = '30px';
      this.touchPlungerBtn.style.transform = 'translateX(-50%) rotate(270deg)';
    }
  }

  /**
   * Get flipper correction angles based on rotation
   * Used to adjust flipper physics bodies for correct orientation
   */
  getFlipperCorrectionAngles(): {
    leftAngle: number;
    rightAngle: number;
  } {
    const rotation = this.currentRotation;

    // Standard angles (0°)
    let leftAngle = 0;
    let rightAngle = 0;

    switch (rotation) {
      case 90:
        // Vertical: rotate 90° counterclockwise
        leftAngle = Math.PI / 2;
        rightAngle = Math.PI / 2;
        break;
      case 180:
        // Inverted: rotate 180°
        leftAngle = Math.PI;
        rightAngle = Math.PI;
        break;
      case 270:
        // Vertical rotated: rotate 270° (or -90°)
        leftAngle = (3 * Math.PI) / 2;
        rightAngle = (3 * Math.PI) / 2;
        break;
      case 0:
      default:
        // Standard horizontal
        break;
    }

    return {
      leftAngle,
      rightAngle,
    };
  }

  /**
   * Get plunger orientation adjustment
   * Some cabinet orientations require plunger positioning adjustments
   */
  getPlungerAdjustment(): {
    baseY: number;  // Base Y position
    chargeAmount: number;  // How much plunger moves when charging
    direction: 'vertical' | 'horizontal';  // Plunger direction
  } {
    const rotation = this.currentRotation;

    switch (rotation) {
      case 90:
        return {
          baseY: -5.0,  // Adjusted for vertical layout
          chargeAmount: 0.7,
          direction: 'vertical',
        };
      case 180:
        return {
          baseY: -5.0,
          chargeAmount: 0.7,
          direction: 'vertical',
        };
      case 270:
        return {
          baseY: -5.0,
          chargeAmount: 0.7,
          direction: 'vertical',
        };
      case 0:
      default:
        return {
          baseY: -5.0,
          chargeAmount: 0.7,
          direction: 'vertical',
        };
    }
  }

  /**
   * Validate input based on rotation
   * Ensures inputs are still valid for current orientation
   */
  isInputValid(inputType: 'left-flipper' | 'right-flipper' | 'plunger'): boolean {
    // All inputs are valid in all rotations
    // This can be extended for special handling if needed
    return true;
  }

  /**
   * Get current rotation
   */
  getCurrentRotation(): 0 | 90 | 180 | 270 {
    return this.currentRotation;
  }

  /**
   * Reset input mapping to defaults
   */
  reset(): void {
    this.repositionTouchStandard();
    this.currentRotation = 0;
    console.log('✓ Input mapping reset to defaults');
  }

  /**
   * Dispose resources
   */
  dispose(): void {
    this.cacheTouchElements();
  }
}

// ─── Public API ────────────────────────────────────────────────────────────
let inputMappingManager: InputMappingManager | null = null;

export function initializeInputMapping(): InputMappingManager {
  if (!inputMappingManager) {
    inputMappingManager = new InputMappingManager();
  }
  return inputMappingManager;
}

export function getInputMappingManager(): InputMappingManager | null {
  return inputMappingManager;
}

export function applyInputMapping(profile: CabinetProfile): void {
  if (!inputMappingManager) {
    inputMappingManager = new InputMappingManager();
  }
  inputMappingManager.applyProfileMapping(profile);
}

export function getFlipperCorrectionAngles(): {
  leftAngle: number;
  rightAngle: number;
} {
  if (!inputMappingManager) {
    return { leftAngle: 0, rightAngle: 0 };
  }
  return inputMappingManager.getFlipperCorrectionAngles();
}

export function getPlungerAdjustment(): {
  baseY: number;
  chargeAmount: number;
  direction: 'vertical' | 'horizontal';
} {
  if (!inputMappingManager) {
    return {
      baseY: -5.0,
      chargeAmount: 0.7,
      direction: 'vertical',
    };
  }
  return inputMappingManager.getPlungerAdjustment();
}

export function resetInputMapping(): void {
  if (inputMappingManager) {
    inputMappingManager.reset();
  }
}
