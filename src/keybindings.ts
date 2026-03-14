/**
 * keybindings.ts — Configurable Key Bindings for Game Functions
 *
 * Allows users to customize keyboard shortcuts for:
 * - Flippers, plunger, tilt controls
 * - Coin insertion, game start
 * - UI navigation, settings
 * - Special debug/admin functions
 */

export interface KeyBinding {
  key: string;
  shift?: boolean;
  ctrl?: boolean;
  alt?: boolean;
  meta?: boolean;
}

export interface KeyBindingConfig {
  // Gameplay
  flipperLeft: KeyBinding;
  flipperRight: KeyBinding;
  plunger: KeyBinding;
  tiltLeft: KeyBinding;
  tiltRight: KeyBinding;
  resetBall: KeyBinding;
  toggleMusic: KeyBinding;

  // Arcade Coin System
  insertCoin: KeyBinding;
  startGame: KeyBinding;

  // UI & Debug
  toggleSettings: KeyBinding;
  toggleProfiler: KeyBinding;
  toggleDMDMode: KeyBinding;
  fullscreen: KeyBinding;

  // Cabinet Mode
  rotateClockwise: KeyBinding;
  rotateCounterClockwise: KeyBinding;
  rotateSwap: KeyBinding;
}

// ─── Default Key Bindings ────────────────────────────────────────────────────
export const DEFAULT_KEYBINDINGS: KeyBindingConfig = {
  // Gameplay (Original Future Pinball controls)
  flipperLeft: { key: 'Shift', shift: true },          // LEFT SHIFT
  flipperRight: { key: 'Shift', shift: true },         // RIGHT SHIFT (location 2)
  plunger: { key: 'Enter' },                           // ENTER
  tiltLeft: { key: 'z' },                              // Z
  tiltRight: { key: 'x' },                             // X
  resetBall: { key: 'r' },                             // R
  toggleMusic: { key: 'm' },                           // M

  // Arcade Coin System
  insertCoin: { key: 'c' },                            // C
  startGame: { key: 'Enter' },                         // ENTER

  // UI & Debug
  toggleSettings: { key: 'Escape' },                   // ESC
  toggleProfiler: { key: 'p' },                        // P
  toggleDMDMode: { key: 'd' },                         // D (future)
  fullscreen: { key: 'f' },                            // F (future)

  // Cabinet Mode
  rotateClockwise: { key: 'e' },                       // E
  rotateCounterClockwise: { key: 'q' },                // Q
  rotateSwap: { key: 's', alt: true },                 // ALT+S
};

// ─── Key Binding Manager ─────────────────────────────────────────────────────
class KeyBindingManager {
  private config: KeyBindingConfig = { ...DEFAULT_KEYBINDINGS };
  private bindingMap: Map<string, string> = new Map();  // Maps key combo to action
  private storageKey = 'fpw_keybindings';

  constructor() {
    this.loadFromStorage();
    this.rebuildMap();
  }

  /**
   * Check if a KeyboardEvent matches a binding
   */
  matchesBinding(event: KeyboardEvent, bindingName: keyof KeyBindingConfig): boolean {
    const binding = this.config[bindingName];
    if (!binding) return false;

    // Check main key
    if (event.key.toLowerCase() !== binding.key.toLowerCase()) {
      // Also check code for special keys
      if (binding.key !== 'Shift' && binding.key !== 'Control' && binding.key !== 'Alt') {
        return false;
      }
    }

    // Check modifiers
    if (binding.shift && !event.shiftKey) return false;
    if (binding.ctrl && !event.ctrlKey) return false;
    if (binding.alt && !event.altKey) return false;
    if (binding.meta && !event.metaKey) return false;

    // Ensure no unexpected modifiers
    if (!binding.shift && event.shiftKey) return false;
    if (!binding.ctrl && event.ctrlKey) return false;
    if (!binding.alt && event.altKey) return false;
    if (!binding.meta && event.metaKey) return false;

    return true;
  }

