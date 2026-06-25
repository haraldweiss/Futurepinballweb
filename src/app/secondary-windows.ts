/**
 * secondary-windows.ts — Standalone DMD and Backglass window setup.
 *
 * These functions are called when FPW runs in a child window (Electron
 * multi-screen mode). They set up the render loop, sync transport bridge,
 * and window-level event handlers without DI — all dependencies are
 * module-level imports.
 *
 * Extracted from main.ts (Phase 15 — Secondary Windows).
 */
import {
  dmdState, dmdCanvas, DMD_W, DMD_H,
  dmdRenderAttract, dmdRenderPlaying,
  dmdRenderEvent, dmdRenderGameOver,
  initDMDResizing,
} from '../dmd';
import { state } from '../game';
import { drawBGCanvas } from './backglass-canvas';
import { onSyncFrame } from './sync-transport';
import { disposePhysicsWorker } from '../physics-worker-bridge';

/**
 * Set up a standalone DMD window (Electron multi-screen mode).
 * Initializes canvas, resize handling, render loop, and sync transport.
 */
export function setupDMDWindow(): void {
  document.title = 'FPW — DMD';
  window.addEventListener('beforeunload', () => {
    try {
      localStorage.setItem('fpw_winpos_dmd', JSON.stringify({
        x: window.screenX, y: window.screenY,
        w: window.outerWidth, h: window.outerHeight,
      }));
    } catch {
      /* localStorage can throw, ignore */
    }
    disposePhysicsWorker();
  });

  const wrap = document.getElementById('dmd-wrap')!;
  const canvas = document.getElementById('dmd') as HTMLCanvasElement;

  // Frameless Electron child windows aren't draggable by default.
  document.body.style.setProperty('-webkit-app-region', 'drag');
  document.body.style.setProperty('app-region', 'drag');

  // DMD sizing for standalone window (4:1 aspect, maximize width)
  const resizeDMD = () => {
    const a = DMD_W / DMD_H;
    const ww = innerWidth, wh = innerHeight;
    let w = ww, h = ww / a;
    if (h > wh) { h = wh; w = h * a; }
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    canvas.width = Math.max(256, Math.floor(w));
    canvas.height = Math.max(64, Math.floor(h));
    if (window.updateResponsiveDMDScale) {
      window.updateResponsiveDMDScale();
    }
  };

  resizeDMD();
  window.addEventListener('resize', resizeDMD);
  window.addEventListener('orientationchange', resizeDMD);

  // Drag-to-resize support
  initDMDResizing(canvas, wrap);

  // On-canvas diagnostic overlay
  let dmdRenderFrames = 0;
  const dmdCtx = canvas.getContext('2d');
  const drawDmdDiag = () => {
    if (!dmdCtx) return;
    const m = window._msStateMessages || {};
    const total = (m.broadcastChannel || 0) + (m.electronIPC || 0) + (m.localStorage || 0);
    dmdCtx.save();
    dmdCtx.fillStyle = 'rgba(0,0,0,0.6)';
    dmdCtx.fillRect(2, 2, 110, 14);
    dmdCtx.fillStyle = '#0f0';
    dmdCtx.font = '10px monospace';
    dmdCtx.fillText(`F:${dmdRenderFrames} M:${total}`, 4, 12);
    dmdCtx.restore();
  };

  // DMD render loop
  const dmdLoop = () => {
    requestAnimationFrame(dmdLoop);
    dmdRenderFrames++;
    dmdState.animFrame++;
    switch (dmdState.mode) {
      case 'attract': dmdRenderAttract(); break;
      case 'playing': dmdRenderPlaying(); break;
      case 'event': dmdRenderEvent(); break;
      case 'gameover': dmdRenderGameOver(); break;
    }
    if (dmdState.mode === 'event') {
      dmdState.eventTimer--;
      if (dmdState.eventTimer <= 0) dmdState.mode = 'playing';
    }
    drawDmdDiag();
  };
  dmdLoop();

  // Sync bridge — receive state updates from playfield
  onSyncFrame((data: any) => {
    if (data.type !== 'state') return;
    Object.assign(dmdState, {
      mode: data.dmdMode, eventText: data.dmdEventText, animFrame: data.dmdAnimFrame,
      scrollX: data.dmdScrollX, eventTimer: data.dmdEventTimer,
    });
    state.score = data.score;
    state.ballNum = data.ballNum;
    state.multiplier = data.multiplier;
    state.lastRank = data.lastRank;
    state.lastScore = data.lastScore;
  });
}

/**
 * Set up a standalone Backglass window (Electron multi-screen mode).
 * Initializes canvas, render loop with embedded DMD, and sync transport.
 */
export function setupBackglassWindow(): void {
  document.title = 'FPW — Backglass';
  window.addEventListener('beforeunload', () => {
    try {
      localStorage.setItem('fpw_winpos_backglass', JSON.stringify({
        x: window.screenX, y: window.screenY,
        w: window.outerWidth, h: window.outerHeight,
      }));
    } catch {
      /* localStorage can throw, ignore */
    }
    disposePhysicsWorker();
  });

  document.body.style.setProperty('-webkit-app-region', 'drag');
  document.body.style.setProperty('app-region', 'drag');

  const canvas = document.getElementById('backglass-canvas') as HTMLCanvasElement;
  const showEmbedDMD = !new URLSearchParams(location.search).has('nodmd');
  const bgState: any = {
    score: 0, ballNum: 1, multiplier: 1, tableName: 'FUTURE PINBALL',
    tableAccent: 0x00ff66, tableColor: 0x1a4a15,
    dmdMode: 'attract', dmdEventText: '', dmdAnimFrame: 0, dmdScrollX: 0,
    dmdEventTimer: 0, lastRank: 0, lastScore: 0, highScores: [],
  };

  const setSize = () => { canvas.width = innerWidth; canvas.height = innerHeight; };
  setSize();
  window.addEventListener('resize', setSize);

  // Backglass render loop
  let bgRenderFrames = 0;
  const bgLoop = () => {
    requestAnimationFrame(bgLoop);
    bgRenderFrames++;
    bgState.dmdAnimFrame++;
    if (bgState.dmdEventTimer > 0) {
      bgState.dmdEventTimer--;
      bgState.dmdMode = 'event';
    } else if (bgState.dmdMode === 'event') {
      bgState.dmdMode = 'playing';
    }
    Object.assign(state, {
      score: bgState.score, ballNum: bgState.ballNum,
      multiplier: bgState.multiplier, lastRank: bgState.lastRank,
      lastScore: bgState.lastScore,
    });
    Object.assign(dmdState, {
      mode: bgState.dmdMode, eventText: bgState.dmdEventText,
      animFrame: bgState.dmdAnimFrame, scrollX: bgState.dmdScrollX,
      eventTimer: bgState.dmdEventTimer,
    });
    drawBGCanvas(canvas, bgState, showEmbedDMD, dmdCanvas);
  };
  bgLoop();

  // Sync bridge — receive state updates from playfield
  onSyncFrame((data: any) => {
    if (data.type !== 'state') return;
    Object.assign(bgState, {
      score: data.score, ballNum: data.ballNum, multiplier: data.multiplier,
      tableName: data.tableName, tableAccent: data.tableAccent, tableColor: data.tableColor,
      dmdMode: data.dmdMode, dmdEventText: data.dmdEventText, dmdAnimFrame: data.dmdAnimFrame,
      dmdScrollX: data.dmdScrollX, dmdEventTimer: data.dmdEventTimer,
      lastRank: data.lastRank, lastScore: data.lastScore,
      highScores: data.highScores || [],
    });
  });
}
