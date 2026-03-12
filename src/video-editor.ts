/**
 * video-editor.ts — Video Management UI for Integrated Editor
 *
 * Provides a comprehensive interface for managing table videos:
 * - Register/upload video files
 * - Configure event bindings (trigger type, priority, delay)
 * - Set video properties (volume, interruption, conditions)
 * - Preview video assignments
 * - Test event triggering
 * - Real-time binding validation
 */

import { getVideoManager } from './video-manager';
import { getVideoBindingManager } from './mechanics/video-binding';
import type { VideoConfig } from './video-manager';
import type { ExtendedVideoEventType } from './table-video-events';
import type { TableConfig } from './types';

export interface VideoEditorState {
  videos: VideoConfig[];
  bindings: Array<{
    id: string;
    videoId: string;
    trigger: ExtendedVideoEventType;
    priority: number;
    delay: number;
    allowInterrupt: boolean;
  }>;
  selectedVideoId: string | null;
  selectedBindingId: string | null;
}

export class VideoEditor {
  private tableConfig: TableConfig;
  private editorPanel: HTMLElement | null = null;
  private state: VideoEditorState;
  private videoMgr = getVideoManager();
  private bindMgr = getVideoBindingManager();

  // UI Elements
  private videoLibraryContainer: HTMLElement | null = null;
  private bindingsContainer: HTMLElement | null = null;
  private videoDetailsPanel: HTMLElement | null = null;
  private bindingDetailsPanel: HTMLElement | null = null;

  constructor(tableConfig: TableConfig) {
    this.tableConfig = tableConfig;
    this.state = {
      videos: [],
      bindings: [],
      selectedVideoId: null,
      selectedBindingId: null,
    };
  }

  /**
   * Create the video editor UI panel
   */
  createPanel(): HTMLElement {
    const panel = document.createElement('div');
    panel.className = 'video-editor-panel';
    panel.innerHTML = `
      <div class="video-editor-header">
        <h3>🎬 Video Manager</h3>
        <p class="video-editor-subtitle">Table: <strong>${this.tableConfig.name || 'Untitled'}</strong></p>
      </div>

      <div class="video-editor-content">
        <!-- Left: Video Library -->
        <div class="video-library-section">
          <div class="section-header">
            <h4>📹 Video Library</h4>
            <button class="btn-small btn-primary" id="btn-upload-video">+ Upload</button>
          </div>
          <div class="video-library-list" id="video-library-list">
            <p class="empty-state">No videos registered. Upload or select from templates.</p>
          </div>
          <div class="video-library-actions">
            <button class="btn-small" id="btn-load-template">Load Template</button>
            <button class="btn-small btn-danger" id="btn-remove-video">Remove Selected</button>
          </div>
        </div>

        <!-- Center: Video Details & Preview -->
        <div class="video-details-section">
          <div class="section-header">
            <h4>ℹ️ Video Details</h4>
          </div>
          <div class="video-details-panel" id="video-details-panel">
            <p class="empty-state">Select a video to view details</p>
          </div>
        </div>

        <!-- Right: Bindings & Event Configuration -->
        <div class="video-bindings-section">
          <div class="section-header">
            <h4>🔗 Event Bindings</h4>
            <button class="btn-small btn-primary" id="btn-add-binding">+ Bind</button>
          </div>
          <div class="video-bindings-list" id="video-bindings-list">
            <p class="empty-state">No bindings. Create one to trigger videos from game events.</p>
          </div>
          <div class="binding-details-panel" id="binding-details-panel" style="display: none;">
            <h5>Binding Configuration</h5>
            <div id="binding-config-form"></div>
          </div>
        </div>
      </div>

      <div class="video-editor-footer">
        <button class="btn-small" id="btn-test-binding">🧪 Test Selected Binding</button>
        <button class="btn-small" id="btn-clear-all">Clear All</button>
        <span class="binding-status" id="binding-status"></span>
      </div>
    `;

    this.editorPanel = panel;
    this.setupEventListeners();
    this.renderVideoLibrary();
    this.renderBindings();

    return panel;
  }

