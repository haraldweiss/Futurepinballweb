/**
 * Animation Debugger — UI for testing and visualizing animations
 * Phase 13 Task 5: Debugging tools for animation system
 */

import { getAnimationQueue } from './animation-queue';
import { getAnimationBindingManager } from '../mechanics/animation-binding';
import { getAnimationScheduler } from '../mechanics/animation-scheduler';
import { getBamBridge } from '../bam-bridge';
import { BAMEngine } from '../bam-engine';

/**
 * Animation Debugger UI — provides controls and visualization for animations
 */
export class AnimationDebugger {
  private container: HTMLDivElement | null = null;
  private visible: boolean = false;
  private bamEngine: BAMEngine | null = null;
  private animationList: HTMLElement | null = null;
  private statusDisplay: HTMLElement | null = null;
  private controlPanel: HTMLElement | null = null;

  constructor() {
    this.createUI();
  }

  /**
   * Create debugger UI (hidden by default)
   */
  private createUI(): void {
    this.container = document.createElement('div');
    this.container.id = 'animation-debugger';
    this.container.style.cssText = `
      position: fixed;
      right: 10px;
      top: 10px;
      width: 320px;
      max-height: 80vh;
      background: rgba(0, 20, 40, 0.95);
      border: 2px solid #00ff88;
      border-radius: 8px;
      padding: 12px;
      font-family: 'Courier New', monospace;
      font-size: 11px;
      color: #00ff88;
      display: none;
      flex-direction: column;
      gap: 10px;
      z-index: 9999;
      overflow-y: auto;
      box-shadow: 0 0 20px rgba(0, 255, 136, 0.2);
    `;

    // Header with toggle
    const header = document.createElement('div');
    header.style.cssText = 'display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #00ff88; padding-bottom: 8px;';
    header.innerHTML = `
      <span style="font-weight: bold;">🎬 ANIMATION DEBUG</span>
      <button id="anim-debug-close" style="
        background: none;
        border: none;
        color: #00ff88;
        cursor: pointer;
        font-size: 16px;
      ">✕</button>
    `;
    this.container.appendChild(header);

    document.getElementById('anim-debug-close')?.addEventListener('click', () => this.toggle());

    // Status display
    this.statusDisplay = document.createElement('div');
    this.statusDisplay.style.cssText = `
      background: rgba(0, 50, 100, 0.5);
      border: 1px solid #0088ff;
      padding: 8px;
      border-radius: 4px;
      font-size: 10px;
      line-height: 1.4;
    `;
    this.container.appendChild(this.statusDisplay);

    // Control panel
    this.controlPanel = document.createElement('div');
    this.controlPanel.style.cssText = 'display: flex; flex-direction: column; gap: 6px;';
    this.container.appendChild(this.controlPanel);

    // Animation list
    this.animationList = document.createElement('div');
    this.animationList.style.cssText = `
      background: rgba(0, 30, 60, 0.5);
      border: 1px solid #00ff88;
      border-radius: 4px;
      padding: 8px;
      max-height: 300px;
      overflow-y: auto;
    `;
    this.container.appendChild(this.animationList);

    document.body.appendChild(this.container);
  }

  /**
   * Set BAM engine reference
   */
  setBamEngine(bamEngine: BAMEngine): void {
    this.bamEngine = bamEngine;
  }

  /**
   * Toggle debugger visibility
   */
  toggle(): void {
    this.visible = !this.visible;
    if (this.container) {
      this.container.style.display = this.visible ? 'flex' : 'none';
      if (this.visible) this.updateDisplay();
    }
  }

  /**
   * Update status display
   */
  private updateDisplay(): void {
    if (!this.statusDisplay) return;

    const queue = getAnimationQueue();
    const bridge = getBamBridge();
    const bindingMgr = getAnimationBindingManager();
    const scheduler = getAnimationScheduler();

    let status = '';
    status += `⚙️ Queue: ${queue?.size() || 0} pending\n`;
    status += `▶️ Current: ${queue?.getCurrent()?.sequenceId || 'none'}\n`;
    status += `🎯 Playing: ${bridge?.isAnimationPlaying() ? 'YES' : 'NO'}\n`;
    status += `📊 Bindings: ${bindingMgr?.getQueueContents?.().length || 0}\n`;

    this.statusDisplay.textContent = status;

    this.updateAnimationList();
  }

  /**
   * Update animation list from BAM engine
   */
  private updateAnimationList(): void {
    if (!this.animationList || !this.bamEngine) return;

    const sequencer = (this.bamEngine as any).sequencer;
    if (!sequencer || !sequencer.sequences) {
      this.animationList.innerHTML = '<span style="color: #ff8800;">No animations loaded</span>';
      return;
    }

    const sequences = Array.from(sequencer.sequences.entries());
    if (sequences.length === 0) {
      this.animationList.innerHTML = '<span style="color: #ff8800;">No animations loaded</span>';
      return;
    }

    let html = '<div style="font-weight: bold; margin-bottom: 6px; color: #00ff88;">📝 Sequences:</div>';

    sequences.forEach(([seqId, seq]: any) => {
      const duration = seq.keyframes?.length > 0
        ? seq.keyframes[seq.keyframes.length - 1].time || 0
        : 0;

      html += `
        <div style="
          background: rgba(0, 100, 150, 0.3);
          border-left: 2px solid #0088ff;
          padding: 6px;
          margin-bottom: 4px;
          border-radius: 3px;
        ">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="font-weight: bold;">${seqId}</span>
            <button data-seq-id="${seqId}" class="play-anim-btn" style="
              background: #0088ff;
              border: none;
              color: #fff;
              padding: 3px 8px;
              border-radius: 3px;
              cursor: pointer;
              font-size: 10px;
            ">▶ PLAY</button>
          </div>
          <div style="font-size: 9px; margin-top: 3px; color: #00aa88;">
            ⏱️ ${(duration / 1000).toFixed(2)}s | 🔑 ${seq.keyframes?.length || 0} frames
          </div>
        </div>
      `;
    });

    this.animationList.innerHTML = html;

    // Add play button event listeners
    this.animationList.querySelectorAll('.play-anim-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const seqId = (e.target as HTMLElement).getAttribute('data-seq-id');
        if (seqId && getBamBridge()) {
          getBamBridge()!.playAnimation(seqId);
          console.log(`▶️ Playing animation: ${seqId}`);
        }
      });
    });
  }

  /**
   * Show debugger (shortcut)
   */
  show(): void {
    if (!this.visible) this.toggle();
  }

  /**
   * Hide debugger (shortcut)
   */
  hide(): void {
    if (this.visible) this.toggle();
  }
}

// ─── Global Instance ──────────────────────────────────────────────────────────

let globalDebugger: AnimationDebugger | null = null;

export function initializeAnimationDebugger(): AnimationDebugger {
  globalDebugger = new AnimationDebugger();
  // Toggle with Ctrl+D
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.key === 'd') {
      e.preventDefault();
      globalDebugger?.toggle();
    }
  });
  return globalDebugger;
}

export function getAnimationDebugger(): AnimationDebugger | null {
  return globalDebugger;
}
