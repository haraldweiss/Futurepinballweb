// SPDX-License-Identifier: AGPL-3.0-or-later
import { devLog } from '../utils/dev-log';

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

export function initializeCoinSystem(): void {
  devLog('✅ Coin system initialized');
}
