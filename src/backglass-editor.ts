/**
 * backglass-editor.ts — Backglass Customization Editor
 *
 * Provides editing interface for backglass appearance, including:
 * - Cabinet frame colors
 * - Decorative lighting
 * - Parallax effects
 * - Background artwork
 * - Text overlays
 */

import type { TableConfig } from './types';

export interface BackglassSettings {
  cabinetColor: number;
  decorativeLights: Array<{
    color: number;
    intensity: number;
    position: { x: number; y: number; z: number };
  }>;
  enableParallax: boolean;
  artworkTexture?: string;
  textOverlays: Array<{
    text: string;
    color: number;
    fontSize: number;
    position: { x: number; y: number };
    opacity: number;
  }>;
}

export class BackglassEditor {
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private settings: BackglassSettings;

  private originalSettings: BackglassSettings;

  constructor(tableConfig: TableConfig) {
    // Initialize from table config or defaults
    this.settings = tableConfig.backglassSettings ? JSON.parse(JSON.stringify(tableConfig.backglassSettings)) : this.getDefaultSettings();
    this.originalSettings = JSON.parse(JSON.stringify(this.settings));
  }

  /**
   * Get default backglass settings
   */
  private getDefaultSettings(): BackglassSettings {
    return {
      cabinetColor: 0x1a1a1a,
      decorativeLights: [
        { color: 0xff6600, intensity: 0.7, position: { x: -0.4, y: 0.9, z: 1 } },
        { color: 0x0088ff, intensity: 0.7, position: { x: 0.4, y: 0.9, z: 1 } },
        { color: 0x00ff88, intensity: 0.6, position: { x: -0.4, y: -0.9, z: 1 } },
        { color: 0xff00ff, intensity: 0.6, position: { x: 0.4, y: -0.9, z: 1 } },
      ],
      enableParallax: true,
      textOverlays: [],
    };
  }

  /**
   * Setup backglass editor UI
   */
  setupUI(container: HTMLElement): void {
    container.innerHTML = this.getEditorHTML();
    this.attachEventListeners(container);
  }