  /**
   * Setup event listeners for all interactive elements
   */
  private setupEventListeners(): void {
    if (!this.editorPanel) return;

    // Upload video
    this.editorPanel.querySelector('#btn-upload-video')?.addEventListener('click', () => {
      this.showUploadDialog();
    });

    // Load template videos
    this.editorPanel.querySelector('#btn-load-template')?.addEventListener('click', () => {
      this.showTemplateSelector();
    });

    // Remove video
    this.editorPanel.querySelector('#btn-remove-video')?.addEventListener('click', () => {
      if (this.state.selectedVideoId) {
        this.removeVideo(this.state.selectedVideoId);
      }
    });

    // Add binding
    this.editorPanel.querySelector('#btn-add-binding')?.addEventListener('click', () => {
      this.showBindingDialog();
    });

    // Test binding
    this.editorPanel.querySelector('#btn-test-binding')?.addEventListener('click', () => {
      if (this.state.selectedBindingId) {
        this.testBinding(this.state.selectedBindingId);
      }
    });

    // Clear all
    this.editorPanel.querySelector('#btn-clear-all')?.addEventListener('click', () => {
      if (confirm('Clear all videos and bindings? This cannot be undone.')) {
        this.state.videos = [];
        this.state.bindings = [];
        this.renderVideoLibrary();
        this.renderBindings();
      }
    });
  }

  /**
   * Render the video library list
   */
  private renderVideoLibrary(): void {
    const container = this.editorPanel?.querySelector('#video-library-list');
    if (!container) return;

    if (this.state.videos.length === 0) {
      container.innerHTML = '<p class="empty-state">No videos registered. Upload or select from templates.</p>';
      return;
    }

    container.innerHTML = this.state.videos
      .map(
        (video) => `
      <div class="video-item ${this.state.selectedVideoId === video.id ? 'active' : ''}" data-video-id="${video.id}">
        <div class="video-item-header">
          <strong>${video.name || video.id}</strong>
          <span class="video-type-badge">${video.type}</span>
        </div>
        <div class="video-item-meta">
          <span class="video-duration">⏱️ ${video.duration.toFixed(1)}s</span>
          <span class="video-volume">🔊 ${Math.round(video.volume * 100)}%</span>
        </div>
        <div class="video-item-url">
          <small>${video.url}</small>
        </div>
      </div>
    `
      )
      .join('');

    // Add click listeners to video items
    container.querySelectorAll('.video-item').forEach((item) => {
      item.addEventListener('click', () => {
        const videoId = item.getAttribute('data-video-id');
        if (videoId) {
          this.selectVideo(videoId);
        }
      });
    });
  }

  /**
   * Render the bindings list
   */
  private renderBindings(): void {
    const container = this.editorPanel?.querySelector('#video-bindings-list');
    if (!container) return;

    if (this.state.bindings.length === 0) {
      container.innerHTML = '<p class="empty-state">No bindings. Create one to trigger videos from game events.</p>';
      return;
    }

    container.innerHTML = this.state.bindings
      .map(
        (binding) => `
      <div class="binding-item ${this.state.selectedBindingId === binding.id ? 'active' : ''}" data-binding-id="${binding.id}">
        <div class="binding-item-header">
          <span class="trigger-badge">${binding.trigger}</span>
          <span class="video-name">${this.getVideoName(binding.videoId)}</span>
        </div>
        <div class="binding-item-meta">
          <span class="priority">⭐ P${binding.priority}</span>
          <span class="delay">⏱️ ${binding.delay}ms</span>
          <span class="interrupt">${binding.allowInterrupt ? '🔄 Int' : '🚫 Int'}</span>
        </div>
      </div>
    `
      )
      .join('');

    // Add click listeners
    container.querySelectorAll('.binding-item').forEach((item) => {
      item.addEventListener('click', () => {
        const bindingId = item.getAttribute('data-binding-id');
        if (bindingId) {
          this.selectBinding(bindingId);
        }
      });
    });
  }

