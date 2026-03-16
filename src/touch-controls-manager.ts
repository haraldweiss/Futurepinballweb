/**
 * touch-controls-manager.ts — Mobile/Tablet touch input
 * Phase 29: Touch Controls for Mobile Devices
 * 
 * Enables flip and plunger controls via touch/swipe
 * Responsive zones for various screen sizes
 */

/**
 * Touch Controls Manager - Handle mobile/tablet input
 */
export class TouchControlsManager {
  private enabled: boolean = true;
  private leftFlipperActive: boolean = false;
  private rightFlipperActive: boolean = false;
  private plungerTouching: boolean = false;
  private plungerStartY: number = 0;
  private plungerCurrentY: number = 0;

  // Touch zone boundaries (responsive)
  private leftFlipperZone = { x: 0, y: 0, width: 0, height: 0 };
  private rightFlipperZone = { x: 0, y: 0, width: 0, height: 0 };
  private plungerZone = { x: 0, y: 0, width: 0, height: 0 };

  // Callbacks
  private onLeftFlipperPress: (() => void) | null = null;
  private onLeftFlipperRelease: (() => void) | null = null;
  private onRightFlipperPress: (() => void) | null = null;
  private onRightFlipperRelease: (() => void) | null = null;
  private onPlungerChange: ((power: number) => void) | null = null;

  // Visual feedback
  private touchIndicators: Map<number, HTMLElement> = new Map();

  constructor() {
    this.setupTouchZones();
    this.setupEventListeners();
    console.log('[Touch Controls] ✓ Initialized');
  }

  /**
   * Setup responsive touch zones based on screen size
   */
  private setupTouchZones(): void {
    const w = window.innerWidth;
    const h = window.innerHeight;

    // Left flipper: bottom-left corner
    this.leftFlipperZone = {
      x: 0,
      y: h * 0.6,  // Bottom 40%
      width: w * 0.25,  // Left 25%
      height: h * 0.4,
    };

    // Right flipper: bottom-right corner
    this.rightFlipperZone = {
      x: w * 0.75,
      y: h * 0.6,
      width: w * 0.25,
      height: h * 0.4,
    };

    // Plunger: top-right area
    this.plungerZone = {
      x: w * 0.75,
      y: 0,
      width: w * 0.25,
      height: h * 0.35,
    };

    console.log('[Touch] Zones configured:',
      `Flipper-L: ${this.leftFlipperZone.width}x${this.leftFlipperZone.height}px`,
      `Flipper-R: ${this.rightFlipperZone.width}x${this.rightFlipperZone.height}px`,
      `Plunger: ${this.plungerZone.width}x${this.plungerZone.height}px`);
  }

  /**
   * Setup touch event listeners
   */
  private setupEventListeners(): void {
    document.addEventListener('touchstart', (e) => this.handleTouchStart(e), { passive: false });
    document.addEventListener('touchmove', (e) => this.handleTouchMove(e), { passive: false });
    document.addEventListener('touchend', (e) => this.handleTouchEnd(e), { passive: false });
    document.addEventListener('touchcancel', (e) => this.handleTouchCancel(e), { passive: false });

    // Recalculate zones on resize
    window.addEventListener('resize', () => this.setupTouchZones());
  }

  /**
   * Check if point is in zone
   */
  private pointInZone(x: number, y: number, zone: any): boolean {
    return x >= zone.x && x < zone.x + zone.width &&
           y >= zone.y && y < zone.y + zone.height;
  }

  /**
   * Handle touch start
   */
  private handleTouchStart(e: TouchEvent): void {
    if (!this.enabled) return;

    for (let i = 0; i < e.touches.length; i++) {
      const touch = e.touches[i];
      const x = touch.clientX;
      const y = touch.clientY;

      // Left flipper
      if (this.pointInZone(x, y, this.leftFlipperZone)) {
        e.preventDefault();
        this.leftFlipperActive = true;
        if (this.onLeftFlipperPress) this.onLeftFlipperPress();
        this.showTouchIndicator(touch.identifier, x, y, '#00ff88');
        console.log('[Touch] Left flipper pressed');
      }
      // Right flipper
      else if (this.pointInZone(x, y, this.rightFlipperZone)) {
        e.preventDefault();
        this.rightFlipperActive = true;
        if (this.onRightFlipperPress) this.onRightFlipperPress();
        this.showTouchIndicator(touch.identifier, x, y, '#ff00ff');
        console.log('[Touch] Right flipper pressed');
      }
      // Plunger
      else if (this.pointInZone(x, y, this.plungerZone)) {
        e.preventDefault();
        this.plungerTouching = true;
        this.plungerStartY = y;
        this.plungerCurrentY = y;
        this.showTouchIndicator(touch.identifier, x, y, '#ffff00');
        console.log('[Touch] Plunger engaged');
      }
    }
  }

  /**
   * Handle touch move
   */
  private handleTouchMove(e: TouchEvent): void {
    if (!this.enabled) return;

    for (let i = 0; i < e.touches.length; i++) {
      const touch = e.touches[i];
      const x = touch.clientX;
      const y = touch.clientY;

      // Update plunger
      if (this.plungerTouching) {
        e.preventDefault();
        this.plungerCurrentY = y;

        // Calculate plunger power (0-1) based on downward drag
        // Positive Y = downward, so we measure distance moved down
        const dragDistance = Math.max(0, this.plungerCurrentY - this.plungerStartY);
        const maxDrag = this.plungerZone.height * 0.6;  // Max drag distance
        const power = Math.min(1.0, dragDistance / maxDrag);

        if (this.onPlungerChange) {
          this.onPlungerChange(power);
        }

        // Update indicator position
        this.updateTouchIndicator(touch.identifier, x, y);
      }
    }
  }

