// SPDX-License-Identifier: AGPL-3.0-or-later
import { devLog } from '../utils/dev-log';
import { coinSystemState } from './state';
import type { CoinSystemState } from './state';

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

  devLog('🔄 Coin system reset');
}

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
