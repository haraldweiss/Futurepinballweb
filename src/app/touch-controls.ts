/**
 * touch-controls.ts — Enhanced on-screen touch button bindings for mobile/tablet play.
 *
 * Shows touch-left, touch-right, and touch-plunger buttons on touch-capable
 * devices with professional-grade visual feedback, pressure sensitivity, and haptic integration.
 *
 * Enhanced version with:
 * - Visual feedback states (idle/pressed/hover)
 * - Pressure-sensitive flippers (3 power levels)
 * - Haptic feedback integration
 * - Smooth animations and transitions
 * - Touch-friendly sizing and positioning
 * Extracted from main.ts IIFE (Phase 8).
 */
import { keys, state, physics } from '../game';
import { getAudioCtx, playSound, startBGMusic } from '../audio-system';
import { devLog } from '../utils/dev-log';
import { getInputOptimizer } from '../input-optimizer';

/**
 * Typed interface for touch button DOM elements with custom state properties.
 * Avoids casting to `any` for accessing touchState and powerLevel.
 */
interface TouchButtonElement extends HTMLElement {
  touchState: string;
  powerLevel: number;
}

/**
 * Safe cast helper — returns the element as TouchButtonElement.
 * The actual DOM element has these properties set at runtime.
 */
function asTouchButton(el: HTMLElement | Element | null): TouchButtonElement {
  return el as unknown as TouchButtonElement;
}

/**
 * Touch control visual states for enhanced user experience
 */
const TOUCH_STATES = {
  IDLE: 'idle',
  PRESSED: 'pressed', 
  HOVER: 'hover'
} as const;

/**
 * Flipper power levels based on touch pressure/duration
 */
const FLIPPER_POWER_LEVELS = {
  LIGHT: 0.4,    // Gentle tap for precision shots
  MEDIUM: 0.8,   // Normal play for regular shots
  HEAVY: 1.0     // Full power for maximum effect
} as const;

/**
 * Haptic feedback patterns for tactile response
 */
const HAPTIC_PATTERNS = {
  LIGHT_TAP: 10,      // Subtle feedback for light touches
  FLIPPER_PRESS: 50,   // Medium vibration for flipper activation
  FLIPPER_RELEASE: 30, // Soft release feedback
  PLUNGER_CHARGE: 80,  // Stronger vibration for plunger charging
  SUCCESS: 40,        // Confirmation feedback for actions
} as const;

/**
 * Enhanced touch controls for mobile/tablet devices.
 * Provides professional-grade touch experience with visual feedback, pressure sensitivity, and haptic integration.
 * Idempotent — safe to call multiple times.
 */
