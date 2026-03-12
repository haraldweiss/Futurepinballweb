/**
 * dmd-editor.ts — DMD Display Customization Editor
 *
 * Provides editing interface for DMD display customization, including:
 * - Color scheme selection (amber, green, red, white)
 * - Resolution configuration (standard, hires, uhires)
 * - Glow effects (enable/intensity/bloom)
 * - Render mode (dots vs solid)
 * - Display mode preview (attract/playing/event/gameover)
 */

import type { TableConfig } from './types';

export interface DMDSettings {
  colorScheme: 'amber' | 'green' | 'red' | 'white';
  resolution: 'standard' | 'hires' | 'uhires';
  glowEnabled: boolean;
  glowIntensity: number;     // 0-1 (0-100%)
  bloomRadius: number;       // 0-2
  renderMode: 'dots' | 'solid';
}

interface ColorScheme {
  name: string;
  dot: string;
  bg: string;
  hex: number;
}

export class DMDEditor {
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private settings: DMDSettings;

  private originalSettings: DMDSettings;
  private currentDisplayMode: 'attract' | 'playing' | 'event' | 'gameover' = 'attract';
  private displayModeText = {
    attract: 'HIGH SCORES\nCONTROLS',
    playing: 'SCORE | 2250 | x2',
    event: '+5000!',
    gameover: 'GAME OVER',
  };

  private colorSchemes: Record<string, ColorScheme> = {
    amber: { name: 'Amber', dot: '#FFAA00', bg: '#220800', hex: 0xffaa00 },
    green: { name: 'Green', dot: '#00FF00', bg: '#002200', hex: 0x00ff00 },
    red: { name: 'Red', dot: '#FF3333', bg: '#220000', hex: 0xff3333 },
    white: { name: 'White', dot: '#FFFFFF', bg: '#222222', hex: 0xffffff },
  };

  private resolutionConfigs = {
    standard: { w: 128, h: 32, scale: 1 },
    hires: { w: 256, h: 64, scale: 2 },
    uhires: { w: 512, h: 128, scale: 4 },
  };

  constructor(tableConfig: TableConfig) {
    this.settings = tableConfig.dmdSettings ? JSON.parse(JSON.stringify(tableConfig.dmdSettings)) : this.getDefaultSettings();
    this.originalSettings = JSON.parse(JSON.stringify(this.settings));
  }

  /**
   * Get default DMD settings
   */
  private getDefaultSettings(): DMDSettings {
    return {
      colorScheme: 'amber',
      resolution: 'standard',
      glowEnabled: true,
      glowIntensity: 0.5,
      bloomRadius: 1,
      renderMode: 'dots',
    };
  }

  /**
   * Setup DMD editor UI
   */
  setupUI(container: HTMLElement): void {
    container.innerHTML = this.getEditorHTML();
    this.attachEventListeners(container);
  }