  /**
   * Handle touch end
   */
  private handleTouchEnd(e: TouchEvent): void {
    if (!this.enabled) return;

    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      const touchId = touch.identifier;

      // Left flipper release
      if (this.leftFlipperActive) {
        const x = touch.clientX;
        const y = touch.clientY;
        if (this.pointInZone(x, y, this.leftFlipperZone)) {
          this.leftFlipperActive = false;
          if (this.onLeftFlipperRelease) this.onLeftFlipperRelease();
          console.log('[Touch] Left flipper released');
        }
      }

      // Right flipper release
      if (this.rightFlipperActive) {
        const x = touch.clientX;
        const y = touch.clientY;
        if (this.pointInZone(x, y, this.rightFlipperZone)) {
          this.rightFlipperActive = false;
          if (this.onRightFlipperRelease) this.onRightFlipperRelease();
          console.log('[Touch] Right flipper released');
        }
      }

      // Plunger release
      if (this.plungerTouching) {
        this.plungerTouching = false;
        if (this.onPlungerChange) {
          this.onPlungerChange(0);  // Release plunger
        }
        console.log('[Touch] Plunger released');
      }

      // Remove touch indicator
      this.removeTouchIndicator(touchId);
    }
  }

  /**
   * Handle touch cancel
   */
  private handleTouchCancel(e: TouchEvent): void {
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      this.removeTouchIndicator(touch.identifier);
    }

    // Reset state
    this.leftFlipperActive = false;
    this.rightFlipperActive = false;
    this.plungerTouching = false;
  }

  /**
   * Show touch indicator at position
   */
  private showTouchIndicator(touchId: number, x: number, y: number, color: string): void {
    const indicator = document.createElement('div');
    indicator.style.position = 'fixed';
    indicator.style.left = (x - 25) + 'px';
    indicator.style.top = (y - 25) + 'px';
    indicator.style.width = '50px';
    indicator.style.height = '50px';
    indicator.style.borderRadius = '50%';
    indicator.style.backgroundColor = color;
    indicator.style.opacity = '0.5';
    indicator.style.pointerEvents = 'none';
    indicator.style.zIndex = '10000';
    indicator.style.border = `2px solid ${color}`;
    indicator.style.boxShadow = `0 0 20px ${color}`;
    indicator.style.animation = 'fadeIn 0.2s ease-out';

    document.body.appendChild(indicator);
    this.touchIndicators.set(touchId, indicator);
  }

  /**
   * Update touch indicator position
   */
  private updateTouchIndicator(touchId: number, x: number, y: number): void {
    const indicator = this.touchIndicators.get(touchId);
    if (indicator) {
      indicator.style.left = (x - 25) + 'px';
      indicator.style.top = (y - 25) + 'px';
    }
  }

  /**
   * Remove touch indicator
   */
  private removeTouchIndicator(touchId: number): void {
    const indicator = this.touchIndicators.get(touchId);
    if (indicator) {
      indicator.style.opacity = '0';
      setTimeout(() => {
        indicator.remove();
      }, 200);
      this.touchIndicators.delete(touchId);
    }
  }

  /**
   * Register callbacks
   */
  onLeftFlipperPressCallback(cb: () => void): void {
    this.onLeftFlipperPress = cb;
  }

  onLeftFlipperReleaseCallback(cb: () => void): void {
    this.onLeftFlipperRelease = cb;
  }

  onRightFlipperPressCallback(cb: () => void): void {
    this.onRightFlipperPress = cb;
  }

  onRightFlipperReleaseCallback(cb: () => void): void {
    this.onRightFlipperRelease = cb;
  }

  onPlungerChangeCallback(cb: (power: number) => void): void {
    this.onPlungerChange = cb;
  }

  /**
   * Enable/disable touch controls
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    console.log(`[Touch Controls] ${enabled ? 'Enabled' : 'Disabled'}`);
  }

  /**
   * Get enabled state
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Detect if device is touch-capable
   */
  static isTouchDevice(): boolean {
    return (('ontouchstart' in window) ||
            (navigator.maxTouchPoints > 0) ||
            ((navigator as any).msMaxTouchPoints > 0));
  }

  /**
   * Detect if device is mobile
   */
  static isMobileDevice(): boolean {
    const userAgent = navigator.userAgent.toLowerCase();
    return /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
  }
}

/**
 * Singleton instance
 */
let touchControlsManager: TouchControlsManager | null = null;

/**
 * Initialize touch controls manager
 */
export function initTouchControlsManager(): TouchControlsManager {
  if (!touchControlsManager) {
    touchControlsManager = new TouchControlsManager();
  }
  return touchControlsManager;
}

/**
 * Get touch controls manager
 */
export function getTouchControlsManager(): TouchControlsManager | null {
  return touchControlsManager;
}

/**
 * Dispose touch controls manager
 */
export function disposeTouchControlsManager(): void {
  if (touchControlsManager) {
    touchControlsManager.setEnabled(false);
    touchControlsManager = null;
  }
}