  /**
   * Select a video and show its details
   */
  private selectVideo(videoId: string): void {
    this.state.selectedVideoId = videoId;
    const video = this.state.videos.find((v) => v.id === videoId);

    if (!video) return;

    const detailsPanel = this.editorPanel?.querySelector('#video-details-panel');
    if (!detailsPanel) return;

    detailsPanel.innerHTML = `
      <div class="video-details-content">
        <div class="detail-row">
          <label>Video ID</label>
          <input type="text" value="${video.id}" readonly />
        </div>

        <div class="detail-row">
          <label>Name</label>
          <input type="text" value="${video.name || ''}" readonly />
        </div>

        <div class="detail-row">
          <label>URL</label>
          <input type="text" value="${video.url}" readonly />
        </div>

        <div class="detail-row">
          <label>Type</label>
          <select disabled>
            <option ${video.type === 'backglass' ? 'selected' : ''}>backglass</option>
            <option ${video.type === 'dmd' ? 'selected' : ''}>dmd</option>
          </select>
        </div>

        <div class="detail-row">
          <label>Duration</label>
          <input type="number" value="${video.duration}" step="0.1" readonly />
        </div>

        <div class="detail-row">
          <label>Volume</label>
          <input type="range" min="0" max="1" step="0.1" value="${video.volume}"
            onchange="this.parentElement.querySelector('.volume-value').textContent = Math.round(this.value * 100) + '%'" />
          <span class="volume-value">${Math.round(video.volume * 100)}%</span>
        </div>

        <div class="detail-row">
          <label>Autoplay</label>
          <input type="checkbox" ${video.autoPlay ? 'checked' : ''} disabled />
        </div>

        <div class="detail-preview">
          <p><strong>Related Bindings:</strong></p>
          <ul>
            ${this.state.bindings
              .filter((b) => b.videoId === videoId)
              .map((b) => `<li>${b.trigger} → <strong>${b.videoId}</strong></li>`)
              .join('')}
          </ul>
          ${this.state.bindings.filter((b) => b.videoId === videoId).length === 0 ? '<p class="empty-state">No bindings for this video</p>' : ''}
        </div>
      </div>
    `;

    this.renderVideoLibrary();
  }

