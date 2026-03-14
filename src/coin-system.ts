/**
 * coin-system.ts — Arcade Coin Insert & Player Selection System
 *
 * Features:
 * - "Insert Coin" screen on table load
 * - Coin counter with visual feedback
 * - 1 Coin = 1 Player, up to 4 Players max
 * - Start game when ready or auto-start with 1 coin after timeout
 * - Dynamic DMD text rendering with intelligent scaling to fit DMD dimensions
 */

import { dmdTextRenderer, DMDTextLayout } from './dmd-text-renderer';

export interface CoinSystemState {
  coinsInserted: number;
  currentPlayers: number;
  gameStarted: boolean;
  coinScreenVisible: boolean;
  insertCoinTimeout: number;
  lastCoinTime: number;
}

export const coinSystemState: CoinSystemState = {
  coinsInserted: 0,
  currentPlayers: 0,
  gameStarted: false,
  coinScreenVisible: false,
  insertCoinTimeout: 0,
  lastCoinTime: 0,
};

// ─── Coin System Initialization ──────────────────────────────────────────────
export function initializeCoinSystem(): void {
  console.log('✅ Coin system initialized');
}

// ─── Add Coin ────────────────────────────────────────────────────────────────
export function addCoin(): void {
  if (coinSystemState.coinsInserted >= 4) {
    console.log('⚠️ Max coins reached (4)');
    return;
  }

  coinSystemState.coinsInserted++;
  coinSystemState.currentPlayers = Math.min(coinSystemState.coinsInserted, 4);
  coinSystemState.lastCoinTime = Date.now();

  // Play coin sound (if audio system available)
  try {
    const audio = (window as any).playSound?.('coin');
    if (audio) console.log('🪙 Coin sound played');
  } catch (e) {
    /* Ignore if audio not available */
  }

  console.log(
    `🪙 Coin inserted: ${coinSystemState.coinsInserted}/${4} | Players: ${coinSystemState.currentPlayers}`
  );

  // Update DMD display
  updateCoinDisplay();
}

// ─── Start Game ──────────────────────────────────────────────────────────────
export function startGame(): void {
  if (coinSystemState.coinsInserted === 0) {
    console.log('⚠️ Cannot start game - no coins inserted');
    return;
  }

  coinSystemState.gameStarted = true;
  coinSystemState.coinScreenVisible = false;

  console.log(
    `🎮 Game started with ${coinSystemState.currentPlayers} player(s)`
  );

  // Trigger game start event
  closeCoinScreen();
}

// ─── Show Coin Screen ────────────────────────────────────────────────────────
export function showCoinScreen(): void {
  if (coinSystemState.gameStarted) return;

  coinSystemState.coinScreenVisible = true;
  coinSystemState.coinsInserted = 0;
  coinSystemState.currentPlayers = 0;
  coinSystemState.lastCoinTime = Date.now();

  // Set auto-start timeout (30 seconds)
  if (coinSystemState.insertCoinTimeout) {
    clearTimeout(coinSystemState.insertCoinTimeout);
  }

  coinSystemState.insertCoinTimeout = window.setTimeout(() => {
    if (coinSystemState.coinsInserted === 0 && coinSystemState.coinScreenVisible) {
      console.log('⏱️ Coin timeout - auto-starting with demo mode');
      closeCoinScreen();
    }
  }, 30000) as any;

  console.log('💰 Coin screen shown');
  updateCoinDisplay();
}

// ─── Close Coin Screen ───────────────────────────────────────────────────────
export function closeCoinScreen(): void {
  if (coinSystemState.insertCoinTimeout) {
    clearTimeout(coinSystemState.insertCoinTimeout);
    coinSystemState.insertCoinTimeout = 0;
  }

  coinSystemState.coinScreenVisible = false;
  console.log('✅ Coin screen closed - game starting');
}

// ─── Update Coin Display on DMD ──────────────────────────────────────────────
/**
 * Renders the "Insert Coin" screen on the DMD canvas
 * Uses the DMD's color scheme and scale for consistency
 */
export function updateCoinDisplay(): void {
  if (!coinSystemState.coinScreenVisible) return;

  try {
    // Access DMD rendering functions dynamically
    const dmdModule = (window as any).__DMD_MODULE__;
    if (!dmdModule?.renderCoinScreen) {
      // Fallback: try rendering via canvas directly if DMD module not available
      renderCoinScreenFallback();
      return;
    }

    dmdModule.renderCoinScreen(coinSystemState);
  } catch (e) {
    console.log('ℹ️ Coin display rendering to canvas fallback');
    renderCoinScreenFallback();
  }
}

/**
 * Intelligent DMD rendering with automatic text scaling
 * Calculates optimal font sizes and positions based on DMD dimensions
 */
