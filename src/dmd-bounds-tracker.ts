/**
 * dmd-bounds-tracker.ts — DMD Position & Bounds Management
 *
 * Tracks DMD element position, dimensions, and viewport bounds
 * Ensures all text rendering stays within visible DMD area
 * Monitors resize events and canvas scaling
 */

export interface DMDBounds {
  /** Element position relative to viewport */
  left: number;
  top: number;
  right: number;
  bottom: number;

  /** Element dimensions */
  width: number;
  height: number;

  /** Canvas drawing area (pixel coordinates) */
  canvasWidth: number;
  canvasHeight: number;

  /** Viewport info for clipping calculations */
  viewportWidth: number;
  viewportHeight: number;

  /** Scaling factor for responsive display */
  scale: number;

  /** Whether element is fully visible in viewport */
  fullyVisible: boolean;

  /** Clipping region if partially visible */
  clipRegion?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface TextBoundsCheckResult {
  /** Whether text fits within bounds */
  fits: boolean;

  /** Visible area for text (0-1 ratio) */
  visibleRatio: number;

  /** Recommended adjustments */
  suggestions: {
    reduceFont?: boolean;
    reduceLinesCount?: boolean;
    adjustPosition?: boolean;
  };
}

/**
 * DMD Bounds Tracker - Monitors and validates DMD display area
 */
export class DMDBoundsTracker {
  private dmdCanvas: HTMLCanvasElement | null = null;
  private dmdWrap: HTMLElement | null = null;
  private currentBounds: DMDBounds | null = null;
  private observers: Array<(bounds: DMDBounds) => void> = [];
  private resizeObserver: ResizeObserver | null = null;
  private lastUpdateTime: number = 0;
  private updateThrottle: number = 100; // ms

  /** Standard DMD dimensions in logical pixels */
  private readonly DMD_LOGICAL_WIDTH = 128;
  private readonly DMD_LOGICAL_HEIGHT = 32;

  /**
   * Initialize bounds tracking
   */
  initialize(canvas: HTMLCanvasElement, wrap: HTMLElement): void {
    this.dmdCanvas = canvas;
    this.dmdWrap = wrap;

    // Initial bounds calculation
    this.updateBounds();

    // Setup resize observer for canvas resizing
    if ('ResizeObserver' in window) {
      this.resizeObserver = new ResizeObserver(() => {
        this.throttledUpdate();
      });
      this.resizeObserver.observe(wrap);
    }

    // Fallback: listen for window resize
    window.addEventListener('resize', () => this.throttledUpdate());
    window.addEventListener('orientationchange', () => this.throttledUpdate());

    // Listen for scroll events
    window.addEventListener('scroll', () => this.throttledUpdate(), { passive: true });

    console.log('✅ DMD bounds tracker initialized');
  }

  /**
   * Throttled bounds update to avoid excessive recalculations
   */
  private throttledUpdate(): void {
    const now = Date.now();
    if (now - this.lastUpdateTime >= this.updateThrottle) {
      this.updateBounds();
      this.lastUpdateTime = now;
    }
  }

  /**
   * Update current bounds by reading element properties
   */
  private updateBounds(): void {
    if (!this.dmdCanvas || !this.dmdWrap) return;

    const rect = this.dmdWrap.getBoundingClientRect();
    const canvasRect = this.dmdCanvas.getBoundingClientRect();

    // Calculate visible area
    const visibleLeft = Math.max(0, rect.left);
    const visibleTop = Math.max(0, rect.top);
    const visibleRight = Math.min(window.innerWidth, rect.right);
    const visibleBottom = Math.min(window.innerHeight, rect.bottom);

    // Determine if fully visible
    const fullyVisible =
      rect.left >= 0 &&
      rect.top >= 0 &&
      rect.right <= window.innerWidth &&
      rect.bottom <= window.innerHeight;

    // Calculate clipping region if partially visible
    let clipRegion: DMDBounds['clipRegion'] = undefined;
    if (!fullyVisible && visibleRight > visibleLeft && visibleBottom > visibleTop) {
      const clipWidth = visibleRight - visibleLeft;
      const clipHeight = visibleBottom - visibleTop;

      clipRegion = {
        x: Math.max(0, -rect.left),
        y: Math.max(0, -rect.top),
        width: clipWidth,
        height: clipHeight
      };
    }

    // Calculate scale from canvas dimensions
    const scale = Math.max(
      canvasRect.width / this.DMD_LOGICAL_WIDTH,
      canvasRect.height / this.DMD_LOGICAL_HEIGHT
    );

    const bounds: DMDBounds = {
      left: rect.left,
      top: rect.top,
      right: rect.right,
      bottom: rect.bottom,
      width: rect.width,
      height: rect.height,
      canvasWidth: canvasRect.width,
      canvasHeight: canvasRect.height,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      scale,
      fullyVisible,
      clipRegion
    };

    // Only notify if bounds changed significantly
    if (!this.currentBounds || this.boundsChanged(this.currentBounds, bounds)) {
      this.currentBounds = bounds;
      this.notifyObservers(bounds);
    }
  }

  /**
   * Check if bounds have changed significantly
   */
  private boundsChanged(prev: DMDBounds, curr: DMDBounds): boolean {
    // Check if position changed by more than 1px
    if (Math.abs(prev.left - curr.left) > 1 ||
        Math.abs(prev.top - curr.top) > 1) {
      return true;
    }

    // Check if size changed by more than 1px
    if (Math.abs(prev.width - curr.width) > 1 ||
        Math.abs(prev.height - curr.height) > 1) {
      return true;
    }

    // Check if visibility changed
    if (prev.fullyVisible !== curr.fullyVisible) {
      return true;
    }

    // Check if scale changed significantly
    if (Math.abs(prev.scale - curr.scale) > 0.1) {
      return true;
    }

    return false;
  }