  /**
   * Select a binding and show its configuration
   */
  private selectBinding(bindingId: string): void {
    this.state.selectedBindingId = bindingId;
    const binding = this.state.bindings.find((b) => b.id === bindingId);

    if (!binding) return;

    const configPanel = this.editorPanel?.querySelector('#binding-config-form');
    if (!configPanel) return;

    const eventTypes: ExtendedVideoEventType[] = [
      'bumper_hit',
      'target_hit',
      'ramp_complete',
      'multiball_start',
      'ball_drain',
      'flipper_hit',
      'slingshot',
      'spinner',
      'tilt',
      'game_over',
      'combo_5',
      'combo_10',
      'combo_20',
      'combo_50',
      'level_complete',
      'achievement_unlock',
      'bonus_round',
      'skill_shot',
      'jackpot_hit',
      'ball_save',
      'extra_ball',
      'score_milestone',
      'combo_breaker',
      'danger_drain',
      'victory_lap',
      'perfect_game',
      'easter_egg',
      'special_event',
    ];

    configPanel.innerHTML = `
      <div class="form-group">
        <label>Trigger Event</label>
        <select id="binding-trigger" onchange="this.setAttribute('data-current', this.value)">
          ${eventTypes.map((et) => `<option value="${et}" ${binding.trigger === et ? 'selected' : ''}>${et}</option>`).join('')}
        </select>
      </div>

      <div class="form-group">
        <label>Video</label>
        <select id="binding-video">
          ${this.state.videos.map((v) => `<option value="${v.id}" ${binding.videoId === v.id ? 'selected' : ''}>${v.name || v.id}</option>`).join('')}
        </select>
      </div>

      <div class="form-group">
        <label>Priority (1-10)</label>
        <input type="number" id="binding-priority" min="1" max="10" value="${binding.priority}" />
      </div>

      <div class="form-group">
        <label>Delay (ms)</label>
        <input type="number" id="binding-delay" min="0" max="5000" step="100" value="${binding.delay}" />
      </div>

      <div class="form-group checkbox">
        <label>
          <input type="checkbox" id="binding-interrupt" ${binding.allowInterrupt ? 'checked' : ''} />
          Allow Interrupt
        </label>
      </div>

      <div class="form-actions">
        <button class="btn-small btn-primary" onclick="this.dispatchEvent(new CustomEvent('save-binding'))">Save</button>
        <button class="btn-small btn-danger" onclick="this.dispatchEvent(new CustomEvent('delete-binding'))">Delete</button>
      </div>
    `;

    // Add event listeners for save/delete
    const saveBtn = configPanel.querySelector('button');
    const deleteBtn = configPanel.querySelectorAll('button')[1];

    if (saveBtn) {
      saveBtn.addEventListener('click', () => {
        this.saveBinding(bindingId, {
          trigger: (configPanel.querySelector('#binding-trigger') as HTMLSelectElement).value as ExtendedVideoEventType,
          videoId: (configPanel.querySelector('#binding-video') as HTMLSelectElement).value,
          priority: parseInt((configPanel.querySelector('#binding-priority') as HTMLInputElement).value),
          delay: parseInt((configPanel.querySelector('#binding-delay') as HTMLInputElement).value),
          allowInterrupt: (configPanel.querySelector('#binding-interrupt') as HTMLInputElement).checked,
        });
      });
    }

    if (deleteBtn) {
      deleteBtn.addEventListener('click', () => {
        if (confirm('Delete this binding?')) {
          this.removeBinding(bindingId);
        }
      });
    }

    this.renderBindings();
  }

  /**
   * Show upload dialog for video file
   */
  private showUploadDialog(): void {
    const dialog = document.createElement('div');
    dialog.className = 'video-upload-dialog';
    dialog.innerHTML = `
      <div class="dialog-content">
        <h4>Upload Video</h4>

        <div class="form-group">
          <label>Video File (MP4, WebM)</label>
          <input type="file" id="video-file" accept="video/*" />
        </div>

        <div class="form-group">
          <label>Video ID</label>
          <input type="text" id="video-id" placeholder="e.g., table_bumper_hit" />
        </div>

        <div class="form-group">
          <label>Display Name</label>
          <input type="text" id="video-name" placeholder="e.g., Bumper Hit Effect" />
        </div>

        <div class="form-group">
          <label>Type</label>
          <select id="video-type">
            <option value="backglass">Backglass</option>
            <option value="dmd">DMD</option>
          </select>
        </div>

        <div class="form-group">
          <label>Duration (seconds)</label>
          <input type="number" id="video-duration" min="0.1" max="60" step="0.1" placeholder="Auto-detect" />
        </div>

        <div class="form-group">
          <label>Volume (0-100%)</label>
          <input type="range" id="video-volume" min="0" max="100" value="80" />
          <span id="volume-display">80%</span>
        </div>

        <div class="form-actions">
          <button class="btn-small btn-primary" id="btn-confirm-upload">Upload</button>
          <button class="btn-small" id="btn-cancel-upload">Cancel</button>
        </div>
      </div>
    `;

    document.body.appendChild(dialog);

    const volumeInput = dialog.querySelector('#video-volume') as HTMLInputElement;
    const volumeDisplay = dialog.querySelector('#volume-display');
    if (volumeInput && volumeDisplay) {
      volumeInput.addEventListener('input', () => {
        volumeDisplay.textContent = volumeInput.value + '%';
      });
    }

    dialog.querySelector('#btn-confirm-upload')?.addEventListener('click', () => {
      const fileInput = dialog.querySelector('#video-file') as HTMLInputElement;
      const videoId = (dialog.querySelector('#video-id') as HTMLInputElement).value;
      const videoName = (dialog.querySelector('#video-name') as HTMLInputElement).value;
      const videoType = (dialog.querySelector('#video-type') as HTMLSelectElement).value as 'backglass' | 'dmd';
      const videoDuration = parseFloat((dialog.querySelector('#video-duration') as HTMLInputElement).value);
      const videoVolume = parseInt((dialog.querySelector('#video-volume') as HTMLInputElement).value) / 100;

      if (fileInput.files && fileInput.files[0] && videoId) {
        const file = fileInput.files[0];
        const url = URL.createObjectURL(file);

        this.addVideo({
          id: videoId,
          name: videoName || videoId,
          url: url,
          type: videoType,
          duration: videoDuration || 3.0,
          autoPlay: true,
          volume: videoVolume,
        });

        document.body.removeChild(dialog);
      } else {
        alert('Please fill in video ID and select a file');
      }
    });

    dialog.querySelector('#btn-cancel-upload')?.addEventListener('click', () => {
      document.body.removeChild(dialog);
    });
  }

