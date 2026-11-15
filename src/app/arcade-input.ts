// SPDX-License-Identifier: AGPL-3.0-or-later
import { state, cb } from '../game';
import { addCoin, startGame } from '../coin-system/coin-handler';
import { isCoinScreenVisible, isGameStarted } from '../coin-system/api';
import { checkKeyBinding } from '../keybindings';
import { usesNativeCoinRules } from '../script/rule-ownership';
import { isEditableKeyTarget } from '../script/key-input';

/** Host demo controls. Native scripts receive their own input before this call. */
export function handleArcadeKey(event: KeyboardEvent): boolean {
  if (usesNativeCoinRules() || event.repeat || event.isComposing || isEditableKeyTarget(event.target)) return false;
  const plain = !event.altKey && !event.ctrlKey && !event.metaKey && !event.shiftKey;
  if ((plain && event.key === '5') || checkKeyBinding(event, 'insertCoin')) {
    if (addCoin()) cb.showNotification(`💰 Coin Inserted! Credits: ${state.credits}`);
    return true;
  }
  const requested = plain && /^[1-4]$/.test(event.key) ? Number(event.key) : undefined;
  const configuredStart = checkKeyBinding(event, 'startGame') && isCoinScreenVisible() && !isGameStarted();
  if (requested !== undefined || configuredStart) {
    if (startGame(requested)) {
      cb.showNotification(`🎮 ${state.numPlayers}-Player Game Started! Credits: ${state.credits}`);
    } else {
      state.plungerCharging = false; state.plungerCharge = 0;
      cb.dmdEvent('INSERT COIN FIRST');
    }
    return true;
  }
  return false;
}
