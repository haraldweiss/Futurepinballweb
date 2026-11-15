// SPDX-License-Identifier: AGPL-3.0-or-later
import { devLog } from '../utils/dev-log';
import { coinSystemState } from './state';
import type { CoinSystemState } from './state';
import { state } from '../game';
import { usesNativeCoinRules } from '../script/rule-ownership';

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
  return usesNativeCoinRules() ? state.numPlayers : coinSystemState.currentPlayers;
}

export function isCoinScreenVisible(): boolean {
  return !usesNativeCoinRules() && coinSystemState.coinScreenVisible;
}

export function isGameStarted(): boolean {
  return usesNativeCoinRules() ? state.numPlayers > 0 : coinSystemState.gameStarted;
}