  /**
   * Show template selector for predefined videos
   */
  private showTemplateSelector(): void {
    const templates = [
      { name: 'Bumper Hit', id: 'bumper_hit', duration: 1.5, type: 'backglass' as const },
      { name: 'Ramp Complete', id: 'ramp_complete', duration: 3.0, type: 'backglass' as const },
      { name: 'Multiball', id: 'multiball', duration: 5.0, type: 'dmd' as const },
      { name: 'Tilt', id: 'tilt', duration: 2.0, type: 'backglass' as const },
      { name: 'Game Over', id: 'gameover', duration: 4.0, type: 'dmd' as const },
      { name: 'Skill Shot', id: 'skill_shot', duration: 2.5, type: 'backglass' as const },
      { name: 'Jackpot', id: 'jackpot', duration: 3.0, type: 'dmd' as const },
      { name: 'Ball Save', id: 'ball_save', duration: 2.0, type: 'backglass' as const },
    ];

    const dialog = document.createElement('div');
    dialog.className = 'video-template-dialog';
    dialog.innerHTML = `
      <div class="dialog-content">
        <h4>Select Video Template</h4>
        <p class="dialog-subtitle">Choose a template to create placeholder video bindings</p>

        <div class="template-grid">
          ${templates.map((t) => `
            <button class="template-card" data-template="${t.id}">
              <strong>${t.name}</strong>
              <small>${t.type} • ${t.duration}s</small>
            </button>
          `).join('')}
        </div>

        <div class="form-actions">
          <button class="btn-small" id="btn-cancel-template">Cancel</button>
        </div>
      </div>
    `;

    document.body.appendChild(dialog);

    dialog.querySelectorAll('.template-card').forEach((card) => {
      card.addEventListener('click', () => {
        const templateId = card.getAttribute('data-template');
        const template = templates.find((t) => t.id === templateId);

        if (template) {
          const tablePrefix = this.tableConfig.name?.toLowerCase().replace(/\s+/g, '_') || 'table';
          const videoId = `${tablePrefix}_${template.id}`;

          this.addVideo({
            id: videoId,
            name: `${this.tableConfig.name || 'Table'} - ${template.name}`,
            url: `/videos/${tablePrefix}/${template.id}.mp4`,
            type: template.type,
            duration: template.duration,
            autoPlay: true,
            volume: 1.0,
          });
        }

        document.body.removeChild(dialog);
      });
    });

    dialog.querySelector('#btn-cancel-template')?.addEventListener('click', () => {
      document.body.removeChild(dialog);
    });
  }

