/**
 * Screen Resolution Manager
 * Allows users to configure resolution for each screen in multi-screen setup
 */

export type ResolutionPreset = 'auto' | '720p' | '1080p' | '1440p' | '2160p' | 'custom';

export interface ScreenResolution {
  screenIndex: number;
  width: number;
  height: number;
  preset: ResolutionPreset;
  role: 'playfield' | 'backglass' | 'dmd';
}

export interface ResolutionLayout {
  screenCount: number;
  screens: ScreenResolution[];
  useAutoDetect: boolean;
}

// Common resolution presets
const RESOLUTION_PRESETS: Record<ResolutionPreset, { width: number; height: number } | null> = {
  'auto': null,  // Auto-detect based on screen
  '720p': { width: 1280, height: 720 },
  '1080p': { width: 1920, height: 1080 },
  '1440p': { width: 2560, height: 1440 },
  '2160p': { width: 3840, height: 2160 },
  'custom': null,  // User-defined
};

const STORAGE_KEY = 'fpw_screen_resolutions';

const DEFAULT_LAYOUTS: Record<number, ResolutionLayout> = {
  1: {
    screenCount: 1,
    screens: [
      { screenIndex: 0, width: 1920, height: 1080, preset: 'auto', role: 'playfield' },
    ],
    useAutoDetect: true,
  },
  2: {
    screenCount: 2,
    screens: [
      { screenIndex: 0, width: 1920, height: 1080, preset: '1080p', role: 'playfield' },
      { screenIndex: 1, width: 1024, height: 768, preset: 'custom', role: 'backglass' },
    ],
    useAutoDetect: true,
  },
  3: {
    screenCount: 3,
    screens: [
      { screenIndex: 0, width: 1920, height: 1080, preset: '1080p', role: 'playfield' },
      { screenIndex: 1, width: 1920, height: 1080, preset: '1080p', role: 'backglass' },
      { screenIndex: 2, width: 1024, height: 256, preset: 'custom', role: 'dmd' },
    ],
    useAutoDetect: true,
  },
};

class ScreenResolutionManager {
  private currentLayout: ResolutionLayout;

  constructor() {
    this.currentLayout = this.loadLayout();
  }