export function initTouchControls(): void {
  if (!('ontouchstart' in window) && navigator.maxTouchPoints < 1) return;

  // Initialize haptic feedback capabilities
  const hapticSupported = 'vibrate' in navigator;

  // Show touch buttons with enhanced styling
  ['touch-left', 'touch-right', 'touch-plunger'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.style.display = 'flex';
      // Apply touch-friendly styling for better mobile experience
      el.style.touchAction = 'manipulation'; // Prevents double-tap zoom
      (el.style as CSSStyleDeclaration & { webkitTapHighlightColor: string }).webkitTapHighlightColor = 'transparent'; // Remove iOS highlight
      
      // Set up for enhanced visual feedback
      asTouchButton(el).touchState = TOUCH_STATES.IDLE;
      asTouchButton(el).powerLevel = FLIPPER_POWER_LEVELS.MEDIUM;
      
      // Add touch-friendly sizing for mobile
      if ('ontouchstart' in window) {
        el.style.minWidth = '60px';
        el.style.minHeight = '60px';
        el.style.fontSize = '18px';
        el.style.borderRadius = '12px';
      }
    }
  });

  // Create enhanced flipper button with visual feedback
  const createEnhancedFlipper = (id: string, side: 'left' | 'right') => {
    const el = document.getElementById(id);
    if (!el) return;

    // Track touch state for visual feedback
    let touchStartTime = 0;
    let powerLevel: number = FLIPPER_POWER_LEVELS.MEDIUM;
    let isTouchActive = false;
    const optimizer = getInputOptimizer();

    // Enhanced touchstart with pressure detection
    el.addEventListener('touchstart', (e) => {
      e.preventDefault();
      touchStartTime = Date.now();
      isTouchActive = true;
      
      // Detect pressure level based on touch duration
      const duration = Date.now() - touchStartTime;
      powerLevel = duration > 300 ? FLIPPER_POWER_LEVELS.HEAVY : 
                  duration > 150 ? FLIPPER_POWER_LEVELS.MEDIUM : 
                  FLIPPER_POWER_LEVELS.LIGHT;

      // Set visual state to pressed
      asTouchButton(el).touchState = TOUCH_STATES.PRESSED;
      el.classList.add('touch-pressed');
      
      // Apply haptic feedback for flip operation
      if ('vibrate' in navigator) {
        navigator.vibrate(HAPTIC_PATTERNS.FLIPPER_PRESS);
      }

      // Use InputOptimizer for integrated input handling
      optimizer.processTouchFlipperPress(side, powerLevel);
      keys[side] = true;
      asTouchButton(el).powerLevel = powerLevel;
      getAudioCtx();
      playSound('flipper');

      console.log(`🎮 Flipper ${side} activated with power: ${powerLevel}`);
    }, { passive: false });

    // Enhanced touchend with smooth transition
    el.addEventListener('touchend', (e) => {
      e.preventDefault();
      if (!isTouchActive) return;
      
      isTouchActive = false;
      
      // Set visual state back to idle with hover
      asTouchButton(el).touchState = TOUCH_STATES.HOVER;
      el.classList.remove('touch-pressed');
      
      // Apply light haptic feedback for release
      if ('vibrate' in navigator) {
        navigator.vibrate(HAPTIC_PATTERNS.FLIPPER_RELEASE);
      }

      // Use InputOptimizer for integrated input handling
      optimizer.processTouchFlipperRelease(side);
      keys[side] = false;
      
      // Add brief hover state before returning to idle
      setTimeout(() => {
        if (asTouchButton(el).touchState === TOUCH_STATES.HOVER) {
          asTouchButton(el).touchState = TOUCH_STATES.IDLE;
        }
      }, 100);
    }, { passive: false });

    // Handle mouse events for desktop testing
    el.addEventListener('mousedown', (e) => {
      e.preventDefault();
      asTouchButton(el).touchState = TOUCH_STATES.PRESSED;
      el.classList.add('touch-pressed');
      keys[side] = true;
      asTouchButton(el).powerLevel = FLIPPER_POWER_LEVELS.MEDIUM;
    });

    el.addEventListener('mouseup', (e) => {
      e.preventDefault();
      asTouchButton(el).touchState = TOUCH_STATES.HOVER;
      el.classList.remove('touch-pressed');
      keys[side] = false;
      setTimeout(() => {
        if (asTouchButton(el).touchState === TOUCH_STATES.HOVER) {
          asTouchButton(el).touchState = TOUCH_STATES.IDLE;
        }
      }, 100);
    });

    // Handle touch cancellation
    el.addEventListener('touchcancel', () => {
      asTouchButton(el).touchState = TOUCH_STATES.IDLE;
      el.classList.remove('touch-pressed');
      isTouchActive = false;
      if (side === 'left') keys.left = false;
      if (side === 'right') keys.right = false;
    });

    // Add hover states for desktop accessibility
    el.addEventListener('mouseenter', () => {
      if (!isTouchActive) {
        asTouchButton(el).touchState = TOUCH_STATES.HOVER;
      }
    });

    el.addEventListener('mouseleave', () => {
      asTouchButton(el).touchState = TOUCH_STATES.IDLE;
    });
  };

  createEnhancedFlipper('touch-left', 'left');
  createEnhancedFlipper('touch-right', 'right');

  // Enhanced plunger button with charging visualization
  const createEnhancedPlunger = () => {
    const plBtn = document.getElementById('touch-plunger');
    if (!plBtn) return;

    let isCharging = false;
    let chargeStartTime = 0;
    let chargeLevel = 0;

    // Apply enhanced plunger styling
    plBtn.style.position = 'relative';
    plBtn.style.transition = 'all 0.3s ease';

    // Enhanced touchstart for plunger charging
    plBtn.addEventListener('touchstart', (e) => {
      e.preventDefault();
      if (state.inLane && !state.plungerCharging) {
        isCharging = true;
        chargeStartTime = Date.now();
        state.plungerCharging = true;
        
        // Visual feedback for charging
        plBtn.classList.add('plunger-charging');
        asTouchButton(plBtn).touchState = TOUCH_STATES.PRESSED;
        
        // Apply stronger haptic feedback for plunger activation
        if ('vibrate' in navigator) {
          navigator.vibrate(HAPTIC_PATTERNS.PLUNGER_CHARGE);
        }
        
        console.log('🎮 Plunger charging started');
      }
    }, { passive: false });

    // Enhanced touchend for plunger launch with charge calculation
    plBtn.addEventListener('touchend', (e) => {
      e.preventDefault();
      if (isCharging && state.inLane && state.plungerCharging) {
        isCharging = false;
        const chargeTime = Date.now() - chargeStartTime;
        
        // Calculate charge level (0.0 to 1.0) based on charge time
        chargeLevel = Math.min(1.0, chargeTime / 500); // Max 500ms for full charge
        
        state.plungerCharging = false;
        
        // Visual feedback for launch
        plBtn.classList.remove('plunger-charging');
        asTouchButton(plBtn).touchState = TOUCH_STATES.HOVER;
        
        // Apply success haptic feedback
        if ('vibrate' in navigator) {
          navigator.vibrate(HAPTIC_PATTERNS.SUCCESS);
        }
        
        state.inLane = false;
        state.plungerCharge = chargeLevel;
        state.ballSaveTimer = 3.5;

        console.log(`🎮 Plunger launched with power: ${chargeLevel.toFixed(2)} (${(chargeLevel * 100).toFixed(0)}%)`);

        if (physics) {
          physics.ballBody.setGravityScale(1.0, true);
          physics.ballBody.setTranslation({ x: 2.65, y: -5.0, z: 0 }, true);
          physics.ballBody.setLinvel({ x: 0, y: 16.0 + chargeLevel * 14.0, z: 0 }, true);
        }
        playSound('bumper');
        startBGMusic();
        
        console.log(`⚡ LAUNCHED! (${(chargeLevel * 100).toFixed(0)}%)`);
      }
    }, { passive: false });

    // Handle touch cancellation
    plBtn.addEventListener('touchcancel', () => {
      isCharging = false;
      if (state.plungerCharging) {
        state.plungerCharging = false;
        state.plungerCharge = 0;
      }
      plBtn.classList.remove('plunger-charging');
      asTouchButton(plBtn).touchState = TOUCH_STATES.IDLE;
    });
  };

  createEnhancedPlunger();

  // Initialize haptic capabilities detection
  if ('vibrate' in navigator) {
    devLog('[Touch Controls] Haptic feedback supported');
  } else {
    devLog('[Touch Controls] Haptic feedback not available');
  }

  console.log('🎮 Enhanced touch controls initialized');
}