  /**
   * Register observer for bounds changes
   */
  onBoundsChange(callback: (bounds: DMDBounds) => void): void {
    this.observers.push(callback);
  }

  /**
   * Notify all observers of bounds change
   */
  private notifyObservers(bounds: DMDBounds): void {
    this.observers.forEach(callback => {
      try {
        callback(bounds);
      } catch (error) {
        console.error('Error in DMD bounds observer:', error);
      }
    });
  }

  /**
   * Get current bounds
   */
  getBounds(): DMDBounds | null {
    return this.currentBounds;
  }

  /**
   * Check if text fits within current bounds
   */
  checkTextBounds(
    textWidth: number,      // Width in logical pixels (before scale)
    textHeight: number,     // Height in logical pixels (before scale)
    x: number = 0,          // X position in logical pixels
    y: number = 0           // Y position in logical pixels
  ): TextBoundsCheckResult {
    if (!this.currentBounds) {
      return {
        fits: true,
        visibleRatio: 1.0,
        suggestions: {}
      };
    }

    const bounds = this.currentBounds;

    // Calculate scaled text dimensions
    const scaledTextWidth = textWidth * bounds.scale;
    const scaledTextHeight = textHeight * bounds.scale;
    const scaledX = x * bounds.scale;
    const scaledY = y * bounds.scale;

    // Check if text fits within canvas
    const fitsHorizontally = (scaledX + scaledTextWidth) <= bounds.canvasWidth;
    const fitsVertically = (scaledY + scaledTextHeight) <= bounds.canvasHeight;

    // Calculate visible ratio
    let visibleRatio = 1.0;
    if (!fitsHorizontally || !fitsVertically) {
      const visibleWidth = Math.max(0, Math.min(bounds.canvasWidth - scaledX, scaledTextWidth));
      const visibleHeight = Math.max(0, Math.min(bounds.canvasHeight - scaledY, scaledTextHeight));
      visibleRatio = (visibleWidth * visibleHeight) / (scaledTextWidth * scaledTextHeight);
    }

    // Generate suggestions
    const suggestions: TextBoundsCheckResult['suggestions'] = {};
    if (!fitsHorizontally) {
      suggestions.reduceFont = true;
      suggestions.adjustPosition = true;
    }
    if (!fitsVertically) {
      suggestions.reduceLinesCount = true;
      suggestions.adjustPosition = true;
    }

    return {
      fits: fitsHorizontally && fitsVertically,
      visibleRatio,
      suggestions
    };
  }

  /**
   * Adjust text position to ensure visibility
   */
  adjustTextPosition(
    x: number,
    y: number,
    textWidth: number,
    textHeight: number
  ): { x: number; y: number } {
    if (!this.currentBounds) return { x, y };

    const bounds = this.currentBounds;
    const padding = 2;

    // Adjust X position
    let adjustedX = x;
    if (x < padding) {
      adjustedX = padding;
    } else if ((x + textWidth) > (this.DMD_LOGICAL_WIDTH - padding)) {
      adjustedX = Math.max(padding, this.DMD_LOGICAL_WIDTH - textWidth - padding);
    }

    // Adjust Y position
    let adjustedY = y;
    if (y < padding) {
      adjustedY = padding;
    } else if ((y + textHeight) > (this.DMD_LOGICAL_HEIGHT - padding)) {
      adjustedY = Math.max(padding, this.DMD_LOGICAL_HEIGHT - textHeight - padding);
    }

    return { x: adjustedX, y: adjustedY };
  }

  /**
   * Get clipping rectangle for canvas context
   */
  getClipPath(ctx: CanvasRenderingContext2D): void {
    if (!this.currentBounds || !this.currentBounds.clipRegion) {
      // No clipping needed
      return;
    }

    const clip = this.currentBounds.clipRegion;
    const scale = this.currentBounds.scale;

    ctx.save();
    ctx.beginPath();
    ctx.rect(
      clip.x * scale,
      clip.y * scale,
      clip.width,
      clip.height
    );
    ctx.clip();
  }

  /**
   * Release clipping
   */
  releaseClipPath(ctx: CanvasRenderingContext2D): void {
    ctx.restore();
  }

  /**
   * Get debug info
   */
  getDebugInfo(): string {
    if (!this.currentBounds) return 'No bounds calculated yet';

    const b = this.currentBounds;
    return `DMD Bounds: ${Math.round(b.width)}x${Math.round(b.height)}px ` +
           `@ (${Math.round(b.left)}, ${Math.round(b.top)}) ` +
           `Scale: ${b.scale.toFixed(2)}x ` +
           `Visible: ${b.fullyVisible ? '✅' : '⚠️'}`;
  }

  /**
   * Cleanup
   */
  dispose(): void {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }

    window.removeEventListener('resize', () => this.throttledUpdate());
    window.removeEventListener('orientationchange', () => this.throttledUpdate());
    window.removeEventListener('scroll', () => this.throttledUpdate());

    this.observers = [];
    this.dmdCanvas = null;
    this.dmdWrap = null;
    this.currentBounds = null;

    console.log('🧹 DMD bounds tracker disposed');
  }
}

// Export singleton instance
export const dmdBoundsTracker = new DMDBoundsTracker();