  /**
   * Get current binding for an action
   */
  getBinding(action: keyof KeyBindingConfig): KeyBinding {
    return { ...this.config[action] };
  }

  /**
   * Set new binding for an action
   */
  setBinding(action: keyof KeyBindingConfig, binding: KeyBinding): void {
    this.config[action] = binding;
    this.rebuildMap();
    this.saveToStorage();
    console.log(`🔑 Keybinding updated: ${action} → ${this.bindingToString(binding)}`);
  }

  /**
   * Get all bindings
   */
  getAllBindings(): KeyBindingConfig {
    return { ...this.config };
  }

  /**
   * Reset to defaults
   */
  resetToDefaults(): void {
    this.config = { ...DEFAULT_KEYBINDINGS };
    this.rebuildMap();
    this.saveToStorage();
    console.log('🔑 Keybindings reset to defaults');
  }

  /**
   * Load bindings from localStorage
   */
  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const loaded = JSON.parse(stored);
        this.config = { ...DEFAULT_KEYBINDINGS, ...loaded };
        console.log('🔑 Keybindings loaded from storage');
      }
    } catch (e) {
      console.warn('⚠️ Failed to load keybindings from storage', e);
    }
  }

  /**
   * Save bindings to localStorage
   */
  private saveToStorage(): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.config));
    } catch (e) {
      console.warn('⚠️ Failed to save keybindings to storage', e);
    }
  }

  /**
   * Rebuild the key combo map for quick lookups
   */
  private rebuildMap(): void {
    this.bindingMap.clear();
    for (const [action, binding] of Object.entries(this.config)) {
      const combo = this.bindingToString(binding as KeyBinding);
      this.bindingMap.set(combo, action);
    }
  }

  /**
   * Convert binding to readable string
   */
  private bindingToString(binding: KeyBinding): string {
    const parts: string[] = [];
    if (binding.ctrl) parts.push('Ctrl');
    if (binding.alt) parts.push('Alt');
    if (binding.shift) parts.push('Shift');
    if (binding.meta) parts.push('Meta');
    parts.push(binding.key.toUpperCase());
    return parts.join('+');
  }

  /**
   * Get human-readable string for a binding
   */
  getBindingLabel(action: keyof KeyBindingConfig): string {
    const binding = this.config[action];
    return this.bindingToString(binding);
  }

  /**
   * Get all bindings as human-readable list
   */
  getBindingsList(): Array<{ action: string; key: string }> {
    return Object.entries(this.config).map(([action, binding]) => ({
      action,
      key: this.bindingToString(binding as KeyBinding),
    }));
  }
}

// ─── Global Instance ────────────────────────────────────────────────────────
let keyBindingManager: KeyBindingManager | null = null;

export function initializeKeyBindings(): KeyBindingManager {
  if (!keyBindingManager) {
    keyBindingManager = new KeyBindingManager();
    console.log('✅ Key Binding Manager initialized');
  }
  return keyBindingManager;
}

export function getKeyBindingManager(): KeyBindingManager {
  if (!keyBindingManager) {
    return initializeKeyBindings();
  }
  return keyBindingManager;
}

// ─── Convenience Checker ────────────────────────────────────────────────────
export function checkKeyBinding(event: KeyboardEvent, action: keyof KeyBindingConfig): boolean {
  const manager = getKeyBindingManager();
  return manager.matchesBinding(event, action);
}

// ─── Window API ─────────────────────────────────────────────────────────────
(window as any).getKeyBindings = () => getKeyBindingManager().getAllBindings();
(window as any).setKeyBinding = (action: string, key: string) => {
  const binding: KeyBinding = { key };
  getKeyBindingManager().setBinding(action as keyof KeyBindingConfig, binding);
};
(window as any).resetKeyBindings = () => getKeyBindingManager().resetToDefaults();
(window as any).showKeyBindings = () => {
  console.table(getKeyBindingManager().getBindingsList());
};
