import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('../coin-system/dmd-renderer', () => ({ updateCoinDisplay: vi.fn() }));
import { showCoinScreen } from '../coin-system/screen-manager';
import { addCoin, startGame } from '../coin-system/coin-handler';
import { resetCoinSystem, getCoinSystemState } from '../coin-system/api';

beforeEach(() => { vi.useFakeTimers(); resetCoinSystem(); });
afterEach(() => { resetCoinSystem(); vi.useRealTimers(); });

describe('coin screen lifecycle', () => {
  it('preserves a coin inserted before the delayed table-load screen appears', () => {
    addCoin();
    showCoinScreen();
    expect(getCoinSystemState().coinsInserted).toBe(1);
    expect(getCoinSystemState().currentPlayers).toBe(1);
    startGame();
    expect(getCoinSystemState().gameStarted).toBe(true);
  });
  it('does not erase credits when redisplayed', () => {
    showCoinScreen();
    addCoin();
    showCoinScreen();
    expect(getCoinSystemState().coinsInserted).toBe(1);
  });
  it('still clears credits on an explicit table/game reset', () => {
    addCoin();
    resetCoinSystem();
    showCoinScreen();
    expect(getCoinSystemState().coinsInserted).toBe(0);
    expect(getCoinSystemState().gameStarted).toBe(false);
  });
});
