/**
 * multiscreen-window-manager.ts — Enhanced Multi-Screen Window Management
 *
 * Provides advanced multi-screen support for arcade cabinet setup:
 * - 2-Screen: Playfield + Backglass/DMD on separate windows
 * - 3-Screen: Playfield + Backglass (separate window) + DMD (separate window)
 *
 * Features:
 * - Automatic physical screen detection
 * - Intelligent window positioning across displays
 * - BroadcastChannel coordination between windows
 * - Windows-specific fixes for display detection
 * - Fallback support for single/dual monitor systems
 */

export interface ScreenInfo {
  index: number;
  label: string;
  width: number;
  height: number;
  availWidth: number;
  availHeight: number;
  x: number;
  y: number;
  availX: number;
  availY: number;
  dpi: number;
  isPrimary: boolean;
  isInternal: boolean;
}

export interface WindowSpec {
  width: number;
  height: number;
  left: number;
  top: number;
  features: string;
}

export class MultiScreenWindowManager {
  private screens: ScreenInfo[] = [];
  private windows: Map<string, Window | null> = new Map();
  private broadcastChannel: BroadcastChannel | null = null;
  private windowPositions: Map<string, { x: number; y: number; w: number; h: number }> = new Map();

  constructor() {
    this.initBroadcastChannel();
    this.detectScreens();
  }

  /**
   * Initialize BroadcastChannel for cross-window communication
   */
  private initBroadcastChannel(): void {
    try {
      this.broadcastChannel = new BroadcastChannel('fpw-multiscreen');
      this.broadcastChannel.addEventListener('message', (event) => {
        this.handleBroadcastMessage(event.data);
      });
      console.log('✓ MultiScreen BroadcastChannel initialized');
    } catch (e) {
      console.warn('⚠ BroadcastChannel not available (IE/Edge fallback mode)');
    }
  }

  /**
   * Detect all available physical screens
   */
  private detectScreens(): void {
    this.screens = [];

    // Try modern Screen Enumeration API (best for Windows)
    if ('getScreenDetails' in window) {
      this.detectScreensModern();
    } else {
      // Fallback: Use standard screen object
      this.detectScreensFallback();
    }

    console.log(`✓ Detected ${this.screens.length} screen(s)`);
    this.screens.forEach((s) => {
      console.log(
        `  Screen ${s.index + 1}: ${s.width}x${s.height} at (${s.x},${s.y}) ${s.isPrimary ? '[PRIMARY]' : ''}`
      );
    });
  }

  /**
   * Detect screens using modern Screen Enumeration API (Windows 11+, Chrome/Edge)
   */
  private async detectScreensModern(): Promise<void> {
    try {
      const screenDetails = await (window as any).getScreenDetails?.();
      if (!screenDetails?.screens) return;

      screenDetails.screens.forEach((screen: any, index: number) => {
        this.screens.push({
          index,
          label: screen.label || `Screen ${index + 1}`,
          width: screen.width,
          height: screen.height,
          availWidth: screen.availWidth,
          availHeight: screen.availHeight,
          x: screen.left,
          y: screen.top,
          availX: screen.availLeft || screen.left,
          availY: screen.availTop || screen.top,
          dpi: (screen.devicePixelRatio || 1) * 96,
          isPrimary: screen.isPrimary || false,
          isInternal: screen.label?.toLowerCase().includes('integrated') || false,
        });
      });
    } catch (e) {
      console.warn('⚠ Modern screen detection failed, falling back to standard API');
      this.detectScreensFallback();
    }
  }

  /**
   * Detect screens using standard screen object (fallback)
   * Note: This only detects primary + extended displays on Windows
   */
  private detectScreensFallback(): void {
    // Primary screen
    this.screens.push({
      index: 0,
      label: 'Screen 1 (Primary)',
      width: screen.width,
      height: screen.height,
      availWidth: screen.availWidth,
      availHeight: screen.availHeight,
      x: 0,
      y: 0,
      availX: screen.availLeft || 0,
      availY: screen.availTop || 0,
      dpi: (devicePixelRatio || 1) * 96,
      isPrimary: true,
      isInternal: false,
    });

    // Try to detect secondary screens via window.outerWidth/innerWidth tricks
    // This is limited but helps on Windows where screen.left/top work
    if (typeof (window as any).screenLeft !== 'undefined' && (window as any).screenLeft < 0) {
      // Window might be on secondary screen (negative coordinates = right monitor)
      const screenLeft = (window as any).screenLeft;
      this.screens.push({
        index: 1,
        label: 'Screen 2 (External)',
        width: screen.width,
        height: screen.height,
        availWidth: screen.availWidth,
        availHeight: screen.availHeight,
        x: screenLeft,
        y: 0,
        availX: screenLeft,
        availY: 0,
        dpi: (devicePixelRatio || 1) * 96,
        isPrimary: false,
        isInternal: false,
      });
    }
  }

