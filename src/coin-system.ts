export { CoinSystemState, coinSystemState, initializeCoinSystem } from './coin-system/state';
export { addCoin, startGame } from './coin-system/coin-handler';
export { showCoinScreen, closeCoinScreen } from './coin-system/screen-manager';
export { updateCoinDisplay } from './coin-system/dmd-renderer';
export { resetCoinSystem, getCoinSystemState, getPlayerCount, isCoinScreenVisible, isGameStarted } from './coin-system/api';

export { closeCoinScreen as _closeCoinScreen } from './coin-system/screen-manager';
export { updateCoinDisplay as _updateCoinDisplay } from './coin-system/dmd-renderer';
