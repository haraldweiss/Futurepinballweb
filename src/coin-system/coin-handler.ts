// SPDX-License-Identifier: AGPL-3.0-or-later
import { devLog } from '../utils/dev-log';
import { coinSystemState } from './state';
import { updateCoinDisplay } from './dmd-renderer';
import { closeCoinScreen } from './screen-manager';

export function addCoin(): void {
  if (coinSystemState.coinsInserted >= 4) {
    devLog('⚠️ Max coins reached (4)');
    return;
  }

  coinSystemState.coinsInserted++;
  coinSystemState.currentPlayers = Math.min(coinSystemState.coinsInserted, 4);
  coinSystemState.lastCoinTime = Date.now();

  try {
    const audio = window.playSound?.('coin');
    if (audio) devLog('🪙 Coin sound played');
  } catch (e) {
    /* Ignore if audio not available */
  }

  devLog(
    `🪙 Coin inserted: ${coinSystemState.coinsInserted}/${4} | Players: ${coinSystemState.currentPlayers}`
  );

  updateCoinDisplay();
}

export function startGame(playerCount?: number): void {
  if (coinSystemState.coinsInserted === 0) {
    devLog('⚠️ Cannot start game - no coins inserted');
    return;
  }

  if (playerCount !== undefined) {
    const requested = Math.max(1, Math.min(4, Math.floor(playerCount)));
    coinSystemState.currentPlayers = Math.min(requested, coinSystemState.coinsInserted);
  }

  coinSystemState.gameStarted = true;
  coinSystemState.coinScreenVisible = false;

  devLog(
    `🎮 Game started with ${coinSystemState.currentPlayers} player(s)`
  );

  closeCoinScreen();
}
