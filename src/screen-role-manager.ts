/**
 * Screen Role Manager
 * Allows users to assign roles (playfield, backglass, DMD) to specific screens
 * Useful for multi-screen arcade cabinet setups
 */

export type ScreenRole = 'playfield' | 'backglass' | 'dmd' | 'none';

export interface ScreenConfig {
  screenIndex: number; // 0, 1, 2, etc.
  role: ScreenRole;
  name: string; // User-friendly name
}

export interface MultiScreenLayout {
  screenCount: number;
  screens: ScreenConfig[];
  autoApply: boolean; // Auto-apply layout on startup
}

const STORAGE_KEY = 'fpw_screen_roles';
const DEFAULT_LAYOUTS: Record<number, MultiScreenLayout> = {
  1: {
    screenCount: 1,
    screens: [
      { screenIndex: 0, role: 'playfield', name: 'Screen 1 - Playfield' },
    ],
    autoApply: true,
  },
  2: {
    screenCount: 2,
    screens: [
      { screenIndex: 0, role: 'playfield', name: 'Screen 1 - Playfield' },
      { screenIndex: 1, role: 'backglass', name: 'Screen 2 - Backglass + DMD' },
    ],
    autoApply: true,
  },
  3: {
    screenCount: 3,
    screens: [
      { screenIndex: 0, role: 'playfield', name: 'Screen 1 - Playfield' },
      { screenIndex: 1, role: 'backglass', name: 'Screen 2 - Backglass' },
      { screenIndex: 2, role: 'dmd', name: 'Screen 3 - DMD' },
    ],
    autoApply: true,
  },
};

class ScreenRoleManager {
  private currentLayout: MultiScreenLayout;

  constructor() {
    this.currentLayout = this.loadLayout();
  }

  /**
   * Load layout from localStorage or use default
   */
  private loadLayout(): MultiScreenLayout {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error('Failed to load screen roles:', e);
    }
    return this.getDefaultLayout(2); // Default to 2-screen layout
  }

  /**
   * Save layout to localStorage
   */
  private saveLayout(layout: MultiScreenLayout): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(layout));
      console.log('✓ Screen roles saved');
    } catch (e) {
      console.error('Failed to save screen roles:', e);
    }
  }

  /**
   * Get default layout for screen count
   */
  getDefaultLayout(screenCount: number): MultiScreenLayout {
    return DEFAULT_LAYOUTS[screenCount] || DEFAULT_LAYOUTS[1];
  }

  /**
   * Get current layout
   */
  getLayout(): MultiScreenLayout {
    return this.currentLayout;
  }

  /**
   * Set layout
   */
  setLayout(layout: MultiScreenLayout): void {
    this.currentLayout = layout;
    this.saveLayout(layout);
  }

  /**
   * Get role for specific screen
   */
  getRoleForScreen(screenIndex: number): ScreenRole {
    const config = this.currentLayout.screens.find(
      (s) => s.screenIndex === screenIndex
    );
    return config?.role || 'none';
  }

  /**
   * Set role for specific screen
   */
  setRoleForScreen(screenIndex: number, role: ScreenRole): void {
    const screenIndex_to_update = this.currentLayout.screens.findIndex(
      (s) => s.screenIndex === screenIndex
    );

    if (screenIndex_to_update >= 0) {
      this.currentLayout.screens[screenIndex_to_update].role = role;
    } else {
      this.currentLayout.screens.push({
        screenIndex,
        role,
        name: `Screen ${screenIndex + 1} - ${role}`,
      });
    }

    this.saveLayout(this.currentLayout);
  }

  /**
   * Find which screen has a specific role
   */
  getScreenWithRole(role: ScreenRole): ScreenConfig | undefined {
    return this.currentLayout.screens.find((s) => s.role === role);
  }

  /**
   * Get all screens with details
   */
  getAllScreens(): ScreenConfig[] {
    return [...this.currentLayout.screens];
  }

  /**
   * Reset to default layout for screen count
   */
  resetToDefault(screenCount: number): void {
    this.currentLayout = this.getDefaultLayout(screenCount);
    this.saveLayout(this.currentLayout);
    console.log(`✓ Screen roles reset to default for ${screenCount} screens`);
  }

  /**
   * Swap roles between two screens
   */
  swapRoles(screenIndex1: number, screenIndex2: number): void {
    const screen1 = this.currentLayout.screens.find(
      (s) => s.screenIndex === screenIndex1
    );
    const screen2 = this.currentLayout.screens.find(
      (s) => s.screenIndex === screenIndex2
    );

    if (screen1 && screen2) {
      const tempRole = screen1.role;
      screen1.role = screen2.role;
      screen2.role = tempRole;
      this.saveLayout(this.currentLayout);
      console.log(
        `✓ Swapped roles: Screen ${screenIndex1 + 1} ↔ Screen ${screenIndex2 + 1}`
      );
    }
  }

  /**
   * Assign all roles at once (useful for presets)
   */
  assignRoles(roles: Record<number, ScreenRole>): void {
    Object.entries(roles).forEach(([screenIndex, role]) => {
      this.setRoleForScreen(parseInt(screenIndex), role);
    });
  }

  /**
   * Check if a role is assigned to any screen
   */
  hasRole(role: ScreenRole): boolean {
    return this.currentLayout.screens.some((s) => s.role === role);
  }

  /**
   * Get configuration as URL parameters for window opening
   */
  getWindowSpecs(
    role: ScreenRole
  ): { role: string; x: number; y: number; width: number; height: number } | null {
    const screen = this.getScreenWithRole(role);
    if (!screen) return null;

    // Try to load saved window position
    try {
      const saved = JSON.parse(
        localStorage.getItem(`fpw_winpos_${role}`) ?? 'null'
      );
      if (saved && saved.w > 100 && saved.h > 100) {
        return {
          role,
          x: saved.x || 0,
          y: saved.y || 0,
          width: saved.w,
          height: saved.h,
        };
      }
    } catch (e) {
      // Fall through to defaults
    }

    // Default dimensions per role
    const defaults: Record<string, { width: number; height: number }> = {
      playfield: { width: 1920, height: 1080 },
      backglass: { width: 1024, height: 768 },
      dmd: { width: 1024, height: 256 },
    };

    const defaultSize = defaults[role] || { width: 800, height: 600 };
    return {
      role,
      x: screen.screenIndex * 1920, // Rough positioning
      y: 0,
      width: defaultSize.width,
      height: defaultSize.height,
    };
  }

  /**
   * Get suggested layout for arcade cabinet (3-screen)
   */
  getCabinetLayout(): MultiScreenLayout {
    return this.getDefaultLayout(3);
  }

  /**
   * Get suggested layout for laptop/desktop (1-2 screen)
   */
  getDesktopLayout(): MultiScreenLayout {
    return this.getDefaultLayout(2);
  }
}