function renderCoinScreenFallback(): void {
  const dmdElement = document.getElementById('dmd') as HTMLCanvasElement;
  if (!dmdElement) return;

  const ctx = dmdElement.getContext('2d');
  if (!ctx) return;

  // Get canvas dimensions and calculate DMD scale
  const width = dmdElement.width;
  const height = dmdElement.height;
  const baseWidth = 128;
  const baseHeight = 32;
  const scale = Math.min(width / baseWidth, height / baseHeight);

  // Dark amber background
  ctx.fillStyle = '#1a1400';
  ctx.fillRect(0, 0, width, height);

  // Handle tiny displays with simplified rendering
  if (width < 200 || height < 50) {
    renderCoinScreenSimplified(ctx, width, height);
    return;
  }

  // Calculate available space (with padding)
  const paddingX = 2 * scale;
  const paddingY = 2 * scale;
  const availableWidth = width - paddingX * 2;
  const availableHeight = height - paddingY * 2;

  // ─── Line 1: INSERT COIN (Title) ───
  const titleText = 'INSERT COIN';
  const titleLayout = dmdTextRenderer.calculateLayout(titleText, scale, {
    alignment: 'center',
    verticalAlignment: 'top',
    maxLines: 1,
    availableWidth: availableWidth / scale,
    availableHeight: availableHeight / scale / 3
  });

  const titleLine = titleLayout.lines[0];
  if (titleLine) {
    ctx.fillStyle = '#ffaa00';
    ctx.font = `bold ${titleLine.fontSize * scale}px "Courier New", monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(titleLine.text, width / 2, paddingY + (titleLine.y * scale));
  }

  // ─── Line 2: Coin Status or Instructions ───
  const statusText = coinSystemState.coinsInserted > 0
    ? `COINS: ${coinSystemState.coinsInserted}/4  PLAYERS: ${coinSystemState.currentPlayers}`
    : 'PRESS C FOR COIN';

  const statusLayout = dmdTextRenderer.calculateLayout(statusText, scale, {
    alignment: 'center',
    verticalAlignment: 'middle',
    maxLines: 1,
    availableWidth: availableWidth / scale,
    availableHeight: availableHeight / scale / 3
  });

  const statusLine = statusLayout.lines[0];
  if (statusLine) {
    ctx.fillStyle = '#00ff88';
    ctx.font = `${statusLine.fontSize * scale}px "Courier New", monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(statusLine.text, width / 2, height / 2);
  }

  // ─── Visual: Coin Icons ───
  if (coinSystemState.coinsInserted > 0) {
    const iconY = height * 0.70;
    const iconRadius = Math.max(2, Math.round(3 * scale));
    const totalIconsWidth = coinSystemState.coinsInserted * (iconRadius * 2) + ((coinSystemState.coinsInserted - 1) * 4 * scale);
    const iconStartX = (width - totalIconsWidth) / 2;

    ctx.fillStyle = '#ffff00';
    for (let i = 0; i < coinSystemState.coinsInserted; i++) {
      const x = iconStartX + i * (iconRadius * 2 + 4 * scale) + iconRadius;
      ctx.beginPath();
      ctx.arc(x, iconY, iconRadius, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // ─── Line 3: Start Game Hint ───
  if (coinSystemState.coinsInserted > 0) {
    const hintText = 'PRESS ENTER';
    const hintLayout = dmdTextRenderer.calculateLayout(hintText, scale, {
      alignment: 'center',
      verticalAlignment: 'bottom',
      maxLines: 1,
      availableWidth: availableWidth / scale,
      availableHeight: availableHeight / scale / 3
    });

    const hintLine = hintLayout.lines[0];
    if (hintLine) {
      ctx.fillStyle = '#00ff88';
      ctx.font = `${hintLine.fontSize * scale}px "Courier New", monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText(hintLine.text, width / 2, height - paddingY);
    }
  }
}

/**
 * Simplified rendering for very small displays (< 200x50 pixels)
 * Still uses intelligent scaling but with reduced text
 */
function renderCoinScreenSimplified(ctx: CanvasRenderingContext2D, width: number, height: number): void {
  const scale = Math.min(width / 128, height / 32);

  // Line 1: INSERT COIN
  const titleText = 'INSERT COIN';
  const titleFontSize = dmdTextRenderer.getExactFitFontSize(titleText, (width * 0.9) / scale) * 0.8;
  ctx.fillStyle = '#ffaa00';
  ctx.font = `bold ${Math.max(3, titleFontSize * scale)}px monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(titleText, width / 2, height / 3);

  // Line 2: Status or hint
  const line2Text = coinSystemState.coinsInserted > 0
    ? `COINS: ${coinSystemState.coinsInserted} PL: ${coinSystemState.currentPlayers}`
    : 'PRESS C';
  const line2FontSize = dmdTextRenderer.getExactFitFontSize(line2Text, (width * 0.9) / scale) * 0.8;
  ctx.fillStyle = '#00ff88';
  ctx.font = `${Math.max(2, line2FontSize * scale)}px monospace`;
  ctx.fillText(line2Text, width / 2, (height * 2) / 3);
}

// ─── Reset Coin System ───────────────────────────────────────────────────────
export function resetCoinSystem(): void {
  if (coinSystemState.insertCoinTimeout) {
    clearTimeout(coinSystemState.insertCoinTimeout);
  }

  coinSystemState.coinsInserted = 0;
  coinSystemState.currentPlayers = 0;
  coinSystemState.gameStarted = false;
  coinSystemState.coinScreenVisible = false;
  coinSystemState.insertCoinTimeout = 0;
  coinSystemState.lastCoinTime = 0;

  console.log('🔄 Coin system reset');
}

// ─── Public API ──────────────────────────────────────────────────────────────
export function getCoinSystemState(): CoinSystemState {
  return { ...coinSystemState };
}

export function getPlayerCount(): number {
  return coinSystemState.currentPlayers;
}

export function isCoinScreenVisible(): boolean {
  return coinSystemState.coinScreenVisible;
}

export function isGameStarted(): boolean {
  return coinSystemState.gameStarted;
}
