// SPDX-License-Identifier: AGPL-3.0-or-later
import { devLog } from '../utils/dev-log';
import { coinSystemState } from './state';
import { updateCoinDisplay } from './dmd-renderer';
import { closeCoinScreen } from './screen-manager';
import { state, cb } from '../game';
import { usesNativeCoinRules } from '../script/rule-ownership';

export function addCoin(): boolean {
  if (usesNativeCoinRules()) return false;
  if (coinSystemState.coinsInserted >= 4) {
    devLog('⚠️ Max coins reached (4)');
    return false;
  }

  coinSystemState.coinsInserted++;
  if (!coinSystemState.gameStarted) coinSystemState.currentPlayers = Math.min(coinSystemState.coinsInserted, 4);
  state.credits = coinSystemState.coinsInserted;
  cb.updateHUD();
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
  return true;
}

/** Demo-only transaction: spend credits and initialize game state once. */
export function startGame(playerCount?: number): boolean {
  if (usesNativeCoinRules()) return false;
  if (playerCount !== undefined && !Number.isFinite(playerCount)) return false;
  if (coinSystemState.coinsInserted === 0) {
    devLog('⚠️ Cannot start game - no coins inserted');
    return false;
  }
  const requested = playerCount === undefined
    ? Math.max(1, coinSystemState.currentPlayers)
    : Math.max(1, Math.min(4, Math.floor(playerCount)));
  const players = Math.min(requested, coinSystemState.coinsInserted);
  coinSystemState.currentPlayers = players;
  coinSystemState.coinsInserted -= players;
  coinSystemState.gameStarted = true;
  state.credits = coinSystemState.coinsInserted;
  state.numPlayers = players; state.currentPlayer = 1;
  state.playerScores = [0, 0, 0, 0]; state.score = 0; state.ballNum = 1;
  state.multiplier = 1; state.bumperHits = 0; state.tiltWarnings = 0; state.tiltActive = false;
  cb.updateHUD();
  closeCoinScreen();
  devLog(`🎮 Game started with ${players} player(s)`);
  return true;
}