  /**
   * Load layout from localStorage or use default
   */
  private loadLayout(): ResolutionLayout {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error('Failed to load screen resolutions:', e);
    }
    return this.getDefaultLayout(2);
  }

  /**
   * Save layout to localStorage
   */
  private saveLayout(layout: ResolutionLayout): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(layout));
      console.log('✓ Screen resolutions saved');
    } catch (e) {
      console.error('Failed to save screen resolutions:', e);
    }
  }

  /**
   * Get default layout for screen count
   */
  getDefaultLayout(screenCount: number): ResolutionLayout {
    return DEFAULT_LAYOUTS[screenCount] || DEFAULT_LAYOUTS[1];
  }

  /**
   * Get current layout
   */
  getLayout(): ResolutionLayout {
    return this.currentLayout;
  }

  /**
   * Set layout
   */
  setLayout(layout: ResolutionLayout): void {
    this.currentLayout = layout;
    this.saveLayout(layout);
  }

  /**
   * Get resolution for specific screen
   */
  getResolutionForScreen(screenIndex: number): { width: number; height: number } {
    const config = this.currentLayout.screens.find(s => s.screenIndex === screenIndex);
    if (config) {
      return { width: config.width, height: config.height };
    }
    // Fallback to common resolution
    return { width: 1920, height: 1080 };
  }

  /**
   * Set resolution for specific screen
   */
  setResolutionForScreen(screenIndex: number, width: number, height: number, preset: ResolutionPreset = 'custom'): void {
    const screenIdx = this.currentLayout.screens.findIndex(s => s.screenIndex === screenIndex);

    if (screenIdx >= 0) {
      this.currentLayout.screens[screenIdx].width = width;
      this.currentLayout.screens[screenIdx].height = height;
      this.currentLayout.screens[screenIdx].preset = preset;
    } else {
      this.currentLayout.screens.push({
        screenIndex,
        width,
        height,
        preset,
        role: 'playfield',
      });
    }

    this.saveLayout(this.currentLayout);
  }

  /**
   * Set preset for screen
   */
  setPresetForScreen(screenIndex: number, preset: ResolutionPreset): void {
    const screenIdx = this.currentLayout.screens.findIndex(s => s.screenIndex === screenIndex);
    if (screenIdx >= 0) {
      this.currentLayout.screens[screenIdx].preset = preset;

      // If preset is not custom/auto, apply its dimensions
      const dimensions = RESOLUTION_PRESETS[preset];
      if (dimensions) {
        this.currentLayout.screens[screenIdx].width = dimensions.width;
        this.currentLayout.screens[screenIdx].height = dimensions.height;
      }

      this.saveLayout(this.currentLayout);
      console.log(`✓ Screen ${screenIndex + 1} preset changed to ${preset}`);
    }
  }

  /**
   * Get all available presets
   */
  getAvailablePresets(): ResolutionPreset[] {
    return Object.keys(RESOLUTION_PRESETS) as ResolutionPreset[];
  }

  /**
   * Get preset dimensions
   */
  getPresetDimensions(preset: ResolutionPreset): { width: number; height: number } | null {
    return RESOLUTION_PRESETS[preset];
  }

  /**
   * Reset to default layout
   */
  resetToDefault(screenCount: number): void {
    this.currentLayout = this.getDefaultLayout(screenCount);
    this.saveLayout(this.currentLayout);
    console.log(`✓ Screen resolutions reset to default for ${screenCount} screens`);
  }

  /**
   * Get all screens with resolution details
   */
  getAllScreens(): ScreenResolution[] {
    return [...this.currentLayout.screens];
  }

  /**
   * Generate window spec string from resolution
   */
  getWindowSpec(screenIndex: number, role: 'playfield' | 'backglass' | 'dmd'): string {
    const res = this.getResolutionForScreen(screenIndex);
    const width = res.width;
    const height = res.height;

    // Add padding for UI chrome
    const padding = role === 'dmd' ? 40 : 60;

    return `width=${Math.max(256, width - padding)},height=${Math.max(200, height - padding)},toolbar=no,menubar=no,scrollbars=no,resizable=yes`;
  }

  /**
   * Auto-detect screen resolutions if available
   */
  async autoDetectResolutions(): Promise<void> {
    try {
      if ('getScreenDetails' in window) {
        const details = await (window as any).getScreenDetails();
        const screens = details.screens || [];

        console.log(`📺 Auto-detecting resolutions for ${screens.length} screens:`);

        screens.forEach((screen: any, idx: number) => {
          const width = screen.availWidth || screen.width;
          const height = screen.availHeight || screen.height;
          console.log(`  Screen ${idx + 1}: ${width}x${height}`);

          this.setResolutionForScreen(idx, width, height, 'auto');
        });

        console.log('✓ Resolutions auto-detected');
      }
    } catch (e) {
      console.warn('⚠ Could not auto-detect resolutions:', e);
    }
  }
}

// Singleton instance
let managerInstance: ScreenResolutionManager | null = null;

export function initializeScreenResolutionManager(): ScreenResolutionManager {
  if (!managerInstance) {
    managerInstance = new ScreenResolutionManager();
  }
  return managerInstance;
}

export function getScreenResolutionManager(): ScreenResolutionManager {
  if (!managerInstance) {
    managerInstance = new ScreenResolutionManager();
  }
  return managerInstance;
}

// Window global declarations
declare global {
  interface Window {
    initializeScreenResolutionManager: typeof initializeScreenResolutionManager;
    getScreenResolutionManager: typeof getScreenResolutionManager;
    setScreenResolution: (screenIndex: number, width: number, height: number) => void;
    setScreenResolutionPreset: (screenIndex: number, preset: ResolutionPreset) => void;
    getScreenResolutionConfig: () => ResolutionLayout;
    autoDetectScreenResolutions: () => Promise<void>;
    resetScreenResolutions: (screenCount: number) => void;
  }
}

// Export window API
if (typeof window !== 'undefined') {
  (window as any).initializeScreenResolutionManager = initializeScreenResolutionManager;
  (window as any).getScreenResolutionManager = getScreenResolutionManager;
  (window as any).setScreenResolution = (screenIndex: number, width: number, height: number) => {
    getScreenResolutionManager().setResolutionForScreen(screenIndex, width, height);
  };
  (window as any).setScreenResolutionPreset = (screenIndex: number, preset: ResolutionPreset) => {
    getScreenResolutionManager().setPresetForScreen(screenIndex, preset);
  };
  (window as any).getScreenResolutionConfig = () => {
    return getScreenResolutionManager().getLayout();
  };
  (window as any).autoDetectScreenResolutions = async () => {
    await getScreenResolutionManager().autoDetectResolutions();
  };
  (window as any).resetScreenResolutions = (screenCount: number) => {
    getScreenResolutionManager().resetToDefault(screenCount);
  };
}
