/**
 * coin-system.ts — Arcade Coin Insert & Player Selection System
 *
 * Features:
 * - "Insert Coin" screen on table load
 * - Coin counter with visual feedback
 * - 1 Coin = 1 Player, up to 4 Players max
 * - Start game when ready or auto-start with 1 coin after timeout
 */

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
 * Fallback rendering directly to canvas if DMD module not available
 * Uses DMD_SCALE for consistent sizing with main DMD display
 */
function renderCoinScreenFallback(): void {
  const dmdElement = document.getElementById('dmd') as HTMLCanvasElement;
  if (!dmdElement) return;

  const ctx = dmdElement.getContext('2d');
  if (!ctx) return;

  // Get canvas dimensions
  const width = dmdElement.width;
  const height = dmdElement.height;

  // Calculate scale factor based on canvas vs standard DMD size
  // Standard DMD is 128x32
  const baseWidth = 128;
  const baseHeight = 32;
  const scaleX = width / baseWidth;
  const scaleY = height / baseHeight;
  const scale = Math.min(scaleX, scaleY);  // Use minimum to ensure fit

  // Dark amber background (matching #1a1400 standard DMD color)
  ctx.fillStyle = '#1a1400';
  ctx.fillRect(0, 0, width, height);

  // Font sizes: Use smaller base sizes (6-8px for "1x" DMD, scaled up by canvas scale)
  // This matches the sizing used in dmd.ts for consistency
  const titleFontSize = Math.max(6, 8 * scale);        // 8px base at 1x scale
  const statusFontSize = Math.max(5, 6 * scale);       // 6px base at 1x scale
  const hintFontSize = Math.max(4, 5 * scale);         // 5px base at 1x scale

  // Ensure minimum readability
  if (width < 200 || height < 50) {
    // Extra small display - simplified rendering
    renderCoinScreenSimplified(ctx, width, height);
    return;
  }

  // Draw "INSERT COIN" text - Large and bold
  ctx.fillStyle = '#ffaa00';
  ctx.font = `bold ${titleFontSize}px "Courier New", monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('INSERT COIN', width / 2, Math.round(height * 0.25));

  // Draw current coins and players - Status line
  ctx.font = `${statusFontSize}px "Courier New", monospace`;
  ctx.fillStyle = '#00ff88';
  const playerDisplay = coinSystemState.coinsInserted > 0
    ? `COINS: ${coinSystemState.coinsInserted}/4  PLAYERS: ${coinSystemState.currentPlayers}`
    : 'PRESS C FOR COIN';
  ctx.fillText(playerDisplay, width / 2, Math.round(height * 0.55));

  // Draw coin icons - Visual feedback
  if (coinSystemState.coinsInserted > 0) {
    const iconY = Math.round(height * 0.75);
    const iconRadius = Math.max(2, Math.round(3 * scale));  // Reduced from 5 to 3 for better proportions
    const iconSpacing = Math.round(width / (coinSystemState.coinsInserted + 1));

    ctx.fillStyle = '#ffff00';
    for (let i = 0; i < coinSystemState.coinsInserted; i++) {
      const x = iconSpacing * (i + 1);
      ctx.beginPath();
      ctx.arc(x, iconY, iconRadius, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Draw START button hint if coins inserted
  if (coinSystemState.coinsInserted > 0) {
    ctx.fillStyle = '#00ff88';
    ctx.font = `${hintFontSize}px "Courier New", monospace`;
    ctx.fillText('PRESS ENTER TO START', width / 2, height - Math.round(6 * scale));
  }
}

/**
 * Simplified rendering for very small displays (< 200x50 pixels)
 */
function renderCoinScreenSimplified(ctx: CanvasRenderingContext2D, width: number, height: number): void {
  // Calculate scale for tiny display
  const scale = Math.min(width / 128, height / 32);

  // Simple text-only rendering for tiny screens
  ctx.fillStyle = '#ffaa00';
  ctx.font = `${Math.max(4, 6 * scale)}px monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('INSERT COIN', width / 2, height / 3);

  ctx.fillStyle = '#00ff88';
  ctx.font = `${Math.max(3, 4 * scale)}px monospace`;
  const line2 = coinSystemState.coinsInserted > 0
    ? `COINS: ${coinSystemState.coinsInserted} PLAYERS: ${coinSystemState.currentPlayers}`
    : 'PRESS C';
  ctx.fillText(line2, width / 2, (height * 2) / 3);
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