  /**
   * Show binding dialog
   */
  private showBindingDialog(): void {
    if (this.state.videos.length === 0) {
      alert('Add a video first before creating bindings');
      return;
    }

    const eventTypes: ExtendedVideoEventType[] = [
      'bumper_hit',
      'target_hit',
      'ramp_complete',
      'multiball_start',
      'ball_drain',
      'flipper_hit',
      'slingshot',
      'spinner',
      'tilt',
      'game_over',
      'combo_5',
      'combo_10',
      'combo_20',
      'combo_50',
      'level_complete',
      'achievement_unlock',
      'skill_shot',
      'jackpot_hit',
      'ball_save',
      'extra_ball',
      'score_milestone',
      'danger_drain',
      'victory_lap',
      'perfect_game',
    ];

    const dialog = document.createElement('div');
    dialog.className = 'video-binding-dialog';
    dialog.innerHTML = `
      <div class="dialog-content">
        <h4>Create Video Binding</h4>

        <div class="form-group">
          <label>Trigger Event</label>
          <select id="new-trigger">
            ${eventTypes.map((et) => `<option value="${et}">${et}</option>`).join('')}
          </select>
        </div>

        <div class="form-group">
          <label>Video</label>
          <select id="new-video">
            ${this.state.videos.map((v) => `<option value="${v.id}">${v.name || v.id}</option>`).join('')}
          </select>
        </div>

        <div class="form-group">
          <label>Priority (1-10)</label>
          <input type="number" id="new-priority" min="1" max="10" value="5" />
        </div>

        <div class="form-group">
          <label>Delay (ms)</label>
          <input type="number" id="new-delay" min="0" max="5000" step="100" value="0" />
        </div>

        <div class="form-group checkbox">
          <label>
            <input type="checkbox" id="new-interrupt" checked />
            Allow Interrupt
          </label>
        </div>

        <div class="form-actions">
          <button class="btn-small btn-primary" id="btn-confirm-binding">Create Binding</button>
          <button class="btn-small" id="btn-cancel-binding">Cancel</button>
        </div>
      </div>
    `;

    document.body.appendChild(dialog);

    dialog.querySelector('#btn-confirm-binding')?.addEventListener('click', () => {
      const trigger = (dialog.querySelector('#new-trigger') as HTMLSelectElement).value as ExtendedVideoEventType;
      const videoId = (dialog.querySelector('#new-video') as HTMLSelectElement).value;
      const priority = parseInt((dialog.querySelector('#new-priority') as HTMLInputElement).value);
      const delay = parseInt((dialog.querySelector('#new-delay') as HTMLInputElement).value);
      const allowInterrupt = (dialog.querySelector('#new-interrupt') as HTMLInputElement).checked;

      this.addBinding({
        trigger,
        videoId,
        priority,
        delay,
        allowInterrupt,
      });

      document.body.removeChild(dialog);
    });

    dialog.querySelector('#btn-cancel-binding')?.addEventListener('click', () => {
      document.body.removeChild(dialog);
    });
  }

  /**
   * Add a video to the library
   */
  private addVideo(video: VideoConfig): void {
    const exists = this.state.videos.find((v) => v.id === video.id);
    if (exists) {
      alert('Video ID already exists');
      return;
    }

    this.state.videos.push(video);
    this.videoMgr?.registerVideo(video);

    this.updateStatus(`✅ Video added: ${video.id}`);
    this.renderVideoLibrary();
  }

  /**
   * Remove a video
   */
  private removeVideo(videoId: string): void {
    this.state.videos = this.state.videos.filter((v) => v.id !== videoId);
    this.state.bindings = this.state.bindings.filter((b) => b.videoId !== videoId);

    this.state.selectedVideoId = null;
    this.updateStatus(`✅ Video removed: ${videoId}`);
    this.renderVideoLibrary();
    this.renderBindings();
  }

