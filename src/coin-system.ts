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
 */
function renderCoinScreenFallback(): void {
  const dmdElement = document.getElementById('dmd') as HTMLCanvasElement;
  if (!dmdElement) return;

  const ctx = dmdElement.getContext('2d');
  if (!ctx) return;

  // Get canvas dimensions
  const width = dmdElement.width;
  const height = dmdElement.height;
  const scale = Math.max(1, width / 128);  // Estimate scale from canvas width

  // Dark amber background
  ctx.fillStyle = '#1a1400';
  ctx.fillRect(0, 0, width, height);

  // Draw "INSERT COIN" text
  ctx.fillStyle = '#ffaa00';
  ctx.font = `bold ${Math.round(20 * scale)}px monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('INSERT COIN', width / 2, height / 3);

  // Draw current coins and players
  ctx.font = `${Math.round(14 * scale)}px monospace`;
  ctx.fillStyle = '#00ff88';
  const playerDisplay = `COINS: ${coinSystemState.coinsInserted}  PLAYERS: ${coinSystemState.currentPlayers}`;
  ctx.fillText(playerDisplay, width / 2, (height * 2) / 3);

  // Draw coin icons
  if (coinSystemState.coinsInserted > 0) {
    const iconY = height - Math.round(15 * scale);
    const iconSpacing = Math.round(30 * scale);
    const startX = width / 2 - ((coinSystemState.coinsInserted - 1) * iconSpacing) / 2;

    for (let i = 0; i < coinSystemState.coinsInserted; i++) {
      const x = startX + i * iconSpacing;
      ctx.fillStyle = '#ffff00';
      ctx.beginPath();
      ctx.arc(x, iconY, 6 * scale, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Draw START button hint if coins inserted
  if (coinSystemState.coinsInserted > 0) {
    ctx.fillStyle = '#00ff88';
    ctx.font = `${Math.round(10 * scale)}px monospace`;
    ctx.fillText('PRESS ENTER TO START', width / 2, height - Math.round(3 * scale));
  }
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