  /**
   * Get all detected screens
   */
  getScreens(): ScreenInfo[] {
    return [...this.screens];
  }

  /**
   * Get screen by index
   */
  getScreen(index: number): ScreenInfo | null {
    return this.screens[index] || null;
  }

  /**
   * Calculate window spec for 2-screen layout
   * Screen 1: Playfield | Screen 2: Backglass + DMD
   */
  getSpec2Screen(): { backglass: WindowSpec } {
    if (this.screens.length < 2) {
      // Fallback: secondary window size
      return {
        backglass: {
          width: Math.round(screen.width * 0.5),
          height: Math.round(screen.height * 0.8),
          left: Math.round(screen.width * 0.5),
          top: 0,
          features: 'toolbar=no,menubar=no,scrollbars=no,resizable=yes',
        },
      };
    }

    const screen2 = this.screens[1];
    return {
      backglass: {
        width: screen2.availWidth,
        height: screen2.availHeight,
        left: screen2.availX,
        top: screen2.availY,
        features: 'toolbar=no,menubar=no,scrollbars=no,resizable=yes',
      },
    };
  }

  /**
   * Calculate window specs for 3-screen layout
   * Screen 1: Playfield | Screen 2: Backglass | Screen 3: DMD
   */
  getSpec3Screen(): { backglass: WindowSpec; dmd: WindowSpec } {
    const screen2 = this.screens[1] || this.screens[0];
    const screen3 = this.screens[2] || this.screens[1] || this.screens[0];

    // Calculate proportions for secondary screens
    const bgHeight = screen2.availHeight;
    const dmdWidth = Math.round(screen3.availWidth * 0.8);
    const dmdHeight = Math.round(bgHeight * 0.25); // DMD aspect ratio ~3.5:1

    return {
      backglass: {
        width: screen2.availWidth,
        height: bgHeight,
        left: screen2.availX,
        top: screen2.availY,
        features: 'toolbar=no,menubar=no,scrollbars=no,resizable=yes',
      },
      dmd: {
        width: dmdWidth,
        height: dmdHeight,
        left: screen3.availX + Math.round((screen3.availWidth - dmdWidth) / 2),
        top: screen3.availY + Math.round((screen3.availHeight - dmdHeight) / 2),
        features: 'toolbar=no,menubar=no,scrollbars=no,resizable=yes',
      },
    };
  }

  /**
   * Build window.open() feature string from spec
   */
  buildWindowFeatures(spec: WindowSpec): string {
    return (
      `width=${spec.width},height=${spec.height},` +
      `left=${Math.round(spec.left)},top=${Math.round(spec.top)},` +
      spec.features
    );
  }

  /**
   * Open multiscreen windows for given layout
   */
  openMultiScreenWindows(layout: 2 | 3): Map<string, Window | null> {
    const currentUrl = new URL(window.location.href);
    const baseUrl = currentUrl.origin + currentUrl.pathname;

    this.windows.clear();

    if (layout === 2) {
      this.openTwoScreenLayout(baseUrl);
    } else if (layout === 3) {
      this.openThreeScreenLayout(baseUrl);
    }

    return this.windows;
  }

  /**
   * Open 2-screen layout
   */
  private openTwoScreenLayout(baseUrl: string): void {
    const specs = this.getSpec2Screen();

    // Backglass window on screen 2
    const backglassUrl = `${baseUrl}?role=backglass`;
    const backglassFeatures = this.buildWindowFeatures(specs.backglass);

    console.log(
      `🎮 Opening Backglass window: ${specs.backglass.width}x${specs.backglass.height} ` +
      `at (${Math.round(specs.backglass.left)},${Math.round(specs.backglass.top)})`
    );

    const bgWindow = window.open(backglassUrl, 'fpw_backglass', backglassFeatures);
    this.windows.set('backglass', bgWindow);

    if (bgWindow) {
      this.windowPositions.set('backglass', {
        x: specs.backglass.left,
        y: specs.backglass.top,
        w: specs.backglass.width,
        h: specs.backglass.height,
      });
    }

    // Broadcast to other windows
    this.broadcast('multiscreen-opened', { layout: 2, windows: Array.from(this.windows.keys()) });
  }

