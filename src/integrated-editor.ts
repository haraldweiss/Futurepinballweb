/**
 * integrated-editor.ts — Integrated Table Editor Modal
 *
 * Provides a tabbed modal dialog with:
 * - Tab 1: Playfield Editor (2D canvas + 3D preview)
 * - Tab 2: Backglass Editor (cabinet customization)
 * - Tab 3: DMD Editor (display customization)
 * - Table context management
 * - Multi-editor state synchronization
 */

import type { TableConfig } from './types';
import { Editor3DPreview } from './editor-3d-preview';
import { parseFPTFile } from './fpt-parser';
import { BackglassEditor, type BackglassSettings } from './backglass-editor';
import { DMDEditor, type DMDSettings } from './dmd-editor';
import { VideoEditor } from './video-editor';
import { showTableSelector } from './table-selector';
import { escapeHtml } from './utils/html-escape';

type ToolType = 'select' | 'bumper' | 'target' | 'ramp';

interface Bumper { type: 'bumper'; x: number; y: number; color: number; }
interface Target { type: 'target'; x: number; y: number; color: number; }
interface Ramp { type: 'ramp'; x1: number; y1: number; x2: number; y2: number; color: number; }
type Elem = Bumper | Target | Ramp;

export interface EditorState {
  elements: Elem[];
  tableName: string;
  tableColor: string;
  accentColor: string;
  selectedIdx: number;
}

export class EditorModal {
  private isOpen = false;
  private modal: HTMLElement | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private preview3d: Editor3DPreview | null = null;

  // Tab management
  private currentTab: 'playfield' | 'backglass' | 'dmd' | 'video' = 'playfield';
  private currentTableConfig: TableConfig | null = null;

  // Sub-editors
  private backglassEditor: BackglassEditor | null = null;
  private dmdEditor: DMDEditor | null = null;
  private videoEditor: VideoEditor | null = null;

  // Editor state (Playfield)
  private elements: Elem[] = [];
  private selectedIdx = -1;
  private tool: ToolType = 'select';
  private tableName = 'My Table';
  private tableColor = '#1a2a18';
  private accentColor = '#00ff66';
  private snapEnabled = true;
  private colorIdx = 0;

  // Canvas state
  private isDragging = false;
  private dragOffX = 0;
  private dragOffY = 0;
  private rampStart: { x: number; y: number } | null = null;

  // Canvas constants (same as editor.ts)
  private readonly GW = 6;  // Game width
  private readonly GH = 12; // Game height
  private readonly COLORS = [0xff2200, 0xff6600, 0xffcc00, 0x00ff88, 0x00aaff, 0xcc00ff, 0xff00aa, 0x00ffff];

  // Original table (for discard)
  private originalConfig: TableConfig | null = null;

  constructor() {
    // Modal will be created on first open
  }

  /**
   * Open editor modal with a table configuration
   */
  open(config: TableConfig): void {
    if (this.isOpen) this.close();

    // Store current table
    this.currentTableConfig = JSON.parse(JSON.stringify(config));

    // Save original config for discard
    this.originalConfig = JSON.parse(JSON.stringify(config));

    // Create modal if not exists
    if (!this.modal) {
      this.createModal();
    }

    // Load table config into editor
    this.loadTableConfig(config);

    // Show modal
    if (this.modal) {
      this.modal.classList.remove('hidden');
      this.isOpen = true;

      // Initialize canvases
      setTimeout(() => {
        this.setupCanvases();
      }, 100);
    }
  }

  /**
   * Close editor modal
   */
  close(): void {
    if (this.modal) {
      this.modal.classList.add('hidden');
    }
    this.isOpen = false;
    this.cleanup();
  }

