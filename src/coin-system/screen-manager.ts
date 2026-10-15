// SPDX-License-Identifier: AGPL-3.0-or-later
import { devLog } from '../utils/dev-log';
import { coinSystemState } from './state';
import { updateCoinDisplay } from './dmd-renderer';

export function showCoinScreen(): void {
  if (coinSystemState.gameStarted) return;

  coinSystemState.coinScreenVisible = true;
  // Displaying the screen must not erase coins inserted during async table
  // loading. resetCoinSystem() owns clearing credits for a new table/game.
  coinSystemState.lastCoinTime = Date.now();

  if (coinSystemState.insertCoinTimeout) {
    clearTimeout(coinSystemState.insertCoinTimeout);
  }

  coinSystemState.insertCoinTimeout = window.setTimeout(() => {
    if (coinSystemState.coinsInserted === 0 && coinSystemState.coinScreenVisible) {
      devLog('⏱️ Coin timeout - auto-starting with demo mode');
      closeCoinScreen();
    }
  }, 30000) as unknown as number;

  devLog('💰 Coin screen shown');
  updateCoinDisplay();
}

export function closeCoinScreen(): void {
  if (coinSystemState.insertCoinTimeout) {
    clearTimeout(coinSystemState.insertCoinTimeout);
    coinSystemState.insertCoinTimeout = 0;
  }

  coinSystemState.coinScreenVisible = false;
  devLog('✅ Coin screen closed - game starting');
}