  /**
   * Get editor HTML
   */
  private getEditorHTML(): string {
    const lights = this.settings.decorativeLights;

    return `
      <div class="backglass-editor">
        <!-- Preview on left -->
        <div class="backglass-preview-panel">
          <div class="preview-title">Cabinet Preview</div>
          <canvas id="backglass-preview-canvas" width="300" height="400"></canvas>
        </div>

        <!-- Controls on right -->
        <div class="backglass-controls-panel">
          <div class="control-section">
            <label class="control-label">Cabinet Frame Color</label>
            <input type="color" class="backglass-color-input" id="cabinet-color"
                   value="#${this.numberToHex(this.settings.cabinetColor)}">
          </div>

          <div class="control-section">
            <label class="control-label">Corner Lights</label>
            ${lights.map((light, i) => `
              <div class="light-control">
                <div class="light-label">Light ${i + 1}</div>
                <div class="light-inputs">
                  <input type="color" class="light-color" data-light-idx="${i}"
                         value="#${this.numberToHex(light.color)}">
                  <input type="range" class="light-intensity" data-light-idx="${i}"
                         min="0" max="100" value="${Math.round(light.intensity * 100)}">
                  <span class="light-value">${Math.round(light.intensity * 100)}%</span>
                </div>
              </div>
            `).join('')}
          </div>

          <div class="control-section">
            <label class="control-checkbox">
              <input type="checkbox" id="parallax-toggle" ${this.settings.enableParallax ? 'checked' : ''}>
              <span>Enable Parallax Effect</span>
            </label>
          </div>

          <div class="control-section">
            <label class="control-label">Background Artwork</label>
            <div class="file-input-wrapper">
              <input type="file" id="artwork-upload" accept="image/*" style="display:none">
              <button class="file-btn" id="artwork-btn">📁 Upload Image</button>
            </div>
          </div>

          <div class="control-section">
            <label class="control-label">Text Overlays</label>
            <button class="add-overlay-btn" id="add-overlay-btn">+ Add Text</button>
            <div id="overlays-list"></div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Attach event listeners
   */
  private attachEventListeners(container: HTMLElement): void {
    // Cabinet color
    const cabinetInput = container.querySelector('#cabinet-color') as HTMLInputElement;
    if (cabinetInput) {
      cabinetInput.addEventListener('input', (e) => {
        this.settings.cabinetColor = this.hexToNumber((e.target as HTMLInputElement).value);
        this.renderPreview();
      });
    }

    // Light colors
    const lightColorInputs = container.querySelectorAll('.light-color');
    lightColorInputs.forEach(input => {
      input.addEventListener('input', (e) => {
        const idx = parseInt((e.target as HTMLElement).dataset.lightIdx!);
        this.settings.decorativeLights[idx].color = this.hexToNumber((e.target as HTMLInputElement).value);
        this.renderPreview();
      });
    });

    // Light intensity
    const lightIntensityInputs = container.querySelectorAll('.light-intensity');
    lightIntensityInputs.forEach(input => {
      input.addEventListener('input', (e) => {
        const idx = parseInt((e.target as HTMLElement).dataset.lightIdx!);
        const value = parseInt((e.target as HTMLInputElement).value);
        this.settings.decorativeLights[idx].intensity = value / 100;
        const valueEl = (e.target as HTMLElement).parentElement?.querySelector('.light-value');
        if (valueEl) valueEl.textContent = `${value}%`;
        this.renderPreview();
      });
    });

    // Parallax toggle
    const parallaxToggle = container.querySelector('#parallax-toggle') as HTMLInputElement;
    if (parallaxToggle) {
      parallaxToggle.addEventListener('change', (e) => {
        this.settings.enableParallax = (e.target as HTMLInputElement).checked;
        this.renderPreview();
      });
    }

    // Artwork upload
    const artworkBtn = container.querySelector('#artwork-btn');
    const artworkInput = container.querySelector('#artwork-upload') as HTMLInputElement;
    if (artworkBtn && artworkInput) {
      artworkBtn.addEventListener('click', () => artworkInput.click());
      artworkInput.addEventListener('change', (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (event) => {
            this.settings.artworkTexture = event.target?.result as string;
            this.renderPreview();
          };
          reader.readAsDataURL(file);
        }
      });
    }

    // Add overlay button
    const addOverlayBtn = container.querySelector('#add-overlay-btn');
    if (addOverlayBtn) {
      addOverlayBtn.addEventListener('click', () => {
        this.settings.textOverlays.push({
          text: 'Label',
          color: 0xffffff,
          fontSize: 14,
          position: { x: 0.5, y: 0.5 },
          opacity: 1,
        });
        this.updateOverlaysList(container);
        this.renderPreview();
      });
    }

    // Initial render
    this.canvas = container.querySelector('#backglass-preview-canvas') as HTMLCanvasElement;
    if (this.canvas) {
      this.ctx = this.canvas.getContext('2d');
      this.renderPreview();
    }
  }

  /**
   * Update overlays list UI
   */
  private updateOverlaysList(container: HTMLElement): void {
    const list = container.querySelector('#overlays-list') as HTMLElement;
    if (!list) return;

    list.innerHTML = this.settings.textOverlays.map((overlay, idx) => `
      <div class="overlay-item" data-overlay-idx="${idx}">
        <input type="text" class="overlay-text" value="${overlay.text}" data-idx="${idx}" placeholder="Text">
        <input type="color" class="overlay-color" value="#${this.numberToHex(overlay.color)}" data-idx="${idx}">
        <button class="remove-overlay-btn" data-idx="${idx}">✕</button>
      </div>
    `).join('');

    // Attach listeners
    list.querySelectorAll('.overlay-text').forEach(input => {
      input.addEventListener('input', (e) => {
        const idx = parseInt((e.target as HTMLElement).dataset.idx!);
        this.settings.textOverlays[idx].text = (e.target as HTMLInputElement).value;
        this.renderPreview();
      });
    });

    list.querySelectorAll('.overlay-color').forEach(input => {
      input.addEventListener('input', (e) => {
        const idx = parseInt((e.target as HTMLElement).dataset.idx!);
        this.settings.textOverlays[idx].color = this.hexToNumber((e.target as HTMLInputElement).value);
        this.renderPreview();
      });
    });

    list.querySelectorAll('.remove-overlay-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const idx = parseInt((e.target as HTMLElement).dataset.idx!);
        this.settings.textOverlays.splice(idx, 1);
        this.updateOverlaysList(container);
        this.renderPreview();
      });
    });
  }

  /**
   * Render preview canvas
   */
  private renderPreview(): void {
    if (!this.canvas || !this.ctx) return;

    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    // Background
    ctx.fillStyle = '#' + this.numberToHex(this.settings.cabinetColor);
    ctx.fillRect(0, 0, w, h);

    // Cabinet frame
    ctx.strokeStyle = '#00aaff';
    ctx.lineWidth = 8;
    ctx.strokeRect(10, 10, w - 20, h - 20);

    // Artwork if provided
    if (this.settings.artworkTexture) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 30, 30, w - 60, h - 100);
        this.renderLightsAndOverlays(ctx, w, h);
      };
      img.src = this.settings.artworkTexture;
    } else {
      // Placeholder
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.fillRect(30, 30, w - 60, h - 100);
      ctx.fillStyle = '#666';
      ctx.font = '12px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('No artwork', w / 2, h / 2);

      this.renderLightsAndOverlays(ctx, w, h);
    }
  }

  /**
   * Render lights and overlays
   */
  private renderLightsAndOverlays(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    // Render lights as glowing circles
    this.settings.decorativeLights.forEach(light => {
      const x = w * (0.5 + light.position.x);
      const y = h * (0.5 + light.position.y);
      const radius = 8;

      // Glow
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius * 2);
      gradient.addColorStop(0, `rgba(${this.getR(light.color)}, ${this.getG(light.color)}, ${this.getB(light.color)}, ${light.intensity})`);
      gradient.addColorStop(1, `rgba(${this.getR(light.color)}, ${this.getG(light.color)}, ${this.getB(light.color)}, 0)`);
      ctx.fillStyle = gradient;
      ctx.fillRect(x - radius * 2, y - radius * 2, radius * 4, radius * 4);

      // Core
      ctx.fillStyle = '#' + this.numberToHex(light.color);
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    });

    // Render text overlays
    this.settings.textOverlays.forEach(overlay => {
      ctx.save();
      ctx.globalAlpha = overlay.opacity;
      ctx.fillStyle = '#' + this.numberToHex(overlay.color);
      ctx.font = `${overlay.fontSize}px Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(overlay.text, w * overlay.position.x, h * overlay.position.y);
      ctx.restore();
    });
  }

  /**
   * Get current settings
   */
  getSettings(): BackglassSettings {
    return JSON.parse(JSON.stringify(this.settings));
  }

  /**
   * Convert hex string to number
   */
  private hexToNumber(hex: string): number {
    return parseInt(hex.replace('#', ''), 16);
  }

  /**
   * Convert number to hex string
   */
  private numberToHex(num: number): string {
    return ('000000' + num.toString(16)).slice(-6);
  }

  /**
   * Extract RGB components
   */
  private getR(color: number): number { return (color >> 16) & 0xff; }
  private getG(color: number): number { return (color >> 8) & 0xff; }
  private getB(color: number): number { return color & 0xff; }

  /**
   * Cleanup
   */
  dispose(): void {
    this.canvas = null;
    this.ctx = null;
  }
}