// Singleton instance
let managerInstance: ScreenRoleManager | null = null;

export function initializeScreenRoleManager(): ScreenRoleManager {
  if (!managerInstance) {
    managerInstance = new ScreenRoleManager();
  }
  return managerInstance;
}

export function getScreenRoleManager(): ScreenRoleManager {
  if (!managerInstance) {
    managerInstance = new ScreenRoleManager();
  }
  return managerInstance;
}

// Window global declarations
declare global {
  interface Window {
    initializeScreenRoleManager: typeof initializeScreenRoleManager;
    getScreenRoleManager: typeof getScreenRoleManager;
    configureScreenRoles: (layout: MultiScreenLayout) => void;
    getScreenRoleConfig: () => MultiScreenLayout;
    setScreenRole: (screenIndex: number, role: ScreenRole) => void;
    swapScreenRoles: (screen1: number, screen2: number) => void;
    resetScreenRoles: (screenCount: number) => void;
  }
}

// Export window API
if (typeof window !== 'undefined') {
  (window as any).initializeScreenRoleManager = initializeScreenRoleManager;
  (window as any).getScreenRoleManager = getScreenRoleManager;
  (window as any).configureScreenRoles = (layout: MultiScreenLayout) => {
    getScreenRoleManager().setLayout(layout);
  };
  (window as any).getScreenRoleConfig = () => {
    return getScreenRoleManager().getLayout();
  };
  (window as any).setScreenRole = (screenIndex: number, role: ScreenRole) => {
    getScreenRoleManager().setRoleForScreen(screenIndex, role);
  };
  (window as any).swapScreenRoles = (screen1: number, screen2: number) => {
    getScreenRoleManager().swapRoles(screen1, screen2);
  };
  (window as any).resetScreenRoles = (screenCount: number) => {
    getScreenRoleManager().resetToDefault(screenCount);
  };
}