  /**
   * Add a binding
   */
  private addBinding(config: {
    trigger: ExtendedVideoEventType;
    videoId: string;
    priority: number;
    delay: number;
    allowInterrupt: boolean;
  }): void {
    const bindingId = `${config.trigger}_${config.videoId}_${Date.now()}`;

    this.state.bindings.push({
      id: bindingId,
      videoId: config.videoId,
      trigger: config.trigger,
      priority: config.priority,
      delay: config.delay,
      allowInterrupt: config.allowInterrupt,
    });

    this.bindMgr?.createBinding(config.videoId, config.trigger, {
      priority: config.priority,
      delay: config.delay,
      allowInterrupt: config.allowInterrupt,
    });

    this.updateStatus(`✅ Binding created: ${config.trigger} → ${config.videoId}`);
    this.renderBindings();
  }

  /**
   * Save binding changes
   */
  private saveBinding(
    bindingId: string,
    updates: {
      trigger: ExtendedVideoEventType;
      videoId: string;
      priority: number;
      delay: number;
      allowInterrupt: boolean;
    }
  ): void {
    const binding = this.state.bindings.find((b) => b.id === bindingId);
    if (!binding) return;

    Object.assign(binding, updates);

    this.bindMgr?.createBinding(updates.videoId, updates.trigger, {
      priority: updates.priority,
      delay: updates.delay,
      allowInterrupt: updates.allowInterrupt,
    });

    this.updateStatus(`✅ Binding updated`);
    this.renderBindings();
  }

  /**
   * Remove a binding
   */
  private removeBinding(bindingId: string): void {
    this.state.bindings = this.state.bindings.filter((b) => b.id !== bindingId);
    this.state.selectedBindingId = null;

    this.updateStatus(`✅ Binding deleted`);
    this.renderBindings();
  }

  /**
   * Test a binding by simulating an event trigger
   */
  private testBinding(bindingId: string): void {
    const binding = this.state.bindings.find((b) => b.id === bindingId);
    if (!binding) return;

    const statusEl = this.editorPanel?.querySelector('#binding-status');
    if (statusEl) {
      statusEl.textContent = `🧪 Testing: ${binding.trigger}...`;
    }

    // Simulate event trigger
    this.videoMgr?.triggerVideoForEvent(binding.trigger);

    setTimeout(() => {
      if (statusEl) {
        statusEl.textContent = `✅ Test complete: ${binding.trigger}`;
      }
    }, 1000);
  }

  /**
   * Update status message
   */
  private updateStatus(message: string): void {
    const statusEl = this.editorPanel?.querySelector('#binding-status');
    if (statusEl) {
      statusEl.textContent = message;
      setTimeout(() => {
        if (statusEl) {
          statusEl.textContent = '';
        }
      }, 3000);
    }
  }

  /**
   * Get video name by ID
   */
  private getVideoName(videoId: string): string {
    const video = this.state.videos.find((v) => v.id === videoId);
    return video?.name || videoId;
  }

  /**
   * Export editor state
   */
  getState(): VideoEditorState {
    return this.state;
  }

  /**
   * Import editor state
   */
  setState(state: Partial<VideoEditorState>): void {
    Object.assign(this.state, state);
    this.renderVideoLibrary();
    this.renderBindings();
  }

  /**
   * Cleanup
   */
  dispose(): void {
    if (this.editorPanel) {
      this.editorPanel.innerHTML = '';
    }
  }
}

/**
 * Global instance
 */
let videoEditorInstance: VideoEditor | null = null;

export function getVideoEditor(): VideoEditor | null {
  return videoEditorInstance;
}

export function initializeVideoEditor(tableConfig: TableConfig): VideoEditor {
  videoEditorInstance = new VideoEditor(tableConfig);
  return videoEditorInstance;
}