/**
 * Helper function to get current touch state for a button
 */
export function getTouchState(buttonId: string): string {
  const el = document.getElementById(buttonId);
  return el ? asTouchButton(el).touchState || TOUCH_STATES.IDLE : TOUCH_STATES.IDLE;
}

/**
 * Check if touch controls are active (device supports touch)
 */
export function isTouchActive(): boolean {
  return 'ontouchstart' in window || navigator.maxTouchPoints >= 1;
}

/**
 * CSS styles for enhanced touch controls
 * These styles should be added to your global CSS or included in the project
 */
const styleId = 'enhanced-touch-styles';
if (!document.getElementById(styleId)) {
  const style = document.createElement('style');
  style.id = styleId;
  style.textContent = `
    /* Enhanced touch button styling */
    .touch-left, .touch-right, .touch-plunger {
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      transform: translateZ(0);
      will-change: transform, opacity;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
      border-radius: 12px;
      background: linear-gradient(135deg, #4CAF50, #45a049);
      color: white;
      font-weight: 600;
      font-size: 16px;
      border: none;
      cursor: pointer;
    }
    
    /* Pressed state with visual feedback */
    .touch-left.touch-pressed, .touch-right.touch-pressed {
      transform: scale(0.95);
      opacity: 0.9;
      box-shadow: 0 1px 4px rgba(0, 0, 0, 0.25);
      background: linear-gradient(135deg, #45a049, #3d8f3d);
    }
    
    /* Plunger charging state */
    .touch-plunger.plunger-charging {
      animation: plungerPulse 0.5s ease-in-out infinite;
      background: linear-gradient(135deg, #2196F3, #1976D2);
    }
    
    /* Keyframe animations */
    @keyframes plungerPulse {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.05); }
    }
    
    /* Hover state for desktop */
    .touch-left:hover, .touch-right:hover, .touch-plunger:hover {
      transform: scale(1.05);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
      background: linear-gradient(135deg, #45a049, #3d8f3d);
    }
    
    /* Active touch state */
    .touch-left:active, .touch-right:active, .touch-plunger:active {
      transform: scale(0.98);
    }
    
    /* Mobile-specific optimizations */
    @media (hover: none) and (pointer: coarse) {
      .touch-left, .touch-right, .touch-plunger {
        min-width: 80px;
        min-height: 80px;
        font-size: 24px;
        border-radius: 16px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
      }
    }
  `;
  document.head.appendChild(style);
}

/* Initialize touch enhancement styles */
if ('ontouchstart' in window || navigator.maxTouchPoints >= 1) {
  setTimeout(() => {
    const style = document.getElementById('enhanced-touch-styles');
    if (style) {
      console.log('🎮 Enhanced touch control styles loaded');
    }
  }, 100);
}