  /**
   * Open 3-screen layout
   */
  private openThreeScreenLayout(baseUrl: string): void {
    const specs = this.getSpec3Screen();

    // Backglass window on screen 2
    const backglassUrl = `${baseUrl}?role=backglass&nodmd=1`;
    const backglassFeatures = this.buildWindowFeatures(specs.backglass);

    console.log(
      `🎮 Opening Backglass window: ${specs.backglass.width}x${specs.backglass.height} ` +
      `at (${Math.round(specs.backglass.left)},${Math.round(specs.backglass.top)})`
    );

    const bgWindow = window.open(backglassUrl, 'fpw_backglass', backglassFeatures);
    this.windows.set('backglass', bgWindow);

    if (bgWindow) {
      this.windowPositions.set('backglass', {
        x: specs.backglass.left,
        y: specs.backglass.top,
        w: specs.backglass.width,
        h: specs.backglass.height,
      });
    }

    // DMD window on screen 3
    const dmdUrl = `${baseUrl}?role=dmd`;
    const dmdFeatures = this.buildWindowFeatures(specs.dmd);

    console.log(
      `🎮 Opening DMD window: ${specs.dmd.width}x${specs.dmd.height} ` +
      `at (${Math.round(specs.dmd.left)},${Math.round(specs.dmd.top)})`
    );

    const dmdWindow = window.open(dmdUrl, 'fpw_dmd', dmdFeatures);
    this.windows.set('dmd', dmdWindow);

    if (dmdWindow) {
      this.windowPositions.set('dmd', {
        x: specs.dmd.left,
        y: specs.dmd.top,
        w: specs.dmd.width,
        h: specs.dmd.height,
      });
    }

    // Broadcast to other windows
    this.broadcast('multiscreen-opened', { layout: 3, windows: Array.from(this.windows.keys()) });
  }

  /**
   * Close all multiscreen windows
   */
  closeMultiScreenWindows(): void {
    this.windows.forEach((win) => {
      if (win && !win.closed) {
        try {
          win.close();
        } catch (e) {
          console.warn('⚠ Could not close window:', e);
        }
      }
    });

    this.windows.clear();
    this.windowPositions.clear();

    this.broadcast('multiscreen-closed', {});
  }

  /**
   * Broadcast message to other windows
   */
  broadcast(type: string, data: any): void {
    if (!this.broadcastChannel) return;

    try {
      this.broadcastChannel.postMessage({
        type,
        data,
        timestamp: Date.now(),
        source: window.name || 'main',
      });
    } catch (e) {
      console.warn('⚠ BroadcastChannel message failed:', e);
    }
  }

  /**
   * Handle messages from other windows
   */
  private handleBroadcastMessage(message: any): void {
    const { type, data } = message;

    switch (type) {
      case 'game-state-update':
        console.log('📡 Received game state update from', message.source);
        break;
      case 'score-update':
        console.log('📡 Score updated:', data.score);
        break;
      case 'layout-change':
        console.log('📡 Layout changed to', data.layout);
        break;
    }
  }

  /**
   * Get diagnostic information
   */
  getDiagnostics(): string {
    let diag = '═══ MultiScreen Window Manager Diagnostics ═══\n\n';

    diag += `📺 Detected Screens: ${this.screens.length}\n`;
    this.screens.forEach((s) => {
      diag += `   ${s.label}: ${s.width}x${s.height} at (${s.x},${s.y})\n`;
    });

    diag += `\n🪟 Open Windows: ${this.windows.size}\n`;
    this.windows.forEach((win, role) => {
      const pos = this.windowPositions.get(role);
      diag += `   ${role}: ${pos ? `${pos.w}x${pos.h} at (${pos.x},${pos.y})` : 'closed'}\n`;
    });

    diag += `\n📡 BroadcastChannel: ${this.broadcastChannel ? 'Active' : 'Unavailable'}\n`;

    return diag;
  }
}

/**
 * Global instance
 */
let globalMultiScreenManager: MultiScreenWindowManager | null = null;

/**
 * Initialize the multiscreen manager
 */
export function initializeMultiScreenWindowManager(): void {
  globalMultiScreenManager = new MultiScreenWindowManager();
  console.log('✓ MultiScreen Window Manager initialized');
}

/**
 * Get the global multiscreen manager
 */
export function getMultiScreenWindowManager(): MultiScreenWindowManager | null {
  return globalMultiScreenManager;
}

/**
 * Convenience functions for window
 */
declare global {
  interface Window {
    getScreens?: () => ScreenInfo[];
    openMultiScreenLayout?: (layout: 2 | 3) => void;
    closeMultiScreenWindows?: () => void;
    getMultiScreenDiagnostics?: () => string;
  }
}

// Attach to window
if (typeof window !== 'undefined') {
  window.getScreens = () => globalMultiScreenManager?.getScreens() || [];
  window.openMultiScreenLayout = (layout: 2 | 3) => {
    const manager = globalMultiScreenManager;
    if (!manager) {
      console.warn('⚠ MultiScreen manager not initialized');
      return;
    }
    manager.openMultiScreenWindows(layout);
  };
  window.closeMultiScreenWindows = () => {
    globalMultiScreenManager?.closeMultiScreenWindows();
  };
  window.getMultiScreenDiagnostics = () => globalMultiScreenManager?.getDiagnostics() || '';
}