  /**
   * Switch to a different editor tab
   */
  switchTab(tabId: 'playfield' | 'backglass' | 'dmd' | 'video'): void {
    this.currentTab = tabId;

    if (!this.modal) return;

    // Hide all tabs
    this.modal.querySelectorAll('.editor-tab').forEach(tab => {
      (tab as HTMLElement).classList.add('hidden');
    });

    // Show selected tab
    const selectedTab = this.modal.querySelector(`#tab-${tabId}`);
    if (selectedTab) {
      (selectedTab as HTMLElement).classList.remove('hidden');
    }

    // Update active tab button
    this.modal.querySelectorAll('.tab-btn').forEach(btn => {
      btn.classList.remove('active');
    });
    const activeBtn = this.modal.querySelector(`[data-tab="${tabId}"]`);
    if (activeBtn) {
      activeBtn.classList.add('active');
    }

    // Initialize editors if needed
    if (tabId === 'backglass' && !this.backglassEditor && this.currentTableConfig) {
      this.backglassEditor = new BackglassEditor(this.currentTableConfig);
      const container = this.modal.querySelector('.backglass-editor-container');
      if (container) {
        this.backglassEditor.setupUI(container as HTMLElement);
      }
    }

    if (tabId === 'dmd' && !this.dmdEditor && this.currentTableConfig) {
      this.dmdEditor = new DMDEditor(this.currentTableConfig);
      const container = this.modal.querySelector('.dmd-editor-container');
      if (container) {
        this.dmdEditor.setupUI(container as HTMLElement);
      }
    }

    if (tabId === 'video' && !this.videoEditor && this.currentTableConfig) {
      this.videoEditor = new VideoEditor(this.currentTableConfig);
      const container = this.modal.querySelector('.video-editor-container');
      if (container) {
        const videoPanel = this.videoEditor.createPanel();
        container.innerHTML = '';
        container.appendChild(videoPanel);
      }
    }
  }

  /**
   * Get current table config
   */
  getCurrentTable(): TableConfig | null {
    return this.currentTableConfig;
  }

  /**
   * Apply changes to current game table
   */
  applyChanges(): void {
    if (!this.originalConfig) return;

    const changes: TableConfig = {
      ...this.originalConfig,
      name: this.tableName,
      tableColor: parseInt(this.tableColor.replace('#', ''), 16),
      accentColor: parseInt(this.accentColor.replace('#', ''), 16),
      bumpers: this.elements.filter(e => e.type === 'bumper').map(e => ({
        x: (e as Bumper).x,
        y: (e as Bumper).y,
        color: e.color,
      })),
      targets: this.elements.filter(e => e.type === 'target').map(e => ({
        x: (e as Target).x,
        y: (e as Target).y,
        color: e.color,
      })),
      ramps: this.elements.filter(e => e.type === 'ramp').map(e => ({
        x1: (e as Ramp).x1,
        y1: (e as Ramp).y1,
        x2: (e as Ramp).x2,
        y2: (e as Ramp).y2,
        color: e.color,
      })),
    };

    // Add backglass settings if editor exists
    if (this.backglassEditor) {
      changes.backglassSettings = this.backglassEditor.getSettings();
    }

    // Add DMD settings if editor exists
    if (this.dmdEditor) {
      changes.dmdSettings = this.dmdEditor.getSettings();
    }

    // Emit event for main game to handle the update
    window.dispatchEvent(new CustomEvent('editor:apply-changes', {
      detail: changes
    }));

    this.close();
  }

  /**
   * Discard changes and close
   */
  discardChanges(): void {
    this.close();
  }

  /**
   * Switch to a different table
   */
  switchTable(): void {
    // Check for unsaved changes
    const hasChanges = this.hasUnsavedChanges();

    if (hasChanges) {
      const confirmed = confirm('You have unsaved changes. Switch table anyway?');
      if (!confirmed) return;
    }

    // Close current editor
    this.close();

    // Show table selector
    showTableSelector((tableKey: string) => {
      // Load the selected demo table
      (window as any).loadDemoTable(tableKey);

      // After a short delay, reopen editor with new table
      setTimeout(() => {
        if ((window as any).currentTableConfig) {
          this.open((window as any).currentTableConfig);
        }
      }, 100);
    });
  }

