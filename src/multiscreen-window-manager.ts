// SPDX-License-Identifier: AGPL-3.0-or-later
// © 2026 Harald Weiss
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
  private electronWindowIds = new Map<string, number>();

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
   * Detect screens via Electron IPC (Phase 4).
   * Returns true if successful, false to indicate caller should fall back.
   */
  private async detectScreensElectron(): Promise<boolean> {
    const api = window.electronAPI;
    if (!api?.getAllDisplays) return false;
    try {
      const displays = await api.getAllDisplays();
      if (!Array.isArray(displays) || displays.length === 0) return false;
      this.screens = [];
      displays.forEach((d: any, index: number) => {
        this.screens.push({
          index,
          label: d.label || `Screen ${index + 1}`,
          width: d.bounds?.width ?? 1920,
          height: d.bounds?.height ?? 1080,
          availWidth: d.workArea?.width ?? d.bounds?.width ?? 1920,
          availHeight: d.workArea?.height ?? d.bounds?.height ?? 1080,
          x: d.bounds?.x ?? 0,
          y: d.bounds?.y ?? 0,
          availX: d.workArea?.x ?? d.bounds?.x ?? 0,
          availY: d.workArea?.y ?? d.bounds?.y ?? 0,
          dpi: (d.scaleFactor || 1) * 96,
          isPrimary: !!d.isPrimary,
          isInternal: !!d.internal,
        });
      });
      return true;
    } catch (e) {
      console.warn('[MultiScreen] Electron getAllDisplays failed:', e);
      return false;
    }
  }

  /**
   * Detect all available physical screens
   */
  async detectScreens(): Promise<void> {
    this.screens = [];

    // Phase 4: Electron IPC path — most reliable when running in Electron
    if (await this.detectScreensElectron()) {
      // Electron path succeeded
    } else if ('getScreenDetails' in window) {
      await this.detectScreensModern();
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
      availX: (screen as any).availLeft || 0,
      availY: (screen as any).availTop || 0,
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
   * Open a child window. Uses Electron IPC when available (Phase 4),
   * falls back to browser window.open otherwise.
   */
  private async openWindowSmart(
    url: string,
    name: string,
    spec: { left: number; top: number; width: number; height: number },
    role: string
  ): Promise<Window | null> {
    const api = window.electronAPI;
    if (api?.openWindow) {
      try {
        const id = await api.openWindow({
          url,
          x: Math.round(spec.left),
          y: Math.round(spec.top),
          width: Math.round(spec.width),
          height: Math.round(spec.height),
          role,
        });
        this.electronWindowIds.set(name, id);
        return null;
      } catch (e) {
        console.warn(`[MultiScreen] electronAPI.openWindow failed for ${role}, falling back:`, e);
      }
    }
    const features = this.buildWindowFeatures(spec as WindowSpec);
    return window.open(url, name, features);
  }

  /**
   * Build window.open() feature string from spec
   */
  buildWindowFeatures(spec: WindowSpec): string {
    return (
      `width=${spec.width},height=${spec.height},` +
      `left=${Math.round(spec.left)},top=${Math.round(spec.top)},${ 
      spec.features}`
    );
  }

  /**
   * Open multiscreen windows for given layout
   */
  async openMultiScreenWindows(layout: 2 | 3): Promise<Map<string, Window | null>> {
    const currentUrl = new URL(window.location.href);
    const baseUrl = currentUrl.origin + currentUrl.pathname;

    this.windows.clear();

    if (layout === 2) {
      await this.openTwoScreenLayout(baseUrl);
    } else if (layout === 3) {
      await this.openThreeScreenLayout(baseUrl);
    }

    return this.windows;
  }

  /**
   * Open 2-screen layout
   */
  private async openTwoScreenLayout(baseUrl: string): Promise<void> {
    const specs = this.getSpec2Screen();

    // Backglass window on screen 2
    const backglassUrl = `${baseUrl}?role=backglass`;

    console.log(
      `Opening Backglass window: ${specs.backglass.width}x${specs.backglass.height} ` +
      `at (${Math.round(specs.backglass.left)},${Math.round(specs.backglass.top)})`
    );

    const bgWindow = await this.openWindowSmart(backglassUrl, 'fpw_backglass', specs.backglass, 'backglass');
    this.windows.set('backglass', bgWindow);

    this.windowPositions.set('backglass', {
      x: specs.backglass.left,
      y: specs.backglass.top,
      w: specs.backglass.width,
      h: specs.backglass.height,
    });

    // Broadcast to other windows
    this.broadcast('multiscreen-opened', { layout: 2, windows: Array.from(this.windows.keys()) });
  }

  /**
   * Open 3-screen layout
   */
  private async openThreeScreenLayout(baseUrl: string): Promise<void> {
    const specs = this.getSpec3Screen();

    // Backglass window on screen 2
    const backglassUrl = `${baseUrl}?role=backglass&nodmd=1`;

    console.log(
      `Opening Backglass window: ${specs.backglass.width}x${specs.backglass.height} ` +
      `at (${Math.round(specs.backglass.left)},${Math.round(specs.backglass.top)})`
    );

    const bgWindow = await this.openWindowSmart(backglassUrl, 'fpw_backglass', specs.backglass, 'backglass');
    this.windows.set('backglass', bgWindow);

    this.windowPositions.set('backglass', {
      x: specs.backglass.left,
      y: specs.backglass.top,
      w: specs.backglass.width,
      h: specs.backglass.height,
    });

    // DMD window on screen 3
    const dmdUrl = `${baseUrl}?role=dmd`;

    console.log(
      `Opening DMD window: ${specs.dmd.width}x${specs.dmd.height} ` +
      `at (${Math.round(specs.dmd.left)},${Math.round(specs.dmd.top)})`
    );

    const dmdWindow = await this.openWindowSmart(dmdUrl, 'fpw_dmd', specs.dmd, 'dmd');
    this.windows.set('dmd', dmdWindow);

    this.windowPositions.set('dmd', {
      x: specs.dmd.left,
      y: specs.dmd.top,
      w: specs.dmd.width,
      h: specs.dmd.height,
    });

    // Broadcast to other windows
    this.broadcast('multiscreen-opened', { layout: 3, windows: Array.from(this.windows.keys()) });
  }

  /**
   * Close all multiscreen windows (browser + Electron child windows)
   */
  async closeMultiScreenWindows(): Promise<void> {
    this.windows.forEach((win) => {
      if (win && !win.closed) {
        try {
          win.close();
        } catch (e) {
          console.warn('Could not close window:', e);
        }
      }
    });

    this.windows.clear();
    this.windowPositions.clear();

    // Electron child windows
    const api = window.electronAPI;
    if (api?.closeAllChildWindows) {
      try { await api.closeAllChildWindows(); } catch { /* ignore */ }
    }
    this.electronWindowIds.clear();

    this.broadcast('multiscreen-closed', {});
  }

  /**
   * Alias for closeMultiScreenWindows (used by Phase 4 tests)
   */
  async closeAll(): Promise<void> {
    return this.closeMultiScreenWindows();
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
      console.warn('MultiScreen manager not initialized');
      return;
    }
    manager.openMultiScreenWindows(layout).catch((e) => console.error('[MultiScreen] openMultiScreenWindows failed:', e));
  };
  window.closeMultiScreenWindows = () => {
    globalMultiScreenManager?.closeMultiScreenWindows().catch((e) => console.error('[MultiScreen] closeMultiScreenWindows failed:', e));
  };
  window.getMultiScreenDiagnostics = () => globalMultiScreenManager?.getDiagnostics() || '';
}