  /**
   * Get editor HTML
   */
  private getEditorHTML(): string {
    const colorSchemeOptions = Object.entries(this.colorSchemes)
      .map(([key, scheme]) => `
        <button class="scheme-btn ${this.settings.colorScheme === key ? 'active' : ''}"
                data-scheme="${key}" style="background-color: #${this.numberToHex(scheme.hex)}11; border-color: ${scheme.dot};">
          ${scheme.name}
        </button>
      `).join('');

    const resolutionOptions = Object.entries(this.resolutionConfigs)
      .map(([key, cfg]) => `
        <button class="resolution-btn ${this.settings.resolution === key ? 'active' : ''}"
                data-resolution="${key}">
          ${cfg.w}×${cfg.h}
        </button>
      `).join('');

    const displayModes = ['attract', 'playing', 'event', 'gameover']
      .map(mode => `
        <button class="display-mode-btn ${this.currentDisplayMode === mode ? 'active' : ''}"
                data-mode="${mode}">
          ${mode.charAt(0).toUpperCase() + mode.slice(1)}
        </button>
      `).join('');

    return `
      <div class="dmd-editor">
        <!-- Preview on left -->
        <div class="dmd-preview-panel">
          <div class="preview-title">LED Display Preview</div>
          <canvas id="dmd-preview-canvas" width="320" height="80"></canvas>
        </div>

        <!-- Controls on right -->
        <div class="dmd-controls-panel">
          <div class="control-section">
            <label class="control-label">Color Scheme</label>
            <div class="scheme-buttons">
              ${colorSchemeOptions}
            </div>
          </div>

          <div class="control-section">
            <label class="control-label">Resolution</label>
            <div class="resolution-buttons">
              ${resolutionOptions}
            </div>
          </div>

          <div class="control-section">
            <label class="control-label">Display Mode</label>
            <div class="mode-buttons">
              ${displayModes}
            </div>
          </div>

          <div class="control-section">
            <label class="control-label">Rendering Mode</label>
            <div class="render-buttons">
              <button class="render-btn ${this.settings.renderMode === 'dots' ? 'active' : ''}" data-render="dots">Dots</button>
              <button class="render-btn ${this.settings.renderMode === 'solid' ? 'active' : ''}" data-render="solid">Solid</button>
            </div>
          </div>

          <div class="control-section">
            <label class="control-checkbox">
              <input type="checkbox" id="glow-toggle" ${this.settings.glowEnabled ? 'checked' : ''}>
              <span>Enable Glow Effect</span>
            </label>
          </div>

          <div class="control-section">
            <label class="control-label">Glow Intensity: <span id="glow-value">${Math.round(this.settings.glowIntensity * 100)}%</span></label>
            <input type="range" id="glow-intensity" min="0" max="100" value="${Math.round(this.settings.glowIntensity * 100)}">
          </div>

          <div class="control-section">
            <label class="control-label">Bloom Radius: <span id="bloom-value">${this.settings.bloomRadius.toFixed(1)}</span></label>
            <input type="range" id="bloom-radius" min="0" max="200" step="10" value="${Math.round(this.settings.bloomRadius * 100)}">
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Attach event listeners
   */
  private attachEventListeners(container: HTMLElement): void {
    // Color scheme buttons
    container.querySelectorAll('.scheme-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        container.querySelectorAll('.scheme-btn').forEach(b => b.classList.remove('active'));
        (e.target as HTMLElement).classList.add('active');
        this.settings.colorScheme = (e.target as HTMLElement).dataset.scheme as any;
        this.renderPreview();
      });
    });

    // Resolution buttons
    container.querySelectorAll('.resolution-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        container.querySelectorAll('.resolution-btn').forEach(b => b.classList.remove('active'));
        (e.target as HTMLElement).classList.add('active');
        this.settings.resolution = (e.target as HTMLElement).dataset.resolution as any;
        this.renderPreview();
      });
    });

    // Display mode buttons
    container.querySelectorAll('.display-mode-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        container.querySelectorAll('.display-mode-btn').forEach(b => b.classList.remove('active'));
        (e.target as HTMLElement).classList.add('active');
        this.currentDisplayMode = (e.target as HTMLElement).dataset.mode as any;
        this.renderPreview();
      });
    });

    // Render mode buttons
    container.querySelectorAll('.render-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        container.querySelectorAll('.render-btn').forEach(b => b.classList.remove('active'));
        (e.target as HTMLElement).classList.add('active');
        this.settings.renderMode = (e.target as HTMLElement).dataset.render as any;
        this.renderPreview();
      });
    });

    // Glow toggle
    const glowToggle = container.querySelector('#glow-toggle') as HTMLInputElement;
    if (glowToggle) {
      glowToggle.addEventListener('change', (e) => {
        this.settings.glowEnabled = (e.target as HTMLInputElement).checked;
        this.renderPreview();
      });
    }

    // Glow intensity
    const glowIntensity = container.querySelector('#glow-intensity') as HTMLInputElement;
    const glowValue = container.querySelector('#glow-value');
    if (glowIntensity) {
      glowIntensity.addEventListener('input', (e) => {
        const val = parseInt((e.target as HTMLInputElement).value);
        this.settings.glowIntensity = val / 100;
        if (glowValue) glowValue.textContent = `${val}%`;
        this.renderPreview();
      });
    }

    // Bloom radius
    const bloomRadius = container.querySelector('#bloom-radius') as HTMLInputElement;
    const bloomValue = container.querySelector('#bloom-value');
    if (bloomRadius) {
      bloomRadius.addEventListener('input', (e) => {
        const val = parseInt((e.target as HTMLInputElement).value);
        this.settings.bloomRadius = val / 100;
        if (bloomValue) bloomValue.textContent = this.settings.bloomRadius.toFixed(1);
        this.renderPreview();
      });
    }

    // Initial render
    this.canvas = container.querySelector('#dmd-preview-canvas') as HTMLCanvasElement;
    if (this.canvas) {
      this.ctx = this.canvas.getContext('2d');
      this.renderPreview();
    }
  }

  /**
   * Render preview canvas
   */
  private renderPreview(): void {
    if (!this.canvas || !this.ctx) return;

    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    const scheme = this.colorSchemes[this.settings.colorScheme];

    // Background
    ctx.fillStyle = scheme.bg;
    ctx.fillRect(0, 0, w, h);

    // Border
    ctx.strokeStyle = '#555';
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, w - 2, h - 2);

    // Draw LED matrix pattern
    const text = this.displayModeText[this.currentDisplayMode];
    const rows = 8;
    const cols = 16;
    const dotSize = this.settings.renderMode === 'dots' ? 3 : 4;
    const gap = 2;

    const cellW = w / cols;
    const cellH = h / rows;

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        // Pseudo-random pattern based on text and position
        const isLit = Math.random() > 0.6 && col < text.length * 2;

        const x = col * cellW + cellW / 2;
        const y = row * cellH + cellH / 2;

        if (isLit) {
          ctx.fillStyle = scheme.dot;
          if (this.settings.renderMode === 'dots') {
            ctx.beginPath();
            ctx.arc(x, y, dotSize / 2, 0, Math.PI * 2);
            ctx.fill();
          } else {
            ctx.fillRect(x - dotSize / 2, y - dotSize / 2, dotSize, dotSize);
          }

          // Glow
          if (this.settings.glowEnabled) {
            const glowRadius = 3 * this.settings.glowIntensity;
            const gradient = ctx.createRadialGradient(x, y, 0, x, y, glowRadius);
            const hex = scheme.hex;
            const r = (hex >> 16) & 0xff;
            const g = (hex >> 8) & 0xff;
            const b = hex & 0xff;
            gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${this.settings.glowIntensity})`);
            gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
            ctx.fillStyle = gradient;
            ctx.fillRect(x - glowRadius, y - glowRadius, glowRadius * 2, glowRadius * 2);
          }
        }
      }
    }

    // Text overlay
    ctx.fillStyle = scheme.dot;
    ctx.font = 'bold 10px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text.split('\n')[0], w / 2, h / 2);
  }

  /**
   * Get current settings
   */
  getSettings(): DMDSettings {
    return JSON.parse(JSON.stringify(this.settings));
  }

  /**
   * Convert number to hex string
   */
  private numberToHex(num: number): string {
    return ('000000' + num.toString(16)).slice(-6);
  }

  /**
   * Cleanup
   */
  dispose(): void {
    this.canvas = null;
    this.ctx = null;
  }
}