  /**
   * Check if there are unsaved changes
   */
  private hasUnsavedChanges(): boolean {
    if (!this.originalConfig) return false;

    // Check playfield elements
    const originalCount =
      (this.originalConfig.bumpers?.length || 0) +
      (this.originalConfig.targets?.length || 0) +
      (this.originalConfig.ramps?.length || 0);

    if (this.elements.length !== originalCount) return true;

    // Check colors
    const originalTableColor = `#${(this.originalConfig.tableColor || 0x1a2a18).toString(16).padStart(6, '0')}`;
    if (this.tableColor !== originalTableColor) return true;

    const originalAccentColor = `#${(this.originalConfig.accentColor || 0x00ff66).toString(16).padStart(6, '0')}`;
    if (this.accentColor !== originalAccentColor) return true;

    return false;
  }

  /**
   * Check if editor is open
   */
  isOpening(): boolean {
    return this.isOpen;
  }

  /**
   * Load a Future Pinball (FPT) table file into the editor
   */
  async loadFPTFile(file: File): Promise<void> {
    try {
      // Parse the FPT file
      const config = await parseFPTFile(file);
      if (!config) {
        alert('Failed to parse FPT file');
        return;
      }

      // Load the config into the editor
      this.loadTableConfig(config);
      this.updateEditor();

      // Show success notification
      const notif = document.createElement('div');
      notif.textContent = `✅ Loaded: ${file.name}`;
      notif.style.cssText = 'position:fixed;top:20px;left:50%;transform:translateX(-50%);background:#00cc66;color:#000;padding:10px 20px;border-radius:5px;z-index:10000;font-weight:bold;';
      document.body.appendChild(notif);
      setTimeout(() => notif.remove(), 3000);
    } catch (e) {
      alert(`Error loading FPT file: ${e}`);
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Private methods
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Create modal DOM structure
   */
  private createModal(): void {
    this.modal = document.getElementById('editor-modal') || document.createElement('div');

    if (!this.modal.id) {
      // Modal doesn't exist in HTML, create it
      this.modal.id = 'editor-modal';
      this.modal.className = 'editor-modal hidden';
      this.modal.innerHTML = this.getModalHTML();
      document.body.appendChild(this.modal);
    }

    // Attach event listeners
    const closeBtn = this.modal.querySelector('.modal-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.discardChanges());
    }
  }

  /**
   * Get modal HTML structure
   */
  private getModalHTML(): string {
    const tableName = escapeHtml(this.currentTableConfig?.name || 'Table');
    return `
      <div class="editor-modal-header">
        <div class="header-top">
          <h2>📝 Table Editor: ${tableName}</h2>
          <button class="modal-close" title="Close editor">✕</button>
        </div>
        <div class="tab-navigation">
          <button class="tab-btn active" data-tab="playfield" title="Edit playfield">⊞ Playfield</button>
          <button class="tab-btn" data-tab="backglass" title="Edit backglass">🖼️ Backglass</button>
          <button class="tab-btn" data-tab="dmd" title="Edit DMD">🔲 DMD</button>
          <button class="tab-btn" data-tab="video" title="Manage videos">🎬 Videos</button>
        </div>
      </div>

      <div class="editor-modal-content">
        <!-- TAB 1: Playfield Editor -->
        <div id="tab-playfield" class="editor-tab active">
          <div class="editor-2d-panel">
            <div class="editor-toolbar">
              <button class="tool-btn active" data-tool="select" title="Select (S)">⊹</button>
              <button class="tool-btn" data-tool="bumper" title="Bumper (B)">●</button>
              <button class="tool-btn" data-tool="target" title="Target (T)">▪</button>
              <button class="tool-btn" data-tool="ramp" title="Ramp (R)">╱</button>
              <hr>
              <button class="tool-btn snap-btn active" title="Toggle snap">⊞ SNAP</button>
              <button class="tool-btn clear-btn" title="Clear all">🗑</button>
              <hr>
              <button class="tool-btn load-fpt-btn" title="Load FPT file">📂 FPT</button>
              <input type="file" id="fpt-file-input" accept=".fpt,.fp" style="display:none">
            </div>

            <div class="editor-canvas-wrap">
              <canvas id="integrated-editor-canvas" width="400" height="800"></canvas>
            </div>

            <div class="editor-properties">
              <div class="prop-group">
                <label>Table Name:</label>
                <input type="text" id="prop-name" class="prop-input" placeholder="Table name">
              </div>
              <div class="prop-group">
                <label>Table Color:</label>
                <input type="color" id="prop-color" class="prop-color">
              </div>
              <div class="prop-group">
                <label>Accent Color:</label>
                <input type="color" id="prop-accent" class="prop-color">
              </div>
              <div class="prop-group">
                <small id="elem-count">Elements: 0</small>
              </div>
            </div>
          </div>

          <div class="editor-3d-panel">
            <div class="preview-label">3D Preview (Top-Down)</div>
            <canvas id="editor-3d-canvas" width="400" height="800"></canvas>
            <div class="preview-info">
              <small>Real-time preview updates as you edit</small>
            </div>
          </div>
        </div>

        <!-- TAB 2: Backglass Editor -->
        <div id="tab-backglass" class="editor-tab hidden">
          <div class="backglass-editor-container"></div>
        </div>

        <!-- TAB 3: DMD Editor -->
        <div id="tab-dmd" class="editor-tab hidden">
          <div class="dmd-editor-container"></div>
        </div>

        <!-- TAB 4: Video Manager -->
        <div id="tab-video" class="editor-tab hidden">
          <div class="video-editor-container"></div>
        </div>
      </div>

      <div class="editor-modal-footer">
        <button class="btn-apply" onclick="(window as any).getIntegratedEditor?.().applyChanges?.()">✓ Apply & Save</button>
        <button class="btn-discard" onclick="(window as any).getIntegratedEditor?.().discardChanges?.()">✕ Discard</button>
        <button class="btn-switch-table" onclick="(window as any).getIntegratedEditor?.().switchTable?.()">⇨ Switch Table</button>
      </div>
    `;
  }

  /**
   * Setup canvas and attach event listeners
   */
  private setupCanvases(): void {
    this.canvas = document.getElementById('integrated-editor-canvas') as HTMLCanvasElement;
    if (!this.canvas) return;

    this.ctx = this.canvas.getContext('2d');
    if (!this.ctx) return;

    // Attach canvas events
    this.canvas.addEventListener('mousemove', (e) => this.onCanvasMouseMove(e));
    this.canvas.addEventListener('mousedown', (e) => this.onCanvasMouseDown(e));
    this.canvas.addEventListener('mouseup', (e) => this.onCanvasMouseUp(e));
    this.canvas.addEventListener('click', (e) => this.onCanvasClick(e));

    // Toolbar events
    const toolBtns = this.modal?.querySelectorAll('[data-tool]');
    toolBtns?.forEach(btn => {
      btn.addEventListener('click', (e) => {
        toolBtns.forEach(b => b.classList.remove('active'));
        (e.target as HTMLElement).classList.add('active');
        const tool = (btn as HTMLElement).dataset.tool as ToolType;
        this.setTool(tool);
      });
    });

    // Snap button
    const snapBtn = this.modal?.querySelector('.snap-btn');
    snapBtn?.addEventListener('click', () => {
      this.snapEnabled = !this.snapEnabled;
      snapBtn.classList.toggle('active');
    });

    // Clear button
    const clearBtn = this.modal?.querySelector('.clear-btn');
    clearBtn?.addEventListener('click', () => {
      if (confirm('Clear all elements?')) {
        this.elements = [];
        this.selectedIdx = -1;
        this.updateEditor();
      }
    });

    // Load FPT file button
    const loadFptBtn = this.modal?.querySelector('.load-fpt-btn');
    const fptInput = this.modal?.querySelector('#fpt-file-input') as HTMLInputElement;

    if (loadFptBtn && fptInput) {
      loadFptBtn.addEventListener('click', () => {
        fptInput.click();
      });

      fptInput.addEventListener('change', async (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (file) {
          await this.loadFPTFile(file);
          // Reset input so same file can be loaded again
          fptInput.value = '';
        }
      });
    }

    // Setup drag-and-drop support
    this.setupDragAndDrop();

    // Setup tab navigation
    const tabButtons = this.modal?.querySelectorAll('.tab-btn');
    tabButtons?.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const tabId = (e.target as HTMLElement).dataset.tab as 'playfield' | 'backglass' | 'dmd' | 'video';
        this.switchTab(tabId);
      });
    });

    // Property inputs
    const nameInput = this.modal?.querySelector('#prop-name') as HTMLInputElement;
    const colorInput = this.modal?.querySelector('#prop-color') as HTMLInputElement;
    const accentInput = this.modal?.querySelector('#prop-accent') as HTMLInputElement;

    if (nameInput) {
      nameInput.value = this.tableName;
      nameInput.addEventListener('input', (e) => {
        this.tableName = (e.target as HTMLInputElement).value;
        this.updateEditor();
      });
    }

    if (colorInput) {
      colorInput.value = this.tableColor;
      colorInput.addEventListener('input', (e) => {
        this.tableColor = (e.target as HTMLInputElement).value;
        this.updateEditor();
      });
    }

    if (accentInput) {
      accentInput.value = this.accentColor;
      accentInput.addEventListener('input', (e) => {
        this.accentColor = (e.target as HTMLInputElement).value;
        this.updateEditor();
      });
    }

    // Initialize 3D preview
    const canvas3d = document.getElementById('editor-3d-canvas') as HTMLCanvasElement;
    if (canvas3d) {
      this.preview3d = new Editor3DPreview(canvas3d);
      this.preview3d.updateTableColors(
        parseInt(this.tableColor.replace('#', ''), 16),
        parseInt(this.accentColor.replace('#', ''), 16)
      );
      this.preview3d.setElements(this.elements);
    }

    // Initial render
    this.render();
  }

  /**
   * Load table configuration into editor
   */
  private loadTableConfig(config: TableConfig): void {
    this.tableName = config.name || 'My Table';
    this.tableColor = '#' + ('000000' + (config.tableColor || 0x1a4a15).toString(16)).slice(-6);
    this.accentColor = '#' + ('000000' + (config.accentColor || 0x00ff66).toString(16)).slice(-6);

    this.elements = [];
    (config.bumpers || []).forEach(b => {
      this.elements.push({ type: 'bumper', x: b.x, y: b.y, color: b.color || 0xff2200 });
    });
    (config.targets || []).forEach(t => {
      this.elements.push({ type: 'target', x: t.x, y: t.y, color: t.color || 0x00aaff });
    });
    (config.ramps || []).forEach(r => {
      this.elements.push({ type: 'ramp', x1: r.x1, y1: r.y1, x2: r.x2, y2: r.y2, color: r.color || 0x00ff66 });
    });

    this.selectedIdx = -1;
    this.tool = 'select';
  }

  /**
   * Setup drag-and-drop support for FPT files
   */
  private setupDragAndDrop(): void {
    if (!this.modal || !this.canvas) return;

    // Add drag-over handler to canvas
    this.canvas.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.canvas?.classList.add('drag-over');
    });

    // Add drag-leave handler to canvas
    this.canvas.addEventListener('dragleave', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.canvas?.classList.remove('drag-over');
    });

    // Add drop handler to canvas
    this.canvas.addEventListener('drop', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.canvas?.classList.remove('drag-over');

      // Get dropped files
      const files = e.dataTransfer?.files;
      if (!files || files.length === 0) return;

      // Process FPT files only
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (file.name.toLowerCase().endsWith('.fpt') || file.name.toLowerCase().endsWith('.fp')) {
          await this.loadFPTFile(file);
          break; // Load only the first FPT file
        }
      }
    });

    // Also support drag-and-drop on the entire modal for better UX
    this.modal.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.modal?.classList.add('drag-over-modal');
    });

    this.modal.addEventListener('dragleave', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.target === this.modal) {
        this.modal?.classList.remove('drag-over-modal');
      }
    });

    this.modal.addEventListener('drop', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.modal?.classList.remove('drag-over-modal');

      // Get dropped files
      const files = e.dataTransfer?.files;
      if (!files || files.length === 0) return;

      // Process FPT files only
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (file.name.toLowerCase().endsWith('.fpt') || file.name.toLowerCase().endsWith('.fp')) {
          await this.loadFPTFile(file);
          break; // Load only the first FPT file
        }
      }
    });
  }

  /**
   * Convert game coordinates to canvas coordinates
   */
  private gToC(gx: number, gy: number): { x: number; y: number } {
    if (!this.canvas) return { x: 0, y: 0 };
    return {
      x: (gx + this.GW / 2) * (this.canvas.width / this.GW),
      y: (this.GH / 2 - gy) * (this.canvas.height / this.GH),
    };
  }

  /**
   * Convert canvas coordinates to game coordinates
   */
  private cToG(cx: number, cy: number): { x: number; y: number } {
    if (!this.canvas) return { x: 0, y: 0 };
    return {
      x: cx * (this.GW / this.canvas.width) - this.GW / 2,
      y: this.GH / 2 - cy * (this.GH / this.canvas.height),
    };
  }

  /**
   * Snap coordinate to grid
   */
  private snap(v: number): number {
    return this.snapEnabled ? Math.round(v * 5) / 5 : v;
  }

  /**
   * Set active tool
   */
  private setTool(tool: ToolType): void {
    this.tool = tool;
    this.rampStart = null;
  }

  /**
   * Render the editor canvas
   */
  private render(): void {
    if (!this.canvas || !this.ctx) return;

    const ctx = this.ctx;

    // Clear background
    ctx.fillStyle = this.tableColor;
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Grid
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 0.5;
    const step = this.canvas.width / (this.GW * 5);
    for (let x = 0; x <= this.canvas.width; x += step) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, this.canvas.height);
      ctx.stroke();
    }
    for (let y = 0; y <= this.canvas.height; y += step) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(this.canvas.width, y);
      ctx.stroke();
    }

    // Drain line
    const drainY = this.gToC(0, -5.5).y;
    ctx.strokeStyle = 'rgba(255,60,60,0.35)';
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(0, drainY);
    ctx.lineTo(this.canvas.width, drainY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Elements
    this.elements.forEach((el, i) => this.drawElement(el, i === this.selectedIdx));

    // Ramp start preview
    if (this.tool === 'ramp' && this.rampStart) {
      const p = this.gToC(this.rampStart.x, this.rampStart.y);
      ctx.fillStyle = '#' + ('000000' + this.COLORS[this.colorIdx].toString(16)).slice(-6);
      ctx.beginPath();
      ctx.arc(p.x, p.y, 7, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  /**
   * Draw an element on canvas
   */
  private drawElement(el: Elem, selected: boolean): void {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const color = '#' + ('000000' + el.color.toString(16)).slice(-6);

    if (el.type === 'bumper') {
      const p = this.gToC(el.x, el.y);
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 12, 0, Math.PI * 2);
      ctx.fill();
      if (selected) {
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    } else if (el.type === 'target') {
      const p = this.gToC(el.x, el.y);
      ctx.fillStyle = color;
      ctx.fillRect(p.x - 10, p.y - 10, 20, 20);
      if (selected) {
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.strokeRect(p.x - 10, p.y - 10, 20, 20);
      }
    } else if (el.type === 'ramp') {
      const p1 = this.gToC(el.x1, el.y1);
      const p2 = this.gToC(el.x2, el.y2);
      ctx.strokeStyle = color;
      ctx.lineWidth = 8;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
      if (selected) {
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 3;
        ctx.stroke();
      }
    }
  }

  private onCanvasMouseMove(e: MouseEvent): void {
    if (!this.canvas) return;

    const rect = this.canvas.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;

    if (this.isDragging && this.selectedIdx >= 0) {
      const el = this.elements[this.selectedIdx];
      const g = this.cToG(cx - this.dragOffX, cy - this.dragOffY);

      if (el.type === 'bumper' || el.type === 'target') {
        el.x = this.snap(g.x);
        el.y = this.snap(g.y);
      } else if (el.type === 'ramp') {
        el.x2 = this.snap(g.x);
        el.y2 = this.snap(g.y);
      }

      this.updateEditor();
    }
  }

  private onCanvasMouseDown(e: MouseEvent): void {
    if (!this.canvas || this.tool !== 'select') return;

    const rect = this.canvas.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;
    const g = this.cToG(cx, cy);

    // Find clicked element
    for (let i = this.elements.length - 1; i >= 0; i--) {
      const el = this.elements[i];
      let dist = 999;

      if (el.type === 'bumper' || el.type === 'target') {
        dist = Math.hypot(el.x - g.x, el.y - g.y);
      } else if (el.type === 'ramp') {
        const d1 = Math.hypot(el.x1 - g.x, el.y1 - g.y);
        const d2 = Math.hypot(el.x2 - g.x, el.y2 - g.y);
        dist = Math.min(d1, d2);
      }

      if (dist < 0.5) {
        this.selectedIdx = i;
        this.isDragging = true;

        const p = this.gToC(el.type === 'bumper' || el.type === 'target' ? el.x : el.x2,
                           el.type === 'bumper' || el.type === 'target' ? el.y : el.y2);
        this.dragOffX = cx - p.x;
        this.dragOffY = cy - p.y;

        this.render();
        return;
      }
    }

    // No element clicked, deselect
    this.selectedIdx = -1;
    this.render();
  }

  private onCanvasMouseUp(): void {
    this.isDragging = false;
  }

  private onCanvasClick(e: MouseEvent): void {
    if (!this.canvas) return;

    const rect = this.canvas.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;
    const g = this.cToG(cx, cy);

    if (this.tool === 'bumper') {
      this.elements.push({ type: 'bumper', x: this.snap(g.x), y: this.snap(g.y), color: this.COLORS[this.colorIdx] });
      this.updateEditor();
    } else if (this.tool === 'target') {
      this.elements.push({ type: 'target', x: this.snap(g.x), y: this.snap(g.y), color: this.COLORS[this.colorIdx] });
      this.updateEditor();
    } else if (this.tool === 'ramp') {
      if (!this.rampStart) {
        this.rampStart = { x: this.snap(g.x), y: this.snap(g.y) };
        this.render();
      } else {
        this.elements.push({
          type: 'ramp',
          x1: this.rampStart.x,
          y1: this.rampStart.y,
          x2: this.snap(g.x),
          y2: this.snap(g.y),
          color: this.COLORS[this.colorIdx],
        });
        this.rampStart = null;
        this.updateEditor();
      }
    }
  }

  /**
   * Update editor after changes
   */
  private updateEditor(): void {
    this.render();

    // Update 3D preview
    if (this.preview3d) {
      this.preview3d.setElements(this.elements);
    }

    // Update element count
    const countEl = this.modal?.querySelector('#elem-count');
    if (countEl) {
      countEl.textContent = `Elements: ${this.elements.length} (B:${this.elements.filter(e => e.type === 'bumper').length}, T:${this.elements.filter(e => e.type === 'target').length}, R:${this.elements.filter(e => e.type === 'ramp').length})`;
    }
  }

  /**
   * Cleanup when closing
   */
  private cleanup(): void {
    if (this.preview3d) {
      this.preview3d.dispose();
      this.preview3d = null;
    }

    if (this.backglassEditor) {
      this.backglassEditor.dispose();
      this.backglassEditor = null;
    }

    if (this.dmdEditor) {
      this.dmdEditor.dispose();
      this.dmdEditor = null;
    }

    if (this.videoEditor) {
      this.videoEditor.dispose();
      this.videoEditor = null;
    }

    // Remove event listeners
    if (this.canvas) {
      this.canvas.removeEventListener('mousemove', (e) => this.onCanvasMouseMove(e));
      this.canvas.removeEventListener('mousedown', (e) => this.onCanvasMouseDown(e));
      this.canvas.removeEventListener('mouseup', (e) => this.onCanvasMouseUp(e));
      this.canvas.removeEventListener('click', (e) => this.onCanvasClick(e));
    }

    this.canvas = null;
    this.ctx = null;
    this.elements = [];
    this.originalConfig = null;
  }
}

// Global singleton
let integratedEditorInstance: EditorModal | null = null;

/**
 * Get or create integrated editor singleton
 */
export function getIntegratedEditor(): EditorModal {
  if (!integratedEditorInstance) {
    integratedEditorInstance = new EditorModal();
  }
  return integratedEditorInstance;
}

// Export to window for HTML onclick handlers
(window as any).getIntegratedEditor = getIntegratedEditor;
